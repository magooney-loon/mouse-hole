<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import * as THREE from 'three';
	import { decorationState, SNAP_OFFSETS } from '$lib/decorationState.svelte';
	import DecorationShape from './DecorationShape.svelte';

	interface Props {
		position: [number, number, number];
	}
	let { position }: Props = $props();

	let outerRingRef: THREE.Mesh | null = null;
	let glowMatRef: THREE.MeshStandardMaterial | null = null;
	let outerMatRef: THREE.MeshStandardMaterial | null = null;
	let houseGroupRef: THREE.Group | null = null;
	let slotRefs: (THREE.Group | null)[] = [];
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
			outerRingRef.scale.setScalar(1 + pulse * 0.35);
			if (outerMatRef) outerMatRef.opacity = 0.6 - pulse * 0.5;
		}

		// Floating house bob + slow spin
		if (houseGroupRef) {
			houseGroupRef.position.y = 0.35 + Math.sin(pulseT * 1.4) * 0.06;
			houseGroupRef.rotation.y = pulseT * 0.5;
		}

		// Show/hide pre-created decoration slots based on which indices were delivered
		for (let i = 0; i < SNAP_OFFSETS.length; i++) {
			if (slotRefs[i]) {
				slotRefs[i]!.visible = decorationState.delivered[i];
			}
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
		<T.CircleGeometry args={[0.3, 48]} />
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
		<T.RingGeometry args={[0.28, 0.32, 48]} />
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
		<T.RingGeometry args={[0.28, 0.32, 48]} />
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

	<!-- ── Pre-created decoration slots (hidden until delivered) ─────────── -->
	{#each SNAP_OFFSETS as offset, i}
		<T.Group
			position={[offset[0], offset[1], offset[2]]}
			visible={false}
			scale={0.8}
			oncreate={(ref) => {
				slotRefs[i] = ref;
			}}
		>
			<DecorationShape index={i} />
		</T.Group>
	{/each}

	<!-- Floating house icon -->
	<T.Group
		oncreate={(ref) => {
			houseGroupRef = ref;
		}}
	>
		<!-- Walls — centered at y=0, spans -0.04 to +0.04 -->
		<T.Mesh>
			<T.BoxGeometry args={[0.1, 0.08, 0.1]} />
			<T.MeshStandardMaterial color="#fcd97d" emissive="#f59e0b" emissiveIntensity={0.2} flatShading />
		</T.Mesh>

		<!-- Eave ledge — sits right at the top of the walls -->
		<T.Mesh position={[0, 0.04, 0]}>
			<T.BoxGeometry args={[0.115, 0.007, 0.115]} />
			<T.MeshStandardMaterial color="#c0392b" emissive="#c0392b" emissiveIntensity={0.15} flatShading />
		</T.Mesh>

		<!-- Hip roof (4-sided pyramid)
		     Rotated 45° on Y so corners align with the box corners.
		     Positioned so its base sits on top of the walls (y=0.04). -->
		<T.Mesh position={[0, 0.078, 0]} rotation={[0, Math.PI / 4, 0]}>
			<T.ConeGeometry args={[0.1, 0.076, 4]} />
			<T.MeshStandardMaterial color="#e8453c" emissive="#e8453c" emissiveIntensity={0.3} flatShading />
		</T.Mesh>

		<!-- Door -->
		<T.Mesh position={[0, -0.018, 0.051]}>
			<T.BoxGeometry args={[0.03, 0.046, 0.002]} />
			<T.MeshStandardMaterial color="#7B4F2E" emissive="#7B4F2E" emissiveIntensity={0.1} flatShading />
		</T.Mesh>

		<!-- Door arch (half-cylinder on top of door) -->
		<T.Mesh position={[0, 0.005, 0.051]} rotation={[Math.PI / 2, 0, 0]}>
			<T.CylinderGeometry args={[0.015, 0.015, 0.002, 8, 1, false, 0, Math.PI]} />
			<T.MeshStandardMaterial color="#7B4F2E" flatShading />
		</T.Mesh>

		<!-- Window left -->
		<T.Mesh position={[-0.028, 0.008, 0.051]}>
			<T.BoxGeometry args={[0.022, 0.022, 0.002]} />
			<T.MeshStandardMaterial color="#87CEEB" emissive="#87CEEB" emissiveIntensity={0.55} />
		</T.Mesh>
		<!-- Window left cross H -->
		<T.Mesh position={[-0.028, 0.008, 0.052]}>
			<T.BoxGeometry args={[0.022, 0.002, 0.001]} />
			<T.MeshStandardMaterial color="#5a9ab5" />
		</T.Mesh>
		<!-- Window left cross V -->
		<T.Mesh position={[-0.028, 0.008, 0.052]}>
			<T.BoxGeometry args={[0.002, 0.022, 0.001]} />
			<T.MeshStandardMaterial color="#5a9ab5" />
		</T.Mesh>

		<!-- Window right -->
		<T.Mesh position={[0.028, 0.008, 0.051]}>
			<T.BoxGeometry args={[0.022, 0.022, 0.002]} />
			<T.MeshStandardMaterial color="#87CEEB" emissive="#87CEEB" emissiveIntensity={0.55} />
		</T.Mesh>
		<!-- Window right cross H -->
		<T.Mesh position={[0.028, 0.008, 0.052]}>
			<T.BoxGeometry args={[0.022, 0.002, 0.001]} />
			<T.MeshStandardMaterial color="#5a9ab5" />
		</T.Mesh>
		<!-- Window right cross V -->
		<T.Mesh position={[0.028, 0.008, 0.052]}>
			<T.BoxGeometry args={[0.002, 0.022, 0.001]} />
			<T.MeshStandardMaterial color="#5a9ab5" />
		</T.Mesh>

		<!-- Front step -->
		<T.Mesh position={[0, -0.044, 0.057]}>
			<T.BoxGeometry args={[0.04, 0.006, 0.012]} />
			<T.MeshStandardMaterial color="#c8a96e" flatShading />
		</T.Mesh>

		<!-- Chimney shaft — base inside roof, top pokes above peak -->
		<T.Mesh position={[0.03, 0.1, -0.02]}>
			<T.BoxGeometry args={[0.02, 0.072, 0.02]} />
			<T.MeshStandardMaterial color="#8B4513" flatShading />
		</T.Mesh>
		<!-- Chimney cap -->
		<T.Mesh position={[0.03, 0.138, -0.02]}>
			<T.BoxGeometry args={[0.028, 0.008, 0.028]} />
			<T.MeshStandardMaterial color="#5C2D0A" flatShading />
		</T.Mesh>
	</T.Group>
</T.Group>
