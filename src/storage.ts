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
