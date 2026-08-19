import { afterEach, describe, expect, it } from "vitest";
import {
  checkoutLeavePath,
  dropUserCartPayload,
  resolveCheckoutReturnPath,
} from "@/lib/checkoutLeave";
import {
  DEMO_EVENTS,
  demoCheckoutCart,
  demoPackageCheckoutCart,
} from "@/lib/demo/fixtures";
import { eventPurchasePath, packagePurchasePath } from "@/lib/helpers";
import { clearCheckoutReturnPath, setCheckoutReturnPath } from "@/lib/cart";

const raptorsEvent =
  DEMO_EVENTS.find((event) => event.shortCode === "RAPT006") || DEMO_EVENTS[0];

afterEach(() => {
  clearCheckoutReturnPath();
});

describe("checkoutLeavePath", () => {
  it("returns the event tickets page for a ticket cart", () => {
    const cart = demoCheckoutCart();
    expect(checkoutLeavePath(cart, cart.event)).toBe(
      eventPurchasePath(raptorsEvent),
    );
  });

  it("returns the season package page for a package cart", () => {
    const cart = demoPackageCheckoutCart();
    expect(checkoutLeavePath(cart)).toBe(packagePurchasePath(cart.package));
  });
});

describe("dropUserCartPayload", () => {
  it("includes the event id when dropping tickets", () => {
    const cart = demoCheckoutCart();
    expect(dropUserCartPayload(cart, cart.event)).toEqual({
      cartId: cart.id,
      eventUUID: cart.event.uuid,
    });
  });

  it("includes the package id when dropping package tickets", () => {
    const cart = demoPackageCheckoutCart();
    expect(dropUserCartPayload(cart)).toEqual({
      cartId: cart.id,
      packageUUID: String(cart.package.uuid),
    });
  });

  it("does not send a game id when dropping a package cart", () => {
    const cart = demoPackageCheckoutCart();
    expect(
      dropUserCartPayload(cart, {
        uuid: raptorsEvent.uuid,
        slug: raptorsEvent.slug,
        shortCode: raptorsEvent.shortCode,
      }),
    ).toEqual({
      cartId: cart.id,
      packageUUID: String(cart.package.uuid),
    });
  });
});

describe("resolveCheckoutReturnPath", () => {
  it("uses the page the shopper came from when it is stored", () => {
    const cart = demoPackageCheckoutCart();
    const from = `/${cart.package.organization.slug}/`;
    setCheckoutReturnPath(from);
    expect(resolveCheckoutReturnPath(cart)).toBe(from);
  });

  it("falls back to the package page when no return path is stored", () => {
    const cart = demoPackageCheckoutCart();
    expect(resolveCheckoutReturnPath(cart)).toBe(
      packagePurchasePath(cart.package),
    );
  });
});
