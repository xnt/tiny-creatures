import Phaser from 'phaser';
import { CreatureInstance, Attack } from '../../core/types';
import { getSpeciesById } from '../../data/creatures';
import { typeColor } from '../../utils/creatureRenderer';

/** Types of menus that can be displayed */
export type MenuType = 'action' | 'move' | 'switch' | 'none';

/** Callback for when an action is selected */
export type ActionCallback = (action: 'fight' | 'catch' | 'switch' | 'run') => void;
export type MoveCallback = (move: Attack) => void;
export type SwitchCallback = (creature: CreatureInstance) => void;
export type BackCallback = () => void;

/**
 * Manages battle menus: action selection, move selection, and creature switching.
 * Handles button lifecycle and input validation.
 */
export class BattleMenuController {
  private scene: Phaser.Scene;
  private canTakeAction: () => boolean;

  // Menu containers
  private currentMenu: MenuType = 'none';
  private buttons: Phaser.GameObjects.Container[] = [];

  // Message text reference (for updating menu prompts)
  private messageText: Phaser.GameObjects.Text | null = null;

  // Callbacks
  private onActionSelected: ActionCallback;
  private onMoveSelected: MoveCallback;
  private onSwitchSelected: SwitchCallback;
  private onBack: BackCallback;

  constructor(
    scene: Phaser.Scene,
    canTakeAction: () => boolean,
    callbacks: {
      onActionSelected: ActionCallback;
      onMoveSelected: MoveCallback;
      onSwitchSelected: SwitchCallback;
      onBack: BackCallback;
    },
  ) {
    this.scene = scene;
    this.canTakeAction = canTakeAction;
    this.onActionSelected = callbacks.onActionSelected;
    this.onMoveSelected = callbacks.onMoveSelected;
    this.onSwitchSelected = callbacks.onSwitchSelected;
    this.onBack = callbacks.onBack;
  }

  /**
   * Set the message text object to update with menu prompts.
   */
  setMessageText(text: Phaser.GameObjects.Text): void {
    this.messageText = text;
  }

  /**
   * Get the current menu type being displayed.
   */
  getCurrentMenu(): MenuType {
    return this.currentMenu;
  }

  /**
   * Clear all buttons from the current menu.
   */
  clearButtons(): void {
    this.buttons.forEach(b => b.destroy());
    this.buttons = [];
  }

  /**
   * Show the main action menu (Fight, Catch, Switch, Run).
   */
  showActionMenu(): void {
    this.clearButtons();
    this.currentMenu = 'action';

    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;
    const btnW = 150, btnH = 35;
    const startX = 50, startY = h - 120;

    if (this.messageText) {
      this.messageText.setText('What will you do?');
    }

    const actions = [
      { label: '⚔ Fight', callback: () => this.onActionSelected('fight') },
      { label: '🎯 Catch', callback: () => this.onActionSelected('catch') },
      { label: '🔄 Switch', callback: () => this.onActionSelected('switch') },
      { label: '🏃 Run', callback: () => this.onActionSelected('run') },
    ];

    actions.forEach((action, i) => {
      const bx = startX + (i % 2) * (btnW + 15);
      const by = startY + Math.floor(i / 2) * (btnH + 8);
      const container = this.createButton(bx, by, btnW, btnH, action.label, action.callback);
      this.buttons.push(container);
    });
  }

  /**
   * Show the move selection menu for a creature's attacks.
   */
  showMoveMenu(moves: Attack[]): void {
    this.clearButtons();
    this.currentMenu = 'move';

    if (this.messageText) {
      this.messageText.setText('Choose an attack:');
    }

    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;
    const btnW = 160, btnH = 35;
    const startX = 40, startY = h - 125;

    moves.forEach((move, i) => {
      if (!move) return;
      const bx = startX + (i % 2) * (btnW + 10);
      const by = startY + Math.floor(i / 2) * (btnH + 6);

      const label = `${move.name} (${move.power})`;
      const container = this.createButton(bx, by, btnW, btnH, label, () => {
        this.onMoveSelected(move);
      }, typeColor(move.type));
      this.buttons.push(container);
    });

    // Back button
    const backBtn = this.createButton(startX + 2 * (btnW + 10), startY, 80, btnH, '← Back', () => {
      this.onBack();
    });
    this.buttons.push(backBtn);
  }

  /**
   * Show the switch menu for selecting a different creature.
   */
  showSwitchMenu(available: CreatureInstance[], forced: boolean = false): void {
    this.clearButtons();
    this.currentMenu = 'switch';

    if (available.length === 0) {
      if (this.messageText) {
        this.messageText.setText('No other creatures available!');
      }
      this.scene.time.delayedCall(1000, () => this.onBack());
      return;
    }

    if (this.messageText) {
      this.messageText.setText('Switch to:');
    }

    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;
    const btnW = 200, btnH = 30;
    const startX = 40, startY = h - 130;

    available.forEach((creature, i) => {
      const by = startY + i * (btnH + 5);
      const species = getSpeciesById(creature.speciesId)!;
      const typeLabel = species.type.toUpperCase();
      const label = `[${typeLabel}] ${creature.nickname} Lv.${creature.level} HP:${creature.currentHp}/${creature.maxHp}`;
      const container = this.createButton(startX, by, btnW, btnH, label, () => {
        this.onSwitchSelected(creature);
      }, typeColor(species.type));
      this.buttons.push(container);
    });

    // Only show back button for voluntary switches
    if (!forced) {
      const backBtn = this.createButton(startX + btnW + 15, startY, 80, btnH, '← Back', () => {
        this.onBack();
      });
      this.buttons.push(backBtn);
    }
  }

  /**
   * Destroy all menu elements.
   */
  destroy(): void {
    this.clearButtons();
  }

  private createButton(
    x: number, y: number, w: number, h: number,
    label: string, callback: () => void,
    tintColor?: number,
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);

    const bg = this.scene.add.graphics();
    const baseColor = tintColor ?? 0x333355;
    bg.fillStyle(baseColor, 0.8);
    bg.fillRoundedRect(x, y, w, h, 5);
    bg.lineStyle(1, 0x666688, 1);
    bg.strokeRoundedRect(x, y, w, h, 5);

    const text = this.scene.add.text(x + w / 2, y + h / 2, label, {
      fontSize: '12px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5);

    const zone = this.scene.add.zone(x + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => { 
      bg.clear(); 
      bg.fillStyle(baseColor, 1); 
      bg.fillRoundedRect(x, y, w, h, 5); 
      bg.lineStyle(2, 0xaaaacc, 1); 
      bg.strokeRoundedRect(x, y, w, h, 5); 
    });
    zone.on('pointerout', () => { 
      bg.clear(); 
      bg.fillStyle(baseColor, 0.8); 
      bg.fillRoundedRect(x, y, w, h, 5); 
      bg.lineStyle(1, 0x666688, 1); 
      bg.strokeRoundedRect(x, y, w, h, 5); 
    });
    zone.on('pointerdown', () => { 
      if (this.canTakeAction()) callback(); 
    });

    container.add([bg, text, zone]);
    return container;
  }
}
