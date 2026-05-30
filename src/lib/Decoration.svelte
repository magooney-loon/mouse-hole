<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import { RigidBody, Collider, useRapier } from '@threlte/rapier';
	import { onDestroy } from 'svelte';
	import * as THREE from 'three';
	import { inputQueries } from '$extensions/input/input.svelte';
	import { gameState } from '$lib/gameState.svelte';
	import { decorationState, decorationActions } from '$lib/decorationState.svelte';
	import { mouseSharedPos, mouseSharedFacing } from '$lib/catAI.svelte';
	import { soundActions } from '$core/globalAudio.svelte';
	import DecorationShape from './DecorationShape.svelte';

	interface Props {
		position: [number, number, number];
		spawnPosition: [number, number, number];
		index: number;
	}
	let { position, spawnPosition, index }: Props = $props();

	const { world, rapier } = useRapier();

	const PICKUP_RADIUS = 1.1; // start dragging when mouse this close
	const CAPTURE_RADIUS = 0.45; // auto-deliver when body this close to spawn
	const DRAG_SPEED = 7; // max push velocity m/s
	const DRAG_MAX_DIST = 1.2; // auto-drop if decoration this far from mouse
	const PUSH_DIST = 0.55; // how far in front of mouse to target
	const IMPACT_THRESHOLD = 30; // contact force threshold to play sound
	const IMPACT_COOLDOWN = 0.35; // seconds between impact sounds
	const SPAWN_Y_OFFSET = 0.2; // extra clearance above surface to prevent clipping
	const WALL_CHECK_DIST = 0.16; // ray length for tunnel guard (ball radius 0.1 + 0.06 margin)
	const STUCK_SPEED = 0.5; // m/s — below this while dist > STUCK_DIST = stuck
	const STUCK_DIST = 0.25; // m from target while checking stuck
	const STUCK_TIME = 0.3; // seconds before auto-drop at mouse feet

	let isDragging = false;
	let delivered = false;
	let wasInRange = false;
	let appearT = 0;
	let bobT = 0;
	let impactCooldown = 0;
	let prevInteract = false;
	let stuckTimer = 0;
	let pickupCooldown = 0;

	let lightRef: THREE.PointLight | null = null;
	let groupRef: THREE.Group | null = null;
	let circleRef: THREE.Mesh | null = null;
	let decorBody: any = null;

	// ── Spark pool ────────────────────────────────────────────────────────────
	const SPARK_COUNT = 10;
	const _sparkGeo = new THREE.OctahedronGeometry(0.018, 0);
	type Spark = {
		mesh: THREE.Mesh;
		vx: number;
		vy: number;
		vz: number;
		life: number;
		maxLife: number;
		active: boolean;
	};
	const sparks: Spark[] = [];
	let sparkGroupRef: THREE.Group | null = null;

	const initSparks = (group: THREE.Group) => {
		for (let i = 0; i < SPARK_COUNT; i++) {
			const mat = new THREE.MeshStandardMaterial({
				color: i % 2 === 0 ? '#c084fc' : '#e879f9',
				emissive: '#a855f7',
				emissiveIntensity: 0.8,
				flatShading: true
			});
			const mesh = new THREE.Mesh(_sparkGeo, mat);
			mesh.visible = false;
			group.add(mesh);
			sparks.push({ mesh, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 0.5, active: false });
		}
	};

	const spawnSparks = (wx: number, wy: number, wz: number) => {
		if (!sparkGroupRef) return;
		sparkGroupRef.position.set(wx, wy, wz);
		for (const s of sparks) {
			const angle = Math.random() * Math.PI * 2;
			const speed = 1.2 + Math.random() * 1.8;
			s.vx = Math.cos(angle) * speed;
			s.vy = 2.0 + Math.random() * 2.5;
			s.vz = Math.sin(angle) * speed;
			s.life = 0;
			s.maxLife = 0.3 + Math.random() * 0.3;
			s.active = true;
			s.mesh.visible = true;
			s.mesh.position.set(
				(Math.random() - 0.5) * 0.1,
				Math.random() * 0.05,
				(Math.random() - 0.5) * 0.1
			);
			s.mesh.scale.setScalar(1);
		}
	};

	onDestroy(() => {
		_sparkGeo.dispose();
		for (const s of sparks) (s.mesh.material as THREE.Material).dispose();
	});

	const resetBody = () => {
		if (!decorBody) return;
		decorBody.setTranslation(
			{ x: position[0], y: position[1] + SPAWN_Y_OFFSET, z: position[2] },
			true
		);
		decorBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
		decorBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
	};

	const hideBody = () => {
		if (!decorBody) return;
		decorBody.setTranslation({ x: position[0], y: -50, z: position[2] }, true);
		decorBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
	};

	const handleContact = (e: { totalForceMagnitude: number }) => {
		if (!isDragging) return;
		if (impactCooldown > 0) return;
		if (e.totalForceMagnitude > IMPACT_THRESHOLD) {
			soundActions.playImpact();
			impactCooldown = IMPACT_COOLDOWN;
		}
	};

	const dropAtMouse = () => {
		isDragging = false;
		stuckTimer = 0;
		decorationActions.drop();
		if (decorBody) {
			decorBody.setTranslation(
				{ x: mouseSharedPos.x, y: mouseSharedPos.y + 0.25, z: mouseSharedPos.z },
				true
			);
			decorBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
			decorBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
		}
		if (lightRef) lightRef.intensity = 0.9;
		if (decorationState.deliverInRange) decorationState.deliverInRange = false;
	};

	$effect(() => {
		if (gameState.status === 'starting') {
			isDragging = false;
			delivered = false;
			appearT = 0;
			bobT = 0;
			wasInRange = false;
			impactCooldown = 0;
			prevInteract = false;
			stuckTimer = 0;
			pickupCooldown = 0;
			decorationActions.reset();
			if (groupRef) {
				groupRef.visible = true;
				groupRef.scale.setScalar(0);
			}
			resetBody();
		}
	});

	useTask((delta) => {
		// Sparks always tick
		for (const s of sparks) {
			if (!s.active) continue;
			s.life += delta;
			if (s.life >= s.maxLife) {
				s.active = false;
				s.mesh.visible = false;
				continue;
			}
			const t = s.life / s.maxLife;
			s.vy -= 9 * delta;
			s.vx *= 1 - delta * 4;
			s.vz *= 1 - delta * 4;
			s.mesh.position.x += s.vx * delta;
			s.mesh.position.y += s.vy * delta;
			s.mesh.position.z += s.vz * delta;
			s.mesh.rotation.y += 8 * delta;
			s.mesh.scale.setScalar(Math.max(0, 1 - t * t));
		}

		if (impactCooldown > 0) impactCooldown -= delta;

		if (!groupRef || !decorBody || gameState.status !== 'playing') {
			if (wasInRange) {
				decorationState.pickupInRange = false;
				wasInRange = false;
			}
			if (isDragging) {
				isDragging = false;
				decorationActions.drop();
			}
			return;
		}

		if (delivered) return;

		const pos = decorBody.translation();
		const vel = decorBody.linvel();

		// Sync visual to physics body
		groupRef.position.set(pos.x, pos.y, pos.z);
		groupRef.rotation.y = decorBody.rotation().y; // follow physics tumble

		// Floor circle follows body position (sits just under the ball on whatever surface it's on)
		if (circleRef) {
			circleRef.position.x = pos.x;
			circleRef.position.y = pos.y - 0.09;
			circleRef.position.z = pos.z;
			circleRef.visible = !delivered;
		}

		// Pop-in
		if (appearT < 1) {
			appearT = Math.min(1, appearT + delta / 0.4);
			const t = appearT;
			const s = t < 0.6 ? (t / 0.6) * 1.2 : 1.2 - ((t - 0.6) / 0.4) * 0.2;
			groupRef.scale.setScalar(Math.max(0, s));
		}

		// Bob + spin while idle (not dragging, fully appeared)
		if (!isDragging && appearT >= 1) {
			bobT += delta;
			groupRef.position.y = pos.y + 0.04 + Math.sin(bobT * 2.2) * 0.022;
			groupRef.rotation.y = bobT * 0.75;
		}

		const interact = inputQueries.isPressed('player1', 'interact');
		const justPressed = interact && !prevInteract;
		prevInteract = interact;

		if (!isDragging) {
			// Range check against mouse position
			const dx = mouseSharedPos.x - pos.x;
			const dy = mouseSharedPos.y - pos.y;
			const dz = mouseSharedPos.z - pos.z;
			const inRange = Math.sqrt(dx * dx + dy * dy + dz * dz) < PICKUP_RADIUS;
			if (inRange !== wasInRange) {
				decorationState.pickupInRange = inRange;
				wasInRange = inRange;
			}

			if (justPressed && inRange && !decorationState.carrying) {
				isDragging = true;
				stuckTimer = 0;
				pickupCooldown = 0.35;
				decorationActions.pickup(index);
				spawnSparks(pos.x, pos.y, pos.z);
				soundActions.playMouseEating();
			}
		} else {
			if (pickupCooldown > 0) pickupCooldown -= delta;

			// Second press → drop in place
			if (justPressed) {
				isDragging = false;
				stuckTimer = 0;
				decorationActions.drop();
				if (lightRef) lightRef.intensity = 0.9;
				if (decorationState.deliverInRange) decorationState.deliverInRange = false;
				return;
			}

			// Target: floor level in front of the mouse
			const fwdX = -Math.sin(mouseSharedFacing.angle);
			const fwdZ = -Math.cos(mouseSharedFacing.angle);
			const tx = mouseSharedPos.x + fwdX * PUSH_DIST;
			const tz = mouseSharedPos.z + fwdZ * PUSH_DIST;

			const dx = tx - pos.x;
			const dz = tz - pos.z;
			const dist = Math.sqrt(dx * dx + dz * dz);

			if (dist > 0.04) {
				const inv = 1 / dist;
				const nx = dx * inv;
				const nz = dz * inv;

				// Anti-tunnel: cast a short ray in the push direction.
				// If a wall is within WALL_CHECK_DIST, zero velocity instead of pushing through.
				const wallRay = new rapier.Ray(
					{ x: pos.x, y: pos.y + 0.05, z: pos.z },
					{ x: nx, y: 0, z: nz }
				);
				const wallHit = world.castRay(
					wallRay,
					WALL_CHECK_DIST,
					false,
					undefined,
					undefined,
					undefined,
					decorBody
				);

				if (!wallHit) {
					const speed = Math.min(dist * 13, DRAG_SPEED);
					decorBody.setLinvel({ x: nx * speed, y: vel.y, z: nz * speed }, true);
				} else {
					decorBody.setLinvel({ x: 0, y: vel.y, z: 0 }, true);
				}
			} else {
				decorBody.setLinvel({ x: 0, y: vel.y, z: 0 }, true);
			}

			// Stuck detection: blocked by wall or wedged → drop at mouse feet
			const currentSpeed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
			if (dist > STUCK_DIST && currentSpeed < STUCK_SPEED && pickupCooldown <= 0) {
				stuckTimer += delta;
				if (stuckTimer > STUCK_TIME) {
					dropAtMouse();
					return;
				}
			} else {
				stuckTimer = 0;
			}

			// Distance safety net — item somehow far away → also drop at mouse feet
			const dragDx = mouseSharedPos.x - pos.x;
			const dragDz = mouseSharedPos.z - pos.z;
			if (Math.sqrt(dragDx * dragDx + dragDz * dragDz) > DRAG_MAX_DIST) {
				dropAtMouse();
				return;
			}

			// Glow pulse while dragging
			if (lightRef) lightRef.intensity = 1.5 + Math.sin(Date.now() * 0.005) * 0.8;

			// Auto-capture at spawn (check body position, not mouse)
			const sx = spawnPosition[0] - pos.x;
			const sy = spawnPosition[1] - pos.y;
			const sz = spawnPosition[2] - pos.z;
			const distToSpawn = Math.sqrt(sx * sx + sy * sy + sz * sz);
			const nearSpawn = distToSpawn < CAPTURE_RADIUS;

			if (nearSpawn !== decorationState.deliverInRange) decorationState.deliverInRange = nearSpawn;

			if (nearSpawn) {
				isDragging = false;
				delivered = true;
				decorationActions.deliver(index);
				spawnSparks(pos.x, pos.y, pos.z);
				soundActions.playSwoosh();
				if (groupRef) groupRef.visible = false;
				if (lightRef) lightRef.intensity = 0.9;
				if (circleRef) circleRef.visible = false;
				hideBody();
			}
		}
	});
</script>

<!-- Floor indicator circle -->
<T.Mesh
	rotation={[-Math.PI / 2, 0, 0]}
	oncreate={(ref) => {
		circleRef = ref;
		ref.position.set(position[0], 0.005, position[2]);
	}}
>
	<T.CircleGeometry args={[0.09, 20]} />
	<T.MeshStandardMaterial
		color="#a855f7"
		emissive="#a855f7"
		emissiveIntensity={0.4}
		transparent
		opacity={0.35}
		depthWrite={false}
	/>
</T.Mesh>

<!-- Physics body -->
<RigidBody
	type="dynamic"
	linearDamping={1.8}
	angularDamping={4}
	ccd
	oncreate={(rb) => {
		decorBody = rb;
		rb.setTranslation({ x: position[0], y: position[1] + SPAWN_Y_OFFSET, z: position[2] }, true);
	}}
>
	<Collider
		shape="ball"
		args={[0.1]}
		contactForceEventThreshold={IMPACT_THRESHOLD}
		oncontact={handleContact}
	/>
</RigidBody>

<!-- Visual — position synced to body each frame -->
<T.Group
	oncreate={(ref) => {
		groupRef = ref;
		ref.position.set(position[0], position[1], position[2]);
		ref.scale.setScalar(0);
	}}
>
	<DecorationShape {index} />
	<T.PointLight
		color="#d946ef"
		intensity={0.9}
		distance={1.5}
		decay={2}
		position={[0, 0.1, 0]}
		oncreate={(ref) => {
			lightRef = ref;
		}}
	/>
</T.Group>

<T.Group
	oncreate={(ref) => {
		sparkGroupRef = ref;
		initSparks(ref);
	}}
/>
