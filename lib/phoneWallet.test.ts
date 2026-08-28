import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  downloadApplePass: vi.fn(),
  downloadGooglePass: vi.fn(),
}));

import { downloadApplePass, downloadGooglePass } from "@/lib/api";
import { demoAccessPass } from "@/lib/demo/fixtures";
import { addAccessPassToPhoneWallet, phoneWalletKind } from "@/lib/phoneWallet";
import { buildAccessPassSummaries, type AccessPassLike } from "@/lib/wallet";

const mockedApplePass = vi.mocked(downloadApplePass);
const mockedGooglePass = vi.mocked(downloadGooglePass);
const open = vi.fn();

function setUserAgent(userAgent: string) {
  Object.defineProperty(navigator, "userAgent", {
    configurable: true,
    writable: true,
    value: userAgent,
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

describe("phoneWalletKind", () => {
  it("offers a wallet only on the phone that gets scanned", () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    expect(phoneWalletKind()).toBe("apple");

    setUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8)");
    expect(phoneWalletKind()).toBe("google");

    setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
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
      event: summary.events[0],
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
      event: summary.events[0],
      ticket: { ...pass, accessPass: true },
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
