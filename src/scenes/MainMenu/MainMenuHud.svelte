<script lang="ts">
	import { sceneActions } from '$extensions/scene/scene.svelte';
	import { soundActions } from '$core/GlobalAudio.svelte';
	import SettingsHud from '$scenes/SettingsHud.svelte';

	let showSettings = $state(false);
	let showHowToPlay = $state(false);
</script>

{#if !showSettings}
	<div class="pointer-events-auto absolute inset-0 flex items-center justify-center">
		<div
			class="relative flex flex-col items-center gap-6 w-full max-w-lg mx-4 px-8 py-10
			       bg-amber-950/85 border-4 border-amber-700/60 rounded-3xl shadow-2xl backdrop-blur-sm"
		>
			<!-- Title -->
			<div class="text-center">
				<div class="text-6xl mb-3 select-none" aria-hidden="true">🐭</div>
				<h1
					class="text-6xl font-black text-amber-100 m-0 tracking-tight leading-none"
					style="text-shadow: 3px 3px 0px #78350f, 0 0 40px #f59e0b66;"
				>
					MOUSE HOLE
				</h1>
				<p class="text-amber-400/70 mt-2 text-xs font-bold tracking-[0.25em] uppercase m-0">
					Sneak · Forage · Decorate
				</p>
			</div>

			<!-- How to Play panel (toggled) -->
			{#if showHowToPlay}
				<div
					class="w-full bg-amber-900/50 border-2 border-amber-700/40 rounded-2xl p-5 text-amber-100 flex flex-col gap-3"
				>
					<p class="m-0 text-sm font-bold text-amber-300">
						🏠 You are a mouse living inside a house.
					</p>
					<p class="m-0 text-sm opacity-75 leading-relaxed">
						<strong class="text-amber-300">Hunger drains constantly</strong> while you're outside.
						Find food and eat it on the spot — it restores you immediately, as long as the cat isn't chasing you.
					</p>
					<p class="m-0 text-sm opacity-75 leading-relaxed">
						A <strong class="text-red-300">cat</strong> patrols the rooms. Walking is silent.
						Sprinting is fast — but loud. Break its line of sight and it loses you.
					</p>
					<p class="m-0 text-sm opacity-75 leading-relaxed">
						Hidden around the house are <strong class="text-amber-300">cosmetic items</strong> — bottle caps,
						buttons, thimbles, and more. These you must <strong class="text-amber-300">carry back to your hole</strong>.
						Collect them all to win.
					</p>

					<!-- Controls grid -->
					<div class="border-t border-amber-700/40 pt-3 mt-1 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
						{#each [['W A S D', 'Walk (silent)'], ['Shift', 'Sprint (loud!)'], ['Space', 'Jump'], ['E', 'Pick up / Interact']] as [key, desc]}
							<div class="flex items-center gap-2">
								<kbd
									class="bg-amber-800/80 border border-amber-600/60 rounded-lg px-2 py-1
									       font-mono text-amber-200 text-xs leading-none shrink-0 shadow-sm"
								>
									{key}
								</kbd>
								<span class="opacity-70">{desc}</span>
							</div>
						{/each}
					</div>

					<button
						onclick={() => {
							soundActions.playClick();
							showHowToPlay = false;
						}}
						class="self-end text-xs text-amber-400/70 hover:text-amber-300 transition-colors cursor-pointer underline"
					>
						Got it!
					</button>
				</div>
			{:else}
				<!-- Quick controls strip -->
				<div class="flex gap-4 text-xs text-amber-400/60">
					{#each [['WASD', 'move'], ['Shift', 'sprint'], ['Space', 'jump'], ['E', 'interact']] as [key, label]}
						<span class="flex items-center gap-1.5">
							<kbd
								class="bg-amber-900/60 border border-amber-700/40 rounded px-1.5 py-0.5 font-mono text-amber-300"
							>
								{key}
							</kbd>
							<span>{label}</span>
						</span>
					{/each}
				</div>
			{/if}

			<!-- Main buttons -->
			<div class="flex flex-col gap-3 w-full">
				<button
					onclick={() => {
						soundActions.playClick();
						sceneActions.goToDemoScene();
					}}
					class="w-full py-4 text-xl font-black rounded-2xl cursor-pointer transition-all
					       bg-amber-500 text-amber-950 border-4 border-amber-400/50
					       hover:bg-amber-400 hover:scale-105 active:scale-95 shadow-lg shadow-amber-900/60"
					style="text-shadow: 1px 1px 0px #78350f40;"
				>
					🚪 Leave the Hole
				</button>

				{#if !showHowToPlay}
					<button
						onclick={() => {
							soundActions.playClick();
							showHowToPlay = true;
						}}
						class="w-full py-3 text-base font-bold rounded-2xl cursor-pointer transition-all
						       bg-amber-900/50 text-amber-200 border-2 border-amber-700/40
						       hover:bg-amber-800/60 hover:border-amber-600/60"
					>
						📖 How to Play
					</button>
				{/if}

				<button
					onclick={() => {
						soundActions.playClick();
						showSettings = true;
					}}
					class="w-full py-3 text-base font-bold rounded-2xl cursor-pointer transition-all
					       bg-amber-900/50 text-amber-200 border-2 border-amber-700/40
					       hover:bg-amber-800/60 hover:border-amber-600/60"
				>
					⚙️ Settings
				</button>
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
