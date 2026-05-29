<script lang="ts">
	let { onPlay, username }: { onPlay: () => void; username?: string } = $props();
</script>

<div class="overlay">
	<div class="menu">
		<div class="title-block">
			<h1 class="title">Mouse Hole</h1>
			<p class="tagline">Your hole is the safest place in the world.</p>
		</div>

		<button class="play-btn" onclick={onPlay}> Play </button>

		{#if username}
			<p class="welcome">Good luck out there, {username}.</p>
		{/if}
	</div>
</div>

<style>
	.overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: radial-gradient(ellipse at center, rgba(10, 6, 4, 0.55) 0%, rgba(10, 6, 4, 0.82) 100%);
		z-index: 10;
	}

	.menu {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
		text-align: center;
		user-select: none;
	}

	.title-block {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.title {
		margin: 0;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: clamp(3.5rem, 10vw, 7rem);
		font-weight: 700;
		color: #f5e6c8;
		letter-spacing: 0.04em;
		text-shadow:
			0 2px 8px rgba(0, 0, 0, 0.8),
			0 0 40px rgba(180, 120, 40, 0.4);
	}

	.tagline {
		margin: 0;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: clamp(0.9rem, 2vw, 1.15rem);
		color: #c8a87a;
		font-style: italic;
		letter-spacing: 0.02em;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
	}

	.play-btn {
		padding: 0.85rem 3.5rem;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 1.25rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #1a0f05;
		background: #d4924a;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		box-shadow:
			0 4px 20px rgba(0, 0, 0, 0.5),
			inset 0 1px 0 rgba(255, 255, 255, 0.2);
		transition:
			background 0.15s ease,
			transform 0.1s ease,
			box-shadow 0.15s ease;
	}

	.play-btn:hover {
		background: #e8a85c;
		transform: translateY(-2px);
		box-shadow:
			0 6px 28px rgba(0, 0, 0, 0.55),
			inset 0 1px 0 rgba(255, 255, 255, 0.25);
	}

	.play-btn:active {
		transform: translateY(0);
		background: #c07d38;
	}

	.welcome {
		margin: 0;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 0.85rem;
		color: #9a7a55;
		font-style: italic;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
	}
</style>
