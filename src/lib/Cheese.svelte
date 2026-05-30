<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import * as THREE from 'three';
	import { inputQueries } from '$extensions/input/input.svelte';
	import { gameState } from '$lib/gameState.svelte';
	import { mouseSharedPos } from '$lib/catAI.svelte';
	import { soundActions } from '$core/globalAudio.svelte';

	interface Props {
		position: [number, number, number];
		healAmount?: number;
		respawnDelay?: number;
	}

	let { position, healAmount = 30, respawnDelay = 15 }: Props = $props();

	const INTERACT_RADIUS = 0.6;

	let eaten = $state(false);
	let respawnTimer = 0;
	let prevInteract = false;
	let wasInRange = false;
	let bobT = 0;
	let groupRef: THREE.Group | null = null;

	$effect(() => {
		if (gameState.status === 'starting') {
			eaten = false;
			respawnTimer = 0;
			bobT = 0;
			wasInRange = false;
		}
	});

	useTask((delta) => {
		if (gameState.status !== 'playing') {
			if (wasInRange) { gameState.cheeseInRange = false; wasInRange = false; }
			return;
		}

		if (eaten) {
			respawnTimer -= delta;
			if (respawnTimer <= 0) eaten = false;
			if (wasInRange) { gameState.cheeseInRange = false; wasInRange = false; }
			return;
		}

		bobT += delta;
		if (groupRef) {
			groupRef.position.y = 0.05 + Math.sin(bobT * 2.2) * 0.025;
			groupRef.rotation.y = bobT * 0.6;
		}

		const dx = mouseSharedPos.x - position[0];
		const dy = mouseSharedPos.y - position[1];
		const dz = mouseSharedPos.z - position[2];
		const inRange = Math.sqrt(dx * dx + dy * dy + dz * dz) < INTERACT_RADIUS;

		if (inRange !== wasInRange) {
			gameState.cheeseInRange = inRange;
			wasInRange = inRange;
		}

		const interact = inputQueries.isPressed('player1', 'interact');
		const justInteracted = interact && !prevInteract;
		prevInteract = interact;

		if (justInteracted && inRange) {
			eaten = true;
			respawnTimer = respawnDelay;
			gameState.hunger = Math.min(100, gameState.hunger + healAmount);
			gameState.cheeseInRange = false;
			wasInRange = false;
			soundActions.playClick();
		}
	});
</script>

<T.Group
	position={[position[0], 0.05, position[2]]}
	visible={!eaten}
	oncreate={(ref) => {
		groupRef = ref;
	}}
>
	<!-- Main wedge body — 3-sided cylinder = triangular prism -->
	<T.Mesh castShadow rotation={[0, Math.PI / 6, 0]}>
		<T.CylinderGeometry args={[0.14, 0.14, 0.1, 3]} />
		<T.MeshStandardMaterial color="#f5c218" flatShading emissive="#f5c218" emissiveIntensity={0.12} />
	</T.Mesh>

	<!-- Darker rind outline (slightly larger, open-ended so only the sides show) -->
	<T.Mesh rotation={[0, Math.PI / 6, 0]}>
		<T.CylinderGeometry args={[0.145, 0.145, 0.102, 3]} openEnded />
		<T.MeshStandardMaterial color="#c8900a" flatShading side={THREE.BackSide} />
	</T.Mesh>

	<!-- Swiss holes on top face — small dark discs slightly inset -->
	{#each [[-0.02, 0.052, 0.05], [0.06, 0.052, 0.01], [0.0, 0.052, -0.03]] as [hx, hy, hz]}
		<T.Mesh position={[hx, hy, hz]} rotation={[Math.PI / 2, 0, 0]}>
			<T.CylinderGeometry args={[0.018, 0.018, 0.015, 10]} />
			<T.MeshStandardMaterial color="#d49810" />
		</T.Mesh>
	{/each}

	<!-- Soft warm glow point light -->
	<T.PointLight color="#ffe066" intensity={0.6} distance={1.2} decay={2} position={[0, 0.2, 0]} />
</T.Group>
