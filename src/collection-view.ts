import { LAMPS_PER_LEVEL, LAMP_LEVELS, LEVEL_COUNT, getCourse, levelLamps } from "./levels";
import { LAMP_CATALOG } from "./lamp-catalog";
import { lampArt } from "./lamp-art";
import type { LevelProgress } from "./progress";

/** The level ladder: each level lists its five lamps, finish lamp first. */
export class LevelMap {
  onSelect: (level: number) => void = () => {};
  private grid = document.getElementById("collection-grid")!;
  private status = document.getElementById(
    "collection-filter",
  ) as HTMLSelectElement;
  private rarity = document.getElementById(
    "rarity-filter",
  ) as HTMLSelectElement;
  constructor(private progress: LevelProgress) {
    this.status.addEventListener("change", () => this.render());
    this.rarity.addEventListener("change", () => this.render());
    this.grid.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest<HTMLElement>(
        "[data-level]",
      );
      if (!button || button.hasAttribute("disabled")) return;
      this.onSelect(Number(button.dataset.level));
    });
    this.refreshHome();
  }
  /** Home-screen strip: the last lamps found and the next one still dark. */
  refreshHome() {
    document.getElementById("collection-total")!.textContent =
      `${this.progress.earnedCount} / ${LAMP_CATALOG.length} found`;
    const found = LAMP_CATALOG.filter((lamp) => this.progress.lamps[lamp.id]);
    const preview = found.slice(-3);
    for (const lamp of LAMP_CATALOG) {
      if (preview.length === 4) break;
      if (!this.progress.lamps[lamp.id]) preview.push(lamp);
    }
    document.getElementById("shelf-preview")!.innerHTML = preview
      .map(
        (lamp) =>
          `<span class="shelf-lamp ${this.progress.lamps[lamp.id] ? "owned" : "undiscovered"}">${lampArt(lamp)}</span>`,
      )
      .join("");
  }
  render() {
    const found = this.progress.earnedCount;
    document.getElementById("catalog-progress")!.textContent =
      `${found} / ${LAMP_CATALOG.length}`;
    document.getElementById("catalog-progress-bar")!.style.width = `${found}%`;
    document.getElementById("collection-intro")!.textContent =
      found === LAMP_CATALOG.length
        ? "Every little light, found. The whole mountain is yours!"
        : `Twenty levels, five lamps each. Pick up four on the slope and earn the fifth by passing the level, which keeps the pickups and opens the next level. Level ${this.progress.unlocked + 1} is waiting.`;
    const wanted = (id: number) => {
      const owned = this.progress.lamps[id];
      return (
        (this.status.value === "all" ||
          (this.status.value === "found" ? owned : !owned)) &&
        (this.rarity.value === "all" || LAMP_CATALOG[id].rarity === this.rarity.value)
      );
    };
    const sections: string[] = [];
    for (let level = 0; level < LAMP_LEVELS; level++) {
      const { pickups, finish } = levelLamps(level);
      const ids = [finish, ...pickups].filter(wanted);
      if (!ids.length) continue;
      const unlocked = this.progress.isUnlocked(level),
        current = !this.progress.passed(level) && level === this.progress.unlocked;
      const best = this.progress.best[level];
      const cards = ids
        .map((id) => {
          const lamp = LAMP_CATALOG[id],
            owned = this.progress.lamps[id];
          return `<div class="catalog-lamp ${owned ? "owned" : "undiscovered"}${unlocked ? "" : " locked"}" data-rarity="${lamp.rarity}">
          <div class="lamp-number">${id === finish ? "Finish lamp" : "On the slope"}<span>${owned ? "Found" : unlocked ? "" : "Locked"}</span></div>
          ${lampArt(lamp)}<h3>${owned ? lamp.name : id === finish ? "Reach the goal" : "Find it on the slope"}</h3><span class="rarity-tag">${lamp.rarity}</span></div>`;
        })
        .join("");
      sections.push(`<section class="level-group${current ? " current" : ""}${unlocked ? "" : " locked"}" aria-label="Level ${level + 1}">
        <div class="level-head">
          <span class="level-head-title">Level ${level + 1} · ${getCourse(level).name}${current ? " · Next" : ""}</span>
          <span class="level-head-detail">${this.progress.lampsFound(level)} / ${LAMPS_PER_LEVEL} lamps${best ? ` · Best ${best.toLocaleString()}` : unlocked ? ` · Goal ${getCourse(level).goal.toLocaleString()}` : ""}</span>
          <button class="level-play" data-level="${level}" ${unlocked ? "" : "disabled"}>${unlocked ? "Ski ↗" : "Locked"}</button>
        </div>
        <div class="level-lamps">${cards}</div>
      </section>`);
    }
    // Beyond the summit: the bonus levels, listed once the filters are off.
    if (this.status.value === "all" && this.rarity.value === "all") {
      const buttons: string[] = [];
      let cleared = 0;
      for (let level = LAMP_LEVELS; level < LEVEL_COUNT; level++) {
        const unlocked = this.progress.isUnlocked(level),
          done = this.progress.passed(level),
          current = !done && level === this.progress.unlocked,
          best = this.progress.best[level];
        if (done) cleared++;
        buttons.push(`<button class="bonus-play${done ? " cleared" : current ? " current" : ""}" data-level="${level}" ${unlocked ? "" : "disabled"} aria-label="Level ${level + 1}, ${getCourse(level).name}, ${done ? "cleared" : unlocked ? "ready to ski" : "locked"}">
          <strong>${level + 1} · ${getCourse(level).name}</strong><small>${done ? `Cleared · best ${best.toLocaleString()}` : unlocked ? `Goal ${getCourse(level).goal.toLocaleString()}` : "Locked"}</small></button>`);
      }
      sections.push(`<section class="level-group bonus-group${this.progress.unlocked >= LAMP_LEVELS ? "" : " locked"}" aria-label="Beyond the summit">
        <div class="level-head">
          <span class="level-head-title">Beyond the summit</span>
          <span class="level-head-detail">Ten bonus levels for those who really want to. No lamps, no presents, just rock. ${cleared} / ${LEVEL_COUNT - LAMP_LEVELS} cleared</span>
        </div>
        <div class="bonus-levels">${buttons.join("")}</div>
      </section>`);
    }
    document.getElementById("collection-empty")!.hidden = sections.length > 0;
    this.grid.innerHTML = sections.join("");
  }
}
