<script lang="ts">
	import { inputState } from '$extensions/input/input.svelte';
	import type { InputAction } from '$extensions/input/types';

	const isTouchDevice =
		typeof navigator !== 'undefined' && (navigator.maxTouchPoints > 0 || 'ontouchstart' in window);

	const RING = 96; // outer ring diameter px
	const RADIUS = RING / 2 - 4; // max thumb travel
	const THUMB = 40; // thumb diameter px
	const DEAD = 0.1;

	let thumbDx = $state(0);
	let thumbDy = $state(0);
	let joyId: number | null = null;

	let ringEl: HTMLElement | null = $state(null);

	function startJoystick(e: TouchEvent) {
		if (joyId !== null) return;
		e.preventDefault();
		const t = e.changedTouches[0];
		joyId = t.identifier;
		updateThumb(t.clientX, t.clientY);
	}

	function updateThumb(clientX: number, clientY: number) {
		if (!ringEl) return;
		const rect = ringEl.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;
		const dx = clientX - cx;
		const dy = clientY - cy;
		const len = Math.sqrt(dx * dx + dy * dy);
		const clamped = Math.min(len, RADIUS);
		const nx = len > 0 ? dx / len : 0;
		const ny = len > 0 ? dy / len : 0;
		thumbDx = nx * clamped;
		thumbDy = ny * clamped;
		inputState.runtime.touch.moveX = dead(nx * (clamped / RADIUS));
		inputState.runtime.touch.moveY = dead(-ny * (clamped / RADIUS)); // up = forward
	}

	function onWindowTouchMove(e: TouchEvent) {
		if (joyId === null) return;
		for (let i = 0; i < e.changedTouches.length; i++) {
			const t = e.changedTouches[i];
			if (t.identifier !== joyId) continue;
			updateThumb(t.clientX, t.clientY);
			break;
		}
	}

	function onWindowTouchEnd(e: TouchEvent) {
		for (let i = 0; i < e.changedTouches.length; i++) {
			if (e.changedTouches[i].identifier !== joyId) continue;
			joyId = null;
			thumbDx = 0;
			thumbDy = 0;
			inputState.runtime.touch.moveX = 0;
			inputState.runtime.touch.moveY = 0;
			break;
		}
	}

	function dead(v: number) {
		return Math.abs(v) < DEAD ? 0 : v;
	}

	function btnDown(action: InputAction) {
		inputState.runtime.touch.actions[action] = true;
	}
	function btnUp(action: InputAction) {
		inputState.runtime.touch.actions[action] = false;
	}

	const isActive = $derived(joyId !== null);
</script>

<svelte:window
	ontouchmove={onWindowTouchMove}
	ontouchend={onWindowTouchEnd}
	ontouchcancel={onWindowTouchEnd}
/>

{#if isTouchDevice}
	<!-- Joystick touch zone — left half, lower portion; captures touches for the stick -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="absolute bottom-0 left-0 w-1/2 h-3/5 flex items-end justify-center pb-10"
		style="pointer-events: auto; touch-action: none;"
		ontouchstart={startJoystick}
	>
		<!-- Fixed joystick ring (always visible) -->
		<div
			bind:this={ringEl}
			class="relative rounded-full shrink-0"
			style="
				width: {RING}px;
				height: {RING}px;
				background: rgba(255,255,255,{isActive ? 0.08 : 0.04});
				border: 2px solid rgba(255,255,255,{isActive ? 0.45 : 0.25});
				transition: border-color 0.1s, background 0.1s;
			"
		>
			<!-- Cross-hair guides (subtle) -->
			<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
				<div class="w-full h-px" style="background: rgba(255,255,255,0.1);"></div>
			</div>
			<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
				<div class="h-full w-px" style="background: rgba(255,255,255,0.1);"></div>
			</div>

			<!-- Thumb -->
			<div
				class="absolute rounded-full"
				style="
					width: {THUMB}px;
					height: {THUMB}px;
					left: {RING / 2 + thumbDx - THUMB / 2}px;
					top: {RING / 2 + thumbDy - THUMB / 2}px;
					background: rgba(255,255,255,{isActive ? 0.55 : 0.25});
					border: 2px solid rgba(255,255,255,{isActive ? 0.85 : 0.4});
					transition: background 0.1s, border-color 0.1s;
				"
			></div>
		</div>
	</div>

	<!-- Action buttons — bottom right -->
	<div
		class="absolute bottom-6 right-4 flex flex-col items-end gap-2"
		style="pointer-events: auto;"
	>
		<!-- Interact + Sprint row -->
		<div class="flex items-center gap-2">
			<button
				class="rounded-full font-black text-sm text-white flex items-center justify-center"
				style="
					width: 52px; height: 52px;
					background: rgba(168,85,247,0.78);
					border: 2px solid rgba(0,0,0,0.45);
					box-shadow: 3px 3px 0 rgba(0,0,0,0.35);
					touch-action: none;
				"
				ontouchstart={(e) => { e.preventDefault(); btnDown('interact'); }}
				ontouchend={() => btnUp('interact')}
				ontouchcancel={() => btnUp('interact')}
			>F</button>

			<button
				class="rounded-full font-black text-xs text-white flex items-center justify-center"
				style="
					width: 46px; height: 46px;
					background: rgba(255,255,255,0.2);
					border: 2px solid rgba(255,255,255,0.4);
					box-shadow: 3px 3px 0 rgba(0,0,0,0.3);
					touch-action: none;
				"
				ontouchstart={(e) => { e.preventDefault(); btnDown('sprint'); }}
				ontouchend={() => btnUp('sprint')}
				ontouchcancel={() => btnUp('sprint')}
			>RUN</button>
		</div>

		<!-- Jump (large) -->
		<button
			class="rounded-full font-black text-sm text-black flex items-center justify-center"
			style="
				width: 64px; height: 64px;
				background: rgba(251,191,36,0.88);
				border: 2px solid rgba(0,0,0,0.45);
				box-shadow: 4px 4px 0 rgba(0,0,0,0.4);
				touch-action: none;
			"
			ontouchstart={(e) => { e.preventDefault(); btnDown('jump'); }}
			ontouchend={() => btnUp('jump')}
			ontouchcancel={() => btnUp('jump')}
		>JUMP</button>
	</div>
{/if}
