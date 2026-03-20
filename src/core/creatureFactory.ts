import { CreatureInstance, CreatureSpecies, Attack, BaseStats } from './types';
import { getSpeciesById } from '../data/creatures';

let uidCounter = Date.now();

function nextUid(): string {
  return `c_${uidCounter++}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Generate random IVs (0-15 for each stat) */
export function randomIVs(): BaseStats {
  return {
    hp: Math.floor(Math.random() * 16),
    attack: Math.floor(Math.random() * 16),
    defense: Math.floor(Math.random() * 16),
    speed: Math.floor(Math.random() * 16),
  };
}

/** Calculate a stat value from base + IV + level */
export function calcStat(base: number, iv: number, level: number, isHp: boolean): number {
  // Simplified stat formula inspired by Pokemon
  if (isHp) {
    return Math.floor(((2 * base + iv) * level) / 100) + level + 10;
  }
  return Math.floor(((2 * base + iv) * level) / 100) + 5;
}

/** Pick N random attacks from the species' learnable pool */
export function pickRandomMoves(species: CreatureSpecies, count: number = 4): Attack[] {
  const pool = [...species.learnableAttacks];
  const chosen: Attack[] = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    chosen.push(pool.splice(idx, 1)[0]);
  }
  return chosen;
}

/** XP needed to reach a given level */
export function xpForLevel(level: number): number {
  return Math.floor(level * level * level * 0.8);
}

/** XP gained from defeating a creature */
export function xpFromBattle(defeatedLevel: number): number {
  return Math.floor(defeatedLevel * 12 + 20);
}

/** Create a new creature instance from a species at a given level */
export function createCreature(speciesId: string, level: number, nickname?: string): CreatureInstance {
  const species = getSpeciesById(speciesId);
  if (!species) throw new Error(`Unknown species: ${speciesId}`);

  const ivs = randomIVs();
  const hp = calcStat(species.baseStats.hp, ivs.hp, level, true);

  return {
    uid: nextUid(),
    speciesId,
    nickname: nickname ?? species.name,
    level,
    xp: xpForLevel(level),
    currentHp: hp,
    maxHp: hp,
    attack: calcStat(species.baseStats.attack, ivs.attack, level, false),
    defense: calcStat(species.baseStats.defense, ivs.defense, level, false),
    speed: calcStat(species.baseStats.speed, ivs.speed, level, false),
    moves: pickRandomMoves(species),
    ivs,
  };
}

/** Recalculate stats after leveling up */
export function recalcStats(creature: CreatureInstance): void {
  const species = getSpeciesById(creature.speciesId);
  if (!species) return;

  const oldMaxHp = creature.maxHp;
  creature.maxHp = calcStat(species.baseStats.hp, creature.ivs.hp, creature.level, true);
  creature.attack = calcStat(species.baseStats.attack, creature.ivs.attack, creature.level, false);
  creature.defense = calcStat(species.baseStats.defense, creature.ivs.defense, creature.level, false);
  creature.speed = calcStat(species.baseStats.speed, creature.ivs.speed, creature.level, false);

  // Heal proportionally on level up
  const hpGain = creature.maxHp - oldMaxHp;
  creature.currentHp = Math.min(creature.maxHp, creature.currentHp + hpGain);
}

/** Try to level up a creature. Returns true if it leveled. */
export function tryLevelUp(creature: CreatureInstance): boolean {
  const needed = xpForLevel(creature.level + 1);
  if (creature.xp >= needed) {
    creature.level++;
    recalcStats(creature);
    return true;
  }
  return false;
}