<script lang="ts">
	import { T } from '@threlte/core';
	import { GLTF, OrbitControls, interactivity } from '@threlte/extras';

	interactivity();

	const DEV_ORBIT = 1; // set to 0 to disable
</script>

<T.PerspectiveCamera position={[0, 35, 0]} fov={60} makeDefault>
	{#if DEV_ORBIT}
		<OrbitControls />
	{/if}
</T.PerspectiveCamera>

<T.DirectionalLight position={[5, 10, 5]} intensity={1} />
<T.AmbientLight intensity={0.6} />

<GLTF url="/house.glb" position={[-2.5, 9, 2.5]} />
