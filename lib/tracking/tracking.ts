import {
  injectGoogleTracking,
  trackViewItem as trackGoogleViewItem,
  trackSelectTicket as trackGoogleSelectTicket,
  trackAddToCart as trackGoogleAddToCart,
  trackBeginCheckout as trackGoogleBeginCheckout,
  trackAddPaymentInfo as trackGoogleAddPaymentInfo,
  trackPurchase as trackGooglePurchase,
  trackGoogleAdsPurchase,
} from "./googleTracking";
import { injectMetaPixel } from "./metaPixel";
import {
  trackMetaViewItem,
  trackMetaSelectTicket,
  trackMetaAddToCart,
  trackMetaBeginCheckout,
  trackMetaAddPaymentInfo,
  trackMetaPurchase,
} from "./metaTracking";
import type {
  TrackingCart,
  TrackingEvent,
  TrackingOrganization,
  TrackingOrder,
  TrackingTicket,
} from "./types";

const isTrackingEnabled = (organization?: TrackingOrganization | null) =>
  Boolean(organization?.tracking_enabled);

const isTrackingDebugEnabled = () => {
  const envEnabled =
    process.env.NEXT_PUBLIC_TRACKING_DEBUG === "true" ||
    process.env.NEXT_PUBLIC_TRACKING_DEBUG === "1";
  if (envEnabled) return true;

  if (typeof window === "undefined") return false;
  try {
    return window.localStorage?.getItem("tracking:debug") === "true";
  } catch {
    return false;
  }
};

const debugTracking = (message: string, payload?: unknown) => {
  if (!isTrackingDebugEnabled()) return;
  console.info(`[tracking] ${message}`, payload);
};

const initTikTokPixel = (pixelId?: string) => {
  if (typeof window === "undefined" || !pixelId) return;
  const scriptId = `tiktok-pixel-${String(pixelId).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  if (!window.ttq) {
    const ttq = [] as unknown as NonNullable<Window["ttq"]>;
    window.ttq = ttq;
    window.ttq.methods = [
      "page",
      "track",
      "identify",
      "instances",
      "debug",
      "on",
      "off",
      "once",
      "ready",
      "alias",
      "group",
      "enableCookie",
      "disableCookie",
    ];
    window.ttq.setAndDefer = (obj, method) => {
      (obj as Record<string, (...args: unknown[]) => void>)[method] =
        function (...args: unknown[]) {
          const queue = obj as { push: (v: unknown[]) => void };
          queue.push([method, ...args]);
        };
    };
    for (let i = 0; i < (window.ttq.methods?.length || 0); i += 1) {
      window.ttq.setAndDefer?.(window.ttq, window.ttq.methods![i]);
    }
    window.ttq.load = function (id: string) {
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://analytics.tiktok.com/i18n/pixel/events.js";
      script.id = scriptId;
      const firstScript = document.getElementsByTagName("script")[0];
      if (firstScript?.parentNode)
        firstScript.parentNode.insertBefore(script, firstScript);
      if (window.ttq) window.ttq._tiktokPixelId = id;
    };
    window.ttq.page = window.ttq.page || function () {};
  }

  if (window.ttq._tiktokPixelId !== pixelId) {
    window.ttq.load(pixelId);
    window.ttq.page();
  }
};

const initLinkedInInsight = (partnerId?: string) => {
  if (typeof window === "undefined" || !partnerId) return;
  const normalizedId = String(partnerId).trim();
  if (!normalizedId) return;

  window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
  if (!window._linkedin_data_partner_ids.includes(normalizedId)) {
    window._linkedin_data_partner_ids.push(normalizedId);
  }

  if (!window.lintrk) {
    window.lintrk = function (a: string, b?: Record<string, unknown>) {
      window.lintrk!.q = window.lintrk!.q || [];
      window.lintrk!.q.push([a, b]);
    };
    window.lintrk.q = [];
  }

  const scriptId = `linkedin-insight-${normalizedId}`;
  if (document.getElementById(scriptId)) return;

  const script = document.createElement("script");
  script.type = "text/javascript";
  script.async = true;
  script.id = scriptId;
  script.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
  const firstScript = document.getElementsByTagName("script")[0];
  if (firstScript?.parentNode)
    firstScript.parentNode.insertBefore(script, firstScript);
};

const trackTikTokEvent = (
  organization: TrackingOrganization | null | undefined,
  eventName: string,
  payload: Record<string, unknown> = {},
) => {
  if (
    typeof window === "undefined" ||
    !isTrackingEnabled(organization) ||
    !organization?.tiktok_pixel_id ||
    !window.ttq
  )
    return;
  const eventMap: Record<string, string> = {
    view_item: "ViewContent",
    select_ticket: "ClickButton",
    add_to_cart: "AddToCart",
    begin_checkout: "InitiateCheckout",
    add_payment_info: "AddPaymentInfo",
    purchase: "CompletePayment",
  };
  const mappedEvent = eventMap[eventName] || eventName;
  debugTracking("tiktok dispatch", {
    eventName,
    mappedEvent,
    pixelId: organization?.tiktok_pixel_id,
    payload,
  });
  window.ttq.track(mappedEvent, payload);
};

const trackLinkedInEvent = (
  organization: TrackingOrganization | null | undefined,
  eventName: string,
  payload: Record<string, unknown> = {},
) => {
  if (
    typeof window === "undefined" ||
    !isTrackingEnabled(organization) ||
    !organization?.linkedin_partner_id ||
    !window.lintrk
  )
    return;
  debugTracking("linkedin dispatch", {
    eventName,
    partnerId: organization?.linkedin_partner_id,
    payload,
  });
  window.lintrk("track", {
    event_name: eventName,
    ...payload,
  });
};

export const initializeTracking = (
  organization: TrackingOrganization | null | undefined = {},
) => {
  if (typeof window === "undefined" || !isTrackingEnabled(organization)) return;
  debugTracking("initialize tracking", {
    organizationId: organization?.id || organization?.uuid,
    hasGtm: Boolean(organization?.google_tag_manager_id),
    hasGoogleAds: Boolean(organization?.google_ads_id),
    hasMeta: Boolean(organization?.meta_pixel_id),
    hasTikTok: Boolean(organization?.tiktok_pixel_id),
    hasLinkedIn: Boolean(organization?.linkedin_partner_id),
  });
  injectGoogleTracking(organization || {});
  initTikTokPixel(organization?.tiktok_pixel_id);
  initLinkedInInsight(organization?.linkedin_partner_id);
  if (organization?.meta_pixel_id) {
    injectMetaPixel(organization.meta_pixel_id);
  }
};

export const trackViewItem = ({
  organization,
  event,
}: {
  organization?: TrackingOrganization | null;
  event?: TrackingEvent | null;
}) => {
  initializeTracking(organization);
  debugTracking("event view_item", {
    organizationId: organization?.id || organization?.uuid,
    eventId: event?.uuid || event?.id,
    eventName: event?.name,
  });
  trackGoogleViewItem({ organization, event });
  trackMetaViewItem({ organization, event });
  const payload = {
    content_id: event?.uuid || event?.id,
    content_name: event?.name,
    value: 0,
    currency: "USD",
  };
  trackTikTokEvent(organization, "view_item", payload);
  trackLinkedInEvent(organization, "view_item", payload);
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
  initializeTracking(organization);
  debugTracking("event select_ticket", {
    organizationId: organization?.id || organization?.uuid,
    ticketId: ticket?.id || ticket?.seatId,
    quantity,
    value: Number(ticket?.price) || 0,
  });
  const payload = { organization, ticket, quantity };
  trackGoogleSelectTicket(payload);
  trackMetaSelectTicket(payload);
  const destinationPayload = {
    content_id: ticket?.id || ticket?.seatId,
    content_name: ticket?.offer?.name || ticket?.name || ticket?.sectionName,
    quantity: Number(quantity) || 1,
    value: Number(ticket?.price) || 0,
    currency: "USD",
  };
  trackTikTokEvent(organization, "select_ticket", destinationPayload);
  trackLinkedInEvent(organization, "select_ticket", destinationPayload);
};

export const trackAddToCart = ({
  organization,
  cart,
}: {
  organization?: TrackingOrganization | null;
  cart?: TrackingCart | null;
}) => {
  initializeTracking(organization);
  debugTracking("event add_to_cart", {
    organizationId: organization?.id || organization?.uuid,
    cartId: cart?.cartId || cart?.id,
    value: Number(cart?.total) || 0,
    currency: String(cart?.currency || "USD").toUpperCase(),
  });
  const payload = { organization, cart };
  trackGoogleAddToCart(payload);
  trackMetaAddToCart(payload);
  const destinationPayload = {
    content_id: cart?.cartId || cart?.id,
    value: Number(cart?.total) || 0,
    currency: String(cart?.currency || "USD").toUpperCase(),
  };
  trackTikTokEvent(organization, "add_to_cart", destinationPayload);
  trackLinkedInEvent(organization, "add_to_cart", destinationPayload);
};

export const trackBeginCheckout = ({
  organization,
  cart,
}: {
  organization?: TrackingOrganization | null;
  cart?: TrackingCart | null;
}) => {
  initializeTracking(organization);
  debugTracking("event begin_checkout", {
    organizationId: organization?.id || organization?.uuid,
    cartId: cart?.id,
    value: Number(cart?.total) || 0,
    currency: String(cart?.currency || "USD").toUpperCase(),
  });
  const payload = { organization, cart };
  trackGoogleBeginCheckout(payload);
  trackMetaBeginCheckout(payload);
  const destinationPayload = {
    content_id: cart?.id,
    value: Number(cart?.total) || 0,
    currency: String(cart?.currency || "USD").toUpperCase(),
  };
  trackTikTokEvent(organization, "begin_checkout", destinationPayload);
  trackLinkedInEvent(organization, "begin_checkout", destinationPayload);
};

export const trackAddPaymentInfo = ({
  organization,
  cart,
}: {
  organization?: TrackingOrganization | null;
  cart?: TrackingCart | null;
}) => {
  initializeTracking(organization);
  debugTracking("event add_payment_info", {
    organizationId: organization?.id || organization?.uuid,
    cartId: cart?.id,
    value: Number(cart?.total) || 0,
    currency: String(cart?.currency || "USD").toUpperCase(),
  });
  const payload = { organization, cart };
  trackGoogleAddPaymentInfo(payload);
  trackMetaAddPaymentInfo(payload);
  const destinationPayload = {
    content_id: cart?.id,
    value: Number(cart?.total) || 0,
    currency: String(cart?.currency || "USD").toUpperCase(),
  };
  trackTikTokEvent(organization, "add_payment_info", destinationPayload);
  trackLinkedInEvent(organization, "add_payment_info", destinationPayload);
};

export const trackPurchase = ({
  organization,
  order,
}: {
  organization?: TrackingOrganization | null;
  order?: TrackingOrder | null;
}) => {
  initializeTracking(organization);
  const orderWithId = {
    ...order,
    orderId: order?.orderId ?? order?.id,
  };
  debugTracking("event purchase", {
    organizationId: organization?.id || organization?.uuid,
    orderId: orderWithId?.orderId,
    value: Number(orderWithId?.total) || 0,
    currency: String(orderWithId?.currency || "USD").toUpperCase(),
  });
  const payload = { organization, order: orderWithId };
  trackGooglePurchase(payload);
  trackMetaPurchase(payload);

  if (
    !isTrackingEnabled(organization) ||
    organization?.track_purchases === false
  ) {
    return;
  }

  trackGoogleAdsPurchase({
    googleAdsId: organization?.google_ads_id,
    conversionLabel: organization?.google_ads_conversion_label,
    orderId: orderWithId?.orderId,
    value: orderWithId?.total,
    currency: orderWithId?.currency,
  });

  const destinationPayload = {
    content_id: orderWithId?.orderId,
    value: Number(orderWithId?.total) || 0,
    currency: String(orderWithId?.currency || "USD").toUpperCase(),
  };
  trackTikTokEvent(organization, "purchase", destinationPayload);
  trackLinkedInEvent(organization, "purchase", destinationPayload);
};

export { injectMetaPixel };
export type {
  TrackingOrganization,
  TrackingEvent,
  TrackingTicket,
  TrackingCart,
  TrackingOrder,
};
