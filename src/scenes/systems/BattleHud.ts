import Phaser from 'phaser';
import { CreatureInstance } from '../../core/types';
import { getSpeciesById } from '../../data/creatures';
import { xpForLevel } from '../../core/creatureFactory';

/** Data model for the HUD to render */
export interface BattleHudModel {
  playerCreature: CreatureInstance;
  wildCreature: CreatureInstance;
}

/**
 * Renders battle HUD elements: HP bars, names, levels, and XP.
 * Updates efficiently via the update(model) method.
 */
export class BattleHud {
  private scene: Phaser.Scene;

  // Graphics objects
  private playerHpBar!: Phaser.GameObjects.Graphics;
  private wildHpBar!: Phaser.GameObjects.Graphics;

  // Text objects
  private playerInfoText!: Phaser.GameObjects.Text;
  private wildInfoText!: Phaser.GameObjects.Text;
  private playerXpText!: Phaser.GameObjects.Text;

  // Background elements
  private playerBoxBg!: Phaser.GameObjects.Graphics;
  private wildBoxBg!: Phaser.GameObjects.Graphics;

  // Cached positions
  private pBoxX = 20;
  private pBoxY = 0; // Set in create
  private wBoxX = 0; // Set in create
  private wBoxY = 20;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Create all HUD elements. Call once during scene creation.
   */
  create(model: BattleHudModel): void {
    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;

    this.pBoxY = h * 0.58;
    this.wBoxX = w - 240;

    // Player info box (bottom-left)
    this.playerBoxBg = this.scene.add.graphics();
    this.playerBoxBg.fillStyle(0x222244, 0.9);
    this.playerBoxBg.fillRoundedRect(this.pBoxX, this.pBoxY, 220, 55, 6);

    // Player info text
    this.playerInfoText = this.scene.add.text(
      this.pBoxX + 10, 
      this.pBoxY + 5,
      this.formatCreatureInfo(model.playerCreature), 
      {
        fontSize: '13px', 
        fontFamily: 'monospace', 
        color: '#ffffff', 
        fontStyle: 'bold',
      }
    );

    // Player HP bar
    this.playerHpBar = this.scene.add.graphics();
    this.drawHpBar(
      this.playerHpBar, 
      this.pBoxX + 10, 
      this.pBoxY + 25, 
      200, 
      model.playerCreature.currentHp, 
      model.playerCreature.maxHp
    );

    // Player XP text
    const xpNeeded = xpForLevel(model.playerCreature.level + 1);
    const xpCurrent = model.playerCreature.xp - xpForLevel(model.playerCreature.level);
    const xpTotal = xpNeeded - xpForLevel(model.playerCreature.level);
    this.playerXpText = this.scene.add.text(
      this.pBoxX + 10, 
      this.pBoxY + 40, 
      `XP: ${xpCurrent}/${xpTotal}`, 
      {
        fontSize: '10px', 
        fontFamily: 'monospace', 
        color: '#aaaacc',
      }
    );

    // Wild info box (top-right)
    this.wildBoxBg = this.scene.add.graphics();
    this.wildBoxBg.fillStyle(0x222244, 0.9);
    this.wildBoxBg.fillRoundedRect(this.wBoxX, this.wBoxY, 220, 45, 6);

    // Wild info text
    this.wildInfoText = this.scene.add.text(
      this.wBoxX + 10, 
      this.wBoxY + 5,
      this.formatCreatureInfo(model.wildCreature), 
      {
        fontSize: '13px', 
        fontFamily: 'monospace', 
        color: '#ffffff', 
        fontStyle: 'bold',
      }
    );

    // Wild HP bar
    this.wildHpBar = this.scene.add.graphics();
    this.drawHpBar(
      this.wildHpBar, 
      this.wBoxX + 10, 
      this.wBoxY + 25, 
      200, 
      model.wildCreature.currentHp, 
      model.wildCreature.maxHp
    );
  }

  /**
   * Update HUD to match current model state.
   * Call whenever creature stats change.
   */
  update(model: BattleHudModel): void {
    // Update text
    this.playerInfoText.setText(this.formatCreatureInfo(model.playerCreature));
    this.wildInfoText.setText(this.formatCreatureInfo(model.wildCreature));

    // Update XP text
    const xpNeeded = xpForLevel(model.playerCreature.level + 1);
    const xpCurrent = model.playerCreature.xp - xpForLevel(model.playerCreature.level);
    const xpTotal = xpNeeded - xpForLevel(model.playerCreature.level);
    this.playerXpText.setText(`XP: ${xpCurrent}/${xpTotal}`);

    // Redraw HP bars
    this.drawHpBar(
      this.playerHpBar, 
      this.pBoxX + 10, 
      this.pBoxY + 25, 
      200, 
      model.playerCreature.currentHp, 
      model.playerCreature.maxHp
    );
    this.drawHpBar(
      this.wildHpBar, 
      this.wBoxX + 10, 
      this.wBoxY + 25, 
      200, 
      model.wildCreature.currentHp, 
      model.wildCreature.maxHp
    );
  }

  /**
   * Destroy all HUD elements.
   */
  destroy(): void {
    this.playerHpBar?.destroy();
    this.wildHpBar?.destroy();
    this.playerInfoText?.destroy();
    this.wildInfoText?.destroy();
    this.playerXpText?.destroy();
    this.playerBoxBg?.destroy();
    this.wildBoxBg?.destroy();
  }

  /**
   * Get the Y position of the player creature (for positioning the sprite).
   */
  getPlayerCreatureY(): number {
    const h = this.scene.cameras.main.height;
    return h * 0.42;
  }

  /**
   * Get the Y position of the wild creature (for positioning the sprite).
   */
  getWildCreatureY(): number {
    return this.wBoxY + 80;
  }

  /**
   * Get the X position of the player creature (for positioning the sprite).
   */
  getPlayerCreatureX(): number {
    return this.scene.cameras.main.width * 0.25;
  }

  /**
   * Get the X position of the wild creature (for positioning the sprite).
   */
  getWildCreatureX(): number {
    return this.scene.cameras.main.width * 0.75;
  }

  private formatCreatureInfo(creature: CreatureInstance): string {
    return `${creature.nickname}  Lv.${creature.level}`;
  }

  private drawHpBar(
    g: Phaser.GameObjects.Graphics, 
    x: number, 
    y: number, 
    width: number, 
    current: number, 
    max: number
  ): void {
    g.clear();
    const ratio = Math.max(0, current / max);
    const color = ratio > 0.5 ? 0x44cc44 : ratio > 0.2 ? 0xcccc44 : 0xcc4444;

    // Background
    g.fillStyle(0x333333, 1);
    g.fillRoundedRect(x, y, width, 10, 3);
    // Fill
    g.fillStyle(color, 1);
    g.fillRoundedRect(x, y, Math.max(0, width * ratio), 10, 3);
  }
}
