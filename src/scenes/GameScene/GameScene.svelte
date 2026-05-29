<script lang="ts">
	import { onDestroy } from 'svelte';
	import { T, useTask } from '@threlte/core';
	import { RigidBody, Collider, useRapier } from '@threlte/rapier';
	import { inputQueries, advanceInputFrame } from '$extensions/input/input.svelte';
	import * as THREE from 'three';

	const { world, rapier } = useRapier();

	let mouseBody: any = null;
	let gameCam: THREE.PerspectiveCamera | null = null;

	onDestroy(() => {
		mouseBody = null;
		gameCam = null;
	});

	// Car-style controls: A/D steer the heading, W/S drive forward/back along it.
	// The body turns to its heading; a chase camera trails behind it.
	const TURN_RATE = 2.8; // rad/s
	const JUMP_VELOCITY = 5;
	const GROUND_RAY_LEN = 0.15; // collider half-height (0.09) + margin

	const CAM_DISTANCE = 0.69; // behind the mouse
	const CAM_HEIGHT = 0.2;
	const CAM_MIN_DIST = 0.4;
	const CAM_LOOK_HEIGHT = 0.05;

	const _camDesired = new THREE.Vector3();
	const _lookAt = new THREE.Vector3();
	let camInitialized = false;

	// Heading angle (radians). 0 = nose pointing toward -Z.
	let facingAngle = 0;

	const isGrounded = (): boolean => {
		const t = mouseBody.translation();
		const ray = new rapier.Ray({ x: t.x, y: t.y, z: t.z }, { x: 0, y: -1, z: 0 });
		const hit = world.castRay(
			ray,
			GROUND_RAY_LEN,
			true,
			undefined,
			undefined,
			undefined,
			mouseBody
		);
		return !!hit;
	};

	useTask((delta) => {
		if (!mouseBody || !gameCam) return;

		const move = inputQueries.getMoveVector('player1');
		const sprinting = inputQueries.isPressed('player1', 'sprint');
		const speed = sprinting ? 6 : 3;

		// Steering — A/D rotate the heading (D = turn right / clockwise).
		facingAngle -= move.x * TURN_RATE * delta;

		// Orient the rigid body to the heading (rotation about Y).
		const half = facingAngle / 2;
		mouseBody.setRotation({ x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) }, true);

		// Throttle — W/S move along the heading. Forward (nose, local -Z) maps to
		// world (-sin, -cos) after a Y rotation of facingAngle.
		const fwdX = -Math.sin(facingAngle);
		const fwdZ = -Math.cos(facingAngle);
		const velX = fwdX * move.y * speed;
		const velZ = fwdZ * move.y * speed;

		// Preserve gravity/jump on the Y axis; jump only on a fresh ground edge.
		const vel = mouseBody.linvel();
		let velY = vel.y;
		if (inputQueries.wasPressed('player1', 'jump') && isGrounded()) {
			velY = JUMP_VELOCITY;
		}

		mouseBody.setLinvel({ x: velX, y: velY, z: velZ }, true);
		mouseBody.setAngvel({ x: 0, y: 0, z: 0 }, true);

		// Chase camera — trails behind the heading. Behind = (sin, cos).
		const t = mouseBody.translation();
		const eyeY = t.y + CAM_LOOK_HEIGHT;
		const backX = Math.sin(facingAngle);
		const backZ = Math.cos(facingAngle);

		_camDesired.set(t.x + backX * CAM_DISTANCE, eyeY + CAM_HEIGHT, t.z + backZ * CAM_DISTANCE);

		// Collision: don't let the camera clip through walls behind the mouse.
		const dx = _camDesired.x - t.x;
		const dy = _camDesired.y - eyeY;
		const dz = _camDesired.z - t.z;
		const fullDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
		const dirX = dx / fullDist;
		const dirY = dy / fullDist;
		const dirZ = dz / fullDist;

		const ray = new rapier.Ray({ x: t.x, y: eyeY, z: t.z }, { x: dirX, y: dirY, z: dirZ });
		const hit = world.castRay(ray, fullDist, true, undefined, undefined, undefined, mouseBody);

		let camDist = fullDist;
		if (hit) camDist = Math.max(CAM_MIN_DIST, hit.timeOfImpact - 0.15);

		_camDesired.set(t.x + dirX * camDist, eyeY + dirY * camDist, t.z + dirZ * camDist);
		if (!camInitialized) {
			gameCam.position.copy(_camDesired);
			camInitialized = true;
		} else {
			gameCam.position.lerp(_camDesired, Math.min(1, delta * 10));
		}
		_lookAt.set(t.x, eyeY, t.z);
		gameCam.lookAt(_lookAt);

		// Advance edge-detection buffer AFTER reading inputs this frame.
		advanceInputFrame();
	});
</script>

<!-- Game camera — makeDefault overrides Camera.svelte while this scene is mounted -->
<T.PerspectiveCamera
	makeDefault
	fov={60}
	near={0.001}
	far={144}
	oncreate={(ref) => {
		gameCam = ref;
	}}
/>

<T.AmbientLight intensity={1.2} />

<!-- Static floor placeholder -->
<T.Group>
	<Collider shape="cuboid" args={[50, 0.1, 50]} />
	<T.Mesh receiveShadow>
		<T.BoxGeometry args={[100, 0.2, 100]} />
		<T.MeshStandardMaterial color="#8B6914" transparent opacity={0.3} />
	</T.Mesh>
</T.Group>

<!-- Mouse player -->
<T.Group position={[0, 1, 0]}>
	<RigidBody
		type="dynamic"
		lockRotations
		canSleep={false}
		oncreate={(rb) => {
			mouseBody = rb;
		}}
	>
		<Collider shape="cuboid" args={[0.08, 0.09, 0.12]} />

		<!-- Body: rounded, elongated front-to-back (local -Z is forward) -->
		<T.Mesh castShadow position={[0, 0, 0.03]} scale={[1, 0.85, 1.4]}>
			<T.SphereGeometry args={[0.1, 16, 12]} />
			<T.MeshStandardMaterial color="#b8a890" flatShading />
		</T.Mesh>

		<!-- Head -->
		<T.Mesh castShadow position={[0, 0.01, -0.12]}>
			<T.SphereGeometry args={[0.085, 16, 12]} />
			<T.MeshStandardMaterial color="#c2b29a" flatShading />
		</T.Mesh>

		<!-- Snout: tapered nose pointing forward -->
		<T.Mesh position={[0, -0.01, -0.2]} rotation={[-Math.PI / 2, 0, 0]}>
			<T.ConeGeometry args={[0.05, 0.09, 12]} />
			<T.MeshStandardMaterial color="#c2b29a" flatShading />
		</T.Mesh>

		<!-- Ears: round, on top of head -->
		<T.Mesh position={[-0.06, 0.08, -0.11]}>
			<T.SphereGeometry args={[0.05, 12, 10]} />
			<T.MeshStandardMaterial color="#e8b4a0" flatShading />
		</T.Mesh>
		<T.Mesh position={[0.06, 0.08, -0.11]}>
			<T.SphereGeometry args={[0.05, 12, 10]} />
			<T.MeshStandardMaterial color="#e8b4a0" flatShading />
		</T.Mesh>

		<!-- Eyes -->
		<T.Mesh position={[-0.04, 0.03, -0.17]}>
			<T.SphereGeometry args={[0.015, 8, 8]} />
			<T.MeshStandardMaterial color="#1a1a1a" />
		</T.Mesh>
		<T.Mesh position={[0.04, 0.03, -0.17]}>
			<T.SphereGeometry args={[0.015, 8, 8]} />
			<T.MeshStandardMaterial color="#1a1a1a" />
		</T.Mesh>

		<!-- Nose tip -->
		<T.Mesh position={[0, -0.01, -0.245]}>
			<T.SphereGeometry args={[0.018, 8, 8]} />
			<T.MeshStandardMaterial color="#d47a8a" flatShading />
		</T.Mesh>

		<!-- Tail: thin, trailing out the back and curving up -->
		<T.Mesh position={[0, 0.04, 0.22]} rotation={[Math.PI / 2.4, 0, 0]}>
			<T.CylinderGeometry args={[0.008, 0.018, 0.34, 8]} />
			<T.MeshStandardMaterial color="#e8b4a0" flatShading />
		</T.Mesh>

		<!-- DEBUG: cone pointing in the facing direction (local -Z). Remove later. -->
		<T.Mesh position={[0, 0.22, -0.3]} rotation={[-Math.PI / 2, 0, 0]}>
			<T.ConeGeometry args={[0.04, 0.22, 12]} />
			<T.MeshStandardMaterial color="#00ff66" emissive="#00ff66" emissiveIntensity={0.6} />
		</T.Mesh>
	</RigidBody>
</T.Group>
