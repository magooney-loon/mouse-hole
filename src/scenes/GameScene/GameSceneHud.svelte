<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { untrack } from 'svelte';
	import { sceneActions } from '$extensions/scene/scene.svelte';
	import { soundActions } from '$core/GlobalAudio.svelte';
	import PlayerStats from '$lib/PlayerStats.svelte';
	import { gameState, gameActions } from '$lib/gameState.svelte';

	const countdown = $derived(Math.ceil(gameState.startTimer));

	$effect(() => {
		if (gameState.status === 'game_over') {
			untrack(() => {
				soundActions.playMouseGameover();
				soundActions.playKatzeWin();
			});
		}
	});
</script>

<div class="pointer-events-none absolute inset-0" transition:fly={{ y: 12, duration: 220 }}>
	<!-- Stats — top left -->
	<div class="absolute top-6 left-6">
		<PlayerStats
			hunger={Math.round(gameState.hunger)}
			stamina={Math.round(gameState.stamina)}
			sound={Math.round(gameState.sound)}
		/>
	</div>

	<!-- Cheese interact prompt -->
	{#if gameState.status === 'playing' && gameState.cheeseInRange}
		<div
			class="absolute bottom-20 left-1/2 -translate-x-1/2"
			transition:fly={{ y: 8, duration: 160 }}
		>
			<div
				class="flex items-center gap-2.5 bg-black/70 border-2 border-amber-400/60 rounded-xl px-4 py-2.5 backdrop-blur-sm"
				style="box-shadow: 0 0 12px #f5c21840;"
			>
				<span class="text-lg">🧀</span>
				<span class="text-white/80 font-bold text-sm">Press</span>
				<kbd
					class="bg-amber-400 text-black border-2 border-black rounded px-1.5 py-0.5 font-black text-xs leading-none"
					style="box-shadow: 2px 2px 0 #000;"
				>F</kbd>
				<span class="text-white/80 font-bold text-sm">to eat cheese</span>
			</div>
		</div>
	{/if}

	<!-- Intro tutorial overlay -->
	{#if gameState.status === 'starting'}
		<div
			class="absolute inset-0 flex flex-col items-center justify-center gap-6"
			transition:fade={{ duration: 400 }}
		>
			<div
				class="text-[8rem] font-black leading-none text-amber-300 select-none"
				style="text-shadow: 6px 6px 0 #000, -2px -2px 0 #000;"
			>
				{countdown}
			</div>

			<div
				class="flex flex-col gap-4 bg-black/60 border-4 border-black rounded-2xl px-8 py-6 backdrop-blur-md max-w-md w-full mx-4"
				style="box-shadow: 6px 6px 0 #000;"
			>
				<p class="m-0 text-center text-amber-300 font-black uppercase tracking-widest text-sm">
					🐭 You are a mouse. The cat is coming.
				</p>

				<div class="grid grid-cols-2 gap-x-6 gap-y-2.5">
					{#each [['WASD', 'Move'], ['Q/E', 'Strafe'], ['Shift', 'Sprint (loud!)'], ['Space', 'Jump'], ['F', 'Interact']] as [key, desc]}
						<div class="flex items-center gap-2">
							<kbd
								class="bg-amber-400 text-black border-2 border-black rounded px-1.5 py-0.5 font-black text-xs leading-none shrink-0"
								style="box-shadow: 2px 2px 0 #000;">{key}</kbd
							>
							<span class="text-xs text-white/60 font-bold">{desc}</span>
						</div>
					{/each}
				</div>

				<div class="border-t-2 border-white/10 pt-3 flex flex-col gap-1.5">
					<p class="m-0 text-xs text-white/50 leading-relaxed">
						🏡 <strong class="text-amber-300">Goal:</strong> find all decorations scattered around
						the house and bring them back to your cozy mouse hole. You can only carry
						<strong class="text-amber-300">one at a time</strong>.
					</p>
					<p class="m-0 text-xs text-white/50 leading-relaxed">
						🍖 <strong class="text-amber-300">Hunger drains</strong> while you're outside. Forage for
						food to survive.
					</p>
					<p class="m-0 text-xs text-white/50 leading-relaxed">
						🔊 <strong class="text-red-400">Sound attracts the cat.</strong> Walk silently, sprint only
						when you must.
					</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Game over screen -->
	{#if gameState.status === 'game_over'}
		<div
			class="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/70 backdrop-blur-sm"
			transition:fade={{ duration: 500 }}
		>
			<div class="flex flex-col items-center gap-2">
				<div class="text-7xl select-none">💀</div>
				<h2
					class="text-6xl font-black text-red-400 uppercase leading-none m-0"
					style="text-shadow: 4px 4px 0 #000;"
				>
					Game Over
				</h2>
				<p class="text-white/50 font-black uppercase tracking-widest text-sm m-0">You starved...</p>
			</div>

			<div class="flex flex-col gap-3 w-64">
				<button
					onclick={() => {
						soundActions.playClick();
						gameActions.start();
						soundActions.playKatzeIntro();
						setTimeout(() => soundActions.playRandomMeow(), 2000);
						setTimeout(() => soundActions.playRandomMeow(), 5000);
					}}
					class="w-full py-4 text-xl font-black rounded-xl cursor-pointer
					       bg-amber-400 text-black border-4 border-black
					       transition-all duration-100
					       hover:translate-x-[2px] hover:translate-y-[2px]
					       active:translate-x-[4px] active:translate-y-[4px]"
					style="box-shadow: 6px 6px 0 #000;"
					onmousedown={(e) => (e.currentTarget.style.boxShadow = '2px 2px 0 #000')}
					onmouseup={(e) => (e.currentTarget.style.boxShadow = '6px 6px 0 #000')}
					onmouseleave={(e) => (e.currentTarget.style.boxShadow = '6px 6px 0 #000')}
				>
					🔄 Try Again
				</button>

				<button
					onclick={() => {
						soundActions.playClick();
						gameActions.reset();
						sceneActions.goToMainMenu();
					}}
					class="w-full py-3 text-base font-black rounded-xl cursor-pointer
					       bg-white/10 text-white border-4 border-black
					       transition-all duration-100
					       hover:translate-x-[2px] hover:translate-y-[2px]
					       active:translate-x-[4px] active:translate-y-[4px]"
					style="box-shadow: 4px 4px 0 #000;"
					onmousedown={(e) => (e.currentTarget.style.boxShadow = '1px 1px 0 #000')}
					onmouseup={(e) => (e.currentTarget.style.boxShadow = '4px 4px 0 #000')}
					onmouseleave={(e) => (e.currentTarget.style.boxShadow = '4px 4px 0 #000')}
				>
					← Back to Menu
				</button>
			</div>
		</div>
	{/if}
</div>
