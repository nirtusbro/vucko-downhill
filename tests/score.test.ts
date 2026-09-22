import { describe, expect, it } from "vitest";
import { createRun, stepRun, FINISH_Z } from "../src/physics";
import { finishTimeBonus } from "../src/scoring";
describe("finish time scoring", () => {
  it("awards 50 points per second under 90 seconds, never negative", () => {
    expect(finishTimeBonus(30)).toBe(3000);
    expect(finishTimeBonus(40.5)).toBe(2475);
    expect(finishTimeBonus(90)).toBe(0);
    expect(finishTimeBonus(120)).toBe(0);
  });
  it("adds the bonus once at the finish and retains existing run points", () => {
    const run = createRun();
    run.nextGate = 20;
    run.z = FINISH_Z - 0.001;
    run.time = 39.99;
    run.score = 1200;
    stepRun(run, 0, 0.01);
    expect(run.timeBonus).toBe(2500);
    expect(run.score).toBe(3700);
    stepRun(run, 0, 0.01);
    expect(run.score).toBe(3700);
    expect(createRun().timeBonus).toBe(0);
  });
  it("awards no time points before finishing", () => {
    const run = createRun();
    for (let i = 0; i < 60; i++) stepRun(run, 0, 1 / 120, true);
    expect(run.timeBonus).toBe(0);
    expect(run.score).toBe(0);
  });
});
