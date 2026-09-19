import { describe, expect, it } from "vitest";
import { DEMO_EVENTS, DEMO_ORGS } from "@/lib/demo/fixtures";
import {
  billingCountryFromCart,
  isWalletPaymentType,
  postalBlurError,
  postalErrorMessage,
  postalFieldLabel,
  postalSubmitError,
  stripeConfirmBillingDetails,
} from "./billingPostal";

const icedogsEvent =
  DEMO_EVENTS.find((event) => event.shortCode === "ICEDOG1") || DEMO_EVENTS[0];
const raptorsEvent =
  DEMO_EVENTS.find((event) => event.shortCode === "RAPT006") || DEMO_EVENTS[0];

describe("billing postal labels", () => {
  it("labels US ZIP and Canadian postal code", () => {
    expect(postalFieldLabel("US")).toBe("ZIP");
    expect(postalFieldLabel("CA")).toBe("Postal code");
    expect(postalErrorMessage("CA", "required")).toBe("Postal code is required.");
    expect(postalErrorMessage("US", "invalid")).toBe(
      "ZIP is invalid. Please try again.",
    );
  });
});

describe("billing postal validation", () => {
  it("accepts a Canadian postal code and a US ZIP", () => {
    expect(postalSubmitError("CA", "L2R 6P7")).toBeNull();
    expect(postalSubmitError("CA", "l2r6p7")).toBeNull();
    expect(postalSubmitError("US", "84101")).toBeNull();
    expect(postalSubmitError("US", "84101-1234")).toBeNull();
  });

  it("rejects empty or malformed codes on submit and only malformed on blur", () => {
    expect(postalBlurError("CA", "")).toBeNull();
    expect(postalSubmitError("CA", "")).toBe("required");
    expect(postalBlurError("CA", "84101")).toBe("invalid");
    expect(postalSubmitError("CA", "84101")).toBe("invalid");
    expect(postalSubmitError("US", "L2R 6P7")).toBe("invalid");
  });
});

describe("billing country from cart", () => {
  it("uses a Canadian venue province so IceDogs checkout asks for postal code", () => {
    expect(
      billingCountryFromCart({
        event: { venue: icedogsEvent.venue },
      }),
    ).toBe("CA");
  });

  it("does not treat a US venue as Canada", () => {
    expect(
      billingCountryFromCart({
        event: { venue: raptorsEvent.venue },
      }),
    ).toBeUndefined();
  });

  it("uses the IceDogs home venue when the flex pack venue has no province", () => {
    const icedogs =
      DEMO_ORGS.find((org) => org.slug === "niagara-icedogs") || DEMO_ORGS[0];
    expect(
      billingCountryFromCart({
        flex_pack: {
          venue: { name: icedogs.homeVenue.name },
          organization: icedogs,
        },
      }),
    ).toBe("CA");
  });
});

describe("stripe billing details", () => {
  it("normalizes a Canadian postal code for confirmPayment", () => {
    expect(stripeConfirmBillingDetails("CA", "l2r6p7")).toEqual({
      address: { country: "CA", postal_code: "L2R 6P7" },
    });
  });

  it("skips attaching billing for wallet payment methods", () => {
    expect(isWalletPaymentType("apple_pay")).toBe(true);
    expect(isWalletPaymentType("card")).toBe(false);
  });
});
