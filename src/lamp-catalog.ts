import { LAMP_BLUEPRINTS } from "./lamp-designs";
export const RARITIES = [
  "Common",
  "Uncommon",
  "Rare",
  "Epic",
  "Legendary",
] as const;
export type Rarity = (typeof RARITIES)[number];
export interface LampDesign {
  id: number;
  name: string;
  family: number;
  variant: number;
  rarity: Rarity;
  color: string;
  accent: string;
  trim: string;
  height: number;
  width: number;
}
const colors = [
  "#df979c",
  "#e8b557",
  "#78b7d2",
  "#78a78c",
  "#747bba",
  "#cc6e7b",
  "#49a5a3",
  "#dbc4df",
  "#cda9ee",
  "#edce82",
];
const accents = [
  "#fff0d4",
  "#fff1b3",
  "#d9f2f2",
  "#dfebca",
  "#dedcf8",
  "#f4d5c7",
  "#d4efe5",
  "#fff5e9",
  "#c9f0ed",
  "#fff8dd",
];
export const LAMP_CATALOG: LampDesign[] = Array.from(
  { length: 100 },
  (_, id) => {
    const family = id % 10,
      variant = Math.floor(id / 10);
    return {
      id,
      family,
      variant,
      name: LAMP_BLUEPRINTS[id].name,
      rarity:
        id < 40
          ? "Common"
          : id < 70
            ? "Uncommon"
            : id < 90
              ? "Rare"
              : id < 98
                ? "Epic"
                : "Legendary",
      color:
        id < 4
          ? ["#df979c", "#ac99c9", "#6aa48e", "#8cb2c9"][id]
          : colors[variant],
      accent: accents[variant],
      trim:
        variant % 3 === 1
          ? "#a7804d"
          : variant % 3 === 2
            ? "#a8bec9"
            : "#d2ae6d",
      height: 0.9 + (variant % 4) * 0.07,
      width: 0.87 + ((variant * 3) % 5) * 0.065,
    };
  },
);

