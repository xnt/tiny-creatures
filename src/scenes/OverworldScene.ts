import Phaser from 'phaser';
import { SaveData } from '../core/types';
import {
  EncounterSystem,
  OverworldHub,
  OverworldMenuController,
  OverworldInputController,
  OverworldMapGenerator,
  OverworldMapRenderer,
  TerrainQueries,
  MapItemSystem,
  Terrain,
  GeneratedMap,
} from './systems';
import { RandomSource, defaultRandom } from '../core/random';

const TILE = 32;
const PLAYER_SPEED = 160;

import { shouldRegenerateMap } from './overworldHelpers';
export { shouldRegenerateMap };

export class OverworldScene extends Phaser.Scene {
  private save!: SaveData;
  private player!: Phaser.GameObjects.Graphics;
  private playerVelX = 0;
  private playerVelY = 0;
  private random: RandomSource = defaultRandom;

  // Map data and systems
  private mapData!: GeneratedMap;
  private terrainQueries!: TerrainQueries;
  private mapRenderer!: OverworldMapRenderer;
  private mapGenerator!: OverworldMapGenerator;

  // Systems
  private encounterSystem!: EncounterSystem;
  private hub!: OverworldHub;
  private menuController!: OverworldMenuController;
  private inputController!: OverworldInputController;
  private mapItemSystem!: MapItemSystem;

  constructor() {
    super({ key: 'OverworldScene' });
  }

  init(data: { save: SaveData; fresh?: boolean }): void {
    this.save = data.save;

    // Clear map data for fresh starts to ensure new map generation
    if (shouldRegenerateMap(data.fresh, this.mapData)) {
      this.mapData = undefined as unknown as GeneratedMap;
      this.mapRenderer?.destroy();
    }
  }

  create(): void {
    // Initialize map generation (only if not already loaded)
    if (!this.mapData) {
      this.mapGenerator = new OverworldMapGenerator(this.random);
      this.mapData = this.mapGenerator.generate(this.save.playerX, this.save.playerY, TILE);
      this.terrainQueries = new TerrainQueries(this.mapData, undefined, TILE);
    }

    // Re-render the map (Phaser graphics don't survive scene shutdown)
    this.mapRenderer = new OverworldMapRenderer(this);
    this.mapRenderer.render(this.mapData);

    // Initialize systems
    this.encounterSystem = new EncounterSystem(this, this.save);
    this.inputController = new OverworldInputController(this);
    this.mapItemSystem = new MapItemSystem(
      this,
      this.save,
      this.mapData.terrain,
      TILE,
      this.mapData.width,
      this.mapData.height,
    );
    this.mapItemSystem.placeItems();

    // Player character (simple triangle)
    this.player = this.add.graphics();
    this.player.setPosition(this.save.playerX, this.save.playerY);
    this.drawPlayer();

    // Initialize HUD and menu (needs to be after player is created for callbacks)
    this.hub = new OverworldHub(this, this.save, () => this.menuController.toggleMainMenu());
    this.menuController = new OverworldMenuController(
      this,
      this.save,
      () => ({ x: this.player.x, y: this.player.y }),
      () => this.terrainQueries.hasAdjacentWaterAtPosition(this.player.x, this.player.y),
      (water) => this.triggerEncounter(water),
    );
  }

  update(_time: number, delta: number): void {
    // Close popup if clicking outside
    if (this.menuController.isPopupVisible()) return; // Pause game while popup is open

    // Movement (via input controller - merges keyboard + touch)
    this.playerVelX = 0;
    this.playerVelY = 0;

    const intent = this.inputController.getMovementIntent();
    if (intent.x < 0) this.playerVelX = -PLAYER_SPEED;
    else if (intent.x > 0) this.playerVelX = PLAYER_SPEED;
    if (intent.y < 0) this.playerVelY = -PLAYER_SPEED;
    else if (intent.y > 0) this.playerVelY = PLAYER_SPEED;

    const dt = delta / 1000;
    let nx = this.player.x + this.playerVelX * dt;
    let ny = this.player.y + this.playerVelY * dt;

    // Clamp to map bounds using terrain queries
    const clamped = this.terrainQueries.clampToBounds(nx, ny);
    nx = clamped.x;
    ny = clamped.y;

    // Collision check — block trees and water using terrain queries
    if (this.terrainQueries.isPositionWalkable(nx, ny)) {
      this.player.setPosition(nx, ny);
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
        this.mapData.terrain,
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
}
