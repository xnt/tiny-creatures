import Phaser from 'phaser';
import { CreatureInstance, ShapeDescriptor } from '../../core/types';
import { PlannedTurn, CatchAttemptResult } from '../../core/battleEngine';
import { drawCreature } from '../../utils/creatureRenderer';

/** Animation completion callback */
export type AnimationCallback = () => void;

/** Turn animation info */
export interface TurnAnimationInfo {
  planned: PlannedTurn;
  isPlayerAttacker: boolean;
}

/**
 * Handles all battle animations: attacks, faints, catches, and creature switching.
 * Provides tween-based animations with callback support.
 */
export class BattleAnimator {
  private scene: Phaser.Scene;

  // Creature graphics references (managed externally)
  private playerGfx: Phaser.GameObjects.Graphics | null = null;
  private wildGfx: Phaser.GameObjects.Graphics | null = null;

  // Message text reference for battle log updates
  private messageText: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Set the message text object for displaying battle messages.
   */
  setMessageText(text: Phaser.GameObjects.Text): void {
    this.messageText = text;
  }

  /**
   * Set the player creature graphics reference.
   */
  setPlayerGraphics(gfx: Phaser.GameObjects.Graphics): void {
    this.playerGfx = gfx;
  }

  /**
   * Set the wild creature graphics reference.
   */
  setWildGraphics(gfx: Phaser.GameObjects.Graphics): void {
    this.wildGfx = gfx;
  }

  /**
   * Get the player creature graphics.
   */
  getPlayerGraphics(): Phaser.GameObjects.Graphics | null {
    return this.playerGfx;
  }

  /**
   * Get the wild creature graphics.
   */
  getWildGraphics(): Phaser.GameObjects.Graphics | null {
    return this.wildGfx;
  }

  /**
   * Draw a creature at the specified position.
   * Returns the created graphics object.
   */
  drawCreature(
    x: number, 
    y: number, 
    shape: ShapeDescriptor, 
    isWild: boolean
  ): Phaser.GameObjects.Graphics {
    const gfx = drawCreature(this.scene, x, y, shape, isWild);
    
    if (isWild) {
      this.wildGfx = gfx;
    } else {
      this.playerGfx = gfx;
    }
    
    return gfx;
  }

  /**
   * Destroy creature graphics.
   */
  destroyCreatureGraphics(isPlayer: boolean): void {
    if (isPlayer && this.playerGfx) {
      this.playerGfx.destroy();
      this.playerGfx = null;
    } else if (!isPlayer && this.wildGfx) {
      this.wildGfx.destroy();
      this.wildGfx = null;
    }
  }

  /**
   * Animate a turn (attack animation).
   * Shows the attack message, animates the attacker, and flashes the target.
   */
  animateTurn(
    turnInfo: TurnAnimationInfo,
    onComplete: AnimationCallback
  ): void {
    const { planned, isPlayerAttacker } = turnInfo;
    const target = isPlayerAttacker ? this.wildGfx : this.playerGfx;
    
    // Build message
    let msg = '';
    if (planned.missed) {
      msg = `${planned.attacker.nickname} used ${planned.attack.name}... but missed!`;
    } else {
      msg = `${planned.attacker.nickname} used ${planned.attack.name}! `;
      if (planned.effectiveness > 1) msg += "It's super effective! ";
      else if (planned.effectiveness < 1) msg += "It's not very effective... ";
      msg += `${planned.damage} damage!`;
    }

    if (this.messageText) {
      this.messageText.setText(msg);
    }

    // Animate attack (lunge toward target)
    const attacker = isPlayerAttacker ? this.playerGfx : this.wildGfx;
    if (attacker) {
      this.scene.tweens.add({
        targets: attacker,
        x: attacker.x + (isPlayerAttacker ? 10 : -10),
        duration: 80,
        yoyo: true,
        repeat: 2,
      });
    }

    // Flash on hit (if not missed)
    if (!planned.missed && target) {
      this.scene.tweens.add({
        targets: target,
        alpha: 0.3,
        duration: 100,
        yoyo: true,
        repeat: 1,
      });
    }

    // Call onComplete after animation time
    this.scene.time.delayedCall(1200, onComplete);
  }

  /**
   * Animate a creature fainting.
   */
  animateFaint(isPlayer: boolean, onComplete?: AnimationCallback): void {
    const target = isPlayer ? this.playerGfx : this.wildGfx;
    
    if (!target) {
      onComplete?.();
      return;
    }

    this.scene.tweens.add({
      targets: target,
      alpha: 0,
      y: target.y + 30,
      duration: 600,
      onComplete: () => {
        onComplete?.();
      },
    });
  }

  /**
   * Animate a creature switching in (appearing).
   */
  animateSwitchIn(
    x: number,
    y: number,
    shape: ShapeDescriptor,
    onComplete?: AnimationCallback
  ): Phaser.GameObjects.Graphics {
    const gfx = drawCreature(this.scene, x, y, shape, false);
    gfx.setAlpha(0);
    
    this.scene.tweens.add({
      targets: gfx,
      alpha: 1,
      duration: 400,
      onComplete: () => {
        onComplete?.();
      },
    });
    
    return gfx;
  }

  /**
   * Animate a catch attempt.
   * Shows the orb throw, shakes, and success/failure.
   */
  animateCatch(
    catchResult: CatchAttemptResult,
    playerX: number,
    playerY: number,
    wildX: number,
    wildY: number,
    callbacks: {
      onThrowComplete?: AnimationCallback;
      onShake?: (shakeNum: number) => void;
      onSuccess?: AnimationCallback;
      onFailure?: AnimationCallback;
    }
  ): void {
    if (this.messageText) {
      this.messageText.setText('You threw a capture orb!');
    }

    // Create catch orb graphic
    const catchGfx = this.scene.add.graphics();
    catchGfx.fillStyle(0xff4444, 1);
    catchGfx.fillCircle(0, 0, 8);
    catchGfx.lineStyle(2, 0xffffff, 1);
    catchGfx.strokeCircle(0, 0, 8);
    catchGfx.setPosition(playerX, playerY);

    // Throw animation
    this.scene.tweens.add({
      targets: catchGfx,
      x: wildX,
      y: wildY,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        callbacks.onThrowComplete?.();
        this.playCatchShakeSequence(catchGfx, catchResult, callbacks);
      },
    });
  }

  private playCatchShakeSequence(
    catchGfx: Phaser.GameObjects.Graphics,
    catchResult: CatchAttemptResult,
    callbacks: {
      onShake?: (shakeNum: number) => void;
      onSuccess?: AnimationCallback;
      onFailure?: AnimationCallback;
    }
  ): void {
    let shakesDone = 0;
    
    const doShake = () => {
      if (shakesDone < catchResult.shakes) {
        if (this.messageText) {
          this.messageText.setText('...');
        }
        callbacks.onShake?.(shakesDone);
        
        this.scene.tweens.add({
          targets: catchGfx,
          x: catchGfx.x + 8,
          duration: 150,
          yoyo: true,
          onComplete: () => {
            shakesDone++;
            this.scene.time.delayedCall(400, doShake);
          },
        });
      } else {
        // Result
        if (catchResult.success) {
          catchGfx.destroy();
          this.wildGfx?.setAlpha(0);
          callbacks.onSuccess?.();
        } else {
          catchGfx.destroy();
          callbacks.onFailure?.();
        }
      }
    };
    
    doShake();
  }

  /**
   * Set the alpha of a creature graphic.
   */
  setCreatureAlpha(isPlayer: boolean, alpha: number): void {
    const target = isPlayer ? this.playerGfx : this.wildGfx;
    target?.setAlpha(alpha);
  }

  /**
   * Destroy all animation elements and graphics.
   */
  destroy(): void {
    this.playerGfx?.destroy();
    this.wildGfx?.destroy();
    this.playerGfx = null;
    this.wildGfx = null;
  }
}
