<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import * as THREE from 'three';

	// Z locked to house floor surface — tweak if box appears above/below floor
	const FLOOR_Z = -38;
	const WALK_SPEED = 4;
	const SPRINT_MULT = 2;

	const position = new THREE.Vector3(-2.7, -2.7, FLOOR_Z);
	const keys = new Set<string>();

	function onKeyDown(e: KeyboardEvent) {
		keys.add(e.code);
		e.preventDefault();
	}
	function onKeyUp(e: KeyboardEvent) {
		keys.delete(e.code);
	}

	let mesh: THREE.Mesh | undefined = $state();

	useTask((delta) => {
		if (!mesh) return;

		const sprint = keys.has('ShiftLeft') || keys.has('ShiftRight');
		const speed = WALK_SPEED * (sprint ? SPRINT_MULT : 1);

		if (keys.has('KeyW') || keys.has('ArrowUp')) position.y += speed * delta;
		if (keys.has('KeyS') || keys.has('ArrowDown')) position.y -= speed * delta;
		if (keys.has('KeyA') || keys.has('ArrowLeft')) position.x -= speed * delta;
		if (keys.has('KeyD') || keys.has('ArrowRight')) position.x += speed * delta;

		mesh.position.copy(position);
	});
</script>

<svelte:window onkeydown={onKeyDown} onkeyup={onKeyUp} />

<T.Mesh bind:ref={mesh} position={[position.x, position.y, position.z]}>
	<T.BoxGeometry args={[0.4, 0.4, 0.4]} />
	<T.MeshStandardMaterial color="#c97a28" />
</T.Mesh>
