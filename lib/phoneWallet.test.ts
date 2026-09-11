import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  downloadApplePass: vi.fn(),
  downloadGooglePass: vi.fn(),
}));

import { downloadApplePass, downloadGooglePass } from "@/lib/api";
import { DEMO_EVENTS, demoAccessPass, demoCompletedTicketOrder } from "@/lib/demo/fixtures";
import {
  addAccessPassToPhoneWallet,
  addTicketToPhoneWallet,
  phoneWalletKind,
  phoneWalletTheme,
  walletPassEvent,
} from "@/lib/phoneWallet";
import {
  buildAccessPassSummaries,
  type AccessPassLike,
  type EventLike,
} from "@/lib/wallet";

const mockedApplePass = vi.mocked(downloadApplePass);
const mockedGooglePass = vi.mocked(downloadGooglePass);
const open = vi.fn();

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

function summaryFor(pass: AccessPassLike) {
  return buildAccessPassSummaries([pass])[0];
}

beforeEach(() => {
  mockedApplePass.mockReset();
  mockedGooglePass.mockReset();
  open.mockReset();
  Object.defineProperty(window, "open", {
    configurable: true,
    writable: true,
    value: open,
  });
  Object.defineProperty(window.URL, "createObjectURL", {
    configurable: true,
    writable: true,
    value: vi.fn(() => "blob:pass"),
  });
  Object.defineProperty(window.URL, "revokeObjectURL", {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  Reflect.deleteProperty(navigator, "userAgent");
});

describe("phoneWalletTheme", () => {
  it("uses Apple platform colors for Apple Wallet", () => {
    expect(phoneWalletTheme("apple").buttonBg).toBe("#14161c");
    expect(phoneWalletTheme("apple").selectedBorder).toBe("#14161c");
  });

  it("uses Google platform colors for Google Wallet", () => {
    expect(phoneWalletTheme("google").buttonBg).toBe("#1f1f1f");
    expect(phoneWalletTheme("google").selectedBorder).toBe("#1f1f1f");
  });
});

describe("phoneWalletKind", () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, "maxTouchPoints");
  });

  it("offers a wallet only on the phone that gets scanned", () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    expect(phoneWalletKind()).toBe("apple");

    setUserAgent(
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36",
    );
    expect(phoneWalletKind()).toBe("google");

    setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    expect(phoneWalletKind()).toBeNull();
  });

  it("does not offer a wallet on tablets", () => {
    setUserAgent("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)");
    expect(phoneWalletKind()).toBeNull();

    setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      5,
    );
    expect(phoneWalletKind()).toBeNull();

    setUserAgent(
      "Mozilla/5.0 (Linux; Android 13; SM-X900) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    );
    expect(phoneWalletKind()).toBeNull();
  });
});

describe("addAccessPassToPhoneWallet", () => {
  it("sends the pass and its first event to Apple Wallet", async () => {
    const pass = demoAccessPass();
    const summary = summaryFor(pass);
    mockedApplePass.mockResolvedValue({
      data: new Blob(["pkpass"], { type: "application/vnd.apple.pkpass" }),
    } as never);

    expect(await addAccessPassToPhoneWallet(summary, "apple")).toBeNull();
    expect(mockedApplePass).toHaveBeenCalledWith({
      event: expect.objectContaining({ uuid: summary.events[0]?.uuid }),
      obj: { ...pass, accessPass: true },
    });
  });

  it("opens the Google Wallet save link", async () => {
    const pass = demoAccessPass();
    const summary = summaryFor(pass);
    mockedGooglePass.mockResolvedValue({
      data: { url: "https://pay.google.com/gp/v/save/pass-1" },
    } as never);

    expect(await addAccessPassToPhoneWallet(summary, "google")).toBeNull();
    expect(mockedGooglePass).toHaveBeenCalledWith({
      event: expect.objectContaining({ uuid: summary.events[0]?.uuid }),
      ticket: expect.objectContaining({
        checkInCode: pass.checkInCode,
        accessPass: true,
      }),
    });
    expect(open).toHaveBeenCalledWith(
      "https://pay.google.com/gp/v/save/pass-1",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("explains when the pass cannot be added", async () => {
    mockedGooglePass.mockRejectedValue(new Error("500"));

    expect(
      await addAccessPassToPhoneWallet(summaryFor(demoAccessPass()), "google"),
    ).toMatch(/Google Wallet/);
    expect(open).not.toHaveBeenCalled();

    expect(
      await addAccessPassToPhoneWallet(
        summaryFor(demoAccessPass({ checkInCode: "" })),
        "apple",
      ),
    ).toMatch(/no code/i);
    expect(mockedApplePass).not.toHaveBeenCalled();
  });
});

describe("addTicketToPhoneWallet", () => {
  const event = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
  const ticket = demoCompletedTicketOrder({ event }).tickets[0];

  it("sends the event ticket to Apple Wallet", async () => {
    mockedApplePass.mockResolvedValue({
      data: new Blob(["pkpass"], { type: "application/vnd.apple.pkpass" }),
    } as never);

    expect(await addTicketToPhoneWallet(event, ticket, "apple")).toBeNull();
    expect(mockedApplePass).toHaveBeenCalledWith({
      event: expect.objectContaining({ uuid: event.uuid }),
      obj: ticket,
    });
  });

  it("opens the Google Wallet save link for an event ticket", async () => {
    mockedGooglePass.mockResolvedValue({
      data: { url: "https://pay.google.com/gp/v/save/ticket-1" },
    } as never);

    expect(await addTicketToPhoneWallet(event, ticket, "google")).toBeNull();
    expect(mockedGooglePass).toHaveBeenCalledWith({
      event: expect.objectContaining({ uuid: event.uuid }),
      ticket,
    });
    expect(open).toHaveBeenCalledWith(
      "https://pay.google.com/gp/v/save/ticket-1",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("explains when the ticket cannot be added", async () => {
    mockedApplePass.mockRejectedValue(new Error("500"));

    expect(await addTicketToPhoneWallet(event, ticket, "apple")).toMatch(
      /Apple Wallet/,
    );
    expect(
      await addTicketToPhoneWallet(event, { ...ticket, checkInCode: "" }, "apple"),
    ).toMatch(/no code/i);
  });

  it("sends the full event object when the page only has a sparse event", async () => {
    mockedGooglePass.mockResolvedValue({
      data: { url: "https://pay.google.com/gp/v/save/ticket-1" },
    } as never);

    expect(
      await addTicketToPhoneWallet(
        { name: event.name } as EventLike,
        ticket,
        "google",
      ),
    ).toBeNull();
    expect(mockedGooglePass).toHaveBeenCalledWith({
      event: expect.objectContaining({ uuid: ticket.eventUUID }),
      ticket,
    });
  });

  it("explains when Google Wallet cannot create the pass", async () => {
    mockedGooglePass.mockRejectedValue({
      response: {
        data: { error: { message: "Invalid time zone specified: UTC" } },
      },
    });

    expect(await addTicketToPhoneWallet(event, ticket, "google")).toMatch(
      /Google Wallet/,
    );
    expect(open).not.toHaveBeenCalled();
  });
});

describe("walletPassEvent", () => {
  it("does not treat a numeric event id as the Google Wallet event uuid", () => {
    expect(
      walletPassEvent({ name: "NM State" }, { eventId: 1219, checkInCode: "NMS-1" })
        ?.uuid,
    ).toBeUndefined();
  });

  it("uses a string ticket.event as the event uuid", () => {
    expect(
      walletPassEvent({ name: "NM State" }, {
        event: "af194e70-d31e-4837-b96d-1771d3ec3fac",
        checkInCode: "NMS-1",
      })?.uuid,
    ).toBe("af194e70-d31e-4837-b96d-1771d3ec3fac");
  });
});
