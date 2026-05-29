<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import { GLTF, interactivity } from '@threlte/extras';
	import { game } from '$lib/stores/game.svelte';
	import * as THREE from 'three';

	interactivity();

	// ── Camera positions ──────────────────────────────
	// Menu: top-down view the user set up
	const MENU_POS = new THREE.Vector3(0, 0, -10);
	const MENU_LOOK = new THREE.Vector3(0, 0, -60);

	// Game: 3rd-person at mouse level, center of house — tweak as needed
	const GAME_POS = new THREE.Vector3(-2.7, -1.5, -18);
	const GAME_LOOK = new THREE.Vector3(-2.7, -2.2, -44);

	const LERP_SPEED = 2.5; // ~1 s transition

	// ── Camera ref & animation ────────────────────────
	let camera: THREE.PerspectiveCamera | undefined = $state();
	const lookTarget = new THREE.Vector3().copy(MENU_LOOK);
	let initialized = false;

	useTask((delta) => {
		if (!camera) return;

		// Snap to menu position on first frame so there's no fly-in from origin
		if (!initialized) {
			camera.position.copy(MENU_POS);
			lookTarget.copy(MENU_LOOK);
			camera.lookAt(lookTarget);
			initialized = true;
			return;
		}

		const tPos = game.state === 'playing' ? GAME_POS : MENU_POS;
		const tLook = game.state === 'playing' ? GAME_LOOK : MENU_LOOK;
		const alpha = 1 - Math.exp(-LERP_SPEED * delta);

		camera.position.lerp(tPos, alpha);
		lookTarget.lerp(tLook, alpha);
		camera.lookAt(lookTarget);
	});
</script>

<T.PerspectiveCamera bind:ref={camera} fov={60} makeDefault />

<T.DirectionalLight position={[5, 10, 5]} intensity={1} />
<T.AmbientLight intensity={0.6} />

<GLTF url="/house.glb" position={[-2.7, -2.7, -40]} rotation={[1.6, 0, 0]} />
