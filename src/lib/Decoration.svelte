<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import { useRapier } from '@threlte/rapier';
	import { onDestroy, untrack } from 'svelte';
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

	// Props are fixed per-instance — snapshot to avoid state_referenced_locally warnings
	const p = untrack(() => [...position] as [number, number, number]);
	const sp = untrack(() => [...spawnPosition] as [number, number, number]);
	const idx = untrack(() => index);

	const { world, rapier } = useRapier();

	const PICKUP_RADIUS = 1.1;
	const CAPTURE_RADIUS = 0.45;
	const DRAG_SPEED = 7;
	const DRAG_MAX_DIST = 1.2;
	const PUSH_DIST = 0.55;
	const BALL_R = 0.1;

	const STUCK_SPEED = 0.5; // m/s — below this while dist > STUCK_DIST = stuck
	const STUCK_DIST = 0.25;
	const STUCK_TIME = 0.4;

	// Pre-allocated rays — no per-frame allocation
	const _wallRayC = new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 });
	const _wallRayL = new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 });
	const _wallRayR = new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 });
	const _floorRay = new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 });

	let isDragging = false;
	let delivered = false;
	let wasInRange = false;
	let appearT = 0;
	let bobT = 0;
	let prevInteract = false;
	let pickupCooldown = 0;
	let stuckTimer = 0;
	let prevItemX = 0;
	let prevItemZ = 0;

	// Item world position — driven directly, no rigid body
	let itemX = p[0];
	let itemY = p[1];
	let itemZ = p[2];

	let lightRef: THREE.PointLight | null = null;
	let groupRef: THREE.Group | null = null;
	let circleRef: THREE.Mesh | null = null;

	// Snap item onto the floor directly below its current XZ position
	const settleToFloor = () => {
		_floorRay.origin.x = itemX;
		_floorRay.origin.y = itemY + 1;
		_floorRay.origin.z = itemZ;
		const hit = world.castRay(_floorRay, 10, false);
		if (hit) itemY = itemY + 1 - hit.timeOfImpact + BALL_R;
	};

	const dropItem = () => {
		isDragging = false;
		stuckTimer = 0;
		decorationActions.drop();
		settleToFloor();
		if (lightRef) lightRef.intensity = 0.9;
		if (decorationState.deliverInRange) decorationState.deliverInRange = false;
	};

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

	$effect(() => {
		if (gameState.status === 'starting') {
			isDragging = false;
			delivered = false;
			appearT = 0;
			bobT = 0;
			wasInRange = false;
			prevInteract = false;
			pickupCooldown = 0;
			stuckTimer = 0;
			itemX = p[0];
			itemY = p[1];
			itemZ = p[2];
			settleToFloor();
			decorationActions.reset();
			if (groupRef) {
				groupRef.visible = true;
				groupRef.scale.setScalar(0);
				groupRef.position.set(itemX, itemY, itemZ);
			}
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

		if (!groupRef || gameState.status !== 'playing') {
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

		// Sync visual to item position
		groupRef.position.set(itemX, itemY, itemZ);

		if (circleRef) {
			circleRef.position.x = itemX;
			circleRef.position.y = itemY - 0.09;
			circleRef.position.z = itemZ;
			circleRef.visible = true;
		}

		// Pop-in
		if (appearT < 1) {
			appearT = Math.min(1, appearT + delta / 0.4);
			const t = appearT;
			const s = t < 0.6 ? (t / 0.6) * 1.2 : 1.2 - ((t - 0.6) / 0.4) * 0.2;
			groupRef.scale.setScalar(Math.max(0, s));
		}

		bobT += delta;
		if (!isDragging && appearT >= 1) {
			groupRef.position.y = itemY + 0.04 + Math.sin(bobT * 2.2) * 0.022;
			groupRef.rotation.y = bobT * 0.75;
		}

		const interact = inputQueries.isPressed('player1', 'interact');
		const justPressed = interact && !prevInteract;
		prevInteract = interact;

		if (!isDragging) {
			const dx = mouseSharedPos.x - itemX;
			const dy = mouseSharedPos.y - itemY;
			const dz = mouseSharedPos.z - itemZ;
			const inRange = Math.sqrt(dx * dx + dy * dy + dz * dz) < PICKUP_RADIUS;
			if (inRange !== wasInRange) {
				decorationState.pickupInRange = inRange;
				wasInRange = inRange;
			}

			if (justPressed && inRange && !decorationState.carrying) {
				isDragging = true;
				stuckTimer = 0;
				pickupCooldown = 0.35;
				prevItemX = itemX;
				prevItemZ = itemZ;
				decorationActions.pickup(idx);
				spawnSparks(itemX, itemY, itemZ);
				soundActions.playMouseEating();
			}
		} else {
			if (pickupCooldown > 0) pickupCooldown -= delta;

			if (justPressed) {
				dropItem();
				return;
			}

			const fwdX = -Math.sin(mouseSharedFacing.angle);
			const fwdZ = -Math.cos(mouseSharedFacing.angle);
			const tx = mouseSharedPos.x + fwdX * PUSH_DIST;
			const tz = mouseSharedPos.z + fwdZ * PUSH_DIST;

			const dx = tx - itemX;
			const dz = tz - itemZ;
			const dist = Math.sqrt(dx * dx + dz * dz);

			// Y follows mouse smoothly
			itemY += (mouseSharedPos.y - itemY) * Math.min(1, delta * 8);

			if (dist > 0.04) {
				const inv = 1 / dist;
				const nx = dx * inv;
				const nz = dz * inv;
				const px = -nz; // perpendicular to movement
				const pz = nx;
				const oy = itemY + 0.05; // slight Y lift to skip floor

				// Three surface-origin rays: centre + left/right flanks catch corner contacts
				_wallRayC.origin.x = itemX + nx * BALL_R; _wallRayC.origin.y = oy; _wallRayC.origin.z = itemZ + nz * BALL_R;
				_wallRayL.origin.x = itemX + px * BALL_R; _wallRayL.origin.y = oy; _wallRayL.origin.z = itemZ + pz * BALL_R;
				_wallRayR.origin.x = itemX - px * BALL_R; _wallRayR.origin.y = oy; _wallRayR.origin.z = itemZ - pz * BALL_R;
				_wallRayC.dir.x = _wallRayL.dir.x = _wallRayR.dir.x = nx;
				_wallRayC.dir.y = _wallRayL.dir.y = _wallRayR.dir.y = 0;
				_wallRayC.dir.z = _wallRayL.dir.z = _wallRayR.dir.z = nz;

				const hitC = world.castRay(_wallRayC, dist, false);
				const hitL = world.castRay(_wallRayL, dist, false);
				const hitR = world.castRay(_wallRayR, dist, false);

				let clearance = dist;
				if (hitC) clearance = Math.min(clearance, hitC.timeOfImpact);
				if (hitL) clearance = Math.min(clearance, hitL.timeOfImpact);
				if (hitR) clearance = Math.min(clearance, hitR.timeOfImpact);

				const STOP_CLEARANCE = 0.06;
				if (clearance > STOP_CLEARANCE) {
					const speed = Math.min(dist * 13, DRAG_SPEED, clearance * 15);
					const move = Math.min(speed * delta, clearance - STOP_CLEARANCE);
					itemX += nx * move;
					itemZ += nz * move;
				}
			}

			// Stuck detection: item blocked by wall, mouse is far — teleport to mouse feet
			const movedX = itemX - prevItemX;
			const movedZ = itemZ - prevItemZ;
			const currentSpeed = Math.sqrt(movedX * movedX + movedZ * movedZ) / delta;
			if (dist > STUCK_DIST && currentSpeed < STUCK_SPEED && pickupCooldown <= 0) {
				stuckTimer += delta;
				if (stuckTimer > STUCK_TIME) {
					itemX = mouseSharedPos.x;
					itemZ = mouseSharedPos.z;
					itemY = mouseSharedPos.y;
					dropItem();
					return;
				}
			} else {
				stuckTimer = 0;
			}
			prevItemX = itemX;
			prevItemZ = itemZ;

			// Safety net: item somehow far from mouse — drop at mouse
			const dragDx = mouseSharedPos.x - itemX;
			const dragDz = mouseSharedPos.z - itemZ;
			if (Math.sqrt(dragDx * dragDx + dragDz * dragDz) > DRAG_MAX_DIST) {
				itemX = mouseSharedPos.x;
				itemZ = mouseSharedPos.z;
				itemY = mouseSharedPos.y;
				dropItem();
				return;
			}

			// Glow pulse while dragging
			if (lightRef) lightRef.intensity = 1.5 + Math.sin(bobT * 5) * 0.8;

			// Auto-capture at spawn
			const sx = sp[0] - itemX;
			const sy = sp[1] - itemY;
			const sz = sp[2] - itemZ;
			const distToSpawn = Math.sqrt(sx * sx + sy * sy + sz * sz);
			const nearSpawn = distToSpawn < CAPTURE_RADIUS;

			if (nearSpawn !== decorationState.deliverInRange) decorationState.deliverInRange = nearSpawn;

			if (nearSpawn) {
				isDragging = false;
				delivered = true;
				decorationActions.deliver(idx);
				spawnSparks(itemX, itemY, itemZ);
				soundActions.playSwoosh();
				if (groupRef) groupRef.visible = false;
				if (lightRef) lightRef.intensity = 0.9;
				if (circleRef) circleRef.visible = false;
			}
		}
	});
</script>

<!-- Floor indicator circle -->
<T.Mesh
	rotation={[-Math.PI / 2, 0, 0]}
	oncreate={(ref) => {
		circleRef = ref;
		ref.position.set(p[0], 0.005, p[2]);
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

<!-- Visual — position driven by itemX/Y/Z each frame -->
<T.Group
	oncreate={(ref) => {
		groupRef = ref;
		ref.position.set(p[0], p[1], p[2]);
		ref.scale.setScalar(0);
	}}
>
	<DecorationShape index={idx} />
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
