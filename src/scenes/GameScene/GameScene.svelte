<script lang="ts">
	/* import { T } from '@threlte/core';
	import { Collider } from '@threlte/rapier'; */
	import Mouse from '$lib/Mouse.svelte';
	import CatAI from '$lib/CatAI.svelte';
	import Cheese from '$lib/Cheese.svelte';
	import Decoration from '$lib/Decoration.svelte';
	import SpawnPoint from '$lib/SpawnPoint.svelte';
</script>

<!-- Static floor placeholder -->
<!-- <T.Group>
	<Collider shape="cuboid" args={[50, 0.01, 50]} />
	<T.Mesh receiveShadow>
		<T.BoxGeometry args={[100, 0.2, 100]} />
		<T.MeshStandardMaterial color="#8B6914" transparent opacity={0.01} />
	</T.Mesh>
</T.Group> -->
<Mouse />
<CatAI />
<Cheese position={[1.29, 0, 2.14]} />
<Cheese position={[8.127, 0, 1.407]} />
<Cheese position={[6.352, 0, -7.188]} />

<Decoration position={[7.156, 0.879, -8.027]} spawnPosition={[1.936, 0.05, -1.894]} />
<SpawnPoint position={[1.936, 0.05, -1.894]} />
