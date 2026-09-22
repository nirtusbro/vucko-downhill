export type DifficultyId = "easy" | "classic" | "expert";

export const DIFFICULTIES = {
  easy: {
    label: "Easy",
    description: "Brisk skiing, forgiving gates",
    speed: 24,
    turnAngle: 0.78,
    gateScale: 1.35,
    pickupRadius: 2.3,
  },
  classic: {
    label: "Classic",
    description: "Fast turns, find your rhythm",
    speed: 30,
    turnAngle: 0.9,
    gateScale: 1,
    pickupRadius: 1.9,
  },
  expert: {
    label: "Expert",
    description: "Full speed, precision carving",
    speed: 36,
    turnAngle: 0.96,
    gateScale: 0.68,
    pickupRadius: 1.55,
  },
} as const;

export function parseDifficulty(value: string): DifficultyId {
  return value === "easy" || value === "expert" ? value : "classic";
}
export function gateWidth(base: number, difficulty: DifficultyId) {
  return base * DIFFICULTIES[difficulty].gateScale;
}
