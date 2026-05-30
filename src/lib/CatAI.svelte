<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { T, useTask } from '@threlte/core';
	import { RigidBody, Collider, useRapier } from '@threlte/rapier';
	import { useGltf, useGltfAnimations } from '@threlte/extras';
	import { BASE_URL } from '$extensions/settings/settings.svelte';
	import { catAIState, mouseHitRequest, mouseSharedPos } from '$lib/catAI.svelte';
	import { gameState } from '$lib/gameState.svelte';
	import { soundActions } from '$core/globalAudio.svelte';
	import * as THREE from 'three';
	import { LoopRepeat } from 'three';

	const { world, rapier } = useRapier();

	let catBody: any = null;

	// ── Model & animation ─────────────────────────────────────────────────────
	const gltf = useGltf(`${BASE_URL}models/stages/cat.glb`);
	const { actions } = useGltfAnimations(gltf);
	let anim: any = null;

	$effect(() => {
		const act = $actions?.['GltfAnimation 0'];
		if (act && !anim) {
			act.setLoop(LoopRepeat, Infinity);
			act.play();
			anim = act;
		}
	});

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
	const CAT_JUMP_VEL = 4.5;
	const GROUND_RAY_LEN = 0.28;

	const CAT_SIGHT_RANGE = 9;
	const CAT_SIGHT_HALF_ANGLE = Math.PI / 4; // 90° total FOV
	const CAT_HEAR_BASE = 2;
	const CAT_HEAR_MAX = 10;
	const CONE_SEGMENTS = 24;
	const CONE_EYE_HEIGHT = 0.3;

	const ARRIVE_DIST = 1.0;
	const CATCH_DIST = 0.78;
	const CATCH_COOLDOWN = 0.9;
	const KNOCKBACK_SPEED = 5.5;
	const KNOCKBACK_UP = 2.7;
	const INVESTIGATE_DUR = 3.5;
	const SEARCH_TIMEOUT = 10;
	const SIGHT_LOSS_TIMEOUT = 1.5;

	// ── Avoidance constants ───────────────────────────────────────────────────
	const AVOID_PROBE_DIST = 0.8; // how far ahead to check for walls
	const AVOID_SIDE_ANGLE = Math.PI / 5; // ~36° side probe angle
	const AVOID_STEER_WEIGHT = 0.7; // how strongly avoidance deflects heading
	const AVOID_WALL_MARGIN = 0.35; // treat hits closer than this as "wall"

	const STUCK_TIME = 0.6; // seconds of no progress before stuck recovery
	const STUCK_SPEED_THRESH = 0.2; // speed² below which = stuck
	const ESCAPE_PROBE_COUNT = 8; // directions to test for escape
	const ESCAPE_PROBE_DIST = 1.5; // how far each escape probe reaches

	const PATROL_WAYPOINTS = [
		new THREE.Vector3(1.29, 0, 2.14),
		new THREE.Vector3(8.127, 0, 1.407),
		new THREE.Vector3(6.352, 0, -7.188),
		new THREE.Vector3(3.0, 0, -4.0)
	];

	// ── Per-frame local state ─────────────────────────────────────────────────
	let facingAngle = 0;
	let curVelX = 0;
	let curVelZ = 0;
	let patrolIndex = 0;
	let patrolDir = 1;
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

	function resetLocalState() {
		facingAngle = 0;
		curVelX = 0;
		curVelZ = 0;
		patrolIndex = 0;
		patrolDir = 1;
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
		catAIState.mode = 'patrol';
		catAIState.alertLevel = 0;
		catAIState.lastKnownPos = null;
		catAIState.investigateTimer = 0;
	}

	onMount(resetLocalState);
	onDestroy(() => {
		catBody = null;
		anim = null;
	});

	// ── Reusable vectors (avoid per-frame alloc) ───────────────────────────────
	const _catPos = new THREE.Vector3();
	const _mousePos = new THREE.Vector3();
	const _toMouse = new THREE.Vector3();
	const _fwdFlat = new THREE.Vector3();
	const _toMouseFlat = new THREE.Vector3();
	const _hitDir = new THREE.Vector3();
	const _rayDir = new THREE.Vector3();
	const _conePositions = new Float32Array((CONE_SEGMENTS + 2) * 3);

	// ── Vision cone refs (updated imperatively in the task) ──────────────────
	let coneGroupRef: THREE.Group | null = null;
	let coneMatRef: THREE.MeshBasicMaterial | null = null;
	let coneGeoRef: THREE.BufferGeometry<THREE.NormalBufferAttributes> | null = null;

	// ── Perception ────────────────────────────────────────────────────────────
	const isGrounded = (): boolean => {
		const t = catBody.translation();
		const ray = new rapier.Ray({ x: t.x, y: t.y, z: t.z }, { x: 0, y: -1, z: 0 });
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
		const wallD = firstRayHitDist({ x: t.x, y: t.y + CONE_EYE_HEIGHT, z: t.z }, dir, dist);
		return wallD >= dist - 0.12;
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

	const updateVisionCone = (t: { x: number; y: number; z: number }) => {
		if (!coneGroupRef || !coneGeoRef) return;

		coneGroupRef.position.set(t.x, t.y + CONE_EYE_HEIGHT, t.z);
		coneGroupRef.rotation.y = facingAngle;

		_conePositions[0] = 0;
		_conePositions[1] = 0;
		_conePositions[2] = 0;

		for (let i = 0; i <= CONE_SEGMENTS; i += 1) {
			const a = -CAT_SIGHT_HALF_ANGLE + (i / CONE_SEGMENTS) * CAT_SIGHT_HALF_ANGLE * 2;
			const localX = -Math.sin(a);
			const localZ = -Math.cos(a);
			const worldAngle = facingAngle + a;
			_rayDir.set(-Math.sin(worldAngle), 0, -Math.cos(worldAngle));
			const rayDist = firstRayHitDist(
				{ x: t.x, y: t.y + CONE_EYE_HEIGHT, z: t.z },
				{ x: _rayDir.x, y: _rayDir.y, z: _rayDir.z },
				CAT_SIGHT_RANGE
			);
			const dist = Math.max(0.05, rayDist - 0.04);
			const offset = (i + 1) * 3;
			_conePositions[offset] = localX * dist;
			_conePositions[offset + 1] = 0;
			_conePositions[offset + 2] = localZ * dist;
		}

		const attr = coneGeoRef.getAttribute('position') as THREE.BufferAttribute;
		attr.needsUpdate = true;
		coneGeoRef.computeBoundingSphere();

		if (catAIState.mode !== prevMode) {
			prevMode = catAIState.mode;
			coneMatRef?.color.setHex(
				catAIState.mode === 'chase'
					? 0xff3333
					: catAIState.mode === 'search'
						? 0xffaa00
						: catAIState.mode === 'investigate'
							? 0xffff00
							: 0x44ff44
			);
		}
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
	// Casts forward, forward-left, forward-right probes and returns a steering
	// angle adjustment that pushes away from nearby walls. Returns 0 if clear.
	const computeAvoidance = (t: { x: number; y: number; z: number }): number => {
		const eyeY = t.y + CONE_EYE_HEIGHT;
		let steer = 0;

		// Forward probe
		const fwdX = -Math.sin(facingAngle);
		const fwdZ = -Math.cos(facingAngle);
		const fwdDist = wallDist(t.x, eyeY, t.z, fwdX, fwdZ, AVOID_PROBE_DIST);

		// Left probe (positive angle offset)
		const lAngle = facingAngle + AVOID_SIDE_ANGLE;
		const lX = -Math.sin(lAngle);
		const lZ = -Math.cos(lAngle);
		const leftDist = wallDist(t.x, eyeY, t.z, lX, lZ, AVOID_PROBE_DIST);

		// Right probe (negative angle offset)
		const rAngle = facingAngle - AVOID_SIDE_ANGLE;
		const rX = -Math.sin(rAngle);
		const rZ = -Math.cos(rAngle);
		const rightDist = wallDist(t.x, eyeY, t.z, rX, rZ, AVOID_PROBE_DIST);

		// Wall on left → steer right (negative angle change)
		if (leftDist < AVOID_WALL_MARGIN) {
			const urgency = 1 - leftDist / AVOID_WALL_MARGIN;
			steer -= urgency * AVOID_STEER_WEIGHT;
		}
		// Wall on right → steer left (positive angle change)
		if (rightDist < AVOID_WALL_MARGIN) {
			const urgency = 1 - rightDist / AVOID_WALL_MARGIN;
			steer += urgency * AVOID_STEER_WEIGHT;
		}
		// Wall dead ahead → pick the clearer side and steer hard
		if (fwdDist < AVOID_WALL_MARGIN) {
			const urgency = 1 - fwdDist / AVOID_WALL_MARGIN;
			// Steer toward whichever side has more room
			steer += (leftDist > rightDist ? -1 : 1) * urgency * AVOID_STEER_WEIGHT * 1.5;
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
		const sees = canSee();
		const hears = canHear();

		// ── State machine ──────────────────────────────────────────────────────
		switch (catAIState.mode) {
			case 'patrol': {
				if (sees) {
					catAIState.mode = 'chase';
					catAIState.lastKnownPos = { x: _mousePos.x, y: _mousePos.y, z: _mousePos.z };
					noSightTimer = 0;
					soundActions.playRandomMeow(0.7 + catAIState.alertLevel * 0.3);
					meowCooldown = 4 + Math.random() * 4;
				} else if (hears) {
					catAIState.mode = 'search';
					catAIState.lastKnownPos = { x: _mousePos.x, y: _mousePos.y, z: _mousePos.z };
					searchTimer = SEARCH_TIMEOUT;
					soundActions.playRandomMeow(0.3 + (gameState.sound / 100) * 0.4);
					meowCooldown = 3 + Math.random() * 3;
				}
				catAIState.alertLevel = Math.max(0, catAIState.alertLevel - 0.3 * delta);
				break;
			}
			case 'search': {
				if (sees) {
					catAIState.mode = 'chase';
					noSightTimer = 0;
					soundActions.playRandomMeow(1.0);
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
						soundActions.playRandomMeow(0.8 + Math.random() * 0.2);
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
					soundActions.playRandomMeow(1.0);
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

		// ── Movement target ───────────────────────────────────────────────────
		let targetX = t.x;
		let targetZ = t.z;
		let speed = 0;
		let shouldMove = false;

		switch (catAIState.mode) {
			case 'patrol': {
				const wp = PATROL_WAYPOINTS[patrolIndex];
				const dx = wp.x - t.x;
				const dz = wp.z - t.z;
				if (Math.sqrt(dx * dx + dz * dz) < ARRIVE_DIST) {
					patrolIndex += patrolDir;
					if (patrolIndex >= PATROL_WAYPOINTS.length) {
						patrolIndex = PATROL_WAYPOINTS.length - 2;
						patrolDir = -1;
					}
					if (patrolIndex < 0) {
						patrolIndex = 1;
						patrolDir = 1;
					}
				}
				const next = PATROL_WAYPOINTS[patrolIndex];
				targetX = next.x;
				targetZ = next.z;
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

		// ── Compute desired velocity (before avoidance) ──────────────────────
		let desiredVX = 0;
		let desiredVZ = 0;

		if (shouldMove) {
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
				// Rotate the desired velocity direction by the steer angle
				const cos = Math.cos(steer);
				const sin = Math.sin(steer);
				const newVX = desiredVX * cos - desiredVZ * sin;
				const newVZ = desiredVX * sin + desiredVZ * cos;
				desiredVX = newVX;
				desiredVZ = newVZ;
				// Also adjust facing to match new heading
				facingAngle += steer * delta * 4;
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
		const k = Math.min(1, delta * (grounded ? 14 : 4));
		curVelX += (desiredVX - curVelX) * k;
		curVelZ += (desiredVZ - curVelZ) * k;

		let velY = vel.y;

		// Jump only if still stuck after escape maneuvers (last resort)
		// or if the escape direction requires jumping over something
		if (stuckTimer > STUCK_TIME && grounded && !escaping) {
			velY = CAT_JUMP_VEL;
			stuckTimer = 0;
		}
		// Also jump during escape if forward probe shows a wall we can vault
		if (escaping && grounded) {
			const fwdX = -Math.sin(facingAngle);
			const fwdZ = -Math.cos(facingAngle);
			const eyeY = t.y + CONE_EYE_HEIGHT;
			const fwdWall = wallDist(t.x, eyeY, t.z, fwdX, fwdZ, 0.6);
			if (fwdWall < 0.4) {
				// Check if there's ground ahead on the other side of the wall
				const landX = t.x + fwdX * 1.2;
				const landZ = t.z + fwdZ * 1.2;
				const downRay = new rapier.Ray({ x: landX, y: t.y + 1.5, z: landZ }, { x: 0, y: -1, z: 0 });
				const groundHit = world.castRay(downRay, 3, true, undefined, undefined, undefined, catBody);
				if (groundHit && groundHit.timeOfImpact < 2.5) {
					velY = CAT_JUMP_VEL;
				}
			}
		}

		catBody.setLinvel({ x: curVelX, y: velY, z: curVelZ }, true);
		catBody.setAngvel({ x: 0, y: 0, z: 0 }, true);

		const half = facingAngle / 2;
		catBody.setRotation({ x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) }, true);

		// ── Animation speed ───────────────────────────────────────────────────
		if (anim) anim.timeScale = catAIState.mode === 'chase' ? 1.5 : 1.0;

		updateVisionCone(t);
	});

	const coneIndices = Array.from({ length: CONE_SEGMENTS }, (_, i) => [0, i + 1, i + 2]).flat();
</script>

<T.Group position={[8.127, 1, 1.407]}>
	<RigidBody
		type="dynamic"
		lockRotations
		canSleep={false}
		oncreate={(rb) => {
			catBody = rb;
		}}
	>
		<Collider shape="cuboid" args={[0.22, 0.24, 0.28]} />

		{#if $gltf}
			<T.Group scale={0.02} rotation={[0, Math.PI, 0]}>
				<T is={$gltf.scene} />
			</T.Group>
		{/if}
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
				ref.setIndex(coneIndices);
			}}
		/>
		<T.MeshBasicMaterial
			color={0x44ff44}
			transparent
			opacity={0.18}
			depthWrite={false}
			side={THREE.DoubleSide}
			oncreate={(ref) => {
				coneMatRef = ref;
			}}
		/>
	</T.Mesh>
</T.Group>
