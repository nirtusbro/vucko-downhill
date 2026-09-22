import type { Run } from "./physics";

export const PRESENT_POINTS = 200;
export const PRESENT_FALL_TIME = 1.8;
export const PRESENT_POOL_SIZE = 2;
// A handful of surprises per run: the first after a few seconds, then well spaced.
export const PRESENT_FIRST_DROP = 5.5;
export const PRESENT_MIN_GAP = 9;
export const PRESENT_GAP_SPREAD = 5;
export interface Present {
  phase: "inactive" | "falling" | "landed" | "collected";
  x: number;
  z: number;
  age: number;
}
export function createPresents(seed: number) {
  return {
    seed: seed >>> 0,
    nextDrop: PRESENT_FIRST_DROP,
    collected: 0,
    event: false,
    items: Array.from({ length: PRESENT_POOL_SIZE }, (): Present => ({
      phase: "inactive",
      x: 0,
      z: 0,
      age: 0,
    })),
  };
}
// A run owns its random stream so rendering/frame rate cannot change its drops.
function random(state: ReturnType<typeof createPresents>) {
  state.seed = (Math.imul(1664525, state.seed) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}
export function stepPresents(
  run: Run,
  oldX: number,
  oldZ: number,
  dt: number,
  gates: readonly { z: number }[],
  finishZ: number,
) {
  const state = run.presents;
  for (const gift of state.items) {
    if (gift.phase === "inactive") continue;
    gift.age += dt;
    if (gift.phase === "falling" && gift.age >= PRESENT_FALL_TIME) {
      gift.phase = "landed";
      gift.age = 0;
    }
    if (gift.phase === "landed" && run.crashTime === 0) {
      const dx = run.x - oldX,
        dz = run.z - oldZ;
      const t = Math.max(
        0,
        Math.min(
          1,
          ((gift.x - oldX) * dx + (gift.z - oldZ) * dz) /
            (dx * dx + dz * dz || 1),
        ),
      );
      if (Math.hypot(gift.x - oldX - t * dx, gift.z - oldZ - t * dz) < 2.3) {
        gift.phase = "collected";
        gift.age = 0;
        state.collected++;
        state.event = true;
        run.score += PRESENT_POINTS;
      }
    }
    if (
      gift.z < run.z - 15 ||
      (gift.phase === "landed" && gift.age > 12) ||
      (gift.phase === "collected" && gift.age > 0.5)
    )
      gift.phase = "inactive";
  }
  if (run.time < state.nextDrop) return;
  state.nextDrop =
    run.time + PRESENT_MIN_GAP + random(state) * PRESENT_GAP_SPREAD;
  const slot = state.items.find((gift) => gift.phase === "inactive");
  if (!slot) return;
  let z = run.z + Math.max(85, run.speed * (3.2 + random(state) * 0.5));
  for (const gate of gates) if (Math.abs(z - gate.z) < 12) z = gate.z + 12;
  if (z > finishZ - 18) return;
  Object.assign(slot, {
    phase: "falling",
    x: random(state) * 22 - 11,
    z,
    age: 0,
  });
}
