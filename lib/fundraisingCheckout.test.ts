import { describe, expect, it } from "vitest";
import {
  DEMO_USER,
  demoCheckoutCart,
  demoFlexPackCheckoutCart,
} from "@/lib/demo/fixtures";
import {
  buildPaymentIntentRequest,
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
});
