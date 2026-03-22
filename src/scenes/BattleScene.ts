import Phaser from 'phaser';
import { SaveData, CreatureInstance, Attack } from '../core/types';
import { getSpeciesById } from '../data/creatures';
import { drawCreature, typeColor } from '../utils/creatureRenderer';
import { executeTurn, aiPickMove, attemptCatch, awardXp, getTurnOrder, BattleTurnResult } from '../core/battleEngine';
import { saveGame } from '../core/saveManager';
import { xpForLevel } from '../core/creatureFactory';

type BattleState = 'choosing' | 'animating' | 'result' | 'catch_anim' | 'ended';

export class BattleScene extends Phaser.Scene {
  private save!: SaveData;
  private playerCreature!: CreatureInstance;
  private wildCreature!: CreatureInstance;
  private state: BattleState = 'choosing';

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
    // First party member with HP > 0
    this.playerCreature = this.save.party.find(c => c.currentHp > 0) ?? this.save.party[0];
  }

  create(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x2d2d44, 0x2d2d44, 0x1a1a2e, 0x1a1a2e, 1);
    bg.fillRect(0, 0, w, h);

    // Battle platform
    bg.fillStyle(0x444466, 0.5);
    bg.fillEllipse(w * 0.25, h * 0.52, 200, 40);
    bg.fillEllipse(w * 0.75, h * 0.32, 180, 35);

    // Draw creatures
    const playerSpecies = getSpeciesById(this.playerCreature.speciesId)!;
    const wildSpecies = getSpeciesById(this.wildCreature.speciesId)!;

    this.playerGfx = drawCreature(this, w * 0.25, h * 0.42, playerSpecies.shape, false);
    this.wildGfx = drawCreature(this, w * 0.75, h * 0.22, wildSpecies.shape, true);

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

    this.state = 'choosing';

    // Initial display
    this.time.delayedCall(800, () => {
      this.showActionMenu();
    });
  }

  private drawInfoBoxes(w: number, h: number): void {
    // Player info (bottom-left area)
    const pBoxX = 20, pBoxY = h * 0.58;
    const pBg = this.add.graphics();
    pBg.fillStyle(0x222244, 0.9);
    pBg.fillRoundedRect(pBoxX, pBoxY, 220, 55, 6);

    this.playerInfoText = this.add.text(pBoxX + 10, pBoxY + 5,
      `${this.playerCreature.nickname}  Lv.${this.playerCreature.level}`, {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    });

    this.playerHpBar = this.add.graphics();
    this.drawHpBar(this.playerHpBar, pBoxX + 10, pBoxY + 25, 200, this.playerCreature.currentHp, this.playerCreature.maxHp);

    const xpNeeded = xpForLevel(this.playerCreature.level + 1);
    const xpCurrent = this.playerCreature.xp - xpForLevel(this.playerCreature.level);
    const xpTotal = xpNeeded - xpForLevel(this.playerCreature.level);
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
    // HP text
  }

  private showActionMenu(): void {
    this.clearButtons();
    this.state = 'choosing';

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const btnW = 150, btnH = 35;
    const startX = 50, startY = h - 120;

    this.messageText.setText('What will you do?');

    const actions = [
      { label: '⚔ Fight', callback: () => this.showMoveMenu() },
      { label: '🎯 Catch', callback: () => this.doCatch() },
      { label: '🔄 Switch', callback: () => this.showSwitchMenu() },
      { label: '🏃 Run', callback: () => this.doRun() },
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

    this.playerCreature.moves.forEach((move, i) => {
      if (!move) return;
      const bx = startX + (i % 2) * (btnW + 10);
      const by = startY + Math.floor(i / 2) * (btnH + 6);

      const label = `${move.name} (${move.power})`;
      const container = this.createButton(bx, by, btnW, btnH, label, () => {
        this.executePlayerTurn(move);
      }, typeColor(move.type));
      this.moveButtons.push(container);
    });

    // Back button
    const backBtn = this.createButton(startX + 2 * (btnW + 10), startY, 80, btnH, '← Back', () => {
      this.showActionMenu();
    });
    this.moveButtons.push(backBtn);
  }

  private showSwitchMenu(): void {
    this.clearButtons();
    this.state = 'choosing';
    const alive = this.save.party.filter(c => c.currentHp > 0 && c.uid !== this.playerCreature.uid);

    if (alive.length === 0) {
      this.messageText.setText('No other creatures available!');
      this.time.delayedCall(1000, () => this.showActionMenu());
      return;
    }

    this.messageText.setText('Switch to:');
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const btnW = 200, btnH = 30;
    const startX = 40, startY = h - 130;

    alive.forEach((creature, i) => {
      const by = startY + i * (btnH + 5);
      const species = getSpeciesById(creature.speciesId)!;
      const typeLabel = species.type.toUpperCase();
      const label = `[${typeLabel}] ${creature.nickname} Lv.${creature.level} HP:${creature.currentHp}/${creature.maxHp}`;
      const container = this.createButton(startX, by, btnW, btnH, label, () => {
        this.playerCreature = creature;
        this.clearButtons();
        this.refreshCreatureGraphics();
        this.messageText.setText(`Go, ${creature.nickname}!`);

        // Enemy gets a free attack
        this.time.delayedCall(800, () => {
          const enemyMove = aiPickMove(this.wildCreature);
          const result = executeTurn(this.wildCreature, this.playerCreature, enemyMove);
          this.showTurnResult(result, false, () => {
            // After enemy attacks, check if player fainted
            if (this.playerCreature.currentHp <= 0) {
              this.onPlayerFainted();
            } else {
              this.showActionMenu();
            }
          });
        });
      }, typeColor(species.type));
      this.moveButtons.push(container);
    });

    const backBtn = this.createButton(startX + btnW + 15, startY, 80, btnH, '← Back', () => {
      this.showActionMenu();
    });
    this.moveButtons.push(backBtn);
  }

  private executePlayerTurn(move: Attack): void {
    this.clearButtons();
    this.state = 'animating';

    const order = getTurnOrder(this.playerCreature, this.wildCreature);

    if (order[0] === 'a') {
      // Player goes first
      const result = executeTurn(this.playerCreature, this.wildCreature, move);
      this.showTurnResult(result, true, () => {
        if (this.wildCreature.currentHp <= 0) {
          this.onWildFainted();
          return;
        }
        // Enemy turn
        const enemyMove = aiPickMove(this.wildCreature);
        const enemyResult = executeTurn(this.wildCreature, this.playerCreature, enemyMove);
        this.showTurnResult(enemyResult, false, () => {
          if (this.playerCreature.currentHp <= 0) {
            this.onPlayerFainted();
            return;
          }
          this.showActionMenu();
        });
      });
    } else {
      // Enemy goes first
      const enemyMove = aiPickMove(this.wildCreature);
      const enemyResult = executeTurn(this.wildCreature, this.playerCreature, enemyMove);
      this.showTurnResult(enemyResult, false, () => {
        if (this.playerCreature.currentHp <= 0) {
          this.onPlayerFainted();
          return;
        }
        const result = executeTurn(this.playerCreature, this.wildCreature, move);
        this.showTurnResult(result, true, () => {
          if (this.wildCreature.currentHp <= 0) {
            this.onWildFainted();
            return;
          }
          this.showActionMenu();
        });
      });
    }
  }

  private showTurnResult(result: BattleTurnResult, playerAttacked: boolean, onDone?: () => void): void {
    let msg = '';
    if (result.missed) {
      msg = `${result.attackerName} used ${result.attack.name}... but missed!`;
    } else {
      msg = `${result.attackerName} used ${result.attack.name}! `;
      if (result.effectiveness > 1) msg += "It's super effective! ";
      else if (result.effectiveness < 1) msg += "It's not very effective... ";
      msg += `${result.damage} damage!`;
    }

    this.messageText.setText(msg);

    // Animate attack
    const target = playerAttacked ? this.wildGfx : this.playerGfx;
    this.tweens.add({
      targets: target,
      x: target.x + (playerAttacked ? 10 : -10),
      duration: 80,
      yoyo: true,
      repeat: 2,
    });

    // Update HP bars
    this.updateHpBars();

    // Flash on hit
    if (!result.missed) {
      this.tweens.add({
        targets: target,
        alpha: 0.3,
        duration: 100,
        yoyo: true,
        repeat: 1,
      });
    }

    if (onDone) {
      this.time.delayedCall(1200, onDone);
    }
  }

  private updateHpBars(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.drawHpBar(this.playerHpBar, 30, h * 0.58 + 25, 200, this.playerCreature.currentHp, this.playerCreature.maxHp);
    this.drawHpBar(this.wildHpBar, w - 230, 45, 200, this.wildCreature.currentHp, this.wildCreature.maxHp);

    this.playerInfoText.setText(`${this.playerCreature.nickname}  Lv.${this.playerCreature.level}`);
    this.wildInfoText.setText(`${this.wildCreature.nickname}  Lv.${this.wildCreature.level}`);
  }

  private onWildFainted(): void {
    this.state = 'ended';
    this.messageText.setText(`${this.wildCreature.nickname} fainted!`);

    // Fade out wild creature
    this.tweens.add({
      targets: this.wildGfx,
      alpha: 0,
      y: this.wildGfx.y + 30,
      duration: 600,
    });

    // Award XP
    const levels = awardXp(this.playerCreature, this.wildCreature.level);
    this.save.wins++;
    saveGame(this.save);

    this.time.delayedCall(1200, () => {
      let msg = `${this.playerCreature.nickname} gained experience!`;
      if (levels > 0) {
        msg += ` Leveled up to ${this.playerCreature.level}!`;
      }
      this.messageText.setText(msg);

      this.time.delayedCall(1500, () => {
        this.returnToOverworld();
      });
    });
  }

  private onPlayerFainted(): void {
    // Check for other alive party members
    const nextAlive = this.save.party.find(c => c.currentHp > 0 && c.uid !== this.playerCreature.uid);

    if (nextAlive) {
      this.messageText.setText(`${this.playerCreature.nickname} fainted! Send next creature?`);
      this.tweens.add({
        targets: this.playerGfx,
        alpha: 0,
        duration: 400,
      });
      this.time.delayedCall(1000, () => {
        this.showSwitchMenu();
      });
    } else {
      this.state = 'ended';
      this.messageText.setText('All your creatures fainted! You blacked out...');
      this.tweens.add({
        targets: this.playerGfx,
        alpha: 0,
        duration: 400,
      });
      this.time.delayedCall(2000, () => {
        // Heal all creatures and return
        this.save.party.forEach(c => { c.currentHp = c.maxHp; });
        saveGame(this.save);
        this.returnToOverworld();
      });
    }
  }

  private doCatch(): void {
    this.clearButtons();
    this.state = 'catch_anim';

    const result = attemptCatch(this.wildCreature);

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
          if (shakesDone < result.shakes) {
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
            if (result.success) {
              this.messageText.setText(`Gotcha! ${this.wildCreature.nickname} was caught!`);
              catchGfx.destroy();
              this.wildGfx.setAlpha(0);

              if (this.save.party.length < 6) {
                this.save.party.push(this.wildCreature);
              } else {
                this.save.box.push(this.wildCreature);
                this.messageText.setText(
                  `${this.wildCreature.nickname} was caught! Party full — sent to box.`
                );
              }
              this.save.caught++;
              saveGame(this.save);

              this.time.delayedCall(2000, () => this.returnToOverworld());
            } else {
              this.messageText.setText(`Oh no! ${this.wildCreature.nickname} broke free!`);
              catchGfx.destroy();

              this.time.delayedCall(1000, () => {
                // Enemy gets a free attack
                const enemyMove = aiPickMove(this.wildCreature);
                const enemyResult = executeTurn(this.wildCreature, this.playerCreature, enemyMove);
                this.showTurnResult(enemyResult, false, () => {
                  if (this.playerCreature.currentHp <= 0) {
                    this.onPlayerFainted();
                    return;
                  }
                  this.showActionMenu();
                });
              });
            }
          }
        };
        doShake();
      }
    });
  }

  private doRun(): void {
    this.clearButtons();
    // Running always succeeds (can be tweaked)
    const escaped = Math.random() < 0.8 || this.playerCreature.speed > this.wildCreature.speed;

    if (escaped) {
      this.messageText.setText('Got away safely!');
      this.time.delayedCall(1000, () => this.returnToOverworld());
    } else {
      this.messageText.setText("Couldn't escape!");
      this.time.delayedCall(800, () => {
        const enemyMove = aiPickMove(this.wildCreature);
        const result = executeTurn(this.wildCreature, this.playerCreature, enemyMove);
        this.showTurnResult(result, false, () => {
          if (this.playerCreature.currentHp <= 0) {
            this.onPlayerFainted();
            return;
          }
          this.showActionMenu();
        });
      });
    }
  }

  private refreshCreatureGraphics(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    this.playerGfx.destroy();
    const species = getSpeciesById(this.playerCreature.speciesId)!;
    this.playerGfx = drawCreature(this, w * 0.25, h * 0.42, species.shape, false);
    this.updateHpBars();
  }

  private returnToOverworld(): void {
    saveGame(this.save);
    this.scene.start('OverworldScene', { save: this.save });
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
    zone.on('pointerdown', () => { if (this.state === 'choosing') callback(); });

    container.add([bg, text, zone]);
    return container;
  }

  private clearButtons(): void {
    [...this.moveButtons, ...this.actionButtons].forEach(c => c.destroy());
    this.moveButtons = [];
    this.actionButtons = [];
  }
}