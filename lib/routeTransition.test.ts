import { describe, expect, it } from "vitest";
import {
  isMyTicketsPath,
  isWalletShellNavigation,
} from "@/lib/routeTransition";

describe("wallet shell navigation", () => {
  it("treats the list and a wallet item as the same shell", () => {
    expect(isMyTicketsPath("/my-tickets/")).toBe(true);
    expect(isMyTicketsPath("/my-tickets/event/event-1/")).toBe(true);
    expect(isMyTicketsPath("/my-tickets/flex-pack/flex-1/")).toBe(true);
    expect(isMyTicketsPath("/browse/")).toBe(false);
    expect(
      isWalletShellNavigation(
        "/my-tickets/event/event-1/",
        "/my-tickets/",
      ),
    ).toBe(true);
    expect(
      isWalletShellNavigation("/my-tickets/", "/my-tickets/flex-pack/flex-1/"),
    ).toBe(true);
  });

  it("does not skip the loader when leaving the wallet", () => {
    expect(isWalletShellNavigation("/my-tickets/", "/browse/")).toBe(false);
    expect(isWalletShellNavigation("/checkout/", "/my-tickets/")).toBe(false);
  });
});
