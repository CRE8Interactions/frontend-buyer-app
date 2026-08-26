import { describe, expect, it } from "vitest";
import {
  isMyTicketsPath,
  isWalletShellNavigation,
} from "@/lib/routeTransition";

describe("wallet shell navigation", () => {
  it("treats the list and a wallet item as the same shell", () => {
    expect(isMyTicketsPath("/wallet/my-tickets/")).toBe(true);
    expect(isMyTicketsPath("/wallet/my-tickets/event/event-1/")).toBe(true);
    expect(isMyTicketsPath("/wallet/my-tickets/flex-pack/flex-1/")).toBe(true);
    expect(isMyTicketsPath("/browse/")).toBe(false);
    expect(
      isWalletShellNavigation(
        "/wallet/my-tickets/event/event-1/",
        "/wallet/my-tickets/",
      ),
    ).toBe(true);
    expect(
      isWalletShellNavigation(
        "/wallet/my-tickets/",
        "/wallet/my-tickets/flex-pack/flex-1/",
      ),
    ).toBe(true);
  });

  it("keeps the shell when hopping between wallet sections", () => {
    expect(
      isWalletShellNavigation("/wallet/my-tickets/", "/wallet/my-transfers/"),
    ).toBe(true);
    expect(
      isWalletShellNavigation("/wallet/my-transfers/", "/wallet/giving/"),
    ).toBe(true);
    expect(
      isWalletShellNavigation("/wallet/giving/", "/wallet/my-profile/"),
    ).toBe(true);
  });

  it("does not skip the loader when leaving the wallet", () => {
    expect(isWalletShellNavigation("/wallet/my-tickets/", "/browse/")).toBe(
      false,
    );
    expect(isWalletShellNavigation("/checkout/", "/wallet/my-tickets/")).toBe(
      false,
    );
  });
});
