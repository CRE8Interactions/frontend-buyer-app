import { afterEach, describe, expect, it, vi } from "vitest";
import { isMobileDevice, isToday } from "@/lib/wallet";

describe("isToday", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses the event timezone instead of the browser clock zone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-15T18:00:00.000Z"));

    expect(isToday("2026-08-16T01:35:00.000Z", "America/Denver")).toBe(true);
    expect(isToday("2026-08-17T01:35:00.000Z", "America/Denver")).toBe(false);
  });
});

describe("isMobileDevice", () => {
  function stubPointer(matches: Record<string, boolean>, touchPoints: number) {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: (query: string) =>
        ({ matches: Boolean(matches[query]) }) as MediaQueryList,
    });
    Object.defineProperty(navigator, "maxTouchPoints", {
      configurable: true,
      writable: true,
      value: touchPoints,
    });
  }

  afterEach(() => {
    Reflect.deleteProperty(window, "matchMedia");
    Reflect.deleteProperty(navigator, "maxTouchPoints");
  });

  it("reads a phone or tablet as a mobile device", () => {
    stubPointer({ "(pointer: coarse)": true }, 5);

    expect(isMobileDevice()).toBe(true);
  });

  it("reads a touchscreen laptop as a desktop", () => {
    stubPointer({ "(pointer: coarse)": false, "(hover: hover)": true }, 10);

    expect(isMobileDevice()).toBe(false);
  });
});
