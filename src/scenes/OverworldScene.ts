import Phaser from 'phaser';
import { SaveData } from '../core/types';
import {
  EncounterSystem,
  OverworldHub,
  OverworldMenuController,
  TouchInputController,
  MapItemSystem,
  Terrain,
  TERRAIN_COLORS,
} from './systems';
import { RandomSource, defaultRandom } from '../core/random';

const TILE = 32;
const MAP_W = 25;
const MAP_H = 19;
const PLAYER_SPEED = 160;

export class OverworldScene extends Phaser.Scene {
  private save!: SaveData;
  private player!: Phaser.GameObjects.Graphics;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private map: Terrain[][] = [];
  private playerVelX = 0;
  private playerVelY = 0;
  private random: RandomSource = defaultRandom;

  // Systems
  private encounterSystem!: EncounterSystem;
  private hub!: OverworldHub;
  private menuController!: OverworldMenuController;
  private touchInput!: TouchInputController;
  private mapItemSystem!: MapItemSystem;

  constructor() {
    super({ key: 'OverworldScene' });
  }

  init(data: { save: SaveData }): void {
    this.save = data.save;
  }

  create(): void {
    this.generateMap();
    this.drawMap();

    // Initialize systems
    this.encounterSystem = new EncounterSystem(this, this.save);
    this.touchInput = new TouchInputController(this);
    this.mapItemSystem = new MapItemSystem(this, this.save, this.map, TILE, MAP_W, MAP_H);
    this.mapItemSystem.placeItems();

    // Player character (simple triangle)
    this.player = this.add.graphics();
    this.player.setPosition(this.save.playerX, this.save.playerY);
    this.drawPlayer();

    // Input
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }

    // Initialize HUD and menu (needs to be after player is created for callbacks)
    this.hub = new OverworldHub(this, this.save, () => this.menuController.toggleMainMenu());
    this.menuController = new OverworldMenuController(
      this,
      this.save,
      () => ({ x: this.player.x, y: this.player.y }),
      () => this.isNearWater(),
      (water) => this.triggerEncounter(water),
    );
  }

  update(_time: number, delta: number): void {
    // Close popup if clicking outside
    if (this.menuController.isPopupVisible()) return; // Pause game while popup is open

    // Movement
    this.playerVelX = 0;
    this.playerVelY = 0;

    const dpadDir = this.touchInput.getDirection();
    const left = this.cursors?.left.isDown || this.wasd?.A.isDown || dpadDir.x < 0;
    const right = this.cursors?.right.isDown || this.wasd?.D.isDown || dpadDir.x > 0;
    const up = this.cursors?.up.isDown || this.wasd?.W.isDown || dpadDir.y < 0;
    const down = this.cursors?.down.isDown || this.wasd?.S.isDown || dpadDir.y > 0;

    if (left) this.playerVelX = -PLAYER_SPEED;
    else if (right) this.playerVelX = PLAYER_SPEED;
    if (up) this.playerVelY = -PLAYER_SPEED;
    else if (down) this.playerVelY = PLAYER_SPEED;

    const dt = delta / 1000;
    let nx = this.player.x + this.playerVelX * dt;
    let ny = this.player.y + this.playerVelY * dt;

    // Clamp to map bounds
    nx = Phaser.Math.Clamp(nx, TILE, MAP_W * TILE - TILE);
    ny = Phaser.Math.Clamp(ny, TILE + 30, MAP_H * TILE - TILE);

    // Collision check — block trees and water
    const tileX = Math.floor(nx / TILE);
    const tileY = Math.floor(ny / TILE);
    if (tileX >= 0 && tileX < MAP_W && tileY >= 0 && tileY < MAP_H) {
      const terrain = this.map[tileY]?.[tileX];
      if (terrain !== Terrain.Tree && terrain !== Terrain.Water) {
        this.player.setPosition(nx, ny);
      }
    }

    // Check for item pickups
    this.mapItemSystem.checkPickups(this.player.x, this.player.y);

    // Encounter check
    this.encounterSystem.updateCooldown(delta);
    if (this.isMoving()) {
      const result = this.encounterSystem.checkEncounter(
        this.player.x,
        this.player.y,
        this.isMoving(),
        this.map,
        TILE,
      );
      if (result.triggered) {
        this.triggerEncounter(result.waterEncounter);
      }
    }
  }

  private isMoving(): boolean {
    return this.playerVelX !== 0 || this.playerVelY !== 0;
  }

  private generateMap(): void {
    this.map = [];
    for (let y = 0; y < MAP_H; y++) {
      const row: Terrain[] = [];
      for (let x = 0; x < MAP_W; x++) {
        // Border trees
        if (x === 0 || x === MAP_W - 1 || y === 0 || y === MAP_H - 1) {
          row.push(Terrain.Tree);
          continue;
        }
        const r = this.random.random();
        if (r < 0.08) row.push(Terrain.Tree);
        else if (r < 0.14) row.push(Terrain.Water);
        else if (r < 0.40) row.push(Terrain.TallGrass);
        else if (r < 0.55) row.push(Terrain.Path);
        else row.push(Terrain.Grass);
      }
      this.map.push(row);
    }

    // Ensure player start area is walkable
    const sx = Math.floor(this.save.playerX / TILE);
    const sy = Math.floor(this.save.playerY / TILE);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tx = sx + dx;
        const ty = sy + dy;
        if (ty >= 0 && ty < MAP_H && tx >= 0 && tx < MAP_W) {
          this.map[ty][tx] = Terrain.Grass;
        }
      }
    }
  }

  private drawMap(): void {
    const g = this.add.graphics();
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const terrain = this.map[y][x];
        g.fillStyle(TERRAIN_COLORS[terrain], 1);
        g.fillRect(x * TILE, y * TILE, TILE, TILE);

        // Add detail to tall grass
        if (terrain === Terrain.TallGrass) {
          g.fillStyle(0x388e3c, 0.5);
          g.fillRect(x * TILE + 4, y * TILE + 4, 3, 12);
          g.fillRect(x * TILE + 14, y * TILE + 2, 3, 14);
          g.fillRect(x * TILE + 24, y * TILE + 6, 3, 10);
        }

        // Tree detail
        if (terrain === Terrain.Tree) {
          g.fillStyle(0x795548, 1);
          g.fillRect(x * TILE + 12, y * TILE + 18, 8, 14);
          g.fillStyle(0x2e7d32, 1);
          g.fillCircle(x * TILE + 16, y * TILE + 14, 12);
        }

        // Water waves
        if (terrain === Terrain.Water) {
          g.lineStyle(1, 0x64b5f6, 0.4);
          g.beginPath();
          g.moveTo(x * TILE + 4, y * TILE + 16);
          g.lineTo(x * TILE + 12, y * TILE + 12);
          g.lineTo(x * TILE + 20, y * TILE + 16);
          g.lineTo(x * TILE + 28, y * TILE + 12);
          g.strokePath();
        }
      }
    }
  }

  private drawPlayer(): void {
    const p = this.player;
    p.clear();

    // ── Shadow ──
    p.fillStyle(0x000000, 0.18);
    p.fillEllipse(0, 14, 20, 6);

    // ── Legs ──
    p.fillStyle(0x2255aa, 1); // dark-blue jeans
    p.fillRoundedRect(-6, 6, 5, 9, 1);
    p.fillRoundedRect(1, 6, 5, 9, 1);
    // Shoes
    p.fillStyle(0x443322, 1);
    p.fillRoundedRect(-7, 13, 6, 3, 1);
    p.fillRoundedRect(1, 13, 6, 3, 1);

    // ── Torso / jacket ──
    p.fillStyle(0x3366cc, 1); // blue jacket
    p.fillRoundedRect(-7, -4, 14, 12, 2);
    // Jacket zipper line
    p.lineStyle(1, 0x2244aa, 0.6);
    p.beginPath();
    p.moveTo(0, -2);
    p.lineTo(0, 7);
    p.strokePath();

    // ── Backpack (visible behind right shoulder) ──
    p.fillStyle(0xcc4422, 1);
    p.fillRoundedRect(6, -3, 5, 9, 2);
    p.lineStyle(1, 0x993311, 0.5);
    p.strokeRoundedRect(6, -3, 5, 9, 2);

    // ── Arms ──
    p.fillStyle(0x3366cc, 1);
    // Left arm
    p.fillRoundedRect(-10, -2, 4, 9, 1);
    // Right arm
    p.fillRoundedRect(6, -2, 4, 9, 1);
    // Hands (skin)
    p.fillStyle(0xffccaa, 1);
    p.fillCircle(-8, 8, 2);
    p.fillCircle(8, 8, 2);

    // ── Neck ──
    p.fillStyle(0xffccaa, 1);
    p.fillRect(-2, -6, 4, 3);

    // ── Head ──
    p.fillStyle(0xffccaa, 1); // skin tone
    p.fillCircle(0, -11, 8);

    // ── Hair ──
    p.fillStyle(0x332211, 1); // dark brown hair
    // Hair top
    p.beginPath();
    p.arc(0, -13, 8.5, Math.PI + 0.3, -0.3, false);
    p.fillPath();
    // Side tufts
    p.fillRect(-8, -15, 3, 5);
    p.fillRect(5, -15, 3, 5);

    // ── Cap ──
    p.fillStyle(0xcc2222, 1); // red cap
    p.beginPath();
    p.arc(0, -14, 8, Math.PI + 0.15, -0.15, false);
    p.fillPath();
    // Cap brim
    p.fillStyle(0xaa1111, 1);
    p.fillRoundedRect(-9, -14, 18, 3, 1);
    // Cap logo dot
    p.fillStyle(0xffffff, 1);
    p.fillCircle(0, -17, 1.5);

    // ── Face ──
    // Eyes
    p.fillStyle(0xffffff, 1);
    p.fillEllipse(-3, -11, 4, 3.5);
    p.fillEllipse(3, -11, 4, 3.5);
    // Irises
    p.fillStyle(0x224488, 1);
    p.fillCircle(-3, -11, 1.4);
    p.fillCircle(3, -11, 1.4);
    // Pupils
    p.fillStyle(0x000000, 1);
    p.fillCircle(-3, -11, 0.7);
    p.fillCircle(3, -11, 0.7);
    // Highlights
    p.fillStyle(0xffffff, 0.9);
    p.fillCircle(-3.5, -11.5, 0.5);
    p.fillCircle(2.5, -11.5, 0.5);
    // Mouth
    p.lineStyle(1, 0xcc8877, 0.7);
    p.beginPath();
    p.arc(0, -7.5, 2, 0.2, Math.PI - 0.2, false);
    p.strokePath();
  }

  private triggerEncounter(waterEncounter = false): void {
    this.encounterSystem.triggerEncounter(waterEncounter, this.player.x, this.player.y);
  }

  private isNearWater(): boolean {
    const playerTileX = Math.floor(this.player.x / TILE);
    const playerTileY = Math.floor(this.player.y / TILE);

    // Check adjacent tiles for water
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tx = playerTileX + dx;
        const ty = playerTileY + dy;
        if (ty >= 0 && ty < MAP_H && tx >= 0 && tx < MAP_W) {
          if (this.map[ty][tx] === Terrain.Water) {
            return true;
          }
        }
      }
    }
    return false;
  }
}
