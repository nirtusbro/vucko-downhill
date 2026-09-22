import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SkiInput } from "../src/input";

class Surface extends EventTarget {
  captured = new Set<number>();
  setPointerCapture(id: number) {
    this.captured.add(id);
  }
  hasPointerCapture(id: number) {
    return this.captured.has(id);
  }
  releasePointerCapture(id: number) {
    this.captured.delete(id);
  }
}
function pointer(surface: EventTarget, type: string, id: number, x: number) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, {
    pointerId: id,
    pointerType: "touch",
    button: 0,
    clientX: x,
    clientY: 600,
  });
  surface.dispatchEvent(event);
}
describe("two-thumb controls", () => {
  let canvas: Surface,
    button: Surface,
    windowTarget: EventTarget,
    input: SkiInput;
  beforeEach(() => {
    windowTarget = new EventTarget();
    vi.stubGlobal("window", windowTarget);
    vi.stubGlobal("innerHeight", 844);
    vi.stubGlobal("innerWidth", 390);
    canvas = new Surface();
    button = new Surface();
    input = new SkiInput(
      canvas as unknown as HTMLCanvasElement,
      button as unknown as HTMLButtonElement,
    );
    input.enabled = true;
  });
  afterEach(() => vi.unstubAllGlobals());
  it("holds boost with the left thumb while the right thumb steers independently", () => {
    pointer(button, "pointerdown", 1, 60);
    pointer(canvas, "pointerdown", 2, 280);
    pointer(canvas, "pointermove", 2, 340);
    expect(input.boosting).toBe(true);
    expect(input.update(0.1)).toBeGreaterThan(0.3);
    pointer(button, "pointerup", 1, 60);
    expect(input.boosting).toBe(false);
    expect(input.engaged).toBe(true);
    expect(input.update(0.1)).toBeGreaterThan(0.3);
  });
  it("can start boost after steering and releasing steering does not cancel boost", () => {
    pointer(canvas, "pointerdown", 2, 280);
    pointer(button, "pointerdown", 1, 60);
    pointer(canvas, "pointercancel", 2, 280);
    expect(input.engaged).toBe(false);
    expect(input.boosting).toBe(true);
    pointer(button, "lostpointercapture", 1, 60);
    expect(input.boosting).toBe(false);
  });
  it("clears both touches on pause/reset and ignores input while disabled", () => {
    pointer(canvas, "pointerdown", 2, 280);
    pointer(button, "pointerdown", 1, 60);
    input.reset();
    input.enabled = false;
    expect(input.boosting).toBe(false);
    expect(canvas.captured.size + button.captured.size).toBe(0);
    pointer(button, "pointerdown", 3, 60);
    expect(input.boosting).toBe(false);
  });
  it("supports holding Space and releases it on keyup or window blur", () => {
    const key = (type: string) => {
      const event = new Event(type, { cancelable: true });
      Object.assign(event, { key: " " });
      windowTarget.dispatchEvent(event);
    };
    key("keydown");
    expect(input.boosting).toBe(true);
    key("keyup");
    expect(input.boosting).toBe(false);
    key("keydown");
    windowTarget.dispatchEvent(new Event("blur"));
    expect(input.boosting).toBe(false);
  });
});
