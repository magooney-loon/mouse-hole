<script lang="ts">
	import { onDestroy } from 'svelte';
	import { T, useTask, useCamera } from '@threlte/core';
	import { RigidBody, Collider } from '@threlte/rapier';
	import { inputQueries, advanceInputFrame } from '$extensions/input/input.svelte';
	import * as THREE from 'three';

	const { camera } = useCamera();

	let mouseBody: any = null;
	onDestroy(() => {
		mouseBody = null;
	});

	const _pos = new THREE.Vector3();
	const _lookAt = new THREE.Vector3();

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

		// Third-person camera follow
		const t = mouseBody.translation();
		_pos.set(t.x, t.y, t.z);
		camera.current.position.lerp(_pos.clone().add(new THREE.Vector3(0, 2.5, 5)), 0.12);
		_lookAt.lerp(_pos.clone().add(new THREE.Vector3(0, 0.3, 0)), 0.12);
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
