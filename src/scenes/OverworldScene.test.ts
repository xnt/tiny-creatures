import { describe, it, expect } from 'vitest';
import { shouldRegenerateMap, MapDataLike } from './overworldHelpers';

function makeFakeMap(): MapDataLike {
  return { terrain: [['grass']], width: 1, height: 1 };
}

describe('shouldRegenerateMap', () => {
  it('returns true when fresh flag is true (regardless of existing map)', () => {
    expect(shouldRegenerateMap(true, undefined)).toBe(true);
    expect(shouldRegenerateMap(true, makeFakeMap())).toBe(true);
  });

  it('returns true when no existing map data', () => {
    expect(shouldRegenerateMap(undefined, undefined)).toBe(true);
    expect(shouldRegenerateMap(false, undefined)).toBe(true);
  });

  it('returns false when not fresh and existing map data present', () => {
    expect(shouldRegenerateMap(undefined, makeFakeMap())).toBe(false);
    expect(shouldRegenerateMap(false, makeFakeMap())).toBe(false);
  });
});
