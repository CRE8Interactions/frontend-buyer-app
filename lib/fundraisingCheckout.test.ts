import { describe, expect, it } from "vitest";
import {
  DEMO_SEATED_TICKET_GROUPS,
  DEMO_USER,
  demoCheckoutCart,
  demoCheckoutDonationCampaign,
  demoFlexPackCheckoutCart,
  demoPackageSectionCheckoutCart,
} from "@/lib/demo/fixtures";
import {
  buildFundraisingPayload,
  buildPaymentIntentRequest,
  computeRoundUpDonation,
  createInitialFundraisingSelection,
  getCartSectionIds,
  isFundraisingDonationSatisfied,
  paymentEventFromCart,
} from "@/lib/fundraisingCheckout";
import { resolveFlexPackCheckoutTotals } from "@/lib/ticketSummary";

describe("paymentEventFromCart", () => {
  it("uses the flex pack organization when checkout has no event", () => {
    const cart = demoFlexPackCheckoutCart();
    const event = paymentEventFromCart(cart, null) as {
      organization?: { uuid?: string };
      name?: string;
    };

    expect(event.organization?.uuid).toBe(cart.flex_pack.organization.uuid);
    expect(event.name).toBe(cart.flex_pack.name);
  });

  it("does not invent an event when the flex pack has no organization or venue", () => {
    const cart = demoFlexPackCheckoutCart({
      flex_pack: { organization: undefined, venue: undefined },
    });

    expect(paymentEventFromCart(cart, null)).toBeNull();
  });
});

describe("buildPaymentIntentRequest", () => {
  it("asks for the same flex pack total the order summary charges", () => {
    const priced = demoFlexPackCheckoutCart();
    const cart = demoFlexPackCheckoutCart({
      total: Number(priced.flex_pack.price),
    });
    const request = buildPaymentIntentRequest(cart, null, null);

    expect(request.event).toEqual(paymentEventFromCart(cart, null));
    expect(request.totalFromCart).toBe(resolveFlexPackCheckoutTotals(cart).total);
    expect(request.totalFromCart).toBeGreaterThan(Number(cart.total));
    expect(request).not.toHaveProperty("guest");
  });

  it("includes a guest buyer on the payment intent", () => {
    const cart = demoCheckoutCart();
    const guest = {
      email: DEMO_USER.email,
      firstName: DEMO_USER.firstName,
      lastName: DEMO_USER.lastName,
    };
    const request = buildPaymentIntentRequest(cart, cart.event, null, guest);

    expect(request.guest).toEqual(guest);
  });

  it("keeps the provided event and cart total for ticket checkout", () => {
    const cart = demoCheckoutCart();
    const request = buildPaymentIntentRequest(cart, cart.event, null);

    expect(request.event).toBe(cart.event);
    expect(request.totalFromCart).toBe(cart.total);
  });

  it("adds a fundraising payload when the shopper donates", () => {
    const cart = demoCheckoutCart();
    const payload = {
      campaignUuid: "camp-1",
      participantUuid: "",
      donationAmount: 25,
      anonymous: false,
      donorMessage: "",
    };
    const request = buildPaymentIntentRequest(cart, cart.event, payload);

    expect(request.fundraising).toEqual(payload);
  });
});

describe("fundraising donation rules", () => {
  it("pre-fills a mandatory minimum and blocks checkout until it is met", () => {
    const campaign = {
      campaignUuid: "camp-1",
      donationRequirements: { minimumAmount: 10, mandatory: true },
    };
    const initial = createInitialFundraisingSelection(campaign);
    expect(initial.donationAmount).toBe(10);
    expect(isFundraisingDonationSatisfied(campaign, { ...initial, donationAmount: 0 })).toBe(
      false,
    );
    expect(isFundraisingDonationSatisfied(campaign, initial)).toBe(true);
    expect(buildFundraisingPayload(campaign, initial)?.donationAmount).toBe(10);
  });

  it("allows optional campaigns with no donation", () => {
    const base = demoCheckoutDonationCampaign();
    const campaign = demoCheckoutDonationCampaign({
      donationRequirements: {
        ...base.donationRequirements,
        mandatory: false,
      },
    });
    expect(isFundraisingDonationSatisfied(campaign, createInitialFundraisingSelection())).toBe(
      true,
    );
    expect(
      buildFundraisingPayload(campaign, createInitialFundraisingSelection()),
    ).toBeNull();
    expect(
      buildFundraisingPayload(campaign, {
        ...createInitialFundraisingSelection(),
        donationAmount: base.donationRequirements.minimumAmount,
      }),
    ).not.toHaveProperty("donationRuleId");
  });

  it("sends the donation rule when the gift is mandatory", () => {
    const campaign = demoCheckoutDonationCampaign();
    const payload = buildFundraisingPayload(
      campaign,
      createInitialFundraisingSelection(campaign),
    );

    expect(payload?.donationAmount).toBe(campaign.donationRequirements.minimumAmount);
    expect(payload?.donationRuleId).toBe(campaign.donationRequirements.ruleId);
  });

  it("matches a package seat by section number and offer name", () => {
    const listing = DEMO_SEATED_TICKET_GROUPS[0];
    const tokens = getCartSectionIds(demoPackageSectionCheckoutCart());

    expect(tokens).toEqual([listing.sectionNumber, listing.offer?.name]);
  });

  it("rounds a gift up to the next five dollars", () => {
    expect(computeRoundUpDonation(47.5)).toBe(2.5);
    expect(computeRoundUpDonation(50)).toBe(5);
  });
});
