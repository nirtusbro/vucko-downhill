import { DIFFICULTIES, gateWidth, type DifficultyId } from "./difficulty";

export interface Run {
  difficulty: DifficultyId;
  x: number;
  z: number;
  speed: number;
  heading: number;
  time: number;
  nextGate: number;
  hits: number;
  combo: number;
  score: number;
  lamps: number;
  collectedLamps: boolean[];
  lampEvent: number;
  crashTime: number;
  invincible: number;
  finished: boolean;
  event: string;
}
const lines = [
  -4, 5, -6, 6, -4, 7, -7, 5, -6, 7, -5, 6, -4, 4, -6, 5, -7, 6, -4, 3,
];
export const GATES = lines.map((x, i) => ({
  x,
  z: 65 + i * 65,
  width: i < 4 ? 10 : 8.5,
  color: i % 2 ? "blue" : "red",
}));
export const FINISH_Z = 1410;
// Optional detours halfway through each open stretch, clear of the gate line.
export const LAMPS = GATES.map((gate, i) => {
  const next = GATES[i + 1] ?? { x: 0, z: FINISH_Z };
  return {
    x: (gate.x + next.x) / 2 + Math.sign(gate.x) * 3,
    z: (gate.z + next.z) / 2,
  };
});
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
export function createRun(difficulty: DifficultyId = "classic"): Run {
  return {
    difficulty,
    x: 0,
    z: 0,
    speed: 6,
    heading: 0,
    time: 0,
    nextGate: 0,
    hits: 0,
    combo: 0,
    score: 0,
    lamps: 0,
    collectedLamps: LAMPS.map(() => false),
    lampEvent: -1,
    crashTime: 0,
    invincible: 0,
    finished: false,
    event: "",
  };
}
export function stepRun(s: Run, input: number, dt: number) {
  s.event = "";
  s.lampEvent = -1;
  if (s.finished || dt <= 0) return;
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
    s.heading +=
      (clamp(input, -1, 1) * settings.turnAngle - s.heading) *
      (1 - Math.exp(-4.4 * dt));
    const targetSpeed =
      settings.speed - Math.abs(s.heading) * 6 + Math.sin(s.z * 0.015) * 0.8;
    s.speed += (targetSpeed - s.speed) * (1 - Math.exp(-0.8 * dt));
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
      OBSTACLES.some(
        (o) =>
          Math.abs(o.z - s.z) < o.radius + 0.6 &&
          Math.hypot(o.x - s.x, o.z - s.z) < o.radius + 0.65,
      ))
  ) {
    s.crashTime = 1.1;
    s.combo = 0;
    s.event = "crash";
  }
  if (s.crashTime === 0) {
    const dx = s.x - oldX,
      dz = s.z - oldZ,
      lengthSquared = dx * dx + dz * dz;
    for (let i = 0; i < LAMPS.length; i++) {
      const lamp = LAMPS[i];
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
        s.score += 50;
        s.lampEvent = i;
      }
    }
  }
  while (s.nextGate < GATES.length && s.z >= GATES[s.nextGate].z) {
    const gate = GATES[s.nextGate];
    const t = clamp((gate.z - oldZ) / Math.max(0.001, s.z - oldZ), 0, 1);
    const crossingX = oldX + (s.x - oldX) * t;
    if (
      Math.abs(crossingX - gate.x) <= gateWidth(gate.width, s.difficulty) / 2 &&
      s.crashTime === 0
    ) {
      s.hits++;
      s.combo = Math.min(4, s.combo + 1);
      s.score += 100 * s.combo;
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
    s.event = "finish";
  }
}
