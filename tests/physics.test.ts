import { describe, expect, it } from "vitest";
import {
  createRun,
  stepRun,
  GATES,
  LAMPS,
  FINISH_Z,
  OBSTACLES,
  clamp,
  type Run,
} from "../src/physics";

function advance(run: Run, seconds: number, input = 0, dt = 1 / 60) {
  for (let i = 0; i < Math.round(seconds / dt); i++) stepRun(run, input, dt);
  return run;
}

describe("skiing", () => {
  it("accelerates downhill and travels through the world", () => {
    const s = advance(createRun(), 3);
    expect(s.z).toBeGreaterThan(25);
    expect(s.speed).toBeGreaterThan(12);
    expect(s.x).toBe(0);
  });
  it("steering changes heading progressively, not character position instantly", () => {
    const s = createRun();
    stepRun(s, 1, 1 / 60);
    expect(s.heading).toBeGreaterThan(0);
    expect(s.heading).toBeLessThan(0.1);
    expect(s.x).toBeLessThan(0.1);
    advance(s, 1, 1);
    expect(s.x).toBeGreaterThan(2);
  });
  it("hard carving costs speed and releasing returns to downhill", () => {
    const straight = advance(createRun(), 2);
    const turn = advance(createRun(), 2, 0.7);
    expect(turn.speed).toBeLessThan(straight.speed);
    const heading = turn.heading;
    advance(turn, 1, 0);
    expect(Math.abs(turn.heading)).toBeLessThan(heading * 0.25);
  });
  it("has comparable trajectories at 30 and 120 simulation steps per second", () => {
    const slow = advance(createRun(), 1.5, 0.25, 1 / 30);
    const fast = advance(createRun(), 1.5, 0.25, 1 / 120);
    expect(Math.abs(slow.z - fast.z)).toBeLessThan(0.3);
    expect(Math.abs(slow.x - fast.x)).toBeLessThan(0.15);
  });
  it("awards each crossed gate only once and builds combo", () => {
    const s = createRun();
    for (let i = 0; i < 4; i++) {
      s.x = GATES[i].x;
      s.z = GATES[i].z - 0.1;
      s.speed = 18;
      s.heading = 0;
      stepRun(s, 0, 1 / 60);
    }
    expect(s.hits).toBe(4);
    expect(s.combo).toBe(4);
    expect(s.score).toBe(1000);
    stepRun(s, 0, 1 / 60);
    expect(s.score).toBe(1000);
  });
  it("missing a gate breaks combo but the run continues", () => {
    const s = createRun();
    s.combo = 3;
    s.x = GATES[0].x + 8;
    s.z = GATES[0].z - 0.1;
    s.speed = 18;
    stepRun(s, 0, 1 / 60);
    expect(s.combo).toBe(0);
    expect(s.nextGate).toBe(1);
    expect(s.finished).toBe(false);
  });
  it("automatically recovers after a boundary crash", () => {
    const s = createRun();
    s.x = 22;
    stepRun(s, 0, 1 / 60);
    expect(s.crashTime).toBeGreaterThan(0);
    advance(s, 2);
    expect(s.crashTime).toBe(0);
    expect(Math.abs(s.x)).toBeLessThan(18);
    expect(s.speed).toBeGreaterThan(4);
  });
  it("finishes and freezes the timer", () => {
    const s = createRun();
    s.z = FINISH_Z - 0.1;
    s.speed = 18;
    stepRun(s, 0, 1 / 60);
    expect(s.finished).toBe(true);
    const time = s.time;
    advance(s, 1);
    expect(s.time).toBe(time);
  });
  it("colliding with a course rock triggers a recoverable tumble", () => {
    const rock = OBSTACLES.find((o) => o.kind === "rock")!;
    const s = createRun();
    s.x = rock.x;
    s.z = rock.z - 0.1;
    s.speed = 15;
    s.nextGate = 1;
    stepRun(s, 0, 1 / 60);
    expect(s.event).toBe("crash");
    advance(s, 2);
    expect(s.crashTime).toBe(0);
    expect(s.finished).toBe(false);
  });
  it("allows every gate to be reached by steering within the normal input range", () => {
    const s = createRun();
    const targets = [...GATES, ...LAMPS].sort((a, b) => a.z - b.z);
    let nextTarget = 0;
    for (let tick = 0; tick < 120 * 180 && !s.finished; tick++) {
      while (nextTarget < targets.length && s.z >= targets[nextTarget].z)
        nextTarget++;
      const target = targets[nextTarget]?.x ?? 0;
      stepRun(
        s,
        clamp((target - s.x) * 0.12 - s.heading * 0.8, -1, 1),
        1 / 120,
      );
    }
    expect(s.finished).toBe(true);
    expect(s.hits).toBe(20);
    expect(s.lamps).toBe(20);
    expect(s.score).toBe(8400);
    expect(s.time).toBeGreaterThan(60);
    expect(s.time).toBeLessThan(120);
  });
  it("does not punish missed gates with a forced restart", () => {
    const s = advance(createRun(), 110);
    expect(s.finished).toBe(true);
    expect(s.hits).toBeLessThan(20);
    expect(s.time).toBeGreaterThan(60);
  });
  it("keeps collision feedback when a tumble also crosses a missed gate", () => {
    const s = createRun();
    s.x = -17.5;
    s.z = 584.9;
    s.nextGate = 8;
    s.speed = 18;
    stepRun(s, 0, 1 / 60);
    expect(s.crashTime).toBeGreaterThan(0);
    expect(s.nextGate).toBe(9);
    expect(s.event).toBe("crash");
  });
});
