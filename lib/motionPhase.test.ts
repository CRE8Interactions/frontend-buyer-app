import { afterEach, describe, expect, it, vi } from "vitest";
import { motionPhase } from "@/lib/motionPhase";

describe("motionPhase", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lines a new spinner up with the document clock", () => {
    vi.spyOn(performance, "now").mockReturnValue(2300);
    const el = document.createElement("div");

    motionPhase(800)(el);

    expect(el.style.animationDelay).toBe("-700ms");
  });

  it("does not shift a running spinner again when its ref re-runs on a re-render", () => {
    const now = vi.spyOn(performance, "now").mockReturnValue(2300);
    const el = document.createElement("div");
    motionPhase(800)(el);

    now.mockReturnValue(5150);
    motionPhase(800)(el);

    expect(el.style.animationDelay).toBe("-700ms");
  });
});
