import * as THREE from "three";
import {
  TERRAIN_PERIOD,
  bankHeight,
  crossSlope,
  snowHeight,
  surfaceHeight,
  type Course,
  type Gate,
  type Run,
} from "./physics";
import { BANK_RATE } from "./levels";
import { Vucko } from "./character";
import { Environment } from "./environment";
import { SnowEffects } from "./effects";
import { Birthday } from "./birthday";
import { Hazards } from "./hazards";
import { PISTE_HALF_WIDTH, Piste } from "./piste";

/** How much more than the true bank angle the skier leans, so a bank reads at a glance. */
const BANK_LEAN = 1.6;

export const mat = (color: THREE.ColorRepresentation) =>
  new THREE.MeshLambertMaterial({ color });
export function mesh(
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  return m;
}
export class SkiScene {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(55, 1, 0.2, 1300);
  character = new Vucko();
  skier = this.character.root;
  environment: Environment;
  effects: SnowEffects;
  birthday: Birthday;
  hazards: Hazards;
  piste: Piste;
  shadow: THREE.Mesh;
  gateGroups: THREE.Group[] = [];
  private look = new THREE.Vector3();
  private desired = new THREE.Vector3();
  /** The snow height the camera rides, smoothed so a knoll lifts the view without a jolt. */
  private groundY = NaN;
  private activeCourse: Course | null = null;
  private builtGates = 0;
  private groundTiles: THREE.Group[] = [];
  private flagTextures: THREE.CanvasTexture[];
  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor("#b8dded");
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.scene.fog = new THREE.Fog("#b8dded", 140, 330);
    this.scene.add(new THREE.HemisphereLight("#f5fbff", "#98afca", 1.8));
    const sun = new THREE.DirectionalLight("#fff8df", 2.5);
    sun.position.set(-50, 90, -25);
    this.scene.add(sun);
    // Two ground tiles, each one terrain period long, leapfrog down the slope
    // so the snow never ends however far a run goes. Each is the flat snow
    // either side of the piste; the piste itself is a finer strip that can
    // bank with the course.
    const snowMaterial = new THREE.MeshBasicMaterial({
      color: "#eff6fe",
      toneMapped: false,
    });
    const sides = [-1, 1].map((side) => {
      const half = new THREE.PlaneGeometry(500 - PISTE_HALF_WIDTH, TERRAIN_PERIOD, 10, 216);
      half.rotateX(-Math.PI / 2);
      half.translate(side * (PISTE_HALF_WIDTH + (500 - PISTE_HALF_WIDTH) / 2), 0, TERRAIN_PERIOD / 2);
      const pos = half.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setY(i, snowHeight(pos.getZ(i)) - 0.035);
      return half;
    });
    for (let i = 0; i < 2; i++) {
      const ground = new THREE.Group();
      for (const half of sides) ground.add(mesh(half, snowMaterial));
      this.scene.add(ground);
      this.groundTiles.push(ground);
    }
    this.flagTextures = ["#e83e48", "#167bc6"].map((color) => {
      const c = document.createElement("canvas");
      c.width = 128;
      c.height = 128;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.translate(64, 64);
      for (let i = 0; i < 6; i++) {
        ctx.rotate(Math.PI / 3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -31);
        ctx.moveTo(0, -21);
        ctx.lineTo(-9, -29);
        ctx.moveTo(0, -21);
        ctx.lineTo(9, -29);
        ctx.stroke();
      }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    });
    this.scene.add(this.skier);
    this.shadow = mesh(
      new THREE.CircleGeometry(1, 24),
      new THREE.MeshBasicMaterial({
        color: "#6586b3",
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      }),
    );
    this.shadow.rotation.x = -Math.PI / 2 + 0.1;
    this.shadow.scale.set(1.1, 1.7, 1);
    this.scene.add(this.shadow);
    this.environment = new Environment(this.scene);
    this.effects = new SnowEffects(this.scene);
    this.birthday = new Birthday(this.scene);
    this.hazards = new Hazards(this.scene);
    this.piste = new Piste(this.scene);
    window.addEventListener("resize", () => this.resize());
    this.resize();
  }
  /** Rebuilds the flags for a course; each level has its own layout. */
  private dropGate(group: THREE.Group) {
    this.scene.remove(group);
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) obj.geometry.dispose();
    });
  }
  private clearGates() {
    for (const group of this.gateGroups) this.dropGate(group);
    this.gateGroups = [];
    this.builtGates = 0;
  }
  /** Builds flags as they come within reach and drops those left behind, so any course length works. */
  private syncGates(course: Course, z: number) {
    while (this.gateGroups.length && this.gateGroups[0].position.z < z - 60)
      this.dropGate(this.gateGroups.shift()!);
    while (
      this.builtGates < course.gates.length &&
      course.gates[this.builtGates].z < z + 420
    ) {
      const i = this.builtGates++;
      this.buildGate(i, course.gates[i]);
    }
  }
  private buildGate(i: number, gate: Gate) {
    const flagTextures = this.flagTextures;
    {
      const group = new THREE.Group();
      group.position.set(gate.x, snowHeight(gate.z), gate.z);
      const color = mat(gate.color === "red" ? "#eb474a" : "#208bd5");
      for (const side of [-1, 1]) {
        group.add(
          mesh(
            new THREE.CylinderGeometry(0.055, 0.075, 2.7, 6),
            color,
            (side * gate.width) / 2,
            1.35,
          ),
        );
        const flag = mesh(
          new THREE.PlaneGeometry(0.95, 0.85, 5, 1),
          new THREE.MeshLambertMaterial({
            map: flagTextures[i % 2],
            side: THREE.DoubleSide,
          }),
          side * (gate.width / 2 - 0.5),
          1.92,
        );
        flag.userData.flag = true;
        group.add(flag);
      }
      const line = mesh(
        new THREE.PlaneGeometry(gate.width, 0.2),
        new THREE.MeshBasicMaterial({
          color: color.color,
          transparent: true,
          opacity: 0.15,
          depthWrite: false,
        }),
        0,
        0.025,
      );
      line.rotation.x = -Math.PI / 2;
      group.add(line);
      group.userData.index = i;
      this.scene.add(group);
      this.gateGroups.push(group);
    }
  }
  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.fov = this.camera.aspect < 0.8 ? 59 : 49;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  }
  reset() {
    this.effects.reset();
    this.birthday.reset();
    // Flags left behind were dropped; a fresh run rebuilds them from the start.
    this.activeCourse = null;
  }
  update(s: Run, dt: number, mode: string, elapsed: number) {
    if (this.activeCourse !== s.course) {
      this.activeCourse = s.course;
      this.clearGates();
      this.environment.setFinish(s.course.finishZ);
    }
    this.syncGates(s.course, s.z);
    const base = Math.floor((s.z - 300) / TERRAIN_PERIOD);
    this.groundTiles.forEach((ground, i) => {
      const k = base + i;
      ground.position.set(0, -0.1 * k * TERRAIN_PERIOD, k * TERRAIN_PERIOD);
    });
    // The camera rides the snow under the skier, smoothed, so a roller's crest
    // lifts the view and hides what lies beyond it without a jolt.
    const surface = surfaceHeight(s.course, s.x, s.z);
    if (dt === 0 || Number.isNaN(this.groundY)) this.groundY = surface;
    else this.groundY += (surface - this.groundY) * (1 - Math.exp(-4 * dt));
    const y = this.groundY;
    this.skier.position.set(s.x, surface + 0.03, s.z);
    this.skier.rotation.y = s.heading;
    // On shaped snow the skier leans downhill with the local slope, exaggerated
    // a little, and pitches up a rise and over a crest.
    const lean = -Math.atan(crossSlope(s.course, s.x, s.z) * BANK_RATE) * BANK_LEAN;
    const pitch = Math.atan(bankHeight(s.course, s.x, s.z + 0.5) - bankHeight(s.course, s.x, s.z - 0.5));
    this.skier.rotation.z =
      s.crashTime > 0 ? Math.sin(s.crashTime * 7) * 1.7 : lean;
    this.skier.rotation.x =
      s.crashTime > 0 ? Math.sin(s.crashTime * 8) * 1.6 : 0.1 - pitch;
    const portrait = this.camera.aspect < 0.8;
    if (mode === "menu" || mode === "how") {
      const menuPortrait = this.camera.aspect <= 1.25;
      // Keep the skier at roughly three quarters of the screen in wide menus.
      const wideLookX =
        6 +
        14 *
          Math.tan(
            Math.atan2(-6, 10.8) +
              Math.atan(
                0.5 *
                  Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) *
                  this.camera.aspect,
              ),
          );
      this.desired.set(
        menuPortrait ? 7 : 6,
        y + (menuPortrait ? 5.5 : 4),
        s.z + (menuPortrait ? -12 : -9),
      );
      this.look.set(
        menuPortrait ? -1 : wideLookX,
        y + (menuPortrait ? 2.4 : 1.8),
        s.z + (menuPortrait ? 4 : 5),
      );
      this.skier.rotation.y = 2.7;
      this.skier.scale.setScalar(menuPortrait ? 1.25 : 1.3);
      this.skier.position.z += 1.8;
      this.skier.position.y = snowHeight(s.z + 1.8) + 0.03;
    } else {
      this.skier.scale.setScalar(1);
      this.desired.set(
        s.x * 0.55,
        y + (portrait ? 10 : 8),
        s.z - (portrait ? 20 : 17),
      );
      this.look.set(
        s.x * 0.6,
        y + (portrait ? -1 : -0.5),
        s.z + (portrait ? 25 : 26),
      );
    }
    if (dt === 0) this.camera.position.copy(this.desired);
    else this.camera.position.lerp(this.desired, 1 - Math.exp(-5 * dt));
    this.camera.lookAt(this.look);
    for (const gate of this.gateGroups) {
      gate.visible = gate.position.z > s.z - 12 && gate.position.z < s.z + 290;
      if (gate.visible)
        for (const child of gate.children) {
          if (child.userData.flag) {
            const p = (child as THREE.Mesh).geometry.attributes.position;
            for (let j = 0; j < p.count; j++)
              p.setZ(
                j,
                Math.sin(p.getX(j) * 4 + elapsed * 4 + gate.position.z) * 0.055,
              );
            p.needsUpdate = true;
          }
        }
    }
    this.shadow.position.set(
      s.x + 0.35,
      this.skier.position.y + 0.025,
      this.skier.position.z + 0.4,
    );
    this.character.animate(s, elapsed, mode);
    this.hazards.update(s);
    this.piste.update(s);
    this.environment.update(s.z);
    this.birthday.update(s, elapsed, mode);
    this.effects.update(s, mode === "paused" ? 0 : dt, mode === "playing");
    this.renderer.render(this.scene, this.camera);
  }
}
