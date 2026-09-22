import * as THREE from "three";
import { TERRAIN_PERIOD, snowHeight, type Course, type Gate, type Run } from "./physics";
import { Vucko } from "./character";
import { Environment } from "./environment";
import { SnowEffects } from "./effects";
import { Birthday } from "./birthday";
import { Hazards } from "./hazards";
import { ghostPose, type Trace } from "./ghost";

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
  ghost = new Vucko();
  ghostTrace: Trace | null = null;
  shadow: THREE.Mesh;
  gateGroups: THREE.Group[] = [];
  private look = new THREE.Vector3();
  private desired = new THREE.Vector3();
  private activeCourse: Course | null = null;
  private builtGates = 0;
  private groundTiles: THREE.Mesh[] = [];
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
    // so the snow never ends however far a run goes.
    const tile = new THREE.PlaneGeometry(1000, TERRAIN_PERIOD, 20, 216);
    tile.rotateX(-Math.PI / 2);
    tile.translate(0, 0, TERRAIN_PERIOD / 2);
    const pos = tile.attributes.position;
    for (let i = 0; i < pos.count; i++)
      pos.setY(i, snowHeight(pos.getZ(i)) - 0.035);
    tile.computeVertexNormals();
    const snowMaterial = new THREE.MeshBasicMaterial({
      color: "#eff6fe",
      toneMapped: false,
    });
    for (let i = 0; i < 2; i++) {
      const ground = mesh(tile, snowMaterial);
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
    // A pale copy of Vučko replays the best run for this level.
    this.ghost.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const m = (obj.material as THREE.Material).clone();
        m.transparent = true;
        m.opacity = 0.3;
        m.depthWrite = false;
        obj.material = m;
      }
    });
    this.ghost.root.visible = false;
    this.scene.add(this.ghost.root);
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
    const y = snowHeight(s.z);
    this.skier.position.set(s.x, y + 0.03, s.z);
    this.skier.rotation.y = s.heading;
    this.skier.rotation.z =
      s.crashTime > 0 ? Math.sin(s.crashTime * 7) * 1.7 : 0;
    this.skier.rotation.x =
      s.crashTime > 0 ? Math.sin(s.crashTime * 8) * 1.6 : 0.1;
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
    this.updateGhost(s, mode, elapsed);
    this.environment.update(s.z);
    this.birthday.update(s, elapsed, mode);
    this.effects.update(s, mode === "paused" ? 0 : dt, mode === "playing");
    this.renderer.render(this.scene, this.camera);
  }
  private updateGhost(s: Run, mode: string, elapsed: number) {
    const pose =
      this.ghostTrace && (mode === "playing" || mode === "paused")
        ? ghostPose(this.ghostTrace, s.time)
        : null;
    const root = this.ghost.root;
    root.visible =
      !!pose &&
      !pose.finished &&
      (Math.abs(pose.z - s.z) > 4 || Math.abs(pose.x - s.x) > 2);
    if (!pose || !root.visible) return;
    root.position.set(pose.x, snowHeight(pose.z) + 0.03, pose.z);
    root.rotation.set(0.1, pose.heading, 0);
    this.ghost.animate(
      { crashTime: 0, heading: pose.heading },
      elapsed,
      mode,
    );
  }
}
