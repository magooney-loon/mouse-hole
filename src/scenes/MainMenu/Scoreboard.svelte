<script lang="ts">
	import { leaderboardState, wavedashActions } from '$extensions/wavedash/wavedash.svelte';
	import { soundActions } from '$core/GlobalAudio.svelte';

	interface Props {
		onBack: () => void;
	}
	let { onBack }: Props = $props();

	$effect(() => {
		wavedashActions.refreshScores();
	});

	const btnBase = `w-full font-black rounded-xl cursor-pointer border-4 border-black
	                 transition-all duration-100
	                 hover:translate-x-[2px] hover:translate-y-[2px]
	                 active:translate-x-[4px] active:translate-y-[4px]`;

	function formatAvgTime(ms: number): string {
		return `${(ms / 1000).toFixed(1)}s / item`;
	}

	const top5 = $derived(leaderboardState.speedrunTop.slice(0, 5));
	const myEntryOutside = $derived(
		leaderboardState.speedrunMyEntry &&
			!top5.some((e) => e.globalRank === leaderboardState.speedrunMyEntry?.globalRank)
			? leaderboardState.speedrunMyEntry
			: null
	);
</script>

<div class="pointer-events-auto absolute inset-0 flex items-center justify-center">
	<div
		class="relative flex flex-col gap-5 w-full max-w-xl mx-4 px-6 py-6
		       bg-black/50 border-4 border-black rounded-2xl backdrop-blur-md"
		style="box-shadow: 7px 7px 0 #000;"
	>
		<!-- Header -->
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<span class="text-3xl select-none" aria-hidden="true">🏆</span>
				<h2
					class="text-3xl font-black text-amber-300 uppercase leading-none m-0"
					style="text-shadow: 2px 2px 0 #000;"
				>
					Scoreboard
				</h2>
			</div>
			<span class="text-white/40 text-xs font-black uppercase tracking-widest">Best Avg Time</span>
		</div>

		<!-- Rows -->
		<div class="flex flex-col gap-2 min-h-64">
			{#if leaderboardState.loading}
				<div class="flex-1 flex items-center justify-center text-white/40 font-black text-sm py-10">
					Loading...
				</div>
			{:else if top5.length === 0}
				<div
					class="flex-1 flex flex-col items-center justify-center gap-2 text-white/30 font-black py-10"
				>
					<span class="text-4xl select-none">🐭</span>
					<span class="text-sm">No scores yet. Be the first!</span>
				</div>
			{:else}
				{#each top5 as entry, i}
					{@const isMe = leaderboardState.speedrunMyEntry?.globalRank === entry.globalRank}
					<div
						class="flex items-center gap-4 px-4 py-3 rounded-xl border
						       {isMe ? 'bg-amber-400/15 border-amber-400/50' : 'bg-white/5 border-white/5'}"
					>
						<span
							class="w-8 shrink-0 text-center font-black text-base tabular-nums
							       {i === 0
								? 'text-amber-300'
								: i === 1
									? 'text-white/60'
									: i === 2
										? 'text-amber-600'
										: 'text-white/25'}"
						>
							#{entry.globalRank}
						</span>
						<span
							class="flex-1 font-black text-base truncate {isMe ? 'text-amber-300' : 'text-white/80'}"
						>
							{entry.username}{isMe ? ' (you)' : ''}
						</span>
						<span
							class="font-black text-base tabular-nums shrink-0 {isMe
								? 'text-amber-300'
								: 'text-white/50'}"
						>
							{formatAvgTime(entry.score)}
						</span>
					</div>
				{/each}

				{#if myEntryOutside}
					<div class="mt-1 border-t-2 border-white/10 pt-2">
						<div
							class="flex items-center gap-4 px-4 py-3 rounded-xl bg-amber-400/15 border border-amber-400/50"
						>
							<span class="w-8 shrink-0 text-center font-black text-base text-amber-300 tabular-nums">
								#{myEntryOutside.globalRank}
							</span>
							<span class="flex-1 font-black text-base text-amber-300 truncate">
								{myEntryOutside.username} (you)
							</span>
							<span class="font-black text-base text-amber-300 tabular-nums shrink-0">
								{formatAvgTime(myEntryOutside.score)}
							</span>
						</div>
					</div>
				{/if}
			{/if}
		</div>

		<!-- Back button -->
		<button
			onclick={() => {
				soundActions.playClick();
				onBack();
			}}
			class="{btnBase} py-3 text-base bg-white/10 text-white"
			style="box-shadow: 4px 4px 0 #000;"
			onmousedown={(e) => (e.currentTarget.style.boxShadow = '1px 1px 0 #000')}
			onmouseup={(e) => (e.currentTarget.style.boxShadow = '4px 4px 0 #000')}
			onmouseleave={(e) => (e.currentTarget.style.boxShadow = '4px 4px 0 #000')}
		>
			← Back
		</button>
	</div>
</div>
