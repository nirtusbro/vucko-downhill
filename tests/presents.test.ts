import { describe, expect, it } from "vitest";
import { createRun, stepRun } from "../src/physics";
import {
  PRESENT_FIRST_DROP,
  PRESENT_MIN_GAP,
  PRESENT_GAP_SPREAD,
} from "../src/presents";
const ticksUntilFirstDrop = Math.ceil(PRESENT_FIRST_DROP * 120) + 30;

describe("falling birthday presents", () => {
  it("drops ahead with time to react, clear of flags and the slope edges", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const run = createRun(19, seed);
      for (let i = 0; i < ticksUntilFirstDrop; i++) stepRun(run, 0, 1 / 120);
      const gift = run.presents.items.find((item) => item.phase === "falling")!;
      expect(gift).toBeDefined();
      expect(gift.z - run.z).toBeGreaterThan(run.speed * 2);
      expect(Math.abs(gift.x)).toBeLessThanOrEqual(11);
      expect(run.course.gates.every((gate) => Math.abs(gate.z - gift.z) >= 12)).toBe(true);
    }
  });
  it("uses fresh random positions, reproducible for a given seed", () => {
    const runs = [createRun(5, 42), createRun(5, 42), createRun(5, 43)];
    for (const run of runs)
      for (let i = 0; i < ticksUntilFirstDrop; i++) stepRun(run, 0, 1 / 120);
    expect(runs[0].presents.items).toEqual(runs[1].presents.items);
    expect(runs[0].presents.items).not.toEqual(runs[2].presents.items);
  });
  it("drops only a few well-spaced presents in a run", () => {
    expect(PRESENT_FIRST_DROP).toBeGreaterThanOrEqual(5);
    expect(PRESENT_MIN_GAP).toBeGreaterThanOrEqual(9);
    for (let seed = 1; seed <= 30; seed++) {
      const run = createRun(0, seed);
      const dropTimes: number[] = [];
      let falling = 0;
      for (let i = 0; i < 120 * 120 && !run.finished; i++) {
        stepRun(run, 0, 1 / 120);
        const now = run.presents.items.filter((item) => item.phase === "falling").length;
        if (now > falling) dropTimes.push(run.time);
        falling = now;
      }
      expect(run.finished).toBe(true);
      expect(dropTimes.length).toBeGreaterThanOrEqual(1);
      expect(dropTimes.length).toBeLessThanOrEqual(4);
      for (let i = 1; i < dropTimes.length; i++) {
        const gap = dropTimes[i] - dropTimes[i - 1];
        expect(gap).toBeGreaterThanOrEqual(PRESENT_MIN_GAP - 0.05);
        expect(gap).toBeLessThanOrEqual(PRESENT_MIN_GAP + PRESENT_GAP_SPREAD + 0.05);
      }
    }
  });
  it("collects a landed present exactly once for 200 points without altering combo", () => {
    const run = createRun(0);
    Object.assign(run.presents.items[0], { phase: "landed", x: 0, z: 0.2, age: 0 });
    run.combo = 3;
    stepRun(run, 0, 1 / 120);
    expect(run.presents.event).toBe(true);
    expect(run.presents.collected).toBe(1);
    expect(run.score).toBe(200);
    expect(run.combo).toBe(3);
    for (let i = 0; i < 60; i++) stepRun(run, 0, 1 / 120);
    expect(run.score).toBe(200);
    expect(run.presents.event).toBe(false);
  });
  it("does not collect airborne gifts, distant gifts, or gifts during a tumble", () => {
    for (const variant of ["airborne", "distant", "crash"]) {
      const run = createRun(0);
      Object.assign(run.presents.items[0], {
        phase: variant === "airborne" ? "falling" : "landed",
        x: variant === "distant" ? 10 : 0,
        z: 0.2,
        age: 0,
      });
      if (variant === "crash") run.crashTime = 1;
      stepRun(run, 0, 1 / 120);
      expect(run.presents.collected).toBe(0);
    }
  });
  it("lands a gift, retires missed gifts, and resets the pool for replay", () => {
    const run = createRun(0);
    const gift = run.presents.items[0];
    Object.assign(gift, { phase: "falling", x: 10, z: 110, age: 0 });
    run.presents.nextDrop = 100;
    for (let i = 0; i < 240; i++) stepRun(run, 0, 1 / 120);
    expect(gift.phase).toBe("landed");
    for (let i = 0; i < 600; i++) stepRun(run, 0, 1 / 120);
    expect(gift.phase).toBe("inactive");
    expect(createRun(0).presents.items.every((item) => item.phase === "inactive")).toBe(true);
  });
  it("never drops beyond the finish and freezes gifts after finishing", () => {
    const run = createRun(0);
    run.z = run.course.finishZ - 2;
    run.presents.nextDrop = 0;
    for (let i = 0; i < 120; i++) stepRun(run, 0, 1 / 120);
    expect(run.presents.items.every((item) => item.phase === "inactive")).toBe(true);
    const snapshot = JSON.stringify(run.presents);
    stepRun(run, 0, 1 / 120);
    expect(JSON.stringify(run.presents)).toBe(snapshot);
  });
});
