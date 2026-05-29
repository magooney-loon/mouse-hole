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
			class="relative flex flex-col items-center gap-7 w-full max-w-sm mx-4 px-8 py-10
			       bg-black/50 border-4 border-black rounded-2xl backdrop-blur-md"
			style="box-shadow: 7px 7px 0 #000;"
		>
			<!-- Title -->
			<div class="text-center">
				<div class="text-6xl mb-2 select-none" aria-hidden="true">🐭</div>
				<h1
					class="text-6xl font-black text-amber-300 m-0 leading-none uppercase"
					style="text-shadow: 3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;"
				>
					MOUSE<br />HOLE
				</h1>
				<p class="text-white/50 mt-3 text-[10px] font-black tracking-[0.35em] uppercase m-0">
					Sneak · Forage · Decorate
				</p>
			</div>

			<!-- How to Play panel -->
			{#if showHowToPlay}
				<div
					class="w-full bg-amber-950/70 border-4 border-black rounded-xl p-5
					       text-white flex flex-col gap-3"
					style="box-shadow: 4px 4px 0 #000;"
				>
					<p class="m-0 text-sm font-black text-amber-300 uppercase tracking-wide">
						🏠 You are a mouse.
					</p>
					<p class="m-0 text-sm text-white/70 leading-relaxed">
						<strong class="text-amber-300 font-black">Hunger drains</strong> while you're outside your hole.
						Grab food and eat it on the spot — instant refill, unless the cat is hunting you.
					</p>
					<p class="m-0 text-sm text-white/70 leading-relaxed">
						A <strong class="text-red-400 font-black">cat</strong> patrols the rooms.
						Walking is silent. Sprinting is loud. Break its sight line to lose it.
					</p>
					<p class="m-0 text-sm text-white/70 leading-relaxed">
						Find <strong class="text-amber-300 font-black">cosmetic items</strong> — bottle caps, thimbles, buttons —
						and carry them back to your hole. <strong class="text-amber-300 font-black">Collect them all</strong> to win.
					</p>

					<!-- Controls grid -->
					<div class="border-t-4 border-black/40 pt-3 mt-1 grid grid-cols-2 gap-x-4 gap-y-2.5">
						{#each [['W A S D', 'Walk (silent)'], ['Shift', 'Sprint (loud!)'], ['Space', 'Jump'], ['E', 'Pick up / Interact']] as [key, desc]}
							<div class="flex items-center gap-2">
								<kbd
									class="bg-amber-400 text-black border-2 border-black rounded px-1.5 py-0.5
									       font-black text-xs leading-none shrink-0"
									style="box-shadow: 2px 2px 0 #000;"
								>
									{key}
								</kbd>
								<span class="text-xs text-white/60 font-bold">{desc}</span>
							</div>
						{/each}
					</div>

					<button
						onclick={() => { soundActions.playClick(); showHowToPlay = false; }}
						class="self-end text-xs text-amber-400/70 hover:text-amber-300 transition-colors cursor-pointer font-black underline"
					>
						Got it!
					</button>
				</div>
			{:else}
				<!-- Quick controls strip -->
				<div class="grid grid-cols-2 gap-3">
					{#each [['WASD', 'move'], ['Shift', 'sprint'], ['Space', 'jump'], ['E', 'interact']] as [key, label]}
						<span class="flex items-center gap-1.5">
							<kbd
								class="bg-amber-400 text-black border-2 border-black rounded px-1.5 py-0.5
								       font-black text-xs leading-none"
								style="box-shadow: 2px 2px 0 #000;"
							>
								{key}
							</kbd>
							<span class="text-xs text-white/50 font-bold">{label}</span>
						</span>
					{/each}
				</div>
			{/if}

			<!-- Buttons -->
			<div class="flex flex-col gap-3 w-full">
				<button
					onclick={() => { soundActions.playClick(); sceneActions.goToDemoScene(); }}
					class="w-full py-4 text-xl font-black rounded-xl cursor-pointer
					       bg-amber-400 text-black border-4 border-black
					       transition-all duration-100
					       hover:translate-x-[3px] hover:translate-y-[3px]
					       active:translate-x-[6px] active:translate-y-[6px]"
					style="box-shadow: 6px 6px 0 #000;"
					onmousedown={(e) => (e.currentTarget.style.boxShadow = '2px 2px 0 #000')}
					onmouseup={(e) => (e.currentTarget.style.boxShadow = '6px 6px 0 #000')}
					onmouseleave={(e) => (e.currentTarget.style.boxShadow = '6px 6px 0 #000')}
				>
					🚪 Leave the Hole
				</button>

				{#if !showHowToPlay}
					<button
						onclick={() => { soundActions.playClick(); showHowToPlay = true; }}
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
						📖 How to Play
					</button>
				{/if}

				<button
					onclick={() => { soundActions.playClick(); showSettings = true; }}
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
