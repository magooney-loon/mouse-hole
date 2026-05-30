<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import { useGltf, useGltfAnimations } from '@threlte/extras';
	import { BASE_URL } from '$extensions/settings/settings.svelte';
	import { LoopRepeat } from 'three';
	import * as THREE from 'three';

	interface Props {
		pos?: { x: number; y: number; z: number };
	}
	let { pos }: Props = $props();

	const gltf = useGltf(`${BASE_URL}models/stages/katze.glb`);
	const { actions } = useGltfAnimations(gltf);

	$effect(() => {
		const act = $actions?.['GltfAnimation 0'];
		if (act) {
			act.setLoop(LoopRepeat, Infinity);
			act.play();
		}
	});

	// Same waypoints as the cinematic camera, at floor level.
	const PATH = [
		new THREE.Vector3(1.29, 0, 2.14),
		new THREE.Vector3(8.127, 0, 1.407),
		new THREE.Vector3(6.352, 0, -7.188)
	];

	const SEG_DURATION = 8;
	let segIndex = 0;
	let segT = 0.4; // slightly ahead of the camera so you can see it
	let direction = 1;

	let catGroup: THREE.Group | null = null;
	const _catPos = new THREE.Vector3();
	const smoothStep = (t: number) => t * t * (3 - 2 * t);

	let currentRotY = 0;
	let targetRotY = 0;

	useTask((delta) => {
		segT += delta / SEG_DURATION;
		if (segT >= 1) {
			segT -= 1;
			segIndex += direction;
			if (segIndex >= PATH.length - 1) {
				segIndex = PATH.length - 1;
				direction = -1;
			} else if (segIndex <= 0) {
				segIndex = 0;
				direction = 1;
			}
		}

		const from = PATH[segIndex];
		const to = PATH[segIndex + direction];
		const s = smoothStep(segT);

		_catPos.lerpVectors(from, to, s);

		if (pos) {
			pos.x = _catPos.x;
			pos.y = _catPos.y;
			pos.z = _catPos.z;
		}

		if (catGroup) {
			catGroup.position.copy(_catPos);

			const dx = to.x - from.x;
			const dz = to.z - from.z;
			if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
				targetRotY = Math.atan2(-dx, -dz);
			}
			// Shortest-path lerp to avoid spinning the long way around
			let diff = targetRotY - currentRotY;
			if (diff > Math.PI) diff -= Math.PI * 2;
			if (diff < -Math.PI) diff += Math.PI * 2;
			currentRotY += diff * Math.min(1, delta * 4);
			catGroup.rotation.y = currentRotY;
		}
	});
</script>

{#if $gltf}
	<T.Group
		scale={0.01}
		oncreate={(ref) => {
			catGroup = ref;
		}}
	>
		<T.Group rotation={[0, Math.PI, 0]}>
			<T is={$gltf.scene} />
		</T.Group>
	</T.Group>
{/if}
