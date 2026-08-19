import { afterEach, describe, expect, it, vi } from "vitest";
import { isToday } from "@/lib/wallet";

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
