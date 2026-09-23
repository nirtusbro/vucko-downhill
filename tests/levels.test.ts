import { describe, expect, it } from "vitest";
import {
  LAMP_LEVELS,
  LEVEL_COUNT,
  LEVEL_DESIGNS,
  LAMPS_PER_LEVEL,
  MAX_GATES,
  MAX_COURSE_LENGTH,
  PICKUPS_PER_LEVEL,
  SLIP_ACCEL,
  SLIP_GRIP,
  SLOPE_EASE,
  SLOPE_KINDS,
  SLOPE_LEVELS,
  SLOPE_MARGIN,
  SLOPE_ROCK_GAP,
  buildCourse,
  getCourse,
  hazardPoolSizes,
  levelLamps,
  levelSettings,
  slopeTilt,
} from "../src/levels";
import { LAMP_CATALOG } from "../src/lamp-catalog";
import { createRun, driftAhead, lampsKept, stepRun } from "../src/physics";
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
      if (level < LAMP_LEVELS) {
        expect(course.lampSpots).toHaveLength(PICKUPS_PER_LEVEL);
        expect(course.presents).toBe(true);
        lampIds.push(...lamps.pickups, lamps.finish);
      } else {
        // Beyond the summit: no lamps, no presents, a rock (or, on the north face, a bank) in every empty stretch.
        expect(course.lampSpots).toHaveLength(0);
        expect(course.lampId).toBe(-1);
        expect(course.presents).toBe(false);
        expect(design.fillRocks).toBe(true);
        expect(course.hazards.length + course.slopes.length).toBeGreaterThanOrEqual(course.gates.length - 1);
        for (const s of course.stretches)
          if (s.index < course.stretches.length - 1)
            expect(
              course.hazards.some((h) => h.z > course.gates[s.index].z && h.z < course.gates[s.index].z + s.length) ||
                course.slopes.some((slope) => slope.stretch === s.index),
            ).toBe(true);
      }
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
        expect(gate.width).toBeGreaterThanOrEqual(level < LAMP_LEVELS ? 4.5 : 4.2);
      }
      // No stretch carries more than one feature; a slope may share its stretch with a rock gate only.
      const used = [...design.lamps, ...design.weaves, ...design.rockGates, ...design.wideRocks, ...design.lineRocks];
      expect(new Set(used).size).toBe(used.length);
      for (const index of used) expect(index).toBeLessThan(course.gates.length);
      const sloped = design.slopes.map(([index]) => index);
      expect(new Set(sloped).size).toBe(sloped.length);
      const withRocks = new Set([...design.lamps, ...design.weaves, ...design.wideRocks, ...design.lineRocks]);
      for (const index of sloped) {
        expect(index).toBeLessThan(course.gates.length);
        expect(withRocks.has(index)).toBe(false);
      }
    }
    expect(layouts.size).toBe(LEVEL_COUNT);
    expect(LAMPS_PER_LEVEL * LAMP_LEVELS).toBe(LAMP_CATALOG.length);
    expect([...lampIds].sort((a, b) => a - b)).toEqual(LAMP_CATALOG.map((lamp) => lamp.id));
    expect(LAMP_CATALOG[levelLamps(0).finish].rarity).toBe("Common");
    expect(LAMP_CATALOG[levelLamps(LAMP_LEVELS - 1).finish].rarity).toBe("Legendary");
    expect(levelLamps(LEVEL_COUNT - 1)).toEqual({ pickups: [], finish: -1 });
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
      // Each new ladder restarts a little slower than the one before, then climbs again.
      if (level !== LAMP_LEVELS && level !== SLOPE_LEVELS) expect(b.speed).toBeGreaterThan(a.speed);
      expect(b.baseWidth).toBeLessThanOrEqual(a.baseWidth + 0.5);
    }
    expect(levelSettings(LAMP_LEVELS).speed).toBeGreaterThan(levelSettings(LAMP_LEVELS - 5).speed);
    expect(levelSettings(LEVEL_COUNT - 1).baseWidth).toBeLessThan(levelSettings(0).baseWidth * 0.7);
    const first = getCourse(0),
      last = getCourse(LEVEL_COUNT - 1);
    expect(first.hazards).toHaveLength(0);
    expect(last.hazards.length).toBeGreaterThan(25);
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
        plain.score - plain.timeBonus - plain.presents.collected * 200 - plain.bullseyes * 50,
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
  it("drops no presents on the bonus levels", () => {
    for (const level of [LAMP_LEVELS, LEVEL_COUNT - 1]) {
      const run = createRun(level);
      drive(run);
      expect(run.finished).toBe(true);
      expect(run.presents.collected).toBe(0);
      expect(run.presents.items.every((item) => item.phase === "inactive")).toBe(true);
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
  it("keeps slope lamps only when the level is passed on that run", () => {
    const passed = createRun(0);
    drive(passed);
    expect(passed.passed).toBe(true);
    expect(lampsKept(passed)).toEqual(levelLamps(0).pickups);
    const failed = createRun(0);
    const gate = failed.course.gates[0];
    failed.x = gate.x + 8;
    failed.z = gate.z - 0.1;
    stepRun(failed, 0, 1 / 60);
    drive(failed);
    expect(failed.finished).toBe(true);
    expect(failed.passed).toBe(false);
    expect(failed.lamps).toBeGreaterThan(0);
    expect(lampsKept(failed)).toEqual([]);
    const unfinished = createRun(0);
    expect(lampsKept(unfinished)).toEqual([]);
    const owned = Array(100).fill(false);
    owned[levelLamps(0).pickups[0]] = true;
    const replay = createRun(0, undefined, owned);
    drive(replay);
    expect(lampsKept(replay)).toEqual(levelLamps(0).pickups.slice(1));
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
    // Lamps score nothing, so a replay with lamps already owned has the same maximum.
    expect(run.score - run.timeBonus - run.presents.collected * 200 - run.bullseyes * 50).toBe(run.course.maxGateScore);
    expect(run.goal).toBe(run.course.goal);
    const summit = createRun(19, undefined, Array(100).fill(true));
    expect(summit.lampsAvailable).toBe(0);
    expect(summit.goal).toBe(summit.course.goal);
  });
  it("reports pool sizes that fit the rockiest level, so every hazard is drawn", () => {
    const pools = hazardPoolSizes();
    let maxRocks = 0;
    for (let level = 0; level < LEVEL_COUNT; level++) {
      const hazards = getCourse(level).hazards;
      const rocks = hazards.filter((h) => h.kind === "rock").length;
      maxRocks = Math.max(maxRocks, rocks);
      expect(rocks).toBeLessThanOrEqual(pools.rocks);
      expect(hazards.filter((h) => h.kind === "tree").length).toBeLessThanOrEqual(pools.trees);
    }
    expect(pools.rocks).toBe(maxRocks);
    expect(pools.rocks).toBeGreaterThan(28);
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

describe("the north face: banked snow", () => {
  it("puts slopes only on the last ten levels, between the gate margins and clear of rocks", () => {
    let bands = 0;
    const kindLevels = new Map<string, number>();
    for (let level = 0; level < LEVEL_COUNT; level++) {
      const c = getCourse(level),
        design = LEVEL_DESIGNS[level];
      if (level < SLOPE_LEVELS) {
        expect(c.slopes).toHaveLength(0);
        continue;
      }
      expect(c.slopes.length).toBeGreaterThanOrEqual(6);
      expect(c.slopes.map((s) => s.stretch).sort((a, b) => a - b)).toEqual(
        design.slopes.map(([index]) => index).sort((a, b) => a - b),
      );
      for (const slope of c.slopes) {
        bands++;
        const gate = c.gates[slope.stretch],
          next = c.gates[slope.stretch + 1] ?? { z: c.finishZ };
        expect(slope.from).toBe(gate.z + SLOPE_MARGIN);
        expect(slope.to).toBeLessThanOrEqual(next.z - SLOPE_MARGIN);
        // Long enough to matter: at least fourteen metres of bank.
        expect(slope.to - slope.from).toBeGreaterThanOrEqual(14);
        expect(Math.abs(slope.dir)).toBe(1);
        for (const h of c.hazards)
          expect(h.z <= slope.from - SLOPE_ROCK_GAP || h.z >= slope.to + SLOPE_ROCK_GAP).toBe(true);
        for (const g of c.gates)
          expect(g.z <= slope.from - SLOPE_MARGIN || g.z >= slope.to + SLOPE_MARGIN).toBe(true);
      }
      // Bands never overlap, and each pushes at full tilt in its middle and not at all at its ends.
      for (let i = 1; i < c.slopes.length; i++)
        expect(c.slopes[i].from).toBeGreaterThanOrEqual(c.slopes[i - 1].to);
      for (const slope of c.slopes) {
        // Full tilt in the middle of any band long enough for both eases; at least most of it in the shortest.
        const mid = slopeTilt(c, (slope.from + slope.to) / 2);
        expect(Math.sign(mid)).toBe(slope.dir);
        expect(Math.abs(mid)).toBeGreaterThanOrEqual(slope.to - slope.from >= 2 * SLOPE_EASE ? 1 : 0.8);
        expect(slopeTilt(c, slope.from)).toBe(0);
        expect(slopeTilt(c, slope.to)).toBe(0);
        expect(Math.abs(slopeTilt(c, slope.from + 2))).toBeGreaterThan(0);
        expect(Math.abs(slopeTilt(c, slope.from + 2))).toBeLessThan(1);
      }
      // A camber or step falls to one side; the other shapes have no side.
      for (const s of c.slopes)
        if (s.kind !== "camber" && s.kind !== "step") expect(s.dir).toBe(1);
      for (const kind of new Set(c.slopes.map((s) => s.kind))) kindLevels.set(kind, (kindLevels.get(kind) ?? 0) + 1);
    }
    expect(bands).toBeGreaterThanOrEqual(100);
    // Every shape of bank appears on at least two levels, and the last two levels mix them all.
    for (const kind of SLOPE_KINDS) expect(kindLevels.get(kind) ?? 0).toBeGreaterThanOrEqual(2);
    for (const level of [LEVEL_COUNT - 2, LEVEL_COUNT - 1])
      expect(new Set(getCourse(level).slopes.map((s) => s.kind)).size).toBe(SLOPE_KINDS.length);
    // Cambers fall both ways somewhere on the ladder.
    const cambers = getCourse(SLOPE_LEVELS).slopes.filter((s) => s.kind === "camber");
    expect(cambers.some((s) => s.dir === 1) && cambers.some((s) => s.dir === -1)).toBe(true);
    expect(getCourse(LEVEL_COUNT - 1).slopes.length).toBeGreaterThanOrEqual(12);
  });
  it("skids an un-steered skier down a bank, building up, carrying past its end and scrubbing speed", () => {
    const run = createRun(SLOPE_LEVELS);
    // The first camber that is followed by flat snow, so the skid can die away on its own.
    const slope = run.course.slopes.find(
      (s) => s.kind === "camber" && !run.course.slopes.some((o) => o.stretch === s.stretch + 1),
    )!;
    expect(slope).toBeDefined();
    run.x = 0;
    run.z = slope.from - 1;
    run.speed = run.course.speed;
    run.nextGate = run.course.gates.findIndex((g) => g.z > slope.from);
    const terminal = SLIP_ACCEL * SLIP_GRIP;
    let peak = 0,
      speedIn = 0;
    while (run.z < slope.to + 1 && !run.finished) {
      stepRun(run, 0, 1 / 120);
      peak = Math.max(peak, Math.abs(run.slip));
      if (run.z < (slope.from + slope.to) / 2) speedIn = run.speed;
    }
    expect(run.crashes).toBe(0);
    expect(run.heading).toBe(0);
    // The slip builds toward its terminal value and is still under way at the end of the bank.
    expect(Math.sign(run.slip)).toBe(slope.dir);
    expect(peak).toBeGreaterThan(terminal * 0.5);
    expect(peak).toBeLessThan(terminal);
    expect(Math.sign(run.x)).toBe(slope.dir);
    const atEnd = Math.abs(run.x),
      slipAtEnd = Math.abs(run.slip);
    expect(atEnd).toBeGreaterThan(1);
    expect(atEnd).toBeLessThan(4);
    // Skidding has cost speed against a skier on flat snow at the same point.
    const flat = createRun(SLOPE_LEVELS);
    flat.course = { ...flat.course, slopes: [] };
    flat.z = slope.from - 1;
    flat.speed = flat.course.speed;
    flat.nextGate = run.nextGate;
    while (flat.z < (slope.from + slope.to) / 2) stepRun(flat, 0, 1 / 120);
    expect(speedIn).toBeLessThan(flat.speed);
    expect(flat.x).toBe(0);
    // Past the bank the skid carries on and dies away: more drift, then none.
    let carried = 0;
    for (let i = 0; i < 120 && !run.finished; i++) {
      stepRun(run, 0, 1 / 120);
      carried = Math.abs(run.x) - atEnd;
    }
    expect(carried).toBeGreaterThan(slipAtEnd * SLIP_GRIP * 0.6);
    expect(Math.abs(run.slip)).toBeLessThan(slipAtEnd * 0.2);
    // The predictor matches the run: from the bank's start, it foresees the drift to its end.
    const foreseen = driftAhead(run.course, 0, slope.from - 1, 0, run.course.speed, slope.to + 1);
    expect(Math.abs(foreseen - slope.dir * atEnd)).toBeLessThan(0.5);
  });
  it("counters the drift with an upslope aim, so every north-face level stays passable", () => {
    for (let level = SLOPE_LEVELS; level < LEVEL_COUNT; level++) {
      const run = createRun(level);
      const { crashes, worstMargin } = drive(run);
      expect(run.passed).toBe(true);
      expect(crashes).toBe(0);
      expect(worstMargin).toBeGreaterThan(0.4);
    }
  });
});
