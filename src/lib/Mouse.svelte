<script lang="ts">
	import { onDestroy } from 'svelte';
	import { T, useTask } from '@threlte/core';
	import { RigidBody, Collider, useRapier } from '@threlte/rapier';
	import { inputQueries, advanceInputFrame } from '$extensions/input/input.svelte';
	import { tickGameState, gameState } from '$lib/gameState.svelte';
	import {
		mouseHitRequest,
		mouseSharedPos,
		mouseSharedFacing,
		mouseBodyRef
	} from '$lib/catAI.svelte';
	import { decorationState } from '$lib/decorationState.svelte';
	import { soundActions } from '$core/globalAudio.svelte';
	import * as THREE from 'three';

	const { world, rapier } = useRapier();

	let mouseBody: any = null;
	let mouseObj: THREE.Object3D | null = null;
	let gameCam: THREE.PerspectiveCamera | null = null;

	onDestroy(() => {
		mouseBody = null;
		mouseObj = null;
		gameCam = null;
	});

	// Teleport back to spawn whenever a new game starts.
	$effect(() => {
		if (gameState.status === 'starting' && mouseBody) {
			mouseBody.setTranslation({ x: 1.936, y: 1, z: -1.894 }, true);
			mouseBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
			mouseBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
			facingAngle = 4.341;
			curVelX = 0;
			curVelZ = 0;
			camInitialized = false;
			airTime = 0;
		}
	});

	const TURN_RATE = 2.8;
	const WALK_SPEED = 3;
	const SPRINT_SPEED = 6;
	const JUMP_VELOCITY = 5;
	const GROUND_RAY_LEN = 0.16;

	let takeoffSpeed = WALK_SPEED;
	let curVelX = 0;
	let curVelZ = 0;
	let lastHitRequestId = 0;
	let posLogTimer = 0;
	let airTime = 0;

	const CAM_DISTANCE = 0.69;
	const CAM_HEIGHT = 0.2;
	const CAM_LOOK_HEIGHT = 0.05;

	const FPS_BLEND_START = 0.35;
	const FPS_BLEND_END = 0.08;
	const EYE_HEIGHT = 0.1;
	const EYE_FWD = 0.27;
	const EYE_MARGIN = 0.06;

	const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
	const lerp = (a: number, b: number, w: number) => a + (b - a) * w;

	const _camDesired = new THREE.Vector3();
	const _lookAt = new THREE.Vector3();
	const _pos = new THREE.Vector3();
	let camInitialized = false;

	// Heading angle (radians). 0 = nose pointing toward -Z.
	let facingAngle = 4.341;

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

		const locked = gameState.status !== 'playing';
		const move = locked ? { x: 0, y: 0 } : inputQueries.getMoveVector('player1');
		const grounded = isGrounded();

		mouseSharedFacing.angle = facingAngle;

		const carryPenalty = decorationState.carrying ? 0.52 : 1.0;

		let speed: number;
		if (grounded) {
			const canSprint = inputQueries.isPressed('player1', 'sprint') && gameState.stamina > 0;
			speed = (canSprint ? SPRINT_SPEED : WALK_SPEED) * carryPenalty;
			takeoffSpeed = speed;
			airTime = 0;
		} else {
			airTime += delta;
			speed = takeoffSpeed;
		}

		facingAngle -= move.x * TURN_RATE * delta;

		const half = facingAngle / 2;
		mouseBody.setRotation({ x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) }, true);

		const fwdX = -Math.sin(facingAngle);
		const fwdZ = -Math.cos(facingAngle);
		const rightX = Math.cos(facingAngle); // perpendicular right
		const rightZ = -Math.sin(facingAngle);

		const strafeL = locked ? false : inputQueries.isPressed('player1', 'strafeLeft');
		const strafeR = locked ? false : inputQueries.isPressed('player1', 'strafeRight');
		const strafe = (strafeR ? 1 : 0) - (strafeL ? 1 : 0);

		const targetVX = (fwdX * move.y + rightX * strafe) * speed;
		const targetVZ = (fwdZ * move.y + rightZ * strafe) * speed;

		// Air decay: linearly reduce control over 1 second, then target drops to 0
		const airControl = grounded ? 1 : Math.max(0, 1 - airTime);
		const finalTargetVX = targetVX * airControl;
		const finalTargetVZ = targetVZ * airControl;

		const k = Math.min(1, delta * (grounded ? 16 : 5));

		// Sync tracking velocity toward actual physics velocity (handles wall collisions)
		const vel = mouseBody.linvel();
		curVelX += (vel.x - curVelX) * Math.min(1, delta * 10);
		curVelZ += (vel.z - curVelZ) * Math.min(1, delta * 10);

		curVelX += (finalTargetVX - curVelX) * k;
		curVelZ += (finalTargetVZ - curVelZ) * k;

		let velY = vel.y;
		if (inputQueries.wasPressed('player1', 'jump') && grounded) {
			velY = JUMP_VELOCITY;
			soundActions.playMouseJump();
		}

		if (mouseHitRequest.id !== lastHitRequestId) {
			lastHitRequestId = mouseHitRequest.id;
			curVelX = mouseHitRequest.x;
			curVelZ = mouseHitRequest.z;
			velY = Math.max(velY, mouseHitRequest.y);
		}

		mouseBody.setLinvel({ x: curVelX, y: velY, z: curVelZ }, true);
		mouseBody.setAngvel({ x: 0, y: 0, z: 0 }, true);

		const t = mouseObj ? mouseObj.getWorldPosition(_pos) : mouseBody.translation();
		mouseSharedPos.x = t.x;
		mouseSharedPos.y = t.y;
		mouseSharedPos.z = t.z;

		const _szDx = t.x - 1.936;
		const _szDz = t.z - -1.894;
		gameState.inSafeZone = _szDx * _szDx + _szDz * _szDz < 1.1 * 1.1;

		posLogTimer -= delta;
		if (posLogTimer <= 0) {
			posLogTimer = 2;
			console.log(`[mouse pos] x: ${t.x.toFixed(3)}, y: ${t.y.toFixed(3)}, z: ${t.z.toFixed(3)}`);
		}

		const eyeY = t.y + CAM_LOOK_HEIGHT;
		const backX = Math.sin(facingAngle);
		const backZ = Math.cos(facingAngle);

		const dx = backX * CAM_DISTANCE;
		const dy = CAM_HEIGHT;
		const dz = backZ * CAM_DISTANCE;
		const fullDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
		const dirX = dx / fullDist;
		const dirY = dy / fullDist;
		const dirZ = dz / fullDist;

		const ray = new rapier.Ray({ x: t.x, y: eyeY, z: t.z }, { x: dirX, y: dirY, z: dirZ });
		const hit = world.castRay(ray, fullDist, true, undefined, undefined, undefined, mouseBody);
		const camDist = hit ? Math.max(0, hit.timeOfImpact - 0.08) : fullDist;

		const tpX = t.x + dirX * camDist;
		const tpY = eyeY + dirY * camDist;
		const tpZ = t.z + dirZ * camDist;

		const fpY = t.y + EYE_HEIGHT;
		const eyeRay = new rapier.Ray({ x: t.x, y: fpY, z: t.z }, { x: fwdX, y: 0, z: fwdZ });
		const eyeHit = world.castRay(eyeRay, EYE_FWD, true, undefined, undefined, undefined, mouseBody);
		const eyeFwd = eyeHit ? Math.max(0, eyeHit.timeOfImpact - EYE_MARGIN) : EYE_FWD;
		const fpX = t.x + fwdX * eyeFwd;
		const fpZ = t.z + fwdZ * eyeFwd;

		const fpsW = clamp01((FPS_BLEND_START - camDist) / (FPS_BLEND_START - FPS_BLEND_END));

		_camDesired.set(lerp(tpX, fpX, fpsW), lerp(tpY, fpY, fpsW), lerp(tpZ, fpZ, fpsW));
		if (!camInitialized) {
			gameCam.position.copy(_camDesired);
			camInitialized = true;
		} else {
			gameCam.position.lerp(_camDesired, Math.min(1, delta * 10));
		}

		_lookAt.set(lerp(t.x, fpX + fwdX, fpsW), lerp(eyeY, fpY, fpsW), lerp(t.z, fpZ + fwdZ, fpsW));
		gameCam.lookAt(_lookAt);

		const sprinting =
			inputQueries.isPressed('player1', 'sprint') && grounded && gameState.stamina > 0;
		const strafing = Math.abs(strafe) > 0.1;
		const moving = Math.abs(move.y) > 0.1 || strafing;
		tickGameState(delta, sprinting, moving, !grounded);

		soundActions.setWalkState(
			!grounded || !moving ? 'stopped' : sprinting ? 'sprinting' : 'walking'
		);

		advanceInputFrame();
	});
</script>

<!-- Chase camera — makeDefault overrides Camera.svelte while GameScene is mounted -->
<T.PerspectiveCamera
	makeDefault
	fov={60}
	near={0.001}
	far={144}
	oncreate={(ref) => {
		gameCam = ref;
	}}
/>

<T.Group position={[1.936, 1, -1.894]}>
	<RigidBody
		type="dynamic"
		lockRotations
		canSleep={false}
		ccd
		oncreate={(rb) => {
			mouseBody = rb;
			mouseBodyRef.current = rb;
		}}
	>
		<Collider
			shape="cuboid"
			args={[0.1, 0.1, 0.16]}
			oncreate={(c) => c.setCollisionGroups(0xfffd0001)}
		/>

		<T.Object3D
			oncreate={(ref) => {
				mouseObj = ref;
			}}
		/>

		<!-- Body -->
		<T.Mesh castShadow position={[0, 0, 0.03]} scale={[1, 0.85, 1.4]}>
			<T.SphereGeometry args={[0.1, 16, 12]} />
			<T.MeshStandardMaterial color="#b8a890" flatShading />
		</T.Mesh>

		<!-- Head -->
		<T.Mesh castShadow position={[0, 0.01, -0.12]}>
			<T.SphereGeometry args={[0.085, 16, 12]} />
			<T.MeshStandardMaterial color="#c2b29a" flatShading />
		</T.Mesh>

		<!-- Snout -->
		<T.Mesh position={[0, -0.01, -0.2]} rotation={[-Math.PI / 2, 0, 0]}>
			<T.ConeGeometry args={[0.05, 0.09, 12]} />
			<T.MeshStandardMaterial color="#c2b29a" flatShading />
		</T.Mesh>

		<!-- Ears -->
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

		<!-- Tail -->
		<T.Mesh position={[0, 0.04, 0.22]} rotation={[Math.PI / 2.4, 0, 0]}>
			<T.CylinderGeometry args={[0.008, 0.018, 0.34, 8]} />
			<T.MeshStandardMaterial color="#e8b4a0" flatShading />
		</T.Mesh>
	</RigidBody>
</T.Group>
