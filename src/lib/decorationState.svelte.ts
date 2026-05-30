export const DECORATION_TOTAL = 5;

export const decorationState = $state({
	carrying: false,
	deliveredCount: 0,
	pickupInRange: false,
	deliverInRange: false,
	// Which decoration indices have been delivered (slot i shows when delivered[i] is true)
	delivered: [false, false, false, false, false]
});

// Snap positions for delivered items around the spawn center
// Each slot i matches decoration index i
export const SNAP_OFFSETS: [number, number, number][] = [
	[-0.12, 0.05, -0.08],
	[0.12, 0.05, -0.08],
	[0.0, 0.05, -0.18],
	[-0.18, 0.05, 0.02],
	[0.18, 0.05, 0.02]
];

export const decorationActions = {
	pickup() {
		decorationState.carrying = true;
		decorationState.pickupInRange = false;
	},
	deliver(index: number) {
		decorationState.carrying = false;
		decorationState.delivered[index] = true;
		decorationState.deliveredCount++;
		decorationState.deliverInRange = false;
	},
	drop() {
		decorationState.carrying = false;
	},
	reset() {
		decorationState.carrying = false;
		decorationState.deliveredCount = 0;
		decorationState.pickupInRange = false;
		decorationState.deliverInRange = false;
		decorationState.delivered = [false, false, false, false, false];
	}
};
