<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import * as THREE from 'three';
	import { decorationState } from '$lib/decorationState.svelte';

	interface Props {
		position: [number, number, number];
	}
	let { position }: Props = $props();

	let outerRingRef: THREE.Mesh | null = null;
	let glowMatRef: THREE.MeshStandardMaterial | null = null;
	let outerMatRef: THREE.MeshStandardMaterial | null = null;
	let houseGroupRef: THREE.Group | null = null;
	let pulseT = 0;

	const COL_IDLE = new THREE.Color('#f59e0b');
	const COL_ACTIVE = new THREE.Color('#4ade80');
	const _col = new THREE.Color();

	useTask((delta) => {
		pulseT += delta;

		const active = decorationState.carrying && decorationState.deliverInRange;

		// Pulse ring
		if (outerRingRef) {
			const pulse = Math.sin(pulseT * (active ? 4 : 2.5)) * 0.5 + 0.5;
			outerRingRef.scale.setScalar(1 + pulse * 0.65);
			if (outerMatRef) outerMatRef.opacity = 0.6 - pulse * 0.5;
		}

		// Floating house bob + slow spin
		if (houseGroupRef) {
			houseGroupRef.position.y = 0.35 + Math.sin(pulseT * 1.4) * 0.06;
			houseGroupRef.rotation.y = pulseT * 0.5;
		}

		// Colour: idle amber → active green
		_col.lerpColors(COL_IDLE, COL_ACTIVE, active ? 0.9 : 0);
		if (glowMatRef) {
			glowMatRef.color.copy(_col);
			glowMatRef.emissive.copy(_col);
			glowMatRef.emissiveIntensity = 0.15 + (Math.sin(pulseT * 1.6) * 0.5 + 0.5) * 0.25;
		}
		if (outerMatRef) {
			outerMatRef.color.copy(_col);
			outerMatRef.emissive.copy(_col);
		}
	});
</script>

<T.Group position={[position[0], position[1], position[2]]}>
	<!-- Base glow disc -->
	<T.Mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
		<T.CircleGeometry args={[0.55, 48]} />
		<T.MeshStandardMaterial
			color="#f59e0b"
			emissive="#f59e0b"
			emissiveIntensity={0.2}
			transparent
			opacity={0.55}
			depthWrite={false}
			oncreate={(ref) => {
				glowMatRef = ref;
			}}
		/>
	</T.Mesh>

	<!-- Static border ring -->
	<T.Mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
		<T.RingGeometry args={[0.5, 0.56, 48]} />
		<T.MeshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.6} />
	</T.Mesh>

	<!-- Animated pulse ring -->
	<T.Mesh
		rotation={[-Math.PI / 2, 0, 0]}
		position={[0, 0.004, 0]}
		oncreate={(ref) => {
			outerRingRef = ref;
		}}
	>
		<T.RingGeometry args={[0.5, 0.56, 48]} />
		<T.MeshStandardMaterial
			color="#f59e0b"
			emissive="#f59e0b"
			emissiveIntensity={0.5}
			transparent
			opacity={0.5}
			depthWrite={false}
			oncreate={(ref) => {
				outerMatRef = ref;
			}}
		/>
	</T.Mesh>

	<!-- Floating house icon -->
	<T.Group
		oncreate={(ref) => {
			houseGroupRef = ref;
		}}
	>
		<!-- Roof -->
		<T.Mesh position={[0, 0.04, 0]}>
			<T.ConeGeometry args={[0.065, 0.08, 4]} />
			<T.MeshStandardMaterial
				color="#e8453c"
				emissive="#e8453c"
				emissiveIntensity={0.3}
				flatShading
			/>
		</T.Mesh>

		<!-- Walls -->
		<T.Mesh position={[0, 0, 0]}>
			<T.BoxGeometry args={[0.075, 0.06, 0.075]} />
			<T.MeshStandardMaterial
				color="#fbbf24"
				emissive="#fbbf24"
				emissiveIntensity={0.3}
				flatShading
			/>
		</T.Mesh>

		<!-- Door -->
		<T.Mesh position={[0, -0.015, 0.038]}>
			<T.BoxGeometry args={[0.025, 0.035, 0.002]} />
			<T.MeshStandardMaterial
				color="#9B7520"
				emissive="#fbbf24"
				emissiveIntensity={0.15}
				flatShading
			/>
		</T.Mesh>

		<!-- Window left -->
		<T.Mesh position={[-0.022, 0.005, 0.038]}>
			<T.BoxGeometry args={[0.015, 0.015, 0.002]} />
			<T.MeshStandardMaterial color="#87CEEB" emissive="#87CEEB" emissiveIntensity={0.4} />
		</T.Mesh>

		<!-- Window right -->
		<T.Mesh position={[0.022, 0.005, 0.038]}>
			<T.BoxGeometry args={[0.015, 0.015, 0.002]} />
			<T.MeshStandardMaterial color="#87CEEB" emissive="#87CEEB" emissiveIntensity={0.4} />
		</T.Mesh>

		<!-- Chimney -->
		<T.Mesh position={[0.025, 0.07, -0.01]}>
			<T.BoxGeometry args={[0.015, 0.04, 0.015]} />
			<T.MeshStandardMaterial color="#8B4513" flatShading />
		</T.Mesh>
	</T.Group>
</T.Group>
