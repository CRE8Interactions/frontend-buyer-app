import { describe, expect, it } from "vitest";
import { DEMO_USER, demoCheckoutCart } from "@/lib/demo/fixtures";
import { dropCartRequestBody, setStoredCart, withCallerCart } from "@/lib/cart";

describe("caller cart id", () => {
  it("sends the stored cart id when another place-in-cart replaces it", () => {
    const cart = demoCheckoutCart();
    setStoredCart(DEMO_USER.id);

    expect(withCallerCart({ eventId: cart.event.uuid })).toEqual({
      eventId: cart.event.uuid,
      replaceCartId: DEMO_USER.id,
    });
    expect(dropCartRequestBody({ eventUUID: cart.event.uuid })).toEqual({
      eventUUID: cart.event.uuid,
      cartId: DEMO_USER.id,
    });
    expect(
      dropCartRequestBody({ cartId: cart.id, eventUUID: cart.event.uuid }),
    ).toEqual({
      cartId: cart.id,
      eventUUID: cart.event.uuid,
    });
  });

  it("leaves the request unchanged when the stored cart id is missing or not a positive integer", () => {
    const cart = demoCheckoutCart();
    const body = { eventId: cart.event.uuid };

    expect(withCallerCart(body)).toBe(body);
    expect(dropCartRequestBody({ eventUUID: cart.event.uuid })).toEqual({
      eventUUID: cart.event.uuid,
    });

    setStoredCart(cart.id);
    expect(withCallerCart(body)).toBe(body);
    expect(dropCartRequestBody({ eventUUID: cart.event.uuid })).toEqual({
      eventUUID: cart.event.uuid,
    });
  });
});
