import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoCompletedTicketOrder } from "@/lib/demo/fixtures";
import {
  getMetaPurchaseEventId,
  hasMetaPurchaseBeenTracked,
  markMetaPurchaseTracked,
  trackMetaPurchase,
} from "./metaTracking";
import type { TrackingOrder, TrackingOrganization } from "./types";

describe("meta purchase deduplication", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("prefers payment intent id for Meta event_id", () => {
    expect(
      getMetaPurchaseEventId({
        paymentIntentId: "pi_abc",
        order: { orderId: "ord_1", paymentIntentId: "pi_other" },
      }),
    ).toBe("pi_abc");
  });

  it("falls back to order id when payment intent is missing", () => {
    expect(getMetaPurchaseEventId({ order: { orderId: "ord_1" } })).toBe(
      "ord_1",
    );
  });

  it("persists dedupe across reloads via sessionStorage", () => {
    const eventId = "pi_test";
    expect(hasMetaPurchaseBeenTracked(eventId)).toBe(false);
    markMetaPurchaseTracked(eventId);
    delete (window as unknown as Record<string, unknown>)[
      "meta-purchase-event-pi_test"
    ];
    expect(hasMetaPurchaseBeenTracked(eventId)).toBe(true);
  });
});

describe("trackMetaPurchase", () => {
  const organization: TrackingOrganization = {
    tracking_enabled: true,
    meta_pixel_id: "123456",
  };
  const order = demoCompletedTicketOrder() as unknown as TrackingOrder;
  let fbq: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    fbq = vi.fn();
    window.fbq = fbq as never;
  });

  it("sends one Purchase with the payment intent id as eventID", () => {
    trackMetaPurchase({ organization, order, paymentIntentId: "pi_one" });

    expect(fbq).toHaveBeenCalledTimes(1);
    expect(fbq).toHaveBeenCalledWith(
      "track",
      "Purchase",
      expect.objectContaining({ order_id: String(order.orderId) }),
      { eventID: "pi_one" },
    );
  });

  it("does not send the same purchase again after a reload", () => {
    trackMetaPurchase({ organization, order, paymentIntentId: "pi_reload" });
    delete (window as unknown as Record<string, unknown>)[
      "meta-purchase-event-pi_reload"
    ];
    trackMetaPurchase({ organization, order, paymentIntentId: "pi_reload" });

    expect(fbq).toHaveBeenCalledTimes(1);
  });

  it("does not send a purchase when the organization has purchases disabled", () => {
    trackMetaPurchase({
      organization: { ...organization, track_purchases: false },
      order,
      paymentIntentId: "pi_off",
    });

    expect(fbq).not.toHaveBeenCalled();
  });
});
