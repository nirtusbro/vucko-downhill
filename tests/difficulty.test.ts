import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  createRun,
  stepRun,
  lampScore,
  GATES,
  LAMPS_PER_RUN,
  clamp,
} from "../src/physics";
import { readBest, writeValue } from "../src/storage";
const levels = ["easy", "classic", "expert"] as const;

describe("difficulty", () => {
  it("varies gate spacing with quick follow-ups and same-side doubles", () => {
    const gaps = GATES.slice(1).map((gate, i) => gate.z - GATES[i].z);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(30);
    expect(Math.max(...gaps)).toBeLessThanOrEqual(45);
    expect(gaps.filter((gap) => gap < 40).length).toBeGreaterThanOrEqual(3);
    const sameSide = GATES.slice(1).filter(
      (gate, i) => Math.sign(gate.x) === Math.sign(GATES[i].x),
    );
    expect(sameSide.length).toBeGreaterThanOrEqual(2);
  });
  it("gets every mode moving briskly within three seconds", () => {
    for (const [index, level] of levels.entries()) {
      const run = createRun(level);
      run.hazards = [];
      for (let tick = 0; tick < 360; tick++) stepRun(run, 0, 1 / 120);
      expect(run.speed).toBeGreaterThan([22, 28, 34][index]);
      expect(run.z).toBeGreaterThan([57, 70, 85][index]);
    }
  });
  it("gives Easy more reaction time and Expert less than Classic", () => {
    const runs = levels.map((level) => createRun(level));
    for (const run of runs) {
      run.hazards = [];
      for (let i = 0; i < 600; i++) stepRun(run, 0, 1 / 60);
    }
    expect(runs[0].z).toBeLessThan(runs[1].z - 20);
    expect(runs[2].z).toBeGreaterThan(runs[1].z + 20);
  });
  it("accepts a wide gate line in Easy but requires precision in Expert", () => {
    const results = levels.map((level) => {
      const run = createRun(level);
      run.x = GATES[0].x + 4;
      run.z = GATES[0].z - 0.1;
      run.speed = 18;
      stepRun(run, 0, 1 / 60);
      return run.hits;
    });
    expect(results).toEqual([1, 1, 0]);
  });
  it("makes Easy steering gentler at the same thumb displacement", () => {
    const easy = createRun("easy"),
      classic = createRun("classic");
    for (let i = 0; i < 60; i++) {
      stepRun(easy, 0.7, 1 / 60);
      stepRun(classic, 0.7, 1 / 60);
    }
    expect(Math.abs(easy.heading)).toBeLessThan(Math.abs(classic.heading));
  });
  for (const level of levels)
    it(`keeps all gates and optional lamps reachable in ${level}`, () => {
      for (const seed of [42, 7, 13, 21, 64, 88]) {
      const run = createRun(level, seed);
      const targets = [...GATES, ...run.lampSpots].sort((a, b) => a.z - b.z);
      let next = 0;
      for (let tick = 0; tick < 120 * 180 && !run.finished; tick++) {
        while (next < targets.length && run.z >= targets[next].z) next++;
        stepRun(
          run,
          clamp(
            ((targets[next]?.x ?? 0) - run.x) * 0.12 - run.heading * 0.8,
            -1,
            1,
          ),
          1 / 120,
        );
      }
      expect(run.finished).toBe(true);
      expect(run.hits).toBe(20);
      expect(run.lamps).toBe(LAMPS_PER_RUN);
      expect(
        run.score -
          run.timeBonus -
          run.presents.collected * 200 -
          run.bullseyes * 50 -
          lampScore(run),
      ).toBe(13200);
      expect(run.time).toBeGreaterThan(27);
      expect(run.time).toBeLessThan(60);
      }
    });
});

describe("difficulty best scores", () => {
  beforeEach(() => {
    const data = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  it("preserves an existing best as Classic without sharing it with other levels", () => {
    writeValue("best", "5600");
    expect(readBest("classic")).toBe(5600);
    expect(readBest("easy")).toBe(0);
    expect(readBest("expert")).toBe(0);
  });
  it("reads independent records for each difficulty", () => {
    writeValue("best:easy", "8200");
    writeValue("best:classic", "6000");
    writeValue("best:expert", "4300");
    expect(readBest("easy")).toBe(8200);
    expect(readBest("classic")).toBe(6000);
    expect(readBest("expert")).toBe(4300);
  });
});
