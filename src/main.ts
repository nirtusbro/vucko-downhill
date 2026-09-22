import "./style.css";
import "./collection.css";
import {
  createRun,
  stepRun,
  lampScore,
  BULLSEYE_POINTS,
  COMBO_CAP,
  FINISH_Z,
  GATES,
  LAMPS_PER_RUN,
} from "./physics";
import {
  loadGhost,
  paceDelta,
  recordSample,
  saveGhost,
  type Trace,
} from "./ghost";
import { SkiInput } from "./input";
import { SkiScene } from "./scene";
import { SkiAudio } from "./audio";
import { readBest, readValue, writeValue } from "./storage";
import { DIFFICULTIES, parseDifficulty } from "./difficulty";
import { PRESENT_POINTS } from "./presents";
import { LampCollection } from "./collection";
import { CollectionView } from "./collection-view";
import { LAMP_CATALOG, lampPoints } from "./lamp-catalog";

const el = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const canvas = el<HTMLCanvasElement>("game");
const boostButton = el<HTMLButtonElement>("boost");
const input = new SkiInput(canvas, boostButton);
const collection = new LampCollection();
const collectionView = new CollectionView(collection);
let discoveries = 0;
let collectionReturn = "menu";
let selectedDifficulty = parseDifficulty(readValue("difficulty", "classic"));
let run = createRun(selectedDifficulty, undefined, collection.counts);
let mode = "menu";
let scene: SkiScene;
const audio = new SkiAudio();
audio.muted = readValue("muted", "false") === "true";
let best = readBest(selectedDifficulty);
let tutorial = !readValue("learned", "");
let steered = false;
let gateHintShown = false;
let feedbackUntil = 0;
let finishDelay = 0;
let newBest = false;
let elapsed = 0;
let trace: Trace = [];
let ghost: Trace | null = loadGhost(selectedDifficulty);
const paceEl = el("pace");
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
function refreshDifficulty() {
  document
    .querySelectorAll<HTMLInputElement>('input[name="difficulty"]')
    .forEach((input) => {
      input.checked = input.value === selectedDifficulty;
    });
  el("difficulty-detail").textContent =
    DIFFICULTIES[selectedDifficulty].description;
  el("home-high-score").textContent =
    readBest(selectedDifficulty).toLocaleString();
  el("high-score-mode").textContent = DIFFICULTIES[selectedDifficulty].label;
}
document
  .querySelectorAll<HTMLInputElement>('input[name="difficulty"]')
  .forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      selectedDifficulty = parseDifficulty(input.value);
      writeValue("difficulty", selectedDifficulty);
      run = createRun(selectedDifficulty, undefined, collection.counts);
      best = readBest(selectedDifficulty);
      ghost = loadGhost(selectedDifficulty);
      refreshDifficulty();
    });
  });
refreshDifficulty();
function changeMode(next: string) {
  mode = next;
  input.enabled = mode === "playing";
  input.reset();
  run.boosting = false;
  boostButton.classList.remove("active");
  boostButton.setAttribute("aria-pressed", "false");
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
  lampsEl.textContent = `${run.lamps} / ${LAMPS_PER_RUN}`;
  el("present-count").textContent = String(run.presents.collected);
  gatesEl.textContent = `${run.hits} / ${GATES.length}`;
  progressEl.style.width = `${(run.z / FINISH_Z) * 100}%`;
  speedEl.innerHTML = `${Math.round(run.speed * 3.6)} <small>km/h</small>`;
  boostButton.classList.toggle("active", run.boosting);
  boostButton.setAttribute("aria-pressed", String(run.boosting));
  el("boost-label").textContent = run.boosting ? "Boosting" : "Speed up";
}
function start() {
  if (!scene) return;
  audio.unlock();
  run = createRun(selectedDifficulty, undefined, collection.counts);
  best = readBest(selectedDifficulty);
  el("run-difficulty").textContent = DIFFICULTIES[run.difficulty].label;
  discoveries = 0;
  finishDelay = 0;
  steered = false;
  gateHintShown = false;
  feedbackUntil = 0;
  feedback.className = "";
  feedback.textContent = "";
  combo.textContent = "";
  trace = [];
  ghost = loadGhost(selectedDifficulty);
  scene.ghostTrace = ghost;
  scene.reset();
  changeMode("playing");
  scene.update(run, 0, mode, elapsed);
  updateHud();
  tutorial = !readValue("learned", "");
  tutorialEl.hidden = !tutorial;
  tutorialEl.querySelector("p")!.textContent =
    "Right thumb to steer · hold Speed up with your left";
  tutorialEl.querySelector("span")!.hidden = false;
  audio.play("start");
}
el("play").onclick = start;
el("again").onclick = start;
el("restart").onclick = start;
el("pause").onclick = () => changeMode("paused");
el("resume").onclick = () => {
  audio.unlock();
  changeMode("playing");
};
el("quit").onclick = el("finish-menu").onclick = () => {
  run = createRun(selectedDifficulty, undefined, collection.counts);
  refreshDifficulty();
  scene.reset();
  changeMode("menu");
  scene.update(run, 0, mode, elapsed);
};
el("how").onclick = () => changeMode("how");
el("how-close").onclick = () => changeMode("menu");
function openCollection(from: string) {
  collectionReturn = from;
  collectionView.render();
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
  audio.play(name, run.combo);
  if (name === "finish") {
    best = readBest(run.difficulty);
    newBest = run.score > best;
    best = Math.max(best, run.score);
    writeValue(`best:${run.difficulty}`, String(best));
    if (newBest) saveGhost(run.difficulty, trace);
    finishDelay = 1.8;
    changeMode("celebrating");
    tutorialEl.hidden = true;
    feedback.textContent = "What a run!";
    feedback.className = "show";
    combo.textContent = "";
    feedbackUntil = elapsed + 1.5;
    return;
  }
  if (name === "lamp" || name === "present") {
    feedback.textContent =
      name === "present"
        ? `Birthday bonus! +${PRESENT_POINTS}`
        : `${LAMP_CATALOG[run.lampIds[run.lampEvent]].name} +${lampPoints(run.lampIds[run.lampEvent])}`;
    feedback.className = "show lamp";
    feedbackUntil = elapsed + 1.1;
    return;
  }
  if (!["gate", "miss", "crash"].includes(name)) return;
  feedback.textContent =
    name === "gate"
      ? `+${100 * run.combo + run.gateBonus}${run.gateBonus ? " · BULLSEYE" : ""}`
      : name === "miss"
        ? "Next one is yours"
        : "A little snow hug!";
  feedback.className = name === "gate" ? "show" : "show miss";
  feedbackUntil = elapsed + 1.25;
  combo.textContent =
    name === "gate" && run.combo > 1
      ? `×${run.combo}  ${run.combo === COMBO_CAP ? "MAX COMBO" : "NICE CARVING"}`
      : "";
}
function finish() {
  el("result-difficulty").textContent = DIFFICULTIES[run.difficulty].label;
  el("result-best-label").textContent =
    `${DIFFICULTIES[run.difficulty].label} best`;
  el("result-time").textContent = formatTime(run.time);
  el("result-score").textContent = run.score.toLocaleString();
  el("result-course-score").textContent = (
    run.score - run.timeBonus
  ).toLocaleString();
  el("result-time-bonus").textContent = `+${run.timeBonus.toLocaleString()}`;
  el("result-discoveries").textContent =
    `${discoveries} new discoveries · ${collection.discovered} / 100 lamps found`;
  el("result-gates").textContent = `${run.hits} / 20`;
  el("result-best").textContent = best.toLocaleString();
  el("result-lamps").textContent =
    `${run.lamps} / ${LAMPS_PER_RUN} lovely lamps · +${lampScore(run).toLocaleString()} points`;
  el("result-bullseyes").textContent =
    `${run.bullseyes} bullseyes · +${(run.bullseyes * BULLSEYE_POINTS).toLocaleString()} points`;
  el("result-presents").textContent =
    `${run.presents.collected} birthday presents · +${run.presents.collected * PRESENT_POINTS} points`;
  el("new-best").hidden = !newBest;
  el("finish-kicker").textContent =
    run.lamps === LAMPS_PER_RUN
      ? "Every little light, just for you. Happy birthday!"
      : "A little more light for your birthday, Ljubica.";
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
      "The graphics session was interrupted. Tap Try again to reload the mountain. Your saved best score is safe.";
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
        stepRun(run, -input.update(1 / 120), 1 / 120, input.boosting);
        recordSample(trace, run);
        if (run.lampEvent >= 0) {
          const id = run.lampIds[run.lampEvent];
          const isNew = collection.add(id);
          if (isNew) discoveries++;
          collectionView.refreshHome();
          event("lamp");
          combo.textContent = `${isNew ? "NEW DISCOVERY · " : ""}${LAMP_CATALOG[id].rarity}`;
        }
        if (run.presents.event) event("present");
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
