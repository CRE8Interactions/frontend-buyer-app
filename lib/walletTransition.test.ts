import { afterEach, describe, expect, it } from "vitest";
import {
  beginWalletNavigation,
  clearWalletNavigation,
  getWalletNavigationPending,
  isWalletNavigationPending,
  syncWalletNavigationCommitted,
} from "@/lib/walletTransition";

afterEach(() => {
  clearWalletNavigation();
  window.history.replaceState({}, "", "/");
});

describe("walletTransition", () => {
  it("records a pending wallet path on in-wallet navigation", () => {
    window.history.replaceState({}, "", "/wallet/my-tickets/");

    beginWalletNavigation("/wallet/my-tickets/order/ord-1/");

    expect(getWalletNavigationPending()).toBe("/wallet/my-tickets/order/ord-1");
    expect(isWalletNavigationPending("/wallet/my-tickets/")).toBe(true);
  });

  it("ignores same-path clicks and non-wallet destinations", () => {
    window.history.replaceState({}, "", "/wallet/my-tickets/");

    beginWalletNavigation("/wallet/my-tickets/");
    beginWalletNavigation("/browse/");

    expect(getWalletNavigationPending()).toBeNull();
  });

  it("clears pending once the destination pathname commits", () => {
    window.history.replaceState({}, "", "/wallet/my-tickets/");
    beginWalletNavigation("/wallet/my-transfers/");

    syncWalletNavigationCommitted("/wallet/my-transfers/");

    expect(getWalletNavigationPending()).toBeNull();
    expect(isWalletNavigationPending("/wallet/my-transfers/")).toBe(false);
  });
});
