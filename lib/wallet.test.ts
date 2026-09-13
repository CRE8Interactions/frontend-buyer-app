import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildAccessPassSummaries,
  formatPassDateRange,
  formatSeatNumberRanges,
  formatTicketHolderName,
  gaTicketSeatLine,
  groupedWalletSeatLines,
  isScannedTicket,
  seatLabel,
  transferGroupLabel,
  transferSeatChip,
  isMobileDevice,
  isPhoneDevice,
  isTabletDevice,
  isEventComplete,
  isToday,
  isUpcomingEvent,
  isWalletListedEvent,
  unwrapOrder,
  type AccessPassLike,
} from "@/lib/wallet";
import { demoAccessPass, demoPackageAccessPass } from "@/lib/demo/fixtures";

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

  it("carries the pass holder email for the card name", () => {
    const pass = demoPackageAccessPass() as AccessPassLike;

    expect(buildAccessPassSummaries([pass])[0].holderEmail).toBe(pass.email);
    expect(
      buildAccessPassSummaries([
        demoPackageAccessPass({ email: "" }) as AccessPassLike,
      ])[0].holderEmail,
    ).toBeUndefined();
  });

  it("only keeps a revoked pass when inactive passes are included", () => {
    const revoked = { ...demoAccessPass(), status: "revoked" };

    expect(buildAccessPassSummaries([revoked])).toEqual([]);
    expect(
      buildAccessPassSummaries([revoked], { includeInactive: true })[0].status,
    ).toBe("Revoked");
  });
});

describe("gaTicketSeatLine", () => {
  it("uses sectionNumber when sectionName is General Admission", () => {
    expect(
      gaTicketSeatLine({
        generalAdmission: true,
        sectionName: "General Admission",
        sectionNumber: "Club",
        offerName: "General admission",
      }),
    ).toBe("Sec Club");
  });

  it("includes the row when present", () => {
    expect(
      gaTicketSeatLine({
        generalAdmission: true,
        sectionNumber: "N",
        rowNumber: "I",
      }),
    ).toBe("Sec N · Row I");
  });

  it("includes an actual seat number when present", () => {
    expect(
      gaTicketSeatLine({
        generalAdmission: true,
        sectionNumber: "N",
        seatNumber: 12,
      }),
    ).toBe("Sec N · Seat 12");
  });

  it("falls back to GA when no concrete section or row exists", () => {
    expect(
      gaTicketSeatLine({
        generalAdmission: true,
        sectionName: "General Admission",
        offerName: "General admission",
      }),
    ).toBe("GA");
  });
});

describe("formatSeatNumberRanges", () => {
  it("collapses consecutive seat numbers", () => {
    expect(formatSeatNumberRanges([6, 7, 8, 9, 10])).toBe("6-10");
  });

  it("lists non-consecutive seat numbers", () => {
    expect(formatSeatNumberRanges([6, 10, 11])).toBe("6, 10-11");
  });

  it("returns a single seat number", () => {
    expect(formatSeatNumberRanges([6])).toBe("6");
  });
});

describe("groupedWalletSeatLines", () => {
  it("groups reserved seats by section and row", () => {
    expect(
      groupedWalletSeatLines([
        { sectionNumber: "G", rowNumber: 25, seatNumber: 6 },
        { sectionNumber: "G", rowNumber: 25, seatNumber: 7 },
      ]),
    ).toEqual(["Sec G · Row 25 · Seats 6-7"]);
  });

  it("returns separate lines for different sections", () => {
    expect(
      groupedWalletSeatLines([
        { sectionNumber: "G", rowNumber: 25, seatNumber: 6 },
        { sectionNumber: "H", rowNumber: 1, seatNumber: 5 },
      ]),
    ).toEqual([
      "Sec G · Row 25 · Seat 6",
      "Sec H · Row 1 · Seat 5",
    ]);
  });

  it("shows GA section only when row and seat are missing", () => {
    expect(
      groupedWalletSeatLines([
        {
          generalAdmission: true,
          sectionNumber: "Club",
          sectionName: "General Admission",
        },
      ]),
    ).toEqual(["Sec Club"]);
  });

  it("includes GA row and seat when present", () => {
    expect(
      groupedWalletSeatLines([
        {
          generalAdmission: true,
          sectionNumber: "Club",
          rowNumber: "A",
        },
      ]),
    ).toEqual(["Sec Club · Row A"]);
  });
});

describe("formatPassDateRange", () => {
  it("formats a start and end date range", () => {
    const range = formatPassDateRange(
      "2026-08-30T19:00:00.000Z",
      "2026-12-06T19:00:00.000Z",
      "America/Denver",
    );
    expect(range).toContain("2026");
    expect(range).toContain("–");
  });

  it("returns a single date when start and end match", () => {
    expect(
      formatPassDateRange(
        "2026-08-30T19:00:00.000Z",
        "2026-08-30T19:00:00.000Z",
        "America/Denver",
      ),
    ).toMatch(/Aug 30, 2026/);
  });
});

describe("isScannedTicket", () => {
  it("detects scanned ticket statuses", () => {
    expect(isScannedTicket({ scanned: true })).toBe(true);
    expect(isScannedTicket({ status: "scanned" })).toBe(true);
    expect(isScannedTicket({ status: "active" })).toBe(false);
  });
});

describe("seatLabel", () => {
  it("builds GA wallet lines from concrete section and row values", () => {
    expect(
      seatLabel({
        generalAdmission: true,
        sectionName: "General Admission",
        sectionNumber: "Club",
        rowNumber: "A",
      }),
    ).toBe("Sec Club · Row A");
  });
});

describe("transferGroupLabel", () => {
  it("shows Sec and Row for reserved tickets", () => {
    expect(
      transferGroupLabel({
        sectionNumber: "G",
        rowNumber: 25,
      }),
    ).toBe("Sec G · Row 25");
  });

  it("shows Sec only for general admission tickets", () => {
    expect(
      transferGroupLabel({
        generalAdmission: true,
        sectionNumber: "ga",
        sectionName: "General Admission",
      }),
    ).toBe("Sec ga");
  });

  it("shows Sec only for GA tickets even when a row is present", () => {
    expect(
      transferGroupLabel({
        generalAdmission: true,
        sectionNumber: "Club",
        sectionName: "General Admission",
        rowNumber: "A",
      }),
    ).toBe("Sec Club");
  });

  it("detects GA from offer metadata when row and seat are missing", () => {
    expect(
      transferGroupLabel({
        sectionNumber: "ga",
        sectionName: "General Admission",
        offerName: "General admission",
      }),
    ).toBe("Sec ga");
  });

  it("falls back to sectionName when sectionNumber is missing", () => {
    expect(
      transferGroupLabel({ sectionName: "Club Level", rowNumber: 3 }),
    ).toBe("Sec Club Level · Row 3");
  });

  it("does not derive the label from unrelated fields", () => {
    expect(transferGroupLabel(undefined)).toBe("");
    expect(
      transferGroupLabel({ offerName: "General admission" }),
    ).toBe("Sec");
  });
});

describe("transferSeatChip", () => {
  it("shows GA without a Seat label for general admission tickets", () => {
    expect(
      transferSeatChip(
        { generalAdmission: true, offerName: "General admission" },
        "General admission",
      ),
    ).toEqual({ seatNo: "GA", isGA: true, ariaLabel: "GA" });
  });

  it("reads GA from a structured seat line", () => {
    expect(
      transferSeatChip(
        {
          generalAdmission: true,
          sectionNumber: "Club",
        },
        "Sec Club · GA",
      ),
    ).toEqual({ seatNo: "GA", isGA: true, ariaLabel: "GA" });
  });

  it("shows GA in the chip for Sec-only GA lines without a generalAdmission flag", () => {
    expect(
      transferSeatChip({ sectionNumber: "ga" }, "Sec ga"),
    ).toEqual({ seatNo: "GA", isGA: true, ariaLabel: "GA" });
  });

  it("keeps numbered seats under a Seat label", () => {
    expect(
      transferSeatChip(
        { sectionNumber: "G", rowNumber: 20, seatNumber: 21 },
        "Sec G · Row 20 · Seat 21",
      ),
    ).toEqual({ seatNo: "21", isGA: false, ariaLabel: "Seat 21" });
  });

  it("treats a general admission seat number as GA", () => {
    expect(
      transferSeatChip({ seatNumber: "General admission" }, "General admission"),
    ).toEqual({ seatNo: "GA", isGA: true, ariaLabel: "GA" });
  });

  it("keeps a real seat number on GA tickets", () => {
    expect(
      transferSeatChip(
        { generalAdmission: true, sectionNumber: "N", seatNumber: 12 },
        "Sec N · Seat 12",
      ),
    ).toEqual({ seatNo: "12", isGA: true, ariaLabel: "12" });
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

describe("isPhoneDevice", () => {
  function setUserAgent(userAgent: string, maxTouchPoints = 0) {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      writable: true,
      value: userAgent,
    });
    Object.defineProperty(navigator, "maxTouchPoints", {
      configurable: true,
      writable: true,
      value: maxTouchPoints,
    });
  }

  function stubPointer(matches: Record<string, boolean>, width: number, height: number) {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: (query: string) =>
        ({ matches: Boolean(matches[query]) }) as MediaQueryList,
    });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: width,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      writable: true,
      value: height,
    });
  }

  afterEach(() => {
    Reflect.deleteProperty(navigator, "userAgent");
    Reflect.deleteProperty(navigator, "maxTouchPoints");
    Reflect.deleteProperty(window, "matchMedia");
    Reflect.deleteProperty(window, "innerWidth");
    Reflect.deleteProperty(window, "innerHeight");
  });

  it("reads phones but not tablets", () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    expect(isPhoneDevice()).toBe(true);
    expect(isTabletDevice()).toBe(false);

    setUserAgent(
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36",
    );
    expect(isPhoneDevice()).toBe(true);
    expect(isTabletDevice()).toBe(false);

    setUserAgent("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)");
    expect(isPhoneDevice()).toBe(false);
    expect(isTabletDevice()).toBe(true);

    setUserAgent(
      "Mozilla/5.0 (Linux; Android 13; SM-X900) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    );
    expect(isPhoneDevice()).toBe(false);
    expect(isTabletDevice()).toBe(true);

    setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    stubPointer({ "(pointer: coarse)": true, "(hover: hover)": false }, 820, 1180);
    expect(isTabletDevice()).toBe(true);
    expect(isPhoneDevice()).toBe(false);

    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    stubPointer({ "(pointer: coarse)": true, "(hover: hover)": false }, 390, 844);
    expect(isTabletDevice()).toBe(false);
    expect(isPhoneDevice()).toBe(true);
  });
});

describe("isEventComplete", () => {
  it.each(["complete", "Complete", "completed", "Completed"])(
    "treats %s as a completed event",
    (status) => {
      expect(isEventComplete({ status })).toBe(true);
      expect(isWalletListedEvent({ status, start: "2099-01-01T23:00:00.000Z" })).toBe(
        false,
      );
    },
  );
});

describe("isUpcomingEvent", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("treats a completed game as past in the venue timezone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-11T06:00:00.000Z"));

    expect(
      isUpcomingEvent({
        status: "complete",
        start: "2026-09-10T23:00:00.000Z",
        venue: { timezone: "America/Denver" },
      }),
    ).toBe(false);
  });

  it("keeps tonight's game upcoming until six hours after start", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-11T03:30:00.000Z"));

    expect(
      isUpcomingEvent({
        start: "2026-09-10T23:00:00.000Z",
        venue: { timezone: "America/Denver" },
      }),
    ).toBe(true);
  });
});
