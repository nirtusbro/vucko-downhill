export const LEVEL_COUNT = 30;
/** The first twenty levels carry the hundred lamps; the rest are bonus runs with none. */
export const LAMP_LEVELS = 20;
export const MAX_GATES = 30;
/** Lamps tied to each level: four collectible on the slope, one earned at the finish. */
export const PICKUPS_PER_LEVEL = 4;
export const LAMPS_PER_LEVEL = PICKUPS_PER_LEVEL + 1;
export const MAX_PICKUPS = PICKUPS_PER_LEVEL;
/** Longest course any level can produce; scenery is laid out to cover it. */
export const MAX_COURSE_LENGTH = 1300;
export const STEER_RESPONSE = 4.4;
/** The slope steepens toward the finish: cruising speed rises by this fraction. */
export const SLOPE_RAMP = 0.08;
/** Every level's authored cruising speed is scaled by this; 1.15 made the whole game 15% faster. */
export const SPEED_SCALE = 1.15;
/** Catalogue lamps owned by a level, rarest last: the finish lamp. */
export function levelLamps(level: number) {
  if (level >= LAMP_LEVELS) return { pickups: [] as number[], finish: -1 };
  const first = level * LAMPS_PER_LEVEL;
  return {
    pickups: Array.from({ length: PICKUPS_PER_LEVEL }, (_, i) => first + i),
    finish: first + PICKUPS_PER_LEVEL,
  };
}

export interface Gate {
  x: number;
  z: number;
  width: number;
  color: "red" | "blue";
}
export interface Stretch {
  index: number;
  length: number;
  /** Where a pickup would sit along the stretch and the direct line there. */
  lampZ: number;
  lineX: number;
  side: number;
  swing: number;
}
export interface LampSpot {
  x: number;
  z: number;
  side: number;
  stretch: number;
}
export interface Hazard {
  x: number;
  z: number;
  radius: number;
  kind: "rock" | "tree";
}
/** A gate as authored: sideways position, gap from the gate before, width scale. */
export type GateSpec = [x: number, gap: number, widthScale?: number];
export interface LevelDesign {
  name: string;
  /** What this level asks of the skier, shown on the home card. */
  hint: string;
  gates: GateSpec[];
  baseWidth: number;
  speed: number;
  turnAngle: number;
  pickupRadius: number;
  /** How far off the direct line a pickup sits, and how far along its stretch. */
  detour: number;
  lampFraction: number;
  /** Stretches (gate index to the next gate) holding the four pickups, in order. */
  lamps: number[];
  forkRocks: boolean;
  /** Pickup indexes (0–3) that get a guard tree on the lamp side. */
  guards: number[];
  /** Lamp-free stretches holding a stray rock where a lamp would have been. */
  wideRocks: number[];
  /** Stretches with a rock on the direct line halfway along, for gates that would otherwise line up. */
  lineRocks: number[];
  /** Put a stray rock on every stretch that has nothing else in it. */
  fillRocks: boolean;
  /** Whether birthday presents fall on this level. */
  presents: boolean;
  /** Stretches that end in a rock gate: two rocks to thread on the way to the next flags. */
  rockGates: number[];
  /** Stretches that end in a weave: three rocks alternating sides on the way in. */
  weaves: number[];
  /** Goal as a share of the maximum gate score. */
  goalFraction: number;
  /** Par time as a multiple of the course length at cruising speed. */
  parFactor: number;
  /** Points per second under par. Sprint levels pay far more for speed. */
  timeBonusRate: number;
}
export interface Course {
  level: number;
  name: string;
  hint: string;
  presents: boolean;
  /** Set on the endless course, which generates itself ahead of the skier. */
  endless?: boolean;
  extend?: (untilZ: number) => void;
  speedAt?: (z: number) => number;
  /** The lamp earned by passing the level. */
  lampId: number;
  /** The lamp each pickup spot holds, in slope order. */
  pickupLampIds: number[];
  gates: Gate[];
  finishZ: number;
  stretches: Stretch[];
  lampSpots: LampSpot[];
  hazards: Hazard[];
  speed: number;
  turnAngle: number;
  pickupRadius: number;
  parTime: number;
  timeBonusRate: number;
  maxGateScore: number;
  goal: number;
}
export const BULLSEYE_POINTS = 50;
/** Points lost on every tumble, on top of the broken combo and the lost speed. */
export const CRASH_PENALTY = 300;
export const FORK_ROCK_RADIUS = 1.2;
export const GUARD_TREE_RADIUS = 0.9;
export const WIDE_ROCK_RADIUS = 1;
export const ROCK_GATE_HALF = 3.8;
export const WEAVE_OFFSET = 3.8;
export const WEAVE_STEP = 9;
/** Rock features sit this far before the gate they lead into, on that gate's line. */
export const FEATURE_LEAD = 14;

const base: Omit<LevelDesign, "name" | "hint" | "gates" | "lamps"> = {
  baseWidth: 9,
  speed: 22,
  turnAngle: 0.8,
  pickupRadius: 2.3,
  detour: 4.5,
  lampFraction: 0.5,
  forkRocks: true,
  guards: [],
  wideRocks: [],
  lineRocks: [],
  fillRocks: false,
  presents: true,
  rockGates: [],
  weaves: [],
  goalFraction: 0.6,
  parFactor: 1.3,
  timeBonusRate: 50,
};
const design = (
  name: string,
  hint: string,
  spec: Partial<Omit<LevelDesign, "name" | "hint">> & Pick<LevelDesign, "gates" | "lamps">,
): LevelDesign => ({ ...base, ...spec, name, hint });

/**
 * Twenty hand-placed levels. Each gate is [x, gap before it, width scale];
 * the slope runs from x = −9.5 to 9.5 and every gap is at least 30 metres.
 * Stretch n is the run from gate n to gate n+1 (the last one leads to the finish).
 * Rule: the openings of consecutive gates never overlap sideways, so no two
 * gates can be taken in a straight line, unless a rock sits on the line between
 * them (a lamp's fork rock, a line rock, a rock gate or a weave).
 */
export const LEVEL_DESIGNS: LevelDesign[] = [
  design("First tracks", "Wide gates that swing wider as you go. Find the flags and the four lamps.", {
    forkRocks: false, baseWidth: 8.4,
    gates: [[-4.5, 60], [4.5, 52], [-4.5, 50], [5, 50], [-5.5, 48], [6, 48], [-6.5, 48], [7, 46], [-7, 46], [6.5, 46]],
    lamps: [1, 3, 5, 7],
  }),
  design("Little lights", "A rock sits beside every lamp: go wide for it, or cut inside past the rock.", {
    baseWidth: 8, speed: 23.5, goalFraction: 0.62,
    gates: [[-4, 60], [4.5, 50], [-4.5, 50], [5, 48], [-6, 48], [5.5, 48], [-5, 46], [6, 46], [-6.5, 46], [7, 46], [-6, 46]],
    lamps: [1, 4, 6, 8],
    wideRocks: [2],
  }),
  design("Find the rhythm", "Even spacing, steady swings, one off-beat gate. Link the combo.", {
    baseWidth: 7.6, speed: 25, turnAngle: 0.83, pickupRadius: 2.2, goalFraction: 0.72, parFactor: 1.26,
    gates: [[4, 60], [-4, 46], [4.5, 46], [-4.5, 46], [5, 46], [-5, 46], [0, 30], [5.5, 46], [-5, 46], [5, 46], [-5.5, 46], [5, 46]],
    lamps: [1, 3, 8, 10],
    lineRocks: [5, 6],
  }),
  design("Squeeze", "Two funnels that close in and narrow, a double, a chicane and a rock gate.", {
    baseWidth: 7.4, speed: 26, turnAngle: 0.88, pickupRadius: 1.95, detour: 5.2, lampFraction: 0.46, goalFraction: 0.66, parFactor: 1.22,
    gates: [[-4, 60], [5, 44], [-5, 42, 0.95], [5, 40, 0.9], [-4.5, 38, 0.85], [4, 36, 0.8], [-3.8, 34, 0.75], [6, 44], [-6, 44], [5.5, 42, 0.95], [-5, 40, 0.9], [4.5, 38, 0.85], [-4, 36, 0.8], [3.5, 33, 0.75], [-6.5, 44, 0.9], [6, 44, 0.85]],
    lamps: [0, 7, 8, 14],
    guards: [1],
    rockGates: [13],
    wideRocks: [1, 9],
  }),
  design("Halfway sprint", "A tight par and a high rate. Carry speed: every second under par pays.", {
    baseWidth: 7.3, speed: 27, turnAngle: 0.89, pickupRadius: 1.95, detour: 5.2, lampFraction: 0.45, goalFraction: 0.68, parFactor: 1.1, timeBonusRate: 120,
    gates: [[-3.5, 60], [3.5, 50], [-4, 50], [4, 50], [-3.5, 30], [4.2, 30], [-6, 50], [6, 50], [-9.5, 46], [9.5, 46], [-4, 48], [4, 48], [-4, 48], [3.5, 30], [-4, 30], [5, 50]],
    lamps: [0, 2, 6, 10],
    guards: [2],
    rockGates: [12],
    wideRocks: [7, 11],
  }),
  design("Hold the line", "Pairs on the same side with a rock between them, then a snap back.", {
    baseWidth: 7.2, speed: 28, turnAngle: 0.84, pickupRadius: 2.2, goalFraction: 0.68, parFactor: 1.26,
    gates: [[4, 60], [-4.5, 46], [5, 46], [8.5, 42], [-5, 46], [-8.5, 42], [5, 44], [-5, 44], [5, 44], [1.5, 42], [-6, 46], [6, 44], [-6, 44]],
    lamps: [0, 5, 6, 11],
    lineRocks: [2, 4, 8],
    wideRocks: [1, 7, 9],
  }),
  design("Light touch", "Chicanes of quick flicks that narrow as they go. Small inputs only.", {
    baseWidth: 7.1, speed: 28.5, turnAngle: 0.85, pickupRadius: 2.1, goalFraction: 0.7, parFactor: 1.24,
    gates: [[-4, 60], [4.5, 46], [-4.5, 45], [3, 30, 0.95], [-4.2, 30, 0.9], [3, 30, 0.85], [-5, 45], [5, 45], [-2.5, 30, 0.95], [4.7, 30, 0.9], [-2.5, 30, 0.85], [5, 45], [-5.5, 45], [5, 45]],
    lamps: [0, 5, 10, 12],
    wideRocks: [1, 6, 11],
  }),
  design("Read ahead", "Rock gates on the way into flags, each narrower and later than the last.", {
    baseWidth: 7, speed: 29, turnAngle: 0.86, pickupRadius: 2.1, detour: 5, goalFraction: 0.7, parFactor: 1.24,
    gates: [[4, 60], [-4, 45], [4.5, 45], [-5, 45], [5, 45], [-5.5, 45], [6, 44], [-6, 44], [-1, 40], [6.5, 44], [-6, 44], [6.5, 44], [-6.5, 44], [6, 44]],
    lamps: [0, 4, 9, 12],
    rockGates: [2, 7, 11],
    wideRocks: [1, 5, 6],
  }),
  design("Guarded lights", "Trees guard the lamps, and rock-strewn staircases cross the slope.", {
    baseWidth: 6.9, speed: 29.5, turnAngle: 0.87, pickupRadius: 2, detour: 5.2, goalFraction: 0.72, parFactor: 1.24,
    gates: [[-8, 60], [-4, 42], [0, 40], [4, 40], [8, 40], [-5, 46], [5, 44], [1, 40], [-3, 40], [-7, 40], [8, 44], [-7, 44], [6, 44], [-6, 44], [6, 44]],
    lamps: [4, 9, 11, 13],
    guards: [0, 1, 2, 3],
    lineRocks: [0, 1, 2, 3, 6, 7, 8],
    rockGates: [5],
    wideRocks: [10, 12],
  }),
  design("Commit", "Hairpins from edge to edge. Start the turn before you think you need to.", {
    baseWidth: 6.8, speed: 30, turnAngle: 0.88, pickupRadius: 2, detour: 5.2, lampFraction: 0.46, goalFraction: 0.72, parFactor: 1.24,
    gates: [[-9, 60], [9, 44], [-4, 44], [9.5, 44], [-9.5, 44], [4, 44], [-9, 44], [9, 44], [-3.5, 44], [9.5, 44], [-9.5, 44], [4.5, 44], [-9, 44], [9, 44], [-8, 44]],
    lamps: [2, 5, 8, 11],
    guards: [1, 2],
    rockGates: [9],
    wideRocks: [0, 4, 7, 13],
  }),
  design("The long run", "Twenty-two gates of everything so far. Keep the combo alive.", {
    baseWidth: 6.6, speed: 32, turnAngle: 0.9, pickupRadius: 1.9, detour: 5.4, lampFraction: 0.44, goalFraction: 0.74, parFactor: 1.22,
    gates: [[-4, 60], [4.5, 44], [-5, 44], [-1, 40], [3, 40], [7, 40], [-9, 44], [9, 44], [1.5, 30], [8.5, 30], [-4, 44], [-8, 40], [5, 44], [-5, 44], [5, 42], [-4, 40], [3.5, 38], [-3.5, 36], [6, 44], [-6, 44], [7, 44], [-5.5, 44]],
    lamps: [0, 6, 12, 19],
    guards: [0, 2],
    lineRocks: [2, 3, 4, 10],
    rockGates: [1, 13],
    wideRocks: [5, 15, 17],
  }),
  design("Tight corridor", "Narrow flags and rock gates all the way down. Precision only.", {
    baseWidth: 6.2, speed: 32.5, turnAngle: 0.9, pickupRadius: 1.9, detour: 5.4, lampFraction: 0.44, goalFraction: 0.76, parFactor: 1.22,
    gates: [[4, 60], [-4, 44], [5, 44], [-5, 44], [-8.5, 40], [4, 44, 0.95], [-4, 44, 0.95], [4, 42, 0.9], [-4, 42, 0.9], [4.5, 42, 0.9], [-5, 44, 0.85], [5, 42, 0.85], [-6, 42, 0.85], [-9, 40, 0.8], [5, 44, 0.8], [-5, 44, 0.8], [6, 44, 0.78], [-6, 44, 0.75]],
    lamps: [0, 6, 11, 16],
    guards: [1, 3],
    lineRocks: [3, 12],
    rockGates: [1, 5, 10, 15],
    wideRocks: [8],
  }),
  design("Boulder field", "Weave through rock after rock. Read the slope two gates ahead.", {
    baseWidth: 6.4, speed: 33, turnAngle: 0.91, pickupRadius: 1.85, detour: 5.5, lampFraction: 0.43, goalFraction: 0.76, parFactor: 1.22,
    gates: [[-4, 60], [5, 46], [-6, 46], [6, 46], [-9, 44], [9, 44], [-5, 46], [5, 46], [-2, 44], [4.5, 44], [-3, 44], [5, 46], [-6, 46], [6, 46], [-9.5, 44], [9.5, 44], [-5, 44], [5, 44]],
    lamps: [0, 6, 10, 16],
    guards: [1, 2],
    weaves: [7, 8, 9],
    rockGates: [3, 15],
    wideRocks: [1, 4, 13],
  }),
  design("Zigzag", "Fast, wide, relentless alternation at short spacing, rocks in the corners.", {
    baseWidth: 6.2, speed: 34, turnAngle: 0.92, pickupRadius: 1.85, detour: 5.5, lampFraction: 0.42, goalFraction: 0.78, parFactor: 1.2,
    gates: [[3, 60], [-8.5, 38], [7.5, 36], [-6, 36], [7, 36], [-5.5, 36], [7, 36], [-9.5, 38], [9.5, 38], [-7.5, 36], [7, 36], [-7.5, 36], [8.5, 36], [-7, 36], [7, 36], [-9.5, 38], [9.5, 38], [-7, 36], [5.5, 36], [-9, 38]],
    lamps: [0, 7, 8, 15],
    guards: [0],
    rockGates: [9],
    wideRocks: [3, 5, 11, 13, 17],
  }),
  design("No mercy", "A goal with barely a gate to spare, and gates that keep you guessing.", {
    baseWidth: 6.1, speed: 35, turnAngle: 0.93, pickupRadius: 1.8, detour: 5.6, lampFraction: 0.42, goalFraction: 0.9, parFactor: 1.2,
    gates: [[4.5, 60], [8, 40], [-9.5, 42], [9.5, 42], [3, 30], [-3.5, 30], [5, 44], [9, 40], [2.5, 44], [-5, 44], [6, 42], [-5, 40], [4, 38], [-9.5, 42], [9.5, 42], [3, 44], [-9.5, 42], [9.5, 42], [3, 40], [-3.5, 30]],
    lamps: [5, 8, 11, 14],
    guards: [1, 3],
    lineRocks: [0, 6],
    weaves: [7],
    rockGates: [9, 15],
    wideRocks: [3, 12, 17],
  }),
  design("Speed run", "A tight par and a near-perfect goal. Carry speed and take every lamp.", {
    baseWidth: 6.1, speed: 35.5, turnAngle: 0.94, pickupRadius: 1.8, detour: 5.6, lampFraction: 0.41, goalFraction: 0.94, parFactor: 1.1, timeBonusRate: 250,
    gates: [[-2.5, 60], [6.8, 44], [-6.3, 44], [6.2, 44], [-4.6, 44], [9.5, 44], [-9.5, 44], [4, 44], [-7, 44], [5, 44], [8.4, 40], [-6, 44], [6, 44], [-5.5, 44], [9.5, 44], [-9.5, 44], [4.4, 44], [-6.5, 44], [4.4, 44], [-5.3, 44], [9.5, 44], [-9.5, 44]],
    lamps: [0, 6, 12, 18],
    guards: [1],
    lineRocks: [9],
    rockGates: [8],
    wideRocks: [2, 10, 16, 20],
  }),
  design("Thin air", "The fastest cruise yet, through the narrowest flags and quick flicks.", {
    baseWidth: 5.8, speed: 37, turnAngle: 0.95, pickupRadius: 1.8, detour: 5.7, lampFraction: 0.4, goalFraction: 0.8, parFactor: 1.2,
    gates: [[-4, 60], [7, 42], [-7.5, 42], [-1.5, 30], [4.5, 30], [-1.5, 30], [4.5, 40], [-2, 40], [4, 40], [-4, 42], [2, 30], [-4, 30], [2, 30], [8, 42], [-7.5, 42], [9.5, 42], [-9.5, 42], [6.5, 42], [-4.5, 42], [1.5, 30], [-4.5, 30], [4, 42]],
    lamps: [0, 8, 13, 20],
    guards: [1, 2, 3],
    rockGates: [1, 14],
    wideRocks: [6, 16, 17],
  }),
  design("The gauntlet", "Weaves, rock gates, hairpins and flicks, one after another.", {
    baseWidth: 5.8, speed: 37.5, turnAngle: 0.95, pickupRadius: 1.8, detour: 5.8, lampFraction: 0.39, goalFraction: 0.82, parFactor: 1.2,
    gates: [[3, 60], [-3, 30], [3, 30], [-3, 30], [3.5, 45], [-9.5, 42], [9.5, 42], [3.5, 40], [-2.5, 40], [3.5, 40], [-2.5, 30], [3.5, 30], [-2.5, 30], [4, 45], [-7.5, 42], [-1.5, 40], [7, 42], [-3.5, 42], [3, 40], [-3, 38], [-9, 45], [9.5, 42], [-9.5, 42], [6, 42]],
    lamps: [4, 8, 15, 22],
    guards: [1, 2],
    weaves: [3, 12, 19],
    rockGates: [5, 16, 21],
    wideRocks: [6, 13, 17],
  }),
  design("Everything at once", "Twenty-six gates, every trick on the mountain, a goal near the maximum.", {
    baseWidth: 5.6, speed: 38.5, turnAngle: 0.96, pickupRadius: 1.8, detour: 6, lampFraction: 0.38, goalFraction: 0.9, parFactor: 1.16,
    gates: [[-3, 60], [6, 44], [-8, 44], [9.5, 44], [-9.5, 44], [6, 40], [-5, 38, 0.95], [4.5, 36, 0.9], [-3.5, 34, 0.85], [-9.5, 40], [-3, 30], [3, 30], [-3, 30], [3, 40], [-3, 40], [3.5, 40], [-3, 45], [9.5, 44], [-9.5, 44], [5, 44], [-1, 30], [5, 30], [-1.5, 45], [5, 44], [-9, 44], [9, 44]],
    lamps: [0, 5, 13, 23],
    guards: [0, 2, 3],
    weaves: [15, 21],
    rockGates: [1, 16, 22],
    wideRocks: [3, 8, 18, 24],
  }),
  design("The summit", "Every gate, every lamp, and no tumbles. Nothing less will do.", {
    baseWidth: 5.5, speed: 40, turnAngle: 0.96, pickupRadius: 1.8, detour: 6, lampFraction: 0.38, goalFraction: 0.97, parFactor: 1.1, timeBonusRate: 250,
    gates: [[4, 60], [-7.8, 42], [8.5, 42], [-6.7, 45], [9.5, 42], [-9.5, 42], [-3.5, 40], [3, 40], [-3, 40], [3.5, 42], [-3, 42], [3, 30], [-3, 30], [3, 30], [-3.5, 42], [-9.5, 45], [9.5, 42], [-7.4, 42], [6.1, 42], [-3.1, 40, 0.95], [3, 38, 0.92], [-2.8, 36, 0.9], [5.7, 42], [-5.4, 45], [4.6, 42], [-9.5, 42]],
    lamps: [0, 6, 13, 21],
    guards: [0, 2, 3],
    weaves: [2, 14, 22],
    rockGates: [1, 9, 17],
    wideRocks: [4, 7, 18, 23],
  }),
  // Beyond the summit: ten bonus levels for those who really want to. No lamps,
  // no presents, just gates and rock, and a rock in every stretch that has
  // nothing else in it.
  design("Black run", "Beyond the summit. No lamps, no presents, just rock. Every gate, no excuses.", {
    baseWidth: 5.4, speed: 38, turnAngle: 0.96, pickupRadius: 1.8, detour: 5.6, lampFraction: 0.45,
    presents: false, fillRocks: true, goalFraction: 0.9, parFactor: 1.2,
    gates: [[-4, 60], [5, 42], [-6, 40], [7, 40], [-8, 40], [9, 45], [-5, 38], [4, 38], [-7, 40], [8, 40], [-9.5, 42], [9.5, 42], [-4, 38], [5, 38], [-6, 38], [7, 40], [-8, 40], [9, 45], [-5, 38], [6, 38], [-7, 40], [8, 40], [-9.5, 42], [9.5, 42]],
    lamps: [],
    weaves: [4, 16],
    rockGates: [1, 7, 13, 19],
  }),
  design("Rock garden", "Weave after weave. Read three rocks ahead or eat snow.", {
    baseWidth: 5.3, speed: 38.5, turnAngle: 0.96, pickupRadius: 1.8, detour: 5.6, lampFraction: 0.45,
    presents: false, fillRocks: true, goalFraction: 0.9, parFactor: 1.2,
    gates: [[3, 60], [-6, 42], [6, 44], [-7, 44], [6, 44], [-5, 44], [7, 44], [-8, 40], [8, 40], [-6, 44], [5, 44], [-7, 44], [8, 44], [-9, 40], [9, 40], [-6, 44], [6, 44], [-7, 44], [7, 44], [-5, 40], [9.5, 42], [-9.5, 42], [6, 40], [-7, 40]],
    lamps: [],
    weaves: [1, 3, 5, 9, 11, 15, 17],
    rockGates: [7, 13, 19],
  }),
  design("The chute", "Funnels that close to nothing, with flicks between. Precision at speed.", {
    baseWidth: 5.2, speed: 39, turnAngle: 0.96, pickupRadius: 1.8, detour: 5.6, lampFraction: 0.45,
    presents: false, fillRocks: true, goalFraction: 0.92, parFactor: 1.2,
    gates: [[-4, 60], [5, 42], [-5, 40, 0.95], [4.5, 38, 0.9], [-4, 36, 0.88], [6, 42], [-6, 40, 0.95], [5.5, 38, 0.9], [-5, 36, 0.88], [7, 44], [-3, 30], [3.5, 30], [-3, 30], [6, 42], [-6, 40, 0.95], [5.5, 38, 0.9], [-5, 36, 0.88], [7, 44], [-9.5, 42], [9.5, 42], [-3, 30], [3.5, 30], [-3, 30], [6, 42], [-7, 42], [7, 42]],
    lamps: [],
    weaves: [8, 16],
    rockGates: [4, 12, 24],
  }),
  design("Knife edge", "Hairpin after hairpin at full tilt, rocks on every way in.", {
    baseWidth: 5.1, speed: 39.5, turnAngle: 0.96, pickupRadius: 1.8, detour: 5.6, lampFraction: 0.45,
    presents: false, fillRocks: true, goalFraction: 0.92, parFactor: 1.2,
    gates: [[-9, 60], [9.5, 42], [-9.5, 42], [5, 40], [-9.5, 42], [9.5, 42], [-4, 40], [9, 45], [-9.5, 42], [4.5, 40], [-9, 42], [9.5, 42], [-5, 40], [9.5, 42], [-9.5, 42], [4, 40], [-9.5, 42], [9.5, 42], [-5, 40], [9, 45], [-9.5, 42], [5, 40], [-9.5, 42], [9.5, 42], [-4, 40], [8, 42]],
    lamps: [],
    weaves: [6, 18],
    rockGates: [3, 9, 15, 21],
  }),
  design("Couloir", "Twenty-eight gates of flicks, each pair ending in rock.", {
    baseWidth: 5, speed: 40, turnAngle: 0.96, pickupRadius: 1.8, detour: 5.6, lampFraction: 0.45,
    presents: false, fillRocks: true, goalFraction: 0.94, parFactor: 1.2,
    gates: [[-3, 60], [3.5, 40], [-3.5, 40], [3, 30], [-3, 30], [3, 30], [-3, 30], [7, 44], [-7, 44], [3, 30], [-3, 30], [3, 30], [-3, 30], [8, 44], [-8, 44], [3.5, 30], [-3, 30], [3.5, 30], [-3, 30], [7, 44], [-7, 44], [3, 30], [-3, 30], [3, 30], [-3, 30], [9, 44], [-9, 44], [6, 40]],
    lamps: [],
    weaves: [6, 12, 18, 24],
    rockGates: [7, 13, 19, 25],
  }),
  design("Icefall", "Staircases with a rock on every step, then the drop.", {
    baseWidth: 5, speed: 40.5, turnAngle: 0.96, pickupRadius: 1.8, detour: 5.6, lampFraction: 0.45,
    presents: false, fillRocks: true, goalFraction: 0.94, parFactor: 1.2,
    gates: [[-9, 60], [-5, 40], [-1, 40], [3, 40], [7, 40], [-6, 44], [6, 44], [2, 40], [-2, 40], [-6, 40], [-9, 40], [9, 44], [-9, 44], [-5, 40], [-1, 40], [3, 40], [7, 40], [-7, 44], [7, 44], [3, 40], [-1, 40], [-5, 40], [-9, 40], [9.5, 44], [-9.5, 44], [5, 40], [-6, 40], [7, 40]],
    lamps: [],
    lineRocks: [0, 1, 2, 3, 6, 7, 8, 9, 12, 13, 14, 15, 18, 19, 20, 21],
    weaves: [5, 11, 17, 23],
    rockGates: [4, 10, 16, 22],
  }),
  design("Vertigo", "Hairpins into chicanes into hairpins. Never a straight metre.", {
    baseWidth: 4.9, speed: 41, turnAngle: 0.96, pickupRadius: 1.8, detour: 5.6, lampFraction: 0.45,
    presents: false, fillRocks: true, goalFraction: 0.95, parFactor: 1.2,
    gates: [[-9, 60], [9.5, 42], [-9.5, 42], [3, 30], [-3, 30], [3, 30], [-9, 42], [9.5, 42], [-9.5, 42], [3, 30], [-3, 30], [3, 30], [-9, 42], [9.5, 44], [-9.5, 44], [3, 30], [-3, 30], [3, 30], [-9, 42], [9.5, 44], [-9.5, 44], [3, 30], [-3, 30], [3, 30], [-9, 42], [9.5, 44], [-9.5, 44], [5, 40]],
    lamps: [],
    weaves: [12, 18, 24],
    rockGates: [0, 6, 13, 19],
  }),
  design("Whiteout", "Everything the mountain has, thirty gates of it.", {
    baseWidth: 4.9, speed: 41.5, turnAngle: 0.96, pickupRadius: 1.8, detour: 5.6, lampFraction: 0.45,
    presents: false, fillRocks: true, goalFraction: 0.95, parFactor: 1.2,
    gates: [[-4, 60], [6, 40], [-7, 40], [8, 40], [-9, 42], [9.5, 42], [-5, 38], [4, 38], [-3, 30], [3, 30], [-3, 30], [7, 44], [-8, 44], [3, 40], [-1, 40], [-5, 40], [-9, 40], [9.5, 44], [-9.5, 44], [5, 40], [-6, 40, 0.95], [5, 38, 0.9], [-4.5, 36, 0.88], [7, 44], [-7, 44], [3, 30], [-3, 30], [3, 30], [-8, 42], [8, 42]],
    lamps: [],
    lineRocks: [13, 14, 15],
    weaves: [10, 16, 22],
    rockGates: [3, 11, 17, 23, 28],
  }),
  design("Last light", "Tighter, faster, rockier. One tumble is one too many.", {
    baseWidth: 4.8, speed: 42, turnAngle: 0.96, pickupRadius: 1.8, detour: 5.6, lampFraction: 0.45,
    presents: false, fillRocks: true, goalFraction: 0.96, parFactor: 1.2,
    gates: [[3, 60], [-6, 40], [7, 40], [-8, 40], [9, 40], [-9.5, 42], [9.5, 42], [-4, 38], [4.5, 38], [-5, 38], [5.5, 38], [-3, 30], [3, 30], [-3, 30], [8, 44], [-8, 44], [4, 40], [-4, 40], [-8, 40], [9, 44], [-9, 44], [5, 40], [-5.5, 40, 0.95], [5, 38, 0.92], [-4.5, 36, 0.9], [8, 44], [-8, 44], [3, 30], [-3, 30], [7, 42]],
    lamps: [],
    lineRocks: [17],
    weaves: [13, 18, 24, 25],
    rockGates: [1, 3, 6, 8, 15, 20, 28],
  }),
  design("Beyond the summit", "The last word. Thirty gates, every trick, nothing to spare.", {
    baseWidth: 4.7, speed: 42.5, turnAngle: 0.96, pickupRadius: 1.8, detour: 5.6, lampFraction: 0.45,
    presents: false, fillRocks: true, goalFraction: 0.97, parFactor: 1.2,
    gates: [[-4, 60], [6, 40], [-8, 40], [9.5, 42], [-9.5, 42], [4, 38], [-5, 38], [3, 30], [-3, 30], [3, 30], [-8, 44], [8, 44], [-4, 40], [0, 40], [4, 40], [8, 40], [-9, 44], [9.5, 44], [-9.5, 44], [5, 40], [-6, 40, 0.95], [5, 38, 0.92], [-4.5, 36, 0.9], [8, 44], [-8, 44], [3, 30], [-3, 30], [3, 30], [-9, 42], [9, 42]],
    lamps: [],
    lineRocks: [12, 13, 14],
    weaves: [9, 15, 22],
    rockGates: [2, 10, 16, 23, 28],
  }),
];
export const levelSettings = (level: number) =>
  LEVEL_DESIGNS[Math.max(0, Math.min(LEVEL_COUNT - 1, level))];

/**
 * How far sideways a skier can move over a forward distance from a straight
 * heading with full input, using the same steering dynamics as the run.
 */
export function lateralReach(distance: number, speed: number, turnAngle: number) {
  let heading = 0,
    x = 0,
    z = 0;
  const dt = 1 / 60;
  while (z < distance) {
    heading += (turnAngle - heading) * (1 - Math.exp(-STEER_RESPONSE * dt));
    x += Math.sin(heading) * speed * dt;
    z += Math.cos(heading) * speed * dt;
  }
  return x;
}

/** Builds the fixed course for a level from its authored design. */
export function buildCourse(level: number): Course {
  const S = levelSettings(level);
  const gates: Gate[] = [];
  let z = 0;
  const quick = new Set<number>();
  for (const [i, [x, gap, widthScale = 1]] of S.gates.entries()) {
    z += gap;
    if (i > 0 && gap < 36) quick.add(i);
    gates.push({
      x,
      z,
      width: S.baseWidth * widthScale,
      color: i % 2 ? "blue" : "red",
    });
  }
  const finishZ = gates[gates.length - 1].z + 60;
  const stretches: Stretch[] = gates.map((gate, i) => {
    const next = gates[i + 1] ?? { x: 0, z: finishZ };
    const length = next.z - gate.z;
    return {
      index: i,
      length,
      lampZ: Math.round(gate.z + length * S.lampFraction),
      lineX: gate.x + (next.x - gate.x) * S.lampFraction,
      side: Math.sign(gate.x) || 1,
      swing: Math.abs(next.x - gate.x),
    };
  });
  const lampSpots: LampSpot[] = S.lamps.map((index) => {
    const s = stretches[index];
    return {
      x: Math.round((s.lineX + s.side * S.detour) * 10) / 10,
      z: s.lampZ,
      side: s.side,
      stretch: index,
    };
  });
  const hazards: Hazard[] = [];
  const rock = (x: number, zz: number, radius: number) =>
    hazards.push({ x: Math.round(x * 10) / 10, z: Math.round(zz), radius, kind: "rock" });
  for (const [i, spot] of lampSpots.entries()) {
    const s = stretches[spot.stretch];
    if (S.forkRocks) rock(s.lineX, s.lampZ, FORK_ROCK_RADIUS);
    // A guard tree narrows the lamp line without blocking the way in: on the
    // inside when the approach from the previous gate is nearly straight,
    // otherwise on the outside where an overshoot would go. Never within 12
    // metres of a gate line.
    const approach = Math.abs(gates[spot.stretch].x - spot.x);
    const treeZ = Math.max(s.lampZ - 8, gates[spot.stretch].z + 12);
    if (S.guards.includes(i) && treeZ <= s.lampZ - 3)
      hazards.push({
        x: Math.round((spot.x + (approach <= 3 ? -1 : 1) * spot.side * 3.2) * 10) / 10,
        z: treeZ,
        radius: GUARD_TREE_RADIUS,
        kind: "tree",
      });
  }
  // Rock features line up with the gate they lead into, since a skier heads
  // for the next flags as soon as the last ones are behind.
  for (const index of S.weaves) {
    const s = stretches[index],
      next = gates[index + 1];
    for (const [k, dz] of [2 * WEAVE_STEP, WEAVE_STEP, 0].entries())
      rock(next.x + (k % 2 ? -1 : 1) * WEAVE_OFFSET * s.side, next.z - FEATURE_LEAD - dz, WIDE_ROCK_RADIUS);
  }
  for (const index of S.rockGates) {
    const next = gates[index + 1];
    for (const side of [-1, 1]) rock(next.x + side * ROCK_GATE_HALF, next.z - FEATURE_LEAD, WIDE_ROCK_RADIUS);
  }
  for (const index of S.wideRocks) {
    const s = stretches[index];
    rock(s.lineX + s.side * S.detour, s.lampZ, WIDE_ROCK_RADIUS);
  }
  for (const index of S.lineRocks) {
    const gate = gates[index],
      next = gates[index + 1] ?? { x: 0, z: finishZ };
    rock((gate.x + next.x) / 2, (gate.z + next.z) / 2, FORK_ROCK_RADIUS);
  }
  if (S.fillRocks) {
    const used = new Set([...S.lamps, ...S.weaves, ...S.rockGates, ...S.wideRocks, ...S.lineRocks]);
    for (const s of stretches)
      if (!used.has(s.index) && s.index < stretches.length - 1 && s.length >= 30)
        rock(s.lineX + s.side * S.detour, s.lampZ, WIDE_ROCK_RADIUS);
  }
  hazards.sort((a, b) => a.z - b.z);
  const maxGateScore = gates.reduce((sum, _, i) => sum + 100 * Math.min(8, i + 1), 0);
  const lamps = levelLamps(level);
  const speed = Math.round(S.speed * SPEED_SCALE * 10) / 10;
  const parTime = Math.round((finishZ / speed) * S.parFactor + 2);
  const goal = Math.round((S.goalFraction * maxGateScore) / 50) * 50;
  void quick;
  return {
    level,
    name: S.name,
    hint: S.hint,
    presents: S.presents,
    lampId: lamps.finish,
    pickupLampIds: lamps.pickups.slice(0, lampSpots.length),
    gates,
    finishZ,
    stretches,
    lampSpots,
    hazards,
    speed,
    turnAngle: S.turnAngle,
    pickupRadius: S.pickupRadius,
    parTime,
    timeBonusRate: S.timeBonusRate,
    maxGateScore,
    goal,
  };
}
/** A short signature of a level's layout; a ghost recorded on a different layout is discarded. */
export const courseFingerprint = (course: Course) =>
  `${course.gates.map((g) => `${g.x}:${g.z}:${Math.round(g.width * 10)}`).join(",")}|${course.finishZ}|${course.hazards.length}`;
/** The most rocks and trees any level places, so renderers can pool enough models. */
export function hazardPoolSizes() {
  let rocks = 0,
    trees = 0;
  for (let level = 0; level < LEVEL_COUNT; level++) {
    const hazards = getCourse(level).hazards;
    rocks = Math.max(rocks, hazards.filter((h) => h.kind === "rock").length);
    trees = Math.max(trees, hazards.filter((h) => h.kind === "tree").length);
  }
  return { rocks, trees };
}
const cache = new Map<number, Course>();
export function getCourse(level: number) {
  const key = Math.max(0, Math.min(LEVEL_COUNT - 1, Math.floor(level)));
  let course = cache.get(key);
  if (!course) {
    course = buildCourse(key);
    cache.set(key, course);
  }
  return course;
}
