import { clamp, stepRun, type Run } from "../src/physics";

/**
 * A relaxed steering controller using only normal input: aim at the next gate
 * or pickup with a proportional turn and a little heading damping, and steer
 * around any rock or tree that sits on that aim line, the way a player would.
 * With `boost` it holds Speed up only while lined up straight with the next
 * gate and nothing lies close ahead.
 */
export function drive(run: Run, gain = 0.18, damping = 0.8, boost = false) {
  const c = run.course;
  const targets = [
    ...c.gates.map((g) => ({ x: g.x, z: g.z, gate: true })),
    ...c.lampSpots.map((s) => ({ x: s.x, z: s.z, gate: false })),
  ].sort((a, b) => a.z - b.z);
  let next = 0,
    crashes = 0,
    worstMargin = Infinity,
    boostedTicks = 0;
  for (let tick = 0; tick < 120 * 180 && !run.finished; tick++) {
    while (next < targets.length && run.z >= targets[next].z) next++;
    const target = targets[next] ?? { x: 0, z: c.finishZ, gate: true };
    let aimX = target.x;
    // Swerve around the nearest hazard that the current aim line would hit,
    // passing it on whichever side keeps closer to the target.
    // Where the current line will be when it reaches a hazard: converging on
    // the aim point over roughly 25 metres.
    const pathX = (z: number) =>
      run.x + (aimX - run.x) * clamp((z - run.z) / 25, 0, 1);
    const blocker = c.hazards
      .filter(
        (h) =>
          h.z > run.z + 2 &&
          h.z < Math.min(run.z + 30, target.z + 4) &&
          Math.abs(h.x - pathX(h.z)) < h.radius + 1.7,
      )
      .sort((a, b) => a.z - b.z)[0];
    if (blocker) {
      const side =
        Math.sign(run.x - blocker.x) || Math.sign(target.x - blocker.x) || 1;
      aimX = blocker.x + side * (blocker.radius + 2.3);
    }
    const dx = aimX - run.x;
    const prevX = run.x,
      prevZ = run.z;
    const hazardAhead = c.hazards.some(
      (h) => h.z > run.z && h.z < run.z + 30 && Math.abs(h.x - run.x) < 3.5,
    );
    const holdBoost =
      boost &&
      target.gate &&
      !blocker &&
      Math.abs(dx) < 2.5 &&
      Math.abs(run.heading) < 0.25 &&
      !hazardAhead &&
      target.z - run.z > 12;
    if (holdBoost) boostedTicks++;
    stepRun(
      run,
      clamp(dx * gain - run.heading * damping, -1, 1),
      1 / 120,
      holdBoost,
    );
    if (run.event === "crash") crashes++;
    for (const g of c.gates)
      if (prevZ < g.z && run.z >= g.z) {
        const t = (g.z - prevZ) / (run.z - prevZ);
        const cx = prevX + (run.x - prevX) * t;
        worstMargin = Math.min(worstMargin, g.width / 2 - Math.abs(cx - g.x));
      }
  }
  return { crashes, worstMargin, boostedSeconds: boostedTicks / 120 };
}
