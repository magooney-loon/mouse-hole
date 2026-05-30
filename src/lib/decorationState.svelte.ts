export const decorationState = $state({
	carrying: false,
	deliveredCount: 0,
	pickupInRange: false,
	deliverInRange: false,
});

export const decorationActions = {
	pickup()  { decorationState.carrying = true;  decorationState.pickupInRange = false; },
	deliver() { decorationState.carrying = false; decorationState.deliveredCount++; decorationState.deliverInRange = false; },
	drop()    { decorationState.carrying = false; },
	reset()   {
		decorationState.carrying       = false;
		decorationState.deliveredCount = 0;
		decorationState.pickupInRange  = false;
		decorationState.deliverInRange = false;
	},
};
