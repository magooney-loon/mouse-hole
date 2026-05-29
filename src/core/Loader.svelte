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
		if (isFinished) showSoundPrompt = true;
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
		class="pointer-events-auto absolute inset-0 z-300 flex items-center justify-center
		       bg-black/50 backdrop-blur-md"
	>
		<div
			class="flex flex-col items-center gap-6 px-10 py-8 max-w-sm w-full mx-4
			       bg-black/60 border-4 border-black rounded-2xl text-center backdrop-blur-md"
			style="box-shadow: 7px 7px 0 #000;"
		>
			<div class="text-5xl select-none" aria-hidden="true">🔊</div>
			<div>
				<h2
					class="m-0 text-2xl font-black text-amber-300 uppercase"
					style="text-shadow: 2px 2px 0 #000;"
				>
					Turn on sounds?
				</h2>
				<p class="m-0 mt-2 text-sm text-white/50 font-bold leading-relaxed">
					Enable music, effects, and ambience?
				</p>
			</div>
			<div class="flex gap-3 w-full">
				<button
					onclick={enableSounds}
					class="flex-1 py-3 font-black text-black bg-amber-400 border-4 border-black
					       rounded-xl cursor-pointer transition-all duration-100
					       hover:translate-x-0 hover:translate-y-0.5
					       active:translate-x-1 active:translate-y-1"
					style="box-shadow: 5px 5px 0 #000;"
					onmousedown={(e) => (e.currentTarget.style.boxShadow = '1px 1px 0 #000')}
					onmouseup={(e) => (e.currentTarget.style.boxShadow = '5px 5px 0 #000')}
					onmouseleave={(e) => (e.currentTarget.style.boxShadow = '5px 5px 0 #000')}
				>
					Yes please!
				</button>
				<button
					onclick={declineSounds}
					class="flex-1 py-3 font-black text-white/50 bg-white/10 border-4 border-black
					       rounded-xl cursor-pointer transition-all duration-100
					      hover:translate-x-0.5 hover:translate-y-0.5
					       active:translate-x-1 active:translate-y-1
					       hover:text-white/80"
					style="box-shadow: 5px 5px 0 #000;"
					onmousedown={(e) => (e.currentTarget.style.boxShadow = '1px 1px 0 #000')}
					onmouseup={(e) => (e.currentTarget.style.boxShadow = '5px 5px 0 #000')}
					onmouseleave={(e) => (e.currentTarget.style.boxShadow = '5px 5px 0 #000')}
				>
					No thanks
				</button>
			</div>
		</div>
	</div>
{/if}
