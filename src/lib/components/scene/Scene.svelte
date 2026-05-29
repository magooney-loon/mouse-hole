<script lang="ts">
	import { T } from '@threlte/core';
	import { GLTF, interactivity } from '@threlte/extras';
	import { game } from '$lib/stores/game.svelte';
	import Mouse from './Mouse.svelte';

	interactivity();
</script>

<T.PerspectiveCamera position={[0, 0, -10]} fov={60} makeDefault />

<T.DirectionalLight position={[5, 10, 5]} intensity={1} />
<T.AmbientLight intensity={0.6} />

<GLTF url="/house.glb" position={[-2.7, -2.7, -40]} rotation={[1.6, 0, 0]} />

{#if game.state === 'playing'}
	<Mouse />
{/if}
