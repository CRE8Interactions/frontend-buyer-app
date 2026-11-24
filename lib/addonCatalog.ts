import { sortByDate } from "@/lib/helpers";
import {
  hasAddonPickupDetails,
  type AddonPickupSource,
} from "@/lib/addonPickup";

export type AddonVariant = {
  uuid?: string | null;
  name?: string | null;
  price?: number | null;
  available?: number | null;
};

export type AddonProduct = AddonPickupSource & {
  uuid: string;
  name?: string | null;
  description?: string | null;
  basePrice?: number | null;
  available?: number | null;
  minQuantity?: number | null;
  maxQuantity?: number | null;
  imageUrls?: string[] | string | null;
  variants?: AddonVariant[] | null;
};

export type AddonCartItem = AddonPickupSource & {
  uuid?: string;
  productUuid?: string;
  variantUuid?: string | null;
  name?: string | null;
  quantity?: number;
  unitPrice?: number | null;
};

export type AddonQuoteLine = AddonPickupSource & {
  productUuid?: string;
  variantUuid?: string | null;
  name?: string | null;
  quantity?: number;
  unitPrice?: number | null;
  subtotal?: number | null;
  totalAmount?: number | null;
};

export type AddonQuote = {
  customerTotal?: number | null;
  lines?: AddonQuoteLine[] | null;
};

export type DigitalAddonPass = {
  uuid?: string;
  checkInCode: string;
  productName?: string;
  status?: string;
  scope?: string;
};

export type AddonSelection = {
  productUuid: string;
  variantUuid: string | null;
  quantity: number;
};

type CatalogEvent = { uuid?: string | null; start?: string; startDate?: string };

export type AddonCatalogCart = {
  resaleListing?: unknown;
  tickets?: unknown[] | null;
  package?: {
    uuid?: string | number | null;
    events?: CatalogEvent[] | null;
  } | null;
  flex_pack?: unknown;
  access_pass_template?: {
    uuid?: string | null;
    events?: CatalogEvent[] | null;
  } | null;
  event?: { uuid?: string | null } | null;
  eventUUID?: string | null;
  event_uuid?: string | null;
  addonItems?: AddonCartItem[] | null;
  addonQuote?: AddonQuote | null;
};

/** REST-cache HITs wrap catalog arrays as { data: [...] }; live responses are a bare array. */
export function normalizeAddonCatalogPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: unknown[] }).data;
  }
  return [];
}

export function isPublicFanAddonCatalogRequest(url = ""): boolean {
  return /\/events\/[^/]+\/addon-products/.test(url);
}

export function isPublicFanAddonCartItemRequest(url = ""): boolean {
  return /\/carts\/[^/]+\/addon-items/.test(url);
}

function isSafeAnonymousRetry(method = "get"): boolean {
  const normalized = String(method || "get").toLowerCase();
  return normalized === "get" || normalized === "head";
}

export function isPublicFanAddonCartItemMutation({
  url = "",
  method = "get",
}: {
  url?: string;
  method?: string;
} = {}): boolean {
  const normalized = String(method || "get").toLowerCase();
  return (
    isPublicFanAddonCartItemRequest(url) &&
    ["post", "put", "delete"].includes(normalized)
  );
}

/** Public catalog reads and cart add-on writes retry once without a stale JWT. */
export function shouldRetryAddonRequestWithoutAuth({
  url = "",
  method = "get",
}: {
  url?: string;
  method?: string;
} = {}): boolean {
  const normalized = String(method || "get").toLowerCase();
  if (isSafeAnonymousRetry(normalized) && isPublicFanAddonCatalogRequest(url)) {
    return true;
  }
  return isPublicFanAddonCartItemMutation({ url, method: normalized });
}

/** Cart add-on 403 is not always a stale JWT, so only catalog retries clear the session. */
export function addonAuthRetryClearsSession({
  url = "",
  method = "get",
}: {
  url?: string;
  method?: string;
} = {}): boolean {
  return (
    shouldRetryAddonRequestWithoutAuth({ url, method }) &&
    !isPublicFanAddonCartItemMutation({ url, method })
  );
}

export function addonPassStatusLabel(status?: string | null): string {
  const key = String(status || "").toLowerCase();
  if (key === "redeemed") return "Redeemed";
  if (key === "expired") return "Expired";
  return "Ready to scan";
}

export function addonApiErrorMessage(err: unknown, fallback: string): string {
  const data = (
    err as {
      response?: { data?: { error?: { message?: string }; message?: string } };
      message?: string;
    }
  )?.response?.data;
  return data?.error?.message || data?.message || fallback;
}

function parseImageList(value: string): unknown[] {
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
  }
  return [trimmed];
}

export function firstAddonImageUrl(value: unknown): string {
  const urls = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? parseImageList(value)
      : [];
  return (
    urls.find(
      (url): url is string =>
        typeof url === "string" && /^https?:\/\//i.test(url),
    ) || ""
  );
}

export function resolveAddonCatalogContext(
  cart?: AddonCatalogCart | null,
): { eventUUID: string | null; packageUUID: string | null } {
  if (!cart || cart.resaleListing) {
    return { eventUUID: null, packageUUID: null };
  }
  const packageUUID = cart.package?.uuid ? String(cart.package.uuid) : null;
  let eventUUID =
    cart.event?.uuid || cart.eventUUID || cart.event_uuid || null;
  if (!eventUUID && packageUUID) {
    eventUUID =
      sortByDate(cart.package?.events || [])?.[0]?.uuid || null;
  }
  if (!eventUUID && cart.access_pass_template) {
    eventUUID =
      sortByDate(cart.access_pass_template.events || [])?.[0]?.uuid || null;
  }
  return {
    eventUUID: eventUUID ? String(eventUUID) : null,
    packageUUID,
  };
}

export function nextAddonQuantityDown(current: number, minQuantity = 0): number {
  const minQty = Math.max(0, Number(minQuantity) || 0);
  if (current <= 0) return 0;
  if (minQty > 0 && current <= minQty) return 0;
  return current - 1;
}

export function nextAddonQuantityUp(current: number, minQuantity = 0): number {
  const minQty = Math.max(0, Number(minQuantity) || 0);
  if (current === 0) return minQty > 0 ? minQty : 1;
  return current + 1;
}

export function addonQuantityFor(
  items: AddonCartItem[] | null | undefined,
  productUuid: string,
  variantUuid?: string | null,
): number {
  const match = (items || []).find(
    (item) =>
      item.productUuid === productUuid &&
      (item.variantUuid || null) === (variantUuid || null),
  );
  return match ? Number(match.quantity) || 0 : 0;
}

export function addonCustomerTotal(cart?: AddonCatalogCart | null): number {
  return Number(cart?.addonQuote?.customerTotal) || 0;
}

export function addonQuoteLines(cart?: AddonCatalogCart | null): AddonQuoteLine[] {
  return Array.isArray(cart?.addonQuote?.lines) ? cart.addonQuote.lines : [];
}

export function addonFeeRemainder(cart?: AddonCatalogCart | null): number {
  const total = addonCustomerTotal(cart);
  const subtotal = addonQuoteLines(cart).reduce(
    (sum, line) => sum + (Number(line.subtotal) || 0),
    0,
  );
  return Math.round((total - subtotal) * 100) / 100;
}

export function isAddonOnlyCheckout(cart?: AddonCatalogCart | null): boolean {
  return (
    !cart?.tickets?.length &&
    !cart?.package &&
    !cart?.flex_pack &&
    !cart?.access_pass_template &&
    addonCustomerTotal(cart) > 0
  );
}

export type AddonSummaryLine = {
  key: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  pickup: AddonPickupSource | null;
};

export function addonSummaryLines(cart?: AddonCatalogCart | null): AddonSummaryLine[] {
  const quoted = addonQuoteLines(cart);
  if (quoted.length) {
    return quoted.map((line, index) => ({
      key: `${line.productUuid || line.name || "addon"}-${line.variantUuid || index}`,
      name: line.name || "Add-on",
      quantity: Number(line.quantity) || 0,
      unitPrice: Number(line.unitPrice) || 0,
      subtotal: Number(line.subtotal) || 0,
      pickup: hasAddonPickupDetails(line) ? line : null,
    }));
  }
  return (cart?.addonItems || []).map((item, index) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    return {
      key: item.uuid || `${item.productUuid || item.name || "addon"}-${index}`,
      name: item.name || "Add-on",
      quantity,
      unitPrice,
      subtotal: unitPrice * quantity,
      pickup: hasAddonPickupDetails(item) ? item : null,
    };
  });
}

export function resolveOrderUUID(order?: {
  uuid?: string | null;
  orderUuid?: string | null;
  order_uuid?: string | null;
} | null): string | null {
  const uuid = order?.uuid || order?.orderUuid || order?.order_uuid || null;
  return uuid ? String(uuid) : null;
}
