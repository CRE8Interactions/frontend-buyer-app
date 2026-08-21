import { afterEach, describe, expect, it } from "vitest";
import {
  checkoutLeavePath,
  dropUserCartPayload,
  resolveCheckoutReturnPath,
  shouldPopCheckoutHistory,
} from "@/lib/checkoutLeave";
import {
  DEMO_EVENTS,
  demoCheckoutCart,
  demoFlexPackCheckoutCart,
  demoPackageCheckoutCart,
} from "@/lib/demo/fixtures";
import {
  eventPurchasePath,
  flexPackPurchasePath,
  packagePurchasePath,
} from "@/lib/helpers";
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

  it("keeps a package on its team route when the cart omits the org slug", () => {
    const org = demoPackageCheckoutCart().package.organization;
    const cart = demoPackageCheckoutCart({
      package: { organization: { name: org.name } },
      organization: null,
    });
    expect(checkoutLeavePath(cart, undefined, org.slug)).toBe(
      `/${org.slug}/package/${cart.package.uuid}/`,
    );
  });

  it("falls back to the venue package route with no org slug anywhere", () => {
    const cart = demoPackageCheckoutCart({
      package: { organization: null },
      organization: null,
    });
    expect(checkoutLeavePath(cart)).toBe(
      `/venue/${cart.package.venue.slug}/package/${cart.package.uuid}/`,
    );
  });

  it("returns the flex pack page for a flex pack cart", () => {
    const cart = demoFlexPackCheckoutCart();
    expect(checkoutLeavePath(cart)).toBe(
      flexPackPurchasePath(cart.flex_pack),
    );
  });

  it("falls back to browse when the cart has no product or event route", () => {
    expect(checkoutLeavePath(null)).toBe("/browse/");
    expect(checkoutLeavePath({ id: "cart-1" }, { uuid: "evt-1" })).toBe(
      "/browse/",
    );
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

  it("includes the flex pack id when dropping a flex pack cart", () => {
    const cart = demoFlexPackCheckoutCart();
    expect(dropUserCartPayload(cart)).toEqual({
      cartId: cart.id,
      flexPackUUID: String(cart.flex_pack.uuid),
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

  it("ignores a login bounce and returns to the tickets page", () => {
    const cart = demoCheckoutCart();
    setCheckoutReturnPath(
      `/login/?from=${encodeURIComponent(`/checkout/?cartId=${cart.id}`)}`,
    );
    expect(resolveCheckoutReturnPath(cart, cart.event)).toBe(
      eventPurchasePath(raptorsEvent),
    );
  });

  it("ignores a login bounce and returns to the flex pack page", () => {
    const cart = demoFlexPackCheckoutCart();
    setCheckoutReturnPath("/login/");
    expect(resolveCheckoutReturnPath(cart)).toBe(
      flexPackPurchasePath(cart.flex_pack),
    );
  });
});

describe("shouldPopCheckoutHistory", () => {
  it("pops when the shopper came straight from the destination", () => {
    const cart = demoFlexPackCheckoutCart();
    const dest = flexPackPurchasePath(cart.flex_pack) as string;
    expect(shouldPopCheckoutHistory(dest, dest.replace(/\/$/, ""))).toBe(true);
  });

  it("keeps a swap when the destination is not the previous page", () => {
    const cart = demoFlexPackCheckoutCart();
    const dest = flexPackPurchasePath(cart.flex_pack) as string;
    expect(
      shouldPopCheckoutHistory(dest, `/${cart.flex_pack.organization.slug}/`),
    ).toBe(false);
    expect(shouldPopCheckoutHistory(dest, null)).toBe(false);
  });

  it("keeps a swap when checkout bounced through login", () => {
    const cart = demoFlexPackCheckoutCart();
    const dest = flexPackPurchasePath(cart.flex_pack) as string;
    expect(shouldPopCheckoutHistory(dest, dest, true)).toBe(false);
  });
});
