<script lang="ts">
	import { T } from '@threlte/core';
	import { useGltf } from '@threlte/extras';
	import { AutoColliders } from '@threlte/rapier';
	import { BASE_URL } from '$extensions/settings/settings.svelte';

	const gltf = useGltf(`${BASE_URL}models/stages/house.glb`);
</script>

{#if $gltf}
	<T.Group name="House">
		<AutoColliders shape="trimesh">
			<T is={$gltf.scene} />
		</AutoColliders>
	</T.Group>
{/if}
