import Phaser from 'phaser';
import { SaveData, CreatureInstance } from '../core/types';
import { saveGame } from '../core/saveManager';
import { CREATURE_DEX } from '../data/creatures';
import { createCreature } from '../core/creatureFactory';

const TILE = 32;
const MAP_W = 25;
const MAP_H = 19;
const PLAYER_SPEED = 160;

/** Terrain types */
enum Terrain { Grass, TallGrass, Water, Path, Tree }

const TERRAIN_COLORS: Record<Terrain, number> = {
  [Terrain.Grass]: 0x4caf50,
  [Terrain.TallGrass]: 0x2e7d32,
  [Terrain.Water]: 0x1976d2,
  [Terrain.Path]: 0xbcaaa4,
  [Terrain.Tree]: 0x1b5e20,
};

export class OverworldScene extends Phaser.Scene {
  private save!: SaveData;
  private player!: Phaser.GameObjects.Graphics;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private map: Terrain[][] = [];
  private playerVelX = 0;
  private playerVelY = 0;
  private encounterCooldown = 0;
  private partyText!: Phaser.GameObjects.Text;
  private statsText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'OverworldScene' });
  }

  init(data: { save: SaveData }): void {
    this.save = data.save;
  }

  create(): void {
    this.generateMap();
    this.drawMap();

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

    // HUD
    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x000000, 0.6);
    hudBg.fillRect(0, 0, this.cameras.main.width, 30);

    this.partyText = this.add.text(10, 6, '', {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffffff',
    });

    this.statsText = this.add.text(this.cameras.main.width - 10, 6, '', {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffcc00',
    }).setOrigin(1, 0);

    this.updateHud();

    // Menu button
    const menuBtn = this.add.text(this.cameras.main.width / 2, 6, '[ MENU ]', {
      fontSize: '13px', fontFamily: 'monospace', color: '#aaaaff',
    }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
    menuBtn.on('pointerdown', () => {
      this.persistSave();
      this.scene.start('SettingsScene');
    });

    // Instructions
    this.add.text(this.cameras.main.width / 2, this.cameras.main.height - 14, 'WASD/Arrows to move • Walk in tall grass to find creatures!', {
      fontSize: '11px', fontFamily: 'monospace', color: '#aaaaaa',
    }).setOrigin(0.5);
  }

  update(_time: number, delta: number): void {
    // Movement
    this.playerVelX = 0;
    this.playerVelY = 0;

    const left = this.cursors?.left.isDown || this.wasd?.A.isDown;
    const right = this.cursors?.right.isDown || this.wasd?.D.isDown;
    const up = this.cursors?.up.isDown || this.wasd?.W.isDown;
    const down = this.cursors?.down.isDown || this.wasd?.S.isDown;

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

    // Encounter check
    if (this.encounterCooldown > 0) {
      this.encounterCooldown -= delta;
    } else if (this.isMoving()) {
      const tx = Math.floor(this.player.x / TILE);
      const ty = Math.floor(this.player.y / TILE);
      if (this.map[ty]?.[tx] === Terrain.TallGrass) {
        // ~8% chance per frame while moving in tall grass
        if (Math.random() < 0.008) {
          this.triggerEncounter();
        }
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
        const r = Math.random();
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
    this.player.clear();
    // Body
    this.player.fillStyle(0xff4444, 1);
    this.player.fillCircle(0, 0, 10);
    // Hat
    this.player.fillStyle(0xdd2222, 1);
    this.player.fillRect(-8, -14, 16, 6);
    // Eyes
    this.player.fillStyle(0xffffff, 1);
    this.player.fillCircle(-4, -2, 3);
    this.player.fillCircle(4, -2, 3);
    this.player.fillStyle(0x000000, 1);
    this.player.fillCircle(-3, -2, 1.5);
    this.player.fillCircle(5, -2, 1.5);
  }

  private triggerEncounter(): void {
    this.encounterCooldown = 2000; // prevent instant re-encounter

    // Determine average party level for scaling
    const avgLevel = Math.max(3, Math.round(
      this.save.party.reduce((sum, c) => sum + c.level, 0) / this.save.party.length
    ));

    // Pick random species
    const species = CREATURE_DEX[Math.floor(Math.random() * CREATURE_DEX.length)];

    // Wild creature level: avgLevel ± 2, but when the player only has
    // a single creature the wild level is always strictly lower.
    let wildLevel: number;
    if (this.save.party.length === 1) {
      const maxWild = Math.max(2, avgLevel - 1);
      wildLevel = Phaser.Math.Clamp(
        maxWild - Math.floor(Math.random() * 3),   // 0-2 below cap
        2, maxWild,
      );
    } else {
      wildLevel = Phaser.Math.Clamp(
        avgLevel + Math.floor(Math.random() * 5) - 2,
        2, 50,
      );
    }
    const wildCreature = createCreature(species.id, wildLevel);

    // Save position
    this.save.playerX = this.player.x;
    this.save.playerY = this.player.y;

    this.scene.start('BattleScene', {
      save: this.save,
      wildCreature,
    });
  }

  private updateHud(): void {
    const lead = this.save.party[0];
    if (lead) {
      this.partyText.setText(
        `${lead.nickname} Lv.${lead.level}  HP:${lead.currentHp}/${lead.maxHp}  Party:${this.save.party.length}`
      );
    }
    this.statsText.setText(`Wins:${this.save.wins} Caught:${this.save.caught}`);
  }

  private persistSave(): void {
    this.save.playerX = this.player.x;
    this.save.playerY = this.player.y;
    saveGame(this.save);
  }
}