import mainMenuUrl from '$lib/assets/sound/main_menu.mp3?url';
import main1Url from '$lib/assets/sound/main_1.mp3?url';
import main2Url from '$lib/assets/sound/main_2.mp3?url';
import catAlert1Url from '$lib/assets/sound/cat_alert_1.mp3?url';
import catAlert2Url from '$lib/assets/sound/cat_alert_2.mp3?url';

export type MusicState = 'menu' | 'main' | 'cat_alert';

const PLAYLISTS: Record<MusicState, string[]> = {
	menu: [mainMenuUrl],
	main: [main1Url, main2Url],
	cat_alert: [catAlert1Url, catAlert2Url]
};

const CROSSFADE_MS = 2000;
const TARGET_VOL = 0.65;

// OFF by default — user must toggle to start audio (satisfies browser autoplay policy too)
export const sound = $state({ enabled: false });

let currentState: MusicState = 'menu';
let currentIndex = 0;
let active: HTMLAudioElement | null = null;
let crossfading = false;

// ------------------------------------------------------------------

function fade(audio: HTMLAudioElement, from: number, to: number, ms: number): Promise<void> {
	return new Promise((resolve) => {
		const start = performance.now();
		const tick = () => {
			const t = Math.min((performance.now() - start) / ms, 1);
			audio.volume = from + (to - from) * t;
			if (t < 1) requestAnimationFrame(tick);
			else resolve();
		};
		requestAnimationFrame(tick);
	});
}

function setupEndTransition(audio: HTMLAudioElement) {
	const playlist = PLAYLISTS[currentState];

	// Single-track playlist — just loop
	if (playlist.length === 1) {
		audio.loop = true;
		return;
	}

	const onTimeUpdate = () => {
		if (!audio.duration || crossfading) return;
		if (audio.duration - audio.currentTime <= CROSSFADE_MS / 1000 + 0.05) {
			audio.removeEventListener('timeupdate', onTimeUpdate);
			const nextIndex = (currentIndex + 1) % playlist.length;
			crossfadeTo(PLAYLISTS[currentState][nextIndex], currentState, nextIndex);
		}
	};
	audio.addEventListener('timeupdate', onTimeUpdate);
}

async function crossfadeTo(url: string, nextState: MusicState, nextIndex: number) {
	crossfading = true;

	const incoming = new Audio(url);
	incoming.volume = 0;

	try {
		await incoming.play();
	} catch {
		crossfading = false;
		return;
	}

	const outgoing = active;
	active = incoming;
	currentState = nextState;
	currentIndex = nextIndex;

	const targetVol = sound.enabled ? TARGET_VOL : 0;

	await Promise.all([
		fade(incoming, 0, targetVol, CROSSFADE_MS),
		outgoing
			? fade(outgoing, outgoing.volume, 0, CROSSFADE_MS).then(() => outgoing.pause())
			: Promise.resolve()
	]);

	crossfading = false;
	setupEndTransition(incoming);
}

function startTrack(url: string) {
	const audio = new Audio(url);
	audio.volume = TARGET_VOL;
	active = audio;
	audio.play().catch(() => {});
	setupEndTransition(audio);
}

// ------------------------------------------------------------------

/**
 * Toggle sound on/off.
 * First toggle-on also starts audio (menu track by default).
 */
export function toggleSound() {
	sound.enabled = !sound.enabled;

	if (sound.enabled) {
		if (!active) {
			// First time enabling — start the current state's track
			startTrack(PLAYLISTS[currentState][currentIndex]);
		} else {
			fade(active, active.volume, TARGET_VOL, 400);
		}
	} else {
		if (active) fade(active, active.volume, 0, 400);
	}
}

/**
 * Switch playlist with a crossfade.
 * Safe to call when sound is off — will update state and play correct
 * track whenever sound is turned on.
 */
export function setMusicState(state: MusicState) {
	if (state === currentState && !crossfading) return;

	if (!active || !sound.enabled) {
		// Sound is off — just track the desired state silently
		currentState = state;
		currentIndex = 0;
		return;
	}

	crossfadeTo(PLAYLISTS[state][0], state, 0);
}
