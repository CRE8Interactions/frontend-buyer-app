import { beforeEach, describe, expect, it } from "vitest";
import {
  demoAccessPassCheckoutCart,
  demoCheckoutCart,
  demoFlexPackCheckoutCart,
  demoPackageCheckoutCart,
  DEMO_USER,
} from "@/lib/demo/fixtures";
import {
  getGuestCheckoutBuyer,
  getGuestCheckoutEmail,
  isComplimentaryWebsiteCart,
  isGuestEligibleCart,
  parseGuestBuyer,
  setGuestCheckoutBuyer,
  setGuestCheckoutEmail,
} from "@/lib/guestCheckout";

describe("isGuestEligibleCart", () => {
  it("allows a regular paid ticket cart", () => {
    expect(isGuestEligibleCart(demoCheckoutCart())).toBe(true);
  });

  it("rejects packages, flex packs, access passes, and comps", () => {
    expect(isGuestEligibleCart(demoPackageCheckoutCart())).toBe(false);
    expect(isGuestEligibleCart(demoFlexPackCheckoutCart())).toBe(false);
    expect(isGuestEligibleCart(demoAccessPassCheckoutCart())).toBe(false);
    expect(
      isGuestEligibleCart(
        demoFlexPackCheckoutCart({ flex_pack: { price: 0 } }),
      ),
    ).toBe(false);
    const cart = demoCheckoutCart();
    expect(
      isGuestEligibleCart({
        ...cart,
        tickets: cart.tickets.map((ticket) => ({ ...ticket, free: true })),
      }),
    ).toBe(false);
  });
});

describe("isComplimentaryWebsiteCart", () => {
  it("treats a $0 flex pack as complimentary", () => {
    expect(
      isComplimentaryWebsiteCart(
        demoFlexPackCheckoutCart({ flex_pack: { price: 0 } }),
      ),
    ).toBe(true);
    expect(isComplimentaryWebsiteCart(demoFlexPackCheckoutCart())).toBe(false);
  });
});

describe("parseGuestBuyer", () => {
  it("normalizes the demo user email", () => {
    expect(
      parseGuestBuyer({
        email: `  ${DEMO_USER.email.toUpperCase()}  `,
        firstName: DEMO_USER.firstName,
        lastName: DEMO_USER.lastName,
      }),
    ).toEqual({
      email: DEMO_USER.email,
      firstName: DEMO_USER.firstName,
      lastName: DEMO_USER.lastName,
    });
  });

  it("rejects a blocked email", () => {
    expect(
      parseGuestBuyer({
        email: "bot@mailinator.com",
        firstName: DEMO_USER.firstName,
        lastName: DEMO_USER.lastName,
      }),
    ).toBeNull();
  });
});

describe("guest checkout session", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("persists the buyer first and last name with the email", () => {
    setGuestCheckoutBuyer({
      email: DEMO_USER.email,
      firstName: DEMO_USER.firstName,
      lastName: DEMO_USER.lastName,
    });
    expect(getGuestCheckoutBuyer()).toEqual({
      email: DEMO_USER.email,
      firstName: DEMO_USER.firstName,
      lastName: DEMO_USER.lastName,
    });
    expect(getGuestCheckoutEmail()).toBe(DEMO_USER.email);
  });

  it("keeps an email-only session without a name", () => {
    setGuestCheckoutEmail(DEMO_USER.email);
    expect(getGuestCheckoutEmail()).toBe(DEMO_USER.email);
    expect(getGuestCheckoutBuyer()).toEqual({
      email: DEMO_USER.email,
      firstName: "",
      lastName: "",
    });
  });
});
