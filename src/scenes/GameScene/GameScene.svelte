<script lang="ts">
	import { onDestroy } from 'svelte';
	import { T, useTask, useCamera } from '@threlte/core';
	import { RigidBody, Collider, useRapier } from '@threlte/rapier';
	import { inputQueries, advanceInputFrame } from '$extensions/input/input.svelte';
	import * as THREE from 'three';

	const { camera } = useCamera();
	const { world, rapier } = useRapier();

	let mouseBody: any = null;
	onDestroy(() => { mouseBody = null; });

	const CAM_DISTANCE = 5;
	const CAM_HEIGHT = 2.5;
	const CAM_MIN_DIST = 0.4; // closest the camera can get when clipped
	const _lookAt = new THREE.Vector3();

	let facingAngle = 0;

	useTask(() => {
		advanceInputFrame();
		if (!mouseBody) return;

		const move = inputQueries.getMoveVector('player1');
		const sprinting = inputQueries.isPressed('player1', 'sprint');
		const speed = sprinting ? 6 : 3;

		const vel = mouseBody.linvel();
		mouseBody.setLinvel({ x: move.x * speed, y: vel.y, z: -move.y * speed }, true);
		mouseBody.setAngvel({ x: 0, y: 0, z: 0 }, true);

		if (inputQueries.wasPressed('player1', 'jump')) {
			mouseBody.applyImpulse({ x: 0, y: 5, z: 0 }, true);
		}

		// Rotate facing toward movement direction (smooth, handles wraparound)
		if (Math.abs(move.x) > 0.1 || Math.abs(move.y) > 0.1) {
			const target = Math.atan2(move.x, move.y);
			let diff = target - facingAngle;
			while (diff > Math.PI) diff -= Math.PI * 2;
			while (diff < -Math.PI) diff += Math.PI * 2;
			facingAngle += diff * 0.18;
		}

		const t = mouseBody.translation();
		const sinA = Math.sin(facingAngle);
		const cosA = Math.cos(facingAngle);

		// Ray origin: slightly above the mouse (eye level)
		const eyeY = t.y + 0.3;
		const desiredX = t.x - sinA * CAM_DISTANCE;
		const desiredY = eyeY + CAM_HEIGHT;
		const desiredZ = t.z + cosA * CAM_DISTANCE;

		// Direction from eye to desired camera position
		const dx = desiredX - t.x;
		const dy = desiredY - eyeY;
		const dz = desiredZ - t.z;
		const fullDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
		const dirX = dx / fullDist;
		const dirY = dy / fullDist;
		const dirZ = dz / fullDist;

		// Raycast from eye toward desired camera position, excluding the mouse body
		const ray = new rapier.Ray({ x: t.x, y: eyeY, z: t.z }, { x: dirX, y: dirY, z: dirZ });
		const hit = world.castRay(ray, fullDist, true, undefined, undefined, undefined, mouseBody);

		let camDist = fullDist;
		if (hit) {
			// Pull camera in front of the hit surface with a small margin
			camDist = Math.max(CAM_MIN_DIST, hit.timeOfImpact - 0.15);
		}

		camera.current.position.set(
			t.x + dirX * camDist,
			eyeY + dirY * camDist,
			t.z + dirZ * camDist
		);
		_lookAt.set(t.x, eyeY, t.z);
		camera.current.lookAt(_lookAt);
	});
</script>

<!-- Ambient fill so the house interior is visible -->
<T.AmbientLight intensity={1.2} />

<!-- Static floor — a Collider with no RigidBody parent is static in Rapier.
     Adjust Y until it matches the house model's floor height. -->
<T.Group position={[0, 0, 0]}>
	<Collider shape="cuboid" args={[50, 0.1, 50]} />
	<T.Mesh receiveShadow>
		<T.BoxGeometry args={[100, 0.2, 100]} />
		<T.MeshStandardMaterial color="#8B6914" transparent opacity={0.3} />
	</T.Mesh>
</T.Group>

<!-- Mouse player placeholder -->
<T.Group position={[0, 1, 0]}>
	<RigidBody
		type="dynamic"
		lockRotations
		oncreate={(rb) => {
			mouseBody = rb;
		}}
	>
		<Collider shape="cuboid" args={[0.12, 0.15, 0.12]} />
		<T.Mesh castShadow>
			<T.BoxGeometry args={[0.24, 0.3, 0.24]} />
			<T.MeshStandardMaterial color="#c8a882" flatShading />
		</T.Mesh>
		<!-- Ears -->
		<T.Mesh position={[-0.09, 0.2, 0]}>
			<T.SphereGeometry args={[0.06, 8, 8]} />
			<T.MeshStandardMaterial color="#e8c8b0" flatShading />
		</T.Mesh>
		<T.Mesh position={[0.09, 0.2, 0]}>
			<T.SphereGeometry args={[0.06, 8, 8]} />
			<T.MeshStandardMaterial color="#e8c8b0" flatShading />
		</T.Mesh>
	</RigidBody>
</T.Group>
