import { describe, expect, it } from "vitest";
import { DEMO_ORGS, demoCheckoutCart } from "@/lib/demo/fixtures";
import {
  checkoutMarketingOrganization,
  marketingOptInLabel,
} from "@/lib/marketingOptIn";

const raptors = DEMO_ORGS.find((org) => org.slug === "ogden-raptors");
const icedogs = DEMO_ORGS.find((org) => org.slug === "niagara-icedogs");

describe("marketingOptInLabel", () => {
  it("uses a custom organization message", () => {
    if (!raptors) throw new Error("demo fixtures need the Raptors organization");
    expect(
      marketingOptInLabel(raptors.name, `  Email me about ${raptors.name} offers.  `),
    ).toBe(`Email me about ${raptors.name} offers.`);
  });

  it("names the team when the message is missing or blank", () => {
    if (!raptors) throw new Error("demo fixtures need the Raptors organization");
    const named = `Send me emails from ${raptors.name} about upcoming events and offers.`;
    expect(marketingOptInLabel(raptors.name, null)).toBe(named);
    expect(marketingOptInLabel(raptors.name, "   ")).toBe(named);
  });

  it("uses the generic sentence when there is no team", () => {
    expect(marketingOptInLabel("", "  ")).toBe(
      "Send me emails about upcoming events and offers.",
    );
  });
});

describe("checkoutMarketingOrganization", () => {
  it("uses the cart organization before the checkout event", () => {
    if (!icedogs) throw new Error("demo fixtures need the IceDogs organization");
    const cart = demoCheckoutCart();
    expect(
      checkoutMarketingOrganization(cart, { organization: icedogs })?.name,
    ).toBe(cart.event.organization?.name);
  });

  it("uses the checkout event when the cart has no organization", () => {
    if (!icedogs) throw new Error("demo fixtures need the IceDogs organization");
    const cart = demoCheckoutCart({ organization: null });
    expect(
      checkoutMarketingOrganization(cart, { organization: icedogs })?.name,
    ).toBe(icedogs.name);
  });
});
