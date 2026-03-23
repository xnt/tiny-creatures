import Phaser from 'phaser';
import { SaveData, CreatureInstance, Attack } from '../core/types';
import { getSpeciesById } from '../data/creatures';
import { drawCreature, typeColor } from '../utils/creatureRenderer';
import { saveGame } from '../core/saveManager';
import { xpForLevel } from '../core/creatureFactory';
import { BattleTurnResult, CatchAttemptResult, PlannedTurn } from '../core/battleEngine';
import { BattleStateMachine, BattlePhase, BattleActionResult, PlannedTurnInfo } from './systems';

export class BattleScene extends Phaser.Scene {
  private save!: SaveData;
  private wildCreature!: CreatureInstance;
  private stateMachine!: BattleStateMachine;

  // Graphics handles
  private playerGfx!: Phaser.GameObjects.Graphics;
  private wildGfx!: Phaser.GameObjects.Graphics;
  private playerHpBar!: Phaser.GameObjects.Graphics;
  private wildHpBar!: Phaser.GameObjects.Graphics;
  private playerInfoText!: Phaser.GameObjects.Text;
  private wildInfoText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private moveButtons: Phaser.GameObjects.Container[] = [];
  private actionButtons: Phaser.GameObjects.Container[] = [];

  constructor() {
    super({ key: 'BattleScene' });
  }

  init(data: { save: SaveData; wildCreature: CreatureInstance }): void {
    this.save = data.save;
    this.wildCreature = data.wildCreature;
  }

  create(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Initialize state machine
    const playerCreature = this.save.party.find(c => c.currentHp > 0) ?? this.save.party[0];
    this.stateMachine = new BattleStateMachine(
      this.save,
      playerCreature,
      this.wildCreature,
    );

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x2d2d44, 0x2d2d44, 0x1a1a2e, 0x1a1a2e, 1);
    bg.fillRect(0, 0, w, h);

    // Battle platform
    bg.fillStyle(0x444466, 0.5);
    bg.fillEllipse(w * 0.25, h * 0.52, 200, 40);
    bg.fillEllipse(w * 0.75, h * 0.32, 180, 35);

    // Draw creatures
    this.drawCreatures(w, h);

    // Info boxes
    this.drawInfoBoxes(w, h);

    // Message area
    const msgBg = this.add.graphics();
    msgBg.fillStyle(0x1a1a2e, 0.9);
    msgBg.fillRoundedRect(20, h - 140, w - 40, 130, 8);
    msgBg.lineStyle(2, 0x444466, 1);
    msgBg.strokeRoundedRect(20, h - 140, w - 40, 130, 8);

    this.messageText = this.add.text(40, h - 130, `A wild ${this.wildCreature.nickname} appeared!`, {
      fontSize: '15px', fontFamily: 'monospace', color: '#ffffff',
      wordWrap: { width: w - 80 },
    });

    // Initial display
    this.time.delayedCall(800, () => {
      this.showActionMenu();
    });
  }

  private drawCreatures(w: number, h: number): void {
    const playerSpecies = getSpeciesById(this.stateMachine.getPlayerCreature().speciesId)!;
    const wildSpecies = getSpeciesById(this.wildCreature.speciesId)!;

    this.playerGfx = drawCreature(this, w * 0.25, h * 0.42, playerSpecies.shape, false);
    this.wildGfx = drawCreature(this, w * 0.75, h * 0.22, wildSpecies.shape, true);
  }

  private drawInfoBoxes(w: number, h: number): void {
    const playerCreature = this.stateMachine.getPlayerCreature();

    // Player info (bottom-left area)
    const pBoxX = 20, pBoxY = h * 0.58;
    const pBg = this.add.graphics();
    pBg.fillStyle(0x222244, 0.9);
    pBg.fillRoundedRect(pBoxX, pBoxY, 220, 55, 6);

    this.playerInfoText = this.add.text(pBoxX + 10, pBoxY + 5,
      `${playerCreature.nickname}  Lv.${playerCreature.level}`, {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    });

    this.playerHpBar = this.add.graphics();
    this.drawHpBar(this.playerHpBar, pBoxX + 10, pBoxY + 25, 200, playerCreature.currentHp, playerCreature.maxHp);

    const xpNeeded = xpForLevel(playerCreature.level + 1);
    const xpCurrent = playerCreature.xp - xpForLevel(playerCreature.level);
    const xpTotal = xpNeeded - xpForLevel(playerCreature.level);
    this.add.text(pBoxX + 10, pBoxY + 40, `XP: ${xpCurrent}/${xpTotal}`, {
      fontSize: '10px', fontFamily: 'monospace', color: '#aaaacc',
    });

    // Wild info (top-right area)
    const wBoxX = w - 240, wBoxY = 20;
    const wBg = this.add.graphics();
    wBg.fillStyle(0x222244, 0.9);
    wBg.fillRoundedRect(wBoxX, wBoxY, 220, 45, 6);

    this.wildInfoText = this.add.text(wBoxX + 10, wBoxY + 5,
      `${this.wildCreature.nickname}  Lv.${this.wildCreature.level}`, {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    });

    this.wildHpBar = this.add.graphics();
    this.drawHpBar(this.wildHpBar, wBoxX + 10, wBoxY + 25, 200, this.wildCreature.currentHp, this.wildCreature.maxHp);
  }

  private drawHpBar(g: Phaser.GameObjects.Graphics, x: number, y: number, width: number, current: number, max: number): void {
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

  // ─── Action Menus ────────────────────────────────────────────

  private showActionMenu(): void {
    this.clearButtons();
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const btnW = 150, btnH = 35;
    const startX = 50, startY = h - 120;

    this.messageText.setText('What will you do?');

    const actions = [
      { label: '⚔ Fight', callback: () => this.showMoveMenu() },
      { label: '🎯 Catch', callback: () => this.handleCatch() },
      { label: '🔄 Switch', callback: () => this.showSwitchMenu() },
      { label: '🏃 Run', callback: () => this.handleRun() },
    ];

    actions.forEach((action, i) => {
      const bx = startX + (i % 2) * (btnW + 15);
      const by = startY + Math.floor(i / 2) * (btnH + 8);
      const container = this.createButton(bx, by, btnW, btnH, action.label, action.callback);
      this.actionButtons.push(container);
    });
  }

  private showMoveMenu(): void {
    this.clearButtons();
    this.messageText.setText('Choose an attack:');

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const btnW = 160, btnH = 35;
    const startX = 40, startY = h - 125;

    const playerCreature = this.stateMachine.getPlayerCreature();
    playerCreature.moves.forEach((move, i) => {
      if (!move) return;
      const bx = startX + (i % 2) * (btnW + 10);
      const by = startY + Math.floor(i / 2) * (btnH + 6);

      const label = `${move.name} (${move.power})`;
      const container = this.createButton(bx, by, btnW, btnH, label, () => {
        this.handleAttack(move);
      }, typeColor(move.type));
      this.moveButtons.push(container);
    });

    // Back button
    const backBtn = this.createButton(startX + 2 * (btnW + 10), startY, 80, btnH, '← Back', () => {
      this.showActionMenu();
    });
    this.moveButtons.push(backBtn);
  }

  private showSwitchMenu(forcedSwitch: boolean = false): void {
    this.clearButtons();
    const available = this.stateMachine.getAvailableSwitchTargets();

    if (available.length === 0) {
      this.messageText.setText('No other creatures available!');
      this.time.delayedCall(1000, () => this.showActionMenu());
      return;
    }

    this.messageText.setText('Switch to:');
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const btnW = 200, btnH = 30;
    const startX = 40, startY = h - 130;

    available.forEach((creature, i) => {
      const by = startY + i * (btnH + 5);
      const species = getSpeciesById(creature.speciesId)!;
      const typeLabel = species.type.toUpperCase();
      const label = `[${typeLabel}] ${creature.nickname} Lv.${creature.level} HP:${creature.currentHp}/${creature.maxHp}`;
      const container = this.createButton(startX, by, btnW, btnH, label, () => {
        if (forcedSwitch) {
          this.handleForcedSwitch(creature);
        } else {
          this.handleSwitch(creature);
        }
      }, typeColor(species.type));
      this.moveButtons.push(container);
    });

    // Only show back button for voluntary switches
    if (!forcedSwitch) {
      const backBtn = this.createButton(startX + btnW + 15, startY, 80, btnH, '← Back', () => {
        this.showActionMenu();
      });
      this.moveButtons.push(backBtn);
    }
  }

  // ─── Action Handlers ─────────────────────────────────────────

  private handleAttack(move: Attack): void {
    this.clearButtons();
    const result = this.stateMachine.planAction({ type: 'attack', move });
    this.processActionResult(result);
  }

  private handleCatch(): void {
    this.clearButtons();
    const result = this.stateMachine.planAction({ type: 'catch' });
    this.processActionResult(result);
  }

  private handleSwitch(creature: CreatureInstance): void {
    this.clearButtons();
    const result = this.stateMachine.planAction({ type: 'switch', creature });
    
    // Update graphics immediately to show the new creature being attacked
    this.refreshCreatureGraphics();
    
    this.processActionResult(result);
  }

  private handleForcedSwitch(creature: CreatureInstance): void {
    this.clearButtons();
    // For forced switch after faint, just update the creature without enemy attack
    this.stateMachine.switchToFaintedCreature(creature);
    this.refreshCreatureGraphics();
    this.messageText.setText(`Go, ${creature.nickname}!`);
    this.time.delayedCall(800, () => {
      this.showActionMenu();
    });
  }

  private handleRun(): void {
    this.clearButtons();
    const result = this.stateMachine.planAction({ type: 'run' });
    this.processActionResult(result);
  }

  // ─── Result Processing ───────────────────────────────────────

  private processActionResult(result: BattleActionResult): void {
    // Handle catch attempts - always play animation first
    if (result.catchResult) {
      this.playCatchAnimation(result.catchResult, result);
      return;
    }

    if (result.battleEnded) {
      this.messageText.setText(result.message);
      if (result.victory) {
        this.time.delayedCall(1500, () => {
          this.handleBattleEnd(true, false);
        });
      } else {
        this.time.delayedCall(2000, () => {
          this.handleBattleEnd(false, false);
        });
      }
      return;
    }

    if (result.plannedTurns && result.plannedTurns.length > 0) {
      // Play turns sequentially
      this.playPlannedTurnSequence(result.plannedTurns, 0, result);
    } else {
      // No turns to animate (e.g., successful escape)
      this.messageText.setText(result.message);
      this.time.delayedCall(800, () => {
        this.afterTurnAnimations(result);
      });
    }
  }

  private playPlannedTurnSequence(
    plannedTurns: PlannedTurnInfo[], 
    index: number, 
    actionResult: BattleActionResult
  ): void {
    if (index >= plannedTurns.length) {
      // All turns animated - check for end state
      const finalResult = this.stateMachine.onTurnsComplete();
      this.afterTurnAnimations(finalResult);
      return;
    }

    const turnInfo = plannedTurns[index];
    
    // Play animation for this turn
    this.playTurnAnimation(turnInfo.planned, turnInfo.isPlayerAttacker, () => {
      // After animation, apply the damage
      const result = this.stateMachine.applyTurnDamage(turnInfo.planned);
      this.updateHpBars();

      // Check for faints
      const checkResult = this.stateMachine.checkTurnResult(result);
      
      if (checkResult.wildFainted || checkResult.playerFainted) {
        // Someone fainted - don't continue with remaining turns
        const finalResult = this.stateMachine.onTurnsComplete();
        this.afterTurnAnimations(finalResult);
        return;
      }

      // Continue to next turn
      this.time.delayedCall(300, () => {
        this.playPlannedTurnSequence(plannedTurns, index + 1, actionResult);
      });
    });
  }

  private playTurnAnimation(planned: PlannedTurn, isPlayerAttacker: boolean, onDone: () => void): void {
    let msg = '';
    if (planned.missed) {
      msg = `${planned.attacker.nickname} used ${planned.attack.name}... but missed!`;
    } else {
      msg = `${planned.attacker.nickname} used ${planned.attack.name}! `;
      if (planned.effectiveness > 1) msg += "It's super effective! ";
      else if (planned.effectiveness < 1) msg += "It's not very effective... ";
      msg += `${planned.damage} damage!`;
    }

    this.messageText.setText(msg);

    // Animate attack
    const target = isPlayerAttacker ? this.wildGfx : this.playerGfx;
    this.tweens.add({
      targets: target,
      x: target.x + (isPlayerAttacker ? 10 : -10),
      duration: 80,
      yoyo: true,
      repeat: 2,
    });

    // Flash on hit
    if (!planned.missed) {
      this.tweens.add({
        targets: target,
        alpha: 0.3,
        duration: 100,
        yoyo: true,
        repeat: 1,
      });
    }

    // Call onDone after animation time
    this.time.delayedCall(1200, onDone);
  }

  private playCatchAnimation(catchResult: CatchAttemptResult, actionResult?: BattleActionResult): void {
    this.messageText.setText('You threw a capture orb!');

    // Animate catch
    const catchGfx = this.add.graphics();
    catchGfx.fillStyle(0xff4444, 1);
    catchGfx.fillCircle(0, 0, 8);
    catchGfx.lineStyle(2, 0xffffff, 1);
    catchGfx.strokeCircle(0, 0, 8);
    catchGfx.setPosition(this.cameras.main.width * 0.25, this.cameras.main.height * 0.42);

    // Throw animation
    this.tweens.add({
      targets: catchGfx,
      x: this.wildGfx.x,
      y: this.wildGfx.y,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        // Shake animation
        let shakesDone = 0;
        const doShake = () => {
          if (shakesDone < catchResult.shakes) {
            this.messageText.setText('...');
            this.tweens.add({
              targets: catchGfx,
              x: catchGfx.x + 8,
              duration: 150,
              yoyo: true,
              onComplete: () => {
                shakesDone++;
                this.time.delayedCall(400, doShake);
              }
            });
          } else {
            // Result
            if (catchResult.success) {
              this.messageText.setText(`Gotcha! ${this.wildCreature.nickname} was caught!`);
              catchGfx.destroy();
              this.wildGfx.setAlpha(0);

              this.time.delayedCall(2000, () => {
                this.handleBattleEnd(true, true);
              });
            } else if (actionResult?.plannedTurns) {
              // Failed catch with enemy attack
              this.messageText.setText(`Oh no! ${this.wildCreature.nickname} broke free!`);
              catchGfx.destroy();
              this.time.delayedCall(1000, () => {
                this.playPlannedTurnSequence(actionResult.plannedTurns!, 0, actionResult);
              });
            } else {
              // Simple failed catch
              this.messageText.setText(`Oh no! ${this.wildCreature.nickname} broke free!`);
              catchGfx.destroy();
              this.time.delayedCall(1000, () => {
                this.showActionMenu();
              });
            }
          }
        };
        doShake();
      }
    });
  }

  private afterTurnAnimations(result: BattleActionResult): void {
    if (result.battleEnded) {
      if (result.wildFainted) {
        this.playFaintAnimation(false);
      }
      if (result.playerFainted && !result.switchRequired) {
        this.playFaintAnimation(true);
      }
      this.messageText.setText(result.message);
      this.time.delayedCall(2000, () => {
        this.handleBattleEnd(result.victory ?? false, result.caught);
      });
      return;
    }

    if (result.switchRequired) {
      this.playFaintAnimation(true);
      this.messageText.setText(result.message);
      this.time.delayedCall(1000, () => {
        this.showSwitchMenu(true); // forced switch after faint
      });
      return;
    }

    this.messageText.setText(result.message);
    this.time.delayedCall(800, () => {
      this.showActionMenu();
    });
  }

  private handleBattleEnd(victory: boolean, caught?: boolean): void {
    if (victory && !caught) {
      this.playFaintAnimation(false);
    } else if (!victory) {
      this.playFaintAnimation(true);
    }

    saveGame(this.save);
    this.time.delayedCall(2000, () => {
      this.scene.start('OverworldScene', { save: this.save });
    });
  }

  // ─── UI Helpers ──────────────────────────────────────────────

  private updateHpBars(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const playerCreature = this.stateMachine.getPlayerCreature();

    this.drawHpBar(this.playerHpBar, 30, h * 0.58 + 25, 200, playerCreature.currentHp, playerCreature.maxHp);
    this.drawHpBar(this.wildHpBar, w - 230, 45, 200, this.wildCreature.currentHp, this.wildCreature.maxHp);

    this.playerInfoText.setText(`${playerCreature.nickname}  Lv.${playerCreature.level}`);
    this.wildInfoText.setText(`${this.wildCreature.nickname}  Lv.${this.wildCreature.level}`);
  }

  private refreshCreatureGraphics(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    this.playerGfx.destroy();
    const species = getSpeciesById(this.stateMachine.getPlayerCreature().speciesId)!;
    this.playerGfx = drawCreature(this, w * 0.25, h * 0.42, species.shape, false);
    this.updateHpBars();
  }

  private playFaintAnimation(isPlayer: boolean): void {
    const target = isPlayer ? this.playerGfx : this.wildGfx;
    this.tweens.add({
      targets: target,
      alpha: 0,
      y: target.y + 30,
      duration: 600,
    });
  }

  private createButton(
    x: number, y: number, w: number, h: number,
    label: string, callback: () => void,
    tintColor?: number,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);

    const bg = this.add.graphics();
    const baseColor = tintColor ?? 0x333355;
    bg.fillStyle(baseColor, 0.8);
    bg.fillRoundedRect(x, y, w, h, 5);
    bg.lineStyle(1, 0x666688, 1);
    bg.strokeRoundedRect(x, y, w, h, 5);

    const text = this.add.text(x + w / 2, y + h / 2, label, {
      fontSize: '12px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5);

    const zone = this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => { bg.clear(); bg.fillStyle(baseColor, 1); bg.fillRoundedRect(x, y, w, h, 5); bg.lineStyle(2, 0xaaaacc, 1); bg.strokeRoundedRect(x, y, w, h, 5); });
    zone.on('pointerout', () => { bg.clear(); bg.fillStyle(baseColor, 0.8); bg.fillRoundedRect(x, y, w, h, 5); bg.lineStyle(1, 0x666688, 1); bg.strokeRoundedRect(x, y, w, h, 5); });
    zone.on('pointerdown', () => { if (this.stateMachine.canTakeAction()) callback(); });

    container.add([bg, text, zone]);
    return container;
  }

  private clearButtons(): void {
    [...this.moveButtons, ...this.actionButtons].forEach(c => c.destroy());
    this.moveButtons = [];
    this.actionButtons = [];
  }
}
