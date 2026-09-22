import * as THREE from "three";
import { cone, cylinder, material, pebble, shape } from "./geometry";
import { snowHeight, type Hazard, type Run } from "./physics";
import { hazardPoolSizes } from "./levels";

const pine = material("#326c64"),
  snow = material("#eaf4fc"),
  wood = material("#a77f61"),
  stone = material("#8396a6");
// Pools sized for the rockiest level, so every hazard that can tumble the skier is drawn.
const { rocks: ROCK_POOL, trees: TREE_POOL } = hazardPoolSizes();

function rock() {
  const g = new THREE.Group();
  shape(g, pebble, stone, [0, 0.45, 0], [1.3, 1, 1]);
  shape(g, pebble, snow, [-0.12, 0.98, 0], [1.25, 0.46, 0.99]);
  return g;
}
function tree() {
  const g = new THREE.Group(),
    s = 0.78;
  shape(g, cylinder, wood, [0, s * 1.1, 0], [s * 0.19, s * 2.2, s * 0.19]);
  for (let level = 0; level < 3; level++) {
    const radius = (2.05 - level * 0.48) * s,
      height = (3 - level * 0.35) * s,
      y = (2.7 + level * 1.45) * s;
    shape(g, cone, pine, [0, y, 0], [radius, height, radius]);
    shape(
      g,
      cone,
      snow,
      [0, y + height * 0.155, 0],
      [radius * 0.86, height * 0.77, radius * 0.86],
    );
  }
  return g;
}
/** Pooled rocks and trees for the per-run hazards inside the course. */
export class Hazards {
  private rocks: THREE.Group[] = [];
  private trees: THREE.Group[] = [];
  private active: Hazard[] | null = null;
  constructor(scene: THREE.Scene) {
    for (let i = 0; i < ROCK_POOL + TREE_POOL; i++) {
      const g = i < ROCK_POOL ? rock() : tree();
      g.visible = false;
      scene.add(g);
      (i < ROCK_POOL ? this.rocks : this.trees).push(g);
    }
  }
  update(s: Run) {
    if (this.active !== s.course.hazards) {
      this.active = s.course.hazards;
      let rocks = 0,
        trees = 0;
      for (const g of [...this.rocks, ...this.trees]) g.userData.used = false;
      for (const hazard of s.course.hazards) {
        const g =
          hazard.kind === "rock" ? this.rocks[rocks++] : this.trees[trees++];
        if (!g) continue;
        g.position.set(hazard.x, snowHeight(hazard.z), hazard.z);
        g.rotation.y = hazard.x * 0.7 + hazard.z;
        if (hazard.kind === "rock") g.scale.setScalar(hazard.radius);
        g.userData.z = hazard.z;
        g.userData.used = true;
      }
    }
    for (const g of [...this.rocks, ...this.trees])
      g.visible =
        g.userData.used === true &&
        g.userData.z > s.z - 15 &&
        g.userData.z < s.z + 260;
  }
}
