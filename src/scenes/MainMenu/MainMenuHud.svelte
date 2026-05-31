<script lang="ts">
	import { sceneActions } from '$extensions/scene/scene.svelte';
	import { soundActions } from '$core/GlobalAudio.svelte';
	import { gameActions } from '$lib/gameState.svelte';
	import SettingsHud from '$scenes/SettingsHud.svelte';
	import Scoreboard from './Scoreboard.svelte';

	let showSettings = $state(false);
	let showScoreboard = $state(false);

	const btnBase = `w-full font-black rounded-xl cursor-pointer border-4 border-black
	                 transition-all duration-100
	                 hover:translate-x-[2px] hover:translate-y-[2px]
	                 active:translate-x-[4px] active:translate-y-[4px]`;
</script>

{#if showScoreboard}
	<Scoreboard
		onBack={() => {
			showScoreboard = false;
		}}
	/>
{:else if !showSettings}
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
				{#each [['WASD', 'move'], ['Q/E', 'strafe'], ['Shift', 'sprint'], ['Space', 'jump'], ['F', 'interact']] as [key, label]}
					<span class="flex items-center gap-1.5">
						<kbd
							class="bg-amber-400 text-black border-2 border-black rounded px-1.5 py-0.5
							       font-black text-xs leading-none"
							style="box-shadow: 2px 2px 0 #000;">{key}</kbd
						>
						<span class="text-xs text-white/50 font-bold">{label}</span>
					</span>
				{/each}
			</div>

			<!-- Buttons -->
			<div class="flex flex-col gap-3">
				<button
					onclick={() => {
						soundActions.playClick();
						gameActions.start();
						soundActions.playKatzeIntro();
						setTimeout(() => soundActions.playRandomMeow(0.1), 2000);
						setTimeout(() => soundActions.playRandomMeow(0.1), 5000);
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

				<button
					onclick={() => {
						soundActions.playClick();
						showScoreboard = true;
					}}
					class="{btnBase} py-3 text-base bg-white/10 text-white"
					style="box-shadow: 4px 4px 0 #000;"
					onmousedown={(e) => (e.currentTarget.style.boxShadow = '1px 1px 0 #000')}
					onmouseup={(e) => (e.currentTarget.style.boxShadow = '4px 4px 0 #000')}
					onmouseleave={(e) => (e.currentTarget.style.boxShadow = '4px 4px 0 #000')}
				>
					🏆 Scoreboard
				</button>

				<div class="grid grid-cols-2 gap-3">
					<a
						href="https://github.com/magooney-loon/mouse-hole"
						target="_blank"
						rel="noopener noreferrer"
						onclick={() => soundActions.playClick()}
						class="{btnBase} py-3 text-base bg-white/10 text-white text-center"
						style="box-shadow: 4px 4px 0 #000;"
						onmousedown={(e) => (e.currentTarget.style.boxShadow = '1px 1px 0 #000')}
						onmouseup={(e) => (e.currentTarget.style.boxShadow = '4px 4px 0 #000')}
						onmouseleave={(e) => (e.currentTarget.style.boxShadow = '4px 4px 0 #000')}
					>
						🐙 Source Code
					</a>

					<button
						onclick={() => {
							soundActions.playClick();
							showSettings = true;
						}}
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
	<SettingsHud
		onBack={() => {
			soundActions.playClick();
			showSettings = false;
		}}
	/>
{/if}
