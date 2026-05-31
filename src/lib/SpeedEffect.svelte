<script lang="ts">
	import { gameState } from '$lib/gameState.svelte';
	import { Spring } from 'svelte/motion';

	const sprintSpring = new Spring(0, { stiffness: 0.15, damping: 0.4 });

	$effect(() => {
		sprintSpring.target = gameState.isSprinting ? 1 : 0;
	});
</script>

{#if sprintSpring.current > 0.01}
	<div
		class="pointer-events-none absolute inset-0 overflow-hidden"
		style="opacity: {sprintSpring.current * 0.7};"
	>
		<!-- Radial speed lines using conic gradient -->
		<div
			class="absolute inset-0"
			style="
				background: repeating-conic-gradient(
					from 0deg,
					transparent 0deg,
					transparent 22deg,
					rgba(255,255,255,0.09) 22deg,
					rgba(255,255,255,0.09) 28deg
				);
				animation: speed-spin {sprintSpring.current * 0.8}s linear infinite;
				mix-blend-mode: screen;
				mask-image: radial-gradient(ellipse at center, transparent 22%, black 46%);
			"
		></div>

		<!-- Vignette that intensifies with sprint -->
		<div
			class="absolute inset-0"
			style="
				background: radial-gradient(
					ellipse at center,
					transparent 40%,
					rgba(0, 0, 0, {sprintSpring.current * 0.45}) 100%
				);
			"
		></div>

		<!-- Subtle warm tint at edges -->
		<div
			class="absolute inset-0"
			style="
				background: radial-gradient(
					ellipse at center,
					transparent 50%,
					rgba(255, 170, 50, {sprintSpring.current * 0.08}) 100%
				);
			"
		></div>
	</div>
{/if}
