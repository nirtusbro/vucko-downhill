import * as THREE from "three";
import { FINISH_Z, OBSTACLES, snowHeight } from "./physics";
import {
  box,
  circle,
  cone,
  cylinder,
  material,
  pebble,
  seeded,
  shape,
  sphere,
} from "./geometry";

const dummy = new THREE.Object3D();
const pine = material("#326c64"),
  snow = material("#eaf4fc"),
  wood = material("#a77f61");
const stone = material("#8396a6");
const shade = new THREE.MeshBasicMaterial({
  color: "#759ebf",
  transparent: true,
  opacity: 0.16,
  depthWrite: false,
});
function instance(
  parent: THREE.Group,
  geometry: THREE.BufferGeometry,
  mat: THREE.Material,
  count: number,
) {
  const obj = new THREE.InstancedMesh(geometry, mat, count);
  obj.frustumCulled = false;
  parent.add(obj);
  return obj;
}
function stamp(
  obj: THREE.InstancedMesh,
  i: number,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  rx = 0,
  ry = 0,
  rz = 0,
) {
  dummy.position.set(x, y, z);
  dummy.scale.set(sx, sy, sz);
  dummy.rotation.set(rx, ry, rz);
  dummy.updateMatrix();
  obj.setMatrixAt(i, dummy.matrix);
}
export class Environment {
  chunks: THREE.Group[] = [];
  mountains = new THREE.Group();
  constructor(scene: THREE.Scene) {
    const rand = seeded(1984);
    for (let chunk = -1; chunk < 18; chunk++) {
      const group = new THREE.Group();
      group.userData.z = chunk * 90 + 45;
      scene.add(group);
      this.chunks.push(group);
      const trees: { x: number; y: number; z: number; s: number }[] = [];
      for (let i = 0; i < 18; i++) {
        const z = chunk * 90 + rand() * 90,
          x = (i % 2 ? 1 : -1) * (25 + rand() * 40);
        trees.push({ x, z, y: snowHeight(z), s: 0.7 + rand() * 1.25 });
      }
      for (const o of OBSTACLES.filter(
        (o) => o.kind === "tree" && Math.floor(o.z / 90) === chunk,
      ))
        trees.push({ x: o.x, y: snowHeight(o.z), z: o.z, s: 0.78 });
      const trunks = instance(group, cylinder, wood, trees.length),
        leaves = instance(group, cone, pine, trees.length * 3),
        caps = instance(group, cone, snow, trees.length * 3),
        shadows = instance(group, circle, shade, trees.length);
      trees.forEach((tree, i) => {
        const { x, y, z, s } = tree;
        stamp(trunks, i, x, y + s * 1.1, z, s * 0.19, s * 2.2, s * 0.19);
        for (let level = 0; level < 3; level++) {
          const radius = (2.05 - level * 0.48) * s,
            height = (3 - level * 0.35) * s,
            yy = y + (2.7 + level * 1.45) * s;
          stamp(
            leaves,
            i * 3 + level,
            x,
            yy,
            z,
            radius,
            height,
            radius,
            0,
            i * 1.3,
          );
          stamp(
            caps,
            i * 3 + level,
            x,
            yy + height * 0.155,
            z,
            radius * 0.86,
            height * 0.77,
            radius * 0.86,
            0,
            i * 1.3,
          );
        }
        stamp(
          shadows,
          i,
          x + 2 * s,
          snowHeight(z + 1.5 * s) + 0.035,
          z + 1.5 * s,
          s * 2.8,
          s * 1.5,
          1,
          -Math.PI / 2 + 0.1,
          0,
          0.55,
        );
      });
      const rocks = OBSTACLES.filter(
        (o) => o.kind === "rock" && Math.floor(o.z / 90) === chunk,
      );
      for (let i = 0; i < 3; i++) {
        const z = chunk * 90 + rand() * 90;
        rocks.push({
          x: (i % 2 ? 1 : -1) * (24 + rand() * 12),
          z,
          radius: 1 + rand(),
          kind: "rock",
        });
      }
      const stones = instance(group, pebble, stone, rocks.length),
        snowcaps = instance(group, pebble, snow, rocks.length);
      rocks.forEach((r, i) => {
        const y = snowHeight(r.z);
        stamp(
          stones,
          i,
          r.x,
          y + r.radius * 0.45,
          r.z,
          r.radius * 1.3,
          r.radius,
          r.radius,
        );
        stamp(
          snowcaps,
          i,
          r.x - 0.12,
          y + r.radius * 0.98,
          r.z,
          r.radius * 1.25,
          r.radius * 0.46,
          r.radius * 0.99,
        );
      });
      const posts = instance(group, box, wood, 24),
        rails = instance(group, box, wood, 44),
        fenceCaps = instance(group, box, snow, 22);
      for (let i = 0; i < 12; i++)
        for (const [sideIndex, side] of [-1, 1].entries()) {
          const x = side * 21,
            z = chunk * 90 + i * 8,
            y = snowHeight(z);
          stamp(
            posts,
            i * 2 + sideIndex,
            x,
            y + 0.65,
            z,
            0.2,
            1.45,
            0.24,
            0,
            0,
            side * 0.05,
          );
          if (i < 11) {
            const midZ = z + 4,
              midY = snowHeight(midZ);
            for (let level = 0; level < 2; level++)
              stamp(
                rails,
                i * 4 + sideIndex * 2 + level,
                x,
                midY + 0.4 + level * 0.55,
                midZ,
                0.14,
                0.14,
                8.1,
                0.1,
              );
            stamp(
              fenceCaps,
              i * 2 + sideIndex,
              x,
              midY + 1.035,
              midZ,
              0.19,
              0.08,
              8.1,
              0.1,
            );
          }
        }
      if (chunk >= 0 && chunk % 4 === 0)
        this.cabin(group, (chunk % 8 === 0 ? -1 : 1) * 32, chunk * 90 + 54);
    }
    // Distant peaks are a separate, fog-free backdrop, moving only with forward travel.
    const mountainMat = new THREE.MeshLambertMaterial({
      color: "#8cb3ce",
      flatShading: true,
      fog: false,
    });
    const peakMat = new THREE.MeshLambertMaterial({
      color: "#f0f6fd",
      flatShading: true,
      fog: false,
    });
    for (let i = 0; i < 17; i++) {
      const x = -720 + i * 90,
        radius = 65 + rand() * 60,
        height = 65 + rand() * 100,
        z = 430 + rand() * 180;
      const baseY = -38;
      const mountain = shape(
        this.mountains,
        cone,
        mountainMat,
        [x, baseY + height / 2, z],
        [radius, height, radius * 0.8],
        [0, i * 0.5, 0],
      );
      shape(
        this.mountains,
        cone,
        peakMat,
        [x, baseY + height * 0.77, z],
        [radius * 0.48, height * 0.48, radius * 0.8 * 0.48],
        [0, mountain.rotation.y, 0],
      );
    }
    const cloud = new THREE.MeshBasicMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      fog: false,
    });
    for (let i = 0; i < 7; i++)
      for (let j = 0; j < 4; j++)
        shape(
          this.mountains,
          sphere,
          cloud,
          [-500 + i * 170 + j * 18, 145 + (i % 3) * 25 + Math.sin(j) * 7, 650],
          [35, 8 + (j % 2) * 7, 15],
        );
    scene.add(this.mountains);
    this.finish(scene);
    this.startSign(scene);
    const glints: number[] = [];
    for (let i = 0; i < 700; i++) {
      const x = (rand() - 0.5) * 38,
        z = rand() * (FINISH_Z + 60);
      glints.push(
        x,
        snowHeight(z) + 0.014,
        z,
        x + 0.04,
        snowHeight(z + 1.4) + 0.014,
        z + 1.4,
      );
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(glints, 3));
    scene.add(
      new THREE.LineSegments(
        geom,
        new THREE.LineBasicMaterial({
          color: "#aec8dd",
          transparent: true,
          opacity: 0.19,
        }),
      ),
    );
  }
  cabin(parent: THREE.Group, x: number, z: number) {
    const g = new THREE.Group();
    g.position.set(x, snowHeight(z), z);
    g.rotation.y = x < 0 ? 0.5 : -0.5;
    parent.add(g);
    shape(g, box, material("#9d6c4c"), [0, 1.9, 0], [5.2, 3.8, 4.4]);
    for (let i = 0; i < 7; i++)
      shape(
        g,
        box,
        material("#81553d"),
        [0, 0.5 + i * 0.44, -2.22],
        [5.3, 0.08, 0.06],
      );
    for (const side of [-1, 1]) {
      shape(
        g,
        box,
        material("#634a3d"),
        [side * 1.6, 4.4, 0],
        [3.9, 0.23, 5.6],
        [0, 0, -side * 0.52],
      );
      shape(
        g,
        box,
        snow,
        [side * 1.6, 4.59, 0],
        [4, 0.25, 5.65],
        [0, 0, -side * 0.52],
      );
      shape(
        g,
        box,
        material("#ffe1a0"),
        [side * 1.5, 2, -2.23],
        [0.9, 1.15, 0.04],
      );
      shape(g, box, wood, [side * 1.5, 2, -2.28], [0.06, 1.2, 0.04]);
      shape(g, box, wood, [side * 1.5, 2, -2.28], [0.95, 0.06, 0.04]);
    }
    shape(g, box, material("#5a463b"), [0, 1.25, -2.24], [0.9, 2.5, 0.1]);
    shape(g, box, stone, [1.2, 5.4, 1], [0.65, 1.8, 0.65]);
    shape(g, box, snow, [1.2, 6.3, 1], [0.8, 0.2, 0.8]);
    shape(g, box, wood, [0, 0.23, -3], [6, 0.3, 1.5]);
  }
  finish(scene: THREE.Scene) {
    const group = new THREE.Group();
    group.position.set(0, snowHeight(FINISH_Z), FINISH_Z);
    scene.add(group);
    const blue = material("#2e80b2"),
      white = material("#f2f9ff");
    for (const x of [-15, 15]) {
      shape(group, cylinder, blue, [x, 3.5, 0], [0.23, 7, 0.23]);
      shape(group, sphere, white, [x, 7.05, 0], [0.3, 0.3, 0.3]);
    }
    for (let i = 0; i < 24; i++)
      for (let j = 0; j < 2; j++)
        shape(
          group,
          box,
          (i + j) % 2 ? blue : white,
          [-14.4 + i * 1.25, 5.9 + j * 0.65, 0],
          [1.25, 0.65, 0.13],
        );
    for (let i = 0; i < 24; i++)
      for (let j = 0; j < 2; j++)
        shape(
          group,
          box,
          (i + j) % 2 ? blue : white,
          [-14.4 + i * 1.25, 0.035, j * 0.7],
          [1.25, 0.03, 0.7],
        );
  }
  startSign(scene: THREE.Scene) {
    const group = new THREE.Group();
    group.position.set(-11, snowHeight(8), 8);
    scene.add(group);
    shape(group, box, wood, [0, 1.1, 0], [0.18, 2.4, 0.18]);
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 180;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#245d66";
    ctx.fillRect(0, 0, 512, 180);
    ctx.fillStyle = "#f2f7ef";
    ctx.textAlign = "center";
    ctx.font = "bold 49px sans-serif";
    ctx.fillText("BJELAŠNICA", 256, 78);
    ctx.font = "26px sans-serif";
    ctx.fillText("A BIRTHDAY RUN FOR LJUBICA", 256, 131);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    shape(
      group,
      new THREE.PlaneGeometry(4, 1.4),
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
      [0, 2.3, -0.02],
      [1, 1, 1],
      [0, Math.PI, 0],
    );
  }
  update(z: number) {
    for (const chunk of this.chunks)
      chunk.visible = chunk.userData.z > z - 80 && chunk.userData.z < z + 290;
    this.mountains.position.set(0, snowHeight(z), z);
  }
}
