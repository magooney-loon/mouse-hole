<script lang="ts">
	import { T } from '@threlte/core';
	import { GLTF, interactivity } from '@threlte/extras';

	interactivity();
</script>

<T.PerspectiveCamera position={[0, 10, 10]} fov={50} lookAt={[0, 0, 0]} makeDefault />

<T.DirectionalLight position={[5, 10, 5]} intensity={1} />
<T.AmbientLight intensity={0.6} />

<GLTF url="/house/scene.gltf" position={[-0.08, 9, 11]} />
