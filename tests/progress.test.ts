import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LevelProgress } from "../src/progress";
import { LEVEL_COUNT, levelLamps } from "../src/levels";

describe("level progress", () => {
  let data: Map<string, string>;
  beforeEach(() => {
    data = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  it("starts at level one with no lamps", () => {
    const progress = new LevelProgress();
    expect(progress.unlocked).toBe(0);
    expect(progress.earnedCount).toBe(0);
    expect(progress.isUnlocked(0)).toBe(true);
    expect(progress.isUnlocked(1)).toBe(false);
    expect(progress.lampsFound(0)).toBe(0);
    expect(progress.passed(0)).toBe(false);
  });
  it("saves slope pickups at once and tells new lamps from repeats", () => {
    const progress = new LevelProgress();
    const [first] = levelLamps(0).pickups;
    expect(progress.collect(first)).toBe(true);
    expect(progress.collect(first)).toBe(false);
    expect(progress.collect(-1)).toBe(false);
    expect(progress.collect(100)).toBe(false);
    expect(progress.lampsFound(0)).toBe(1);
    expect(progress.earnedCount).toBe(1);
    expect(new LevelProgress().lamps[first]).toBe(true);
    expect(progress.unlocked).toBe(0);
  });
  it("earns the finish lamp and unlocks the next level only when the goal is reached", () => {
    const progress = new LevelProgress();
    const { finish } = levelLamps(0);
    expect(progress.complete(0, 900, false)).toEqual({ newBest: true, newlyEarned: false });
    expect(progress.lamps[finish]).toBe(false);
    expect(progress.unlocked).toBe(0);
    expect(progress.best[0]).toBe(900);
    expect(progress.complete(0, 2000, true)).toEqual({ newBest: true, newlyEarned: true });
    expect(progress.passed(0)).toBe(true);
    expect(progress.unlocked).toBe(1);
    expect(progress.complete(0, 1500, true)).toEqual({ newBest: false, newlyEarned: false });
    expect(progress.best[0]).toBe(2000);
    const reloaded = new LevelProgress();
    expect(reloaded.unlocked).toBe(1);
    expect(reloaded.lamps[finish]).toBe(true);
    expect(reloaded.best[0]).toBe(2000);
    expect(reloaded.lampsFound(0)).toBe(1);
  });
  it("caps at the last level and ignores damaged saves", () => {
    const progress = new LevelProgress();
    progress.complete(LEVEL_COUNT - 1, 100, true);
    expect(progress.unlocked).toBe(LEVEL_COUNT - 1);
    expect(progress.complete(LEVEL_COUNT, 100, true)).toEqual({ newBest: false, newlyEarned: false });
    data.set(
      "vucko-downhill:levels-v2",
      '{"version":2,"unlocked":500,"lamps":[-1,3,"x",99],"best":[-5,1e20,7]}',
    );
    const damaged = new LevelProgress();
    expect(damaged.unlocked).toBe(0);
    expect(damaged.lamps[3]).toBe(true);
    expect(damaged.lamps[99]).toBe(true);
    expect(damaged.earnedCount).toBe(2);
    expect(damaged.best[0]).toBe(0);
    expect(damaged.best[1]).toBe(0);
    expect(damaged.best[2]).toBe(7);
    data.set("vucko-downhill:levels-v2", "{not json");
    expect(new LevelProgress().unlocked).toBe(0);
  });
  it("keeps session progress if browser storage is blocked", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw Error();
      },
      setItem: () => {
        throw Error();
      },
    });
    const progress = new LevelProgress();
    progress.collect(2);
    progress.complete(0, 3000, true);
    expect(progress.unlocked).toBe(1);
    expect(progress.lampsFound(0)).toBe(2);
  });
});
