import { describe, it, expect } from 'vitest';
import { typeColor, typeColorStr, drawCreature } from './creatureRenderer';
import { ShapeDescriptor } from '../core/types';

// Mock Phaser scene with minimal graphics mock
const createMockScene = () => {
  const graphicsMethods = {
    setPosition: () => graphicsMethods,
    fillStyle: () => graphicsMethods,
    fillCircle: () => graphicsMethods,
    fillEllipse: () => graphicsMethods,
    fillRoundedRect: () => graphicsMethods,
    fillRect: () => graphicsMethods,
    beginPath: () => graphicsMethods,
    moveTo: () => graphicsMethods,
    lineTo: () => graphicsMethods,
    closePath: () => graphicsMethods,
    fillPath: () => graphicsMethods,
    strokePath: () => graphicsMethods,
    lineStyle: () => graphicsMethods,
    arc: () => graphicsMethods,
    clear: () => graphicsMethods,
  };

  const graphics = { ...graphicsMethods };

  return {
    add: {
      graphics: () => graphics,
    },
  } as unknown as Phaser.Scene;
};

describe('typeColor', () => {
  it('returns correct color for fire type', () => {
    expect(typeColor('fire')).toBe(0xff5533);
  });

  it('returns correct color for water type', () => {
    expect(typeColor('water')).toBe(0x3399ff);
  });

  it('returns correct color for grass type', () => {
    expect(typeColor('grass')).toBe(0x44cc44);
  });

  it('returns correct color for normal type', () => {
    expect(typeColor('normal')).toBe(0xcccccc);
  });

  it('returns correct color for dark type', () => {
    expect(typeColor('dark')).toBe(0x4a1a6a);
  });

  it('returns correct color for psychic type', () => {
    expect(typeColor('psychic')).toBe(0xff66cc);
  });

  it('returns correct color for fighting type', () => {
    expect(typeColor('fighting')).toBe(0xcc3322);
  });

  it('returns white for unknown type', () => {
    expect(typeColor('unknown')).toBe(0xffffff);
  });
});

describe('typeColorStr', () => {
  it('returns correct color string for fire type', () => {
    expect(typeColorStr('fire')).toBe('#ff5533');
  });

  it('returns correct color string for water type', () => {
    expect(typeColorStr('water')).toBe('#3399ff');
  });

  it('returns correct color string for grass type', () => {
    expect(typeColorStr('grass')).toBe('#44cc44');
  });

  it('returns correct color string for normal type', () => {
    expect(typeColorStr('normal')).toBe('#cccccc');
  });

  it('returns correct color string for dark type', () => {
    expect(typeColorStr('dark')).toBe('#4a1a6a');
  });

  it('returns correct color string for psychic type', () => {
    expect(typeColorStr('psychic')).toBe('#ff66cc');
  });

  it('returns correct color string for fighting type', () => {
    expect(typeColorStr('fighting')).toBe('#cc3322');
  });

  it('returns white for unknown type', () => {
    expect(typeColorStr('unknown')).toBe('#ffffff');
  });
});

describe('drawCreature', () => {
  it('returns a graphics object', () => {
    const scene = createMockScene();
    const shape: ShapeDescriptor = {
      bodyColor: 0xff0000,
      bodyShape: 'circle',
      eyeColor: 0x000000,
      accentColor: 0x00ff00,
      hasTail: false,
      hasCrest: false,
      hasWings: false,
      size: 1,
    };

    const result = drawCreature(scene, 100, 100, shape);
    expect(result).toBeDefined();
  });

  it('draws circle body shape', () => {
    const scene = createMockScene();
    const shape: ShapeDescriptor = {
      bodyColor: 0xff0000,
      bodyShape: 'circle',
      eyeColor: 0x000000,
      accentColor: 0x00ff00,
      hasTail: false,
      hasCrest: false,
      hasWings: false,
      size: 1,
    };

    const result = drawCreature(scene, 100, 100, shape);
    expect(result).toBeDefined();
  });

  it('draws oval body shape', () => {
    const scene = createMockScene();
    const shape: ShapeDescriptor = {
      bodyColor: 0xff0000,
      bodyShape: 'oval',
      eyeColor: 0x000000,
      accentColor: 0x00ff00,
      hasTail: false,
      hasCrest: false,
      hasWings: false,
      size: 1,
    };

    const result = drawCreature(scene, 100, 100, shape);
    expect(result).toBeDefined();
  });

  it('draws square body shape', () => {
    const scene = createMockScene();
    const shape: ShapeDescriptor = {
      bodyColor: 0xff0000,
      bodyShape: 'square',
      eyeColor: 0x000000,
      accentColor: 0x00ff00,
      hasTail: false,
      hasCrest: false,
      hasWings: false,
      size: 1,
    };

    const result = drawCreature(scene, 100, 100, shape);
    expect(result).toBeDefined();
  });

  it('draws diamond body shape', () => {
    const scene = createMockScene();
    const shape: ShapeDescriptor = {
      bodyColor: 0xff0000,
      bodyShape: 'diamond',
      eyeColor: 0x000000,
      accentColor: 0x00ff00,
      hasTail: false,
      hasCrest: false,
      hasWings: false,
      size: 1,
    };

    const result = drawCreature(scene, 100, 100, shape);
    expect(result).toBeDefined();
  });

  it('draws triangle body shape', () => {
    const scene = createMockScene();
    const shape: ShapeDescriptor = {
      bodyColor: 0xff0000,
      bodyShape: 'triangle',
      eyeColor: 0x000000,
      accentColor: 0x00ff00,
      hasTail: false,
      hasCrest: false,
      hasWings: false,
      size: 1,
    };

    const result = drawCreature(scene, 100, 100, shape);
    expect(result).toBeDefined();
  });

  it('draws with tail', () => {
    const scene = createMockScene();
    const shape: ShapeDescriptor = {
      bodyColor: 0xff0000,
      bodyShape: 'circle',
      eyeColor: 0x000000,
      accentColor: 0x00ff00,
      hasTail: true,
      hasCrest: false,
      hasWings: false,
      size: 1,
    };

    const result = drawCreature(scene, 100, 100, shape);
    expect(result).toBeDefined();
  });

  it('draws with crest', () => {
    const scene = createMockScene();
    const shape: ShapeDescriptor = {
      bodyColor: 0xff0000,
      bodyShape: 'circle',
      eyeColor: 0x000000,
      accentColor: 0x00ff00,
      hasTail: false,
      hasCrest: true,
      hasWings: false,
      size: 1,
    };

    const result = drawCreature(scene, 100, 100, shape);
    expect(result).toBeDefined();
  });

  it('draws with wings', () => {
    const scene = createMockScene();
    const shape: ShapeDescriptor = {
      bodyColor: 0xff0000,
      bodyShape: 'circle',
      eyeColor: 0x000000,
      accentColor: 0x00ff00,
      hasTail: false,
      hasCrest: false,
      hasWings: true,
      size: 1,
    };

    const result = drawCreature(scene, 100, 100, shape);
    expect(result).toBeDefined();
  });

  it('draws flipped creature', () => {
    const scene = createMockScene();
    const shape: ShapeDescriptor = {
      bodyColor: 0xff0000,
      bodyShape: 'circle',
      eyeColor: 0x000000,
      accentColor: 0x00ff00,
      hasTail: true,
      hasCrest: false,
      hasWings: false,
      size: 1,
    };

    const result = drawCreature(scene, 100, 100, shape, true);
    expect(result).toBeDefined();
  });
});
