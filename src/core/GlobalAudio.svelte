<script module>
	export { soundTriggers, soundActions } from './globalAudio.svelte';
</script>

<script lang="ts">
	import { Audio } from '@threlte/extras';
	import { Audio as ThreeAudio } from 'three';
	import { settingsState, BASE_URL } from '$extensions/settings/settings.svelte';
	import { sceneState } from '$extensions/scene/scene.svelte';
	import { gameState } from '$lib/gameState.svelte';
	import { logSound } from '$extensions/logger/logger.svelte';
	import { soundTriggers } from './globalAudio.svelte';

	// ── URLs ──────────────────────────────────────────────────────────────────
	const AMBIENCE_URL       = `${BASE_URL}sounds/ambience.ogg`;
	const CLICK_URL          = `${BASE_URL}sounds/click.ogg`;
	const SWOOSH_URL         = `${BASE_URL}sounds/swoosh.ogg`;
	const MAIN_MENU_URL      = `${BASE_URL}sounds/music/main_menu.ogg`;
	const GAME_1_URL         = `${BASE_URL}sounds/music/main_1.ogg`;
	const GAME_2_URL         = `${BASE_URL}sounds/music/main_2.ogg`;
	const KATZE_INTRO_URL    = `${BASE_URL}sounds/sfx/katze_voice_intro.ogg`;
	const KATZE_WIN_URL      = `${BASE_URL}sounds/sfx/katze_voice_win.ogg`;
	const MOUSE_GAMEOVER_URL = `${BASE_URL}sounds/sfx/mouse_gameover.ogg`;
	const MOUSE_JUMP_URL     = `${BASE_URL}sounds/sfx/mouse_jump.ogg`;
	const MOUSE_WALKING_URL  = `${BASE_URL}sounds/sfx/mouse_walking.ogg`;
	const MOUSE_EATING_URL   = `${BASE_URL}sounds/sfx/mouse_eating.ogg`;
	const CAT_ALERT_URL      = `${BASE_URL}sounds/sfx/cat_alert.ogg`;
	const IMPACT_URL         = `${BASE_URL}sounds/sfx/impact.ogg`;
	const MEOW_URLS = [
		`${BASE_URL}sounds/sfx/meow_1.ogg`,
		`${BASE_URL}sounds/sfx/meow_2.ogg`,
		`${BASE_URL}sounds/sfx/meow_3.ogg`,
		`${BASE_URL}sounds/sfx/meow_4.ogg`,
	];

	// ── Audio refs ────────────────────────────────────────────────────────────
	let ambienceAudio        = $state.raw<ThreeAudio>();
	let clickAudio           = $state.raw<ThreeAudio>();
	let swooshAudio          = $state.raw<ThreeAudio>();
	let mainMenuAudio        = $state.raw<ThreeAudio>();
	let game1Audio           = $state.raw<ThreeAudio>();
	let game2Audio           = $state.raw<ThreeAudio>();
	let katzeIntroAudio      = $state.raw<ThreeAudio>();
	let katzeWinAudio        = $state.raw<ThreeAudio>();
	let mouseGameoverAudio   = $state.raw<ThreeAudio>();
	let mouseJumpAudio       = $state.raw<ThreeAudio>();
	let mouseWalkingAudio    = $state.raw<ThreeAudio>();
	let mouseEatingAudio     = $state.raw<ThreeAudio>();
	let catAlertAudio        = $state.raw<ThreeAudio>();
	let impactAudio          = $state.raw<ThreeAudio>();
	let meowAudios           = $state.raw<(ThreeAudio | undefined)[]>([undefined, undefined, undefined, undefined]);

	// ── SFX helpers ───────────────────────────────────────────────────────────
	const playOneShot = (audio: ThreeAudio | undefined) => {
		if (!audio) return;
		if (audio.isPlaying) audio.stop();
		audio.play();
	};

	// ── Music crossfade ───────────────────────────────────────────────────────
	const CROSSFADE = 3; // seconds
	let activeMusic: ThreeAudio | null = null;

	function fadeVolume(audio: ThreeAudio, from: number, to: number, dur: number, onDone?: () => void) {
		const start = performance.now();
		const tick = () => {
			const t = Math.min(1, (performance.now() - start) / (dur * 1000));
			audio.setVolume(from + (to - from) * t);
			if (t < 1) requestAnimationFrame(tick);
			else { if (to <= 0) audio.stop(); onDone?.(); }
		};
		requestAnimationFrame(tick);
	}

	function switchTo(next: ThreeAudio, loop: boolean, onNaturalEnd?: () => void) {
		if (!settingsState.audio.musicEnabled) return;
		const vol = settingsState.audio.musicVolume;

		// Fade out the current track
		if (activeMusic && activeMusic !== next && activeMusic.isPlaying) {
			const old = activeMusic;
			fadeVolume(old, old.getVolume(), 0, CROSSFADE);
		}

		// Restart + fade in new track
		if (next.isPlaying) next.stop();
		next.setLoop(loop);
		next.setVolume(0);
		next.play();
		fadeVolume(next, 0, vol, CROSSFADE);
		activeMusic = next;

		// Detect natural end for non-looping tracks
		if (!loop && onNaturalEnd && next.source) {
			next.source.addEventListener('ended', () => {
				if (activeMusic === next) onNaturalEnd();
			}, { once: true });
		}
	}

	function startGameMusic() {
		if (!game1Audio || !game2Audio) return;
		switchTo(game1Audio, false, () => {
			// game1 ended naturally → crossfade into game2 (loops)
			if (game2Audio) switchTo(game2Audio, true);
		});
	}

	// ── Scene / game status → music ──────────────────────────────────────────
	$effect(() => {
		const scene = sceneState.currentScene;
		if (scene === 'mainMenu' && mainMenuAudio) {
			switchTo(mainMenuAudio, true);
		}
	});

	$effect(() => {
		// Start game music on every new game (including Try Again)
		if (gameState.status === 'starting') startGameMusic();
	});

	// ── Music enable / volume ─────────────────────────────────────────────────
	$effect(() => {
		if (!settingsState.audio.musicEnabled) {
			if (activeMusic?.isPlaying) activeMusic.stop();
		}
	});
	$effect(() => {
		const vol = settingsState.audio.musicVolume;
		for (const a of [mainMenuAudio, game1Audio, game2Audio]) {
			if (a?.isPlaying) a.setVolume(vol);
		}
	});

	// ── Ambience ──────────────────────────────────────────────────────────────
	$effect(() => {
		if (!ambienceAudio) return;
		if (settingsState.audio.ambienceEnabled) ambienceAudio.play();
		else ambienceAudio.pause();
	});
	$effect(() => { if (ambienceAudio) ambienceAudio.setVolume(settingsState.audio.ambienceVolume); });

	// ── SFX volumes ───────────────────────────────────────────────────────────
	$effect(() => { if (clickAudio)          clickAudio.setVolume(settingsState.audio.sfxVolume); });
	$effect(() => { if (swooshAudio)         swooshAudio.setVolume(settingsState.audio.sfxVolume); });
	$effect(() => { if (katzeIntroAudio)     katzeIntroAudio.setVolume(settingsState.audio.sfxVolume * 0.4); });
	$effect(() => { if (katzeWinAudio)       katzeWinAudio.setVolume(settingsState.audio.sfxVolume); });
	$effect(() => { if (mouseGameoverAudio)  mouseGameoverAudio.setVolume(settingsState.audio.sfxVolume); });
	$effect(() => { if (mouseJumpAudio)      mouseJumpAudio.setVolume(settingsState.audio.sfxVolume); });
	$effect(() => { if (mouseWalkingAudio)   mouseWalkingAudio.setVolume(settingsState.audio.sfxVolume); });
	$effect(() => { if (mouseEatingAudio)    mouseEatingAudio.setVolume(settingsState.audio.sfxVolume); });
	$effect(() => { if (catAlertAudio)       catAlertAudio.setVolume(settingsState.audio.sfxVolume); });
	$effect(() => { if (impactAudio)         impactAudio.setVolume(settingsState.audio.sfxVolume * 0.7); });

	// ── SFX triggers ─────────────────────────────────────────────────────────
	$effect(() => {
		if (soundTriggers.click > 0 && settingsState.audio.sfxEnabled) {
			playOneShot(clickAudio);
			soundTriggers.click = 0;
		}
	});
	$effect(() => {
		if (soundTriggers.swoosh > 0 && settingsState.audio.sfxEnabled) {
			if (swooshAudio?.buffer) {
				const clone = swooshAudio.clone() as ThreeAudio;
				clone.setVolume(swooshAudio.getVolume());
				clone.play();
			}
			soundTriggers.swoosh = 0;
		}
	});
	$effect(() => {
		if (soundTriggers.katzeIntro > 0 && settingsState.audio.sfxEnabled) {
			playOneShot(katzeIntroAudio);
			soundTriggers.katzeIntro = 0;
		}
	});
	$effect(() => {
		if (soundTriggers.katzeWin > 0 && settingsState.audio.sfxEnabled) {
			playOneShot(katzeWinAudio);
			soundTriggers.katzeWin = 0;
		}
	});
	$effect(() => {
		if (soundTriggers.mouseGameover > 0 && settingsState.audio.sfxEnabled) {
			playOneShot(mouseGameoverAudio);
			soundTriggers.mouseGameover = 0;
		}
	});
	$effect(() => {
		if (!mouseWalkingAudio) return;
		const state = soundTriggers.walkState;
		if (state === 'stopped' || !settingsState.audio.sfxEnabled) {
			if (mouseWalkingAudio.isPlaying) mouseWalkingAudio.stop();
		} else {
			const sprinting = state === 'sprinting';
			mouseWalkingAudio.setPlaybackRate(sprinting ? 1.7 : 1.0);
			mouseWalkingAudio.setVolume(settingsState.audio.sfxVolume * (sprinting ? 0.9 : 0.35));
			if (!mouseWalkingAudio.isPlaying) mouseWalkingAudio.play();
		}
	});
	$effect(() => {
		if (soundTriggers.mouseJump > 0 && settingsState.audio.sfxEnabled) {
			if (mouseJumpAudio?.buffer) {
				const clone = mouseJumpAudio.clone() as ThreeAudio;
				clone.setVolume(mouseJumpAudio.getVolume());
				clone.setPlaybackRate(0.85 + Math.random() * 0.3);
				clone.play();
			}
			soundTriggers.mouseJump = 0;
		}
	});
	$effect(() => {
		if (soundTriggers.mouseEating > 0 && settingsState.audio.sfxEnabled) {
			playOneShot(mouseEatingAudio);
			soundTriggers.mouseEating = 0;
		}
	});
	$effect(() => {
		if (soundTriggers.catAlert > 0 && settingsState.audio.sfxEnabled) {
			playOneShot(catAlertAudio);
			soundTriggers.catAlert = 0;
		}
	});
	$effect(() => {
		if (soundTriggers.impact > 0 && settingsState.audio.sfxEnabled) {
			if (impactAudio?.buffer) {
				const clone = impactAudio.clone() as ThreeAudio;
				clone.setVolume(impactAudio.getVolume());
				clone.setPlaybackRate(0.8 + Math.random() * 0.4);
				clone.play();
			}
			soundTriggers.impact = 0;
		}
	});
	$effect(() => {
		if (soundTriggers.meowTrigger > 0 && settingsState.audio.sfxEnabled) {
			const audio = meowAudios[soundTriggers.meowWhich - 1];
			if (audio?.buffer) {
				const clone = audio.clone() as ThreeAudio;
				clone.setVolume(settingsState.audio.sfxVolume * soundTriggers.meowVolume);
				clone.play();
			}
			soundTriggers.meowTrigger = 0;
		}
	});
</script>

<Audio src={AMBIENCE_URL}    loop oncreate={(a) => { ambienceAudio = a;       logSound.info('Audio loaded: Ambience'); }}      userData={{ hideInTree: true }} />
<Audio src={CLICK_URL}            oncreate={(a) => { clickAudio = a;          logSound.info('Audio loaded: Click'); }}          userData={{ hideInTree: true }} />
<Audio src={SWOOSH_URL}           oncreate={(a) => { swooshAudio = a;         logSound.info('Audio loaded: Swoosh'); }}         userData={{ hideInTree: true }} />
<Audio src={MAIN_MENU_URL}   loop oncreate={(a) => { mainMenuAudio = a;       logSound.info('Audio loaded: MainMenu'); }}       userData={{ hideInTree: true }} />
<Audio src={GAME_1_URL}           oncreate={(a) => { game1Audio = a;          logSound.info('Audio loaded: Game1'); }}          userData={{ hideInTree: true }} />
<Audio src={GAME_2_URL}           oncreate={(a) => { game2Audio = a;          logSound.info('Audio loaded: Game2'); }}          userData={{ hideInTree: true }} />
<Audio src={KATZE_INTRO_URL}      oncreate={(a) => { katzeIntroAudio = a;     logSound.info('Audio loaded: KatzeIntro'); }}     userData={{ hideInTree: true }} />
<Audio src={KATZE_WIN_URL}        oncreate={(a) => { katzeWinAudio = a;       logSound.info('Audio loaded: KatzeWin'); }}       userData={{ hideInTree: true }} />
<Audio src={MOUSE_GAMEOVER_URL}   oncreate={(a) => { mouseGameoverAudio = a;  logSound.info('Audio loaded: MouseGameover'); }}  userData={{ hideInTree: true }} />
<Audio src={MOUSE_JUMP_URL}       oncreate={(a) => { mouseJumpAudio = a;      logSound.info('Audio loaded: MouseJump'); }}      userData={{ hideInTree: true }} />
<Audio src={MOUSE_WALKING_URL} loop oncreate={(a) => { mouseWalkingAudio = a; logSound.info('Audio loaded: MouseWalking'); }}   userData={{ hideInTree: true }} />
<Audio src={MOUSE_EATING_URL}      oncreate={(a) => { mouseEatingAudio = a;  logSound.info('Audio loaded: MouseEating'); }}  userData={{ hideInTree: true }} />
<Audio src={CAT_ALERT_URL}         oncreate={(a) => { catAlertAudio = a;     logSound.info('Audio loaded: CatAlert'); }}     userData={{ hideInTree: true }} />
<Audio src={IMPACT_URL}            oncreate={(a) => { impactAudio = a;       logSound.info('Audio loaded: Impact'); }}       userData={{ hideInTree: true }} />

{#each MEOW_URLS as src, i}
	<Audio {src} oncreate={(a) => {
		const arr = [...meowAudios]; arr[i] = a; meowAudios = arr;
		logSound.info(`Audio loaded: Meow ${i + 1}`);
	}} userData={{ hideInTree: true }} />
{/each}
