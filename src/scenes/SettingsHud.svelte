<script lang="ts">
	import { fly } from 'svelte/transition';
	import {
		settingsState,
		graphicsActions,
		audioActions
	} from '$extensions/settings/settings.svelte';
	import { soundActions } from '$core/GlobalAudio.svelte';
	import { inputState, inputActions } from '$extensions/input/input.svelte';
	import type { InputAction, AnyBinding } from '$extensions/input/types';
	import type { QualityLevel } from '$extensions/settings/settings.svelte';

	type Props = { onBack: () => void };
	let { onBack }: Props = $props();

	type Tab = 'audio' | 'controls';
	let activeTab = $state<Tab>('controls');

	type ActionGroup = { label: string; icon: string; actions: InputAction[] };

	const ACTION_GROUPS: ActionGroup[] = [
		{
			label: 'Movement',
			icon: '🐭',
			actions: ['moveForward', 'moveBackward', 'moveLeft', 'moveRight', 'sprint', 'jump']
		},
		{
			label: 'Interaction',
			icon: '🧀',
			actions: ['interact']
		}
	];

	const ACTION_LABELS: Record<InputAction, string> = {
		moveForward: 'Move Forward',
		moveBackward: 'Move Backward',
		moveLeft: 'Move Left',
		moveRight: 'Move Right',
		sprint: 'Sprint (loud!)',
		jump: 'Jump',
		interact: 'Pick Up / Interact',
		pause: 'Pause',
		openSettings: 'Open Settings',
		// unused — kept for type completeness
		primaryAction: 'Primary Action',
		secondaryAction: 'Secondary Action',
		reload: 'Reload',
		use: 'Use',
		crouch: 'Crouch',
		drop: 'Drop',
		prone: 'Prone',
		emote: 'Emote',
		slot1: 'Slot 1',
		slot2: 'Slot 2',
		slot3: 'Slot 3',
		slot4: 'Slot 4',
		toggleUi: 'Toggle UI'
	};

	const KEY_CODE_LABELS: Record<string, string> = {
		Space: 'Space',
		Escape: 'Esc',
		Enter: 'Enter',
		Backspace: 'Bksp',
		Tab: 'Tab',
		ArrowUp: '↑',
		ArrowDown: '↓',
		ArrowLeft: '←',
		ArrowRight: '→',
		ShiftLeft: 'L.Shift',
		ShiftRight: 'R.Shift',
		ControlLeft: 'L.Ctrl',
		ControlRight: 'R.Ctrl',
		AltLeft: 'L.Alt',
		AltRight: 'R.Alt',
		Digit0: '0',
		Digit1: '1',
		Digit2: '2',
		Digit3: '3',
		Digit4: '4',
		Digit5: '5',
		Digit6: '6',
		Digit7: '7',
		Digit8: '8',
		Digit9: '9',
		Comma: ',',
		Period: '.',
		Slash: '/',
		Semicolon: ';',
		Quote: "'",
		BracketLeft: '[',
		BracketRight: ']',
		Backslash: '\\',
		Minus: '-',
		Equal: '=',
		Backquote: '`'
	};

	function formatBinding(b: AnyBinding): string {
		if (b.device === 'keyboard') {
			const label = KEY_CODE_LABELS[b.code];
			if (label) return label;
			if (b.code.startsWith('Key')) return b.code.slice(3);
			if (b.code.startsWith('Numpad')) return 'Num' + b.code.slice(6);
			return b.code;
		}
		if (b.device === 'mouse') {
			return b.button === 'left' ? 'LMB' : b.button === 'right' ? 'RMB' : 'MMB';
		}
		return '?';
	}

	const isCapturing = $derived(inputState.capture.active);
	const captureAction = $derived(inputState.capture.action as InputAction | null);

	function startBind(action: InputAction) {
		soundActions.playClick();
		inputActions.startCapture('player1', action, 'action');
	}

	function removeBinding(action: InputAction, id: string) {
		inputActions.removeBinding('player1', action, id);
	}

	function resetAction(action: InputAction) {
		soundActions.playClick();
		inputActions.resetAction('player1', action);
	}

	function resetAllControls() {
		soundActions.playClick();
		inputActions.resetPlayerBindings('player1');
	}

	function cancelCapture() {
		soundActions.playClick();
		inputActions.cancelCapture();
	}

	function switchTab(tab: Tab) {
		soundActions.playClick();
		if (isCapturing) inputActions.cancelCapture();
		activeTab = tab;
	}
</script>

<div class="pointer-events-auto">
	<div
		transition:fly={{ y: -16, duration: 220 }}
		class="absolute inset-0 flex items-center justify-center bg-amber-950/70 backdrop-blur-md"
	>
		<div
			class="bg-amber-950/90 border-4 border-amber-700/60 rounded-3xl p-8 text-amber-100
			       flex flex-col shadow-2xl
			       {activeTab === 'controls' ? 'w-[26rem]' : 'w-96'}"
		>
			<!-- Header -->
			<div class="flex items-center gap-3 mb-6">
				<span class="text-3xl select-none" aria-hidden="true">⚙️</span>
				<h2 class="m-0 text-2xl font-black text-amber-200 tracking-tight">Settings</h2>
			</div>

			<!-- Tab bar -->
			<div class="flex gap-1.5 mb-6 bg-amber-900/40 border border-amber-700/30 rounded-2xl p-1">
				{#each [['controls', '🎮 Controls'], ['audio', '🔊 Audio']] as const as [id, label]}
					<button
						onclick={() => switchTab(id)}
						class="flex-1 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer
						       {activeTab === id
							? 'bg-amber-500 text-amber-950 shadow-md'
							: 'text-amber-400/60 hover:text-amber-300'}"
					>
						{label}
					</button>
				{/each}
			</div>

			<!-- Controls tab -->
			{#if activeTab === 'controls'}
				{#if isCapturing && captureAction}
					<div
						class="mb-4 flex items-center justify-between gap-3 bg-amber-800/40
						       border-2 border-amber-600/50 rounded-2xl px-4 py-2.5 text-sm"
					>
						<span class="animate-pulse text-amber-200">
							Binding <strong class="text-amber-300">{ACTION_LABELS[captureAction]}</strong> — press a key or click…
						</span>
						<button
							onclick={cancelCapture}
							class="text-amber-400/70 hover:text-amber-200 transition-colors cursor-pointer
							       text-xs border border-amber-600/40 rounded-lg px-2 py-1"
						>
							Cancel
						</button>
					</div>
				{/if}

				<div class="overflow-y-auto max-h-[55vh] flex flex-col gap-5 pr-1">
					{#each ACTION_GROUPS as group}
						<div>
							<p class="m-0 mb-2.5 text-xs font-black uppercase tracking-widest text-amber-500/60">
								{group.icon} {group.label}
							</p>
							<div class="flex flex-col gap-1">
								{#each group.actions as action}
									{@const bindings = (inputState.players.player1.actions[action] ?? []).filter(b => b.device === 'keyboard' || b.device === 'mouse')}
									{@const capturing = isCapturing && captureAction === action}
									<div
										class="flex items-center gap-2 rounded-xl px-3 py-2 transition-colors
										       {capturing
											? 'bg-amber-700/30 border-2 border-amber-500/40'
											: 'hover:bg-amber-800/30 border-2 border-transparent'}"
									>
										<span class="text-sm w-36 shrink-0 text-amber-200/80 font-medium">
											{ACTION_LABELS[action]}
										</span>

										<div class="flex flex-wrap gap-1 flex-1 min-w-0">
											{#each bindings as b (b.id)}
												<span
													class="inline-flex items-center gap-1 bg-amber-800/60
													       border border-amber-600/50 rounded-lg px-1.5 py-0.5"
												>
													<kbd class="font-mono text-xs leading-none text-amber-200"
														>{formatBinding(b)}</kbd
													>
													<button
														onclick={() => removeBinding(action, b.id)}
														class="opacity-40 hover:opacity-100 transition-opacity cursor-pointer leading-none text-xs text-amber-300"
														aria-label="Remove binding">×</button
													>
												</span>
											{/each}

											{#if capturing}
												<span class="text-xs text-amber-400/50 italic self-center">waiting…</span>
											{:else}
												<button
													onclick={() => startBind(action)}
													class="text-xs text-amber-500/50 hover:text-amber-300 transition-colors cursor-pointer
													       border border-amber-700/40 rounded-lg px-1.5 py-0.5 leading-none"
													aria-label="Add binding">+</button
												>
											{/if}
										</div>

										<button
											onclick={() => resetAction(action)}
											title="Reset to default"
											class="opacity-30 hover:opacity-80 transition-opacity cursor-pointer text-sm shrink-0 text-amber-300"
											>↺</button
										>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>

				<button
					onclick={resetAllControls}
					class="mt-4 w-full py-2 text-sm font-bold text-amber-500/50 border-2 border-amber-700/30
					       rounded-2xl hover:bg-amber-800/30 hover:text-amber-300 transition-all cursor-pointer"
				>
					↺ Reset All Controls
				</button>

			<!-- Audio tab -->
			{:else if activeTab === 'audio'}
				<div class="mb-2 flex flex-col gap-5">
					{#each [
						{ key: 'sfx', label: '🎵 Sound Effects', enabled: settingsState.audio.sfxEnabled, volume: settingsState.audio.sfxVolume, toggle: audioActions.toggleSfx, setVol: audioActions.setSfxVolume },
						{ key: 'music', label: '🎶 Music', enabled: settingsState.audio.musicEnabled, volume: settingsState.audio.musicVolume, toggle: audioActions.toggleMusic, setVol: audioActions.setMusicVolume },
						{ key: 'ambience', label: '🌙 Ambience', enabled: settingsState.audio.ambienceEnabled, volume: settingsState.audio.ambienceVolume, toggle: audioActions.toggleAmbience, setVol: audioActions.setAmbienceVolume }
					] as ch}
						<div class="flex flex-col gap-2">
							<label class="flex items-center gap-3 cursor-pointer text-sm font-bold text-amber-200">
								<input
									type="checkbox"
									checked={ch.enabled}
									onchange={() => ch.toggle()}
									class="w-4 h-4 accent-amber-500 cursor-pointer"
								/>
								{ch.label}
							</label>
							<input
								type="range"
								min="0"
								max="1"
								step="0.01"
								aria-label="{ch.label} volume"
								value={ch.volume}
								oninput={(e) => ch.setVol(+(e.target as HTMLInputElement).value)}
								class="w-full accent-amber-500 cursor-pointer"
								disabled={!ch.enabled}
							/>
						</div>
					{/each}
				</div>

				<div class="mt-4 border-t border-amber-700/30 pt-4">
					<p class="m-0 mb-3 text-xs font-black uppercase tracking-widest text-amber-500/60">
						🖥️ Graphics
					</p>
					<div class="flex gap-2">
						{#each ['low', 'high'] as level}
							<button
								onclick={() => {
									soundActions.playClick();
									graphicsActions.setQuality(level as QualityLevel);
								}}
								class="flex-1 px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition-all capitalize cursor-pointer
								       {settingsState.graphics.quality === level
									? 'border-amber-500/80 bg-amber-600/40 text-amber-200'
									: 'border-amber-700/30 bg-transparent text-amber-400/60 hover:bg-amber-800/30 hover:text-amber-300'}"
							>
								{level === 'low' ? '🐌 Low' : '✨ High'}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Back -->
			<button
				onclick={() => {
					soundActions.playClick();
					if (isCapturing) inputActions.cancelCapture();
					onBack();
				}}
				class="mt-5 w-full px-4 py-3 font-bold text-amber-950 bg-amber-500 border-4 border-amber-400/50
				       rounded-2xl cursor-pointer hover:bg-amber-400 hover:scale-105 active:scale-95
				       transition-all shadow-md shadow-amber-900/40"
			>
				← Back to Menu
			</button>
		</div>
	</div>
</div>
