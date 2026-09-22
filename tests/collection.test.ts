import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LampCollection } from "../src/collection";
describe("saved 100-lamp collection", () => {
  let data: Map<string, string>;
  beforeEach(() => {
    data = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  it("stores unique IDs and distinguishes first discoveries from repeats", () => {
    const shelf = new LampCollection();
    expect(shelf.counts).toHaveLength(100);
    expect(shelf.add(99)).toBe(true);
    expect(shelf.add(99)).toBe(false);
    shelf.add(48);
    const reloaded = new LampCollection();
    expect(reloaded.counts[99]).toBe(2);
    expect(reloaded.counts[48]).toBe(1);
    expect(reloaded.discovered).toBe(2);
  });
  it("migrates the four original lamps exactly once without losing counts", () => {
    data.set("vucko-downhill:lamp-collection", "[10,7,6,6]");
    const shelf = new LampCollection();
    expect(shelf.counts.slice(0, 4)).toEqual([10, 7, 6, 6]);
    expect(shelf.discovered).toBe(4);
    shelf.add(4);
    expect(new LampCollection().counts[4]).toBe(1);
    expect(new LampCollection().counts[0]).toBe(10);
  });
  it("ignores damaged saves and invalid lamp IDs", () => {
    data.set("vucko-downhill:lamp-catalog-v1", '{"counts":[-1]}');
    const shelf = new LampCollection();
    for (const id of [-1, 100, NaN, 1.5]) expect(shelf.add(id)).toBe(false);
    expect(shelf.discovered).toBe(0);
  });
  it("keeps session pickups if browser storage is blocked", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw Error();
      },
      setItem: () => {
        throw Error();
      },
    });
    const shelf = new LampCollection();
    shelf.add(87);
    shelf.add(87);
    expect(shelf.counts[87]).toBe(2);
  });
});
