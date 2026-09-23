import { createPresents, stepPresents } from "./presents";
import {
  BANK_HALF_WIDTH,
  BANK_RATE,
  BULLSEYE_POINTS,
  CRASH_PENALTY,
  CROSS_SLOPE_MAX,
  CROWN_HEIGHT,
  DISH_HEIGHT,
  DISH_REACH,
  GRAVITY,
  ROLLER_HEIGHT,
  SLIP_ACCEL,
  SLIP_DRAG,
  SLIP_GRIP,
  SLOPE_RAMP,
  STEER_RESPONSE,
  STEP_HALF,
  STEP_HEIGHT,
  getCourse,
  slopeWindow,
  type Course,
} from "./levels";
import { finishTimeBonus } from "./scoring";
import { createEndlessCourse } from "./endless";
export type { Course, Gate, Hazard, LampSpot } from "./levels";

export interface Run {
  level: number;
  course: Course;
  x: number;
  z: number;
  speed: number;
  heading: number;
  /** Sideways skid across the piste in m/s (+x positive): driven by banked snow, bled by edge grip. */
  slip: number;
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
  /** Misses plus tumbles over the run. */
  strikes: number;
  /** Lives left on an endless run; it ends when they reach zero. */
  lives: number;
  /** Presents caught since the last life won, on an endless run. */
  giftsTowardLife: number;
  /** Set for the step in which a life was won. */
  lifeEvent: boolean;
  /** Index of the first hazard that could still be ahead, so checks stay cheap. */
  hazardCursor: number;
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
/**
 * The slope drops 10 cm a metre with two gentle undulations whose periods
 * divide TERRAIN_PERIOD, so scenery built for one period can be moved on by
 * whole periods (and down by a tenth of that) and still sit on the snow.
 */
export const TERRAIN_PERIOD = 1800;
export const snowHeight = (z: number) =>
  -z * 0.1 +
  Math.sin((z * 2 * Math.PI) / 300) * 0.45 +
  Math.sin((z * 2 * Math.PI) / 100) * 0.15;
/**
 * How much higher (or, negative, lower) the snow is than the flat slope at a
 * point, because of a bank: the piste tilts about its centre line, high on
 * the side the bank pushes away from and sunk on the side it pushes toward,
 * and comes back level just inside the fences.
 */
export function bankHeight(course: Pick<Course, "slopes">, x: number, z: number) {
  let height = 0;
  for (const slope of course.slopes) {
    const w = slopeWindow(slope, z);
    if (w === 0) continue;
    if (slope.kind === "roller") {
      // A knoll across the whole piste, cresting halfway along the band; a
      // short band gets a lower knoll, so its faces are never steeper.
      const length = slope.to - slope.from;
      const t = Math.sin((Math.PI * (z - slope.from)) / length);
      height += ROLLER_HEIGHT * Math.min(1, length / 26) * t * t;
      continue;
    }
    // The sideways shapes come back level just inside the fences.
    const e = Math.min(1, Math.max(0, (BANK_HALF_WIDTH - Math.abs(x)) / 4));
    const edge = e * e * (3 - 2 * e);
    const reach = Math.min(x * x, DISH_REACH * DISH_REACH) / (DISH_REACH * DISH_REACH);
    let shape = 0;
    if (slope.kind === "camber") shape = -slope.dir * BANK_RATE * x;
    else if (slope.kind === "dish") shape = DISH_HEIGHT * reach;
    else if (slope.kind === "crown") shape = CROWN_HEIGHT * (1 - reach);
    else {
      // A step: the high shelf on the side the snow falls from, a bank across the middle.
      const s = Math.min(1, Math.max(0, (x * slope.dir + STEP_HALF) / (2 * STEP_HALF)));
      shape = STEP_HEIGHT * (0.5 - s * s * (3 - 2 * s));
    }
    height += shape * edge * w;
  }
  return height;
}
/** The height of the snow under a point of a course, banks included. */
export const surfaceHeight = (course: Pick<Course, "slopes">, x: number, z: number) =>
  snowHeight(z) + bankHeight(course, x, z);
/**
 * How steeply the snow falls away sideways under a point, as a multiple of a
 * full camber (positive toward +x), read off the surface itself so every
 * shape of bank drives the skis the way it looks. Capped: past a point the
 * edges bite no harder.
 */
export function crossSlope(course: Pick<Course, "slopes">, x: number, z: number) {
  if (!course.slopes.length) return 0;
  const fall = (bankHeight(course, x - 0.5, z) - bankHeight(course, x + 0.5, z)) / BANK_RATE;
  return Math.max(-CROSS_SLOPE_MAX, Math.min(CROSS_SLOPE_MAX, fall));
}
/**
 * How far sideways the skid will carry a skier between here and a point
 * ahead, given the slip already under way, the banks on the way and a steady
 * speed: the same slip dynamics as the run, walked a metre at a time. This is
 * what a skier reads off the snow ahead to know how far upslope to aim.
 */
export function driftAhead(
  course: Pick<Course, "slopes">,
  x: number,
  z: number,
  slip: number,
  speed: number,
  untilZ: number,
) {
  let drift = 0;
  const step = 1,
    dt = step / Math.max(5, speed),
    grip = 1 - Math.exp(-dt / SLIP_GRIP);
  for (let at = z; at < untilZ; at += step) {
    const terminal = crossSlope(course, x + drift, at + step / 2) * SLIP_ACCEL * SLIP_GRIP;
    slip += (terminal - slip) * grip;
    drift += slip * dt;
  }
  return drift;
}
/** Lives an endless run starts with; every miss or tumble costs one. */
export const ENDLESS_LIVES = 3;
/** Presents caught on an endless run that win an extra life. There is no cap. */
export const GIFTS_PER_LIFE = 10;
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
  return runFor(getCourse(level), seed, owned);
}
/** A run of the endless course; every run is a fresh course from its seed. */
export function createEndlessRun(seed = Math.floor(Math.random() * 4294967296)): Run {
  return runFor(createEndlessCourse(seed), seed);
}
function runFor(course: Course, seed: number, owned: readonly boolean[] = []): Run {
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
    slip: 0,
    time: 0,
    nextGate: 0,
    hits: 0,
    misses: 0,
    crashes: 0,
    strikes: 0,
    lives: ENDLESS_LIVES,
    giftsTowardLife: 0,
    lifeEvent: false,
    hazardCursor: 0,
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
  s.lifeEvent = false;
  s.presents.event = false;
  if (s.finished || dt <= 0) return;
  const c = s.course;
  // An endless course keeps building itself well ahead of the skier.
  c.extend?.(s.z + 600);
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
    // A tumbling skier digs in: the skid dies away quickly.
    s.slip *= Math.exp(-dt / SLIP_GRIP);
    if (s.crashTime === 0) s.invincible = 2;
  } else {
    s.heading +=
      (clamp(input, -1, 1) * c.turnAngle - s.heading) *
      (1 - Math.exp(-STEER_RESPONSE * dt));
    const cruise = c.speedAt
      ? c.speedAt(s.z)
      : c.speed * (1 + SLOPE_RAMP * clamp(s.z / c.finishZ, 0, 1));
    const targetSpeed =
      cruise -
      Math.abs(s.heading) * 6 +
      Math.sin(s.z * 0.015) * 0.8;
    s.speed += (targetSpeed - s.speed) * (1 - Math.exp(-1.1 * dt));
    // Banked snow: gravity across the tilt drives the skis into a sideslip
    // that builds while the bank lasts, and edge grip bleeds it away, so the
    // skid keeps carrying the skier for a moment after the bank ends. The
    // heading stays put; it takes an upslope aim to hold a line.
    const terminal = crossSlope(c, s.x, s.z) * SLIP_ACCEL * SLIP_GRIP;
    s.slip += (terminal - s.slip) * (1 - Math.exp(-dt / SLIP_GRIP));
    // Skidding sideways scrubs speed.
    s.speed = Math.max(0, s.speed - SLIP_DRAG * Math.abs(s.slip) * dt);
    s.x +=
      (Math.sin(oldHeading) * oldSpeed + Math.sin(s.heading) * s.speed) *
      dt *
      0.5 +
      s.slip * dt;
  }
  s.z +=
    (Math.cos(oldHeading) * oldSpeed + Math.cos(s.heading) * s.speed) *
    dt *
    0.5;
  if (s.crashTime === 0) {
    // Height is speed: dropping into the trough of a bank gives a little
    // back, climbing onto its crest takes some away.
    const rise = bankHeight(c, s.x, s.z) - bankHeight(c, oldX, oldZ);
    s.speed = Math.max(0, s.speed - (GRAVITY * rise) / Math.max(5, s.speed));
  }
  // Hazards are sorted by z; skip those already behind and stop past the skier.
  while (
    s.hazardCursor < c.hazards.length &&
    c.hazards[s.hazardCursor].z < s.z - 4
  )
    s.hazardCursor++;
  let hazardHit = false;
  for (let i = s.hazardCursor; i < c.hazards.length && c.hazards[i].z < s.z + 4; i++)
    if (hits(s, c.hazards[i])) {
      hazardHit = true;
      break;
    }
  if (
    s.invincible === 0 &&
    s.crashTime === 0 &&
    (Math.abs(s.x) > 20 || hazardHit || OBSTACLES.some((o) => hits(s, o)))
  ) {
    s.crashTime = 1.1;
    s.combo = 0;
    s.crashes++;
    s.strikes++;
    s.lives--;
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
  // On the endless run every tenth present caught wins a life, with no cap:
  // ten gifts on three lives make a fourth.
  if (c.endless && s.presents.event && ++s.giftsTowardLife >= GIFTS_PER_LIFE) {
    s.giftsTowardLife = 0;
    s.lives++;
    s.lifeEvent = true;
  }
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
      s.strikes++;
      s.lives--;
      if (s.event !== "crash") s.event = "miss";
    }
    s.nextGate++;
  }
  if (c.endless && s.lives <= 0) {
    // Out of lives: the endless run is over where it stands.
    s.finished = true;
    s.passed = false;
    s.event = "finish";
    return;
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
