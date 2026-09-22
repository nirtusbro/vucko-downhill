import { describe, expect, it } from "vitest";
import { createRun, stepRun, FINISH_Z } from "../src/physics";

describe("hold-to-boost", () => {
  for (const difficulty of ["easy", "classic", "expert"] as const)
    it(`adds meaningful speed while held in ${difficulty}`, () => {
      const normal = createRun(difficulty, 1),
        boosted = createRun(difficulty, 1);
      normal.hazards = boosted.hazards = [];
      for (let tick = 0; tick < 480; tick++) {
        stepRun(normal, 0, 1 / 120);
        stepRun(boosted, 0, 1 / 120, true);
      }
      expect(boosted.boosting).toBe(true);
      expect(boosted.speed).toBeGreaterThan(normal.speed * 1.35);
      expect(boosted.z).toBeGreaterThan(normal.z + 35);
    });
  it("keeps steering active and eases back to cruise after release", () => {
    const run = createRun("classic", 1);
    for (let tick = 0; tick < 240; tick++) stepRun(run, 0.15, 1 / 120, true);
    expect(run.x).toBeGreaterThan(5);
    const speed = run.speed;
    stepRun(run, 0, 1 / 120, false);
    expect(run.boosting).toBe(false);
    expect(run.speed).toBeGreaterThan(speed - 1);
    for (let tick = 0; tick < 480; tick++) stepRun(run, 0, 1 / 120, false);
    expect(run.speed).toBeLessThan(32);
  });
  it("cannot boost during a crash, after finishing, or carry boost into replay", () => {
    const run = createRun();
    run.crashTime = 1;
    stepRun(run, 0, 1 / 120, true);
    expect(run.boosting).toBe(false);
    run.crashTime = 0;
    run.z = FINISH_Z - 0.01;
    stepRun(run, 0, 1 / 120, true);
    expect(run.finished).toBe(true);
    expect(run.boosting).toBe(false);
    const speed = run.speed;
    stepRun(run, 0, 1 / 120, true);
    expect(run.speed).toBe(speed);
    expect(createRun().boosting).toBe(false);
  });
});
