import { describe, expect, it } from "vitest";
import { LAMP_CATALOG, rollLamps } from "../src/lamp-catalog";
import { createRun } from "../src/physics";
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
  it("rolls 20 distinct lamps reproducibly, changing between runs", () => {
    const lamps = rollLamps(42);
    expect(lamps).toHaveLength(20);
    expect(new Set(lamps).size).toBe(20);
    expect(lamps).toEqual(rollLamps(42));
    expect(lamps).not.toEqual(rollLamps(43));
    expect(createRun("classic", 42).lampIds).toEqual(lamps);
  });
  it("makes all 100 obtainable while keeping legendary lamps rarer", () => {
    const counts = Array(100).fill(0);
    for (let seed = 1; seed <= 1000; seed++)
      for (const id of rollLamps(seed)) counts[id]++;
    expect(counts.every((count) => count > 0)).toBe(true);
    expect(counts.slice(0, 40).reduce((a, b) => a + b) / 40).toBeGreaterThan(
      counts[99] * 2,
    );
  });
  it("favors missing designs", () => {
    const owned = Array(100).fill(1);
    owned[8] = 0;
    let favored = 0,
      baseline = 0;
    for (let seed = 1; seed <= 500; seed++) {
      if (rollLamps(seed, owned).includes(8)) favored++;
      if (rollLamps(seed).includes(8)) baseline++;
    }
    expect(favored).toBeGreaterThan(baseline * 1.3);
  });
});
