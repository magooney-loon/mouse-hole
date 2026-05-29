<script lang="ts">
	import { fade } from 'svelte/transition';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { useProgress } from '@threlte/extras';
	import { logEngine } from '$extensions/logger/logger.svelte';
	import { wavedashActions } from '$extensions/wavedash/wavedash.svelte';
	import { audioActions } from '$extensions/settings/settings.svelte';

	const { progress, finishedOnce, active, item, loaded, total } = useProgress();

	const isFinished = $derived($finishedOnce || ($total === 0 && !$active));

	const tweened = new Tween(0, { duration: 600, easing: cubicOut });
	$effect(() => {
		tweened.target = $total === 0 ? 1 : $progress;
	});

	$effect(() => {
		wavedashActions.updateProgress($total === 0 ? 1 : $progress);
	});

	$effect(() => {
		if (isFinished) {
			logEngine.info('Assets loaded');
			wavedashActions.init();
		}
	});

	let showSoundPrompt = $state(false);

	$effect(() => {
		if (!isFinished) return;
		// wait for the loader fade-out to finish before showing the prompt
		const t = setTimeout(() => {
			showSoundPrompt = true;
		}, 950);
		return () => clearTimeout(t);
	});

	function enableSounds() {
		audioActions.toggleMusic();
		audioActions.toggleSfx();
		audioActions.toggleAmbience();
		showSoundPrompt = false;
	}

	function declineSounds() {
		showSoundPrompt = false;
	}

	function truncatePath(path: string | undefined): string {
		if (!path) return '';
		const file = path.split(/[/\\]/).pop() ?? path;
		return file.length > 36 ? file.slice(0, 33) + '...' : file;
	}
</script>

{#if !isFinished}
	<div
		out:fade={{ duration: 900 }}
		class="absolute inset-0 z-200 flex flex-col items-center justify-center bg-black text-white"
	>
		<p class="m-0 mb-6 text-xs tracking-[0.15em] uppercase opacity-40">Loading</p>

		<!-- Progress bar -->
		<div class="w-50 h-0.5 bg-white/10 rounded-full overflow-hidden">
			<div class="h-full bg-white rounded-full" style="width: {tweened.current * 100}%;"></div>
		</div>

		<p class="mt-4 text-xs opacity-25 font-mono">
			{Math.round(tweened.current * 100)}%
		</p>

		{#if $active}
			<p class="mt-2 text-[11px] opacity-20 max-w-60 text-center font-mono">
				{truncatePath($item)}
			</p>
			<p class="mt-0.5 text-[10px] opacity-15 font-mono">
				{$loaded} / {$total}
			</p>
		{/if}
	</div>
{/if}

{#if showSoundPrompt}
	<div
		transition:fade={{ duration: 300 }}
		class="pointer-events-auto absolute inset-0 z-100 flex items-center justify-center
		       bg-amber-950/70 backdrop-blur-sm"
	>
		<div
			class="flex flex-col items-center gap-5 px-10 py-8 max-w-sm w-full mx-4
			       bg-amber-950/95 border-4 border-amber-700/60 rounded-3xl shadow-2xl text-center"
		>
			<div class="text-5xl select-none" aria-hidden="true">🔊</div>
			<div>
				<h2 class="m-0 text-xl font-black text-amber-200 tracking-tight">Turn on sounds?</h2>
				<p class="m-0 mt-2 text-sm text-amber-400/70 leading-relaxed">
					Enable music, effects, and ambience?
				</p>
			</div>
			<div class="flex gap-3 w-full">
				<button
					onclick={enableSounds}
					class="flex-1 py-3 font-black text-amber-950 bg-amber-500 border-4 border-amber-400/50
					       rounded-2xl cursor-pointer hover:bg-amber-400 hover:scale-105 active:scale-95
					       transition-all shadow-md shadow-amber-900/40"
				>
					Yes please!
				</button>
				<button
					onclick={declineSounds}
					class="flex-1 py-3 font-bold text-amber-400/60 bg-amber-900/40 border-2 border-amber-700/30
					       rounded-2xl cursor-pointer hover:bg-amber-800/50 hover:text-amber-300
					       transition-all"
				>
					No thanks
				</button>
			</div>
		</div>
	</div>
{/if}
