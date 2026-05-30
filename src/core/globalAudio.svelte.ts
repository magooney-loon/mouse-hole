export const soundTriggers = $state({
	click: 0,
	swoosh: 0,
	katzeIntro: 0,
	meowTrigger: 0,
	meowWhich: 1, // 1–4
});

export const soundActions = {
	playClick() { soundTriggers.click++; },
	playSwoosh() { soundTriggers.swoosh++; },
	playKatzeIntro() { soundTriggers.katzeIntro++; },
	playRandomMeow() {
		soundTriggers.meowWhich = Math.floor(Math.random() * 4) + 1;
		soundTriggers.meowTrigger++;
	},
};
