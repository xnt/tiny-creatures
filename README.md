# 🐾 Tiny Creatures

A Pokémon-inspired creature battling game built entirely with **Phaser 3**, **TypeScript**, and **Vite**. All visuals are generated with Phaser's graphics primitives — no external images required.

## Getting Started

```bash
npm install
npm run dev        # start dev server on http://localhost:3000
```

Other commands:

```bash
npm run build      # type-check + production build → dist/
npm run preview    # preview the production build
npm test           # run tests once
npm run test:watch # run tests in watch mode
```

## How to Play

1. **New Game** — pick a starter creature (Fire, Water, or Grass).
2. **Explore** — move with **WASD** or **Arrow keys**. Walk through the dark-green tall grass to trigger wild encounters.
3. **Battle** — choose from four actions:
   - ⚔ **Fight** — pick one of your creature's four moves.
   - 🎯 **Catch** — throw a capture orb (unlimited supply). Lower the wild creature's HP first for a better chance.
   - 🔄 **Switch** — swap to another party member (the enemy gets a free hit).
   - 🏃 **Run** — attempt to flee.
4. **Level up** — defeating wild creatures awards XP. Stats recalculate on each level up.
5. **Catch 'em all** — your party holds up to 6 creatures; extras go to the box.

Progress is saved to **localStorage** automatically after every battle.

## Type Chart

|              | vs Normal | vs Fire | vs Water | vs Grass |
|:-------------|:---------:|:-------:|:--------:|:--------:|
| **Normal →** | 1×        | 1×      | 1×       | 1×       |
| **Fire →**   | 1×        | ½×      | ½×       | **2×**   |
| **Water →**  | 1×        | **2×**  | ½×       | ½×       |
| **Grass →**  | 1×        | ½×      | **2×**   | ½×       |

## Creature Dex (20 species)

| #  | Name       | Type   | Description                                  |
|----|------------|--------|----------------------------------------------|
| 1  | Emberlynx  | Fire   | A fiery feline that prowls volcanic slopes.  |
| 2  | Pyrowl     | Fire   | An owl wreathed in perpetual flames.         |
| 3  | Magmite    | Fire   | A living lump of molten rock.                |
| 4  | Cinderpup  | Fire   | A playful pup that leaves embers in its wake.|
| 5  | Blazardon  | Fire   | A fearsome fire dragon that scorches the sky. |
| 6  | Splashlet  | Water  | A cheerful tadpole creature.                 |
| 7  | Tideclaw   | Water  | A crustacean with razor-sharp claws.         |
| 8  | Coralisk   | Water  | Coral growths form its armored shell.        |
| 9  | Drizzowl   | Water  | An owl that summons rain wherever it flies.  |
| 10 | Abyssail   | Water  | A deep-sea leviathan that commands the abyss.|
| 11 | Sproutail  | Grass  | A small lizard with a leafy tail.            |
| 12 | Thornbug   | Grass  | An insect covered in thorny armor.           |
| 13 | Bloomox    | Grass  | A bovine creature with flowers on its back.  |
| 14 | Fungowl    | Grass  | A mushroom-capped owl that drifts through forests. |
| 15 | Terravine  | Grass  | A walking tangle of vines with glowing eyes. |
| 16 | Fluffkit   | Normal | An impossibly fluffy kitten creature.        |
| 17 | Rumbear    | Normal | A large, sleepy bear that packs a wallop.    |
| 18 | Skychick   | Normal | A tiny chick that zooms through the sky.     |
| 19 | Ironsnout  | Normal | An armored boar with a metallic snout.       |
| 20 | Glimmouse  | Normal | A tiny glowing mouse, fast as lightning.     |

## Game Mechanics

- **Individual Values (IVs)** — each caught creature gets random 0–15 bonuses to HP, Attack, Defense, and Speed, making every individual unique.
- **Randomized Moves** — creatures learn 4 random moves from their species' pool upon creation.
- **Stat Formula** — `floor(((2 × base + iv) × level) / 100) + 5` (HP adds `+ level + 10` instead).
- **Damage Formula** — `((2L/5 + 2) × Power × A/D) / 50 + 2) × effectiveness × random(0.85–1.0)`.
- **Catch Rate** — `(1 − currentHP/maxHP) × 0.65 + 0.3` per shake (3 shakes needed). Ranges from ~2.7% at full HP to ~86% at 1 HP.
- **Wild Level Scaling** — when you have a single creature, wild encounters are always a lower level. With 2+ creatures, wilds spawn at party average ± 2.
- **XP Curve** — cubic: `floor(level³ × 0.8)`.

## Project Structure

```
src/
├── main.ts                       # Phaser game config & entry point
├── core/
│   ├── types.ts                  # Interfaces, enums, type chart
│   ├── creatureFactory.ts        # Creature instantiation, IVs, leveling
│   ├── battleEngine.ts           # Damage calc, turns, catching, XP
│   ├── saveManager.ts            # localStorage save / load / delete
│   ├── types.test.ts             # Type effectiveness tests
│   ├── creatureFactory.test.ts   # Factory, stats & data tests
│   └── battleEngine.test.ts      # Battle logic tests
├── data/
│   ├── attacks.ts                # 21 attacks across 4 types
│   └── creatures.ts              # 20 creature species definitions
├── utils/
│   └── creatureRenderer.ts       # Procedural creature drawing
└── scenes/
    ├── BootScene.ts              # Title screen
    ├── StarterSelectScene.ts     # Starter picker
    ├── OverworldScene.ts         # Tile map exploration + encounters
    ├── BattleScene.ts            # Battle UI + animations
    └── SettingsScene.ts          # Settings + Fresh Start
```

## Settings & Fresh Start

Open **⚙ Settings** from the title screen or the in-game menu bar. The **Fresh Start** button wipes all localStorage data after a confirmation prompt — handy for starting over.

## Tech Stack

- **[Phaser 3](https://phaser.io/)** — game framework (rendering, input, tweens, scenes)
- **[TypeScript](https://www.typescriptlang.org/)** — type-safe game logic
- **[Vite](https://vitejs.dev/)** — dev server & bundler
- **[Vitest](https://vitest.dev/)** — unit tests (46 tests across 3 suites)

## License

ISC