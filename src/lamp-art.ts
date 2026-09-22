import type { LampDesign } from "./lamp-catalog";
import { LAMP_BLUEPRINTS } from "./lamp-designs";

/** Both the illustration and the slope model read the same structural blueprint. */
export function lampArt(lamp: LampDesign) {
  const colors = { body: lamp.color, accent: lamp.accent, metal: lamp.trim, light: lamp.accent };
  const parts = LAMP_BLUEPRINTS[lamp.id].parts.map((part) => {
    const color = colors[part.tone];
    switch (part.kind) {
      case "ellipse":
        return `<ellipse cx="${part.x}" cy="${part.y}" rx="${part.rx}" ry="${part.ry}" fill="${color}"/>`;
      case "rect":
        return `<rect x="${part.x}" y="${part.y}" width="${part.w}" height="${part.h}" fill="${color}"/>`;
      case "polygon":
        return `<polygon points="${part.points.join(" ")}" fill="${color}"/>`;
      case "line":
        return `<polyline points="${part.points.join(" ")}" fill="none" stroke="${color}" stroke-width="${part.stroke}" stroke-linecap="round" stroke-linejoin="round"/>`;
      case "ring":
        return `<ellipse cx="${part.x}" cy="${part.y}" rx="${part.rx}" ry="${part.ry}" fill="none" stroke="${color}" stroke-width="${part.stroke}"/>`;
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" class="lamp-art" viewBox="0 0 80 88" aria-hidden="true">${parts.join("")}</svg>`;
}
