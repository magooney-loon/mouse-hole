<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import { RigidBody, Collider } from '@threlte/rapier';
	import { onDestroy } from 'svelte';
	import * as THREE from 'three';
	import { inputQueries } from '$extensions/input/input.svelte';
	import { gameState } from '$lib/gameState.svelte';
	import { decorationState, decorationActions } from '$lib/decorationState.svelte';
	import { mouseSharedPos, mouseSharedFacing } from '$lib/catAI.svelte';
	import { soundActions } from '$core/globalAudio.svelte';

	interface Props {
		position: [number, number, number];
		spawnPosition: [number, number, number];
	}
	let { position, spawnPosition }: Props = $props();

	const PICKUP_RADIUS = 1.1; // start dragging when mouse this close
	const CAPTURE_RADIUS = 0.45; // auto-deliver when body this close to spawn
	const DRAG_SPEED = 7; // max push velocity m/s
	const PUSH_DIST = 0.55; // how far in front of mouse to target
	const IMPACT_THRESHOLD = 30; // contact force threshold to play sound
	const IMPACT_COOLDOWN = 0.35; // seconds between impact sounds

	let isDragging = false;
	let delivered = false;
	let wasInRange = false;
	let appearT = 0;
	let impactCooldown = 0;
	let prevInteract = false;

	let emissiveRef: THREE.MeshStandardMaterial | null = null;
	let groupRef: THREE.Group | null = null;
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
		decorBody.setTranslation({ x: position[0], y: position[1], z: position[2] }, true);
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

	$effect(() => {
		if (gameState.status === 'starting') {
			isDragging = false;
			delivered = false;
			appearT = 0;
			wasInRange = false;
			impactCooldown = 0;
			prevInteract = false;
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

		// Pop-in
		if (appearT < 1) {
			appearT = Math.min(1, appearT + delta / 0.4);
			const t = appearT;
			const s = t < 0.6 ? (t / 0.6) * 1.2 : 1.2 - ((t - 0.6) / 0.4) * 0.2;
			groupRef.scale.setScalar(Math.max(0, s));
		}

		const interact     = inputQueries.isPressed('player1', 'interact');
		const justPressed  = interact && !prevInteract;
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
				decorationActions.pickup();
				spawnSparks(pos.x, pos.y, pos.z);
				soundActions.playMouseEating();
			}
		} else {
			// Second press → drop
			if (justPressed) {
				isDragging = false;
				decorationActions.drop();
				if (emissiveRef) emissiveRef.emissiveIntensity = 0.35;
				if (decorationState.deliverInRange) decorationState.deliverInRange = false;
				return;
			}

			// Target: floor level in front of the mouse
			const fwdX = -Math.sin(mouseSharedFacing.angle);
			const fwdZ = -Math.cos(mouseSharedFacing.angle);
			const tx = mouseSharedPos.x + fwdX * PUSH_DIST;
			const tz = mouseSharedPos.z + fwdZ * PUSH_DIST;

			// XZ spring push — keep Y from physics (gravity + floor handle vertical)
			const dx = tx - pos.x;
			const dz = tz - pos.z;
			const dist = Math.sqrt(dx * dx + dz * dz);

			if (dist > 0.04) {
				const speed = Math.min(dist * 13, DRAG_SPEED);
				const inv = 1 / dist;
				decorBody.setLinvel({ x: dx * inv * speed, y: vel.y, z: dz * inv * speed }, true);
			} else {
				decorBody.setLinvel({ x: 0, y: vel.y, z: 0 }, true);
			}

			// Emissive pulse while dragging
			if (emissiveRef) emissiveRef.emissiveIntensity = 0.55 + Math.sin(Date.now() * 0.005) * 0.2;

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
				decorationActions.deliver();
				spawnSparks(pos.x, pos.y, pos.z);
				soundActions.playSwoosh();
				if (groupRef) groupRef.visible = false;
				if (emissiveRef) emissiveRef.emissiveIntensity = 0.35;
				hideBody();
			}
		}
	});
</script>

<!-- Physics body -->
<RigidBody
	type="dynamic"
	linearDamping={1.8}
	angularDamping={4}
	ccd
	oncreate={(rb) => {
		decorBody = rb;
		rb.setTranslation({ x: position[0], y: position[1], z: position[2] }, true);
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
	<T.Mesh castShadow>
		<T.OctahedronGeometry args={[0.1, 0]} />
		<T.MeshStandardMaterial
			color="#a855f7"
			emissive="#a855f7"
			emissiveIntensity={0.35}
			flatShading
			metalness={0.2}
			roughness={0.3}
			oncreate={(ref) => {
				emissiveRef = ref;
			}}
		/>
	</T.Mesh>
	<T.Mesh>
		<T.OctahedronGeometry args={[0.045, 0]} />
		<T.MeshStandardMaterial
			color="#f0abfc"
			emissive="#e879f9"
			emissiveIntensity={1.2}
			flatShading
		/>
	</T.Mesh>
	<T.PointLight color="#d946ef" intensity={0.9} distance={1.5} decay={2} position={[0, 0.1, 0]} />
</T.Group>

<T.Group
	oncreate={(ref) => {
		sparkGroupRef = ref;
		initSparks(ref);
	}}
/>
