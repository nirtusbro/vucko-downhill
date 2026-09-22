import { DIFFICULTIES, gateWidth, type DifficultyId } from "./difficulty";
import { createPresents, stepPresents } from "./presents";
import {
  LAMPS_PER_RUN,
  LAMP_CATALOG,
  lampDetourExtra,
  lampPoints,
  rollLamps,
} from "./lamp-catalog";
import { seededRandom } from "./random";
import { finishTimeBonus } from "./scoring";
export { LAMPS_PER_RUN };

export interface Hazard {
  x: number;
  z: number;
  radius: number;
  kind: "rock" | "tree";
}
export interface LampSpot {
  x: number;
  z: number;
  side: number;
  stretch: number;
}
export interface Run {
  difficulty: DifficultyId;
  x: number;
  z: number;
  speed: number;
  boosting: boolean;
  heading: number;
  time: number;
  nextGate: number;
  hits: number;
  bullseyes: number;
  combo: number;
  score: number;
  gateBonus: number;
  timeBonus: number;
  lampIds: number[];
  lampSpots: LampSpot[];
  lamps: number;
  collectedLamps: boolean[];
  lampEvent: number;
  hazards: Hazard[];
  presents: ReturnType<typeof createPresents>;
  crashTime: number;
  invincible: number;
  finished: boolean;
  event: string;
}
export const COMBO_CAP = 8;
export const BULLSEYE_RADIUS = 1;
export const BULLSEYE_POINTS = 50;
/** Boosting widens the turning arc, so full speed through a tight section is a gamble. */
export const BOOST_TURN_SCALE = 0.72;
/** The slope steepens toward the finish: cruising speed rises by this fraction. */
export const SLOPE_RAMP = 0.08;
/** Gate openings shrink by this fraction from the first gate to the last. */
export const GATE_TIGHTENING = 0.2;
// Hand-placed course as [x, gap from the previous gate]. Same-side doubles and
// quick follow-ups break the left-right rhythm; the last third swings wider.
const layout: [number, number][] = [
  [-4, 65],
  [5, 45],
  [-6, 45],
  [6, 45],
  [-4, 45],
  [7, 45],
  [7, 30],
  [-6, 45],
  [5, 45],
  [-7, 45],
  [-3, 32],
  [6, 45],
  [-5, 45],
  [7, 45],
  [-7, 45],
  [7, 45],
  [-7, 45],
  [4, 32],
  [-6, 45],
  [7, 45],
];
let courseZ = 0;
export const GATES = layout.map(([x, gap], i) => {
  courseZ += gap;
  return {
    x,
    z: courseZ,
    width:
      (i < 4 ? 10 : 8.5) * (1 - (GATE_TIGHTENING * i) / (layout.length - 1)),
    color: i % 2 ? "blue" : "red",
  };
});
export const FINISH_Z = GATES[GATES.length - 1].z + 80;
/** The open stretch after each gate, ending at the next gate or the finish. */
export const STRETCHES = GATES.map((gate, i) => {
  const next = GATES[i + 1] ?? { x: 0, z: FINISH_Z };
  return {
    index: i,
    length: next.z - gate.z,
    midX: (gate.x + next.x) / 2,
    midZ: (gate.z + next.z) / 2,
    side: Math.sign(gate.x) || 1,
  };
});
// Candidate lamp spots: halfway through each long enough stretch, held wide on
// the previous gate's side so a pickup delays the turn into the next gate.
export const LAMP_DETOUR = 5;
export const LAMP_SPOTS: LampSpot[] = STRETCHES.filter(
  (stretch) => stretch.length >= 40,
).map((stretch) => ({
  x: stretch.midX + stretch.side * LAMP_DETOUR,
  z: stretch.midZ,
  side: stretch.side,
  stretch: stretch.index,
}));
/** Seeded spread of lamp spots: one per band of stretches, so lamps never bunch. */
export function pickLampSpots(seed: number) {
  const random = seededRandom(seed);
  const band = (index: number) =>
    Math.floor((index * LAMPS_PER_RUN) / LAMP_SPOTS.length);
  return Array.from({ length: LAMPS_PER_RUN }, (_, i) => {
    const options = LAMP_SPOTS.filter((_, index) => band(index) === i);
    return options[Math.floor(random() * options.length)];
  });
}
/**
 * Rarer designs sit farther off the line, and beside a guard tree from Rare
 * up. Faster modes scale the whole detour down, since they leave less time to
 * cut back for the next gate.
 */
export function placeLamps(
  seed: number,
  lampIds: readonly number[],
  difficulty: DifficultyId = "classic",
) {
  const scale = DIFFICULTIES[difficulty].detourScale;
  return pickLampSpots(seed).map((spot, i) => ({
    ...spot,
    x:
      STRETCHES[spot.stretch].midX +
      spot.side * (LAMP_DETOUR + lampDetourExtra(lampIds[i])) * scale,
  }));
}
export const FORK_ROCK_RADIUS = 1.2;
export const GUARD_TREE_RADIUS = 0.9;
export const WIDE_ROCK_RADIUS = 1;
/**
 * Per-run hazards inside the course. A fork rock sits on the direct line at
 * every lamp, so the pickup goes wide one way and the clean line cuts inside.
 * Rare and better lamps also get a guard tree between the line and the lamp.
 * Some lamp-free stretches hold a rock where a lamp would have been, punishing
 * a lazy wide line; the chance depends on difficulty.
 */
export function buildHazards(
  seed: number,
  difficulty: DifficultyId,
  lampSpots: readonly LampSpot[],
  lampIds: readonly number[],
): Hazard[] {
  const random = seededRandom(seed, 0x2545f491);
  const hazards: Hazard[] = [];
  for (const [i, spot] of lampSpots.entries()) {
    const stretch = STRETCHES[spot.stretch];
    hazards.push({
      x: stretch.midX,
      z: spot.z,
      radius: FORK_ROCK_RADIUS,
      kind: "rock",
    });
    if (lampDetourExtra(lampIds[i]) > 0)
      hazards.push({
        x: spot.x - spot.side * 3.2,
        z: spot.z - 8,
        radius: GUARD_TREE_RADIUS,
        kind: "tree",
      });
  }
  const taken = new Set(lampSpots.map((spot) => spot.stretch));
  for (const candidate of LAMP_SPOTS) {
    const roll = random();
    if (taken.has(candidate.stretch)) continue;
    if (roll > DIFFICULTIES[difficulty].hazardChance) continue;
    hazards.push({
      x: candidate.x,
      z: candidate.z,
      radius: WIDE_ROCK_RADIUS,
      kind: "rock",
    });
  }
  return hazards.sort((a, b) => a.z - b.z);
}
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
export function createRun(
  difficulty: DifficultyId = "classic",
  seed = Math.floor(Math.random() * 4294967296),
  collectionCounts: readonly number[] = [],
): Run {
  const lampIds = rollLamps(seed, collectionCounts);
  const lampSpots = placeLamps(seed, lampIds, difficulty);
  return {
    difficulty,
    x: 0,
    z: 0,
    speed: DIFFICULTIES[difficulty].speed * 0.5,
    boosting: false,
    heading: 0,
    time: 0,
    nextGate: 0,
    hits: 0,
    bullseyes: 0,
    combo: 0,
    score: 0,
    gateBonus: 0,
    timeBonus: 0,
    lampIds,
    lampSpots,
    lamps: 0,
    collectedLamps: Array.from({ length: LAMPS_PER_RUN }, () => false),
    lampEvent: -1,
    hazards: buildHazards(seed, difficulty, lampSpots, lampIds),
    presents: createPresents(seed),
    crashTime: 0,
    invincible: 0,
    finished: false,
    event: "",
  };
}
const hits = (
  s: Run,
  o: { x: number; z: number; radius: number },
) =>
  Math.abs(o.z - s.z) < o.radius + 0.6 &&
  Math.hypot(o.x - s.x, o.z - s.z) < o.radius + 0.65;
export function stepRun(s: Run, input: number, dt: number, boost = false) {
  s.event = "";
  s.lampEvent = -1;
  s.gateBonus = 0;
  s.presents.event = false;
  if (s.finished || dt <= 0) return;
  s.boosting = boost && s.crashTime === 0;
  const settings = DIFFICULTIES[s.difficulty];
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
    const turnAngle = settings.turnAngle * (s.boosting ? BOOST_TURN_SCALE : 1);
    s.heading +=
      (clamp(input, -1, 1) * turnAngle - s.heading) *
      (1 - Math.exp(-settings.steerResponse * dt));
    const targetSpeed =
      settings.speed *
        (1 + SLOPE_RAMP * clamp(s.z / FINISH_Z, 0, 1)) *
        (s.boosting ? 1.45 : 1) -
      Math.abs(s.heading) * 6 +
      Math.sin(s.z * 0.015) * 0.8;
    s.speed +=
      (targetSpeed - s.speed) * (1 - Math.exp(-(s.boosting ? 2.4 : 1.1) * dt));
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
      s.hazards.some((o) => hits(s, o)))
  ) {
    s.crashTime = 1.1;
    s.boosting = false;
    s.combo = 0;
    s.event = "crash";
  }
  if (s.crashTime === 0) {
    const dx = s.x - oldX,
      dz = s.z - oldZ,
      lengthSquared = dx * dx + dz * dz;
    for (let i = 0; i < s.lampSpots.length; i++) {
      const lamp = s.lampSpots[i];
      if (
        s.collectedLamps[i] ||
        lamp.z < oldZ - settings.pickupRadius ||
        lamp.z > s.z + settings.pickupRadius
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
        settings.pickupRadius
      ) {
        s.collectedLamps[i] = true;
        s.lamps++;
        s.score += lampPoints(s.lampIds[i]);
        s.lampEvent = i;
      }
    }
  }
  stepPresents(s, oldX, oldZ, dt, GATES, FINISH_Z, s.hazards);
  while (s.nextGate < GATES.length && s.z >= GATES[s.nextGate].z) {
    const gate = GATES[s.nextGate];
    const t = clamp((gate.z - oldZ) / Math.max(0.001, s.z - oldZ), 0, 1);
    const crossingX = oldX + (s.x - oldX) * t;
    const offset = Math.abs(crossingX - gate.x);
    if (offset <= gateWidth(gate.width, s.difficulty) / 2 && s.crashTime === 0) {
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
      if (s.event !== "crash") s.event = "miss";
    }
    s.nextGate++;
  }
  if (s.z >= FINISH_Z) {
    s.z = FINISH_Z;
    s.finished = true;
    s.timeBonus = finishTimeBonus(s.time);
    s.score += s.timeBonus;
    s.boosting = false;
    s.event = "finish";
  }
}
/** Points from lamps a run has collected so far. */
export function lampScore(s: Run) {
  return s.lampIds.reduce(
    (sum, id, i) => sum + (s.collectedLamps[i] ? lampPoints(id) : 0),
    0,
  );
}
export const lampRarity = (id: number) => LAMP_CATALOG[id].rarity;
