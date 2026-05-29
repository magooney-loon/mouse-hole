<script lang="ts">
	import { sound, toggleSound } from '$lib/audio/music.svelte';

	let { onPlay, username }: { onPlay: () => void; username?: string } = $props();

	let showTutorial = $state(false);
</script>

<div class="overlay">
	{#if !showTutorial}
		<div class="menu">
			<div class="title-block">
				<h1 class="title">Mouse<br />Hole</h1>
				<p class="tagline">Your hole is the safest place in the world.</p>
			</div>

			<button class="play-btn" onclick={onPlay}>Play</button>

			<div class="secondary-btns">
				<button class="ghost-btn" onclick={() => (showTutorial = true)}>How to Play</button>
				<button class="ghost-btn" onclick={toggleSound}>
					{sound.enabled ? '♪ Sound On' : '♪ Sound Off'}
				</button>
			</div>

			{#if username}
				<p class="welcome">Good luck out there, {username}.</p>
			{/if}
		</div>
	{:else}
		<div class="tutorial">
			<h2 class="tut-title">How to Play</h2>

			<p class="tut-intro">
				You are a mouse. The house is full of food and trinkets — but the cat is always watching.
				Forage, survive, and bring home every last piece to make your hole feel like
				<em>yours</em>.
			</p>

			<section class="tut-section">
				<h3>The Loop</h3>
				<ul>
					<li>Leave your hole and explore the house.</li>
					<li>Pick up <strong>food</strong> to keep your hunger up, or you starve.</li>
					<li>Pick up <strong>furniture &amp; trinkets</strong> — these are your real score.</li>
					<li>Carry items back to your hole to bank them. They're yours forever.</li>
					<li>The cat gets smarter every run. Don't get caught.</li>
				</ul>
			</section>

			<section class="tut-section">
				<h3>Controls</h3>
				<div class="controls">
					<div class="control-row">
						<div class="keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div>
						<span>Move</span>
					</div>
					<div class="control-row">
						<div class="keys"><kbd>Shift</kbd><span class="plus">+</span><kbd>W A S D</kbd></div>
						<span>Sprint — drains hunger faster</span>
					</div>
					<div class="control-row">
						<div class="keys"><kbd>Space</kbd></div>
						<span>Jump</span>
					</div>
				</div>
			</section>

			<section class="tut-section">
				<h3>Hunger</h3>
				<ul>
					<li>Hunger drains constantly while outside the hole.</li>
					<li>Sprinting drains it faster — use it to escape, not to explore.</li>
					<li>
						Eat food <strong>on the spot</strong> for a quick restore, but you freeze for ~2 seconds.
						A sitting duck.
					</li>
					<li>Bring food home to eat safely and restore more.</li>
					<li>Hunger pauses inside your hole. Breathe.</li>
				</ul>
			</section>

			<button class="ghost-btn back-btn" onclick={() => (showTutorial = false)}>Back</button>
		</div>
	{/if}
</div>

<style>
	/* ── Base ──────────────────────────────────────── */

	.overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(6, 3, 1, 0.72);
		z-index: 10;
	}

	/* ── Main menu ─────────────────────────────────── */

	.menu {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2.2rem;
		text-align: center;
		user-select: none;
		background: #f2e0b6;
		border: 4px solid #0e0805;
		box-shadow: 10px 10px 0 #0e0805;
		padding: 3rem 4rem 2.5rem;
		transform: rotate(-0.4deg);
	}

	.title-block {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
	}

	.title {
		margin: 0;
		font-family: 'Arial Black', 'Impact', Arial, sans-serif;
		font-size: clamp(3.2rem, 9vw, 6rem);
		font-weight: 900;
		color: #0e0805;
		text-transform: uppercase;
		letter-spacing: -0.02em;
		line-height: 0.88;
		/* orange offset gives a cartoonish stacked-layer look */
		text-shadow:
			5px 5px 0 #c97a28,
			6px 6px 0 #0e0805;
	}

	.tagline {
		margin: 0;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 0.85rem;
		color: #5c3d1a;
		font-style: italic;
		letter-spacing: 0.01em;
	}

	.play-btn {
		padding: 0.8rem 3.2rem;
		font-family: 'Arial Black', Arial, sans-serif;
		font-size: 1.1rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #f2e0b6;
		background: #c97a28;
		border: 3px solid #0e0805;
		border-radius: 0;
		box-shadow: 5px 5px 0 #0e0805;
		cursor: pointer;
		transition:
			transform 0.06s ease,
			box-shadow 0.06s ease;
	}

	.play-btn:hover {
		transform: translate(2px, 2px);
		box-shadow: 3px 3px 0 #0e0805;
	}

	.play-btn:active {
		transform: translate(5px, 5px);
		box-shadow: 0 0 0 #0e0805;
	}

	.secondary-btns {
		display: flex;
		gap: 0.8rem;
	}

	.ghost-btn {
		padding: 0.4rem 1.1rem;
		font-family: 'Arial Black', Arial, sans-serif;
		font-size: 0.72rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #0e0805;
		background: transparent;
		border: 2px solid #0e0805;
		border-radius: 0;
		box-shadow: 3px 3px 0 #0e0805;
		cursor: pointer;
		transition:
			transform 0.06s ease,
			box-shadow 0.06s ease,
			background 0.06s ease;
	}

	.ghost-btn:hover {
		transform: translate(1px, 1px);
		box-shadow: 2px 2px 0 #0e0805;
		background: rgba(14, 8, 5, 0.07);
	}

	.ghost-btn:active {
		transform: translate(3px, 3px);
		box-shadow: 0 0 0 #0e0805;
	}

	.welcome {
		margin: 0;
		font-family: Georgia, serif;
		font-size: 0.78rem;
		color: #7a5430;
		font-style: italic;
	}

	/* ── Tutorial ──────────────────────────────────── */

	.tutorial {
		display: flex;
		flex-direction: column;
		gap: 1.4rem;
		max-width: 540px;
		width: 90vw;
		max-height: 88vh;
		overflow-y: auto;
		padding: 2.5rem 2.2rem;
		background: #f2e0b6;
		border: 4px solid #0e0805;
		box-shadow: 10px 10px 0 #0e0805;
		color: #0e0805;
		font-family: Georgia, 'Times New Roman', serif;
		transform: rotate(0.3deg);
		scrollbar-width: thin;
		scrollbar-color: #0e0805 transparent;
	}

	.tut-title {
		margin: 0;
		font-family: 'Arial Black', Arial, sans-serif;
		font-size: 1.5rem;
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		text-align: center;
		/* underline via border instead of text-decoration for brutalist control */
		border-bottom: 4px solid #0e0805;
		padding-bottom: 0.7rem;
	}

	.tut-intro {
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.7;
		color: #4a3010;
		font-style: italic;
		text-align: center;
	}

	.tut-section {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.tut-section h3 {
		margin: 0;
		font-family: 'Arial Black', Arial, sans-serif;
		font-size: 0.65rem;
		font-weight: 900;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: #0e0805;
		border-bottom: 2px solid #0e0805;
		padding-bottom: 0.35rem;
	}

	.tut-section ul {
		margin: 0;
		padding-left: 1.2rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.tut-section li {
		font-size: 0.88rem;
		line-height: 1.6;
	}

	.tut-section strong {
		font-family: 'Arial Black', Arial, sans-serif;
		font-size: 0.82rem;
		letter-spacing: 0.03em;
	}

	/* Controls */

	.controls {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}

	.control-row {
		display: grid;
		grid-template-columns: 1fr 1.6fr;
		align-items: center;
		gap: 1rem;
		font-size: 0.88rem;
	}

	.keys {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-wrap: wrap;
	}

	kbd {
		display: inline-block;
		padding: 0.15rem 0.5rem;
		font-family: 'Arial Black', Arial, sans-serif;
		font-size: 0.72rem;
		font-weight: 900;
		color: #0e0805;
		background: #f2e0b6;
		border: 2px solid #0e0805;
		border-bottom-width: 4px;
		border-radius: 0;
		white-space: nowrap;
	}

	.plus {
		color: #7a5430;
		font-size: 0.75rem;
		font-family: 'Arial Black', Arial, sans-serif;
		font-weight: 900;
	}

	.back-btn {
		align-self: center;
		margin-top: 0.4rem;
	}
</style>
