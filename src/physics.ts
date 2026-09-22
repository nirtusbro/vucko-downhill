import { createPresents, stepPresents } from "./presents";
import {
  BULLSEYE_POINTS,
  CRASH_PENALTY,
  SLOPE_RAMP,
  STEER_RESPONSE,
  getCourse,
  type Course,
} from "./levels";
import { finishTimeBonus } from "./scoring";
export type { Course, Gate, Hazard, LampSpot } from "./levels";

export interface Run {
  level: number;
  course: Course;
  x: number;
  z: number;
  speed: number;
  heading: number;
  time: number;
  nextGate: number;
  hits: number;
  misses: number;
  crashes: number;
  bullseyes: number;
  combo: number;
  score: number;
  gateBonus: number;
  timeBonus: number;
  /** Lamps picked up this run. Lamps already in the collection never appear. */
  lamps: number;
  lampsAvailable: number;
  collectedLamps: boolean[];
  preCollected: boolean[];
  lampEvent: number;
  /** The level goal for this run. */
  goal: number;
  presents: ReturnType<typeof createPresents>;
  crashTime: number;
  invincible: number;
  finished: boolean;
  passed: boolean;
  event: string;
}
export const COMBO_CAP = 8;
export const BULLSEYE_RADIUS = 1;
export { BULLSEYE_POINTS, CRASH_PENALTY };
/** Edge scenery that still tumbles a skier who wanders wide. */
export const OBSTACLES = Array.from({ length: 32 }, (_, i) => ({
  x: (i % 2 ? 1 : -1) * (17.5 + (i % 3) * 0.7),
  z: 105 + i * 40,
  radius: i % 3 === 0 ? 1.4 : 0.9,
  kind: i % 3 === 0 ? "rock" : "tree",
}));
export const clamp = (n: number, a: number, b: number) =>
  Math.max(a, Math.min(b, n));
export const snowHeight = (z: number) =>
  -z * 0.1 + Math.sin(z * 0.022) * 0.45 + Math.sin(z * 0.064) * 0.15;
/** Slope lamps a finished run keeps: those picked up this run, only if the level was passed. */
export const lampsKept = (s: Run) =>
  s.finished && s.passed
    ? s.course.pickupLampIds.filter((_, i) => s.collectedLamps[i] && !s.preCollected[i])
    : [];
/** Everything about a level is fixed, presents included, so a run seeds from the level. */
export const levelSeed = (level: number) => (level * 7919 + 101) >>> 0;
export function createRun(
  level = 0,
  seed = levelSeed(level),
  owned: readonly boolean[] = [],
): Run {
  const course = getCourse(level);
  const preCollected = course.pickupLampIds.map((id) => owned[id] === true);
  const presents = createPresents(seed);
  // Bonus levels have no presents: the first drop never comes.
  if (!course.presents) presents.nextDrop = Infinity;
  return {
    level: course.level,
    course,
    x: 0,
    z: 0,
    speed: course.speed * 0.5,
    heading: 0,
    time: 0,
    nextGate: 0,
    hits: 0,
    misses: 0,
    crashes: 0,
    bullseyes: 0,
    combo: 0,
    score: 0,
    gateBonus: 0,
    timeBonus: 0,
    lamps: 0,
    lampsAvailable: preCollected.filter((owned) => !owned).length,
    collectedLamps: [...preCollected],
    preCollected,
    lampEvent: -1,
    goal: course.goal,
    presents,
    crashTime: 0,
    invincible: 0,
    finished: false,
    passed: false,
    event: "",
  };
}
const hits = (s: Run, o: { x: number; z: number; radius: number }) =>
  Math.abs(o.z - s.z) < o.radius + 0.6 &&
  Math.hypot(o.x - s.x, o.z - s.z) < o.radius + 0.65;
export function stepRun(s: Run, input: number, dt: number) {
  s.event = "";
  s.lampEvent = -1;
  s.gateBonus = 0;
  s.presents.event = false;
  if (s.finished || dt <= 0) return;
  const c = s.course;
  dt = Math.min(dt, 0.05);
  s.time += dt;
  s.invincible = Math.max(0, s.invincible - dt);
  const oldX = s.x,
    oldZ = s.z,
    oldSpeed = s.speed,
    oldHeading = s.heading;
  if (s.crashTime > 0) {
    s.crashTime = Math.max(0, s.crashTime - dt);
    s.speed += (4 - s.speed) * (1 - Math.exp(-5 * dt));
    s.x += (clamp(s.x, -13, 13) - s.x) * (1 - Math.exp(-6 * dt));
    s.heading *= Math.exp(-8 * dt);
    if (s.crashTime === 0) s.invincible = 2;
  } else {
    s.heading +=
      (clamp(input, -1, 1) * c.turnAngle - s.heading) *
      (1 - Math.exp(-STEER_RESPONSE * dt));
    const targetSpeed =
      c.speed * (1 + SLOPE_RAMP * clamp(s.z / c.finishZ, 0, 1)) -
      Math.abs(s.heading) * 6 +
      Math.sin(s.z * 0.015) * 0.8;
    s.speed += (targetSpeed - s.speed) * (1 - Math.exp(-1.1 * dt));
    s.x +=
      (Math.sin(oldHeading) * oldSpeed + Math.sin(s.heading) * s.speed) *
      dt *
      0.5;
  }
  s.z +=
    (Math.cos(oldHeading) * oldSpeed + Math.cos(s.heading) * s.speed) *
    dt *
    0.5;
  if (
    s.invincible === 0 &&
    s.crashTime === 0 &&
    (Math.abs(s.x) > 20 ||
      OBSTACLES.some((o) => hits(s, o)) ||
      c.hazards.some((o) => hits(s, o)))
  ) {
    s.crashTime = 1.1;
    s.combo = 0;
    s.crashes++;
    s.score = Math.max(0, s.score - CRASH_PENALTY);
    s.event = "crash";
  }
  if (s.crashTime === 0) {
    const dx = s.x - oldX,
      dz = s.z - oldZ,
      lengthSquared = dx * dx + dz * dz;
    for (let i = 0; i < c.lampSpots.length; i++) {
      const lamp = c.lampSpots[i];
      if (
        s.collectedLamps[i] ||
        lamp.z < oldZ - c.pickupRadius ||
        lamp.z > s.z + c.pickupRadius
      )
        continue;
      const t =
        lengthSquared > 0
          ? clamp(
              ((lamp.x - oldX) * dx + (lamp.z - oldZ) * dz) / lengthSquared,
              0,
              1,
            )
          : 0;
      if (
        Math.hypot(lamp.x - (oldX + t * dx), lamp.z - (oldZ + t * dz)) <
        c.pickupRadius
      ) {
        // Lamps are worth nothing in points; they are kept by passing the level.
        s.collectedLamps[i] = true;
        s.lamps++;
        s.lampEvent = i;
      }
    }
  }
  stepPresents(s, oldX, oldZ, dt, c.gates, c.finishZ, c.hazards);
  while (s.nextGate < c.gates.length && s.z >= c.gates[s.nextGate].z) {
    const gate = c.gates[s.nextGate];
    const t = clamp((gate.z - oldZ) / Math.max(0.001, s.z - oldZ), 0, 1);
    const crossingX = oldX + (s.x - oldX) * t;
    const offset = Math.abs(crossingX - gate.x);
    if (offset <= gate.width / 2 && s.crashTime === 0) {
      s.hits++;
      s.combo = Math.min(COMBO_CAP, s.combo + 1);
      s.score += 100 * s.combo;
      if (offset <= BULLSEYE_RADIUS) {
        s.bullseyes++;
        s.gateBonus = BULLSEYE_POINTS;
        s.score += BULLSEYE_POINTS;
      }
      s.event = "gate";
    } else {
      s.combo = 0;
      s.misses++;
      if (s.event !== "crash") s.event = "miss";
    }
    s.nextGate++;
  }
  if (s.z >= c.finishZ) {
    s.z = c.finishZ;
    s.finished = true;
    s.timeBonus = finishTimeBonus(s.time, c.parTime, c.timeBonusRate);
    s.score += s.timeBonus;
    // A level is only passed clean: every gate, and the goal score.
    s.passed = s.misses === 0 && s.score >= s.goal;
    s.event = "finish";
  }
}
