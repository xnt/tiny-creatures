/**
 * Minimal map shape — avoids importing Phaser-heavy types.
 */
export interface MapDataLike {
  terrain: unknown[][];
  width: number;
  height: number;
}

/**
 * Decides whether to regenerate the map based on fresh-start flag and existing data.
 * Pure helper for testability.
 */
export function shouldRegenerateMap(
  fresh: boolean | undefined,
  existingMapData: MapDataLike | undefined,
): boolean {
  return fresh === true || existingMapData === undefined;
}
