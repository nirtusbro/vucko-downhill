export type DifficultyId = "easy" | "classic" | "expert";

export const DIFFICULTIES = {
  easy: {
    label: "Easy",
    description: "Brisk skiing, forgiving gates, few rocks",
    speed: 24,
    turnAngle: 0.78,
    gateScale: 1.35,
    pickupRadius: 2.3,
    hazardChance: 0.25,
    steerResponse: 4.4,
    detourScale: 1.1,
  },
  classic: {
    label: "Classic",
    description: "Fast turns, find your rhythm",
    speed: 30,
    turnAngle: 0.9,
    gateScale: 1,
    pickupRadius: 1.9,
    hazardChance: 0.5,
    steerResponse: 4.4,
    detourScale: 1,
  },
  expert: {
    label: "Expert",
    description: "Full speed, tight gates, rocky slope",
    speed: 36,
    turnAngle: 0.96,
    gateScale: 0.72,
    pickupRadius: 1.55,
    hazardChance: 0.75,
    steerResponse: 4.4,
    detourScale: 0.7,
  },
} as const;

export function parseDifficulty(value: string): DifficultyId {
  return value === "easy" || value === "expert" ? value : "classic";
}
export function gateWidth(base: number, difficulty: DifficultyId) {
  return base * DIFFICULTIES[difficulty].gateScale;
}
