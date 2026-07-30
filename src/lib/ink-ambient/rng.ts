export class SeededRng {
  state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  pick<T>(values: readonly T[]): T {
    return values[Math.min(values.length - 1, Math.floor(this.next() * values.length))];
  }

  weighted<T>(values: readonly { value: T; weight: number }[]): T {
    const total = values.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
    if (total <= 0) return values[0].value;
    let cursor = this.next() * total;
    for (const item of values) {
      cursor -= Math.max(0, item.weight);
      if (cursor <= 0) return item.value;
    }
    return values[values.length - 1].value;
  }
}

export function randomSeed(): number {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return value[0] >>> 0;
  }
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}
