import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { StarterSelectScene } from './scenes/StarterSelectScene';
import { OverworldScene } from './scenes/OverworldScene';
import { BattleScene } from './scenes/BattleScene';
import { SettingsScene } from './scenes/SettingsScene';
import { PartyScene } from './scenes/PartyScene';
import { CreatureDexScene } from './scenes/CreatureDexScene';
import { CreatureDetailScene } from './scenes/CreatureDetailScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#1a1a2e',
  parent: 'game',
  scene: [BootScene, StarterSelectScene, OverworldScene, BattleScene, SettingsScene, PartyScene, CreatureDexScene, CreatureDetailScene],
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);