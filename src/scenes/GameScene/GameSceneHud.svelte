<script lang="ts">
	import { fly } from 'svelte/transition';
	import { sceneActions } from '$extensions/scene/scene.svelte';
	import { soundActions } from '$core/GlobalAudio.svelte';
	import PlayerStats from '$lib/PlayerStats.svelte';
	import { gameState, gameActions } from '$lib/gameState.svelte';
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

	<!-- Back button — bottom center -->
	<div class="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2">
		<button
			onclick={() => { soundActions.playClick(); gameActions.reset(); sceneActions.goToMainMenu(); }}
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
