<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { T, useTask } from '@threlte/core';
	import { RigidBody, Collider, useRapier } from '@threlte/rapier';
	import { useGltf, useGltfAnimations, PositionalAudio } from '@threlte/extras';
	import { BASE_URL, settingsState } from '$extensions/settings/settings.svelte';
	import { catAIState, mouseHitRequest, mouseSharedPos, mouseBodyRef } from '$lib/catAI.svelte';
	import { gameState } from '$lib/gameState.svelte';
	import { soundActions } from '$core/globalAudio.svelte';
	import * as THREE from 'three';
	import { LoopRepeat } from 'three';

	const { world, rapier } = useRapier();

	let catBody: any = null;

	// ── Model & animation ─────────────────────────────────────────────────────
	const gltf = useGltf(`${BASE_URL}models/stages/katze.glb`);
	const { actions } = useGltfAnimations(gltf);

	let currentAnim: string | null = null;
	let activeAction: any = null;

	const playAnim = (name: string, loop = true) => {
		if (name === currentAnim) return;
		const act = $actions?.[name];
		if (!act) return;
		if (currentAnim) {
			const prev = $actions?.[currentAnim];
			if (prev) prev.fadeOut(0.25);
		}
		act.reset().fadeIn(0.25).play();
		if (loop) act.setLoop(LoopRepeat, Infinity);
		currentAnim = name;
		activeAction = act;
	};

	$effect(() => {
		if (!$actions) return;
		playAnim('GltfAnimation 0');
	});

	// ── Positional meow audio ──────────────────────────────────────────────────
	const MEOW_URLS = [
		`${BASE_URL}sounds/sfx/meow_1.ogg`,
		`${BASE_URL}sounds/sfx/meow_2.ogg`,
		`${BASE_URL}sounds/sfx/meow_3.ogg`,
		`${BASE_URL}sounds/sfx/meow_4.ogg`
	];
	let meowAudios: any[] = [undefined, undefined, undefined, undefined];

	const playMeow = (volume = 1.0) => {
		if (!settingsState.audio.sfxEnabled) return;
		const idx = Math.floor(Math.random() * 4);
		const audio = meowAudios[idx];
		if (!audio?.buffer) return;
		const clone = audio.clone();
		clone.setVolume(settingsState.audio.sfxVolume * volume);
		clone.play();
	};

	// ── Reset on game restart ─────────────────────────────────────────────────
	$effect(() => {
		if (gameState.status === 'starting' && catBody) {
			catBody.setTranslation({ x: 8.127, y: 1, z: 1.407 }, true);
			catBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
			catBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
			resetLocalState();
		}
	});

	// ── Constants ─────────────────────────────────────────────────────────────
	const CAT_WALK_SPEED = 1.8;
	const CAT_SEARCH_SPEED = 2.4;
	const CAT_CHASE_SPEED = 3.8;
	const GROUND_RAY_LEN = 0.12;

	// Safe zone — cat loses interest when mouse is here (spawn / mouse hole)
	const SAFE_ZONE_X = 1.936;
	const SAFE_ZONE_Z = -1.894;
	const SAFE_ZONE_RADIUS = 1.1;

	const mouseInSafeZone = (): boolean => {
		const dx = mouseSharedPos.x - SAFE_ZONE_X;
		const dz = mouseSharedPos.z - SAFE_ZONE_Z;
		return dx * dx + dz * dz < SAFE_ZONE_RADIUS * SAFE_ZONE_RADIUS;
	};

	const CAT_SIGHT_RANGE = 9;
	const CONE_VISUAL_RANGE = 5; // rendered cone length (gameplay sight stays at CAT_SIGHT_RANGE)
	const CAT_SIGHT_HALF_ANGLE = Math.PI / 4; // 90° total FOV
	const CAT_HEAR_BASE = 2;
	const CAT_HEAR_MAX = 10;
	const CONE_SEGMENTS = 24;
	const CONE_V_RINGS = 5; // vertical layers for 3D shape
	const CONE_V_HALF = Math.PI / 6; // 30° up/down vertical FOV
	const CONE_EYE_HEIGHT = 0.05; // just above body center (model offset is -0.4)
	const CONE_FORWARD = 0.35; // push origin forward from body center

	const ARRIVE_DIST = 1.0;
	const CATCH_DIST = 0.78;
	const CATCH_COOLDOWN = 0.9;
	const KNOCKBACK_SPEED = 2.5;
	const KNOCKBACK_UP = 1.2;
	const PERSONAL_SPACE_DIST = 0.65;
	const INVESTIGATE_DUR = 3.5;
	const SEARCH_TIMEOUT = 10;
	const SIGHT_LOSS_TIMEOUT = 1.5;

	// ── Avoidance constants ───────────────────────────────────────────────────
	const AVOID_PROBE_DIST = 1.4; // how far ahead to check for walls
	const AVOID_SIDE_ANGLE = Math.PI / 5; // ~36° side probe angle
	const AVOID_STEER_WEIGHT = 1.0; // how strongly avoidance deflects heading
	const AVOID_WALL_MARGIN = 0.55; // treat hits closer than this as "wall"

	const STUCK_TIME = 0.6; // seconds of no progress before stuck recovery
	const STUCK_SPEED_THRESH = 0.2; // speed² below which = stuck
	const ESCAPE_PROBE_COUNT = 8; // directions to test for escape
	const ESCAPE_PROBE_DIST = 1.5; // how far each escape probe reaches

	// ── Roaming constants ────────────────────────────────────────────────────
	const ROAM_DIR_MIN_TIME = 2.0; // min seconds before picking new direction
	const ROAM_DIR_MAX_TIME = 5.0; // max seconds before picking new direction
	const ROAM_PROBE_FWD = 1.5; // forward probe distance for wall detection
	const ROAM_PROBE_SIDE = 1.0; // side probe distance
	const ROAM_PROBE_COUNT = 16; // directions scanned when picking new roam dir

	// ── Per-frame local state ─────────────────────────────────────────────────
	let facingAngle = 0;
	let curVelX = 0;
	let curVelZ = 0;
	let roamTimer = 0; // countdown to next direction change
	let roamTargetAngle = 0; // current roaming heading
	let stuckTimer = 0;
	let noSightTimer = 0;
	let searchTimer = 0;
	let meowCooldown = 3;
	let catchCooldown = 0;
	let prevMode = catAIState.mode;
	let escapeDir = 0; // best escape direction when stuck
	let escaping = false; // actively following escape direction
	let escapeTimer = 0; // time remaining on escape maneuver
	let investigateDir = 0; // direction to look during investigate
	let sitting = false; // cat is sitting idle during patrol
	let sitTimer = 0; // countdown while sitting
	let nextSitCheck = 5; // seconds until next random sit decision
	let attacking = false; // playing attack animation, blocks other anim switching
	let attackTimer = 0; // time remaining on attack animation

	function resetLocalState() {
		facingAngle = 0;
		curVelX = 0;
		curVelZ = 0;
		roamTimer = 0;
		roamTargetAngle = 0;
		stuckTimer = 0;
		noSightTimer = 0;
		searchTimer = 0;
		meowCooldown = 3;
		catchCooldown = 0;
		prevMode = 'patrol';
		escapeDir = 0;
		escaping = false;
		escapeTimer = 0;
		investigateDir = 0;
		sitting = false;
		sitTimer = 0;
		nextSitCheck = 5;
		attacking = false;
		attackTimer = 0;
		catAIState.mode = 'patrol';
		catAIState.alertLevel = 0;
		catAIState.lastKnownPos = null;
		catAIState.investigateTimer = 0;

		// Reset cone smoothing state
		coneSmoothX = 0;
		coneSmoothY = 0;
		coneSmoothZ = 0;
		coneSmoothRotY = 0;
		coneSmoothRotX = 0;
		coneSmoothColorR = 0.55;
		coneSmoothColorG = 0.95;
		coneSmoothColorB = 0.65;
		_smoothedSegDists.fill(CONE_VISUAL_RANGE);
	}

	onMount(resetLocalState);
	onDestroy(() => {
		catBody = null;
		currentAnim = null;
		activeAction = null;
	});

	// ── Reusable vectors (avoid per-frame alloc) ───────────────────────────────
	const _catPos = new THREE.Vector3();
	const _mousePos = new THREE.Vector3();
	const _toMouse = new THREE.Vector3();
	const _fwdFlat = new THREE.Vector3();
	const _toMouseFlat = new THREE.Vector3();
	const _hitDir = new THREE.Vector3();
	const _rayDir = new THREE.Vector3();
	const _coneVertCount = 1 + CONE_V_RINGS * (CONE_SEGMENTS + 1);
	const _conePositions = new Float32Array(_coneVertCount * 3);
	const _coneDistances = new Float32Array(_coneVertCount);
	const _segDists = new Float32Array(CONE_SEGMENTS + 1); // per-segment ray distances (reused across rings)
	const _smoothedSegDists = new Float32Array(CONE_SEGMENTS + 1).fill(CONE_VISUAL_RANGE); // smoothed per-segment distances

	// ── Smoothed cone transform state (prevents jitter on erratic movement) ─────
	let coneSmoothX = 0;
	let coneSmoothY = 0;
	let coneSmoothZ = 0;
	let coneSmoothRotY = 0;
	let coneSmoothRotX = 0;
	let coneSmoothColorR = 0.55;
	let coneSmoothColorG = 0.95;
	let coneSmoothColorB = 0.65;

	// ── Vision cone refs (updated imperatively in the task) ──────────────────
	let coneGroupRef: THREE.Group | null = null;
	let coneMatRef: THREE.ShaderMaterial | null = null;
	let coneGeoRef: THREE.BufferGeometry<THREE.NormalBufferAttributes> | null = null;

	// ── Perception ────────────────────────────────────────────────────────────
	const isGrounded = (): boolean => {
		const t = catBody.translation();
		// Cast from the bottom of the cat's collider (y - halfHeight)
		const ray = new rapier.Ray({ x: t.x, y: t.y - 0.3, z: t.z }, { x: 0, y: -1, z: 0 });
		return !!world.castRay(ray, GROUND_RAY_LEN, true, undefined, undefined, undefined, catBody);
	};

	const firstRayHitDist = (
		origin: { x: number; y: number; z: number },
		dir: { x: number; y: number; z: number },
		maxDist: number
	): number => {
		const ray = new rapier.Ray(origin, dir);
		const hit = world.castRay(ray, maxDist, true, undefined, undefined, undefined, catBody);
		return hit ? hit.timeOfImpact : maxDist;
	};

	// Returns true if the ray from cat reaches the mouse without hitting a wall.
	// Excludes cat body, then checks if the first hit belongs to the mouse body.
	const hasClearLOS = (
		origin: { x: number; y: number; z: number },
		dir: { x: number; y: number; z: number },
		maxDist: number
	): boolean => {
		const ray = new rapier.Ray(origin, dir);
		const hit = world.castRay(ray, maxDist, true, undefined, undefined, undefined, catBody);
		if (!hit) return false;
		// Check if the hit collider belongs to the mouse body
		const hitBody = hit.collider.parent();
		if (hitBody && mouseBodyRef.current && hitBody.handle === mouseBodyRef.current.handle)
			return true;
		// Hit something that isn't the mouse → wall in the way
		return false;
	};

	// Horizontal ray at cat's eye height — used for wall avoidance probes
	const wallDist = (
		ox: number,
		oy: number,
		oz: number,
		dx: number,
		dz: number,
		maxDist: number
	): number => {
		return firstRayHitDist({ x: ox, y: oy, z: oz }, { x: dx, y: 0, z: dz }, maxDist);
	};

	const hasLOS = (dist: number): boolean => {
		const dir = _toMouse.normalize();
		const t = catBody.translation();
		return hasClearLOS({ x: t.x, y: t.y + CONE_EYE_HEIGHT, z: t.z }, dir, dist);
	};

	const canSee = (): boolean => {
		_toMouse.subVectors(_mousePos, _catPos);
		const dist = _toMouse.length();
		if (dist > CAT_SIGHT_RANGE) return false;

		_fwdFlat.set(-Math.sin(facingAngle), 0, -Math.cos(facingAngle));
		_toMouseFlat.set(_toMouse.x, 0, _toMouse.z).normalize();
		if (_fwdFlat.dot(_toMouseFlat) <= Math.cos(CAT_SIGHT_HALF_ANGLE)) return false;

		return hasLOS(dist);
	};

	const hitMouse = () => {
		const damage = 5 + Math.floor(Math.random() * 11);
		gameState.hunger = Math.max(0, gameState.hunger - damage);
		playAnim('attack', false);
		attacking = true;
		attackTimer = CATCH_COOLDOWN;
		soundActions.playImpact();
		if (gameState.hunger <= 0) {
			gameState.status = 'game_over';
			soundActions.playKatzeWin();
		}

		_hitDir.subVectors(_mousePos, _catPos);
		_hitDir.y = 0;
		if (_hitDir.lengthSq() < 0.0001) {
			_hitDir.set(-Math.sin(facingAngle), 0, -Math.cos(facingAngle));
		} else {
			_hitDir.normalize();
		}

		mouseHitRequest.id += 1;
		mouseHitRequest.x = _hitDir.x * KNOCKBACK_SPEED;
		mouseHitRequest.y = KNOCKBACK_UP;
		mouseHitRequest.z = _hitDir.z * KNOCKBACK_SPEED;
	};

	const updateVisionCone = (t: { x: number; y: number; z: number }, delta: number) => {
		if (!coneGroupRef || !coneGeoRef) return;

		const now = performance.now() * 0.001;

		// ── Smoothed transform — lerp toward target to prevent jitter ──────────
		const fwdX = -Math.sin(facingAngle) * CONE_FORWARD;
		const fwdZ = -Math.cos(facingAngle) * CONE_FORWARD;
		const targetX = t.x + fwdX;
		const targetY = t.y + CONE_EYE_HEIGHT;
		const targetZ = t.z + fwdZ;

		// Position lerp (fast — stay close to the cat)
		const posK = Math.min(1, delta * 20);
		coneSmoothX += (targetX - coneSmoothX) * posK;
		coneSmoothY += (targetY - coneSmoothY) * posK;
		coneSmoothZ += (targetZ - coneSmoothZ) * posK;

		coneGroupRef.position.set(coneSmoothX, coneSmoothY, coneSmoothZ);

		// Y rotation lerp (shortest-path to avoid 360° spins)
		let rotDiff = facingAngle - coneSmoothRotY;
		if (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
		if (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
		const rotK = Math.min(1, delta * 16);
		coneSmoothRotY += rotDiff * rotK;
		coneGroupRef.rotation.y = coneSmoothRotY;

		// Smooth scanning tilt
		const targetTilt = Math.sin(now * 0.8) * 0.18;
		coneSmoothRotX += (targetTilt - coneSmoothRotX) * Math.min(1, delta * 8);
		coneGroupRef.rotation.x = coneSmoothRotX;

		const eyeY = coneSmoothY;

		// Apex vertex (index 0)
		_conePositions[0] = 0;
		_conePositions[1] = 0;
		_conePositions[2] = 0;
		_coneDistances[0] = 0;

		// Step 1: cast horizontal rays to get per-segment distances
		const rayAngle = coneSmoothRotY;
		for (let s = 0; s <= CONE_SEGMENTS; s++) {
			const hAngle = -CAT_SIGHT_HALF_ANGLE + (s / CONE_SEGMENTS) * CAT_SIGHT_HALF_ANGLE * 2;
			const worldAngle = rayAngle + hAngle;
			_rayDir.set(-Math.sin(worldAngle), 0, -Math.cos(worldAngle));
			const rayDist = firstRayHitDist(
				{ x: coneSmoothX, y: eyeY, z: coneSmoothZ },
				{ x: _rayDir.x, y: _rayDir.y, z: _rayDir.z },
				CONE_VISUAL_RANGE
			);
			_segDists[s] = Math.max(0.05, rayDist - 0.04);
		}

		// Smooth per-segment distances to prevent shape popping
		const distK = Math.min(1, delta * 18);
		for (let s = 0; s <= CONE_SEGMENTS; s++) {
			_smoothedSegDists[s] += (_segDists[s] - _smoothedSegDists[s]) * distK;
		}

		// Step 2: build 3D rings using the horizontal distances
		for (let r = 0; r < CONE_V_RINGS; r++) {
			const vAngle = -CONE_V_HALF + (r / (CONE_V_RINGS - 1)) * CONE_V_HALF * 2;
			const cosV = Math.cos(vAngle);
			const sinV = Math.sin(vAngle);

			for (let s = 0; s <= CONE_SEGMENTS; s++) {
				const hAngle = -CAT_SIGHT_HALF_ANGLE + (s / CONE_SEGMENTS) * CAT_SIGHT_HALF_ANGLE * 2;
				const dist = _smoothedSegDists[s];

				const idx = 1 + r * (CONE_SEGMENTS + 1) + s;
				_conePositions[idx * 3] = -Math.sin(hAngle) * dist * cosV;
				_conePositions[idx * 3 + 1] = sinV * dist;
				_conePositions[idx * 3 + 2] = -Math.cos(hAngle) * dist * cosV;
				_coneDistances[idx] = dist / CONE_VISUAL_RANGE;
			}
		}

		const posAttr = coneGeoRef.getAttribute('position') as THREE.BufferAttribute;
		posAttr.needsUpdate = true;

		const distAttr = coneGeoRef.getAttribute('aDist') as THREE.BufferAttribute;
		if (distAttr) distAttr.needsUpdate = true;

		coneGeoRef.computeBoundingSphere();

		// ── Smooth color transitions on mode change ─────────────────────────────
		const targetColor =
			catAIState.mode === 'chase'
				? [0.95, 0.35, 0.35]
				: catAIState.mode === 'search'
					? [0.95, 0.72, 0.4]
					: catAIState.mode === 'investigate'
						? [0.95, 0.9, 0.55]
						: [0.55, 0.95, 0.65];

		const colorK = Math.min(1, delta * 5);
		coneSmoothColorR += (targetColor[0] - coneSmoothColorR) * colorK;
		coneSmoothColorG += (targetColor[1] - coneSmoothColorG) * colorK;
		coneSmoothColorB += (targetColor[2] - coneSmoothColorB) * colorK;

		if (coneMatRef) {
			coneMatRef.uniforms.uColor.value.set(coneSmoothColorR, coneSmoothColorG, coneSmoothColorB);
			coneMatRef.uniforms.uTime.value = now;
		}

		prevMode = catAIState.mode;
	};

	const canHear = (): boolean => {
		const hearDist = CAT_HEAR_BASE + (gameState.sound / 100) * (CAT_HEAR_MAX - CAT_HEAR_BASE);
		return _catPos.distanceTo(_mousePos) < hearDist;
	};

	const shortestDiff = (from: number, to: number): number => {
		let d = to - from;
		while (d > Math.PI) d -= Math.PI * 2;
		while (d < -Math.PI) d += Math.PI * 2;
		return d;
	};

	// ── Obstacle avoidance ────────────────────────────────────────────────────
	// Casts 5 probes (forward, diagonal ±36°, sideways ±90°) and returns a
	// steering angle adjustment that pushes away from nearby walls.
	const computeAvoidance = (t: { x: number; y: number; z: number }): number => {
		const eyeY = t.y + CONE_EYE_HEIGHT;
		let steer = 0;

		const fwdX = -Math.sin(facingAngle);
		const fwdZ = -Math.cos(facingAngle);
		const fwdDist = wallDist(t.x, eyeY, t.z, fwdX, fwdZ, AVOID_PROBE_DIST);

		// Diagonal probes at ±36°
		const lAngle = facingAngle + AVOID_SIDE_ANGLE;
		const leftDist = wallDist(
			t.x,
			eyeY,
			t.z,
			-Math.sin(lAngle),
			-Math.cos(lAngle),
			AVOID_PROBE_DIST
		);
		const rAngle = facingAngle - AVOID_SIDE_ANGLE;
		const rightDist = wallDist(
			t.x,
			eyeY,
			t.z,
			-Math.sin(rAngle),
			-Math.cos(rAngle),
			AVOID_PROBE_DIST
		);

		// 90° side probes — catches walls the cat is sliding along
		const l90 = facingAngle + Math.PI / 2;
		const left90Dist = wallDist(
			t.x,
			eyeY,
			t.z,
			-Math.sin(l90),
			-Math.cos(l90),
			AVOID_WALL_MARGIN * 1.5
		);
		const r90 = facingAngle - Math.PI / 2;
		const right90Dist = wallDist(
			t.x,
			eyeY,
			t.z,
			-Math.sin(r90),
			-Math.cos(r90),
			AVOID_WALL_MARGIN * 1.5
		);

		// Diagonal walls
		if (leftDist < AVOID_WALL_MARGIN) {
			steer -= (1 - leftDist / AVOID_WALL_MARGIN) * AVOID_STEER_WEIGHT;
		}
		if (rightDist < AVOID_WALL_MARGIN) {
			steer += (1 - rightDist / AVOID_WALL_MARGIN) * AVOID_STEER_WEIGHT;
		}
		// Side walls — gentle push so the cat doesn't scrape along them
		if (left90Dist < AVOID_WALL_MARGIN) {
			steer -= (1 - left90Dist / AVOID_WALL_MARGIN) * AVOID_STEER_WEIGHT * 0.5;
		}
		if (right90Dist < AVOID_WALL_MARGIN) {
			steer += (1 - right90Dist / AVOID_WALL_MARGIN) * AVOID_STEER_WEIGHT * 0.5;
		}
		// Wall dead ahead — hard steer toward the clearer side
		if (fwdDist < AVOID_WALL_MARGIN) {
			const urgency = 1 - fwdDist / AVOID_WALL_MARGIN;
			steer += (leftDist > rightDist ? -1 : 1) * urgency * AVOID_STEER_WEIGHT * 2.0;
		}

		return steer;
	};

	// ── Escape direction finder ───────────────────────────────────────────────
	// When truly stuck, cast rays in 8 compass directions and pick the one with
	// the most clearance that still moves toward the target.
	const findEscapeDir = (
		t: { x: number; y: number; z: number },
		targetX: number,
		targetZ: number
	): number => {
		const eyeY = t.y + CONE_EYE_HEIGHT;
		let bestAngle = facingAngle;
		let bestScore = -1;

		for (let i = 0; i < ESCAPE_PROBE_COUNT; i++) {
			const a = (i / ESCAPE_PROBE_COUNT) * Math.PI * 2;
			const dx = -Math.sin(a);
			const dz = -Math.cos(a);
			const dist = wallDist(t.x, eyeY, t.z, dx, dz, ESCAPE_PROBE_DIST);

			// Score = clearance * alignment with target direction
			const toTargetX = targetX - t.x;
			const toTargetZ = targetZ - t.z;
			const toTargetLen = Math.sqrt(toTargetX * toTargetX + toTargetZ * toTargetZ);
			const alignment = toTargetLen > 0.01 ? (dx * toTargetX + dz * toTargetZ) / toTargetLen : 0;

			// Prefer directions with both good clearance and toward the target
			const score = dist * 0.6 + Math.max(0, alignment) * ESCAPE_PROBE_DIST * 0.4;

			if (score > bestScore) {
				bestScore = score;
				bestAngle = a;
			}
		}

		return bestAngle;
	};

	// ── Roaming direction picker ────────────────────────────────────────────────
	// Scans 16 directions, scores each by forward clearance + corridor width,
	const pickRoamDir = (t: { x: number; y: number; z: number }): number => {
		const eyeY = t.y + CONE_EYE_HEIGHT;
		let bestAngle = facingAngle; // fallback: keep going straight
		let bestScore = -1;

		for (let i = 0; i < ROAM_PROBE_COUNT; i++) {
			const a = (i / ROAM_PROBE_COUNT) * Math.PI * 2;
			const dx = -Math.sin(a);
			const dz = -Math.cos(a);

			const fwdClear = wallDist(t.x, eyeY, t.z, dx, dz, ROAM_PROBE_FWD);
			if (fwdClear < 0.35) continue; // basically blocked — skip

			const sideA1 = a + Math.PI / 2;
			const sideA2 = a - Math.PI / 2;
			const side1 = wallDist(t.x, eyeY, t.z, -Math.sin(sideA1), -Math.cos(sideA1), ROAM_PROBE_SIDE);
			const side2 = wallDist(t.x, eyeY, t.z, -Math.sin(sideA2), -Math.cos(sideA2), ROAM_PROBE_SIDE);
			const corridor = Math.min(side1, side2);

			const score = fwdClear * 0.65 + corridor * 0.25 + Math.random() * 0.1;

			if (score > bestScore) {
				bestScore = score;
				bestAngle = a;
			}
		}

		return bestAngle;
	};

	// ── Main task ─────────────────────────────────────────────────────────────
	useTask((delta) => {
		if (!catBody) return;
		if (gameState.status === 'idle' || gameState.status === 'game_over') return;

		const t = catBody.translation();
		_catPos.set(t.x, t.y, t.z);
		_mousePos.set(mouseSharedPos.x, mouseSharedPos.y, mouseSharedPos.z);

		const vel = catBody.linvel();
		const grounded = isGrounded();

		meowCooldown = Math.max(0, meowCooldown - delta);
		catchCooldown = Math.max(0, catchCooldown - delta);
		const safe = mouseInSafeZone();
		const sees = !safe && canSee();
		const hears = !safe && canHear();

		// If mouse reached safe zone, cat gives up and wanders off
		if (safe && (catAIState.mode === 'chase' || catAIState.mode === 'search')) {
			catAIState.mode = 'patrol';
			sitting = false;
			catAIState.alertLevel = 0;
			catAIState.lastKnownPos = null;
			noSightTimer = 0;
			searchTimer = 0;
			roamTargetAngle = pickRoamDir(t);
			roamTimer = ROAM_DIR_MIN_TIME;
		}

		// ── State machine ──────────────────────────────────────────────────────
		switch (catAIState.mode) {
			case 'patrol': {
				if (sees) {
					sitting = false;
					catAIState.mode = 'chase';
					catAIState.lastKnownPos = { x: _mousePos.x, y: _mousePos.y, z: _mousePos.z };
					noSightTimer = 0;
					playMeow(0.7 + catAIState.alertLevel * 0.3);
					meowCooldown = 4 + Math.random() * 4;
				} else if (hears) {
					sitting = false;
					catAIState.mode = 'search';
					catAIState.lastKnownPos = { x: _mousePos.x, y: _mousePos.y, z: _mousePos.z };
					searchTimer = SEARCH_TIMEOUT;
					playMeow(0.3 + (gameState.sound / 100) * 0.4);
					meowCooldown = 3 + Math.random() * 3;
				}

				// Sitting during patrol
				if (sitting) {
					sitTimer -= delta;
					if (sitTimer <= 0) {
						sitting = false;
						nextSitCheck = 5 + Math.random() * 8;
					}
				} else {
					nextSitCheck -= delta;
					if (nextSitCheck <= 0) {
						sitting = true;
						sitTimer = 2 + Math.random() * 4;
					}
				}

				catAIState.alertLevel = Math.max(0, catAIState.alertLevel - 0.3 * delta);
				break;
			}
			case 'search': {
				if (sees) {
					catAIState.mode = 'chase';
					noSightTimer = 0;
					playMeow(1.0);
					meowCooldown = 4 + Math.random() * 4;
				} else {
					if (hears) {
						catAIState.lastKnownPos = { x: _mousePos.x, y: _mousePos.y, z: _mousePos.z };
						searchTimer = SEARCH_TIMEOUT;
					}
					searchTimer -= delta;
					if (searchTimer <= 0) catAIState.mode = 'patrol';

					if (catAIState.lastKnownPos) {
						const dx = catAIState.lastKnownPos.x - t.x;
						const dz = catAIState.lastKnownPos.z - t.z;
						if (Math.sqrt(dx * dx + dz * dz) < ARRIVE_DIST) {
							catAIState.mode = 'investigate';
							catAIState.investigateTimer = INVESTIGATE_DUR;
							// Look toward where the mouse was heading (direction from lastKnownPos to mouse's current pos)
							investigateDir = Math.atan2(
								-(mouseSharedPos.x - catAIState.lastKnownPos.x),
								-(mouseSharedPos.z - catAIState.lastKnownPos.z)
							);
						}
					}
				}
				catAIState.alertLevel = Math.min(1, catAIState.alertLevel + 1.0 * delta);
				break;
			}
			case 'chase': {
				if (
					catchCooldown <= 0 &&
					gameState.status === 'playing' &&
					_catPos.distanceTo(_mousePos) < CATCH_DIST &&
					hasLOS(CATCH_DIST)
				) {
					catchCooldown = CATCH_COOLDOWN;
					hitMouse();
				}
				if (sees) {
					catAIState.lastKnownPos = { x: _mousePos.x, y: _mousePos.y, z: _mousePos.z };
					noSightTimer = 0;
					if (meowCooldown <= 0) {
						playMeow(0.8 + Math.random() * 0.2);
						meowCooldown = 3 + Math.random() * 5;
					}
				} else {
					noSightTimer += delta;
					if (noSightTimer > SIGHT_LOSS_TIMEOUT) {
						catAIState.mode = 'investigate';
						catAIState.investigateTimer = INVESTIGATE_DUR;
						// Look toward the direction the mouse was last seen
						if (catAIState.lastKnownPos) {
							investigateDir = Math.atan2(
								-(catAIState.lastKnownPos.x - t.x),
								-(catAIState.lastKnownPos.z - t.z)
							);
						} else {
							investigateDir = facingAngle;
						}
					}
				}
				catAIState.alertLevel = Math.min(1, catAIState.alertLevel + 2.0 * delta);
				break;
			}
			case 'investigate': {
				if (sees) {
					catAIState.mode = 'chase';
					noSightTimer = 0;
					playMeow(1.0);
					meowCooldown = 4 + Math.random() * 4;
				} else if (hears) {
					catAIState.mode = 'search';
					catAIState.lastKnownPos = { x: _mousePos.x, y: _mousePos.y, z: _mousePos.z };
					searchTimer = SEARCH_TIMEOUT;
				} else {
					catAIState.investigateTimer -= delta;
					if (catAIState.investigateTimer <= 0) catAIState.mode = 'patrol';
				}
				catAIState.alertLevel = Math.max(0, catAIState.alertLevel - 0.5 * delta);
				break;
			}
		}

		// Play alert sting once on the first frame the cat enters chase mode
		if (prevMode !== 'chase' && catAIState.mode === 'chase') {
			soundActions.playCatAlert();
		}

		// ── Movement target ───────────────────────────────────────────────────
		let targetX = t.x;
		let targetZ = t.z;
		let speed = 0;
		let shouldMove = false;
		let desiredVX = 0;
		let desiredVZ = 0;

		switch (catAIState.mode) {
			case 'patrol': {
				if (sitting) break; // don't move while sitting

				roamTimer -= delta;

				const fwdX = -Math.sin(facingAngle);
				const fwdZ = -Math.cos(facingAngle);
				const fwdClear = wallDist(
					t.x,
					t.y + CONE_EYE_HEIGHT,
					t.z,
					fwdX,
					fwdZ,
					ROAM_PROBE_FWD * 0.7
				);

				if (roamTimer <= 0 || fwdClear < 0.55) {
					roamTargetAngle = pickRoamDir(t);
					roamTimer = ROAM_DIR_MIN_TIME + Math.random() * (ROAM_DIR_MAX_TIME - ROAM_DIR_MIN_TIME);
				}

				// Faster turn rate so the cat actually faces the new direction before hitting the wall
				const diff = shortestDiff(facingAngle, roamTargetAngle);
				facingAngle += diff * Math.min(1, delta * 6.0);

				// Scale speed: slow for walls ahead AND for large turns (don't walk into walls while turning)
				const wallScale = Math.max(0.35, Math.min(1, fwdClear / 0.55));
				const turnScale = Math.max(0.15, Math.abs(Math.cos(diff))); // 1 = straight, ~0 = U-turn
				const speedScale = wallScale * turnScale;
				desiredVX = -Math.sin(facingAngle) * CAT_WALK_SPEED * speedScale;
				desiredVZ = -Math.cos(facingAngle) * CAT_WALK_SPEED * speedScale;
				speed = CAT_WALK_SPEED;
				shouldMove = true;
				break;
			}
			case 'search': {
				if (catAIState.lastKnownPos) {
					targetX = catAIState.lastKnownPos.x;
					targetZ = catAIState.lastKnownPos.z;
					shouldMove = true;
				}
				speed = CAT_SEARCH_SPEED;
				break;
			}
			case 'chase': {
				targetX = _mousePos.x;
				targetZ = _mousePos.z;
				speed = CAT_CHASE_SPEED;
				shouldMove = true;
				break;
			}
			case 'investigate': {
				// Smart look-at: snap toward investigateDir, then sweep slowly
				const diff = shortestDiff(facingAngle, investigateDir);
				facingAngle += diff * Math.min(1, delta * 3.0);
				// After reaching the target direction, slowly sweep back and forth
				if (Math.abs(diff) < 0.2) {
					facingAngle += Math.sin(performance.now() * 0.001 * 1.5) * delta * 1.8;
				}
				break;
			}
		}

		// ── Compute desired velocity from target (search/chase only) ────────────

		if (shouldMove && catAIState.mode !== 'patrol') {
			const dx = targetX - t.x;
			const dz = targetZ - t.z;
			const dist = Math.sqrt(dx * dx + dz * dz);
			if (dist > 0.08) {
				const inv = 1 / dist;
				desiredVX = dx * inv * speed;
				desiredVZ = dz * inv * speed;
				const targetFacing = Math.atan2(-desiredVX, -desiredVZ);
				facingAngle += shortestDiff(facingAngle, targetFacing) * Math.min(1, delta * 6);
			}
		}

		// ── Obstacle avoidance ───────────────────────────────────────────────
		if (shouldMove) {
			const steer = computeAvoidance(t);
			if (steer !== 0) {
				const cos = Math.cos(steer);
				const sin = Math.sin(steer);
				const newVX = desiredVX * cos - desiredVZ * sin;
				const newVZ = desiredVX * sin + desiredVZ * cos;
				desiredVX = newVX;
				desiredVZ = newVZ;
				facingAngle += steer * delta * 4;
				// Commit the avoidance to roamTargetAngle so the cat doesn't oscillate back
				if (catAIState.mode === 'patrol') {
					roamTargetAngle = facingAngle + steer;
				}
			}
		}

		// ── Stuck detection & escape ─────────────────────────────────────────
		const speedSq = vel.x * vel.x + vel.z * vel.z;
		if (shouldMove) {
			if (speedSq > STUCK_SPEED_THRESH) {
				stuckTimer = 0;
				if (escaping) {
					escapeTimer -= delta;
					if (escapeTimer <= 0) {
						escaping = false;
					}
				}
			} else {
				stuckTimer += delta;
			}
		} else {
			stuckTimer = 0;
			escaping = false;
		}

		// When stuck, find best escape direction and override velocity
		if (stuckTimer > STUCK_TIME && shouldMove && !escaping) {
			escapeDir = findEscapeDir(t, targetX, targetZ);
			escaping = true;
			escapeTimer = 1.0; // follow escape direction for 1 second
			stuckTimer = 0;
		}

		if (escaping && shouldMove) {
			escapeTimer -= delta;
			if (escapeTimer <= 0) {
				escaping = false;
			} else {
				// Override desired velocity with escape direction
				desiredVX = -Math.sin(escapeDir) * speed;
				desiredVZ = -Math.cos(escapeDir) * speed;
				const targetFacing = Math.atan2(-desiredVX, -desiredVZ);
				facingAngle += shortestDiff(facingAngle, targetFacing) * Math.min(1, delta * 8);
			}
		}

		// ── Apply velocity ───────────────────────────────────────────────────
		// Stop advancing into the mouse when close — prevents pinning in corners
		// and stops the cat body from physically shoving the mouse through geometry.
		const distToMouse = _catPos.distanceTo(_mousePos);
		if (catAIState.mode === 'chase' && distToMouse < PERSONAL_SPACE_DIST) {
			desiredVX = 0;
			desiredVZ = 0;
		}

		// Stop movement during attack animation
		if (attacking) {
			desiredVX = 0;
			desiredVZ = 0;
		}

		const k = Math.min(1, delta * (grounded ? 14 : 4));
		curVelX += (desiredVX - curVelX) * k;
		curVelZ += (desiredVZ - curVelZ) * k;

		catBody.setLinvel({ x: curVelX, y: vel.y, z: curVelZ }, true);
		catBody.setAngvel({ x: 0, y: 0, z: 0 }, true);

		const half = facingAngle / 2;
		catBody.setRotation({ x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) }, true);

		// ── Attack timer ───────────────────────────────────────────────────────
		if (attacking) {
			attackTimer -= delta;
			if (attackTimer <= 0) attacking = false;
		}

		// ── Animation switching ───────────────────────────────────────────────────
		if (attacking) {
			playAnim('attack', false);
		} else if (catAIState.mode === 'chase') {
			playAnim('GltfAnimation 0');
			if (activeAction) activeAction.setEffectiveTimeScale(1.5);
		} else if (sitting) {
			playAnim('sit');
		} else {
			playAnim('GltfAnimation 0');
			if (activeAction) activeAction.setEffectiveTimeScale(1.0);
		}

		updateVisionCone(t, delta);
	});

	// Build indices: apex → first ring, then ring-to-ring strips
	const coneIndices: number[] = [];
	// Apex (vertex 0) to first ring
	for (let s = 0; s < CONE_SEGMENTS; s++) {
		coneIndices.push(0, 1 + s, 1 + s + 1);
	}
	// Ring-to-ring strips
	for (let r = 0; r < CONE_V_RINGS - 1; r++) {
		const row = 1 + r * (CONE_SEGMENTS + 1);
		const nextRow = 1 + (r + 1) * (CONE_SEGMENTS + 1);
		for (let s = 0; s < CONE_SEGMENTS; s++) {
			coneIndices.push(row + s, row + s + 1, nextRow + s);
			coneIndices.push(nextRow + s, row + s + 1, nextRow + s + 1);
		}
	}
</script>

<T.Group position={[8.127, 1, 1.407]}>
	<RigidBody
		type="dynamic"
		lockRotations
		canSleep={false}
		ccd
		linearDamping={0.5}
		oncreate={(rb) => {
			catBody = rb;
		}}
	>
		<Collider
			shape="cuboid"
			args={[0.22, 0.3, 0.6]}
			oncreate={(c) => c.setCollisionGroups(0xfffe0002)}
		/>

		<!-- Debug: collider visualization (remove when done) -->
		<!-- <T.Mesh>
			<T.BoxGeometry args={[0.44, 0.6, 1.2]} />
			<T.MeshBasicMaterial color={0xff0000} wireframe transparent opacity={0.5} />
		</T.Mesh> -->

		{#if $gltf}
			<T.Group scale={0.02} position={[0, -0.3, 0.35]} rotation={[0, Math.PI, 0]}>
				<T is={$gltf.scene} />
			</T.Group>
		{/if}

		<!-- Positional meow audio sources -->
		{#each MEOW_URLS as src, i}
			<PositionalAudio
				{src}
				refDistance={10}
				maxDistance={30}
				rolloffFactor={1.5}
				oncreate={(a) => {
					meowAudios[i] = a;
				}}
			/>
		{/each}
	</RigidBody>
</T.Group>

<T.Group
	oncreate={(ref) => {
		coneGroupRef = ref;
	}}
>
	<T.Mesh>
		<T.BufferGeometry
			oncreate={(ref) => {
				coneGeoRef = ref as THREE.BufferGeometry<THREE.NormalBufferAttributes>;
				ref.setAttribute('position', new THREE.BufferAttribute(_conePositions, 3));
				ref.setAttribute('aDist', new THREE.BufferAttribute(_coneDistances, 1));
				ref.setIndex(coneIndices);
			}}
		/>
		<T.ShaderMaterial
			transparent
			depthWrite={false}
			blendSrc={THREE.SrcAlphaFactor}
			blendDst={THREE.OneMinusSrcAlphaFactor}
			side={THREE.DoubleSide}
			oncreate={(ref) => {
				coneMatRef = ref;
			}}
			uniforms={{
				uColor: { value: new THREE.Color(0.55, 0.95, 0.65) },
				uTime: { value: 0 }
			}}
			vertexShader={`
				attribute float aDist;
				varying float vDist;
				void main() {
					vDist = aDist;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}
			`}
			fragmentShader={`
				uniform vec3 uColor;
				uniform float uTime;
				varying float vDist;

				void main() {
					// Distance from cat: 0 = origin, 1 = tip
					float d = clamp(vDist, 0.0, 1.0);

					// Core fade — brightest in the middle zone, fades at origin and tip
					float coreFade = smoothstep(0.0, 0.15, d) * smoothstep(1.0, 0.55, d);

					// Base alpha — subtle overall
					float alpha = coreFade * 0.12;

					// Soft tip falloff
					alpha *= smoothstep(1.0, 0.6, d);

					// Gentle pulse
					float pulse = 0.9 + 0.1 * sin(uTime * 1.8 + d * 2.0);
					alpha *= pulse;

					// Desaturate toward white at the far edges for a softer look
					vec3 col = mix(vec3(1.0), uColor, 0.6 + 0.4 * coreFade);

					gl_FragColor = vec4(col, alpha);
				}
			`}
		/>
	</T.Mesh>
</T.Group>
