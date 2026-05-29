# Mouse Hole — Core Game Loop

> You are a mouse. Your hole is the safest place in the world. Every run is about how far you dare to leave it.

---

## 1. Concept

**Mouse Hole** is a 3D stealth collection game. You play as a mouse living in a cozy hole inside a house shared with a cat. Your goal: explore the house, find cosmetic items, and bring them home to make your hole feel like *yours*. But you need to eat — hunger is always ticking down. Find food, eat it to survive, keep searching. Just don't get caught by the cat.

**Tone:** Slapstick tension. Not horror. Think Tom & Jerry — the cat is dangerous but ridiculous. The stakes feel real, the vibe is cartoon.

**Perspective:** Third-person — camera sits behind and slightly above the mouse, looking forward. Like a racing game. You see what's ahead of you, not what's behind you. The cat chasing you from off-screen is a feature, not a bug.

---

## 2. Core Loop

```
┌──────────────────────────────────────────────────┐
│                    CORE LOOP                      │
│                                                  │
│  ┌─────────┐    ┌──────────┐    ┌─────────────┐ │
│  │  SAFE    │───▶│  FORAGE  │───▶│   RETURN    │ │
│  │  (hole)  │    │  (house) │    │   (hole)    │ │
│  └─────────┘    └──────────┘    └─────────────┘ │
│       ▲                               │         │
│       └───────────────────────────────┘         │
│              (survived = next run)               │
│                                                  │
│  Caught by cat ──▶ Lose a life / Game Over       │
└──────────────────────────────────────────────────┘
```

### 2.1 Phase 1 — Safe (Mouse Hole)

- Player starts (and respawns) inside the mouse hole.
- The hole is a safe zone — the cat cannot enter.
- Player can see their growing collection of cosmetic items decorating the space.
- Hunger pauses inside the hole — it's the only place you can breathe.
- Player can eat food from their stash here safely (no movement lock, no danger).
- Player initiates a run by leaving the hole.

**What the player does here:**
- Admire their collection — each cosmetic makes the hole cozier
- Check which items are still missing
- Eat stored food to top off hunger before venturing out
- Decide to start a new run

### 2.2 Phase 2 — Forage (The House)

- The player navigates the house interior (2–3 connected rooms).
- **Hunger is always draining.** If it hits 0, the mouse dies.
- **Food items** are scattered around — you need them to survive.
- **Cosmetic items** are the real prize — hidden in harder-to-reach spots.
- The cat patrols the house with sight and sound detection (see §4).
- Player must manage hunger while searching for cosmetics.

**What the player does here:**
- Navigate around furniture and obstacles
- Watch the cat's patrol pattern
- Pick up food and cosmetic items
- Decide when to eat and when to push deeper
- Manage the tension between hunger, distance from hole, and cat proximity

**Pickup rules:**
- Player can carry **one food item** and **one cosmetic item** at a time.
- Cosmetics must be physically carried back to the hole to be collected.
- Food has two options (see §6 — Hunger & Eating).

### 2.3 Phase 3 — Return (Mouse Hole)

- Player must physically carry cosmetics back to the mouse hole entrance to bank them.
- Food brought home goes into the stash — can be eaten later in safety.
- The run continues until the player chooses to stay in the hole (ending the run) or dies.
- Every trip home is a calculation: is my hunger low enough to go back out?

---

## 3. Run Structure & Progression

Each run is a single excursion. Runs chain together to form a session.

### Run Lifecycle

1. **Run starts** — player leaves the hole. Food and cosmetics spawn for this run.
2. **Run active** — player forages, avoids cat, returns to hole to bank items.
3. **Run ends** — player chooses to end the run while safe in the hole, or dies.

### Between Runs (Progression)

- **Cat gets smarter** — patrol routes tighten, detection cones widen, reaction speed increases.
- **Food spawns further away** — the easy pickups near the hole get replaced by distant spawns.
- **Difficulty tier advances** — the game communicates this subtly (cat looks angrier, music shifts, room lighting changes).
- **Cosmetic collection grows** — each item you bring home is permanent. Your hole tells the story of your runs.

The goal of the game is to collect **all cosmetics**. Each one you bring home makes the hole more yours. The cat escalating is the price you pay for getting greedier.

There is no explicit level select. The game is one continuous escalation. The player's skill and knowledge of the cat's AI patterns is their only progression mechanic.

### Death & Game Over

The mouse can die two ways:

1. **Caught by the cat** — cartoon catch animation, lose a life.
2. **Starvation** — hunger hits 0, the mouse collapses. Also costs a life.

- Player has **3 lives** (represented visually — e.g., 3 tiny hearts).
- Dying costs 1 life and ends the current run. Player respawns in the hole with hunger partially restored.
- Losing all 3 lives = **Game Over**. Session resets. Cosmetic collection is kept, food stash is partially kept, difficulty tier soft-resets (cat chills out slightly).
- Cosmetics collected are **permanent** across everything. They're yours forever.

---

## 4. Cat AI

The cat is the single source of danger. It should feel threatening but dumb.

### Detection Model

| Sense     | Shape         | Range   | Trigger                            |
| --------- | ------------- | ------- | ---------------------------------- |
| **Sight** | Forward cone  | Medium  | Mouse enters cone unobstructed     |
| **Sound** | Radius circle | Short   | Mouse sprints or knocks into things|

- **Sight cone:** ~90° forward, medium range. Broken by line-of-sight (furniture, walls).
- **Sound radius:** Small circle around the mouse. Only triggered by sprinting or bumping objects.
- **Walking is silent.** Sprinting is loud but fast. This is the core tension.

### Cat Behavior States

```
┌───────────┐     sees mouse     ┌──────────┐
│  PATROL   │───────────────────▶│  ALERT   │
│  (wander) │◀──── loses sight ──│ (chase)  │
└───────────┘                    └────┬─────┘
                                      │ catches mouse
                                      ▼
                                 ┌──────────┐
                                 │  CATCH   │
                                 │ (attack) │
                                 └──────────┘
```

- **Patrol** — walks between waypoints. Pauses occasionally. Sometimes does funny things (scratches itself, gets distracted by something on the floor, walks into a chair).
- **Alert** — locks onto the mouse's last known position and rushes there. If mouse breaks line-of-sight and stays hidden, cat searches the area briefly then returns to patrol.
- **Catch** — cat reaches the mouse. Cartoon catch animation plays. Player loses a life.

### Cat Personality (The Dumb Factor)

The cat should never feel like a perfect predator. It should feel like a cat — dangerous but easily distracted. Specific behaviors:

- **Idle animations during patrol:** stretching, licking paw, staring at nothing.
- **Distraction events:** occasionally stops to bat at something on the floor, giving the player a window.
- **Clumsiness:** sometimes misjudges turns, bumps into furniture, pauses to shake it off.
- **Curiosity:** if a cosmetic item is nearby and cat is not alert, it might walk over to sniff it (creating temporary safe passage elsewhere).

These are not just flavor — they are **mechanical opportunities** the player can learn and exploit.

---

## 5. The House (Level Design)

### Layout

- **2–3 rooms** connected by doorways/hallways.
- The **mouse hole** is in the baseboard of one room (starting room).
- Rooms have furniture that blocks both movement and line-of-sight.
- The layout is fixed — the player learns it over runs.

### Key Spaces

| Space          | Purpose                                        |
| -------------- | ---------------------------------------------- |
| Starting room  | Contains mouse hole. Safe zone nearby.         |
| Kitchen        | Primary food spawns. Highest cat traffic.      |
| Living room    | Mixed food + cosmetics. Obstacles for hiding.  |
| Hallway        | Connector. Exposed. High risk transit.         |

### Objects

- **Furniture** — blocks movement and sight. Can hide behind couches, under tables.
- **Small objects** — can be bumped into while sprinting, creating noise (triggers cat's sound detection).
- **Food spawn points** — marked locations where food appears each run.
- **Cosmetic spawn points** — harder-to-reach spots (on top of shelves, behind the cat's patrol route).

---

## 6. Player Mechanics

### Movement

| Action  | Speed   | Sound  | Use                          |
| ------- | ------- | ------ | ---------------------------- |
| Walk    | Normal  | Silent | Safe exploration             |
| Sprint  | Fast    | Loud   | Emergency escapes / gambles  |

Two speeds, one tradeoff. That's it.

### Interaction

- **Pick up** — walk over an item to grab it (auto-pickup).
- **Drop off** — walk to hole entrance to bank cosmetics or store food.
- **No combat, no tools, no abilities.** The mouse is a mouse. Run and hide.

### Hunger & Eating

Hunger is a constant pressure. It drains over time while you're outside the hole. It **pauses** when you're inside.

| Stat          | Value                          |
| ------------- | ------------------------------ |
| Max hunger    | 100                            |
| Drain rate    | Slow but constant (tuned per difficulty) |
| Death         | Hunger reaches 0 = lose a life |
| In hole       | Hunger pauses, no drain        |

**Two ways to eat food:**

| Where         | How it works                                                    |
| ------------- | --------------------------------------------------------------- |
| **In the hole** | Eat from your stash. Safe. No movement lock. Just top off and go. |
| **Out in the house** | Eat immediately (carried food). **You freeze in place** while eating — can't move, can't run, can't hide. A sitting duck. The eat animation takes ~2 seconds. Hope the cat isn't nearby. |

This is the key decision: eat now and risk it, or carry it home and eat safe but burn more hunger on the trip back. Food eaten outside restores less than food eaten at home (nervous eating isn't as satisfying).

---

## 7. Collectibles

### Food (Survival)

- **Purpose:** keep the mouse alive. Food is not score, it's fuel.
- **Two outcomes for picked-up food:**
  - **Eat on the spot** — restores hunger immediately, but you freeze for ~2 seconds. Risky.
  - **Bring home** — stores in the hole's stash. Can be eaten safely later. Restores more hunger than eating outside.
- **Food types:**
  - **Crumb** (common, near hole) — small hunger restore
  - **Cheese chunk** (medium distance) — medium hunger restore
  - **Full cheese** (far, high risk) — large hunger restore
- Food spawns are randomized within designated spawn points each run.
- The house always has enough food to survive — but it's never where you want it to be.

### Cosmetics (The Goal)

- **Purpose:** this is the whole point. Collect them all to make your hole feel like home.
- **Examples:** tiny rug, mini painting, bottle cap, thimble, lost earring, postage stamp, matchbox, Lego piece, button, sequin, paperclip, band-aid.
- Must be physically carried back to the hole — no teleporting, no banking remotely.
- Once brought home, they're **yours forever**. Permanent across all sessions.
- They appear in your hole automatically (arrangement is a stretch goal for later).
- Placed in the hardest spots — behind cat patrol routes, at the far end of the house, in exposed areas.
- The collection screen shows found/unfound — the player always knows what they're missing.
- **Collecting all cosmetics = game completion.** The hole is fully decorated. You did it. (Then you can keep playing for high-score runs if you want.)

---

## 8. Game Feel Targets

| Aspect         | Target                                              |
| -------------- | --------------------------------------------------- |
| **Tension**    | Holding your breath when the cat walks past, or your hunger is low and you're far from home |
| **Relief**     | Ducking behind a couch just in time, or getting that last bite in before starvation |
| **Humor**      | The cat being an idiot, you barely escaping, eating cheese while frozen in danger |
| **Reward**     | Seeing your hole get cozier with each cosmetic brought home |
| **Addiction**  | "One more run" — just need one more cosmetic, one more trip |
| **Sound**      | Cartoon footsteps, squeaks, dramatic sting when spotted |

---

## 9. Scope Notes

This document describes the **complete core game**. Everything listed here is the target for a polished, shippable experience. Out of scope:

- Multiplayer
- Procedural level generation
- Story / narrative
- Multiple levels (one house is the game)
- Upgrades or skill trees

The depth comes from the cat AI and the player's growing mastery of the space. One mechanic, infinite depth.
