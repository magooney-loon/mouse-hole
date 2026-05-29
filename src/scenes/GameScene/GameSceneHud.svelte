<script lang="ts">
	import { fly } from 'svelte/transition';
	import { sceneActions } from '$extensions/scene/scene.svelte';
	import { soundActions } from '$core/GlobalAudio.svelte';

	// Placeholder hunger — will be driven by game state later
	let hunger = $state(80);
</script>

<div class="pointer-events-none absolute inset-0" transition:fly={{ y: 12, duration: 220 }}>

	<!-- Hunger bar — top left -->
	<div class="absolute top-6 left-6 flex flex-col gap-1.5">
		<div class="flex items-center gap-2">
			<span class="text-sm font-black text-amber-300 uppercase tracking-widest"
				  style="text-shadow: 1px 1px 0 #000;">🍖 Hunger</span>
			<span class="text-xs font-black text-white/50">{hunger}%</span>
		</div>
		<div
			class="w-40 h-4 bg-black/60 border-4 border-black rounded-sm overflow-hidden"
			style="box-shadow: 3px 3px 0 #000;"
		>
			<div
				class="h-full transition-all duration-500"
				style="width: {hunger}%; background: {hunger > 50 ? '#fbbf24' : hunger > 25 ? '#f97316' : '#ef4444'};"
			></div>
		</div>
	</div>

	<!-- Back button — bottom center -->
	<div class="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2">
		<button
			onclick={() => { soundActions.playClick(); sceneActions.goToMainMenu(); }}
			class="px-6 py-2.5 font-black text-black bg-amber-400 border-4 border-black
			       rounded-xl cursor-pointer transition-all duration-100
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
