import { describe, expect, it } from "vitest";
import {
  WALLET_NAV,
  isWalletSectionPath,
  walletSectionFromPath,
  walletSectionHref,
} from "@/lib/walletNav";

describe("wallet nav", () => {
  it("gives each section its own URL", () => {
    expect(WALLET_NAV.map((section) => [section.label, section.href])).toEqual([
      ["Tickets", "/wallet/my-tickets/"],
      ["Transfers", "/wallet/my-transfers/"],
      ["Listings", "/wallet/my-listings/"],
      ["Giving", "/wallet/giving/"],
      ["Profile", "/wallet/my-profile/"],
    ]);
    expect(walletSectionHref("listings")).toBe("/wallet/my-transfers/");
    expect(walletSectionHref("resale")).toBe("/wallet/my-listings/");
  });

  it("reads the section back from the URL", () => {
    expect(walletSectionFromPath("/wallet/my-tickets/")).toBe("events");
    expect(
      walletSectionFromPath("/wallet/my-tickets/order/ord-1/"),
    ).toBe("events");
    expect(
      walletSectionFromPath("/wallet/my-tickets/order/ord-1/package/pkg-1/"),
    ).toBe("events");
    expect(
      walletSectionFromPath(
        "/wallet/my-tickets/order/ord-1/package/pkg-1/event/event-1/",
      ),
    ).toBe("events");
    expect(walletSectionFromPath("/wallet/my-transfers/")).toBe("listings");
    expect(walletSectionFromPath("/wallet/my-listings/")).toBe("resale");
    expect(walletSectionFromPath("/wallet/giving")).toBe("giving");
    expect(walletSectionFromPath("/wallet/my-profile/?x=1")).toBe("profile");
  });

  it("falls back to tickets outside the wallet", () => {
    expect(walletSectionFromPath("/browse/")).toBe("events");
    expect(isWalletSectionPath("/browse/")).toBe(false);
    expect(isWalletSectionPath("/wallet/my-transfers-archive/")).toBe(false);
    expect(isWalletSectionPath("/my-tickets/")).toBe(false);
    expect(isWalletSectionPath("/wallet/my-profile/")).toBe(true);
    expect(isWalletSectionPath("/wallet/my-listings/")).toBe(true);
    expect(
      isWalletSectionPath("/wallet/my-tickets/order/ord-1/package/pkg-1/"),
    ).toBe(true);
    expect(
      isWalletSectionPath(
        "/wallet/my-tickets/order/ord-1/package/pkg-1/event/event-1/",
      ),
    ).toBe(true);
  });
});
