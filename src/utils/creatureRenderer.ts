import Phaser from 'phaser';
import { ShapeDescriptor } from '../core/types';

/**
 * Draw a creature using only Phaser Graphics primitives.
 * Returns the Graphics object so it can be positioned.
 */
export function drawCreature(
  scene: Phaser.Scene,
  x: number,
  y: number,
  shape: ShapeDescriptor,
  flipX: boolean = false,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const s = shape.size * 40; // base size in pixels

  const sx = flipX ? -1 : 1;

  g.setPosition(x, y);

  // ── Body ─────────────────────────────────────────────
  g.fillStyle(shape.bodyColor, 1);
  switch (shape.bodyShape) {
    case 'circle':
      g.fillCircle(0, 0, s);
      break;
    case 'oval':
      g.fillEllipse(0, 0, s * 2.2, s * 1.6);
      break;
    case 'square':
      g.fillRoundedRect(-s, -s, s * 2, s * 2, 6);
      break;
    case 'diamond':
      g.beginPath();
      g.moveTo(0, -s * 1.2);
      g.lineTo(s, 0);
      g.lineTo(0, s * 1.2);
      g.lineTo(-s, 0);
      g.closePath();
      g.fillPath();
      break;
    case 'triangle':
      g.beginPath();
      g.moveTo(0, -s * 1.2);
      g.lineTo(s, s);
      g.lineTo(-s, s);
      g.closePath();
      g.fillPath();
      break;
  }

  // ── Eyes ──────────────────────────────────────────────
  const eyeOffsetX = s * 0.35 * sx;
  const eyeOffsetY = -s * 0.15;
  const eyeR = s * 0.15;

  g.fillStyle(0xffffff, 1);
  g.fillCircle(-eyeOffsetX, eyeOffsetY, eyeR * 1.3);
  g.fillCircle(eyeOffsetX, eyeOffsetY, eyeR * 1.3);

  g.fillStyle(shape.eyeColor, 1);
  g.fillCircle(-eyeOffsetX + sx * 2, eyeOffsetY, eyeR);
  g.fillCircle(eyeOffsetX + sx * 2, eyeOffsetY, eyeR);

  // Pupil highlights
  g.fillStyle(0xffffff, 0.8);
  g.fillCircle(-eyeOffsetX + sx * 1, eyeOffsetY - 2, eyeR * 0.35);
  g.fillCircle(eyeOffsetX + sx * 1, eyeOffsetY - 2, eyeR * 0.35);

  // ── Mouth ────────────────────────────────────────────
  g.lineStyle(1.5, 0x333333, 0.7);
  g.beginPath();
  g.arc(0, s * 0.2, s * 0.2, 0.1, Math.PI - 0.1, false);
  g.strokePath();

  // ── Tail ─────────────────────────────────────────────
  if (shape.hasTail) {
    g.fillStyle(shape.accentColor, 1);
    g.beginPath();
    const tailDir = -sx;
    g.moveTo(tailDir * s * 0.8, s * 0.1);
    g.lineTo(tailDir * s * 1.6, -s * 0.4);
    g.lineTo(tailDir * s * 1.4, s * 0.2);
    g.closePath();
    g.fillPath();
  }

  // ── Crest / horn ─────────────────────────────────────
  if (shape.hasCrest) {
    g.fillStyle(shape.accentColor, 1);
    g.beginPath();
    g.moveTo(-s * 0.2, -s * 0.9);
    g.lineTo(0, -s * 1.6);
    g.lineTo(s * 0.2, -s * 0.9);
    g.closePath();
    g.fillPath();
  }

  // ── Wings ────────────────────────────────────────────
  if (shape.hasWings) {
    g.fillStyle(shape.accentColor, 0.7);
    // Left wing
    g.beginPath();
    g.moveTo(-s * 0.7, -s * 0.1);
    g.lineTo(-s * 1.8, -s * 0.7);
    g.lineTo(-s * 1.4, s * 0.3);
    g.closePath();
    g.fillPath();
    // Right wing
    g.beginPath();
    g.moveTo(s * 0.7, -s * 0.1);
    g.lineTo(s * 1.8, -s * 0.7);
    g.lineTo(s * 1.4, s * 0.3);
    g.closePath();
    g.fillPath();
  }

  // ── Feet ─────────────────────────────────────────────
  g.fillStyle(shape.accentColor, 1);
  g.fillCircle(-s * 0.3, s * 0.85, s * 0.18);
  g.fillCircle(s * 0.3, s * 0.85, s * 0.18);

  return g;
}

/** Get a hex color string for a type */
export function typeColor(type: string): number {
  switch (type) {
    case 'fire': return 0xff5533;
    case 'water': return 0x3399ff;
    case 'grass': return 0x44cc44;
    case 'normal': return 0xcccccc;
    default: return 0xffffff;
  }
}

/** Type label background colors */
export function typeColorStr(type: string): string {
  switch (type) {
    case 'fire': return '#ff5533';
    case 'water': return '#3399ff';
    case 'grass': return '#44cc44';
    case 'normal': return '#cccccc';
    default: return '#ffffff';
  }
}