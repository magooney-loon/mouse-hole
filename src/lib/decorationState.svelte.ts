export const DECORATION_TOTAL = 5;

export const DECORATION_LABELS = ['Fork', 'Matchstick', 'Lighter', 'Phone', 'Thimble'];
export const DECORATION_ICONS = ['🍴', '🔥', '🔥', '📱', '🧵'];

export const decorationState = $state({
	carrying: false,
	carriedIndex: -1,
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
	pickup(index: number) {
		decorationState.carrying = true;
		decorationState.carriedIndex = index;
		decorationState.pickupInRange = false;
	},
	deliver(index: number) {
		decorationState.carrying = false;
		decorationState.carriedIndex = -1;
		decorationState.delivered[index] = true;
		decorationState.deliveredCount++;
		decorationState.deliverInRange = false;
	},
	drop() {
		decorationState.carrying = false;
		decorationState.carriedIndex = -1;
	},
	reset() {
		decorationState.carrying = false;
		decorationState.carriedIndex = -1;
		decorationState.deliveredCount = 0;
		decorationState.pickupInRange = false;
		decorationState.deliverInRange = false;
		decorationState.delivered = [false, false, false, false, false];
	}
};
