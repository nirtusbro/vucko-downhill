import { describe, expect, it } from "vitest";
import {
  LEVEL_COUNT,
  LEVEL_DESIGNS,
  LAMPS_PER_LEVEL,
  MAX_GATES,
  MAX_COURSE_LENGTH,
  PICKUPS_PER_LEVEL,
  buildCourse,
  getCourse,
  levelLamps,
  levelSettings,
} from "../src/levels";
import { LAMP_CATALOG, lampPoints } from "../src/lamp-catalog";
import { createRun, lampScore, stepRun } from "../src/physics";
import { drive } from "./helpers";

describe("20 hand-placed levels", () => {
  it("builds twenty fixed courses, each tied to five lamps and its own name", () => {
    const layouts = new Set<string>();
    const lampIds: number[] = [];
    expect(LEVEL_DESIGNS).toHaveLength(LEVEL_COUNT);
    expect(new Set(LEVEL_DESIGNS.map((d) => d.name)).size).toBe(LEVEL_COUNT);
    for (let level = 0; level < LEVEL_COUNT; level++) {
      const course = getCourse(level),
        design = LEVEL_DESIGNS[level],
        lamps = levelLamps(level);
      expect(course.level).toBe(level);
      expect(course.name).toBe(design.name);
      expect(course.hint.length).toBeGreaterThan(10);
      expect(course.lampId).toBe(lamps.finish);
      expect(course.pickupLampIds).toEqual(lamps.pickups);
      expect(course.lampSpots).toHaveLength(PICKUPS_PER_LEVEL);
      lampIds.push(...lamps.pickups, lamps.finish);
      expect(course).toEqual(buildCourse(level));
      expect(course.gates.length).toBe(design.gates.length);
      expect(course.gates.length).toBeLessThanOrEqual(MAX_GATES);
      expect(course.finishZ).toBeLessThanOrEqual(MAX_COURSE_LENGTH);
      layouts.add(course.gates.map((g) => `${g.x},${g.z}`).join(";"));
      for (let i = 1; i < course.gates.length; i++) {
        const gap = course.gates[i].z - course.gates[i - 1].z;
        expect(gap).toBeGreaterThanOrEqual(30);
        expect(gap).toBeLessThanOrEqual(60);
      }
      for (const gate of course.gates) {
        expect(Math.abs(gate.x)).toBeLessThanOrEqual(9.5);
        expect(gate.width).toBeGreaterThanOrEqual(4.5);
      }
      // No stretch carries more than one feature.
      const used = [...design.lamps, ...design.weaves, ...design.rockGates, ...design.wideRocks, ...design.lineRocks];
      expect(new Set(used).size).toBe(used.length);
      for (const index of used) expect(index).toBeLessThan(course.gates.length);
    }
    expect(layouts.size).toBe(LEVEL_COUNT);
    expect(LAMPS_PER_LEVEL * LEVEL_COUNT).toBe(LAMP_CATALOG.length);
    expect([...lampIds].sort((a, b) => a - b)).toEqual(LAMP_CATALOG.map((lamp) => lamp.id));
    expect(LAMP_CATALOG[levelLamps(0).finish].rarity).toBe("Common");
    expect(LAMP_CATALOG[levelLamps(LEVEL_COUNT - 1).finish].rarity).toBe("Legendary");
    expect(getCourse(-5)).toBe(getCourse(0));
    expect(getCourse(500)).toBe(getCourse(LEVEL_COUNT - 1));
  });
  it("never lets two gates be taken in a straight line unless a rock sits between them", () => {
    for (let level = 0; level < LEVEL_COUNT; level++) {
      const c = getCourse(level),
        design = LEVEL_DESIGNS[level];
      const onLine = new Set([
        ...(design.forkRocks ? design.lamps : []),
        ...design.lineRocks,
        ...design.rockGates,
        ...design.weaves,
      ]);
      for (let i = 0; i + 1 < c.gates.length; i++) {
        const a = c.gates[i],
          b = c.gates[i + 1];
        const overlap = (a.width + b.width) / 2 - Math.abs(b.x - a.x);
        if (overlap > 0) expect(onLine.has(i)).toBe(true);
        expect(Math.abs(b.x - a.x)).toBeGreaterThanOrEqual(3);
      }
    }
  });
  it("gets harder from the first level to the last", () => {
    for (let level = 1; level < LEVEL_COUNT; level++) {
      const a = levelSettings(level - 1),
        b = levelSettings(level);
      expect(b.speed).toBeGreaterThan(a.speed);
      expect(b.baseWidth).toBeLessThanOrEqual(a.baseWidth + 0.5);
    }
    expect(levelSettings(LEVEL_COUNT - 1).baseWidth).toBeLessThan(levelSettings(0).baseWidth * 0.7);
    const first = getCourse(0),
      last = getCourse(LEVEL_COUNT - 1);
    expect(first.hazards).toHaveLength(0);
    expect(last.hazards.length).toBeGreaterThan(15);
    expect(last.gates.length).toBe(MAX_GATES);
    expect(last.goal).toBeGreaterThan(first.goal * 5);
    expect(last.speed).toBeGreaterThan(first.speed * 1.7);
    expect(LEVEL_DESIGNS.filter((d) => d.weaves.length).length).toBeGreaterThanOrEqual(5);
    expect(LEVEL_DESIGNS.filter((d) => d.rockGates.length).length).toBeGreaterThanOrEqual(10);
    expect(LEVEL_DESIGNS.filter((d) => d.gates.some(([, gap]) => gap < 36)).length).toBeGreaterThanOrEqual(8);
  });
  it("keeps every gate and pickup reachable and every goal passable", () => {
    for (let level = 0; level < LEVEL_COUNT; level++) {
      const c = getCourse(level);
      const plain = createRun(level);
      const a = drive(plain);
      expect(plain.finished).toBe(true);
      expect(a.crashes).toBe(0);
      expect(plain.hits).toBe(c.gates.length);
      expect(plain.lamps).toBe(c.lampSpots.length);
      expect(a.worstMargin).toBeGreaterThan(0.4);
      expect(
        plain.score - plain.timeBonus - plain.presents.collected * 200 - plain.bullseyes * 50 - lampScore(plain),
      ).toBe(c.maxGateScore);
      expect(plain.time).toBeGreaterThan(15);
      expect(plain.time).toBeLessThan(45);
      expect(plain.passed).toBe(true);
    }
  });
  it("keeps a straight, un-steered line from passing any level", () => {
    for (let level = 0; level < LEVEL_COUNT; level++) {
      const run = createRun(level);
      for (let i = 0; i < 120 * 120 && !run.finished; i++) stepRun(run, 0, 1 / 120);
      expect(run.finished).toBe(true);
      expect(run.passed).toBe(false);
    }
  });
  it("fixes every element of a level, presents included", () => {
    for (const level of [0, 9, 19]) {
      const a = createRun(level),
        b = createRun(level);
      expect(a.presents.seed).toBe(b.presents.seed);
      for (let i = 0; i < 120 * 40 && !a.finished; i++) {
        stepRun(a, 0.1, 1 / 120);
        stepRun(b, 0.1, 1 / 120);
      }
      expect(a.presents.items).toEqual(b.presents.items);
    }
    expect(createRun(0).presents.seed).not.toBe(createRun(1).presents.seed);
  });
  it("leaves lamps already in the collection off the slope on a replay", () => {
    const owned = Array(100).fill(false);
    const [first, second] = levelLamps(0).pickups;
    owned[first] = owned[second] = true;
    const run = createRun(0, undefined, owned);
    expect(run.preCollected).toEqual([true, true, false, false]);
    expect(run.collectedLamps).toEqual([true, true, false, false]);
    expect(run.lampsAvailable).toBe(2);
    drive(run);
    expect(run.lamps).toBe(2);
    expect(lampScore(run)).toBe(lampPoints(first) * 2);
    expect(run.goal).toBe(run.course.goal);
    const summit = createRun(19, undefined, Array(100).fill(true));
    expect(summit.lampsAvailable).toBe(0);
    expect(summit.goal).toBe(summit.course.goal);
  });
  it("keeps hazards clear of gate lines and pickups beside a fork rock", () => {
    for (let level = 0; level < LEVEL_COUNT; level++) {
      const c = getCourse(level);
      for (const hazard of c.hazards)
        for (const gate of c.gates)
          expect(Math.abs(hazard.z - gate.z)).toBeGreaterThanOrEqual(12);
      for (const spot of c.lampSpots) {
        const stretch = c.stretches[spot.stretch];
        expect(spot.z).toBe(stretch.lampZ);
        expect(Math.abs(spot.x - stretch.lineX)).toBeGreaterThanOrEqual(4.4);
        if (levelSettings(level).forkRocks)
          expect(
            c.hazards.some(
              (h) => h.kind === "rock" && h.z === spot.z && Math.abs(h.x - stretch.lineX) < 0.06,
            ),
          ).toBe(true);
      }
      expect(c.hazards.filter((h) => h.kind === "tree").length).toBe(LEVEL_DESIGNS[level].guards.length);
    }
  });
});
