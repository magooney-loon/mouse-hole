<script lang="ts">
	import { T } from '@threlte/core';
	import { Collider } from '@threlte/rapier';
	import Mouse from '$lib/Mouse.svelte';
	import CatAI from '$lib/CatAI.svelte';
</script>

<!-- Static floor placeholder -->
<T.Group>
	<Collider shape="cuboid" args={[50, 0.01, 50]} />
	<T.Mesh receiveShadow>
		<T.BoxGeometry args={[100, 0.2, 100]} />
		<T.MeshStandardMaterial color="#8B6914" transparent opacity={0.01} />
	</T.Mesh>
</T.Group>
<Mouse />
<CatAI />
