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
	const CAT_WALK_SPEED    = 1.8;
	const CAT_SEARCH_SPEED  = 2.4;
	const CAT_CHASE_SPEED   = 3.8;
	const CAT_JUMP_VEL      = 4.5;
	const GROUND_RAY_LEN    = 0.28;

	const CAT_SIGHT_RANGE      = 9;
	const CAT_SIGHT_HALF_ANGLE = Math.PI / 4; // 90° total FOV
	const CAT_HEAR_BASE        = 2;
	const CAT_HEAR_MAX         = 10;
	const CONE_SEGMENTS        = 24;
	const CONE_EYE_HEIGHT      = 0.3;

	const ARRIVE_DIST        = 1.0;
	const CATCH_DIST         = 0.78;
	const CATCH_COOLDOWN     = 0.9;
	const KNOCKBACK_SPEED    = 5.5;
	const KNOCKBACK_UP       = 2.7;
	const INVESTIGATE_DUR    = 3.5;
	const SEARCH_TIMEOUT     = 10;
	const SIGHT_LOSS_TIMEOUT = 1.5;

	const PATROL_WAYPOINTS = [
		new THREE.Vector3(1.29,   0,  2.14),
		new THREE.Vector3(8.127,  0,  1.407),
		new THREE.Vector3(6.352,  0, -7.188),
		new THREE.Vector3(3.0,    0, -4.0),
	];

	// ── Per-frame local state ─────────────────────────────────────────────────
	let facingAngle  = 0;
	let curVelX      = 0;
	let curVelZ      = 0;
	let patrolIndex  = 0;
	let patrolDir    = 1;
	let stuckTimer   = 0;
	let noSightTimer = 0;
	let searchTimer  = 0;
	let meowCooldown = 3;
	let catchCooldown = 0;
	let prevMode     = catAIState.mode;

	function resetLocalState() {
		facingAngle  = 0;
		curVelX      = 0;
		curVelZ      = 0;
		patrolIndex  = 0;
		patrolDir    = 1;
		stuckTimer   = 0;
		noSightTimer = 0;
		searchTimer  = 0;
		meowCooldown = 3;
		catchCooldown = 0;
		prevMode     = 'patrol';
		catAIState.mode          = 'patrol';
		catAIState.alertLevel    = 0;
		catAIState.lastKnownPos  = null;
		catAIState.investigateTimer = 0;
	}

	onMount(resetLocalState);
	onDestroy(() => { catBody = null; anim = null; });

	// ── Reusable vectors (avoid per-frame alloc) ───────────────────────────────
	const _catPos      = new THREE.Vector3();
	const _mousePos    = new THREE.Vector3();
	const _toMouse     = new THREE.Vector3();
	const _fwdFlat     = new THREE.Vector3();
	const _toMouseFlat = new THREE.Vector3();
	const _hitDir      = new THREE.Vector3();
	const _rayDir      = new THREE.Vector3();
	const _conePositions = new Float32Array((CONE_SEGMENTS + 2) * 3);

	// ── Vision cone refs (updated imperatively in the task) ──────────────────
	let coneGroupRef: THREE.Group | null = null;
	let coneMatRef:   THREE.MeshBasicMaterial | null = null;
	let coneGeoRef:   THREE.BufferGeometry<THREE.NormalBufferAttributes> | null = null;

	// ── Perception ────────────────────────────────────────────────────────────
	const isGrounded = (): boolean => {
		const t = catBody.translation();
		const ray = new rapier.Ray({ x: t.x, y: t.y, z: t.z }, { x: 0, y: -1, z: 0 });
		return !!world.castRay(ray, GROUND_RAY_LEN, true, undefined, undefined, undefined, catBody);
	};

	// Returns true if there is no wall between cat eye and mouse.
	// Excludes the cat's own body; a hit at distance >= dist - 0.3 means the
	// mouse's own collider was the only thing struck (LOS is clear).
	const firstRayHitDist = (
		origin: { x: number; y: number; z: number },
		dir: { x: number; y: number; z: number },
		maxDist: number
	): number => {
		const ray = new rapier.Ray(origin, dir);
		const hit = world.castRay(ray, maxDist, true, undefined, undefined, undefined, catBody);
		return hit ? hit.timeOfImpact : maxDist;
	};

	const hasLOS = (dist: number): boolean => {
		const dir = _toMouse.normalize();
		const t   = catBody.translation();
		const wallDist = firstRayHitDist({ x: t.x, y: t.y + CONE_EYE_HEIGHT, z: t.z }, dir, dist);
		return wallDist >= dist - 0.12;
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
				catAIState.mode === 'chase'       ? 0xff3333 :
				catAIState.mode === 'search'      ? 0xffaa00 :
				catAIState.mode === 'investigate' ? 0xffff00 : 0x44ff44
			);
		}
	};

	const canHear = (): boolean => {
		const hearDist = CAT_HEAR_BASE + (gameState.sound / 100) * (CAT_HEAR_MAX - CAT_HEAR_BASE);
		return _catPos.distanceTo(_mousePos) < hearDist;
	};

	const shortestDiff = (from: number, to: number): number => {
		let d = to - from;
		while (d >  Math.PI) d -= Math.PI * 2;
		while (d < -Math.PI) d += Math.PI * 2;
		return d;
	};

	// ── Main task ─────────────────────────────────────────────────────────────
	useTask((delta) => {
		if (!catBody) return;
		if (gameState.status === 'idle' || gameState.status === 'game_over') return;

		const t = catBody.translation();
		_catPos.set(t.x, t.y, t.z);
		_mousePos.set(mouseSharedPos.x, mouseSharedPos.y, mouseSharedPos.z);

		const vel      = catBody.linvel();
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
		let targetX   = t.x;
		let targetZ   = t.z;
		let speed     = 0;
		let shouldMove = false;

		switch (catAIState.mode) {
			case 'patrol': {
				const wp = PATROL_WAYPOINTS[patrolIndex];
				const dx = wp.x - t.x;
				const dz = wp.z - t.z;
				if (Math.sqrt(dx * dx + dz * dz) < ARRIVE_DIST) {
					patrolIndex += patrolDir;
					if (patrolIndex >= PATROL_WAYPOINTS.length) { patrolIndex = PATROL_WAYPOINTS.length - 2; patrolDir = -1; }
					if (patrolIndex < 0) { patrolIndex = 1; patrolDir = 1; }
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
				// Slow spin in place — looks around for the mouse
				facingAngle += delta * 1.2;
				break;
			}
		}

		// ── Apply velocity ────────────────────────────────────────────────────
		let desiredVX = 0;
		let desiredVZ = 0;

		if (shouldMove) {
			const dx   = targetX - t.x;
			const dz   = targetZ - t.z;
			const dist = Math.sqrt(dx * dx + dz * dz);
			if (dist > 0.08) {
				const inv = 1 / dist;
				desiredVX = dx * inv * speed;
				desiredVZ = dz * inv * speed;
				const targetFacing = Math.atan2(-desiredVX, -desiredVZ);
				facingAngle += shortestDiff(facingAngle, targetFacing) * Math.min(1, delta * 6);
			}
		}

		const k = Math.min(1, delta * (grounded ? 14 : 4));
		curVelX += (desiredVX - curVelX) * k;
		curVelZ += (desiredVZ - curVelZ) * k;

		// ── Stuck → jump ──────────────────────────────────────────────────────
		const speedSq = vel.x * vel.x + vel.z * vel.z;
		stuckTimer = speedSq > 0.3 ? 0 : shouldMove ? stuckTimer + delta : 0;

		let velY = vel.y;
		if (stuckTimer > 0.45 && grounded) {
			velY = CAT_JUMP_VEL;
			stuckTimer = 0;
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
		oncreate={(rb) => { catBody = rb; }}
	>
		<Collider shape="cuboid" args={[0.22, 0.24, 0.28]} />

		{#if $gltf}
			<T.Group scale={0.02} rotation={[0, Math.PI, 0]}>
				<T is={$gltf.scene} />
			</T.Group>
		{/if}
	</RigidBody>
</T.Group>

<T.Group oncreate={(ref) => { coneGroupRef = ref; }}>
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
			oncreate={(ref) => { coneMatRef = ref; }}
		/>
	</T.Mesh>
</T.Group>
