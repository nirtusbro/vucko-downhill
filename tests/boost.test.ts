import { describe, expect, it } from "vitest";
import { createRun, stepRun } from "../src/physics";

describe("hold-to-boost", () => {
  for (const level of [0, 10, 19])
    it(`adds meaningful speed while held on level ${level + 1}`, () => {
      const normal = createRun(level, 1),
        boosted = createRun(level, 1);
      for (const run of [normal, boosted]) run.course = { ...run.course, hazards: [] };
      for (let tick = 0; tick < 480; tick++) {
        stepRun(normal, 0, 1 / 120);
        stepRun(boosted, 0, 1 / 120, true);
      }
      expect(boosted.boosting).toBe(true);
      expect(boosted.speed).toBeGreaterThan(normal.speed * 1.35);
      expect(boosted.z).toBeGreaterThan(normal.z + 35);
    });
  it("keeps steering active and eases back to cruise after release", () => {
    const run = createRun(8, 1);
    run.course = { ...run.course, hazards: [] };
    for (let tick = 0; tick < 240; tick++) stepRun(run, 0.15, 1 / 120, true);
    expect(run.x).toBeGreaterThan(4);
    const speed = run.speed;
    stepRun(run, 0, 1 / 120, false);
    expect(run.boosting).toBe(false);
    expect(run.speed).toBeGreaterThan(speed - 1);
    for (let tick = 0; tick < 480; tick++) stepRun(run, 0, 1 / 120, false);
    expect(run.speed).toBeLessThan(run.course.speed * 1.1);
  });
  it("cannot boost during a crash, after finishing, or carry boost into replay", () => {
    const run = createRun(0);
    run.crashTime = 1;
    stepRun(run, 0, 1 / 120, true);
    expect(run.boosting).toBe(false);
    run.crashTime = 0;
    run.z = run.course.finishZ - 0.01;
    stepRun(run, 0, 1 / 120, true);
    expect(run.finished).toBe(true);
    expect(run.boosting).toBe(false);
    const speed = run.speed;
    stepRun(run, 0, 1 / 120, true);
    expect(run.speed).toBe(speed);
    expect(createRun(0).boosting).toBe(false);
  });
});
