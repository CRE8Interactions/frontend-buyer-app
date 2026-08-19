import type { TrackingCart, TrackingEvent, TrackingOrganization, TrackingOrder, TrackingTicket } from "./types";

const getSafeScriptId = (prefix: string, value: unknown) => {
  const normalized = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${prefix}-${normalized}`;
};

const shouldTrackForOrganization = (organization?: TrackingOrganization | null) =>
  Boolean(organization?.tracking_enabled);

const canTrackPageViews = (organization?: TrackingOrganization | null) =>
  shouldTrackForOrganization(organization) &&
  organization?.track_page_views !== false;

const canTrackCheckoutStarted = (organization?: TrackingOrganization | null) =>
  shouldTrackForOrganization(organization) &&
  organization?.track_checkout_started !== false;

const canTrackPurchases = (organization?: TrackingOrganization | null) =>
  shouldTrackForOrganization(organization) &&
  organization?.track_purchases !== false;

const pushDataLayerEvent = (
  eventName: string,
  payload: Record<string, unknown> = {},
) => {
  if (typeof window === "undefined" || !eventName) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ...payload,
  });
};

const getTicketQuantity = (ticket?: TrackingTicket) => {
  const quantity = Number(ticket?.quantity);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
};

const mapTicketToItem = (ticket: TrackingTicket = {}) => ({
  item_id: String(ticket?.id || ticket?.seatId || ticket?.uuid || "ticket"),
  item_name:
    ticket?.offer?.name || ticket?.name || ticket?.sectionName || "Ticket",
  item_category: ticket?.GA ? "General Admission" : "Reserved Seat",
  item_variant:
    ticket?.sectionName || ticket?.sectionNumber || undefined,
  quantity: getTicketQuantity(ticket),
  price: Number(ticket?.price) || 0,
});

const mapEventToItem = (event: TrackingEvent = {}) => ({
  item_id: String(event?.uuid || event?.id || "event"),
  item_name: event?.name || "Event",
  item_category: "Event",
  quantity: 1,
  price: 0,
});

const mapCartToItems = (cart: TrackingCart = {}) => {
  if (Array.isArray(cart?.tickets) && cart.tickets.length) {
    return cart.tickets.map((ticket) => mapTicketToItem(ticket));
  }

  if (cart?.package) {
    return [
      {
        item_id: String(cart?.package?.uuid || cart?.package?.id || "package"),
        item_name: cart?.package?.name || "Package",
        item_category: "Package",
        quantity: 1,
        price: Number(cart?.total) || 0,
      },
    ];
  }

  if (cart?.flex_pack) {
    return [
      {
        item_id: String(
          cart?.flex_pack?.uuid || cart?.flex_pack?.id || "flex-pack",
        ),
        item_name: cart?.flex_pack?.name || "Flex Pack",
        item_category: "Flex Pack",
        quantity: 1,
        price: Number(cart?.total) || 0,
      },
    ];
  }

  return [];
};

const mapOrderToItems = (order: TrackingOrder = {}) => {
  if (Array.isArray(order?.tickets) && order.tickets.length) {
    return order.tickets.map((ticket) => mapTicketToItem(ticket));
  }

  if (order?.package) {
    return [
      {
        item_id: String(
          order?.package?.uuid || order?.package?.id || "package",
        ),
        item_name: order?.package?.name || "Package",
        item_category: "Package",
        quantity: 1,
        price: Number(order?.total) || 0,
      },
    ];
  }

  if (order?.flex_pack) {
    return [
      {
        item_id: String(
          order?.flex_pack?.uuid || order?.flex_pack?.id || "flex-pack",
        ),
        item_name: order?.flex_pack?.name || "Flex Pack",
        item_category: "Flex Pack",
        quantity: 1,
        price: Number(order?.total) || 0,
      },
    ];
  }

  if (order?.event) {
    return [mapEventToItem(order.event)];
  }

  return [];
};

const injectGoogleTagManager = (gtmId?: string) => {
  if (typeof window === "undefined" || !gtmId) return;

  const scriptId = getSafeScriptId("gtm-script", gtmId);
  if (document.getElementById(scriptId)) return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    "gtm.start": new Date().getTime(),
    event: "gtm.js",
  });

  const script = document.createElement("script");
  script.id = scriptId;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
  document.head.appendChild(script);
};

const injectGoogleAds = (googleAdsId?: string, conversionLabel?: string) => {
  if (typeof window === "undefined" || !googleAdsId) return;

  const scriptId = getSafeScriptId("google-ads-script", googleAdsId);

  if (!document.getElementById(scriptId)) {
    const adsScript = document.createElement("script");
    adsScript.id = scriptId;
    adsScript.async = true;
    adsScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleAdsId)}`;
    document.head.appendChild(adsScript);
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };

  window.gtag("js", new Date());
  if (conversionLabel) {
    window.gtag("config", googleAdsId, {
      conversion_label: conversionLabel,
    });
    return;
  }
  window.gtag("config", googleAdsId);
};

export const injectGoogleTracking = (
  organization: TrackingOrganization = {},
) => {
  if (!organization?.tracking_enabled) return;

  injectGoogleTagManager(organization.google_tag_manager_id);
  injectGoogleAds(
    organization.google_ads_id,
    organization.google_ads_conversion_label,
  );
};

export const trackViewItem = ({
  organization,
  event,
}: {
  organization?: TrackingOrganization | null;
  event?: TrackingEvent | null;
}) => {
  if (!canTrackPageViews(organization) || !event) return;
  injectGoogleTracking(organization || {});
  const items = [mapEventToItem(event)];
  pushDataLayerEvent("view_item", {
    item_id: event?.uuid || event?.id,
    item_name: event?.name,
    items,
  });
};

export const trackSelectTicket = ({
  organization,
  ticket,
  quantity = 1,
}: {
  organization?: TrackingOrganization | null;
  ticket?: TrackingTicket | null;
  quantity?: number;
}) => {
  if (!shouldTrackForOrganization(organization) || !ticket) return;
  injectGoogleTracking(organization || {});
  const ticketWithQuantity = { ...ticket, quantity };
  const items = [mapTicketToItem(ticketWithQuantity)];
  pushDataLayerEvent("select_ticket", {
    ticket_id: ticket?.id || ticket?.seatId,
    ticket_name: ticket?.offer?.name || ticket?.name || ticket?.sectionName,
    quantity: Number(quantity) || 1,
    value: Number(ticket?.price) || 0,
    items,
  });
};

export const trackAddToCart = ({
  organization,
  cart,
}: {
  organization?: TrackingOrganization | null;
  cart?: TrackingCart | null;
}) => {
  if (!shouldTrackForOrganization(organization) || !cart) return;
  injectGoogleTracking(organization || {});
  const items = mapCartToItems(cart);
  pushDataLayerEvent("add_to_cart", {
    cart_id: cart?.cartId || cart?.id,
    value: Number(cart?.total) || 0,
    currency: String(cart?.currency || "USD").toUpperCase(),
    items,
  });
};

export const trackBeginCheckout = ({
  organization,
  cart,
}: {
  organization?: TrackingOrganization | null;
  cart?: TrackingCart | null;
}) => {
  if (!canTrackCheckoutStarted(organization) || !cart) return;
  injectGoogleTracking(organization || {});
  const items = mapCartToItems(cart);
  pushDataLayerEvent("begin_checkout", {
    cart_id: cart?.id,
    value: Number(cart?.total) || 0,
    currency: String(cart?.currency || "USD").toUpperCase(),
    items,
  });
};

export const trackAddPaymentInfo = ({
  organization,
  cart,
}: {
  organization?: TrackingOrganization | null;
  cart?: TrackingCart | null;
}) => {
  if (!canTrackCheckoutStarted(organization)) return;
  injectGoogleTracking(organization || {});
  const items = mapCartToItems(cart || {});
  pushDataLayerEvent("add_payment_info", {
    cart_id: cart?.id,
    value: Number(cart?.total) || 0,
    currency: String(cart?.currency || "USD").toUpperCase(),
    items,
  });
};

export const trackGoogleAdsPurchase = ({
  googleAdsId,
  conversionLabel,
  orderId,
  value,
  currency,
}: {
  googleAdsId?: string;
  conversionLabel?: string;
  orderId?: string | number;
  value?: number;
  currency?: string;
}) => {
  if (typeof window === "undefined" || !googleAdsId || !conversionLabel || !orderId)
    return;

  injectGoogleAds(googleAdsId, conversionLabel);

  const dedupeKey = getSafeScriptId("google-ads-purchase", orderId);
  if ((window as unknown as Record<string, boolean>)[dedupeKey]) return;

  const numericValue = Number(value);
  const currencyCode = String(currency || "USD").toUpperCase();
  window.gtag?.("event", "conversion", {
    send_to: `${googleAdsId}/${conversionLabel}`,
    transaction_id: String(orderId),
    value: Number.isFinite(numericValue) ? numericValue : 0,
    currency: currencyCode,
  });
  (window as unknown as Record<string, boolean>)[dedupeKey] = true;
};

export const trackPurchase = ({
  organization,
  order,
}: {
  organization?: TrackingOrganization | null;
  order?: TrackingOrder | null;
}) => {
  if (typeof window === "undefined" || !canTrackPurchases(organization) || !order?.orderId)
    return;
  const dedupeKey = getSafeScriptId("purchase-event", order.orderId);
  if ((window as unknown as Record<string, boolean>)[dedupeKey]) return;
  injectGoogleTracking(organization || {});
  const items = mapOrderToItems(order);
  pushDataLayerEvent("purchase", {
    transaction_id: String(order?.orderId),
    value: Number(order?.total) || 0,
    currency: String(order?.currency || "USD").toUpperCase(),
    items,
  });
  (window as unknown as Record<string, boolean>)[dedupeKey] = true;
};
