export type GameState = 'menu' | 'playing';

export const game = $state({ state: 'menu' as GameState });
