import * as THREE from "three";
import { LAMPS, snowHeight, type Run } from "./physics";
import { box, cylinder, material, rod, shape, sphere } from "./geometry";

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
const designs = [
  "Rose mushroom",
  "Lavender pleats",
  "Emerald banker",
  "Blue porcelain",
];
const palettes = [rose, lilac, mint, powder];

/** Four small table-lamp sculptures. Clones share geometry/materials. No dynamic lights. */
function makeLamp(style: number) {
  const g = new THREE.Group();
  g.name = designs[style];
  shape(g, cylinder, brass, [0, 0.08, 0], [0.4, 0.12, 0.4]);
  shape(g, cylinder, palettes[style], [0, 0.16, 0], [0.3, 0.08, 0.3]);
  shape(g, cylinder, brass, [0, 0.7, 0], [0.045, 1.05, 0.045]);
  shape(g, sphere, bulb, [0, 1.18, 0], [0.19, 0.22, 0.19]);
  if (style === 0) {
    shape(g, sphere, rose, [0, 0.57, 0], [0.16, 0.47, 0.16]);
    shape(
      g,
      new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      rose,
      [0, 1.16, 0],
      [0.72, 0.52, 0.72],
    );
    shape(g, cylinder, ivory, [0, 1.16, 0], [0.67, 0.035, 0.67]);
    shape(g, cylinder, brass, [0, 1.14, 0], [0.72, 0.025, 0.72]);
  } else if (style === 1) {
    const pleats = new THREE.CylinderGeometry(0.38, 0.68, 0.7, 32, 1, true);
    const p = pleats.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const angle = Math.atan2(p.getX(i), p.getZ(i));
      const factor = 1 + Math.cos(angle * 16) * 0.055;
      p.setX(i, p.getX(i) * factor);
      p.setZ(i, p.getZ(i) * factor);
    }
    pleats.computeVertexNormals();
    const shade = new THREE.MeshLambertMaterial({
      color: "#b8a4cd",
      side: THREE.DoubleSide,
    });
    shape(g, pleats, shade, [0, 1.37, 0], [1, 1, 1]);
    shape(g, cylinder, brass, [0, 1.015, 0], [0.69, 0.027, 0.69]);
    shape(g, sphere, brass, [0, 1.77, 0], [0.07, 0.09, 0.07]);
    shape(g, sphere, ivory, [0, 0.54, 0], [0.17, 0.23, 0.17]);
  } else if (style === 2) {
    shape(g, sphere, mint, [0, 1.42, 0], [0.77, 0.29, 0.4]);
    shape(g, box, brass, [0, 1.25, 0], [1.36, 0.045, 0.65]);
    shape(g, box, bulb, [0, 1.22, 0], [1.12, 0.025, 0.5]);
    shape(g, cylinder, brass, [0.5, 0.97, 0], [0.013, 0.55, 0.013]);
    shape(g, sphere, brass, [0.5, 0.69, 0], [0.038, 0.06, 0.038]);
    shape(g, cylinder, mint, [0, 0.24, 0], [0.29, 0.13, 0.29]);
  } else {
    shape(g, sphere, powder, [0, 0.53, 0], [0.28, 0.39, 0.28]);
    shape(g, cylinder, brass, [0, 0.9, 0], [0.12, 0.06, 0.12]);
    shape(
      g,
      new THREE.CylinderGeometry(0.37, 0.67, 0.67, 20, 1, true),
      new THREE.MeshLambertMaterial({
        color: "#f2e9d5",
        side: THREE.DoubleSide,
      }),
      [0, 1.36, 0],
      [1, 1, 1],
    );
    shape(g, cylinder, powder, [0, 1.02, 0], [0.69, 0.035, 0.69]);
    shape(g, sphere, brass, [0, 1.76, 0], [0.075, 0.085, 0.075]);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      shape(
        g,
        sphere,
        ivory,
        [Math.cos(a) * 0.264, 0.55, Math.sin(a) * 0.264],
        [0.038, 0.14, 0.038],
      );
    }
  }
  return g;
}

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
  private prototypes = [0, 1, 2, 3].map(makeLamp);
  constructor(scene: THREE.Scene) {
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
      const lamp = this.prototypes[i % 4].clone();
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
      scene.add(g);
      this.lamps.push(g);
    }
    // A few small birthday corners sit outside the racing line.
    for (const [i, z] of [36, 275, 515, 780, 1035, 1290, 1420].entries()) {
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
    const display = this.prototypes[0].clone();
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
      g.children[1].visible = !s.collectedLamps[i];
    }
  }
}
