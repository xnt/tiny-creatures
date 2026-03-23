# AGENTS.md — Tiny Creatures

This document is for **autonomous coding agents** (and humans who think like them). It describes the game as a system, names the authoritative files, and suggests how to trace behavior through the codebase.

## What this project is

A browser game (Phaser 3 + TypeScript + Vite): overworld movement, random encounters, turn-based battles, catching, party/box, procedural creature sprites, and **localStorage** persistence. There is **no backend**; all state lives in `SaveData` (`src/core/types.ts`).

## Layered architecture

Read the repo in this order when orienting:

1. **`src/core/types.ts`** — Domain model: `CreatureType`, `Attack`, `CreatureSpecies`, `CreatureInstance`, `SaveData`, save version. The type-effectiveness matrix and `getEffectiveness()` live here.
2. **`src/data/`** — Content tables only: `attacks.ts` (move definitions + `ALL_ATTACKS`), `creatures.ts` (`CREATURE_DEX`, `getSpeciesById`). No gameplay logic.
3. **`src/core/creatureFactory.ts`** — Turns species + level into instances: IVs, stat formula, random 4 moves from `learnableAttacks`, XP/level helpers. Uses `RandomSource` for testability (`src/core/random.ts`).
4. **`src/core/battleEngine.ts`** — Pure battle rules: damage (uses `getEffectiveness`), accuracy, turn order, catch rolls, XP awards, blackout. Scene code calls into this; keep heavy logic here when possible.
5. **`src/core/saveManager.ts`** — Serialize/deserialize `SaveData` to `localStorage`, version migrations.
6. **`src/core/eventBus.ts`** — Typed pub/sub for cross-scene flows (`GameEvents`, `gameEvents`). Overworld/battle/menu subscribe and publish instead of tight circular imports.
7. **`src/scenes/*.ts`** — Phaser scenes: input, layout, tweens, wiring to core systems.
8. **`src/scenes/systems/*.ts`** — Extracted subsystems (encounters, battle state machine, overworld hub/menu, touch, map items). Prefer adding **tested** logic here over bloating a scene file.
9. **`src/utils/creatureRenderer.ts`** — Draws creatures from `ShapeDescriptor` (colors, body shape flags). New species need valid `shape` data.

**Rule of thumb:** If a change affects **numbers or rules**, look in `core/` (and `data/` for constants). If it affects **what the player sees or clicks**, look in `scenes/` and `utils/`.

## Runtime flow (high level)

1. **`main.ts`** registers Phaser scenes in boot order: `BootScene` → `StarterSelectScene` → `OverworldScene`, plus modal/navigation scenes (`BattleScene`, `SettingsScene`, `PartyScene`, `CreatureDexScene`, `CreatureDetailScene`).
2. **New game:** starter choice creates initial party via `createCreature`, then persists through `saveManager`.
3. **Overworld:** tile-based map; `EncounterSystem` rolls encounters on tall grass / water, emits `encounter:started` on the event bus, scene launches `BattleScene` with the wild instance.
4. **Battle:** UI + animation in `BattleScene`; turn resolution uses `battleEngine`. Outcomes emit `battle:won` | `battle:lost` | `battle:caught` | `battle:fled`; listeners update `SaveData` and fire `save:changed`.
5. **Autosave:** after battles (and other events per scene), save is written so refresh does not lose progress.

When debugging a battle bug, trace: **UI event → battleEngine input → resulting state → save/event**. When debugging missing content, trace: **`CREATURE_DEX` / attacks → factory → scene that lists species**.

## Data vs instances

- **`CreatureSpecies`** — Template row in `CREATURE_DEX`: `id`, `baseStats`, `learnableAttacks`, `shape`, `description`.
- **`CreatureInstance`** — Runtime creature: `uid`, `speciesId`, computed stats, `moves` (4 picked from pool at creation), `ivs`.

IDs are **string slugs** (e.g. `emberlynx`), not numeric national dex numbers.

## Tests

Vitest + happy-dom. **Pure logic** (`battleEngine`, `creatureFactory`, `types`, `saveManager`, `eventBus`, scene systems) has unit tests beside or under the same paths as `*.test.ts`. Prefer exercising new rules with tests in `core/` before relying on manual play.

Run: `npm test`.

## Common agent tasks (where to edit)

| Task | Primary files |
|------|----------------|
| New move | `src/data/attacks.ts` (`ALL_ATTACKS` + export) |
| New species | `src/data/creatures.ts` (`CREATURE_DEX` entry, `shape`, pool ≥ 4 moves) |
| New elemental type | `src/core/types.ts` (`CreatureType` + full `EFFECTIVENESS` matrix) + any UI that assumes a fixed type set |
| Change damage / catch / XP | `src/core/battleEngine.ts`, tests in `battleEngine.test.ts` |
| Change stats / level curve | `src/core/creatureFactory.ts`, `types.ts` formulas |
| Save format change | `SAVE_VERSION`, `saveManager.ts`, migration if needed |
| New scene-wide signal | `src/core/eventBus.ts` (`GameEvents`) |

For detailed content-authoring steps, use the project skill **tiny-creatures-content** (`.cursor/skills/tiny-creatures-content/SKILL.md`).

## Conventions

- Match existing import style and naming; keep **data** declarative and **core** free of Phaser imports where possible.
- After changing `CreatureType` or `Attack` shapes, run `npm run build` and `npm test`.
- Do not edit `~/.cursor/skills-cursor/` (Cursor-managed). Project skills belong under `.cursor/skills/`.
