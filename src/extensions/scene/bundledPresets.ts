import type { SceneType, ScenePresets } from './types';

/**
 * Bundled scene-preset assignments — committed to git, available in all environments.
 *
 * To set up:
 *   1. In Studio, assign PP / Skybox presets to each scene via the Scenes panel.
 *   2. Click "Copy Scene to Code" (or "Copy All Scenes") to get the snippet.
 *   3. Paste the entries here and commit.
 *
 * Studio overrides (localStorage) stack on top of these at dev time.
 */
export const BUNDLED_SCENE_PRESETS: Partial<Record<SceneType, ScenePresets>> = {
	// mainMenu: { postprocessing: 'your-pp-preset-id', skybox: 'your-sky-preset-id' },
	// demoScene: { postprocessing: 'your-pp-preset-id' },
};

/**
 * Bundled global preset assignments — applied as a base layer to ALL scenes.
 * Scene presets stack on top (scene wins on same effect conflict).
 *
 * To set up:
 *   1. In Studio, assign global PP / Skybox presets via the Scenes panel.
 *   2. Click "Copy Global to Code" to get the snippet.
 *   3. Paste here and commit.
 */
export const BUNDLED_GLOBAL_PRESETS: ScenePresets = {
	postprocessing: '5cd47043-9178-4a45-9f56-296943c0cabc' // global
};
