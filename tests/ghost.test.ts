import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ghostPose,
  loadGhost,
  paceDelta,
  recordSample,
  saveGhost,
  GHOST_STEP,
} from "../src/ghost";
import { createRun, stepRun } from "../src/physics";

describe("pace ghost", () => {
  it("samples a run every tenth of a second and replays its path", () => {
    const run = createRun(0, 11);
    run.course = { ...run.course, hazards: [] };
    const trace: number[] = [];
    for (let i = 0; i < 1200; i++) {
      stepRun(run, 0.05, 1 / 120);
      recordSample(trace, run);
    }
    expect(trace.length / 2).toBe(Math.floor(run.time / GHOST_STEP + 1e-6) + 1);
    const pose = ghostPose(trace, 5)!;
    expect(Math.abs(pose.z - trace[2 * 50 + 1])).toBeLessThan(0.5);
    expect(pose.heading).toBeGreaterThan(0);
    expect(pose.finished).toBe(false);
    expect(ghostPose(trace, 999)!.finished).toBe(true);
    expect(ghostPose([], 1)).toBeNull();
  });
  it("reports seconds behind or ahead at the same distance", () => {
    const trace: number[] = [];
    for (let i = 0; i <= 100; i++) trace.push(0, i * 3);
    expect(paceDelta(trace, { z: 150, time: 5 })).toBeCloseTo(0, 5);
    expect(paceDelta(trace, { z: 150, time: 6.2 })).toBeCloseTo(1.2, 5);
    expect(paceDelta(trace, { z: 151.5, time: 5 })).toBeCloseTo(-0.05, 5);
    expect(paceDelta(trace, { z: 400, time: 12 })).toBeCloseTo(2, 5);
    expect(paceDelta([], { z: 10, time: 1 })).toBe(0);
  });
  describe("storage", () => {
    let data: Map<string, string>;
    beforeEach(() => {
      data = new Map();
      vi.stubGlobal("localStorage", {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => data.set(key, value),
      });
    });
    afterEach(() => vi.unstubAllGlobals());
    it("saves one rounded ghost per difficulty and rejects damaged saves", () => {
      saveGhost(4, [0, 0, 0.123, 3.456, 1, 6]);
      expect(loadGhost(4)).toEqual([0, 0, 0.1, 3.5, 1, 6]);
      expect(loadGhost(5)).toBeNull();
      data.set("vucko-downhill:ghost:level-5", "[1,2,3]");
      expect(loadGhost(5)).toBeNull();
      data.set("vucko-downhill:ghost:level-6", "{not json");
      expect(loadGhost(6)).toBeNull();
    });
  });
});
