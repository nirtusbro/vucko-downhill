import { readValue, writeValue } from "./storage";
import { LAMP_CATALOG } from "./lamp-catalog";
export const LAMP_NAMES = LAMP_CATALOG.map((lamp) => lamp.name);
const validCounts = (value: unknown, length: number): value is number[] =>
  Array.isArray(value) &&
  value.length === length &&
  value.every((n) => Number.isSafeInteger(n) && n >= 0);
/** Stable catalogue IDs; the four original designs retain their saved counts. */
export class LampCollection {
  counts: number[] = Array(100).fill(0);
  constructor() {
    const stored = readValue("lamp-catalog-v1", "");
    try {
      if (stored) {
        const saved = JSON.parse(stored);
        if (saved?.version === 1 && validCounts(saved.counts, 100))
          this.counts = saved.counts;
      } else {
        const old = JSON.parse(readValue("lamp-collection", "null"));
        if (validCounts(old, 4)) {
          old.forEach((count, id) => {
            this.counts[id] = count;
          });
          this.save();
        }
      }
    } catch {
      /* Invalid storage never prevents skiing. */
    }
  }
  get discovered() {
    return this.counts.filter((count) => count > 0).length;
  }
  private save() {
    writeValue(
      "lamp-catalog-v1",
      JSON.stringify({ version: 1, counts: this.counts }),
    );
  }
  add(id: number) {
    if (!Number.isSafeInteger(id) || id < 0 || id >= 100) return false;
    const isNew = this.counts[id] === 0;
    this.counts[id] = Math.min(Number.MAX_SAFE_INTEGER, this.counts[id] + 1);
    this.save();
    return isNew;
  }
}
