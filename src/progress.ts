import { LEVEL_COUNT, levelLamps } from "./levels";
import { LAMP_CATALOG } from "./lamp-catalog";
import { readValue, writeValue } from "./storage";

const KEY = "levels-v2";
const validLevel = (n: unknown): n is number =>
  Number.isInteger(n) && (n as number) >= 0 && (n as number) < LEVEL_COUNT;
const validLamp = (n: unknown): n is number =>
  Number.isInteger(n) && (n as number) >= 0 && (n as number) < LAMP_CATALOG.length;
/**
 * Which levels are unlocked and cleared, which of the hundred lamps are in
 * the collection (finish lamps by passing a level, the others by picking them
 * up on a passed run) and the best score per level.
 */
export class LevelProgress {
  unlocked = 0;
  cleared: boolean[] = Array(LEVEL_COUNT).fill(false);
  lamps: boolean[] = Array(LAMP_CATALOG.length).fill(false);
  best: number[] = Array(LEVEL_COUNT).fill(0);
  /** Endless mode records: highest score and longest distance in metres. */
  endlessBest = 0;
  endlessDistance = 0;
  constructor() {
    try {
      const saved = JSON.parse(readValue(KEY, "null"));
      if (saved?.version !== 2) return;
      if (validLevel(saved.unlocked)) this.unlocked = saved.unlocked;
      if (Array.isArray(saved.lamps))
        for (const id of saved.lamps) if (validLamp(id)) this.lamps[id] = true;
      if (Array.isArray(saved.cleared))
        for (const level of saved.cleared) if (validLevel(level)) this.cleared[level] = true;
      // Saves from before bonus levels only know finish lamps; a finish lamp means a clear.
      for (let level = 0; level < LEVEL_COUNT; level++) {
        const finish = levelLamps(level).finish;
        if (finish >= 0 && this.lamps[finish]) this.cleared[level] = true;
      }
      // Every cleared level opens the one after it, even when the save was
      // written before that level existed.
      this.cleared.forEach((done, level) => {
        if (done) this.unlocked = Math.max(this.unlocked, Math.min(LEVEL_COUNT - 1, level + 1));
      });
      if (Number.isSafeInteger(saved.endlessBest) && saved.endlessBest > 0)
        this.endlessBest = saved.endlessBest;
      if (Number.isSafeInteger(saved.endlessDistance) && saved.endlessDistance > 0)
        this.endlessDistance = saved.endlessDistance;
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
  get clearedCount() {
    return this.cleared.filter(Boolean).length;
  }
  /** How many levels from `from` up to (not including) `to` have been passed. */
  clearedBetween(from: number, to: number) {
    let count = 0;
    for (let level = from; level < to; level++) if (this.passed(level)) count++;
    return count;
  }
  isUnlocked(level: number) {
    return validLevel(level) && level <= this.unlocked;
  }
  /** Whether the level has been passed. */
  passed(level: number) {
    return validLevel(level) && this.cleared[level];
  }
  /** How many of the level's lamps are in the collection. */
  lampsFound(level: number) {
    if (!validLevel(level)) return 0;
    const { pickups, finish } = levelLamps(level);
    return [...pickups, finish].filter((id) => validLamp(id) && this.lamps[id]).length;
  }
  /** Saves a lamp; returns whether it is new to the collection. */
  collect(lampId: number) {
    if (!validLamp(lampId)) return false;
    const isNew = !this.lamps[lampId];
    this.lamps[lampId] = true;
    this.save();
    return isNew;
  }
  /** Records an endless run; returns whether the score is a new record. */
  completeEndless(score: number, distance: number) {
    const newBest = score > this.endlessBest;
    if (newBest) this.endlessBest = score;
    this.endlessDistance = Math.max(this.endlessDistance, Math.floor(distance));
    this.save();
    return newBest;
  }
  /** Records a finished run; only passed runs count as a level best. */
  complete(level: number, score: number, passed: boolean) {
    if (!validLevel(level)) return { newBest: false, newlyEarned: false };
    const newBest = passed && score > this.best[level];
    if (newBest) this.best[level] = score;
    const finish = levelLamps(level).finish;
    const newlyEarned = passed && !this.cleared[level];
    if (passed) {
      this.cleared[level] = true;
      if (finish >= 0) this.lamps[finish] = true;
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
        cleared: this.cleared.flatMap((done, level) => (done ? [level] : [])),
        lamps: this.lamps.flatMap((owned, id) => (owned ? [id] : [])),
        best: this.best,
        endlessBest: this.endlessBest,
        endlessDistance: this.endlessDistance,
      }),
    );
  }
}
