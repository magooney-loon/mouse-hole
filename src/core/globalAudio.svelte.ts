export type WalkState = 'stopped' | 'walking' | 'sprinting';

export const soundTriggers = $state({
	click: 0,
	swoosh: 0,
	katzeIntro: 0,
	katzeWin: 0,
	mouseGameover: 0,
	mouseJump: 0,
	walkState: 'stopped' as WalkState,
	meowTrigger: 0,
	meowWhich: 1, // 1–4
});

export const soundActions = {
	playClick() { soundTriggers.click++; },
	playSwoosh() { soundTriggers.swoosh++; },
	playKatzeIntro() { soundTriggers.katzeIntro++; },
	playKatzeWin() { soundTriggers.katzeWin++; },
	playMouseGameover() { soundTriggers.mouseGameover++; },
	playMouseJump() { soundTriggers.mouseJump++; },
	setWalkState(state: WalkState) { soundTriggers.walkState = state; },
	playRandomMeow() {
		soundTriggers.meowWhich = Math.floor(Math.random() * 4) + 1;
		soundTriggers.meowTrigger++;
	},
};
