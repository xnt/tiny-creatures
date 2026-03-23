import Phaser from 'phaser';
import { SaveData, CreatureType } from '../../core/types';
import { CREATURE_DEX } from '../../data/creatures';
import { createCreature } from '../../core/creatureFactory';
import { RandomSource, defaultRandom } from '../../core/random';
import { EventBus, gameEvents } from '../../core/eventBus';

/** Terrain types used for encounters */
export enum Terrain {
  Grass,
  TallGrass,
  Water,
  Path,
  Tree,
}

export const TERRAIN_COLORS: Record<Terrain, number> = {
  [Terrain.Grass]: 0x4caf50,
  [Terrain.TallGrass]: 0x2e7d32,
  [Terrain.Water]: 0x1976d2,
  [Terrain.Path]: 0xbcaaa4,
  [Terrain.Tree]: 0x1b5e20,
};

/** Configuration for encounter behavior */
export interface EncounterConfig {
  encounterChance: number;
  encounterCooldownMs: number;
}

const DEFAULT_CONFIG: EncounterConfig = {
  encounterChance: 0.008,
  encounterCooldownMs: 2000,
};

/**
 * Handles random encounter logic for different terrain types.
 * Supports tall grass and water encounters with configurable rates.
 */
export class EncounterSystem {
  private scene: Phaser.Scene;
  private save: SaveData;
  private config: EncounterConfig;
  private random: RandomSource;
  private events: EventBus;
  private cooldown = 0;

  constructor(
    scene: Phaser.Scene,
    save: SaveData,
    config: EncounterConfig = DEFAULT_CONFIG,
    random: RandomSource = defaultRandom,
    events: EventBus = gameEvents,
  ) {
    this.scene = scene;
    this.save = save;
    this.config = config;
    this.random = random;
    this.events = events;
  }

  /**
   * Updates the encounter cooldown. Call this every frame.
   */
  updateCooldown(delta: number): void {
    if (this.cooldown > 0) {
      this.cooldown -= delta;
    }
  }

  /**
   * Checks if an encounter should trigger based on terrain and movement.
   * @param playerX - Player's world X position
   * @param playerY - Player's world Y position
   * @param isMoving - Whether the player is currently moving
   * @param map - The terrain map
   * @param tileSize - Size of each tile in pixels
   * @returns true if an encounter was triggered
   */
  checkEncounter(
    playerX: number,
    playerY: number,
    isMoving: boolean,
    map: Terrain[][],
    tileSize: number,
  ): { triggered: boolean; waterEncounter: boolean } {
    if (this.cooldown > 0 || !isMoving) {
      return { triggered: false, waterEncounter: false };
    }

    const tx = Math.floor(playerX / tileSize);
    const ty = Math.floor(playerY / tileSize);
    const terrain = map[ty]?.[tx];

    if (terrain === Terrain.TallGrass && this.random.chance(this.config.encounterChance)) {
      return { triggered: true, waterEncounter: false };
    }

    return { triggered: false, waterEncounter: false };
  }

  /**
   * Triggers a wild encounter and transitions to battle scene.
   * @param waterEncounter - Whether this is a water (fishing) encounter
   * @param playerX - Player's world X position (for save)
   * @param playerY - Player's world Y position (for save)
   */
  triggerEncounter(waterEncounter: boolean, playerX: number, playerY: number): void {
    this.cooldown = this.config.encounterCooldownMs;

    // Determine average party level for scaling
    const avgLevel = Math.max(
      3,
      Math.round(this.save.party.reduce((sum, c) => sum + c.level, 0) / this.save.party.length),
    );

    // Pick random species - exclude water creatures from tall grass
    let availableSpecies = CREATURE_DEX;
    if (!waterEncounter) {
      // In tall grass, exclude water-type creatures
      availableSpecies = CREATURE_DEX.filter((s) => s.type !== CreatureType.Water);
    } else {
      // Fishing encounters are water-type only
      availableSpecies = CREATURE_DEX.filter((s) => s.type === CreatureType.Water);
    }

    const species = this.random.randomElement(availableSpecies)!;

    // Wild creature level: avgLevel ± 2, but when the player only has
    // a single creature the wild level is always strictly lower.
    let wildLevel: number;
    if (this.save.party.length === 1) {
      const maxWild = Math.max(2, avgLevel - 1);
      wildLevel = Phaser.Math.Clamp(
        maxWild - this.random.randomInt(0, 3), // 0-2 below cap
        2,
        maxWild,
      );
    } else {
      wildLevel = Phaser.Math.Clamp(avgLevel + this.random.randomInt(0, 5) - 2, 2, 50);
    }
    const wildCreature = createCreature(species.id, wildLevel);

    // Save position
    this.save.playerX = playerX;
    this.save.playerY = playerY;

    // Emit encounter:started event
    this.events.emit('encounter:started', {
      playerX,
      playerY,
      wildCreature,
      isWaterEncounter: waterEncounter,
    });

    this.scene.scene.start('BattleScene', {
      save: this.save,
      wildCreature,
    });
  }

  /**
   * Forces an encounter cooldown (e.g., after fleeing from battle).
   */
  setCooldown(ms: number): void {
    this.cooldown = ms;
  }

  /**
   * Returns true if currently in encounter cooldown.
   */
  isInCooldown(): boolean {
    return this.cooldown > 0;
  }
}
