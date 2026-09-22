import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { LAMP_BLUEPRINTS } from "../src/lamp-designs";
import { LAMP_CATALOG } from "../src/lamp-catalog";
import { lampArt } from "../src/lamp-art";
import { lampModel } from "../src/lamp-model";
import * as THREE from "three";

describe("individually designed lamps", () => {
  it("gives every stable catalogue ID its own named structural blueprint", () => {
    expect(LAMP_BLUEPRINTS).toHaveLength(100);
    expect(new Set(LAMP_BLUEPRINTS.map((design) => design.name)).size).toBe(100);
    expect(new Set(LAMP_BLUEPRINTS.map((design) => JSON.stringify(design.parts))).size).toBe(100);
    LAMP_CATALOG.forEach((lamp, id) => {
      expect(lamp.id).toBe(id);
      expect(lamp.name).toBe(LAMP_BLUEPRINTS[id].name);
    });
    expect(LAMP_CATALOG.slice(0,4).map((lamp)=>lamp.name)).toEqual(["Rose mushroom", "Lavender pleats", "Emerald banker", "Blue porcelain"]);
  });
  it("renders 100 distinct silhouettes even with all colours removed", async () => {
    const masks = await Promise.all(LAMP_CATALOG.map(async (lamp) => {
      const svg = lampArt({...lamp, color:"#000000", accent:"#000000", trim:"#000000"});
      const pixels = await sharp(Buffer.from(svg)).resize(80,88).ensureAlpha().raw().toBuffer();
      return Array.from({length:80*88}, (_,i)=>pixels[i*4+3]>128?1:0);
    }));
    expect(new Set(masks.map((mask)=>mask.join(""))).size).toBe(100);
    // Catch near-identical recolours or designs distinguished only by tiny ornaments.
    for (let a=0;a<100;a++) for (let b=a+1;b<100;b++) {
      let different=0, union=0;
      for (let i=0;i<masks[a].length;i++) {
        if(masks[a][i]||masks[b][i]) union++;
        if(masks[a][i]!==masks[b][i]) different++;
      }
      expect(different/union, `lamps ${a+1} and ${b+1} look too similar`).toBeGreaterThan(0.08);
    }
  });
  it("builds a bounded 3D model for every design and reuses model resources", () => {
    for (const lamp of LAMP_CATALOG) {
      const model = lampModel(lamp.id);
      const bounds = new THREE.Box3().setFromObject(model);
      expect(bounds.isEmpty()).toBe(false);
      expect(bounds.max.y).toBeLessThan(2.3);
      expect(bounds.min.y).toBeGreaterThan(-0.1);
      const again = lampModel(lamp.id);
      expect(again).not.toBe(model);
      expect((again.children[0].children[0] as THREE.Mesh).geometry).toBe((model.children[0].children[0] as THREE.Mesh).geometry);
    }
  });
});
