export type GameStatus = 'idle' | 'starting' | 'playing' | 'game_over' | 'win';

const clamp = (v: number) => Math.max(0, Math.min(100, v));

export const gameState = $state({
	status: 'idle' as GameStatus,
	startTimer: 0,
	hunger: 80,
	stamina: 100,
	sound: 0,
	cheeseInRange: false,
	elapsed: 0,
	inSafeZone: false,
	isSprinting: false
});

export const gameActions = {
	start() {
		gameState.status = 'starting';
		gameState.startTimer = 10;
		gameState.hunger = 80;
		gameState.stamina = 100;
		gameState.sound = 0;
		gameState.elapsed = 0;
	},
	win() {
		gameState.status = 'win';
	},
	reset() {
		gameState.status = 'idle';
		gameState.startTimer = 0;
		gameState.hunger = 80;
		gameState.stamina = 100;
		gameState.sound = 0;
		gameState.elapsed = 0;
	}
};

export function tickGameState(
	delta: number,
	sprinting: boolean,
	moving: boolean,
	airborne: boolean
) {
	if (gameState.status === 'starting') {
		gameState.startTimer -= delta;
		if (gameState.startTimer <= 0) gameState.status = 'playing';
		return;
	}

	if (gameState.status !== 'playing') return;

	gameState.elapsed += delta;
	if (!gameState.inSafeZone) gameState.hunger = clamp(gameState.hunger - 0.5 * delta);
	if (gameState.hunger <= 0) {
		gameState.status = 'game_over';
		return;
	}

	if (sprinting) {
		gameState.stamina = clamp(gameState.stamina - 35 * delta);
	} else {
		gameState.stamina = clamp(gameState.stamina + 20 * delta);
	}

	const soundTarget = sprinting ? 100 : airborne ? 60 : moving ? 25 : 0;
	gameState.sound = clamp(
		gameState.sound + (soundTarget - gameState.sound) * Math.min(1, delta * 5)
	);
}
