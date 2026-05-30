<script lang="ts">
	import { T, useThrelte, useTask } from '@threlte/core';
	import { useRapier } from '@threlte/rapier';
	import { get } from 'svelte/store';
	import * as THREE from 'three';
	import Cat from '$lib/Cat.svelte';

	const { camera } = useThrelte();
	const { world, rapier } = useRapier();

	// Camera sits ~0.3 above mouse ground pos. Each waypoint looks toward the next.
	const PATH = [
		{ p: new THREE.Vector3(1.29, 2.0, 2.14), l: new THREE.Vector3(8.127, 0.5, 1.407) },
		{ p: new THREE.Vector3(8.127, 2.0, 1.407), l: new THREE.Vector3(6.352, 1.18, -7.188) },
		{ p: new THREE.Vector3(6.352, 2.5, -7.188), l: new THREE.Vector3(2.0, 1.1, -4.0) }
	];

	const SEG_DURATION = 8; // seconds per segment
	let segIndex = 0;
	let segT = 0;
	let direction = 1; // 1 = forward, -1 = reverse
	let initialized = false;

	const _desiredPos = new THREE.Vector3();
	const _lookAt = new THREE.Vector3();
	const _dir = new THREE.Vector3();
	const _safePos = new THREE.Vector3();

	const smoothStep = (t: number) => t * t * (3 - 2 * t);

	// Shared mutable pos — Cat writes to it each frame, camera reads it for lookAt.
	const catPos = { x: 0, y: 0, z: 0 };
	const _trackedLookAt = new THREE.Vector3();

	useTask((delta) => {
		const cam = get(camera);
		if (!cam) return;

		segT += delta / SEG_DURATION;
		if (segT >= 1) {
			segT -= 1;
			segIndex += direction;
			if (segIndex >= PATH.length - 1) { segIndex = PATH.length - 1; direction = -1; }
			else if (segIndex <= 0)          { segIndex = 0;               direction =  1; }
		}

		const from = PATH[segIndex];
		const to = PATH[segIndex + direction];
		const s = smoothStep(segT);

		_desiredPos.lerpVectors(from.p, to.p, s);

		// Smoothly track the cat — lerp current lookAt toward cat position.
		_trackedLookAt.lerp(
			new THREE.Vector3(catPos.x, catPos.y + 0.3, catPos.z),
			Math.min(1, delta * 2)
		);

		// Cast ray from cat toward desired cam pos — pull back if it hits geometry.
		_dir.subVectors(_desiredPos, _trackedLookAt);
		const fullDist = _dir.length();
		if (fullDist > 0.001) {
			_dir.divideScalar(fullDist);
			const ray = new rapier.Ray(
				{ x: _trackedLookAt.x, y: _trackedLookAt.y, z: _trackedLookAt.z },
				{ x: _dir.x, y: _dir.y, z: _dir.z }
			);
			const hit = world.castRay(ray, fullDist, true);
			if (hit && hit.timeOfImpact < fullDist) {
				_safePos.copy(_trackedLookAt).addScaledVector(_dir, Math.max(0, hit.timeOfImpact - 0.05));
			} else {
				_safePos.copy(_desiredPos);
			}
		} else {
			_safePos.copy(_desiredPos);
		}

		if (!initialized) {
			cam.position.copy(_safePos);
			initialized = true;
		} else {
			cam.position.lerp(_safePos, Math.min(1, delta * 1.5));
		}
		cam.lookAt(_trackedLookAt);
	});
</script>

<T.Group name="MainMenu" />
<Cat pos={catPos} />
