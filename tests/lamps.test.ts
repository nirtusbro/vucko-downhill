import { describe, expect, it } from "vitest";
import { createRun, stepRun, GATES, LAMPS, FINISH_Z } from "../src/physics";

describe("birthday lamp collection", () => {
  it("leaves clear skiing space between each gate and its optional bonus", () => {
    for (const [i, lamp] of LAMPS.entries()) {
      expect(lamp.z).toBeGreaterThan(GATES[i].z + 15);
      expect(lamp.z).toBeLessThan((GATES[i + 1]?.z ?? FINISH_Z) - 15);
    }
  });
  it("does not award a lamp just for approaching the center of a gate", () => {
    const s = createRun();
    s.x = GATES[0].x;
    s.z = GATES[0].z - 4.2;
    s.speed = 18;
    stepRun(s, 0, 1 / 60);
    expect(s.lamps).toBe(0);
  });
  it("collects a lamp on its line and awards the bonus only once", () => {
    const s = createRun();
    s.x = LAMPS[0].x;
    s.z = LAMPS[0].z - 0.2;
    s.nextGate = 1;
    s.speed = 18;
    stepRun(s, 0, 1 / 60);
    expect(s.lamps).toBe(1);
    expect(s.collectedLamps[0]).toBe(true);
    expect(s.score).toBe(50);
    expect(s.lampEvent).toBe(0);
    stepRun(s, 0, 1 / 60);
    expect(s.lamps).toBe(1);
    expect(s.score).toBe(50);
    expect(s.lampEvent).toBe(-1);
  });
  it("does not collect a lamp when passing wide of it", () => {
    const s = createRun();
    s.x = LAMPS[0].x + 3;
    s.z = LAMPS[0].z - 0.2;
    s.nextGate = 1;
    s.speed = 18;
    stepRun(s, 0, 1 / 60);
    expect(s.lamps).toBe(0);
    expect(s.score).toBe(0);
  });
  it("does not collect during a tumble", () => {
    const s = createRun();
    s.x = LAMPS[0].x;
    s.z = LAMPS[0].z - 0.2;
    s.nextGate = 1;
    s.crashTime = 0.5;
    stepRun(s, 0, 1 / 60);
    expect(s.lamps).toBe(0);
  });
  it("starts each replay with every lamp available again", () => {
    const s = createRun();
    s.x = LAMPS[0].x;
    s.z = LAMPS[0].z - 0.2;
    s.nextGate = 1;
    stepRun(s, 0, 1 / 60);
    const replay = createRun();
    expect(replay.lamps).toBe(0);
    expect(replay.collectedLamps.some(Boolean)).toBe(false);
    expect(s.collectedLamps[0]).toBe(true);
  });
});
