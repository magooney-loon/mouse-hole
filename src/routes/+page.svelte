<script lang="ts">
	import { onMount } from 'svelte';
	import CanvasPortal from '$lib/components/CanvasPortal.svelte';
	import Scene from '$lib/components/scene/Scene.svelte';
	import MainMenu from '$lib/components/ui/MainMenu.svelte';
	import { game } from '$lib/stores/game.svelte';
	import { setMusicState } from '$lib/audio/music.svelte';

	let username = $state<string | undefined>(undefined);

	onMount(async () => {
		const { default: Wavedash } = await import('@wvdsh/sdk-js');
		username = Wavedash.getUsername() ?? undefined;
	});

	function startGame() {
		setMusicState('main');
		game.state = 'playing';
	}
</script>

<CanvasPortal>
	<Scene />
</CanvasPortal>

{#if game.state === 'menu'}
	<MainMenu onPlay={startGame} {username} />
{/if}
