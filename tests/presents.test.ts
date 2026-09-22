import { describe, expect, it } from "vitest";
import { createRun, stepRun, GATES, FINISH_Z } from "../src/physics";

describe("falling birthday presents", () => {
  it("drops ahead with time to react, clear of flags and the slope edges", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const run = createRun("expert", seed);
      for (let i = 0; i < 180; i++) stepRun(run, 0, 1 / 120);
      const gift = run.presents.items.find((item) => item.phase === "falling")!;
      expect(gift).toBeDefined();
      expect(gift.z - run.z).toBeGreaterThan(run.speed * 2);
      expect(Math.abs(gift.x)).toBeLessThanOrEqual(11);
      expect(GATES.every((gate) => Math.abs(gate.z - gift.z) >= 12)).toBe(true);
    }
  });
  it("uses fresh random positions, reproducible for a given seed", () => {
    const runs = [
      createRun("classic", 42),
      createRun("classic", 42),
      createRun("classic", 43),
    ];
    for (const run of runs)
      for (let i = 0; i < 180; i++) stepRun(run, 0, 1 / 120);
    expect(runs[0].presents.items).toEqual(runs[1].presents.items);
    expect(runs[0].presents.items).not.toEqual(runs[2].presents.items);
  });
  it("collects a landed present exactly once for 200 points without altering combo", () => {
    const run = createRun();
    Object.assign(run.presents.items[0], {
      phase: "landed",
      x: 0,
      z: 0.2,
      age: 0,
    });
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
      const run = createRun();
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
    const run = createRun();
    const gift = run.presents.items[0];
    Object.assign(gift, { phase: "falling", x: 10, z: 110, age: 0 });
    run.presents.nextDrop = 100;
    for (let i = 0; i < 240; i++) stepRun(run, 0, 1 / 120);
    expect(gift.phase).toBe("landed");
    for (let i = 0; i < 600; i++) stepRun(run, 0, 1 / 120);
    expect(gift.phase).toBe("inactive");
    expect(
      createRun().presents.items.every((item) => item.phase === "inactive"),
    ).toBe(true);
  });
  it("never drops beyond the finish and freezes gifts after finishing", () => {
    const run = createRun();
    run.z = FINISH_Z - 2;
    run.presents.nextDrop = 0;
    for (let i = 0; i < 120; i++) stepRun(run, 0, 1 / 120);
    expect(run.presents.items.every((item) => item.phase === "inactive")).toBe(
      true,
    );
    const snapshot = JSON.stringify(run.presents);
    stepRun(run, 0, 1 / 120);
    expect(JSON.stringify(run.presents)).toBe(snapshot);
  });
});
