import { describe, expect, it } from "vitest";
import { LAMP_CATALOG, lampPoints } from "../src/lamp-catalog";
import { levelLamps } from "../src/levels";
describe("100-lamp catalogue", () => {
  it("has 100 unique designs and names across five rarities", () => {
    expect(LAMP_CATALOG).toHaveLength(100);
    expect(new Set(LAMP_CATALOG.map((lamp) => lamp.name)).size).toBe(100);
    expect(new Set(LAMP_CATALOG.map((lamp) => lamp.rarity)).size).toBe(5);
    LAMP_CATALOG.forEach((lamp, id) => expect(lamp.id).toBe(id));
    expect(
      new Set(LAMP_CATALOG.map((lamp) => `${lamp.family}:${lamp.variant}`))
        .size,
    ).toBe(100);
  });
  it("ties five lamps to each level, climbing from Common to Legendary", () => {
    expect(levelLamps(0)).toEqual({ pickups: [0, 1, 2, 3], finish: 4 });
    expect(levelLamps(19)).toEqual({ pickups: [95, 96, 97, 98], finish: 99 });
    expect(LAMP_CATALOG[levelLamps(0).finish].rarity).toBe("Common");
    expect(LAMP_CATALOG[levelLamps(19).finish].rarity).toBe("Legendary");
    expect(lampPoints(99)).toBeGreaterThan(lampPoints(0));
  });
});
