<script module>
	export { soundTriggers, soundActions } from './globalAudio.svelte';
</script>

<script lang="ts">
	import { Audio } from '@threlte/extras';
	import { Audio as ThreeAudio } from 'three';
	import { settingsState, BASE_URL } from '$extensions/settings/settings.svelte';
	import { logSound } from '$extensions/logger/logger.svelte';
	import { soundTriggers } from './globalAudio.svelte';

	const OST_URL        = `${BASE_URL}sounds/music/main_2.mp3`;
	const AMBIENCE_URL   = `${BASE_URL}sounds/ambience.mp3`;
	const CLICK_URL      = `${BASE_URL}sounds/click.mp3`;
	const SWOOSH_URL     = `${BASE_URL}sounds/swoosh.mp3`;
	const KATZE_INTRO_URL = `${BASE_URL}sounds/sfx/katze_voice_intro.mp3`;
	const MEOW_URLS = [
		`${BASE_URL}sounds/sfx/meow_1.mp3`,
		`${BASE_URL}sounds/sfx/meow_2.mp3`,
		`${BASE_URL}sounds/sfx/meow_3.mp3`,
		`${BASE_URL}sounds/sfx/meow_4.mp3`,
	];

	let ostAudio       = $state.raw<ThreeAudio>();
	let ambienceAudio  = $state.raw<ThreeAudio>();
	let clickAudio     = $state.raw<ThreeAudio>();
	let swooshAudio    = $state.raw<ThreeAudio>();
	let katzeIntroAudio = $state.raw<ThreeAudio>();
	let meowAudios     = $state.raw<(ThreeAudio | undefined)[]>([undefined, undefined, undefined, undefined]);

	const playOneShot = (audio: ThreeAudio | undefined) => {
		if (!audio) return;
		if (audio.isPlaying) audio.stop();
		audio.play();
	};

	const playPolyphonic = (audio: ThreeAudio | undefined) => {
		if (!audio?.buffer) return;
		const clone = audio.clone() as ThreeAudio;
		clone.setVolume(audio.getVolume());
		clone.play();
	};

	$effect(() => {
		if (!ostAudio) return;
		if (settingsState.audio.musicEnabled) ostAudio.play();
		else ostAudio.pause();
	});
	$effect(() => { if (ostAudio) ostAudio.setVolume(settingsState.audio.musicVolume); });

	$effect(() => {
		if (!ambienceAudio) return;
		if (settingsState.audio.ambienceEnabled) ambienceAudio.play();
		else ambienceAudio.pause();
	});
	$effect(() => { if (ambienceAudio) ambienceAudio.setVolume(settingsState.audio.ambienceVolume); });

	$effect(() => { if (clickAudio)  clickAudio.setVolume(settingsState.audio.sfxVolume); });
	$effect(() => { if (swooshAudio) swooshAudio.setVolume(settingsState.audio.sfxVolume); });
	$effect(() => { if (katzeIntroAudio) katzeIntroAudio.setVolume(settingsState.audio.sfxVolume); });

	$effect(() => {
		if (soundTriggers.click > 0 && settingsState.audio.sfxEnabled) {
			playOneShot(clickAudio);
			soundTriggers.click = 0;
		}
	});
	$effect(() => {
		if (soundTriggers.swoosh > 0 && settingsState.audio.sfxEnabled) {
			playPolyphonic(swooshAudio);
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
		if (soundTriggers.meowTrigger > 0 && settingsState.audio.sfxEnabled) {
			playPolyphonic(meowAudios[soundTriggers.meowWhich - 1]);
			soundTriggers.meowTrigger = 0;
		}
	});
</script>

<Audio src={OST_URL} loop oncreate={(a) => { ostAudio = a; logSound.info('Audio loaded: OST'); }} userData={{ hideInTree: true }} />
<Audio src={AMBIENCE_URL} loop oncreate={(a) => { ambienceAudio = a; logSound.info('Audio loaded: Ambience'); }} userData={{ hideInTree: true }} />
<Audio src={CLICK_URL} oncreate={(a) => { clickAudio = a; logSound.info('Audio loaded: Click'); }} userData={{ hideInTree: true }} />
<Audio src={SWOOSH_URL} oncreate={(a) => { swooshAudio = a; logSound.info('Audio loaded: Swoosh'); }} userData={{ hideInTree: true }} />
<Audio src={KATZE_INTRO_URL} oncreate={(a) => { katzeIntroAudio = a; logSound.info('Audio loaded: KatzeIntro'); }} userData={{ hideInTree: true }} />

{#each MEOW_URLS as src, i}
	<Audio {src} oncreate={(a) => {
		const arr = [...meowAudios];
		arr[i] = a;
		meowAudios = arr;
		logSound.info(`Audio loaded: Meow ${i + 1}`);
	}} userData={{ hideInTree: true }} />
{/each}
