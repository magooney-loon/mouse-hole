<script lang="ts">
	import { T } from '@threlte/core';
	import { Collider, Debug } from '@threlte/rapier';
	import Mouse from '$lib/Mouse.svelte';
</script>

<!-- DEBUG: remove when collider sizes are confirmed -->
<Debug />

<!-- Static floor placeholder -->
<T.Group>
	<Collider shape="cuboid" args={[50, 0.1, 50]} />
	<T.Mesh receiveShadow>
		<T.BoxGeometry args={[100, 0.2, 100]} />
		<T.MeshStandardMaterial color="#8B6914" transparent opacity={0.3} />
	</T.Mesh>
</T.Group>

<Mouse />
