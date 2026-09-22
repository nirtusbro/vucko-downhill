import { describe, expect, it } from "vitest";
import {
  createRun,
  stepRun,
  pickLampSpots,
  GATES,
  LAMP_SPOTS,
  LAMP_DETOUR,
  LAMPS_PER_RUN,
  FINISH_Z,
} from "../src/physics";
import { lampDetourExtra, lampPoints } from "../src/lamp-catalog";

describe("birthday lamp collection", () => {
  it("leaves clear skiing space between each gate and its optional bonus", () => {
    expect(LAMP_SPOTS.length).toBeGreaterThanOrEqual(16);
    for (const lamp of LAMP_SPOTS) {
      expect(lamp.z).toBeGreaterThan(GATES[lamp.stretch].z + 15);
      expect(lamp.z).toBeLessThan(
        (GATES[lamp.stretch + 1]?.z ?? FINISH_Z) - 15,
      );
    }
  });
  it("places lamps wide of the direct line between gates", () => {
    expect(LAMP_DETOUR).toBeGreaterThanOrEqual(5);
    for (const lamp of LAMP_SPOTS) {
      const next = GATES[lamp.stretch + 1] ?? { x: 0 };
      expect(Math.abs(lamp.x - (GATES[lamp.stretch].x + next.x) / 2)).toBe(
        LAMP_DETOUR,
      );
    }
  });
  it("spreads a few lamps over the course, varying the spots between runs", () => {
    expect(LAMPS_PER_RUN).toBe(8);
    const seen = new Set<number>();
    for (let seed = 1; seed <= 200; seed++) {
      const spots = pickLampSpots(seed);
      expect(spots).toHaveLength(LAMPS_PER_RUN);
      expect(spots).toEqual(pickLampSpots(seed));
      const indices = spots.map((spot) => LAMP_SPOTS.indexOf(spot));
      indices.forEach((index) => seen.add(index));
      for (let i = 1; i < indices.length; i++) {
        expect(indices[i]).toBeGreaterThan(indices[i - 1]);
        expect(indices[i] - indices[i - 1]).toBeLessThanOrEqual(5);
      }
      expect(indices[0]).toBeLessThanOrEqual(2);
      expect(indices[indices.length - 1]).toBeGreaterThanOrEqual(
        LAMP_SPOTS.length - 2,
      );
    }
    expect(seen.size).toBe(LAMP_SPOTS.length);
    expect(pickLampSpots(1)).not.toEqual(pickLampSpots(2));
    const run = createRun("classic", 7);
    expect(run.lampSpots.map((spot) => spot.stretch)).toEqual(
      pickLampSpots(7).map((spot) => spot.stretch),
    );
    run.lampSpots.forEach((spot, i) => {
      expect(Math.abs(spot.x - pickLampSpots(7)[i].x)).toBe(
        lampDetourExtra(run.lampIds[i]),
      );
    });
    expect(run.collectedLamps).toHaveLength(LAMPS_PER_RUN);
    expect(run.lampIds).toHaveLength(LAMPS_PER_RUN);
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
    const LAMPS = s.lampSpots;
    s.x = LAMPS[0].x;
    s.z = LAMPS[0].z - 0.2;
    s.nextGate = GATES.findIndex((gate) => gate.z > LAMPS[0].z);
    s.speed = 18;
    stepRun(s, 0, 1 / 60);
    expect(s.lamps).toBe(1);
    expect(s.collectedLamps[0]).toBe(true);
    const points = lampPoints(s.lampIds[0]);
    expect(points).toBeGreaterThanOrEqual(50);
    expect(s.score).toBe(points);
    expect(s.lampEvent).toBe(0);
    stepRun(s, 0, 1 / 60);
    expect(s.lamps).toBe(1);
    expect(s.score).toBe(points);
    expect(s.lampEvent).toBe(-1);
  });
  it("does not collect a lamp when passing wide of it", () => {
    const s = createRun();
    const LAMPS = s.lampSpots;
    s.x = LAMPS[0].x + 3;
    s.z = LAMPS[0].z - 0.2;
    s.nextGate = GATES.findIndex((gate) => gate.z > LAMPS[0].z);
    s.speed = 18;
    stepRun(s, 0, 1 / 60);
    expect(s.lamps).toBe(0);
    expect(s.score).toBe(0);
  });
  it("does not collect during a tumble", () => {
    const s = createRun();
    const LAMPS = s.lampSpots;
    s.x = LAMPS[0].x;
    s.z = LAMPS[0].z - 0.2;
    s.nextGate = GATES.findIndex((gate) => gate.z > LAMPS[0].z);
    s.crashTime = 0.5;
    stepRun(s, 0, 1 / 60);
    expect(s.lamps).toBe(0);
  });
  it("starts each replay with every lamp available again", () => {
    const s = createRun();
    const LAMPS = s.lampSpots;
    s.x = LAMPS[0].x;
    s.z = LAMPS[0].z - 0.2;
    s.nextGate = GATES.findIndex((gate) => gate.z > LAMPS[0].z);
    stepRun(s, 0, 1 / 60);
    const replay = createRun();
    expect(replay.lamps).toBe(0);
    expect(replay.collectedLamps.some(Boolean)).toBe(false);
    expect(s.collectedLamps[0]).toBe(true);
  });
});
