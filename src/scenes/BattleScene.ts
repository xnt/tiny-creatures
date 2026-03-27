import Phaser from 'phaser';
import { SaveData, CreatureInstance, Attack } from '../core/types';
import { getSpeciesById } from '../data/creatures';
import { saveGame } from '../core/saveManager';
import { BattleActionResult, PlannedTurnInfo } from './systems';
import { 
  BattleStateMachine, 
  BattleMenuController, 
  BattleHud, 
  BattleAnimator,
  BattleHudModel,
} from './systems';

/**
 * BattleScene is a composition root that wires together battle subsystems:
 * - BattleStateMachine: handles battle rules and sequencing
 * - BattleMenuController: handles action/move/switch menus
 * - BattleHud: renders HP bars, names, levels, XP
 * - BattleAnimator: handles attack, faint, catch animations
 * 
 * The scene is responsible only for:
 * - Lifecycle management (create, destroy)
 * - Wiring modules together
 * - Delegating rendering and interaction to subsystems
 */
export class BattleScene extends Phaser.Scene {
  private save!: SaveData;
  private wildCreature!: CreatureInstance;
  private stateMachine!: BattleStateMachine;

  // Subsystems
  private menuController!: BattleMenuController;
  private hud!: BattleHud;
  private animator!: BattleAnimator;

  // UI elements
  private messageText!: Phaser.GameObjects.Text;

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

    // Create background
    this.createBackground(w, h);

    // Create message area
    this.createMessageArea(w, h);

    // Initialize HUD
    this.hud = new BattleHud(this);
    this.hud.create(this.getHudModel());

    // Initialize Animator
    this.animator = new BattleAnimator(this);
    this.animator.setMessageText(this.messageText);
    this.drawCreatures();

    // Initialize Menu Controller
    this.menuController = new BattleMenuController(
      this,
      () => this.stateMachine.canTakeAction(),
      {
        onActionSelected: (action) => this.handleActionSelected(action),
        onMoveSelected: (move) => this.handleMoveSelected(move),
        onSwitchSelected: (creature) => this.handleSwitchSelected(creature),
        onBack: () => this.menuController.showActionMenu(),
      }
    );
    this.menuController.setMessageText(this.messageText);

    // Initial display
    this.time.delayedCall(800, () => {
      this.menuController.showActionMenu();
    });
  }

  private createBackground(w: number, h: number): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x2d2d44, 0x2d2d44, 0x1a1a2e, 0x1a1a2e, 1);
    bg.fillRect(0, 0, w, h);

    // Battle platform
    bg.fillStyle(0x444466, 0.5);
    bg.fillEllipse(w * 0.25, h * 0.52, 200, 40);
    bg.fillEllipse(w * 0.75, h * 0.32, 180, 35);
  }

  private createMessageArea(w: number, h: number): void {
    const msgBg = this.add.graphics();
    msgBg.fillStyle(0x1a1a2e, 0.9);
    msgBg.fillRoundedRect(20, h - 140, w - 40, 130, 8);
    msgBg.lineStyle(2, 0x444466, 1);
    msgBg.strokeRoundedRect(20, h - 140, w - 40, 130, 8);

    this.messageText = this.add.text(40, h - 130, `A wild ${this.wildCreature.nickname} appeared!`, {
      fontSize: '15px', fontFamily: 'monospace', color: '#ffffff',
      wordWrap: { width: w - 80 },
    });
  }

  private drawCreatures(): void {
    const playerSpecies = getSpeciesById(this.stateMachine.getPlayerCreature().speciesId)!;
    const wildSpecies = getSpeciesById(this.wildCreature.speciesId)!;

    this.animator.drawCreature(
      this.hud.getPlayerCreatureX(),
      this.hud.getPlayerCreatureY(),
      playerSpecies.shape,
      false
    );
    this.animator.drawCreature(
      this.hud.getWildCreatureX(),
      this.hud.getWildCreatureY(),
      wildSpecies.shape,
      true
    );
  }

  private getHudModel(): BattleHudModel {
    return {
      playerCreature: this.stateMachine.getPlayerCreature(),
      wildCreature: this.wildCreature,
    };
  }

  // ─── Menu Action Handlers ────────────────────────────────────

  private handleActionSelected(action: 'fight' | 'catch' | 'switch' | 'run'): void {
    switch (action) {
      case 'fight':
        this.menuController.showMoveMenu(this.stateMachine.getPlayerCreature().moves);
        break;
      case 'catch':
        this.handleCatch();
        break;
      case 'switch':
        this.menuController.showSwitchMenu(
          this.stateMachine.getAvailableSwitchTargets(),
          false
        );
        break;
      case 'run':
        this.handleRun();
        break;
    }
  }

  private handleMoveSelected(move: Attack): void {
    this.menuController.clearButtons();
    const result = this.stateMachine.planAction({ type: 'attack', move });
    this.processActionResult(result);
  }

  private handleSwitchSelected(creature: CreatureInstance): void {
    this.menuController.clearButtons();
    const result = this.stateMachine.planAction({ type: 'switch', creature });
    
    // Update graphics immediately to show the new creature being attacked
    this.refreshCreatureGraphics();
    
    this.processActionResult(result);
  }

  private handleForcedSwitch(creature: CreatureInstance): void {
    this.menuController.clearButtons();
    // For forced switch after faint, just update the creature without enemy attack
    this.stateMachine.switchToFaintedCreature(creature);
    this.refreshCreatureGraphics();
    this.messageText.setText(`Go, ${creature.nickname}!`);
    this.time.delayedCall(800, () => {
      this.menuController.showActionMenu();
    });
  }

  private handleCatch(): void {
    this.menuController.clearButtons();
    const result = this.stateMachine.planAction({ type: 'catch' });
    this.processActionResult(result);
  }

  private handleRun(): void {
    this.menuController.clearButtons();
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
    this.animator.animateTurn(turnInfo, () => {
      // After animation, apply the damage
      const result = this.stateMachine.applyTurnDamage(turnInfo.planned);
      this.hud.update(this.getHudModel());

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

  private playCatchAnimation(
    catchResult: import('../core/battleEngine').CatchAttemptResult, 
    actionResult?: BattleActionResult
  ): void {
    this.animator.animateCatch(
      catchResult,
      this.hud.getPlayerCreatureX(),
      this.hud.getPlayerCreatureY(),
      this.hud.getWildCreatureX(),
      this.hud.getWildCreatureY(),
      {
        onSuccess: () => {
          this.messageText.setText(`Gotcha! ${this.wildCreature.nickname} was caught!`);
          this.time.delayedCall(2000, () => {
            this.handleBattleEnd(true, true);
          });
        },
        onFailure: () => {
          if (actionResult?.plannedTurns) {
            // Failed catch with enemy attack
            this.messageText.setText(`Oh no! ${this.wildCreature.nickname} broke free!`);
            this.time.delayedCall(1000, () => {
              this.playPlannedTurnSequence(actionResult.plannedTurns!, 0, actionResult);
            });
          } else {
            // Simple failed catch
            this.messageText.setText(`Oh no! ${this.wildCreature.nickname} broke free!`);
            this.time.delayedCall(1000, () => {
              this.menuController.showActionMenu();
            });
          }
        },
      }
    );
  }

  private afterTurnAnimations(result: BattleActionResult): void {
    if (result.battleEnded) {
      if (result.wildFainted) {
        this.animator.animateFaint(false);
      }
      if (result.playerFainted && !result.switchRequired) {
        this.animator.animateFaint(true);
      }
      this.messageText.setText(result.message);
      this.time.delayedCall(2000, () => {
        this.handleBattleEnd(result.victory ?? false, result.caught);
      });
      return;
    }

    if (result.switchRequired) {
      this.animator.animateFaint(true);
      this.messageText.setText(result.message);
      this.time.delayedCall(1000, () => {
        this.menuController.showSwitchMenu(
          this.stateMachine.getAvailableSwitchTargets(),
          true
        ); // forced switch after faint
      });
      return;
    }

    this.messageText.setText(result.message);
    this.time.delayedCall(800, () => {
      this.menuController.showActionMenu();
    });
  }

  private handleBattleEnd(victory: boolean, caught?: boolean): void {
    if (victory && !caught) {
      this.animator.animateFaint(false);
    } else if (!victory) {
      this.animator.animateFaint(true);
    }

    saveGame(this.save);
    this.time.delayedCall(2000, () => {
      this.scene.start('OverworldScene', { save: this.save });
    });
  }

  // ─── UI Helpers ──────────────────────────────────────────────

  private refreshCreatureGraphics(): void {
    this.animator.destroyCreatureGraphics(true);
    const species = getSpeciesById(this.stateMachine.getPlayerCreature().speciesId)!;
    this.animator.drawCreature(
      this.hud.getPlayerCreatureX(),
      this.hud.getPlayerCreatureY(),
      species.shape,
      false
    );
    this.hud.update(this.getHudModel());
  }

  shutdown(): void {
    // Clean up subsystems
    this.menuController?.destroy();
    this.hud?.destroy();
    this.animator?.destroy();
  }
}
