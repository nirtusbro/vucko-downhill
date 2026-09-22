import { seededRandom } from "./random";
import {
  FEATURE_LEAD,
  FORK_ROCK_RADIUS,
  GUARD_TREE_RADIUS,
  ROCK_GATE_HALF,
  WEAVE_OFFSET,
  WEAVE_STEP,
  WIDE_ROCK_RADIUS,
  type Course,
  type Gate,
  type Hazard,
} from "./levels";

/** Misses and tumbles an endless run survives before it ends. */
export const ENDLESS_STRIKES = 3;
/** Distance over which the endless course reaches its hardest layout. */
export const ENDLESS_RAMP = 3000;
/** Distance over which cruising speed keeps climbing after that. */
export const ENDLESS_SPEED_RAMP = 6000;
export const ENDLESS_START_SPEED = 22;
export const ENDLESS_TOP_SPEED = 46;

export interface EndlessCourse extends Course {
  endless: true;
  seed: number;
  /** Generates gates and hazards until the course reaches this distance. */
  extend(untilZ: number): void;
  speedAt(z: number): number;
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/**
 * An endless course: only gates, rocks, trees and presents, generated on
 * demand from its seed and getting harder with distance. Consecutive gates
 * never line up unless a rock sits on the line between them, just like the
 * authored levels.
 */
export function createEndlessCourse(seed: number): EndlessCourse {
  const random = seededRandom(seed >>> 0, 0x9e3779b9);
  const gates: Gate[] = [];
  const hazards: Hazard[] = [];
  let lastZ = 0;
  const rock = (x: number, z: number, radius: number) =>
    hazards.push({ x: Math.round(x * 10) / 10, z: Math.round(z), radius, kind: "rock" });
  const tree = (x: number, z: number) =>
    hazards.push({ x: Math.round(x * 10) / 10, z: Math.round(z), radius: GUARD_TREE_RADIUS, kind: "tree" });
  const settingsAt = (z: number) => {
    const t = clamp01(z / ENDLESS_RAMP);
    return {
      gap: lerp(55, 34, t),
      width: lerp(9, 4.8, t),
      amplitude: lerp(5, 9, t),
      flick: t > 0.3 ? 0.18 : 0,
      double: t > 0.2 ? 0.14 : 0,
      stray: lerp(0.15, 0.9, t),
      rockGate: t < 0.15 ? 0 : lerp(0, 0.4, (t - 0.15) / 0.85),
      weave: t < 0.35 ? 0 : lerp(0, 0.3, (t - 0.35) / 0.65),
      trees: t < 0.1 ? 0 : lerp(0, 0.55, (t - 0.1) / 0.9),
    };
  };
  const addGate = () => {
    const first = gates.length === 0;
    const S = settingsAt(lastZ);
    let gap = first ? 60 : S.gap * (0.9 + random() * 0.2);
    const prev = first ? null : gates[gates.length - 1];
    let x: number,
      quick = false,
      lineRock = false;
    if (!prev) x = (random() < 0.5 ? -1 : 1) * (2.5 + random() * 2);
    else if (random() < S.flick) {
      // A quick flick: 30 metres on, at least a gate width across.
      gap = 30;
      quick = true;
      const away = -(Math.sign(prev.x) || 1);
      x = prev.x + away * Math.max(S.width + 0.6, 4 + random() * 3);
    } else if (random() < S.double) {
      // A same-side pair with a rock on the line between the two.
      lineRock = true;
      const toward = Math.abs(prev.x) > 6 ? -Math.sign(prev.x) : Math.sign(prev.x) || 1;
      x = prev.x + toward * (2.5 + random() * 1.5);
    } else {
      const away = -(Math.sign(prev.x) || 1);
      x = away * S.amplitude * (0.5 + 0.5 * random());
      if (Math.abs(x - prev.x) < S.width + 0.6) x = prev.x + away * (S.width + 0.6);
    }
    x = Math.round(Math.max(-9.5, Math.min(9.5, x)) * 10) / 10;
    const z = Math.round(lastZ + gap);
    const gate: Gate = {
      x,
      z,
      width: Math.round(S.width * 10) / 10,
      color: gates.length % 2 ? "blue" : "red",
    };
    // Hazards for the stretch that leads into this gate.
    if (prev) {
      const length = z - prev.z,
        side = Math.sign(prev.x) || 1,
        lineAt = (f: number) => prev.x + (x - prev.x) * f;
      if (lineRock) rock(lineAt(0.5), prev.z + length / 2, FORK_ROCK_RADIUS);
      else if (!quick && length >= 2 * WEAVE_STEP + FEATURE_LEAD + 12 && random() < S.weave)
        for (const [k, dz] of [2 * WEAVE_STEP, WEAVE_STEP, 0].entries())
          rock(x + (k % 2 ? -1 : 1) * WEAVE_OFFSET * side, z - FEATURE_LEAD - dz, WIDE_ROCK_RADIUS);
      else if (!quick && length >= FEATURE_LEAD + 12 && random() < S.rockGate)
        for (const s of [-1, 1]) rock(x + s * ROCK_GATE_HALF, z - FEATURE_LEAD, WIDE_ROCK_RADIUS);
      else if (length >= 30 && random() < S.stray)
        rock(lineAt(0.45) + side * (4.5 + random() * 1.5), prev.z + length * 0.45, WIDE_ROCK_RADIUS);
      // Trees stand off the line on the outside of the turn, never within 12 m of a flag.
      if (!quick && length >= 36 && random() < S.trees) {
        const f = 0.3 + random() * 0.3;
        tree(lineAt(f) - side * (3.4 + random() * 1.2), prev.z + length * f);
      }
    }
    gates.push(gate);
    lastZ = z;
    hazards.sort((a, b) => a.z - b.z);
  };
  const course: EndlessCourse = {
    endless: true,
    seed: seed >>> 0,
    level: -1,
    name: "Endless run",
    hint: "Slow and easy at first, harder every metre. Three misses or tumbles and the run is over.",
    presents: true,
    lampId: -1,
    pickupLampIds: [],
    gates,
    finishZ: Infinity,
    stretches: [],
    lampSpots: [],
    hazards,
    speed: ENDLESS_START_SPEED,
    turnAngle: 0.9,
    pickupRadius: 2,
    parTime: 0,
    timeBonusRate: 0,
    maxGateScore: 0,
    goal: 0,
    extend(untilZ: number) {
      while (lastZ < untilZ) addGate();
    },
    speedAt(z: number) {
      return lerp(ENDLESS_START_SPEED, ENDLESS_TOP_SPEED, clamp01(z / ENDLESS_SPEED_RAMP));
    },
  };
  course.extend(600);
  return course;
}
