import Phaser from 'phaser';
import { SaveData, ItemType } from '../../core/types';
import { saveGame } from '../../core/saveManager';
import { EventBus, gameEvents } from '../../core/eventBus';

/** Menu option configuration */
interface MenuOption {
  label: string;
  color: number;
  callback: () => void;
}

/**
 * Manages the main menu popup and items popup for the overworld scene.
 * Handles all menu interactions and scene transitions.
 */
export class OverworldMenuController {
  private scene: Phaser.Scene;
  private save: SaveData;
  private getPlayerPosition: () => { x: number; y: number };
  private isNearWater: () => boolean;
  private triggerEncounter: (water: boolean) => void;
  private events: EventBus;

  private mainMenuPopup!: Phaser.GameObjects.Container;
  private mainMenuVisible = false;
  private itemsPopup!: Phaser.GameObjects.Container;
  private itemsPopupVisible = false;

  constructor(
    scene: Phaser.Scene,
    save: SaveData,
    getPlayerPosition: () => { x: number; y: number },
    isNearWater: () => boolean,
    triggerEncounter: (water: boolean) => void,
    events: EventBus = gameEvents,
  ) {
    this.scene = scene;
    this.save = save;
    this.getPlayerPosition = getPlayerPosition;
    this.isNearWater = isNearWater;
    this.triggerEncounter = triggerEncounter;
    this.events = events;
    this.create();
  }

  private create(): void {
    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;

    // Create main menu container
    this.mainMenuPopup = this.scene.add.container(0, 0);
    this.mainMenuPopup.setDepth(250);
    this.mainMenuPopup.setVisible(false);

    // Create items popup container
    this.itemsPopup = this.scene.add.container(0, 0);
    this.itemsPopup.setDepth(200);
    this.itemsPopup.setVisible(false);
  }

  /**
   * Returns true if any popup is currently visible.
   */
  isPopupVisible(): boolean {
    return this.itemsPopupVisible || this.mainMenuVisible;
  }

  /**
   * Toggles the main menu popup.
   */
  toggleMainMenu(): void {
    this.mainMenuVisible = !this.mainMenuVisible;

    if (this.mainMenuVisible) {
      this.mainMenuPopup.removeAll(true);
      this.rebuildMainMenuPopup();
      this.mainMenuPopup.setVisible(true);
      this.events.emit('menu:opened', { menuType: 'main' });
    } else {
      this.mainMenuPopup.setVisible(false);
      this.events.emit('menu:closed', { menuType: 'main' });
    }
  }

  /**
   * Toggles the items popup.
   */
  toggleItemsPopup(): void {
    this.itemsPopupVisible = !this.itemsPopupVisible;

    if (this.itemsPopupVisible) {
      this.itemsPopup.removeAll(true);
      this.rebuildItemsPopup();
      this.itemsPopup.setVisible(true);
      this.events.emit('menu:opened', { menuType: 'items' });
    } else {
      this.itemsPopup.setVisible(false);
      this.events.emit('menu:closed', { menuType: 'items' });
    }
  }

  private rebuildMainMenuPopup(): void {
    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;

    // Background overlay
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRect(0, 0, w, h);
    bg.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, w, h),
      Phaser.Geom.Rectangle.Contains,
    );
    bg.on('pointerdown', () => this.toggleMainMenu());
    this.mainMenuPopup.add(bg);

    // Popup panel
    const panelW = 260;
    const panelH = 260;
    const panelX = (w - panelW) / 2;
    const panelY = (h - panelH) / 2;

    const panel = this.scene.add.graphics();
    panel.fillStyle(0x222244, 1);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 10);
    panel.lineStyle(2, 0x6688cc, 1);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 10);
    this.mainMenuPopup.add(panel);

    // Title
    const title = this.scene.add
      .text(w / 2, panelY + 20, '📋 MENU', {
        fontSize: '18px',
        fontFamily: 'monospace',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.mainMenuPopup.add(title);

    // Menu options
    const menuOptions: MenuOption[] = [
      {
        label: '🐾 Party',
        color: 0x336644,
        callback: () => {
          this.toggleMainMenu();
          this.persistSave();
          this.scene.scene.start('PartyScene', { save: this.save });
        },
      },
      {
        label: '📖 Dex',
        color: 0x664433,
        callback: () => {
          this.toggleMainMenu();
          this.persistSave();
          this.scene.scene.start('CreatureDexScene', { save: this.save });
        },
      },
      {
        label: '🎒 Items',
        color: 0x335566,
        callback: () => {
          this.toggleMainMenu();
          this.toggleItemsPopup();
        },
      },
      {
        label: '⚙ Settings',
        color: 0x444466,
        callback: () => {
          this.toggleMainMenu();
          this.persistSave();
          this.scene.scene.start('SettingsScene');
        },
      },
    ];

    let optionY = panelY + 55;
    const btnW = 200;
    const btnH = 40;

    for (const option of menuOptions) {
      const btnX = (w - btnW) / 2;
      const currentBtnY = optionY; // Capture Y position for this button

      const btn = this.scene.add.graphics();
      btn.fillStyle(option.color, 1);
      btn.fillRoundedRect(btnX, currentBtnY, btnW, btnH, 6);
      btn.lineStyle(1, 0x88aacc, 1);
      btn.strokeRoundedRect(btnX, currentBtnY, btnW, btnH, 6);
      this.mainMenuPopup.add(btn);

      const label = this.scene.add
        .text(w / 2, currentBtnY + btnH / 2, option.label, {
          fontSize: '15px',
          fontFamily: 'monospace',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      this.mainMenuPopup.add(label);

      const zone = this.scene.add
        .zone(btnX + btnW / 2, currentBtnY + btnH / 2, btnW, btnH)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => {
        btn.clear();
        btn.fillStyle(option.color, 0.8);
        btn.fillRoundedRect(btnX, currentBtnY, btnW, btnH, 6);
        btn.lineStyle(2, 0xaaccff, 1);
        btn.strokeRoundedRect(btnX, currentBtnY, btnW, btnH, 6);
      });
      zone.on('pointerout', () => {
        btn.clear();
        btn.fillStyle(option.color, 1);
        btn.fillRoundedRect(btnX, currentBtnY, btnW, btnH, 6);
        btn.lineStyle(1, 0x88aacc, 1);
        btn.strokeRoundedRect(btnX, currentBtnY, btnW, btnH, 6);
      });
      zone.on('pointerdown', option.callback);
      this.mainMenuPopup.add(zone);

      optionY += btnH + 8;
    }

    // Close button
    const closeBtn = this.scene.add
      .text(w / 2, panelY + panelH - 25, '[ CLOSE ]', {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#aaaaff',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.toggleMainMenu());
    this.mainMenuPopup.add(closeBtn);
  }

  private rebuildItemsPopup(): void {
    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;

    // Background overlay
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRect(0, 0, w, h);
    bg.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, w, h),
      Phaser.Geom.Rectangle.Contains,
    );
    bg.on('pointerdown', () => this.toggleItemsPopup());
    this.itemsPopup.add(bg);

    // Popup panel
    const panelW = 280;
    const panelH = 220;
    const panelX = (w - panelW) / 2;
    const panelY = (h - panelH) / 2;

    const panel = this.scene.add.graphics();
    panel.fillStyle(0x222244, 1);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 10);
    panel.lineStyle(2, 0x6688cc, 1);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 10);
    this.itemsPopup.add(panel);

    // Title
    const title = this.scene.add
      .text(w / 2, panelY + 20, '🎒 ITEMS', {
        fontSize: '18px',
        fontFamily: 'monospace',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.itemsPopup.add(title);

    // Items list
    if (this.save.items.length === 0) {
      const emptyText = this.scene.add
        .text(w / 2, panelY + 80, 'No items yet!\nExplore to find items.', {
          fontSize: '14px',
          fontFamily: 'monospace',
          color: '#888888',
          align: 'center',
        })
        .setOrigin(0.5);
      this.itemsPopup.add(emptyText);
    } else {
      let itemY = panelY + 50;

      for (const itemType of this.save.items) {
        const itemName =
          itemType === ItemType.FishingRod ? '🎣 Fishing Rod' : itemType;
        const itemDesc =
          itemType === ItemType.FishingRod ? 'Use near water to fish' : '';

        // Item button
        const btnW = 240;
        const btnH = 45;
        const btnX = (w - btnW) / 2;
        const currentBtnY = itemY; // Capture Y position for this button

        const btn = this.scene.add.graphics();
        btn.fillStyle(0x335566, 1);
        btn.fillRoundedRect(btnX, currentBtnY, btnW, btnH, 6);
        btn.lineStyle(1, 0x66aacc, 1);
        btn.strokeRoundedRect(btnX, currentBtnY, btnW, btnH, 6);
        this.itemsPopup.add(btn);

        const itemLabel = this.scene.add.text(btnX + 10, currentBtnY + 8, itemName, {
          fontSize: '14px',
          fontFamily: 'monospace',
          color: '#ffffff',
          fontStyle: 'bold',
        });
        this.itemsPopup.add(itemLabel);

        const descLabel = this.scene.add.text(btnX + 10, currentBtnY + 26, itemDesc, {
          fontSize: '10px',
          fontFamily: 'monospace',
          color: '#88aacc',
        });
        this.itemsPopup.add(descLabel);

        // Interactive zone
        const zone = this.scene.add
          .zone(btnX + btnW / 2, currentBtnY + btnH / 2, btnW, btnH)
          .setInteractive({ useHandCursor: true });
        zone.on('pointerover', () => {
          btn.clear();
          btn.fillStyle(0x446688, 1);
          btn.fillRoundedRect(btnX, currentBtnY, btnW, btnH, 6);
          btn.lineStyle(2, 0x88ccff, 1);
          btn.strokeRoundedRect(btnX, currentBtnY, btnW, btnH, 6);
        });
        zone.on('pointerout', () => {
          btn.clear();
          btn.fillStyle(0x335566, 1);
          btn.fillRoundedRect(btnX, currentBtnY, btnW, btnH, 6);
          btn.lineStyle(1, 0x66aacc, 1);
          btn.strokeRoundedRect(btnX, currentBtnY, btnW, btnH, 6);
        });
        zone.on('pointerdown', () => {
          this.useItem(itemType);
        });
        this.itemsPopup.add(zone);

        itemY += btnH + 8;
      }
    }

    // Close button
    const closeBtn = this.scene.add
      .text(w / 2, panelY + panelH - 25, '[ CLOSE ]', {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#aaaaff',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.toggleItemsPopup());
    this.itemsPopup.add(closeBtn);
  }

  private useItem(itemType: ItemType): void {
    if (itemType === ItemType.FishingRod) {
      // Check if near water
      const nearWater = this.isNearWater();

      if (nearWater) {
        this.toggleItemsPopup(); // Close popup
        this.events.emit('item:used', { itemType, success: true });
        this.triggerEncounter(true); // Water encounter
      } else {
        // Emit failed item use
        this.events.emit('item:used', { itemType, success: false });
        
        // Show message that you need to be near water
        const msg = this.scene.add
          .text(
            this.scene.cameras.main.width / 2,
            80,
            'You need to be near water to fish!',
            {
              fontSize: '14px',
              fontFamily: 'monospace',
              color: '#ff6666',
              backgroundColor: '#000000aa',
              padding: { x: 10, y: 5 },
            },
          )
          .setOrigin(0.5)
          .setDepth(300);

        this.scene.time.delayedCall(1500, () => msg.destroy());
      }
    }
  }

  private persistSave(): void {
    const pos = this.getPlayerPosition();
    this.save.playerX = pos.x;
    this.save.playerY = pos.y;
    saveGame(this.save);
  }

  /**
   * Updates the save data reference.
   */
  setSave(save: SaveData): void {
    this.save = save;
  }

  /**
   * Destroys all popup elements.
   */
  destroy(): void {
    this.mainMenuPopup.destroy();
    this.itemsPopup.destroy();
  }
}
