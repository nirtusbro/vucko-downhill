import { LEVEL_COUNT, levelLamps } from "./levels";
import { LAMP_CATALOG } from "./lamp-catalog";
import { readValue, writeValue } from "./storage";

const KEY = "levels-v2";
const validLevel = (n: unknown): n is number =>
  Number.isInteger(n) && (n as number) >= 0 && (n as number) < LEVEL_COUNT;
const validLamp = (n: unknown): n is number =>
  Number.isInteger(n) && (n as number) >= 0 && (n as number) < LAMP_CATALOG.length;
/**
 * Which levels are unlocked, which of the hundred lamps are in the collection
 * (finish lamps by passing a level, the others by picking them up) and the
 * best score per level.
 */
export class LevelProgress {
  unlocked = 0;
  lamps: boolean[] = Array(LAMP_CATALOG.length).fill(false);
  best: number[] = Array(LEVEL_COUNT).fill(0);
  constructor() {
    try {
      const saved = JSON.parse(readValue(KEY, "null"));
      if (saved?.version !== 2) return;
      if (validLevel(saved.unlocked)) this.unlocked = saved.unlocked;
      if (Array.isArray(saved.lamps))
        for (const id of saved.lamps) if (validLamp(id)) this.lamps[id] = true;
      if (Array.isArray(saved.best))
        saved.best.forEach((score: unknown, level: number) => {
          if (validLevel(level) && Number.isSafeInteger(score) && (score as number) > 0)
            this.best[level] = score as number;
        });
    } catch {
      /* Invalid storage never prevents skiing. */
    }
  }
  get earnedCount() {
    return this.lamps.filter(Boolean).length;
  }
  isUnlocked(level: number) {
    return validLevel(level) && level <= this.unlocked;
  }
  /** Whether the level's finish lamp has been earned. */
  passed(level: number) {
    return validLevel(level) && this.lamps[levelLamps(level).finish];
  }
  /** How many of the level's five lamps are in the collection. */
  lampsFound(level: number) {
    if (!validLevel(level)) return 0;
    const { pickups, finish } = levelLamps(level);
    return [...pickups, finish].filter((id) => this.lamps[id]).length;
  }
  /** Saves a slope pickup at once; returns whether it is a new lamp. */
  collect(lampId: number) {
    if (!validLamp(lampId)) return false;
    const isNew = !this.lamps[lampId];
    this.lamps[lampId] = true;
    this.save();
    return isNew;
  }
  /** Records a finished run; returns what changed so the results can celebrate it. */
  complete(level: number, score: number, passed: boolean) {
    if (!validLevel(level)) return { newBest: false, newlyEarned: false };
    const newBest = score > this.best[level];
    if (newBest) this.best[level] = score;
    const finish = levelLamps(level).finish;
    const newlyEarned = passed && !this.lamps[finish];
    if (passed) {
      this.lamps[finish] = true;
      this.unlocked = Math.max(this.unlocked, Math.min(LEVEL_COUNT - 1, level + 1));
    }
    this.save();
    return { newBest, newlyEarned };
  }
  private save() {
    writeValue(
      KEY,
      JSON.stringify({
        version: 2,
        unlocked: this.unlocked,
        lamps: this.lamps.flatMap((owned, id) => (owned ? [id] : [])),
        best: this.best,
      }),
    );
  }
}
