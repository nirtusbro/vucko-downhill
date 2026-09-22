import { describe, expect, it } from "vitest";
import { createRun, stepRun } from "../src/physics";
import { getCourse, LEVEL_COUNT } from "../src/levels";
import { lampPoints } from "../src/lamp-catalog";

describe("little-light pickups", () => {
  it("leaves clear skiing space between each gate and its optional bonus", () => {
    for (let level = 0; level < LEVEL_COUNT; level++) {
      const c = getCourse(level);
      for (const lamp of c.lampSpots) {
        expect(lamp.z).toBeGreaterThanOrEqual(c.gates[lamp.stretch].z + 14);
        expect(lamp.z).toBeLessThan((c.gates[lamp.stretch + 1]?.z ?? c.finishZ) - 15);
        expect(Math.abs(lamp.x)).toBeLessThan(17);
      }
      const stretches = c.lampSpots.map((s) => s.stretch);
      expect(new Set(stretches).size).toBe(stretches.length);
      expect([...stretches].sort((a, b) => a - b)).toEqual(stretches);
    }
  });
  it("does not award a pickup just for approaching the center of a gate", () => {
    const s = createRun(0);
    s.x = s.course.gates[0].x;
    s.z = s.course.gates[0].z - 4.2;
    s.speed = 18;
    stepRun(s, 0, 1 / 60);
    expect(s.lamps).toBe(0);
  });
  it("collects a pickup on its line and awards that lamp's points only once", () => {
    for (const level of [0, 9, 19]) {
      const s = createRun(level);
      const lamp = s.course.lampSpots[0];
      s.x = lamp.x;
      s.z = lamp.z - 0.2;
      s.nextGate = s.course.gates.findIndex((gate) => gate.z > lamp.z);
      s.speed = 18;
      stepRun(s, 0, 1 / 60);
      expect(s.lamps).toBe(1);
      expect(s.collectedLamps[0]).toBe(true);
      const points = lampPoints(s.course.pickupLampIds[0]);
      expect(s.score).toBe(points);
      expect(s.lampEvent).toBe(0);
      stepRun(s, 0, 1 / 60);
      expect(s.lamps).toBe(1);
      expect(s.score).toBe(points);
      expect(s.lampEvent).toBe(-1);
    }
    expect(lampPoints(99)).toBeGreaterThan(lampPoints(0));
  });
  it("does not collect a pickup when passing wide of it", () => {
    const s = createRun(0);
    const lamp = s.course.lampSpots[0];
    s.x = lamp.x + lamp.side * 3;
    s.z = lamp.z - 0.2;
    s.nextGate = s.course.gates.findIndex((gate) => gate.z > lamp.z);
    s.speed = 18;
    stepRun(s, 0, 1 / 60);
    expect(s.lamps).toBe(0);
    expect(s.score).toBe(0);
  });
  it("does not collect during a tumble", () => {
    const s = createRun(0);
    const lamp = s.course.lampSpots[0];
    s.x = lamp.x;
    s.z = lamp.z - 0.2;
    s.nextGate = s.course.gates.findIndex((gate) => gate.z > lamp.z);
    s.crashTime = 0.5;
    stepRun(s, 0, 1 / 60);
    expect(s.lamps).toBe(0);
  });
  it("starts each replay with every pickup available again", () => {
    const s = createRun(0);
    const lamp = s.course.lampSpots[0];
    s.x = lamp.x;
    s.z = lamp.z - 0.2;
    s.nextGate = s.course.gates.findIndex((gate) => gate.z > lamp.z);
    stepRun(s, 0, 1 / 60);
    const replay = createRun(0);
    expect(replay.lamps).toBe(0);
    expect(replay.collectedLamps.some(Boolean)).toBe(false);
    expect(s.collectedLamps[0]).toBe(true);
  });
});
