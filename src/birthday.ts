import * as THREE from "three";
import { FINISH_Z, LAMPS, snowHeight, type Run } from "./physics";
import { lampModel } from "./lamp-model";
import { box, cylinder, material, rod, shape, sphere } from "./geometry";
import { PRESENT_FALL_TIME, PRESENT_POOL_SIZE } from "./presents";

const brass = material("#ceaa64"),
  ivory = material("#fff0cd"),
  rose = material("#e59898"),
  mint = material("#83b8aa"),
  lilac = material("#ac9cc8"),
  powder = material("#92bed6");
const bulb = new THREE.MeshBasicMaterial({
  color: "#fff0ae",
  toneMapped: false,
});
const ribbon = material("#f5d591"),
  oak = material("#a87d5b");
const palettes = [rose, lilac, mint, powder];

function gift(
  parent: THREE.Object3D,
  x: number,
  z: number,
  size: number,
  color: THREE.Material,
) {
  const g = new THREE.Group();
  g.position.set(x, snowHeight(z), z);
  g.rotation.y = x * 0.4;
  parent.add(g);
  shape(g, box, color, [0, size * 0.46, 0], [size, size * 0.9, size]);
  shape(
    g,
    box,
    color,
    [0, size * 0.95, 0],
    [size * 1.06, size * 0.14, size * 1.06],
  );
  shape(
    g,
    box,
    ribbon,
    [0, size * 0.5, 0],
    [size * 0.13, size * 1.04, size * 1.075],
  );
  shape(
    g,
    box,
    ribbon,
    [0, size * 1.027, 0],
    [size * 1.065, 0.025, size * 0.13],
  );
  const loop = new THREE.TorusGeometry(size * 0.17, size * 0.036, 5, 12);
  for (const side of [-1, 1])
    shape(
      g,
      loop,
      ribbon,
      [side * size * 0.13, size * 1.16, 0],
      [1, 0.58, 1],
      [0.2, side * 0.35, side * 0.3],
    );
  return g;
}

function bunting(parent: THREE.Object3D, x: number, z: number) {
  const g = new THREE.Group();
  g.position.set(x, snowHeight(z), z);
  parent.add(g);
  const positions: number[] = [];
  for (let i = 0; i <= 12; i++) {
    const zz = (i / 12 - 0.5) * 9;
    positions.push(0, 3.1 - Math.sin((i / 12) * Math.PI) * 0.55, zz);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.add(
    new THREE.Line(geom, new THREE.LineBasicMaterial({ color: "#c9ad83" })),
  );
  for (const zz of [-4.5, 4.5])
    shape(g, cylinder, oak, [0, 1.55, zz], [0.055, 3.1, 0.055]);
  const triangle = new THREE.BufferGeometry();
  triangle.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([0, 0, -0.3, 0, -0.62, 0, 0, 0, 0.3], 3),
  );
  triangle.computeVertexNormals();
  for (let i = 0; i < 8; i++) {
    const t = (i + 0.5) / 8;
    const m = new THREE.MeshLambertMaterial({
      color: palettes[i % 4].color,
      side: THREE.DoubleSide,
    });
    shape(
      g,
      triangle,
      m,
      [0, 3.1 - Math.sin(t * Math.PI) * 0.55, (t - 0.5) * 8.5],
      [1, 1, 1],
    );
  }
}

export class Birthday {
  private lamps: THREE.Group[] = [];
  private decorations: THREE.Group[] = [];
  private pickupTimes = LAMPS.map(() => -10);
  private previousCollected = LAMPS.map(() => false);
  private menuDisplay = new THREE.Group();
  private activeLampIds: number[] | null = null;
  private fallingGifts: { model: THREE.Group; marker: THREE.Mesh }[] = [];
  constructor(scene: THREE.Scene) {
    const ring = new THREE.RingGeometry(1.8, 2.15, 32);
    for (let i = 0; i < PRESENT_POOL_SIZE; i++) {
      const model = gift(scene, 0, 0, 1.65, palettes[i]);
      const marker = new THREE.Mesh(
        ring,
        new THREE.MeshBasicMaterial({
          color: "#d6a02b",
          transparent: true,
          opacity: 0.8,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      marker.rotation.x = -Math.PI / 2 + 0.1;
      model.visible = marker.visible = false;
      scene.add(marker);
      this.fallingGifts.push({ model, marker });
    }
    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = 64;
    glowCanvas.height = 64;
    const ctx = glowCanvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,213,121,.6)");
    grad.addColorStop(1, "rgba(255,213,121,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const glowMat = new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(glowCanvas),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    for (let i = 0; i < LAMPS.length; i++) {
      const g = new THREE.Group();
      g.position.set(LAMPS[i].x, snowHeight(LAMPS[i].z), LAMPS[i].z);
      const lamp = lampModel(i % 4);
      lamp.scale.setScalar(1.22);
      lamp.name = "lamp";
      g.add(lamp);
      shape(
        g,
        new THREE.PlaneGeometry(4.2, 4.2),
        glowMat,
        [0, 0.05, 0],
        [1, 1, 1],
        [-Math.PI / 2 + 0.1, 0, 0],
      );
      g.children[1].name = "glow";
      scene.add(g);
      this.lamps.push(g);
    }
    // A few small birthday corners sit outside the racing line.
    for (const [i, z] of [
      36,
      ...[0.2, 0.4, 0.6, 0.8].map((t) => FINISH_Z * t),
      FINISH_Z + 10,
    ].entries()) {
      const group = new THREE.Group(),
        x = (i % 2 ? 1 : -1) * 23;
      gift(group, x, z, 1.15, palettes[i % 4]);
      gift(group, x + 1.1, z + 1.2, 0.8, palettes[(i + 1) % 4]);
      bunting(group, x, z + 5);
      group.userData.z = z;
      scene.add(group);
      this.decorations.push(group);
    }
    // A bedside table and a few presents hint at the collectible before playing.
    const x = 3.2,
      z = 2.4,
      y = snowHeight(z);
    shape(
      this.menuDisplay,
      cylinder,
      oak,
      [x, y + 0.93, z],
      [0.76, 0.13, 0.76],
    );
    for (const [dx, dz] of [
      [-0.45, -0.3],
      [0.45, -0.3],
      [0, 0.48],
    ])
      rod(
        this.menuDisplay,
        new THREE.Vector3(x + dx, y, z + dz),
        new THREE.Vector3(x + dx * 0.7, y + 0.9, z + dz * 0.7),
        0.06,
        brass,
      );
    const display = lampModel(0);
    display.position.set(x, y + 1.01, z);
    this.menuDisplay.add(display);
    gift(this.menuDisplay, x + 0.6, z + 1.3, 0.62, lilac);
    gift(this.menuDisplay, x - 1, z + 0.3, 0.48, mint);
    scene.add(this.menuDisplay);
  }
  reset() {
    this.previousCollected.fill(false);
    this.pickupTimes.fill(-10);
  }
  update(s: Run, time: number, mode: string) {
    if (this.activeLampIds !== s.lampIds) {
      this.activeLampIds = s.lampIds;
      this.lamps.forEach((group, i) => {
        group.remove(group.getObjectByName("lamp")!);
        group.add(lampModel(s.lampIds[i]));
      });
    }
    for (const [i, visual] of this.fallingGifts.entries()) {
      const present = s.presents.items[i];
      const visible =
        present.phase !== "inactive" && mode !== "menu" && mode !== "how";
      visual.model.visible = visible;
      visual.marker.visible = visible && present.phase !== "collected";
      if (!visible) continue;
      const falling = present.phase === "falling";
      const collected = present.phase === "collected";
      const height = falling
        ? 28 * (1 - (present.age / PRESENT_FALL_TIME) ** 2)
        : collected
          ? present.age * 6
          : 0.12 + Math.sin(s.time * 3) * 0.08;
      visual.model.position.set(
        present.x,
        snowHeight(present.z) + height,
        present.z,
      );
      visual.model.rotation.set(
        falling ? Math.sin(present.age * 4) * 0.15 : 0,
        s.time * (falling ? 1.6 : 0.65),
        0,
      );
      visual.model.scale.setScalar(
        collected ? Math.max(0, 1 - present.age / 0.5) : 1,
      );
      visual.marker.position.set(
        present.x,
        snowHeight(present.z) + 0.06,
        present.z,
      );
      visual.marker.scale.setScalar(
        falling ? 1 + Math.sin(s.time * 8) * 0.12 : 1,
      );
      (visual.marker.material as THREE.MeshBasicMaterial).opacity = falling
        ? 0.85
        : 0.5;
    }
    this.menuDisplay.visible = mode === "menu" || mode === "how";
    for (const g of this.decorations)
      g.visible = g.userData.z > s.z - 45 && g.userData.z < s.z + 230;
    for (let i = 0; i < this.lamps.length; i++) {
      const g = this.lamps[i],
        lamp = g.getObjectByName("lamp")!;
      if (s.collectedLamps[i] && !this.previousCollected[i])
        this.pickupTimes[i] = time;
      this.previousCollected[i] = s.collectedLamps[i];
      const age = time - this.pickupTimes[i];
      g.visible =
        LAMPS[i].z > s.z - 12 &&
        LAMPS[i].z < s.z + 230 &&
        (!s.collectedLamps[i] || age < 0.42);
      if (!g.visible) continue;
      lamp.rotation.y = Math.sin(time * 0.8 + i) * 0.3;
      lamp.position.y = 0.48 + Math.sin(time * 2 + i) * 0.1;
      lamp.scale.setScalar(1.22);
      if (s.collectedLamps[i]) {
        lamp.position.y += age * 4;
        lamp.scale.setScalar(1.22 * Math.max(0, 1 - age / 0.42));
      }
      g.getObjectByName("glow")!.visible = !s.collectedLamps[i];
    }
  }
}
