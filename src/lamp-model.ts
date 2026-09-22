import * as THREE from "three";
import { box, sphere, shape, material, rod } from "./geometry";
import { LAMP_CATALOG } from "./lamp-catalog";
import { LAMP_BLUEPRINTS } from "./lamp-designs";

const cache = new Map<number, THREE.Group>();
const worldX = (x: number) => (x - 40) / 40;
const worldY = (y: number) => (78 - y) / 40;

/** Individually composed sculptures; run clones share cached geometry and materials. */
export function lampModel(id: number) {
  if (!cache.has(id)) {
    const design = LAMP_CATALOG[id];
    const group = new THREE.Group();
    group.name = design.name;
    const materials = {
      body: material(design.color),
      accent: material(design.accent),
      metal: material(design.trim),
      light: new THREE.MeshBasicMaterial({ color: design.accent, toneMapped: false }),
    };
    LAMP_BLUEPRINTS[id].parts.forEach((part, index) => {
      const mat = materials[part.tone];
      // Later details sit toward the downhill camera, avoiding coplanar surfaces.
      const z = -index * 0.012;
      if (part.kind === "ellipse") {
        shape(group, sphere, mat,
          [worldX(part.x), worldY(part.y), z],
          [part.rx / 40, part.ry / 40, Math.min(part.rx, part.ry * 2) / 40]);
      } else if (part.kind === "rect") {
        shape(group, box, mat,
          [worldX(part.x + part.w / 2), worldY(part.y + part.h / 2), z],
          [part.w / 40, part.h / 40, 0.18]);
      } else if (part.kind === "line") {
        const points = [];
        for (let i = 0; i < part.points.length; i += 2)
          points.push(new THREE.Vector3(worldX(part.points[i]), worldY(part.points[i + 1]), z));
        for (let i = 1; i < points.length; i++)
          rod(group, points[i - 1], points[i], part.stroke / 80, mat);
        for (const point of points)
          shape(group, sphere, mat, point.toArray(), Array(3).fill(part.stroke / 80));
      } else if (part.kind === "ring") {
        const points = Array.from({ length: 49 }, (_, i) => {
          const angle = i * Math.PI / 24;
          return new THREE.Vector3(worldX(part.x + Math.cos(angle) * part.rx), worldY(part.y + Math.sin(angle) * part.ry), z);
        });
        const curve = new THREE.CatmullRomCurve3(points.slice(0, -1), true);
        group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, part.stroke / 80, 6, true), mat));
      } else {
        const outline = new THREE.Shape();
        outline.moveTo(worldX(part.points[0]), worldY(part.points[1]));
        for (let i = 2; i < part.points.length; i += 2)
          outline.lineTo(worldX(part.points[i]), worldY(part.points[i + 1]));
        outline.closePath();
        const geometry = new THREE.ExtrudeGeometry(outline, {
          depth: 0.22, bevelEnabled: true, bevelSegments: 2,
          steps: 1, bevelSize: 0.018, bevelThickness: 0.018,
        });
        geometry.translate(0, 0, z - 0.11);
        group.add(new THREE.Mesh(geometry, mat));
      }
    });
    cache.set(id, group);
  }
  const wrapper = new THREE.Group();
  wrapper.name = "lamp";
  wrapper.add(cache.get(id)!.clone());
  return wrapper;
}
