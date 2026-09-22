import type { DifficultyId } from "./difficulty";
import type { Run } from "./physics";
import { readValue, writeValue } from "./storage";

export const GHOST_STEP = 0.1;
/** Flat [x, z, x, z, ...] samples taken every GHOST_STEP seconds of run time. */
export type Trace = number[];

/** Appends a sample whenever the run has reached the next sampling instant. */
export function recordSample(trace: Trace, run: Pick<Run, "x" | "z" | "time">) {
  while (run.time >= (trace.length / 2) * GHOST_STEP - 1e-9)
    trace.push(run.x, run.z);
}
/** Where the ghost is at a run time, interpolated between samples. */
export function ghostPose(trace: Trace, time: number) {
  const count = trace.length / 2;
  if (count < 2) return null;
  const f = Math.min(Math.max(time / GHOST_STEP, 0), count - 1);
  const i = Math.min(Math.floor(f), count - 2),
    t = f - i;
  const x0 = trace[i * 2],
    z0 = trace[i * 2 + 1],
    x1 = trace[i * 2 + 2],
    z1 = trace[i * 2 + 3];
  return {
    x: x0 + (x1 - x0) * t,
    z: z0 + (z1 - z0) * t,
    heading: Math.atan2(x1 - x0, Math.max(0.001, z1 - z0)),
    finished: time >= (count - 1) * GHOST_STEP,
  };
}
/** Seconds behind (positive) or ahead of (negative) the ghost at the run's distance. */
export function paceDelta(trace: Trace, run: Pick<Run, "z" | "time">) {
  const count = trace.length / 2;
  if (count < 2) return 0;
  let lo = 0,
    hi = count - 1;
  if (trace[hi * 2 + 1] <= run.z) return run.time - hi * GHOST_STEP;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (trace[mid * 2 + 1] >= run.z) hi = mid;
    else lo = mid + 1;
  }
  let ghostTime = lo * GHOST_STEP;
  if (lo > 0) {
    const z0 = trace[(lo - 1) * 2 + 1],
      z1 = trace[lo * 2 + 1];
    const t = z1 > z0 ? (run.z - z0) / (z1 - z0) : 0;
    ghostTime = (lo - 1 + t) * GHOST_STEP;
  }
  return run.time - ghostTime;
}
export function loadGhost(difficulty: DifficultyId): Trace | null {
  try {
    const parsed: unknown = JSON.parse(readValue(`ghost:${difficulty}`, "null"));
    if (
      Array.isArray(parsed) &&
      parsed.length >= 4 &&
      parsed.length % 2 === 0 &&
      parsed.every((n) => typeof n === "number" && Number.isFinite(n))
    )
      return parsed as Trace;
  } catch {
    /* A damaged ghost simply does not race. */
  }
  return null;
}
export function saveGhost(difficulty: DifficultyId, trace: Trace) {
  writeValue(
    `ghost:${difficulty}`,
    JSON.stringify(trace.map((n) => Math.round(n * 10) / 10)),
  );
}
