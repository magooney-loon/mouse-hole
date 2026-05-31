<script lang="ts">
	import { T } from '@threlte/core';
	import { Collider } from '@threlte/rapier';
	import Mouse from '$lib/Mouse.svelte';
	import CatAI from '$lib/CatAI.svelte';
	// import { Debug } from '@threlte/rapier';
	import Cheese from '$lib/Cheese.svelte';
	import Decoration from '$lib/Decoration.svelte';
	import SpawnPoint from '$lib/SpawnPoint.svelte';
	import { gameState } from '$lib/gameState.svelte';

	const SPAWN_POSITION: [number, number, number] = [1.936, 0.05, -1.894];

	const POOL: [number, number, number][] = [
		[3.016, 0.656, 7.221],
		[11.735, 1.082, 7.309],
		[8.762, 1.189, -7.466],
		[3.032, 1.486, -9.029],
		[-1.996, 0.181, -6.645],
		[8.33, 0.771, -9.564],
		[-1.916, 1.688, -9.928],
		[-2.018, 0.18, -3.816],
		[-9.851, 0.1, -9.783],
		[-9.747, 0.246, -2.796],
		[-9.96, 1.344, -3.472],
		[-4.052, 1.242, -9.889],
		[-8.926, 3.025, -6.737],
		[-9.664, 1.253, -8.18],
		[-4.1, 0.1, -7.867],
		[-6.69, 0.1, -0.876],
		[-10.408, 1.46, -0.682],
		[-10.077, 0.338, 2.042],
		[-7.909, 1.115, 2.116],
		[-10.167, 0.896, 4.41],
		[-10.16, 0.126, 4.595],
		[-1.809, 0.246, 6.71],
		[-1.881, 1.344, 7.625],
		[-10.311, 0.126, 9.854],
		[0.036, 0.126, 8.621],
		[2.098, 1.059, 4.53],
		[2.119, 1.169, -4.832]
	];

	function shuffle(arr: [number, number, number][]): [number, number, number][] {
		const a = [...arr];
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	let cheesePos: [number, number, number][] = $state([]);
	let decoPos: [number, number, number][] = $state([]);

	function repick() {
		const s = shuffle(POOL);
		cheesePos = s.slice(0, 9);
		decoPos = s.slice(9, 14);
	}

	repick();

	$effect(() => {
		if (gameState.status === 'starting') repick();
	});
</script>

<!-- Static floor placeholder -->
<T.Group>
	<Collider shape="cuboid" args={[50, 0.01, 50]} />
	<T.Mesh receiveShadow>
		<T.BoxGeometry args={[100, 0.2, 100]} />
		<T.MeshStandardMaterial color="#8B6914" transparent opacity={0.01} />
	</T.Mesh>
</T.Group>
<!-- <Debug /> -->
<Mouse />
<CatAI />
<SpawnPoint position={SPAWN_POSITION} />

{#each cheesePos as pos}
	<Cheese position={pos} />
{/each}

{#each decoPos as pos, i}
	<Decoration position={pos} spawnPosition={SPAWN_POSITION} index={i} />
{/each}
