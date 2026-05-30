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
</script>

<div class="flex flex-col gap-2">
	{#each [
		{ label: '🍖', title: 'Hunger',  value: hunger,  type: 'hunger'  },
		{ label: '⚡', title: 'Stamina', value: stamina, type: 'stamina' },
		{ label: '🔊', title: 'Sound',   value: sound,   type: 'sound'   },
	] as stat}
		<div class="flex items-center gap-2">
			<span class="w-5 shrink-0 text-sm">{stat.label}</span>
			<span class="text-sm font-black text-amber-300 uppercase tracking-widest w-20 shrink-0"
			      style="text-shadow: 1px 1px 0 #000;">{stat.title}</span>
			<div
				class="w-32 h-3 bg-black/60 border-2 border-black rounded-sm overflow-hidden"
				style="box-shadow: 2px 2px 0 #000;"
			>
				<div
					class="h-full transition-all duration-300"
					style="width: {stat.value}%; background: {barColor(stat.value, stat.type as any)};"
				></div>
			</div>
			<span class="text-xs font-black text-white/50 w-7 shrink-0">{stat.value}%</span>
		</div>
	{/each}
</div>
