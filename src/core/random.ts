/**
 * Interface for a random number generator.
 * Allows injection of deterministic RNG for testing.
 */
export interface RandomSource {
  /** Returns a random number between 0 (inclusive) and 1 (exclusive) */
  random(): number;
  
  /** Returns a random integer between min (inclusive) and max (exclusive) */
  randomInt(min: number, max: number): number;
  
  /** Returns a random element from an array */
  randomElement<T>(array: T[]): T | undefined;
  
  /** Returns true with the given probability (0-1) */
  chance(probability: number): boolean;
}

/**
 * Default implementation using Math.random()
 */
export class MathRandomSource implements RandomSource {
  random(): number {
    return Math.random();
  }

  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min)) + min;
  }

  randomElement<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    return array[this.randomInt(0, array.length)];
  }

  chance(probability: number): boolean {
    return this.random() < probability;
  }
}

/** Global default random source */
export const defaultRandom = new MathRandomSource();

/**
 * Deterministic random source for testing.
 * Uses a seeded PRNG (simple LCG) for reproducible results.
 */
export class SeededRandomSource implements RandomSource {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  /** 
   * Linear Congruential Generator
   * Uses the same parameters as glibc: a=1103515245, c=12345, m=2^31
   */
  private next(): number {
    // Equivalent to: this.seed = (1103515245 * this.seed + 12345) % 2147483648
    const a = 1103515245;
    const c = 12345;
    const m = 2147483648; // 2^31
    this.seed = (a * this.seed + c) % m;
    return this.seed / m;
  }

  random(): number {
    return this.next();
  }

  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min)) + min;
  }

  randomElement<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    return array[this.randomInt(0, array.length)];
  }

  chance(probability: number): boolean {
    return this.random() < probability;
  }

  /** Reset the seed for reproducibility */
  reset(seed: number): void {
    this.seed = seed;
  }
}

/**
 * Mock random source for testing that returns predetermined values.
 */
export class MockRandomSource implements RandomSource {
  private values: number[];
  private index: number = 0;

  constructor(values: number[] = [0.5]) {
    this.values = values;
  }

  random(): number {
    const value = this.values[this.index % this.values.length];
    this.index++;
    return value;
  }

  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min)) + min;
  }

  randomElement<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    return array[this.randomInt(0, array.length)];
  }

  chance(probability: number): boolean {
    return this.random() < probability;
  }

  /** Set the predetermined values */
  setValues(values: number[]): void {
    this.values = values;
    this.index = 0;
  }

  /** Reset the index */
  reset(): void {
    this.index = 0;
  }
}
