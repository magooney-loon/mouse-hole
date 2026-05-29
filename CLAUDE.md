# Spaceplate — Svelte 5 + Threlte Boilerplate

## Project Overview

Spaceplate is a boilerplate for real-time 3D web apps. It combines:
- **Svelte 5** (runes: `$state`, `$derived`, `$effect`, `.svelte.ts` reactive modules)
- **Threlte** (Three.js for Svelte — `@threlte/core`, `@threlte/extras`)

## File Structure

```
src/
  App.svelte          — Root: Canvas + SceneHud + Loader siblings; loads Studio extensions
  Root.svelte         — Root app wrapper (wraps App)
  main.ts             — Entry point
  Scene.svelte        — 3D scene router (inside Canvas, Threlte context)
  SceneHud.svelte     — HTML overlay router (sibling to Canvas)
  module_bindings/    — (removed)

  core/
    Camera.svelte        — PerspectiveCamera + AudioListener
    GlobalAudio.svelte   — All Audio components; re-exports from globalAudio.svelte.ts
    globalAudio.svelte.ts — soundTriggers + soundActions singleton (import from here in .ts files)
    Keymapper.svelte     — Global keyboard/mouse event listeners; routes into input extension
    Loader.svelte        — Asset loading screen (useProgress, shown until finishedOnce)
    Renderer.svelte      — Post-processing (25+ effects, quality-gated)
    Skybox.svelte        — Sky + dual-layer stars (state-driven)
    tasks.ts             — Task pipeline: physicsStage, renderStage, uiStage, audioStage

  scenes/
    SettingsHud.svelte   — Settings overlay (tabbed: General, Audio, Controls/keybindings)
    MainMenu/
      MainMenu.svelte    — Example 3D scene 1 (inside Canvas)
      MainMenuHud.svelte — HTML overlay for main menu
    DemoScene/
      DemoScene.svelte   — Example 3D scene 2 (inside Canvas)
      DemoSceneHud.svelte — HTML overlay for demo scene
      DemoFloor.svelte   — Floor plane with collider
      DemoPhysicsBodies.svelte — Spawned physics bodies renderer

  extensions/
    input/
      input.svelte.ts      — Action-based input state, bindings, queries, persistence
      types.ts             — InputAction, InputAxisAction, binding types, state shape
      useInput.ts          — Hook returning { state, actions, queries }
    scene/
      scene.svelte.ts      — Scene state machine + SCENES config array
      bundledPresets.ts    — Code-committed preset assignments per scene + global
      SceneExtension.svelte — Studio toolbar: scene switching + preset manager
      types.ts
    settings/
      settings.svelte.ts   — Persistent settings state (audio, graphics, general)
      types.ts
    sound/
      soundState.svelte.ts — Positional audio state
      SoundExtension.svelte — Studio extension
      useSound.ts
      types.ts
    skybox/
      skybox.svelte.ts     — Sky/stars presets + animated transitions
      bundledPresets.ts    — Built-in skybox presets (not stored in localStorage)
      envTextures.ts       — HDR/cubemap environment texture registry
      SkyboxExtension.svelte — Studio extension
      types.ts
    postprocessing/
      postprocessing.svelte.ts — 25+ effects state + preset management
      bundledPresets.ts    — Built-in PP presets (not stored in localStorage)
      PostProcessingExtension.svelte — Studio extension
      types.ts
      usePostProcessing.ts
    logger/
      logger.svelte.ts     — Multi-channel styled logging
      LoggerExtension.svelte — Studio extension (auto-generates checkboxes from channelStyles)
      types.ts
    physics/
      physics.svelte.ts    — Rapier world state, attractor, spawn defaults, spawn actions
      PhysicsExtension.svelte — Studio extension: world tuning + body spawning
      PhysicsController.svelte — Applies per-body forces and attractor logic
      PhysicsWorldLogger.svelte — Logs Rapier world lifecycle/debug info
      types.ts
    gltf-viewer/
      gltfViewer.svelte.ts  — GLTF/GLB model state + actions (dev-only, DemoScene)
      GltfViewerExtension.svelte — Studio extension: load, transform, animate models, toggle colliders
      GltfViewerInstance.svelte  — Per-model component: useGltf + animation mixer
      GltfViewerScene.svelte     — Renders all loaded models inside DemoScene
      types.ts
```

## Architecture Rules

### HUD vs 3D Scene
- **3D content** (meshes, lights, cameras) belongs inside `<Canvas>` — use `Scene.svelte` → scene components
- **HTML overlays** (buttons, panels, forms) cannot live inside Canvas — use `SceneHud.svelte` → HUD components
- HUD components are siblings to Canvas in a `position: relative` wrapper div

### Sound System
- `core/GlobalAudio.svelte` owns all `<Audio>` Threlte components — never unmounts (no race conditions)
- `soundTriggers` and `soundActions` live in `core/globalAudio.svelte.ts` — imported from there in `.ts` files
- **Always import from `.ts` file, not the `.svelte` file** — named exports from `<script module>` in `.svelte` are not visible to TypeScript in `.ts` imports
- Import: `import { soundActions } from '$core/globalAudio.svelte'`
- `soundActions.playSwoosh()` — polyphonic (clone per call → overlapping instances)
- `soundActions.playClick()` — one-shot (stop+restart)
- `$state.raw<ThreeAudio>()` — prevents Svelte 5 Proxy wrapping THREE.js class instances

### Scene State Machine (`extensions/scene/scene.svelte.ts`)
- Scenes defined in `SCENES: SceneConfig[]` — each entry has `id`, `label`, `icon`
- Adding a new scene = one new entry in `SCENES` (+ add its `id` to `SceneType`)
- `sceneActions.setScene(scene)` transitions scene (plays swoosh, logs)
- Convenience: `sceneActions.goToMainMenu()` / `goToDemoScene()` / `goBack()`
- Read current scene via `sceneState.currentScene`
- `sceneState.isTransitioning` — set during animated transitions (`sceneActions.transitionTo`)

#### Preset Assignment System (`extensions/scene/bundledPresets.ts`)
- **Single source of truth** for which PP/skybox presets load per scene — all in code, not localStorage
- `BUNDLED_SCENE_PRESETS: Partial<Record<SceneType, ScenePresets>>` — per-scene assignments
- `BUNDLED_GLOBAL_PRESETS: ScenePresets` — baseline applied to all scenes (scene-specific wins on conflict)
- `resolveScenePreset(sceneId, type)` — localStorage studio override → bundledPresets → null
- `resolveGlobalPreset(type)` — localStorage studio override → bundledPresets → null
- Studio SceneExtension lets you set/override assignments at runtime and copy the code to paste into `bundledPresets.ts`
- **Conflict detection**: PP extension warns if global and scene presets share the same enabled effect
- **Deletion guard**: PP/Skybox extensions block deleting presets that are in use by the scene manager

### Task Pipeline (`core/tasks.ts`)
- Four ordered stages per frame: `physicsStage` (BEFORE render) → `renderStage` (default) → `uiStage` (AFTER) → `audioStage` (AFTER ui)
- `useGameTasks()` returns `{ stages, createPhysicsTask, createUiTask, createAudioTask }`
- Boilerplate convention: physics-style game tasks usually run in DemoScene; `uiStage` pauses during transitions; `audioStage` always runs
- Use tasks instead of raw `useTask` to ensure correct execution order

### Skybox System (`extensions/skybox/skybox.svelte.ts`)
- **Sky presets**: 11 time-of-day options (dawn, day, dusk, night, sunset, sunrise, cloudy, overcast, aurora, vacuum)
- **Star presets**: 5 configurations (dense, sparse, twinkle, nebula, milkyway) — each sky preset embeds a star preset
- `skyboxActions.applyPreset(id)` — instant or animated transition via `requestAnimationFrame`
- Individual setters: `setTurbidity`, `setAzimuth`, `setElevation`, etc.
- `skyboxState` / `starsState` / `transitionState` — all reactive, drive `core/Skybox.svelte`
- `ENV_TEXTURES` / `CUBE_TEXTURES` from `envTextures.ts` provide image-based environment options in addition to procedural sky
- **User presets**: `skyboxActions.savePreset(name)` / `loadUserPreset(id)` / `deletePreset(id)` — persisted to localStorage
- **Bundled presets**: add to `extensions/skybox/bundledPresets.ts` — always available, not stored in localStorage
- **Scene preset assignment**: owned by the scene manager — use `resolveScenePreset` / `resolveGlobalPreset` from `$extensions/scene/scene.svelte`; `core/Skybox.svelte` reads these reactively

### Post-Processing System (`extensions/postprocessing/postprocessing.svelte.ts`)
- 25+ effects: SMAA, FXAA, Bloom, Tone Mapping, God Rays, SSAO, Chromatic Aberration, Lens Distortion, Glitch, ASCII, Pixelation, Outline, Depth of Field, and more
- All effects disabled when `graphics.quality === 'low'` (render pass only)
- `postprocessingActions.savePreset(name)` / `loadPreset(id)` / `deletePreset(id)` / `updatePreset(id)` — persisted to localStorage
- `postprocessingActions.resetAll()` / `resetEffect(name)` — restore defaults; `resetEffect` preserves `enabled` state
- **Bundled presets**: add to `extensions/postprocessing/bundledPresets.ts` — always available, not stored in localStorage
- **Scene preset assignment**: owned by the scene manager — `core/Renderer.svelte` calls `resolveScenePreset` / `resolveGlobalPreset` to merge active presets
- Studio UI: active preset shows ✓, enabled effects auto-expand on load, warning banner shown when a preset overrides manual changes

### Extensions System (`src/extensions/`)

**Core principle:** State in `.svelte.ts` modules is always reactive and works everywhere — in production, in components, in hooks. Threlte Studio is a **dev-only editor** (`VITE_GAME_ENGINE=true`) that provides a UI panel to tweak that same state at runtime. Never put logic in `*Extension.svelte` files — only UI.

#### Extension folder structure

```
extensions/my-feature/
  types.ts                 — extensionScope constant + all types
  myFeature.svelte.ts      — $state + actions (always active, works without Studio)
  MyFeatureExtension.svelte — Studio toolbar UI only (dev mode)
  useMyFeature.ts          — (optional) Studio-aware hook with fallback
```

#### types.ts pattern
```typescript
export const extensionScope = 'my-feature';
export type MyFeatureState = { enabled: boolean; value: number };
export type MyFeatureActions = { setEnabled(v: boolean): void; setValue(v: number): void };
```

#### myFeature.svelte.ts pattern
```typescript
import { logSettings } from '$extensions/logger/logger.svelte';
import type { MyFeatureState, MyFeatureActions } from './types';

export type { MyFeatureState, MyFeatureActions } from './types';

export const myFeatureState = $state<MyFeatureState>({ enabled: true, value: 0.5 });

export const myFeatureActions: MyFeatureActions = {
  setEnabled(v) { myFeatureState.enabled = v; logSettings.info('Enabled:', v); },
  setValue(v)   { myFeatureState.value = v; },
};
```

#### MyFeatureExtension.svelte pattern (Studio UI only)
```svelte
<script lang="ts">
  import { useStudio, ToolbarItem, DropDownPane } from '@threlte/studio/extend';
  import { Folder, Slider, Checkbox } from 'svelte-tweakpane-ui';
  import { myFeatureState, myFeatureActions } from './myFeature.svelte';
  import { extensionScope } from './types';
  import type { Snippet } from 'svelte';

  interface Props { children?: Snippet; }
  let { children }: Props = $props();

  const { createExtension } = useStudio();
  createExtension({ scope: extensionScope, state: () => ({}), actions: {} });
</script>

<ToolbarItem position="left">
  <DropDownPane icon="mdiStar" title="My Feature">
    <Folder title="Settings" expanded={true}>
      <Checkbox label="Enabled" value={myFeatureState.enabled}
        on:change={() => myFeatureActions.setEnabled(!myFeatureState.enabled)} />
      <Slider label="Value" value={myFeatureState.value} min={0} max={1} step={0.01}
        on:change={(e) => myFeatureActions.setValue(e.detail.value)} />
    </Folder>
  </DropDownPane>
</ToolbarItem>

{@render children?.()}
```

**`ToolbarButton` uses `onclick` prop (Svelte 5), NOT `on:click`** — using `on:click` silently does nothing.

#### useX.ts fallback hook pattern (for Studio-aware access)
```typescript
import { useStudio } from '@threlte/studio/extend';
import { myFeatureState, myFeatureActions } from './myFeature.svelte';
import { extensionScope } from './types';

export const useMyFeature = () => {
  try {
    const { useExtension } = useStudio();
    return useExtension(extensionScope);
  } catch {
    return { state: myFeatureState, ...myFeatureActions };
  }
};
```

#### Registering extensions in App.svelte
```svelte
{#await import('@threlte/studio') then { Studio }}
  <Studio extensions={[SceneExtension, PostProcessingExtension, SkyboxExtension, SoundExtension, LoggerExtension, GltfViewerExtension, PhysicsExtension]}>
    <!-- app content -->
  </Studio>
{/await}
```

#### Existing extensions and their exports

| Extension | State export | Actions export | Has Studio UI |
|-----------|-------------|----------------|---------------|
| `scene` | `sceneState` | `sceneActions`, `resolveScenePreset`, `resolveGlobalPreset` | `SceneExtension.svelte` |
| `settings` | `settingsState` | `audioActions`, `graphicsActions`, `generalActions` | none (state-only) |
| `logger` | `loggerState` | `loggerActions.toggleChannel(ch)` | `LoggerExtension.svelte` |
| `postprocessing` | `postprocessingState`, `postprocessingPresetsState` | `postprocessingActions` | `PostProcessingExtension.svelte` |
| `skybox` | `skyboxState`, `starsState`, `transitionState` | `skyboxActions` | `SkyboxExtension.svelte` |
| `sound` | `soundState` | (via `settingsState.audio`) | `SoundExtension.svelte` |
| `physics` | `physicsState` | `physicsActions` | `PhysicsExtension.svelte` |
| `gltf-viewer` | `gltfViewerState` | `gltfViewerActions` | `GltfViewerExtension.svelte` (dev only) |
| `input` | `inputState` | `inputActions`, `inputQueries`, `advanceInputFrame` | none (runtime only) |

**Logger named exports:** `logEngine`, `logSettings`, `logSound`, `logPostprocessing`, `logSkybox`, `logCache`, `logGltf`, `logPhysics`, `logInput`
```typescript
import { logEngine, logSettings, logGltf, logPhysics, logInput } from '$extensions/logger/logger.svelte';
logEngine.info('Scene:', scene);   // console.log
logSettings.warn('Bad value');     // console.warn
logGltf.error('Failed:', err);     // console.error
logPhysics.info('Spawned body');
logInput.info('Binding captured'); // input channel (off by default)
```

#### Common patterns

**localStorage persistence** — write inside actions, not `$effect`:
```typescript
const MY_KEY = 'my-key';
export const myState = $state({ value: parseFloat(localStorage.getItem(MY_KEY) ?? '0.5') });
export const myActions = {
  setValue(v: number) { myState.value = v; localStorage.setItem(MY_KEY, String(v)); }
};
```

**Audio defaults must be `false`** — browser autoplay policy requires audio to start disabled:
```typescript
musicEnabled: false,  // Always off by default — never true
sfxEnabled: false,
ambienceEnabled: false,
```

**Use `on:change` not `bind:` for toggles** — `bind:` bypasses actions:
```svelte
<!-- ❌ Bypasses actions -->
<Checkbox bind:value={state.enabled} />
<!-- ✅ Triggers action -->
<Checkbox value={state.enabled} on:change={() => actions.toggleEnabled()} />
```

**Cross-extension state access** — import directly, no wrappers needed:
```typescript
import { settingsState } from '$extensions/settings/settings.svelte';
// Read or mutate directly — runes are reactive across modules
settingsState.audio.sfxVolume = 0.8;
```

**Post-processing effect disposal** — track `isUpdatingEffects` to prevent render mid-rebuild:
```typescript
let isUpdatingEffects = false;
$effect(() => {
  isUpdatingEffects = true;
  disposeAllEffects();
  // rebuild...
  isUpdatingEffects = false;
});
useTask((delta) => { if (composer && !isUpdatingEffects) composer.render(delta); });
```

#### UI components (`svelte-tweakpane-ui`)
| Component | Use case |
|-----------|----------|
| `Checkbox` | Boolean toggles — use `on:change` |
| `Slider` | Numeric values — `min/max/step` props |
| `Button` | Actions — `on:click` |
| `Folder` | Group related controls — `expanded={true}` |
| `DropDownPane` | Main extension panel in toolbar |
| `List` | Select from options — `options={[{value, text}]}` |
| `Separator` | Visual divider |

### Settings (`extensions/settings/settings.svelte.ts`)
- All settings persist to localStorage automatically
- Audio: `musicVolume/musicEnabled`, `ambienceVolume/ambienceEnabled`, `sfxVolume/sfxEnabled`, `effectsVolume`
- Graphics: `quality` (`"low"` | `"high"`) — affects DPR and whether post-processing runs
- General: `uiVisible` (toggled with `Ctrl+H`)
- Actions: `audioActions.toggleMusic/Ambience/Sfx()`, `setMusicVolume(v)`, `graphicsActions.setQuality(q)`, `generalActions.toggleUiVisible()`
- **`BASE_URL`** — always import and use this for static asset paths; never hardcode `/` or relative paths
  ```ts
  import { BASE_URL } from '$extensions/settings/settings.svelte';
  const src = `${BASE_URL}sounds/click.mp3`;
  ```

### Key Svelte 5 Patterns Used
- `$state.raw<T>()` for Three.js class instances (avoids Proxy breakage)
- All extension state lives in `.svelte.ts` modules — exported as `fooState` / `fooActions` singletons
- `transition:fly` on each HUD component's root element — `transition:fade` on the uiVisible wrapper
- Separate `{#if}` blocks (not `{:else if}`) for scene HUD routing — ensures transitions fire on switch

### Debug Logging (`extensions/logger/logger.svelte.ts`)

Styled multi-channel logging with timestamp + color-coded channel prefix.

**Channels:** `engine` (blue), `settings` (green), `sound` (purple), `postprocessing` (yellow), `skybox` (cyan), `cache` (orange), `gltf` (teal), `physics` (orange)

```ts
import { logEngine, logSound, logGltf } from '$extensions/logger/logger.svelte';

logEngine.info('Scene:', scene);    // console.log — general info
logSound.warn('Missing asset');     // console.warn — recoverable issues
logGltf.error('Failed:', err);      // console.error — failures
```

**Adding a new channel** — two files only; the Studio UI picks it up automatically via `channelStyles`:
```typescript
// 1. types.ts — add to the union and state type
export type LoggerChannel = 'engine' | ... | 'game';
export type LoggerState = { ...; game: boolean };

// 2. logger.svelte.ts — add state entry, channelStyle, and export
export const loggerState = $state<LoggerState>({ ..., game: true });
export const channelStyles = {
  ...,
  game: { color: '#ff6b6b', bg: 'background:#4a2020', text: '🎮', label: 'Game' }
};
export const logGame = createLogger('game', 'game');
```

**Where logs are used in the boilerplate:**
- `Root.svelte` — app mount point
- `Renderer.svelte` — graphics quality applied
- `core/GlobalAudio.svelte` — each audio file loaded
- `Loader.svelte` — all assets finished loading
- `extensions/scene/scene.svelte.ts` — every scene transition (`mainMenu → demoScene`)
- `extensions/settings/settings.svelte.ts` — quality changes, volume changes, HUD toggle
- `extensions/skybox/skybox.svelte.ts` — preset applied
- `extensions/physics/physics.svelte.ts` — gravity changes, spawns, reset/clear actions
- `extensions/gltf-viewer/gltfViewer.svelte.ts` — model load, remove, animation changes
- `extensions/gltf-viewer/GltfViewerInstance.svelte` — GLTF scene loaded, clips discovered

### Physics (`extensions/physics/`)

Rapier-backed sandbox controls exposed through both reactive state and a Studio panel.

**State:** `physicsState`
- World: `gravityX/Y/Z`, `framerate`, `debug`
- Spawn defaults: restitution, friction, damping, gravity scale, CCD, sleep, random spawn
- Attractor: enabled flag, strength, range, gravity type, position
- Bodies: `PhysicsBody[]` with `ball`/`box`, color, spawn position, and per-body material values

**Key actions:**
```typescript
import { physicsActions } from '$extensions/physics/physics.svelte';

physicsActions.setGravityY(-9.8);
physicsActions.spawnBall();
physicsActions.spawnBox();
physicsActions.clearBodies();
physicsActions.toggleAttractor();
physicsActions.setAttractorGravityType('newtonian');
```

**Behavior notes:**
- Spawning a body auto-switches to `demoScene`
- Leaving `demoScene` clears spawned bodies in `Scene.svelte`
- `PhysicsExtension.svelte` is editor UI only; runtime logic stays in `physics.svelte.ts` and controller components

### GLTF Viewer (`extensions/gltf-viewer/`)

Dev-only (`VITE_GAME_ENGINE=true`) extension for loading and inspecting GLTF/GLB files. Always targets DemoScene — loading a model auto-switches to it.

**State:** `gltfViewerState.models: GltfViewerModel[]`, `selectedId: string | null`

**Each model has:**
- `position/rotation/scale` — transform (rotation in degrees)
- `animationClips: string[]` — populated after GLTF loads
- `activeAnimations: string[]` — multiple clips can play simultaneously (Three.js blending)
- `playState: 'playing' | 'paused' | 'stopped'` — paused keeps current frame; stopped resets to frame 0
- `animationSpeed`, `crossfadeDuration`, `loop`, `visible`

**Key actions:**
```typescript
import { gltfViewerActions } from '$extensions/gltf-viewer/gltfViewer.svelte';

gltfViewerActions.loadFromFile(file);          // Blob URL, auto-switches to DemoScene
gltfViewerActions.loadFromPath('/models/x.glb'); // Public asset path
gltfViewerActions.toggleAnimation(id, clipName); // Enable/disable a clip
gltfViewerActions.setPlayState(id, 'playing');   // 'playing' | 'paused' | 'stopped'
gltfViewerActions.setCrossfadeDuration(id, 0.3); // Seconds; 0 = instant cuts
```

**Crossfade / animation blending:**
- Enabling a clip → `action.fadeIn(crossfadeDuration)` — weight ramps 0→1
- Disabling a clip → `action.fadeOut(crossfadeDuration)` — weight ramps 1→0 naturally
- Re-enabling during fade-out → `action.fadeIn()` reverses the ongoing fade
- `crossfadeDuration = 0` → hard cuts (same as before)

**GltfViewerScene.svelte** — drop inside DemoScene (dev-only); renders one `GltfViewerInstance` per model. Each instance owns its own `useGltf` + `useGltfAnimations` lifecycle, preventing mixer conflicts between models.

### Input System (`extensions/input/` + `core/Keymapper.svelte`)

Action-based input mapping with keyboard, mouse, and gamepad support. Persists to localStorage. Works in production without Studio.

**`core/Keymapper.svelte`** — mounted once in `App.svelte`, owns all `<svelte:window>` event listeners:
- `keydown` / `keyup` → updates `inputState.runtime.keyboardPressed`
- `mousedown` / `mouseup` → updates `inputState.runtime.mousePressed`; skips UI elements (buttons, inputs, labels)
- `blur` → clears all pressed state to avoid stuck keys
- `Ctrl+H` is intercepted here as a global engine shortcut before input routing

**State:** `inputState`
- `players: Record<PlayerId, PlayerInputMap>` — per-player bindings (player1–player4)
- `capture` — transient rebinding UI state (active, target action, started time)
- `runtime` — transient pressed state (keyboardPressed, mousePressed, connectedGamepads)

**Player binding map:**
- `actions: Record<InputAction, AnyBinding[]>` — each action can have multiple bindings
- `axes: Record<InputAxisAction, GamepadAxisBinding | null>` — analog axis assignments
- `gamepad: { enabled, index, deadzoneLeftStick, deadzoneRightStick }`

**InputAction values:** `moveForward` `moveBackward` `moveLeft` `moveRight` `jump` `sprint` `interact` `primaryAction` `secondaryAction` `reload` `use` `crouch` `drop` `prone` `emote` `slot1`–`slot4` `pause` `toggleUi` `openSettings`

**InputAxisAction values:** `moveX` `moveY` `lookX` `lookY`

**Binding types:** `KeyboardBinding` (code) | `MouseBinding` (left/right/middle) | `GamepadButtonBinding` | `GamepadAxisBinding`

**Default player1 keyboard/mouse bindings:**
```
W/A/S/D + Arrows → movement    Space → jump       Shift → sprint
E → interact                   Q + RMB → secondary LMB → primary
R → reload                     F → use            C → crouch
X → drop                       Z → prone          T → emote
1–4 → slot1–slot4              Esc → pause        , → openSettings
```

**Key actions:**
```typescript
import { inputActions, inputQueries, inputState } from '$extensions/input/input.svelte';

// Gameplay queries
inputQueries.isPressed('player1', 'jump')           // boolean — current frame
inputQueries.wasPressed('player1', 'primaryAction') // boolean — edge detect (needs advanceInputFrame)
inputQueries.getMoveVector('player1')               // { x: number; y: number }
inputQueries.getAxis('player1', 'lookX')            // number

// Rebinding
inputActions.startCapture('player1', 'jump', 'action') // enter capture mode
inputActions.bindKeyboard('player1', 'jump', 'Space')
inputActions.bindMouse('player1', 'primaryAction', 'left')
inputActions.removeBinding('player1', 'jump', bindingId)
inputActions.resetAction('player1', 'jump')
inputActions.resetPlayerBindings('player1')
inputActions.resetAllInputSettings()
```

**`advanceInputFrame()`** — call once per frame task to enable `wasPressed` edge detection:
```typescript
import { advanceInputFrame } from '$extensions/input/input.svelte';
useTask(() => { advanceInputFrame(); });
```

**Persistence:** `spaceplate-input-settings` in localStorage — only player bindings and gamepad config, never transient pressed state.

**`SettingsHud.svelte`** — tabbed UI: **General** (graphics quality) | **Audio** (SFX/music/ambient) | **Controls** (full keybinding editor per action group with add/remove/reset per binding).

