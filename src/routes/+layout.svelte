<script lang="ts">
	import CanvasPortalTarget from '$lib/components/CanvasPortalTarget.svelte';
	import { Canvas } from '@threlte/core';
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';

	let { children }: { children: Snippet } = $props();

	onMount(async () => {
		const { default: Wavedash } = await import('@wvdsh/sdk-js');
		Wavedash.updateLoadProgressZeroToOne(1);
		Wavedash.init({ debug: true });
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Mouse Hole</title>
</svelte:head>

<div class="canvas-wrapper">
	<Canvas>
		<CanvasPortalTarget />
	</Canvas>
</div>

{@render children()}

<style>
	.canvas-wrapper {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 0;
	}

	:global(body) {
		margin: 0;
		padding: 0;
		overflow: hidden;
		background: black;
	}
</style>
