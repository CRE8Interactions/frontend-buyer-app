import { beforeEach, describe, expect, it } from "vitest";
import { demoCompletedTicketOrder } from "@/lib/demo/fixtures";
import { getGooglePurchaseTransactionId, trackPurchase } from "./googleTracking";
import type { TrackingOrder, TrackingOrganization } from "./types";

describe("google purchase deduplication", () => {
  const organization: TrackingOrganization = { tracking_enabled: true };
  const order = demoCompletedTicketOrder() as unknown as TrackingOrder;

  const purchaseEvents = () =>
    (window.dataLayer || []).filter(
      (entry) => (entry as { event?: string }).event === "purchase",
    ) as Array<Record<string, unknown>>;

  beforeEach(() => {
    sessionStorage.clear();
    window.dataLayer = [];
    for (const key of Object.keys(window)) {
      if (key.startsWith("purchase-event-")) {
        delete (window as unknown as Record<string, unknown>)[key];
      }
    }
  });

  it("pushes one purchase with the payment intent as event_id and the order id as transaction_id", () => {
    trackPurchase({ organization, order, paymentIntentId: "pi_one" });

    const events = purchaseEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      event_id: "pi_one",
      transaction_id: String(order.orderId),
    });
  });

  it("does not push the purchase again after the window flag is lost", () => {
    trackPurchase({ organization, order, paymentIntentId: "pi_reload" });
    delete (window as unknown as Record<string, unknown>)[
      "purchase-event-pi_reload"
    ];
    trackPurchase({ organization, order, paymentIntentId: "pi_reload" });

    expect(purchaseEvents()).toHaveLength(1);
  });

  it("falls back to the order id when no payment intent is given", () => {
    trackPurchase({ organization, order });

    expect(purchaseEvents()[0]).toMatchObject({
      event_id: String(order.orderId),
    });
  });

  it("does not push a purchase when the organization has purchases disabled", () => {
    trackPurchase({
      organization: { ...organization, track_purchases: false },
      order,
      paymentIntentId: "pi_off",
    });

    expect(purchaseEvents()).toHaveLength(0);
  });

  it("returns an empty transaction id when the order has no order id", () => {
    expect(getGooglePurchaseTransactionId({})).toBe("");
    expect(getGooglePurchaseTransactionId({ orderId: " abc " })).toBe("abc");
  });
});
