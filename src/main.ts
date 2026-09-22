import "./style.css";
import { createRun, stepRun, FINISH_Z, GATES } from "./physics";
import { SkiInput } from "./input";
import { SkiScene } from "./scene";
import { SkiAudio } from "./audio";
import { readBest, readValue, writeValue } from "./storage";
import { DIFFICULTIES, parseDifficulty } from "./difficulty";
import { PRESENT_POINTS } from "./presents";
import { LampCollection, LAMP_NAMES } from "./collection";

const el = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const canvas = el<HTMLCanvasElement>("game");
const input = new SkiInput(canvas);
const collection = new LampCollection();
function refreshCollection() {
  const total = collection.counts.reduce((sum, count) => sum + count, 0);
  el("collection-total").textContent = total
    ? `${total.toLocaleString()} collected`
    : "Bring home a little light";
  collection.counts.forEach((count, style) => {
    const slot = el(`shelf-lamp-${style}`);
    slot.classList.toggle("owned", count > 0);
    slot.setAttribute("aria-label", `${LAMP_NAMES[style]}: ${count} collected`);
    slot.setAttribute("title", `${LAMP_NAMES[style]} · ${count} collected`);
    slot.querySelector("strong")!.textContent = count
      ? `×${count.toLocaleString()}`
      : "—";
  });
}
refreshCollection();
let selectedDifficulty = parseDifficulty(readValue("difficulty", "classic"));
let run = createRun(selectedDifficulty);
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
  el("difficulty-best").textContent =
    `Best ${readBest(selectedDifficulty).toLocaleString()}`;
}
document
  .querySelectorAll<HTMLInputElement>('input[name="difficulty"]')
  .forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      selectedDifficulty = parseDifficulty(input.value);
      writeValue("difficulty", selectedDifficulty);
      run = createRun(selectedDifficulty);
      best = readBest(selectedDifficulty);
      refreshDifficulty();
    });
  });
refreshDifficulty();
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
  ])
    el(id).hidden = true;
  const screen = el(
    next === "playing" || next === "celebrating"
      ? "hud"
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
  audio.update(run, next === "playing");
}
function updateHud() {
  timeEl.textContent = formatTime(run.time);
  scoreEl.textContent = run.score.toLocaleString();
  lampsEl.textContent = `${run.lamps} / 20`;
  el("present-count").textContent = String(run.presents.collected);
  gatesEl.textContent = `${run.hits} / ${GATES.length}`;
  progressEl.style.width = `${(run.z / FINISH_Z) * 100}%`;
  speedEl.innerHTML = `${Math.round(run.speed * 3.6)} <small>km/h</small>`;
}
function start() {
  if (!scene) return;
  audio.unlock();
  run = createRun(selectedDifficulty);
  best = readBest(selectedDifficulty);
  el("run-difficulty").textContent = DIFFICULTIES[run.difficulty].label;
  finishDelay = 0;
  steered = false;
  gateHintShown = false;
  feedbackUntil = 0;
  feedback.className = "";
  feedback.textContent = "";
  combo.textContent = "";
  scene.reset();
  changeMode("playing");
  scene.update(run, 0, mode, elapsed);
  updateHud();
  tutorial = !readValue("learned", "");
  tutorialEl.hidden = !tutorial;
  tutorialEl.querySelector("p")!.textContent = "Drag left and right to carve";
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
  run = createRun(selectedDifficulty);
  refreshDifficulty();
  scene.reset();
  changeMode("menu");
  scene.update(run, 0, mode, elapsed);
};
el("how").onclick = () => changeMode("how");
el("how-close").onclick = () => changeMode("menu");
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
        : "Lovely lamp! +50";
    feedback.className = "show lamp";
    feedbackUntil = elapsed + 1.1;
    return;
  }
  if (!["gate", "miss", "crash"].includes(name)) return;
  feedback.textContent =
    name === "gate"
      ? `+${100 * run.combo}`
      : name === "miss"
        ? "Next one is yours"
        : "A little snow hug!";
  feedback.className = name === "gate" ? "show" : "show miss";
  feedbackUntil = elapsed + 1.25;
  combo.textContent =
    name === "gate" && run.combo > 1 ? `×${run.combo}  NICE CARVING` : "";
}
function finish() {
  el("result-difficulty").textContent = DIFFICULTIES[run.difficulty].label;
  el("result-best-label").textContent =
    `${DIFFICULTIES[run.difficulty].label} best`;
  el("result-time").textContent = formatTime(run.time);
  el("result-score").textContent = run.score.toLocaleString();
  el("result-gates").textContent = `${run.hits} / 20`;
  el("result-best").textContent = best.toLocaleString();
  el("result-lamps").textContent = `${run.lamps} / 20 lovely lamps`;
  el("result-presents").textContent =
    `${run.presents.collected} birthday presents · +${run.presents.collected * PRESENT_POINTS} points`;
  el("new-best").hidden = !newBest;
  el("finish-kicker").textContent =
    run.lamps === 20
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
        stepRun(run, -input.update(1 / 120), 1 / 120);
        if (run.lampEvent >= 0) {
          collection.add(run.lampEvent);
          refreshCollection();
          event("lamp");
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
    scene.update(run, dt, mode, elapsed);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
} catch (error) {
  el("error-message").textContent =
    "The game needs WebGL. Please try a current Safari or Chrome browser with graphics acceleration enabled.";
  el("error").hidden = false;
  console.error(error);
}
