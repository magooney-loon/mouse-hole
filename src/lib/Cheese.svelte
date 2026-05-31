<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import { onDestroy } from 'svelte';
	import * as THREE from 'three';
	import { inputQueries } from '$extensions/input/input.svelte';
	import { gameState } from '$lib/gameState.svelte';
	import { mouseSharedPos } from '$lib/catAI.svelte';
	import { soundActions } from '$core/globalAudio.svelte';

	interface Props {
		position: [number, number, number];
	}
	let { position }: Props = $props();

	// Randomised at mount
	const healAmount = 15 + Math.random() * 30;
	const respawnDelay = 10 + Math.random() * 20;
	const scale = 0.7 + Math.random() * 0.7;
	const INTERACT_RADIUS = 0.5 + scale * 0.15;

	// All plain vars — zero Svelte reactivity in the eat/respawn cycle
	let eaten = false;
	let respawnTimer = 0;
	let prevInteract = false;
	let wasInRange = false;
	let bobT = 0;
	let appearT = 0; // 0 → 1  pop-in
	let eatT = -1; // -1 = idle, 0 → 1 = shrink-out

	let groupRef: THREE.Group | null = null;
	let circleRef: THREE.Mesh | null = null;
	let crumbGroupRef: THREE.Group | null = null;

	// ── Crumb particle pool ───────────────────────────────────────────────────
	const CRUMB_COUNT = 12;
	const _crumbGeo = new THREE.BoxGeometry(0.03, 0.022, 0.018);

	type Crumb = {
		mesh: THREE.Mesh;
		vx: number;
		vy: number;
		vz: number;
		life: number;
		maxLife: number;
		active: boolean;
	};
	const crumbs: Crumb[] = [];

	const initCrumbs = (group: THREE.Group) => {
		for (let i = 0; i < CRUMB_COUNT; i++) {
			const mat = new THREE.MeshStandardMaterial({
				color: i % 3 === 0 ? '#c8900a' : '#f5c218',
				flatShading: true
			});
			const mesh = new THREE.Mesh(_crumbGeo, mat);
			mesh.visible = false;
			group.add(mesh);
			crumbs.push({ mesh, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 0.5, active: false });
		}
	};

	const spawnCrumbs = () => {
		if (!crumbGroupRef) return;
		crumbGroupRef.position.set(position[0], position[1] + 0.1, position[2]);
		for (const c of crumbs) {
			const angle = Math.random() * Math.PI * 2;
			const speed = 1.5 + Math.random() * 2.2;
			c.vx = Math.cos(angle) * speed;
			c.vy = 2.5 + Math.random() * 2.5;
			c.vz = Math.sin(angle) * speed;
			c.life = 0;
			c.maxLife = 0.28 + Math.random() * 0.32;
			c.active = true;
			c.mesh.visible = true;
			c.mesh.position.set(
				(Math.random() - 0.5) * 0.1,
				Math.random() * 0.06,
				(Math.random() - 0.5) * 0.1
			);
			c.mesh.rotation.set(
				Math.random() * Math.PI * 2,
				Math.random() * Math.PI * 2,
				Math.random() * Math.PI * 2
			);
			c.mesh.scale.setScalar(1);
		}
	};

	onDestroy(() => {
		_crumbGeo.dispose();
		bodyGeo.dispose();
		rindGeo.dispose();
		for (const c of crumbs) (c.mesh.material as THREE.Material).dispose();
	});

	// ── Cheese wedge geometry ──────────────────────────────────────────────────
	const WD = 0.1; // depth (thin edge to thick back)
	const WH = 0.12; // height at thick edge
	const WW = 0.15; // width of the slice

	// Body profile (side view: right triangle)
	const cheeseBody = new THREE.Shape();
	cheeseBody.moveTo(0, 0);
	cheeseBody.lineTo(WD, 0);
	cheeseBody.lineTo(WD, WH);
	cheeseBody.closePath();

	// Swiss holes punched through the width
	const bh1 = new THREE.Path();
	bh1.absarc(WD * 0.6, WH * 0.3, 0.015, 0, Math.PI * 2, false);
	cheeseBody.holes.push(bh1);

	const bh2 = new THREE.Path();
	bh2.absarc(WD * 0.82, WH * 0.5, 0.012, 0, Math.PI * 2, false);
	cheeseBody.holes.push(bh2);

	const bh3 = new THREE.Path();
	bh3.absarc(WD * 0.55, WH * 0.58, 0.009, 0, Math.PI * 2, false);
	cheeseBody.holes.push(bh3);

	// Rind profile (same outline, no holes — rendered BackSide to create a border)
	const cheeseRind = new THREE.Shape();
	cheeseRind.moveTo(0, 0);
	cheeseRind.lineTo(WD, 0);
	cheeseRind.lineTo(WD, WH);
	cheeseRind.closePath();

	const extOpts = {
		depth: WW,
		bevelEnabled: true,
		bevelThickness: 0.005,
		bevelSize: 0.005,
		bevelSegments: 2
	};

	// Create geometries once as stable references — avoids Threlte recreating them on every re-render
	const bodyGeo = new THREE.ExtrudeGeometry(cheeseBody, extOpts);
	bodyGeo.translate(-WD / 2, 0, -WW / 2);

	const rindGeo = new THREE.ExtrudeGeometry(cheeseRind, extOpts);
	rindGeo.translate(-WD / 2, 0, -WW / 2);

	// Reset on game restart
	$effect(() => {
		if (gameState.status === 'starting' && groupRef) {
			eaten = false;
			respawnTimer = 0;
			bobT = 0;
			eatT = -1;
			appearT = 0;
			wasInRange = false;
			groupRef.visible = true;
			groupRef.position.y = 0;
			groupRef.rotation.y = 0;
			groupRef.scale.setScalar(0);
		}
	});

	useTask((delta) => {
		// ── Crumbs (always tick so they finish even after game over) ────────────
		for (const c of crumbs) {
			if (!c.active) continue;
			c.life += delta;
			if (c.life >= c.maxLife) {
				c.active = false;
				c.mesh.visible = false;
				continue;
			}
			const t = c.life / c.maxLife;
			c.vy -= 11 * delta;
			c.vx *= 1 - delta * 5;
			c.vz *= 1 - delta * 5;
			c.mesh.position.x += c.vx * delta;
			c.mesh.position.y += c.vy * delta;
			c.mesh.position.z += c.vz * delta;
			c.mesh.rotation.x += 9 * delta;
			c.mesh.rotation.z += 7 * delta;
			c.mesh.scale.setScalar(Math.max(0, 1 - t * t));
		}

		if (circleRef) circleRef.visible = !eaten;

		if (gameState.status !== 'playing') {
			if (wasInRange) {
				gameState.cheeseInRange = false;
				wasInRange = false;
			}
			return;
		}

		if (!groupRef) return;

		// ── Eat shrink-out ────────────────────────────────────────────────────
		if (eatT >= 0) {
			eatT = Math.min(1, eatT + delta / 0.18);
			groupRef.scale.setScalar(Math.max(0, Math.pow(1 - eatT, 1.6) * scale));
			if (eatT >= 1) {
				groupRef.visible = false;
				eaten = true;
				eatT = -1;
			}
			return;
		}

		// ── Respawn wait ──────────────────────────────────────────────────────
		if (eaten) {
			respawnTimer -= delta;
			if (respawnTimer <= 0) {
				eaten = false;
				appearT = 0;
				groupRef.visible = true;
				groupRef.scale.setScalar(0);
			}
			if (wasInRange) {
				gameState.cheeseInRange = false;
				wasInRange = false;
			}
			return;
		}

		// ── Pop-in animation ──────────────────────────────────────────────────
		if (appearT < 1) {
			appearT = Math.min(1, appearT + delta / 0.32);
			// Elastic overshoot: zoom to 125% then settle at 100%
			const s =
				appearT < 0.65
					? (appearT / 0.65) * 1.25 * scale
					: scale * (1.25 - ((appearT - 0.65) / 0.35) * 0.25);
			groupRef.scale.setScalar(Math.max(0, s));
		}

		// ── Bob + rotate ──────────────────────────────────────────────────────
		bobT += delta;
		groupRef.position.y = 0.05 + Math.sin(bobT * 2.2) * 0.025;
		groupRef.rotation.y = bobT * 0.6;

		// ── Range check ───────────────────────────────────────────────────────
		const dx = mouseSharedPos.x - position[0];
		const dy = mouseSharedPos.y - position[1];
		const dz = mouseSharedPos.z - position[2];
		const inRange = Math.sqrt(dx * dx + dy * dy + dz * dz) < INTERACT_RADIUS;
		if (inRange !== wasInRange) {
			gameState.cheeseInRange = inRange;
			wasInRange = inRange;
		}

		// ── Interact ──────────────────────────────────────────────────────────
		const interact = inputQueries.isPressed('player1', 'interact');
		const justInteracted = interact && !prevInteract;
		prevInteract = interact;

		if (justInteracted && inRange) {
			eatT = 0;
			respawnTimer = respawnDelay;
			gameState.hunger = Math.min(100, gameState.hunger + healAmount);
			gameState.cheeseInRange = false;
			wasInRange = false;
			spawnCrumbs();
			soundActions.playMouseEating();
		}
	});
</script>

<!-- Outer group: stable world position from prop -->
<T.Group position={[position[0], position[1], position[2]]}>
	<!-- Floor indicator circle — outside inner group so it ignores bob/scale -->
	<T.Mesh
		rotation={[-Math.PI / 2, 0, 0]}
		position={[0, 0.005, 0]}
		oncreate={(ref) => { circleRef = ref; }}
	>
		<T.CircleGeometry args={[0.1, 20]} />
		<T.MeshStandardMaterial
			color="#f5c218"
			emissive="#f5c218"
			emissiveIntensity={0.4}
			transparent
			opacity={0.35}
			depthWrite={false}
		/>
	</T.Mesh>

	<!-- Inner group: Y bob, rotation, scale — all driven imperatively -->
	<T.Group
		oncreate={(ref) => {
			groupRef = ref;
			ref.scale.setScalar(0);
		}}
	>
		<!-- Wedge body — geometry created once imperatively, passed as stable ref -->
		<T.Mesh castShadow rotation={[0, Math.PI / 6, 0]} geometry={bodyGeo}>
			<T.MeshStandardMaterial
				color="#f5c218"
				flatShading
				emissive="#f5c218"
				emissiveIntensity={0.12}
			/>
		</T.Mesh>

		<!-- Rind -->
		<T.Mesh scale={1.04} rotation={[0, Math.PI / 6, 0]} geometry={rindGeo}>
			<T.MeshStandardMaterial color="#c8900a" flatShading side={THREE.BackSide} />
		</T.Mesh>

	</T.Group>
</T.Group>

<!-- Crumb particles — separate from cheese so scale/visibility don't affect them -->
<T.Group
	oncreate={(ref) => {
		crumbGroupRef = ref;
		initCrumbs(ref);
	}}
/>
