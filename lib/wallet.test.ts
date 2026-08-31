import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildAccessPassSummaries,
  formatTicketHolderName,
  isMobileDevice,
  isToday,
  unwrapOrder,
} from "@/lib/wallet";
import { demoAccessPass } from "@/lib/demo/fixtures";

describe("unwrapOrder", () => {
  it("reads the order whether it comes bare, wrapped, or in a list", () => {
    const order = { orderId: "1474-023249-8851", total: 452.2 };

    expect(unwrapOrder(order)).toBe(order);
    expect(unwrapOrder({ data: order })).toBe(order);
    expect(unwrapOrder([order])).toBe(order);
  });

  it("returns nothing when the order is missing", () => {
    expect(unwrapOrder({ data: null })).toBeNull();
    expect(unwrapOrder(null)).toBeNull();
  });
});

describe("buildAccessPassSummaries", () => {
  it("keeps the purchase order id on the pass", () => {
    const pass = demoAccessPass();
    expect(buildAccessPassSummaries([pass])[0].orderId).toBe(pass.orderId);
  });
});

describe("formatTicketHolderName", () => {
  it("renders the buyer's first and last name as 'Joe Doe'", () => {
    expect(
      formatTicketHolderName({
        firstName: "joe",
        lastName: "DOE",
        email: "joedoe@example.com",
      }),
    ).toBe("Joe Doe");
  });

  it("falls back to the email only when no name is on the order", () => {
    expect(formatTicketHolderName({ email: "jaimeconvery@example.com" })).toBe(
      "jaimeconvery@example.com",
    );
    expect(formatTicketHolderName({})).toBe("Guest");
  });
});

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
