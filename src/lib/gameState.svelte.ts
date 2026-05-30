export type GameStatus = 'idle' | 'playing' | 'game_over';

const clamp = (v: number) => Math.max(0, Math.min(100, v));

export const gameState = $state({
	status: 'idle' as GameStatus,
	hunger: 80,
	stamina: 100,
	sound: 0,
});

export const gameActions = {
	start() {
		gameState.status = 'playing';
		gameState.hunger = 80;
		gameState.stamina = 100;
		gameState.sound = 0;
	},
	reset() {
		gameState.status = 'idle';
		gameState.hunger = 80;
		gameState.stamina = 100;
		gameState.sound = 0;
	},
};

export function tickGameState(delta: number, sprinting: boolean, moving: boolean, airborne: boolean) {
	if (gameState.status !== 'playing') return;

	// Hunger drains passively
	gameState.hunger = clamp(gameState.hunger - 0.5 * delta);
	if (gameState.hunger <= 0) {
		gameState.status = 'game_over';
		return;
	}

	// Stamina drains while sprinting, recovers otherwise
	if (sprinting) {
		gameState.stamina = clamp(gameState.stamina - 35 * delta);
	} else {
		gameState.stamina = clamp(gameState.stamina + 20 * delta);
	}

	// Sound spikes when sprinting or airborne, drops when walking, silent when still
	const soundTarget = sprinting ? 100 : airborne ? 60 : moving ? 25 : 0;
	gameState.sound = clamp(gameState.sound + (soundTarget - gameState.sound) * Math.min(1, delta * 5));
}
