import "./style.css";
import "./collection.css";
import {
  createEndlessRun,
  createRun,
  stepRun,
  lampsKept,
  ENDLESS_STRIKES,
  GIFTS_PER_LIFE,
  BULLSEYE_POINTS,
  COMBO_CAP,
  CRASH_PENALTY,
} from "./physics";
import { LEVEL_COUNT, courseFingerprint, getCourse } from "./levels";
import { SkiInput } from "./input";
import { SkiScene } from "./scene";
import { SkiAudio } from "./audio";
import { readValue, writeValue } from "./storage";
import { PRESENT_POINTS } from "./presents";
import { LevelProgress } from "./progress";
import { LevelMap } from "./collection-view";
import { setupPwa } from "./pwa";
import { LAMP_CATALOG } from "./lamp-catalog";
import { lampArt } from "./lamp-art";
import {
  loadGhost,
  paceDelta,
  recordSample,
  saveGhost,
  type Trace,
} from "./ghost";

const el = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
/** Stands in for a lamp on the bonus levels beyond the summit. */
const PEAK_ART =
  '<svg xmlns="http://www.w3.org/2000/svg" class="lamp-art" viewBox="0 0 80 88" aria-hidden="true"><path d="M4 78 30 22l13 24 9-12 24 44z" fill="#8cb3ce"/><path d="M30 22l9 17-9-4-8 6z" fill="#f0f6fd"/><path d="M52 34l7 13-7-3-5 5z" fill="#f0f6fd"/><path d="M4 78h72" stroke="#c9d8e6" stroke-width="3"/></svg>';
const canvas = el<HTMLCanvasElement>("game");
const input = new SkiInput(canvas);
const progress = new LevelProgress();
const levelMap = new LevelMap(progress);
let level = progress.unlocked;
let collectionReturn = "menu";
let run = createRun(level, undefined, progress.lamps);
let mode = "menu";
let scene: SkiScene;
const audio = new SkiAudio();
audio.muted = readValue("muted", "false") === "true";
let tutorial = !readValue("learned", "");
let steered = false;
let gateHintShown = false;
let feedbackUntil = 0;
let finishDelay = 0;
let newBest = false;
let newlyEarned = false;
let discoveries = 0;
let elapsed = 0;
let trace: Trace = [];
let ghost: Trace | null = loadGhost(level, courseFingerprint(getCourse(level)));
const paceEl = el("pace"),
  goalEl = el("goal"),
  livesEl = el("lives"),
  lifeProgressEl = el("life-progress");
const timeEl = el("time"),
  scoreEl = el("score"),
  gatesEl = el("gate-count"),
  progressEl = el("progress-fill"),
  speedEl = el("speed");
const lampsEl = el("lamp-count");
const feedback = el("feedback"),
  combo = el("combo"),
  tutorialEl = el("tutorial");
const formatTime = (time: number) => {
  const tenths = Math.floor(time * 10);
  return `${String(Math.floor(tenths / 600)).padStart(2, "0")}:${String(Math.floor(tenths / 10) % 60).padStart(2, "0")}.${tenths % 10}`;
};
function refreshHome() {
  const course = getCourse(level),
    bonus = course.lampId < 0,
    lamp = bonus ? null : LAMP_CATALOG[course.lampId],
    earned = bonus ? progress.passed(level) : progress.lamps[course.lampId];
  el("home-level").textContent = `Level ${level + 1}`;
  el("home-level-of").textContent = `· ${course.name}`;
  el("home-hint").textContent = course.hint;
  const art = el("home-lamp-art");
  art.innerHTML = lamp ? lampArt(lamp) : PEAK_ART;
  art.className = bonus ? "home-lamp bonus" : earned ? "home-lamp owned" : "home-lamp undiscovered";
  el("home-lamp-name").textContent = bonus
    ? earned
      ? "Cleared. No lamps, no presents, just rock."
      : "Bonus level: no lamps, no presents, just rock."
    : earned
      ? lamp!.name
      : "Clear every gate and reach the goal to earn this lamp";
  el("home-pickups").innerHTML = course.pickupLampIds
    .map(
      (id) =>
        `<span class="shelf-lamp ${progress.lamps[id] ? "owned" : "undiscovered"}" title="${progress.lamps[id] ? LAMP_CATALOG[id].name : "Still on the slope"}">${lampArt(LAMP_CATALOG[id])}</span>`,
    )
    .join("");
  el("home-lamp-rarity").textContent = lamp ? lamp.rarity : "Beyond the summit";
  el("home-lamp-rarity").parentElement!.dataset.rarity = lamp ? lamp.rarity : "Legendary";
  el("home-gates").textContent = String(course.gates.length);
  el("home-goal").textContent = course.goal.toLocaleString();
  el("home-high-score").textContent = progress.best[level].toLocaleString();
  el("play-label").textContent = earned
    ? `Level ${level + 1} again`
    : bonus
      ? `Bonus level ${level + 1}`
      : `Ski level ${level + 1}`;
  el("endless-record").textContent = progress.endlessBest
    ? `Endless best ${progress.endlessBest.toLocaleString()} · longest run ${progress.endlessDistance.toLocaleString()} m`
    : "";
  el<HTMLButtonElement>("level-prev").disabled = level === 0;
  el<HTMLButtonElement>("level-next").disabled = level >= progress.unlocked;
  levelMap.refreshHome();
}
function selectLevel(next: number) {
  level = Math.max(0, Math.min(progress.unlocked, next));
  run = createRun(level, undefined, progress.lamps);
  ghost = loadGhost(level, courseFingerprint(run.course));
  refreshHome();
}
el("level-prev").onclick = () => selectLevel(level - 1);
el("level-next").onclick = () => selectLevel(level + 1);
refreshHome();
function changeMode(next: string) {
  mode = next;
  input.enabled = mode === "playing";
  input.reset();
  for (const id of [
    "menu",
    "hud",
    "pause-screen",
    "how-screen",
    "finish-screen",
    "collection-screen",
  ])
    el(id).hidden = true;
  const screen = el(
    next === "playing" || next === "celebrating"
      ? "hud"
      : next === "collection"
        ? "collection-screen"
        : next === "paused"
          ? "pause-screen"
          : next === "how"
            ? "how-screen"
            : next === "finished"
              ? "finish-screen"
              : "menu",
  );
  screen.hidden = false;
  screen.scrollTop = 0;
  document.body.className = next;
  el("pause").hidden = next === "celebrating";
  el("race-controls").hidden = next !== "playing";
  audio.update(run, next === "playing");
}
function updateHud() {
  timeEl.textContent = formatTime(run.time);
  if (ghost) {
    const delta = paceDelta(ghost, run);
    const even = Math.abs(delta) < 0.05;
    paceEl.textContent = even
      ? "0.0s"
      : `${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(1)}s`;
    paceEl.className = even ? "even" : delta > 0 ? "behind" : "ahead";
  }
  paceEl.hidden = !ghost;
  scoreEl.textContent = run.score.toLocaleString();
  const endless = run.course.endless === true;
  livesEl.hidden = !endless;
  lifeProgressEl.hidden = !endless;
  if (endless) {
    // Three lives, drawn big: they drain on a miss or a tumble and come back
    // for every ten presents caught.
    const left = Math.max(0, ENDLESS_STRIKES - run.strikes);
    livesEl.innerHTML = Array.from(
      { length: ENDLESS_STRIKES },
      (_, i) => `<span class="${i < left ? "life" : "life lost"}">${i < left ? "♥" : "♡"}</span>`,
    ).join("");
    lifeProgressEl.textContent =
      left < ENDLESS_STRIKES
        ? `${run.giftsTowardLife} / ${GIFTS_PER_LIFE} gifts to a life`
        : `${run.giftsTowardLife} / ${GIFTS_PER_LIFE} gifts`;
    goalEl.textContent = `${Math.floor(run.z).toLocaleString()} m`;
    goalEl.classList.toggle("reached", false);
    goalEl.classList.toggle("missed", false);
  } else {
    goalEl.textContent = run.misses
      ? "Gate missed · no finish lamp this run"
      : `Goal ${run.goal.toLocaleString()}`;
    goalEl.classList.toggle("reached", !run.misses && run.score >= run.goal);
    goalEl.classList.toggle("missed", run.misses > 0);
  }
  lampsEl.parentElement!.hidden = endless;
  lampsEl.textContent = `${run.lamps} / ${run.lampsAvailable}`;
  el("present-count").textContent = String(run.presents.collected);
  gatesEl.textContent = endless
    ? `${run.hits} gates`
    : `${run.hits} / ${run.course.gates.length}`;
  progressEl.style.width = endless
    ? `${((run.z % 1000) / 1000) * 100}%`
    : `${(run.z / run.course.finishZ) * 100}%`;
  speedEl.innerHTML = `${Math.round(run.speed * 3.6)} <small>km/h</small>`;
}
function start(endless = false) {
  if (!scene) return;
  audio.unlock();
  run = endless ? createEndlessRun() : createRun(level, undefined, progress.lamps);
  el("run-level").textContent = endless ? "Endless run" : `Level ${level + 1}`;
  finishDelay = 0;
  discoveries = 0;
  steered = false;
  gateHintShown = false;
  feedbackUntil = 0;
  feedback.className = "";
  feedback.textContent = "";
  combo.textContent = "";
  trace = [];
  ghost = endless ? null : loadGhost(level, courseFingerprint(run.course));
  scene.ghostTrace = ghost;
  scene.reset();
  changeMode("playing");
  scene.update(run, 0, mode, elapsed);
  updateHud();
  tutorial = !readValue("learned", "");
  tutorialEl.hidden = !tutorial;
  tutorialEl.querySelector("p")!.textContent =
    "Drag left and right with your thumb to carve";
  tutorialEl.querySelector("span")!.hidden = false;
  audio.play("start");
}
el("play").onclick = () => start();
el("endless").onclick = () => start(true);
el("again").onclick = () => start(run.course.endless === true);
el("retry").onclick = () => start(run.course.endless === true);
el("restart").onclick = () => start(run.course.endless === true);
el("next-level").onclick = () => {
  selectLevel(level + 1);
  start();
};
el("pause").onclick = () => changeMode("paused");
el("resume").onclick = () => {
  audio.unlock();
  changeMode("playing");
};
el("quit").onclick = el("finish-menu").onclick = () => {
  run = createRun(level, undefined, progress.lamps);
  refreshHome();
  scene.reset();
  changeMode("menu");
  scene.update(run, 0, mode, elapsed);
};
el("how").onclick = () => changeMode("how");
el("how-close").onclick = () => changeMode("menu");
function openCollection(from: string) {
  collectionReturn = from;
  levelMap.render();
  changeMode("collection");
  el("collection-close").focus();
}
el("collection-open").onclick = () => openCollection("menu");
el("finish-collection").onclick = () => openCollection("finished");
el("collection-close").onclick = () => {
  changeMode(collectionReturn);
  el(
    collectionReturn === "menu" ? "collection-open" : "finish-collection",
  ).focus();
};
levelMap.onSelect = (chosen) => {
  selectLevel(chosen);
  start();
};
input.onSteer = () => {
  steered = true;
  if (!gateHintShown) tutorialEl.hidden = true;
};
document.addEventListener("visibilitychange", () => {
  if (document.hidden && mode === "playing") changeMode("paused");
});
window.addEventListener("blur", () => {
  if (mode === "playing") changeMode("paused");
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && mode === "collection") {
    el("collection-close").click();
    return;
  }
  if (["Escape", "p", "P"].includes(e.key)) {
    if (e.repeat) return;
    e.preventDefault();
    if (mode === "playing") changeMode("paused");
    else if (mode === "paused") {
      audio.unlock();
      changeMode("playing");
    }
  }
});
function soundIcon() {
  el("sound").innerHTML =
    `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z${audio.muted ? "M16 9l5 6M21 9l-5 6" : "M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"}"/></svg>`;
  el("sound").setAttribute(
    "aria-label",
    audio.muted ? "Unmute sound" : "Mute sound",
  );
  el("sound").setAttribute(
    "title",
    audio.muted ? "Unmute sound" : "Mute sound",
  );
  el("sound").setAttribute("aria-pressed", String(audio.muted));
}
el("sound").onclick = () => {
  audio.unlock();
  audio.setMuted(!audio.muted);
  writeValue("muted", String(audio.muted));
  soundIcon();
};
soundIcon();
function event(name: string) {
  if (name === "finish") {
    if (run.course.endless) {
      audio.play("finish");
      newBest = progress.completeEndless(run.score, run.z);
      newlyEarned = false;
      refreshHome();
      finishDelay = 1.8;
      changeMode("celebrating");
      tutorialEl.hidden = true;
      feedback.textContent = `Run over · ${Math.floor(run.z).toLocaleString()} m`;
      feedback.className = "show miss";
      combo.textContent = "";
      feedbackUntil = elapsed + 1.5;
      return;
    }
    audio.play(run.passed ? "finish" : "miss");
    // Slope lamps only join the collection when the level is passed on this run.
    for (const id of lampsKept(run)) if (progress.collect(id)) discoveries++;
    const result = progress.complete(level, run.score, run.passed);
    levelMap.refreshHome();
    newBest = result.newBest;
    newlyEarned = result.newlyEarned;
    if (newBest) saveGhost(level, trace, courseFingerprint(run.course));
    finishDelay = 1.8;
    changeMode("celebrating");
    tutorialEl.hidden = true;
    feedback.textContent = run.passed ? "Level complete!" : "So close!";
    feedback.className = run.passed ? "show" : "show miss";
    combo.textContent = "";
    feedbackUntil = elapsed + 1.5;
    return;
  }
  audio.play(name, run.combo);
  if (name === "lamp") {
    const id = run.course.pickupLampIds[run.lampEvent];
    feedback.textContent = LAMP_CATALOG[id].name;
    feedback.className = "show lamp";
    combo.textContent = `${progress.lamps[id] ? "" : "NEW LAMP · "}${LAMP_CATALOG[id].rarity} · pass to keep it`;
    feedbackUntil = elapsed + 1.1;
    return;
  }
  if (name === "present") {
    feedback.textContent = `Birthday bonus! +${PRESENT_POINTS}`;
    feedback.className = "show lamp";
    feedbackUntil = elapsed + 1.1;
    return;
  }
  if (name === "life") {
    feedback.textContent = "A life back! ♥";
    feedback.className = "show lamp";
    combo.textContent = `${GIFTS_PER_LIFE} gifts caught`;
    feedbackUntil = elapsed + 1.4;
    livesEl.classList.remove("hit");
    return;
  }
  if (!["gate", "miss", "crash"].includes(name)) return;
  feedback.textContent =
    name === "gate"
      ? `+${100 * run.combo + run.gateBonus}${run.gateBonus ? " · BULLSEYE" : ""}`
      : name === "miss"
        ? run.course.endless
          ? `Gate missed · ${Math.max(0, ENDLESS_STRIKES - run.strikes)} left`
          : "Gate missed · the lamp needs every gate"
        : run.course.endless
          ? `A little snow hug! −${CRASH_PENALTY} · ${Math.max(0, ENDLESS_STRIKES - run.strikes)} left`
          : `A little snow hug! −${CRASH_PENALTY}`;
  if (run.course.endless && name !== "gate") {
    // Flash the lives so a lost heart is impossible to miss.
    livesEl.classList.remove("hit");
    void livesEl.offsetWidth;
    livesEl.classList.add("hit");
  }
  feedback.className = name === "gate" ? "show" : "show miss";
  feedbackUntil = elapsed + 1.25;
  combo.textContent =
    name === "gate" && run.combo > 1
      ? `×${run.combo}  ${run.combo === COMBO_CAP ? "MAX COMBO" : "NICE CARVING"}`
      : "";
}
function finish() {
  if (run.course.endless) {
    finishEndless();
    return;
  }
  const course = run.course,
    bonus = course.lampId < 0,
    lamp = bonus ? null : LAMP_CATALOG[course.lampId];
  el("finish-kicker").textContent = run.passed
    ? `Level ${level + 1} ${bonus ? "cleared!" : "complete!"}`
    : `Level ${level + 1} · not quite`;
  el("result-title").textContent = run.passed
    ? bonus
      ? "Beyond the summit."
      : newlyEarned
        ? "A new lamp for Ljubica."
        : "Beautiful run."
    : "The mountain will wait.";
  el("result-level").textContent = `Level ${level + 1} of ${LEVEL_COUNT} · ${course.name}`;
  el("result-time").textContent = formatTime(run.time);
  el("result-score").textContent = run.score.toLocaleString();
  el("result-course-score").textContent = (
    run.score - run.timeBonus
  ).toLocaleString();
  el("result-time-bonus").textContent = `+${run.timeBonus.toLocaleString()}`;
  el("result-par").textContent =
    `${course.timeBonusRate} points per second under ${course.parTime} seconds`;
  el("result-goal").textContent = run.passed
    ? `Every gate cleared · goal ${run.goal.toLocaleString()} reached`
    : run.misses
      ? `${run.misses} gate${run.misses === 1 ? "" : "s"} missed · every gate is needed${run.score < run.goal ? ` · ${(run.goal - run.score).toLocaleString()} short of the goal` : ""}`
      : `Goal ${run.goal.toLocaleString()} · ${(run.goal - run.score).toLocaleString()} short`;
  el("result-goal").className = run.passed ? "result-goal passed" : "result-goal";
  el("result-gates").textContent = `${run.hits} / ${course.gates.length}`;
  el("result-best-label").textContent = "Level best";
  el("result-best").textContent = progress.best[level].toLocaleString();
  const reveal = el("result-lamp");
  reveal.hidden = bonus;
  if (lamp) {
    reveal.className = `result-lamp ${run.passed ? "owned" : "undiscovered"}`;
    reveal.dataset.rarity = lamp.rarity;
    el("result-lamp-art").innerHTML = lampArt(lamp);
    el("result-lamp-name").textContent = run.passed
      ? lamp.name
      : "Pass the level to earn this lamp";
    el("result-lamp-rarity").textContent = run.passed
      ? `${lamp.rarity}${newlyEarned ? " · New!" : " · Earned before"}`
      : lamp.rarity;
  }
  el("result-lamps").textContent = run.lampsAvailable
    ? `${run.lamps} / ${run.lampsAvailable} slope lamps`
    : bonus
      ? "No lamps on this slope"
      : "Every slope lamp here is already yours";
  el("result-found").textContent = bonus
    ? run.passed
      ? `Bonus level cleared · ${progress.clearedCount - 20 > 0 ? progress.clearedCount - 20 : 1} / 10 beyond the summit`
      : "Bonus level · no lamps, no presents, just rock"
    : run.passed
    ? `${discoveries} new lamp${discoveries === 1 ? "" : "s"} kept · ${progress.lampsFound(level)} / 5 for this level · ${progress.earnedCount} / 100 in all`
    : run.lamps
      ? `${run.lamps} slope lamp${run.lamps === 1 ? "" : "s"} picked up but not kept: pass the level to keep them`
      : `${progress.lampsFound(level)} / 5 for this level · ${progress.earnedCount} / 100 in all`;
  el("result-presents").textContent =
    `${run.presents.collected} birthday presents · +${run.presents.collected * PRESENT_POINTS} points`;
  el("result-bullseyes").textContent =
    `${run.bullseyes} bullseyes · +${(run.bullseyes * BULLSEYE_POINTS).toLocaleString()} points${run.crashes ? ` · ${run.crashes} tumble${run.crashes === 1 ? "" : "s"} · −${(run.crashes * CRASH_PENALTY).toLocaleString()}` : ""}`;
  el("new-best").hidden = !newBest;
  const hasNext = run.passed && level + 1 < LEVEL_COUNT;
  el("next-level").hidden = !hasNext;
  // A failed level offers Try again in the same place and style as Next level.
  el("retry").hidden = run.passed;
  el("retry").firstChild!.textContent = "Try again ";
  el("again").hidden = !run.passed;
  const nextCard = el("result-next");
  nextCard.hidden = !hasNext;
  if (hasNext) {
    const next = getCourse(level + 1),
      nextLamp = next.lampId >= 0 ? LAMP_CATALOG[next.lampId] : null;
    el("result-next-title").textContent = `Next: Level ${level + 2} · ${next.name}`;
    el("result-next-hint").textContent = next.hint;
    el("result-next-art").innerHTML = nextLamp ? lampArt(nextLamp) : PEAK_ART;
    el("result-next-art").className = `result-next-art ${nextLamp && progress.lamps[next.lampId] ? "owned" : "undiscovered"}`;
    el("result-next-detail").textContent =
      `${next.gates.length} gates · goal ${next.goal.toLocaleString()} · ${nextLamp ? `${nextLamp.rarity} lamp` : "bonus level, no lamps"}`;
  }
  el("again").textContent = run.passed ? "Ski it again" : "Try again";
  changeMode("finished");
}
function finishEndless() {
  const metres = Math.floor(run.z);
  el("finish-kicker").textContent = "Endless run over";
  el("result-title").textContent = `${metres.toLocaleString()} metres.`;
  el("result-level").textContent = "Endless run · no lamps, presents for bonus";
  el("result-time").textContent = formatTime(run.time);
  el("result-score").textContent = run.score.toLocaleString();
  el("result-course-score").textContent = run.score.toLocaleString();
  el("result-time-bonus").textContent = "+0";
  el("result-par").textContent = "No par on an endless run";
  el("result-goal").textContent =
    `${run.hits} gates · ${run.misses} missed · ${run.crashes} tumble${run.crashes === 1 ? "" : "s"}`;
  el("result-goal").className = "result-goal";
  el("result-found").textContent =
    `Best score ${progress.endlessBest.toLocaleString()} · longest run ${progress.endlessDistance.toLocaleString()} m`;
  el("result-gates").textContent = String(run.hits);
  el("result-best-label").textContent = "Endless best";
  el("result-best").textContent = progress.endlessBest.toLocaleString();
  el("result-lamp").hidden = true;
  el("result-lamps").textContent = "No lamps on the endless run";
  el("result-presents").textContent =
    `${run.presents.collected} birthday presents · +${run.presents.collected * PRESENT_POINTS} points · ${Math.floor(run.presents.collected / GIFTS_PER_LIFE)} ${Math.floor(run.presents.collected / GIFTS_PER_LIFE) === 1 ? "life" : "lives"} won back`;
  el("result-bullseyes").textContent =
    `${run.bullseyes} bullseyes · +${(run.bullseyes * BULLSEYE_POINTS).toLocaleString()} points${run.crashes ? ` · −${(run.crashes * CRASH_PENALTY).toLocaleString()} for tumbles` : ""}`;
  el("new-best").hidden = !newBest;
  el("next-level").hidden = true;
  el("result-next").hidden = true;
  el("retry").hidden = false;
  el("retry").firstChild!.textContent = "Ski again ";
  el("again").hidden = true;
  changeMode("finished");
}
try {
  scene = new SkiScene(canvas);
  scene.update(run, 0, mode, 0);
  let last = performance.now(),
    accumulator = 0;
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    if (mode === "playing") changeMode("paused");
    el("error-message").textContent =
      "The graphics session was interrupted. Tap Try again to reload the mountain. Your progress is safe.";
    el("error").hidden = false;
  });
  const frame = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (document.hidden) {
      requestAnimationFrame(frame);
      return;
    }
    if (mode !== "paused") elapsed += dt;
    if (mode === "playing") {
      accumulator += dt;
      while (accumulator >= 1 / 120 && mode === "playing") {
        stepRun(run, -input.update(1 / 120), 1 / 120);
        recordSample(trace, run);
        if (run.lampEvent >= 0) event("lamp");
        if (run.presents.event) event("present");
        if (run.lifeEvent) event("life");
        if (run.event) event(run.event);
        accumulator -= 1 / 120;
      }
      updateHud();
      if (tutorial && run.z > 24 && !gateHintShown) {
        gateHintShown = true;
        tutorialEl.hidden = false;
        tutorialEl.querySelector("span")!.hidden = true;
        tutorialEl.querySelector("p")!.textContent =
          "Pass between the matching flags";
      }
      if (tutorial && run.nextGate > 0) {
        tutorialEl.hidden = true;
        if (steered) writeValue("learned", "true");
        tutorial = false;
      }
      el("steering").hidden = !input.engaged;
      (el("steering").querySelector("b") as HTMLElement).style.transform =
        `translateX(${input.value * 38}px)`;
      audio.update(run, mode === "playing");
    } else accumulator = 0;
    if (mode === "celebrating") {
      finishDelay -= dt;
      if (finishDelay <= 0) finish();
    }
    if (elapsed > feedbackUntil) feedback.className = "";
    if (mode !== "collection") scene.update(run, dt, mode, elapsed);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
} catch (error) {
  el("error-message").textContent =
    "The game needs WebGL. Please try a current Safari or Chrome browser with graphics acceleration enabled.";
  el("error").hidden = false;
  console.error(error);
}
setupPwa(el("update-app") as HTMLButtonElement);
