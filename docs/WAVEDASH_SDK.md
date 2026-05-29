# Wavedash SDK — Mouse Hole Reference

Quick reference for the features we'll actually use. Full docs at https://docs.wavedash.com.

---

## Setup

```ts
import Wavedash from '@wvdsh/sdk-js';

// Call during async loading (0.0 → 1.0), then init() when ready to play.
Wavedash.updateLoadProgressZeroToOne(progress);
Wavedash.init({ debug: true }); // removes the Wavedash loading screen
```

`init()` is **required** — game stays hidden until it's called.

---

## Player Identity

```ts
const user     = Wavedash.getUser();
const id       = Wavedash.getUserId();
const username = Wavedash.getUsername();
```

Call `listFriends()` early to populate the username cache for other players.

---

## Leaderboards

Two boards. The main score is **furniture items collected** — most items wins, and time breaks ties. Survival time is a separate secondary board.

### Board definitions

| Name | Sort | Display | What it tracks |
|------|------|---------|----------------|
| `"items-collected"` | DESC | NUMERIC | **Main score** — furniture items banked in a single run |
| `"survival-time"` | DESC | TIME_MILLISECONDS | Secondary — how long the player survived before dying or quitting |

### Startup — resolve names to IDs once

```ts
const [itemsLb, timeLb] = await Promise.all([
  Wavedash.getOrCreateLeaderboard(
    'items-collected',
    Wavedash.LeaderboardSortOrder.DESC,
    Wavedash.LeaderboardDisplayType.NUMERIC
  ),
  Wavedash.getOrCreateLeaderboard(
    'survival-time',
    Wavedash.LeaderboardSortOrder.DESC,
    Wavedash.LeaderboardDisplayType.TIME_MILLISECONDS
  ),
]);

const itemsLbId = itemsLb.success ? itemsLb.data.id : null;
const timeLbId  = timeLb.success  ? timeLb.data.id  : null;
```

### Submit at end of run

```ts
// Call when the run ends (player dies, starves, or returns to hole and quits)
async function submitRunScore(itemsCollected: number, survivalMs: number) {
  await Promise.all([
    Wavedash.uploadLeaderboardScore(itemsLbId, itemsCollected, true), // keepBest: most items
    Wavedash.uploadLeaderboardScore(timeLbId,  survivalMs,     true), // keepBest: longest time
  ]);
}
```

`keepBest: true` means the score only updates if this run beats the player's current personal best on each board independently.

### Fetching scores

```ts
// Top 10 on the main (items) board
const top = await Wavedash.listLeaderboardEntries(itemsLbId, 0, 10, false);
top.data.forEach(e => console.log(`#${e.globalRank} ${e.username}: ${e.score} items`));

// Player's own entry on both boards
const myItems = await Wavedash.getMyLeaderboardEntries(itemsLbId);
const myTime  = await Wavedash.getMyLeaderboardEntries(timeLbId);

// Scores around the current player (5 above, 5 below)
const nearby = await Wavedash.listLeaderboardEntriesAroundUser(itemsLbId, 5, 5, false);
```

---

## Cloud Save (userfs) — Cosmetic Persistence

Cosmetics are permanent across sessions — use cloud save to persist them.

```ts
// Save collection state
const bytes = new TextEncoder().encode(JSON.stringify(collectionData));
await Wavedash.writeLocalFile('save/collection.json', bytes);
await Wavedash.uploadRemoteFile('save/collection.json'); // sync to cloud

// Load on startup
await Wavedash.downloadRemoteFile('save/collection.json');
const bytes = await Wavedash.readLocalFile('save/collection.json');
const data  = JSON.parse(new TextDecoder().decode(bytes));
```

---

## Achievements

Define in Developer Portal. Trigger manually or via stat threshold.

```ts
Wavedash.setAchievement('first_cosmetic', true);        // manual unlock
const unlocked = Wavedash.getAchievement('first_cosmetic');
```

**Suggested achievements for Mouse Hole:**

| ID | Name | Condition |
|----|------|-----------|
| `first_cosmetic` | Home Sweet Home | Bring home your first cosmetic |
| `close_call` | Whisker Distance | Escape the cat with < 10% hunger |
| `survivor` | Lucky Mouse | Survive 10 runs |
| `full_house` | The Coziest Hole | Collect every cosmetic |
| `starved` | Empty Belly | Die of starvation once |

---

## Stats

Define in Developer Portal → In-Game Stats. Persist across sessions.

```ts
await Wavedash.requestStats(); // fetch on startup

const kills = Wavedash.getStat('total_catches') ?? 0;
Wavedash.setStat('total_catches', kills + 1, true); // storeNow = true → debounced flush

Wavedash.storeStats(); // explicit flush (e.g. on run end)
```

**Suggested stats for Mouse Hole:**

| ID | Description |
|----|-------------|
| `runs_completed` | Total runs finished (returned to hole) |
| `total_catches` | Total times caught by the cat |
| `total_starved` | Total starvation deaths |
| `cosmetics_collected` | Lifetime cosmetics banked |
| `food_eaten_outside` | Times ate food out in the house (risky!) |

Listen for store confirmation:

```ts
Wavedash.on(Wavedash.Events.STATS_STORED, ({ success }) => {
  if (!success) console.warn('Stats failed to save');
});
```

---

## Presence (optional, nice touch)

```ts
// While in the hole
await Wavedash.updateUserPresence({ status: 'Hiding in the hole', details: 'Mouse Hole' });

// While out foraging
await Wavedash.updateUserPresence({ status: 'Foraging...', details: 'Run #4' });

// On game over
await Wavedash.updateUserPresence({});
```

---

## wavedash.toml

```toml
game_id    = "YOUR_GAME_ID_HERE"
upload_dir = "./dist"
```

Build with `npm run build`, deploy with `wavedash deploy`.
