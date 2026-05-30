<script lang="ts">
	import { T } from '@threlte/core';

	interface Props {
		index: number;
	}
	let { index }: Props = $props();
</script>

{#if index === 0}
	<!-- ── FORK ───────────────────────────────────────────────────────────── -->
	<!-- Round handle rod (slightly tapered) -->
	<T.Mesh castShadow>
		<T.CylinderGeometry args={[0.007, 0.01, 0.09, 8]} />
		<T.MeshStandardMaterial color="#d8d8d8" metalness={0.85} roughness={0.15} />
	</T.Mesh>
	<!-- Shoulder — widens from handle up to prong width -->
	<T.Mesh castShadow position={[0, 0.055, 0]}>
		<T.CylinderGeometry args={[0.025, 0.008, 0.02, 8]} />
		<T.MeshStandardMaterial color="#cccccc" metalness={0.85} roughness={0.15} />
	</T.Mesh>
	<!-- Prong base bar -->
	<T.Mesh castShadow position={[0, 0.067, 0]}>
		<T.BoxGeometry args={[0.052, 0.007, 0.012]} />
		<T.MeshStandardMaterial color="#cccccc" metalness={0.85} roughness={0.15} />
	</T.Mesh>
	<!-- 4 round prongs -->
	{#each [-0.019, -0.006, 0.006, 0.019] as px}
		<T.Mesh castShadow position={[px, 0.088, 0]}>
			<T.CylinderGeometry args={[0.004, 0.005, 0.042, 6]} />
			<T.MeshStandardMaterial color="#d4d4d4" metalness={0.85} roughness={0.15} />
		</T.Mesh>
		<!-- Rounded prong tips -->
		<T.Mesh castShadow position={[px, 0.11, 0]}>
			<T.SphereGeometry args={[0.004, 6, 4]} />
			<T.MeshStandardMaterial color="#d4d4d4" metalness={0.85} roughness={0.15} />
		</T.Mesh>
	{/each}

{:else if index === 1}
	<!-- ── MATCHSTICK ─────────────────────────────────────────────────────── -->
	<!-- Wooden stick (slightly tapered) -->
	<T.Mesh castShadow>
		<T.CylinderGeometry args={[0.005, 0.007, 0.12, 6]} />
		<T.MeshStandardMaterial color="#c8902a" flatShading />
	</T.Mesh>
	<!-- Char collar just below head -->
	<T.Mesh castShadow position={[0, 0.058, 0]}>
		<T.CylinderGeometry args={[0.0075, 0.006, 0.01, 6]} />
		<T.MeshStandardMaterial color="#2a1a0a" flatShading />
	</T.Mesh>
	<!-- Head body (cylinder) -->
	<T.Mesh castShadow position={[0, 0.068, 0]}>
		<T.CylinderGeometry args={[0.016, 0.016, 0.018, 8]} />
		<T.MeshStandardMaterial color="#cc2222" emissive="#cc2222" emissiveIntensity={0.25} flatShading />
	</T.Mesh>
	<!-- Head dome (hemisphere on top) -->
	<T.Mesh castShadow position={[0, 0.077, 0]}>
		<T.SphereGeometry args={[0.016, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
		<T.MeshStandardMaterial color="#dd2222" emissive="#cc2222" emissiveIntensity={0.25} flatShading />
	</T.Mesh>

{:else if index === 2}
	<!-- ── LIGHTER ────────────────────────────────────────────────────────── -->
	<!-- Plastic body (red) -->
	<T.Mesh castShadow>
		<T.BoxGeometry args={[0.038, 0.082, 0.022]} />
		<T.MeshStandardMaterial color="#dd2020" roughness={0.55} flatShading />
	</T.Mesh>
	<!-- Fuel window (glowing yellow strip on front) -->
	<T.Mesh position={[0, -0.006, 0.012]}>
		<T.BoxGeometry args={[0.009, 0.04, 0.001]} />
		<T.MeshStandardMaterial
			color="#ffe066"
			emissive="#ffd700"
			emissiveIntensity={0.5}
			transparent
			opacity={0.8}
		/>
	</T.Mesh>
	<!-- Metal top cap -->
	<T.Mesh castShadow position={[0, 0.05, 0]}>
		<T.BoxGeometry args={[0.03, 0.018, 0.018]} />
		<T.MeshStandardMaterial color="#aaaaaa" metalness={0.7} roughness={0.3} flatShading />
	</T.Mesh>
	<!-- Spark wheel (torus on side of the top cap) -->
	<T.Mesh position={[0.012, 0.057, 0.006]} rotation={[Math.PI / 2, 0, 0]}>
		<T.TorusGeometry args={[0.007, 0.002, 5, 10]} />
		<T.MeshStandardMaterial color="#555555" metalness={0.9} roughness={0.2} />
	</T.Mesh>
	<!-- Nozzle -->
	<T.Mesh position={[0, 0.063, 0]}>
		<T.CylinderGeometry args={[0.004, 0.006, 0.008, 6]} />
		<T.MeshStandardMaterial color="#999999" metalness={0.6} roughness={0.4} />
	</T.Mesh>
	<!-- Flame outer (cone pointing up) -->
	<T.Mesh position={[0, 0.077, 0]}>
		<T.ConeGeometry args={[0.008, 0.02, 6]} />
		<T.MeshStandardMaterial
			color="#ffaa00"
			emissive="#ff6600"
			emissiveIntensity={1.2}
			transparent
			opacity={0.9}
		/>
	</T.Mesh>
	<!-- Flame inner (brighter core) -->
	<T.Mesh position={[0, 0.073, 0]}>
		<T.ConeGeometry args={[0.004, 0.012, 6]} />
		<T.MeshStandardMaterial
			color="#ffffff"
			emissive="#ffcc44"
			emissiveIntensity={1.8}
			transparent
			opacity={0.85}
		/>
	</T.Mesh>

{:else if index === 3}
	<!-- ── PHONE ──────────────────────────────────────────────────────────── -->
	<!-- Body -->
	<T.Mesh castShadow>
		<T.BoxGeometry args={[0.052, 0.098, 0.009]} />
		<T.MeshStandardMaterial color="#111827" roughness={0.3} metalness={0.2} flatShading />
	</T.Mesh>
	<!-- Screen background -->
	<T.Mesh position={[0, -0.002, 0.005]}>
		<T.BoxGeometry args={[0.042, 0.078, 0.001]} />
		<T.MeshStandardMaterial color="#1e3a8a" emissive="#1e40af" emissiveIntensity={0.5} />
	</T.Mesh>
	<!-- App icons (2×2 grid) -->
	<T.Mesh position={[-0.012, 0.014, 0.006]}>
		<T.BoxGeometry args={[0.013, 0.013, 0.001]} />
		<T.MeshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={0.5} />
	</T.Mesh>
	<T.Mesh position={[0.005, 0.014, 0.006]}>
		<T.BoxGeometry args={[0.013, 0.013, 0.001]} />
		<T.MeshStandardMaterial color="#22c55e" emissive="#16a34a" emissiveIntensity={0.5} />
	</T.Mesh>
	<T.Mesh position={[-0.012, -0.002, 0.006]}>
		<T.BoxGeometry args={[0.013, 0.013, 0.001]} />
		<T.MeshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.5} />
	</T.Mesh>
	<T.Mesh position={[0.005, -0.002, 0.006]}>
		<T.BoxGeometry args={[0.013, 0.013, 0.001]} />
		<T.MeshStandardMaterial color="#3b82f6" emissive="#2563eb" emissiveIntensity={0.5} />
	</T.Mesh>
	<!-- Home bar -->
	<T.Mesh position={[0, -0.034, 0.006]}>
		<T.BoxGeometry args={[0.022, 0.003, 0.001]} />
		<T.MeshStandardMaterial color="#93c5fd" emissive="#93c5fd" emissiveIntensity={0.4} />
	</T.Mesh>
	<!-- Notch (top) -->
	<T.Mesh position={[0, 0.039, 0.006]}>
		<T.BoxGeometry args={[0.018, 0.005, 0.001]} />
		<T.MeshStandardMaterial color="#0a0f1e" />
	</T.Mesh>
	<!-- Camera lens -->
	<T.Mesh position={[0.005, 0.039, 0.007]}>
		<T.SphereGeometry args={[0.002, 6, 4]} />
		<T.MeshStandardMaterial color="#1e293b" metalness={0.6} />
	</T.Mesh>
	<!-- Power button (right side) -->
	<T.Mesh position={[0.027, 0.016, 0]}>
		<T.BoxGeometry args={[0.002, 0.016, 0.006]} />
		<T.MeshStandardMaterial color="#374151" flatShading />
	</T.Mesh>
	<!-- Volume buttons (left side) -->
	<T.Mesh position={[-0.027, 0.014, 0]}>
		<T.BoxGeometry args={[0.002, 0.022, 0.005]} />
		<T.MeshStandardMaterial color="#374151" flatShading />
	</T.Mesh>

{:else}
	<!-- ── THIMBLE ─────────────────────────────────────────────────────────── -->
	<!-- Main body (tapered cylinder) -->
	<T.Mesh castShadow>
		<T.CylinderGeometry args={[0.026, 0.035, 0.072, 12]} />
		<T.MeshStandardMaterial color="#c9a84c" metalness={0.65} roughness={0.3} flatShading />
	</T.Mesh>
	<!-- Dome top -->
	<T.Mesh castShadow position={[0, 0.036, 0]}>
		<T.SphereGeometry args={[0.026, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
		<T.MeshStandardMaterial color="#d4b55a" metalness={0.65} roughness={0.3} flatShading />
	</T.Mesh>
	<!-- Bottom rim -->
	<T.Mesh position={[0, -0.032, 0]}>
		<T.TorusGeometry args={[0.035, 0.004, 6, 14]} />
		<T.MeshStandardMaterial color="#a07828" metalness={0.8} roughness={0.2} flatShading />
	</T.Mesh>
	<!-- Middle decorative band -->
	<T.Mesh position={[0, 0.004, 0]}>
		<T.TorusGeometry args={[0.03, 0.003, 6, 14]} />
		<T.MeshStandardMaterial color="#a07828" metalness={0.8} roughness={0.2} flatShading />
	</T.Mesh>
	<!-- Upper band (at dome base) -->
	<T.Mesh position={[0, 0.03, 0]}>
		<T.TorusGeometry args={[0.027, 0.003, 6, 12]} />
		<T.MeshStandardMaterial color="#8a6420" metalness={0.85} roughness={0.15} flatShading />
	</T.Mesh>
{/if}
