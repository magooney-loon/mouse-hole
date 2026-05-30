export type CatAIMode = 'patrol' | 'search' | 'chase' | 'investigate';

export const catAIState = $state({
	mode: 'patrol' as CatAIMode,
	alertLevel: 0,
	lastKnownPos: null as { x: number; y: number; z: number } | null,
	investigateTimer: 0,
	introMeowTrigger: 0,
	introMeowVolume: 1.0,
	katzeIntroTrigger: 0
});

// Written by Mouse.svelte every frame — plain object, no reactivity overhead
export const mouseSharedPos = { x: 1.936, y: 1, z: -1.894 };
export const mouseSharedFacing = { angle: 4.341 };

export const mouseHitRequest = {
	id: 0,
	x: 0,
	y: 0,
	z: 0
};

// Set by Mouse.svelte on create — used by CatAI to exclude mouse body from raycasts
export const mouseBodyRef: { current: any } = { current: null };
