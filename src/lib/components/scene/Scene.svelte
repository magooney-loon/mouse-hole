<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import { interactivity } from '@threlte/extras';

	interactivity();

	let rotation = $state(0);

	useTask((delta) => {
		rotation += delta;
	});
</script>

<T.PerspectiveCamera position.z={5} makeDefault />

<T.DirectionalLight position={[3, 4, 5]} intensity={1} />
<T.AmbientLight intensity={0.4} />

<T.Mesh rotation.y={rotation} rotation.x={rotation * 0.3}>
	<T.BoxGeometry />
	<T.MeshStandardMaterial color="hotpink" />
</T.Mesh>
