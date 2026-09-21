export type DifficultyId = "easy" | "classic" | "expert";

export const DIFFICULTIES = {
  easy: {
    label: "Easy",
    description: "Relaxed pace, wide gates",
    speed: 15.5,
    turnAngle: 0.78,
    gateScale: 1.35,
    pickupRadius: 2.3,
  },
  classic: {
    label: "Classic",
    description: "The original downhill feel",
    speed: 19.5,
    turnAngle: 0.9,
    gateScale: 1,
    pickupRadius: 1.9,
  },
  expert: {
    label: "Expert",
    description: "Faster skiing, tighter gates",
    speed: 23,
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
