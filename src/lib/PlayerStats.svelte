<script lang="ts">
	interface Props {
		hunger?: number;
		stamina?: number;
		sound?: number;
	}
	let { hunger = 80, stamina = 100, sound = 0 }: Props = $props();

	const barColor = (value: number, type: 'hunger' | 'stamina' | 'sound') => {
		if (type === 'sound') {
			if (value > 66) return '#ef4444';
			if (value > 33) return '#f97316';
			return '#22c55e';
		}
		if (value > 50) return '#fbbf24';
		if (value > 25) return '#f97316';
		return '#ef4444';
	};

	const stats = $derived([
		{ label: '🍖', value: hunger, type: 'hunger' as const },
		{ label: '⚡', value: stamina, type: 'stamina' as const },
		{ label: '🔊', value: sound, type: 'sound' as const }
	]);
</script>

<div class="flex flex-col gap-1">
	{#each stats as stat}
		<div class="flex items-center gap-1.5">
			<span class="text-xs shrink-0">{stat.label}</span>
			<div
				class="h-2 w-16 bg-black/60 border border-black/80 rounded-sm overflow-hidden shrink-0"
				style="box-shadow: 1px 1px 0 #000;"
			>
				<div
					class="h-full transition-all duration-300"
					style="width: {stat.value}%; background: {barColor(stat.value, stat.type)};"
				></div>
			</div>
			<span class="text-xs font-black text-white/50 tabular-nums w-6 shrink-0"
				>{stat.value}</span
			>
		</div>
	{/each}
</div>
