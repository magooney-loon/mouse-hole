<script lang="ts">
	import { sceneActions } from '$extensions/scene/scene.svelte';
	import { soundActions } from '$core/GlobalAudio.svelte';
	import { gameActions } from '$lib/gameState.svelte';
	import SettingsHud from '$scenes/SettingsHud.svelte';

	let showSettings = $state(false);
	let showHowToPlay = $state(false);

	const btnBase = `w-full font-black rounded-xl cursor-pointer border-4 border-black
	                 transition-all duration-100
	                 hover:translate-x-[2px] hover:translate-y-[2px]
	                 active:translate-x-[4px] active:translate-y-[4px]`;
</script>

{#if !showSettings}
	<div class="pointer-events-auto absolute inset-0 flex items-center justify-center">
		<div
			class="relative flex flex-col gap-5 w-full max-w-xl mx-4 px-8 py-7
			       bg-black/50 border-4 border-black rounded-2xl backdrop-blur-md"
			style="box-shadow: 7px 7px 0 #000;"
		>
			<!-- Title row -->
			<div class="flex items-center gap-4">
				<span class="text-5xl select-none" aria-hidden="true">🐭</span>
				<div>
					<h1
						class="text-5xl font-black text-amber-300 leading-none uppercase m-0"
						style="text-shadow: 3px 3px 0 #000, -1px -1px 0 #000, 1px 1px 0 #000;"
					>
						Mouse Hole
					</h1>
					<p class="text-white/50 text-[10px] font-black tracking-[0.35em] uppercase m-0 mt-1">
						Sneak · Forage · Decorate
					</p>
				</div>
			</div>

			<!-- Controls — single row -->
			<div class="flex gap-5 flex-wrap justify-center">
				{#each [['WASD', 'move'], ['Shift', 'sprint'], ['Space', 'jump'], ['E', 'interact']] as [key, label]}
					<span class="flex items-center gap-1.5">
						<kbd
							class="bg-amber-400 text-black border-2 border-black rounded px-1.5 py-0.5
							       font-black text-xs leading-none"
							style="box-shadow: 2px 2px 0 #000;"
						>{key}</kbd>
						<span class="text-xs text-white/50 font-bold">{label}</span>
					</span>
				{/each}
			</div>

			<!-- How to Play expanded panel -->
			{#if showHowToPlay}
				<div
					class="bg-amber-950/70 border-4 border-black rounded-xl p-5 text-white flex flex-col gap-3"
					style="box-shadow: 4px 4px 0 #000;"
				>
					<p class="m-0 text-sm font-black text-amber-300 uppercase tracking-wide">🏠 You are a mouse.</p>
					<p class="m-0 text-sm text-white/70 leading-relaxed">
						<strong class="text-amber-300 font-black">Hunger drains</strong> while you're outside your hole.
						Grab food and eat it on the spot — unless the cat is hunting you.
					</p>
					<p class="m-0 text-sm text-white/70 leading-relaxed">
						A <strong class="text-red-400 font-black">cat</strong> patrols the rooms.
						Walking is silent. Sprinting is loud. Break its sight line to lose it.
					</p>
					<p class="m-0 text-sm text-white/70 leading-relaxed">
						Find <strong class="text-amber-300 font-black">cosmetic items</strong> and carry them back to your hole.
						<strong class="text-amber-300 font-black">Collect them all</strong> to win.
					</p>
					<button
						onclick={() => { soundActions.playClick(); showHowToPlay = false; }}
						class="self-end text-xs text-amber-400/70 hover:text-amber-300 transition-colors cursor-pointer font-black underline"
					>
						Got it!
					</button>
				</div>
			{/if}

			<!-- Buttons -->
			<div class="flex flex-col gap-3">
				<button
					onclick={() => {
						soundActions.playClick();
						gameActions.start();
						soundActions.playKatzeIntro();
						setTimeout(() => soundActions.playRandomMeow(), 2000);
						setTimeout(() => soundActions.playRandomMeow(), 5000);
						sceneActions.goToGameScene();
					}}
					class="{btnBase} py-4 text-xl bg-amber-400 text-black"
					style="box-shadow: 6px 6px 0 #000;"
					onmousedown={(e) => (e.currentTarget.style.boxShadow = '2px 2px 0 #000')}
					onmouseup={(e) => (e.currentTarget.style.boxShadow = '6px 6px 0 #000')}
					onmouseleave={(e) => (e.currentTarget.style.boxShadow = '6px 6px 0 #000')}
				>
					🚪 Leave the Hole
				</button>

				<div class="grid grid-cols-2 gap-3">
					<button
						onclick={() => { soundActions.playClick(); showHowToPlay = !showHowToPlay; }}
						class="{btnBase} py-3 text-base bg-white/10 text-white"
						style="box-shadow: 4px 4px 0 #000;"
						onmousedown={(e) => (e.currentTarget.style.boxShadow = '1px 1px 0 #000')}
						onmouseup={(e) => (e.currentTarget.style.boxShadow = '4px 4px 0 #000')}
						onmouseleave={(e) => (e.currentTarget.style.boxShadow = '4px 4px 0 #000')}
					>
						📖 How to Play
					</button>

					<button
						onclick={() => { soundActions.playClick(); showSettings = true; }}
						class="{btnBase} py-3 text-base bg-white/10 text-white"
						style="box-shadow: 4px 4px 0 #000;"
						onmousedown={(e) => (e.currentTarget.style.boxShadow = '1px 1px 0 #000')}
						onmouseup={(e) => (e.currentTarget.style.boxShadow = '4px 4px 0 #000')}
						onmouseleave={(e) => (e.currentTarget.style.boxShadow = '4px 4px 0 #000')}
					>
						⚙️ Settings
					</button>
				</div>
			</div>
		</div>
	</div>
{:else}
	<SettingsHud onBack={() => { soundActions.playClick(); showSettings = false; }} />
{/if}
