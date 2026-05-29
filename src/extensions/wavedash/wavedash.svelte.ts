const isWavedash = typeof window !== 'undefined' && 'Wavedash' in window;

let initialized = false;

export const wavedashActions = {
	updateProgress(zeroToOne: number) {
		if (!isWavedash) return;
		(window as any).Wavedash.updateLoadProgressZeroToOne(Math.max(0, Math.min(1, zeroToOne)));
	},

	init() {
		if (!isWavedash || initialized) return;
		initialized = true;
		(window as any).Wavedash.init({ debug: import.meta.env.DEV });
	},
};
