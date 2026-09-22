import { readValue, writeValue } from "./storage";

export const LAMP_NAMES = [
  "Rose mushroom",
  "Lavender pleats",
  "Emerald banker",
  "Blue porcelain",
] as const;

/** Saved immediately on pickup, so leaving a run early still keeps its lamps. */
export class LampCollection {
  counts: number[] = [0, 0, 0, 0];
  constructor() {
    try {
      const saved: unknown = JSON.parse(readValue("lamp-collection", "null"));
      if (
        Array.isArray(saved) &&
        saved.length === 4 &&
        saved.every((n) => Number.isSafeInteger(n) && n >= 0)
      )
        this.counts = saved;
    } catch {
      /* A damaged save starts an empty shelf. */
    }
  }
  add(courseIndex: number) {
    if (!Number.isSafeInteger(courseIndex) || courseIndex < 0) return;
    const style = courseIndex % LAMP_NAMES.length;
    this.counts[style] = Math.min(
      Number.MAX_SAFE_INTEGER,
      this.counts[style] + 1,
    );
    writeValue("lamp-collection", JSON.stringify(this.counts));
  }
}
