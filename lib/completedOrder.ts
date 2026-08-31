import { getOrderByPaymentIntentId } from "@/lib/api";
import type { BrandingOrganization } from "@/lib/branding";
import type { TimezoneLike } from "@/lib/helpers";
import { orderPaymentDetailsReady } from "@/lib/orderPayment";
import type { TrackingOrganization } from "@/lib/tracking";
import { strapiAttr, unwrapList } from "@/lib/wallet";

export type VenueAddress = {
  address_1?: string;
  city?: string;
  state?: string;
  zipcode?: string;
};

export type OrderEvent = {
  name?: string;
  start?: string;
  uuid?: string;
  doorsOpen?: string;
  realDoorsOpen?: string;
  image?: { url?: string };
  venue?: {
    timezone?: TimezoneLike;
    name?: string;
    address?: VenueAddress[];
  };
  organization?: BrandingOrganization & {
    setting?: { foodAndBeverage?: boolean };
    uuid?: string;
  };
  [key: string]: unknown;
};

export type OrderData = {
  id?: string | number;
  orderId?: string | number;
  total?: number;
  serviceFee?: number;
  processingFee?: number;
  estimatedProcessingFee?: number;
  salesTax?: number;
  totalTax?: number;
  discountApplied?: number;
  discountBreakdown?: { code?: string } | null;
  promoPricingDetails?: { code?: string } | null;
  promoCode?: Array<{ code?: string } | null> | { code?: string } | null;
  promo_code?: { code?: string } | null;
  last4?: string | number;
  paymentProcessor?: string;
  paymentMethodType?: string;
  tickets?: Array<Record<string, unknown>>;
  event?: OrderEvent | null;
  package?: {
    name?: string;
    organization?: BrandingOrganization | null;
    events?: Array<Record<string, unknown>>;
  } | null;
  flex_pack?: {
    name?: string;
    price?: number;
    gameTickets?: number;
    start?: string;
    end?: string;
    image?: { url?: string };
    venue?: { name?: string; timezone?: TimezoneLike };
    organization?: BrandingOrganization | null;
  } | null;
  vouchers?: Array<{ code?: string }>;
  access_pass_template?: {
    name?: string;
    organization?: (TrackingOrganization & BrandingOrganization) | null;
    venue?: { name?: string; timezone?: TimezoneLike };
    events?: Array<Record<string, unknown>>;
  } | null;
  access_pass?: { uuid?: string } | null;
  priceObject?:
    | Record<string, unknown>
    | Array<Record<string, unknown> | null | undefined>
    | null;
  [key: string]: unknown;
};

export function normalizeOrderPayload(payload: unknown): OrderData {
  const listed = unwrapList<unknown>(payload).map((item) =>
    strapiAttr<OrderData>(item),
  );
  if (listed.length) return listed[0];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (obj.order && typeof obj.order === "object") {
      return normalizeOrderPayload(obj.order);
    }
    return strapiAttr<OrderData>(payload);
  }
  return {} as OrderData;
}

const ORDER_READY_CACHE_MS = 5000;

const orderByIntentInflight = new Map<string, Promise<OrderData>>();

export function __resetCompletedOrderInflightForTests() {
  orderByIntentInflight.clear();
}

/**
 * One request per intent id across remounts. A fully synced order is held
 * briefly; an order still missing payment details is dropped so polling refetches.
 */
export async function fetchCompletedOrder(
  intentId: string,
): Promise<OrderData> {
  const existing = orderByIntentInflight.get(intentId);
  if (existing) return existing;

  const pending = (async () => {
    try {
      const res = await getOrderByPaymentIntentId(intentId);
      return normalizeOrderPayload(res.data);
    } catch (err) {
      orderByIntentInflight.delete(intentId);
      throw err;
    }
  })();

  orderByIntentInflight.set(intentId, pending);
  void pending.then(
    (order) => {
      if (!orderPaymentDetailsReady(order)) {
        orderByIntentInflight.delete(intentId);
        return;
      }
      window.setTimeout(() => {
        if (orderByIntentInflight.get(intentId) === pending) {
          orderByIntentInflight.delete(intentId);
        }
      }, ORDER_READY_CACHE_MS);
    },
    () => {
      orderByIntentInflight.delete(intentId);
    },
  );
  return pending;
}
