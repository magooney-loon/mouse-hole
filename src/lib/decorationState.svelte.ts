export const decorationState = $state({
	carrying: false,
	deliveredCount: 0,
	pickupInRange: false,
	deliverInRange: false
});

// Snap positions for delivered items around the spawn center
// Arranged in a small arc facing the mouse entry direction
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
	deliver() {
		decorationState.carrying = false;
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
	}
};
