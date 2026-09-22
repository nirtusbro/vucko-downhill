import { describe, expect, it } from "vitest";
import {
  createRun,
  stepRun,
  GATES,
  STRETCHES,
  FORK_ROCK_RADIUS,
} from "../src/physics";
import type { DifficultyId } from "../src/difficulty";
import { lampDetourExtra } from "../src/lamp-catalog";
const levels: DifficultyId[] = ["easy", "classic", "expert"];

describe("course hazards", () => {
  it("puts a fork rock on the direct line beside every lamp", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const run = createRun("classic", seed);
      for (const spot of run.lampSpots) {
        const rock = run.hazards.find(
          (hazard) =>
            hazard.kind === "rock" &&
            hazard.z === spot.z &&
            hazard.x === STRETCHES[spot.stretch].midX,
        );
        expect(rock).toBeDefined();
        expect(Math.abs(spot.x - rock!.x)).toBeGreaterThanOrEqual(5);
      }
    }
  });
  it("guards rare and better lamps with a tree between the line and the lamp", () => {
    let guarded = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const run = createRun("classic", seed);
      run.lampSpots.forEach((spot, i) => {
        const tree = run.hazards.find(
          (hazard) =>
            hazard.kind === "tree" && Math.abs(hazard.z - (spot.z - 8)) < 0.01,
        );
        if (lampDetourExtra(run.lampIds[i]) > 0) {
          guarded++;
          expect(tree).toBeDefined();
          expect(Math.abs(tree!.x - spot.x)).toBeGreaterThan(2.5);
          expect(Math.abs(tree!.x - STRETCHES[spot.stretch].midX)).toBeGreaterThan(
            1.5,
          );
        } else expect(tree).toBeUndefined();
      });
    }
    expect(guarded).toBeGreaterThan(0);
  });
  it("never places a hazard near a gate line", () => {
    for (let seed = 1; seed <= 30; seed++)
      for (const level of levels)
        for (const hazard of createRun(level, seed).hazards)
          for (const gate of GATES)
            expect(Math.abs(hazard.z - gate.z)).toBeGreaterThanOrEqual(12);
  });
  it("adds more wide rocks in harder modes, reproducibly per seed", () => {
    const rocks = (level: DifficultyId) => {
      let total = 0;
      for (let seed = 1; seed <= 60; seed++)
        total += createRun(level, seed).hazards.filter(
          (hazard) => hazard.kind === "rock",
        ).length;
      return total;
    };
    expect(rocks("easy")).toBeLessThan(rocks("classic"));
    expect(rocks("classic")).toBeLessThan(rocks("expert"));
    expect(createRun("expert", 9).hazards).toEqual(
      createRun("expert", 9).hazards,
    );
    expect(createRun("expert", 9).hazards).not.toEqual(
      createRun("expert", 10).hazards,
    );
  });
  it("tumbles on a fork rock, breaks the combo and recovers", () => {
    const run = createRun("classic", 3);
    const rock = run.hazards.find(
      (hazard) => hazard.radius === FORK_ROCK_RADIUS,
    )!;
    run.x = rock.x;
    run.z = rock.z - 0.2;
    run.speed = 20;
    run.combo = 5;
    run.nextGate = GATES.findIndex((gate) => gate.z > rock.z);
    stepRun(run, 0, 1 / 60);
    expect(run.event).toBe("crash");
    expect(run.combo).toBe(0);
    for (let i = 0; i < 180; i++) stepRun(run, 0, 1 / 60);
    expect(run.crashTime).toBe(0);
    expect(run.finished).toBe(false);
  });
  it("makes the straight line down the middle unsafe but still finishable", () => {
    const run = createRun("classic", 3);
    let crashes = 0;
    for (let i = 0; i < 120 * 120 && !run.finished; i++) {
      stepRun(run, 0, 1 / 120);
      if (run.event === "crash") crashes++;
    }
    expect(run.finished).toBe(true);
    expect(crashes).toBeGreaterThan(0);
  });
  it("keeps present landings clear of hazards", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const run = createRun("expert", seed);
      const landings = new Set<string>();
      for (let i = 0; i < 120 * 90 && !run.finished; i++) {
        stepRun(run, 0, 1 / 120);
        for (const gift of run.presents.items)
          if (gift.phase !== "inactive") landings.add(`${gift.x},${gift.z}`);
      }
      expect(landings.size).toBeGreaterThan(0);
      for (const key of landings) {
        const [x, z] = key.split(",").map(Number);
        for (const hazard of run.hazards)
          expect(
            Math.abs(hazard.z - z) >= 6 || Math.abs(hazard.x - x) >= 4,
          ).toBe(true);
      }
    }
  });
});
