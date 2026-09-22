import { describe, expect, it } from "vitest";
import {
  createRun,
  stepRun,
  BOOST_TURN_SCALE,
  COMBO_CAP,
  GATE_TIGHTENING,
  SLOPE_RAMP,
  GATES,
} from "../src/physics";

describe("precision and pressure", () => {
  it("awards a bullseye bonus only through the middle of a gate", () => {
    const centre = createRun("classic", 1),
      edge = createRun("classic", 1);
    centre.x = GATES[0].x;
    edge.x = GATES[0].x + 2.5;
    for (const run of [centre, edge]) {
      run.z = GATES[0].z - 0.1;
      run.speed = 18;
      stepRun(run, 0, 1 / 60);
    }
    expect(centre.hits).toBe(1);
    expect(centre.bullseyes).toBe(1);
    expect(centre.gateBonus).toBe(50);
    expect(centre.score).toBe(150);
    expect(edge.hits).toBe(1);
    expect(edge.bullseyes).toBe(0);
    expect(edge.gateBonus).toBe(0);
    expect(edge.score).toBe(100);
    stepRun(centre, 0, 1 / 60);
    expect(centre.gateBonus).toBe(0);
  });
  it("builds the combo up to ×8", () => {
    expect(COMBO_CAP).toBe(8);
    const run = createRun("classic", 1);
    for (let i = 0; i < 10; i++) {
      run.x = GATES[i].x;
      run.z = GATES[i].z - 0.1;
      run.speed = 18;
      run.heading = 0;
      run.nextGate = i;
      stepRun(run, 0, 1 / 60);
    }
    expect(run.hits).toBe(10);
    expect(run.combo).toBe(8);
  });
  it("widens turns while boosting", () => {
    expect(BOOST_TURN_SCALE).toBeLessThan(0.8);
    const cruise = createRun("classic", 1),
      boosted = createRun("classic", 1);
    for (let i = 0; i < 120; i++) {
      stepRun(cruise, 1, 1 / 120);
      stepRun(boosted, 1, 1 / 120, true);
    }
    expect(Math.abs(boosted.heading)).toBeLessThan(
      Math.abs(cruise.heading) * 0.8,
    );
    expect(boosted.speed).toBeGreaterThan(cruise.speed);
  });
  it("tightens the gates and steepens the slope toward the finish", () => {
    expect(GATE_TIGHTENING).toBeGreaterThan(0.15);
    expect(GATES[GATES.length - 1].width).toBeLessThan(GATES[4].width * 0.85);
    expect(GATES[GATES.length - 1].width).toBeGreaterThan(GATES[4].width * 0.7);
    for (let i = 5; i < GATES.length; i++)
      expect(GATES[i].width).toBeLessThan(GATES[i - 1].width);
    expect(SLOPE_RAMP).toBeGreaterThan(0.05);
    const early = createRun("classic", 1),
      late = createRun("classic", 1);
    early.hazards = late.hazards = [];
    // Same phase of the gentle undulation so only the ramp differs.
    late.z = (2 * Math.PI) / 0.015;
    for (let i = 0; i < 600; i++) {
      stepRun(early, 0, 1 / 120);
      stepRun(late, 0, 1 / 120);
    }
    expect(late.speed).toBeGreaterThan(early.speed * 1.025);
  });
});
