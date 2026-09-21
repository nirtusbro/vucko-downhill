import type { DifficultyId } from "./difficulty";
const PREFIX = "vucko-downhill:";
export function readValue(key: string, fallback: string) {
  try {
    return localStorage.getItem(PREFIX + key) ?? fallback;
  } catch {
    return fallback;
  }
}
export function writeValue(key: string, value: string) {
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {
    /* Private mode and full storage leave the game playable. */
  }
}
export function readBest(difficulty: DifficultyId = "classic") {
  const fallback = difficulty === "classic" ? readValue("best", "0") : "0";
  const best = Number(readValue(`best:${difficulty}`, fallback));
  return Number.isFinite(best) && best > 0 ? Math.floor(best) : 0;
}
