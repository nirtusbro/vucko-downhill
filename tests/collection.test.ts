import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LampCollection } from "../src/collection";

describe("Ljubica's saved lamp shelf", () => {
  let data: Map<string, string>;
  beforeEach(() => {
    data = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  it("starts empty and saves every pickup by its matching design", () => {
    const shelf = new LampCollection();
    expect(shelf.counts).toEqual([0, 0, 0, 0]);
    for (const index of [0, 4, 9, 14, 19]) shelf.add(index);
    expect(shelf.counts).toEqual([2, 1, 1, 1]);
    expect(new LampCollection().counts).toEqual([2, 1, 1, 1]);
  });
  it("retains pickups between runs and reloads, including repeat designs", () => {
    new LampCollection().add(2);
    const nextRun = new LampCollection();
    nextRun.add(2);
    expect(new LampCollection().counts).toEqual([0, 0, 2, 0]);
  });
  it("ignores invalid saved data and invalid pickup indices", () => {
    for (const invalid of [
      "broken",
      "null",
      "{}",
      "[1,2]",
      '[3,-2,"5",null]',
    ]) {
      data.set("vucko-downhill:lamp-collection", invalid);
      const shelf = new LampCollection();
      expect(shelf.counts).toEqual([0, 0, 0, 0]);
      shelf.add(-1);
      shelf.add(NaN);
      expect(shelf.counts).toEqual([0, 0, 0, 0]);
    }
  });
  it("keeps a session collection when browser storage is unavailable", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
    });
    const shelf = new LampCollection();
    shelf.add(3);
    shelf.add(7);
    expect(shelf.counts).toEqual([0, 0, 0, 2]);
  });
});
