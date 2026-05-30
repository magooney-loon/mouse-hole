<script lang="ts">
	import { T } from '@threlte/core';

	interface Props {
		index: number;
	}
	let { index }: Props = $props();
</script>

{#if index === 0}
	<!-- FORK -->
	<!-- Handle -->
	<T.Mesh castShadow>
		<T.BoxGeometry args={[0.012, 0.09, 0.012]} />
		<T.MeshStandardMaterial color="#c0c0c0" metalness={0.7} roughness={0.3} flatShading />
	</T.Mesh>
	<!-- Prong bridge -->
	<T.Mesh castShadow position={[0, 0.05, 0]}>
		<T.BoxGeometry args={[0.055, 0.008, 0.012]} />
		<T.MeshStandardMaterial color="#c0c0c0" metalness={0.7} roughness={0.3} flatShading />
	</T.Mesh>
	<!-- Prongs -->
	{#each [-0.02, -0.007, 0.007, 0.02] as px}
		<T.Mesh castShadow position={[px, 0.07, 0]}>
			<T.BoxGeometry args={[0.007, 0.035, 0.007]} />
			<T.MeshStandardMaterial color="#c0c0c0" metalness={0.7} roughness={0.3} flatShading />
		</T.Mesh>
	{/each}

{:else if index === 1}
	<!-- MATCHSTICK -->
	<!-- Stick -->
	<T.Mesh castShadow>
		<T.CylinderGeometry args={[0.006, 0.006, 0.12, 6]} />
		<T.MeshStandardMaterial color="#c49a3c" flatShading />
	</T.Mesh>
	<!-- Head -->
	<T.Mesh castShadow position={[0, 0.065, 0]}>
		<T.SphereGeometry args={[0.02, 8, 6]} />
		<T.MeshStandardMaterial
			color="#cc3333"
			emissive="#cc3333"
			emissiveIntensity={0.4}
			flatShading
		/>
	</T.Mesh>

{:else if index === 2}
	<!-- LIGHTER -->
	<!-- Body -->
	<T.Mesh castShadow>
		<T.BoxGeometry args={[0.038, 0.085, 0.022]} />
		<T.MeshStandardMaterial color="#e8e8e8" metalness={0.1} roughness={0.6} flatShading />
	</T.Mesh>
	<!-- Top guard -->
	<T.Mesh castShadow position={[0, 0.052, 0]}>
		<T.BoxGeometry args={[0.032, 0.018, 0.018]} />
		<T.MeshStandardMaterial color="#b0b0b0" metalness={0.5} roughness={0.4} flatShading />
	</T.Mesh>
	<!-- Spark wheel -->
	<T.Mesh position={[0, 0.065, 0.007]}>
		<T.SphereGeometry args={[0.006, 6, 4]} />
		<T.MeshStandardMaterial color="#666" metalness={0.8} roughness={0.2} />
	</T.Mesh>
	<!-- Flame window -->
	<T.Mesh position={[0, 0.04, 0.012]}>
		<T.BoxGeometry args={[0.018, 0.012, 0.002]} />
		<T.MeshStandardMaterial color="#ffaa00" emissive="#ff6600" emissiveIntensity={0.7} />
	</T.Mesh>

{:else if index === 3}
	<!-- PHONE -->
	<!-- Body -->
	<T.Mesh castShadow>
		<T.BoxGeometry args={[0.055, 0.09, 0.008]} />
		<T.MeshStandardMaterial color="#1a1a2e" roughness={0.4} flatShading />
	</T.Mesh>
	<!-- Screen -->
	<T.Mesh position={[0, 0.005, 0.005]}>
		<T.BoxGeometry args={[0.046, 0.068, 0.002]} />
		<T.MeshStandardMaterial
			color="#4488ff"
			emissive="#4488ff"
			emissiveIntensity={0.5}
		/>
	</T.Mesh>
	<!-- Camera dot -->
	<T.Mesh position={[0, 0.038, 0.005]}>
		<T.SphereGeometry args={[0.003, 6, 4]} />
		<T.MeshStandardMaterial color="#333" metalness={0.5} />
	</T.Mesh>

{:else}
	<!-- THIMBLE -->
	<!-- Body -->
	<T.Mesh castShadow>
		<T.CylinderGeometry args={[0.026, 0.033, 0.07, 10]} />
		<T.MeshStandardMaterial
			color="#c9a84c"
			metalness={0.6}
			roughness={0.35}
			flatShading
		/>
	</T.Mesh>
	<!-- Dome top -->
	<T.Mesh castShadow position={[0, 0.035, 0]}>
		<T.SphereGeometry args={[0.026, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
		<T.MeshStandardMaterial
			color="#c9a84c"
			metalness={0.6}
			roughness={0.35}
			flatShading
		/>
	</T.Mesh>
	<!-- Band rim -->
	<T.Mesh position={[0, -0.03, 0]}>
		<T.TorusGeometry args={[0.033, 0.003, 6, 12]} />
		<T.MeshStandardMaterial color="#b8942f" metalness={0.7} roughness={0.3} flatShading />
	</T.Mesh>
{/if}
