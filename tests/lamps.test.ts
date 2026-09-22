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

describe("birthday lamp collection", () => {
  it("leaves clear skiing space between each gate and its optional bonus", () => {
    for (const [i, lamp] of LAMP_SPOTS.entries()) {
      expect(lamp.z).toBeGreaterThan(GATES[i].z + 15);
      expect(lamp.z).toBeLessThan((GATES[i + 1]?.z ?? FINISH_Z) - 15);
    }
  });
  it("places lamps wide of the direct line between gates", () => {
    expect(LAMP_DETOUR).toBeGreaterThanOrEqual(5);
    for (const [i, lamp] of LAMP_SPOTS.entries()) {
      const next = GATES[i + 1] ?? { x: 0 };
      expect(Math.abs(lamp.x - (GATES[i].x + next.x) / 2)).toBe(LAMP_DETOUR);
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
      expect(indices[indices.length - 1]).toBeGreaterThanOrEqual(18);
    }
    expect(seen.size).toBe(LAMP_SPOTS.length);
    expect(pickLampSpots(1)).not.toEqual(pickLampSpots(2));
    const run = createRun("classic", 7);
    expect(run.lampSpots).toEqual(pickLampSpots(7));
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
    expect(s.score).toBe(50);
    expect(s.lampEvent).toBe(0);
    stepRun(s, 0, 1 / 60);
    expect(s.lamps).toBe(1);
    expect(s.score).toBe(50);
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
