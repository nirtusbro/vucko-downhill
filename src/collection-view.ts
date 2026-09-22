import { LampCollection } from "./collection";
import { LAMP_CATALOG } from "./lamp-catalog";
import { lampArt } from "./lamp-art";

export class CollectionView {
  private grid = document.getElementById("collection-grid")!;
  private status = document.getElementById(
    "collection-filter",
  ) as HTMLSelectElement;
  private rarity = document.getElementById(
    "rarity-filter",
  ) as HTMLSelectElement;
  constructor(private collection: LampCollection) {
    this.status.addEventListener("change", () => this.render());
    this.rarity.addEventListener("change", () => this.render());
    this.refreshHome();
  }
  refreshHome() {
    document.getElementById("collection-total")!.textContent =
      `${this.collection.discovered} / 100 found`;
    const found = LAMP_CATALOG.filter(
      (lamp) => this.collection.counts[lamp.id] > 0,
    );
    const preview = [...found.slice(-4)];
    for (const lamp of LAMP_CATALOG) {
      if (preview.length === 4) break;
      if (!preview.includes(lamp)) preview.push(lamp);
    }
    document.getElementById("shelf-preview")!.innerHTML = preview
      .map(
        (lamp) =>
          `<span class="shelf-lamp ${this.collection.counts[lamp.id] ? "owned" : "undiscovered"}">${lampArt(lamp)}</span>`,
      )
      .join("");
  }
  render() {
    const discovered = this.collection.discovered;
    document.getElementById("catalog-progress")!.textContent =
      `${discovered} / 100`;
    document.getElementById("catalog-progress-bar")!.style.width =
      `${discovered}%`;
    document.getElementById("collection-intro")!.textContent =
      discovered === 100
        ? "Every little light, found. Your collection is complete!"
        : "A hundred little lights to bring home. Find new designs on every run.";
    const visible = LAMP_CATALOG.filter((lamp) => {
      const owned = this.collection.counts[lamp.id] > 0;
      return (
        (this.status.value === "all" ||
          (this.status.value === "found" ? owned : !owned)) &&
        (this.rarity.value === "all" || lamp.rarity === this.rarity.value)
      );
    });
    document.getElementById("collection-empty")!.hidden = visible.length > 0;
    this.grid.innerHTML = visible
      .map((lamp) => {
        const count = this.collection.counts[lamp.id],
          owned = count > 0;
        return `<article class="catalog-lamp ${owned ? "owned" : "undiscovered"}" data-rarity="${lamp.rarity}">
        <div class="lamp-number">${String(lamp.id + 1).padStart(3, "0")}<span>${owned ? `×${count}` : "?"}</span></div>
        ${lampArt(lamp)}<h3>${owned ? lamp.name : "Undiscovered"}</h3><span class="rarity-tag">${lamp.rarity}</span>
        <span class="sr-only">${owned ? `${count} collected` : "Not yet collected; black silhouette"}</span></article>`;
      })
      .join("");
  }
}
