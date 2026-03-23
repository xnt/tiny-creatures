---
name: tiny-creatures-content
description: >-
  Adds or edits creature types, moves (attacks), and species in Tiny Creatures.
  Use when the user asks for new types, monsters, creatures, moves, attacks, dex
  entries, learnsets, or type chart changes in this repository.
---

# Tiny Creatures — content authoring

## Preconditions

- Domain types live in `src/core/types.ts`.
- Move data: `src/data/attacks.ts`.
- Species data: `src/data/creatures.ts`.
- Procedural art: `ShapeDescriptor` on each species, consumed by `src/utils/creatureRenderer.ts` (only `circle` | `oval` | `square` | `diamond` | `triangle`, hex colors, boolean flags, `size` 0.5–1.5).

Run `npm run build` and `npm test` after substantive edits.

---

## Add a new move (attack)

1. Open `src/data/attacks.ts`.
2. Export a new `Attack` constant: `{ name, type: CreatureType.*, power, accuracy (0–100), description }`.
3. Append it to `ALL_ATTACKS` (used for lookups/tests).
4. Add the move to one or more species `learnableAttacks` arrays in `src/data/creatures.ts`. Each species pool should have **at least 4** moves so `pickRandomMoves` can fill a moveset.

No extra registration is required for battle logic if the move uses the standard `Attack` shape.

---

## Add a new species (“monster”)

1. Open `src/data/creatures.ts`.
2. Add an object to `CREATURE_DEX`:
   - **`id`**: unique slug (`lowercase`, no spaces), stable forever once shipped (save files reference `speciesId`).
   - **`name`**: display name.
   - **`type`**: `CreatureType` member.
   - **`baseStats`**: `{ hp, attack, defense, speed }` — modest numbers on the same scale as existing species (~35–75 HP bases, etc.).
   - **`learnableAttacks`**: array of **imports** from `./attacks` (e.g. `A.Ember`). Pool size ≥ **4**.
   - **`shape`**: valid `ShapeDescriptor` (see Preconditions).
   - **`description`**: one short flavor line.
3. Wild encounters: tall grass picks uniformly from **non-Water** species in `CREATURE_DEX`; fishing uses **Water-only**. No extra registration beyond adding the species row.
4. Run tests; add or extend assertions in `creatureFactory.test.ts` or data-focused tests if you introduce special rules.

---

## Add a new elemental type (high touch)

Adding `CreatureType` ripples through the **whole effectiveness matrix**.

1. **`src/core/types.ts`**
   - Add a new enum member to `CreatureType`.
   - Extend **`EFFECTIVENESS`** so **every** attacker row has **every** defender column (symmetric completeness). Use `0.5`, `1`, and `2` following existing patterns (e.g. triangle for Fire/Water/Grass; Dark↔Psychic↔Fighting).
   - `getEffectiveness` should need no code change if the matrix is complete.
2. **UI / copy** — Search for assumptions of “only four types” (`grep` / `CreatureType` / type labels in scenes). Update battle UI, dex filters, or README if present.
3. **`src/core/types.test.ts`** — Add cases for new interactions.
4. **Moves and species** — New type is useless without `Attack.type` and species `type` using the new enum value.

---

## Checklist (quick)

- [ ] Attacks: export + `ALL_ATTACKS` + referenced in at least one `learnableAttacks`.
- [ ] Species: unique `id`, ≥4 learnable moves, plausible `shape`.
- [ ] New type: enum + full `EFFECTIVENESS` grid + tests + any UI/README updates.
- [ ] `npm run build` && `npm test` pass.
