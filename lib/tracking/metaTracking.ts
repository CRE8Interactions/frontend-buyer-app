import { injectMetaPixel } from "./metaPixel";
import type {
  TrackingCart,
  TrackingEvent,
  TrackingOrganization,
  TrackingOrder,
  TrackingTicket,
} from "./types";

const shouldTrackForOrganization = (organization?: TrackingOrganization | null) =>
  Boolean(organization?.tracking_enabled && organization?.meta_pixel_id);

const canTrackPageViews = (organization?: TrackingOrganization | null) =>
  shouldTrackForOrganization(organization) &&
  organization?.track_page_views !== false;

const canTrackCheckoutStarted = (organization?: TrackingOrganization | null) =>
  shouldTrackForOrganization(organization) &&
  organization?.track_checkout_started !== false;

const canTrackPurchases = (organization?: TrackingOrganization | null) =>
  shouldTrackForOrganization(organization) &&
  organization?.track_purchases !== false;

const getTicketQuantity = (ticket?: TrackingTicket) => {
  const quantity = Number(ticket?.quantity);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
};

const mapTicketToMetaContent = (ticket: TrackingTicket = {}) => ({
  id: String(ticket?.id || ticket?.seatId || ticket?.uuid || "ticket"),
  quantity: getTicketQuantity(ticket),
  item_price: Number(ticket?.price) || 0,
});

const mapCartToContents = (cart: TrackingCart = {}) => {
  if (Array.isArray(cart?.tickets) && cart.tickets.length) {
    return cart.tickets.map((ticket) => mapTicketToMetaContent(ticket));
  }

  if (cart?.package) {
    return [
      {
        id: String(cart?.package?.uuid || cart?.package?.id || "package"),
        quantity: 1,
        item_price: Number(cart?.total) || 0,
      },
    ];
  }

  if (cart?.flex_pack) {
    return [
      {
        id: String(cart?.flex_pack?.uuid || cart?.flex_pack?.id || "flex-pack"),
        quantity: 1,
        item_price: Number(cart?.total) || 0,
      },
    ];
  }

  return [];
};

const mapOrderToContents = (order: TrackingOrder = {}) => {
  if (Array.isArray(order?.tickets) && order.tickets.length) {
    return order.tickets.map((ticket) => mapTicketToMetaContent(ticket));
  }

  if (order?.package) {
    return [
      {
        id: String(order?.package?.uuid || order?.package?.id || "package"),
        quantity: 1,
        item_price: Number(order?.total) || 0,
      },
    ];
  }

  if (order?.flex_pack) {
    return [
      {
        id: String(
          order?.flex_pack?.uuid || order?.flex_pack?.id || "flex-pack",
        ),
        quantity: 1,
        item_price: Number(order?.total) || 0,
      },
    ];
  }

  if (order?.event) {
    return [
      {
        id: String(order?.event?.uuid || order?.event?.id || "event"),
        quantity: 1,
        item_price: Number(order?.total) || 0,
      },
    ];
  }

  return [];
};

const getSafeWindowFlag = (prefix: string, value: unknown) => {
  const normalized = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${prefix}-${normalized}`;
};

const trackMeta = ({
  organization,
  standardEventName,
  customEventName,
  payload = {},
}: {
  organization?: TrackingOrganization | null;
  standardEventName?: string;
  customEventName?: string;
  payload?: Record<string, unknown>;
}) => {
  if (!shouldTrackForOrganization(organization) || !organization?.meta_pixel_id)
    return;
  injectMetaPixel(organization.meta_pixel_id);
  if (!window.fbq) return;
  if (standardEventName) {
    window.fbq("track", standardEventName, payload);
  }
  if (customEventName) {
    window.fbq("trackCustom", customEventName, payload);
  }
};

export const trackMetaViewItem = ({
  organization,
  event,
}: {
  organization?: TrackingOrganization | null;
  event?: TrackingEvent | null;
}) => {
  if (!canTrackPageViews(organization) || !event) return;
  const contentId = String(event?.uuid || event?.id || "event");
  trackMeta({
    organization,
    standardEventName: "ViewContent",
    customEventName: "view_item",
    payload: {
      content_name: event?.name,
      content_type: "product",
      content_ids: [contentId],
      value: 0,
      currency: "USD",
    },
  });
};

export const trackMetaSelectTicket = ({
  organization,
  ticket,
  quantity = 1,
}: {
  organization?: TrackingOrganization | null;
  ticket?: TrackingTicket | null;
  quantity?: number;
}) => {
  if (!shouldTrackForOrganization(organization) || !ticket) return;
  const mergedTicket = { ...ticket, quantity };
  trackMeta({
    organization,
    customEventName: "select_ticket",
    payload: {
      content_name:
        ticket?.offer?.name || ticket?.name || ticket?.sectionName || "Ticket",
      content_type: "product",
      content_ids: [String(ticket?.id || ticket?.seatId || "ticket")],
      contents: [mapTicketToMetaContent(mergedTicket)],
      value: Number(ticket?.price) || 0,
      currency: "USD",
    },
  });
};

export const trackMetaAddToCart = ({
  organization,
  cart,
}: {
  organization?: TrackingOrganization | null;
  cart?: TrackingCart | null;
}) => {
  if (!shouldTrackForOrganization(organization) || !cart) return;
  const contents = mapCartToContents(cart);
  trackMeta({
    organization,
    standardEventName: "AddToCart",
    customEventName: "add_to_cart",
    payload: {
      content_type: "product",
      content_ids: contents.map((item) => item.id),
      contents,
      value: Number(cart?.total) || 0,
      currency: String(cart?.currency || "USD").toUpperCase(),
    },
  });
};

export const trackMetaBeginCheckout = ({
  organization,
  cart,
}: {
  organization?: TrackingOrganization | null;
  cart?: TrackingCart | null;
}) => {
  if (!canTrackCheckoutStarted(organization) || !cart) return;
  const contents = mapCartToContents(cart);
  trackMeta({
    organization,
    standardEventName: "InitiateCheckout",
    customEventName: "begin_checkout",
    payload: {
      content_type: "product",
      content_ids: contents.map((item) => item.id),
      contents,
      value: Number(cart?.total) || 0,
      currency: String(cart?.currency || "USD").toUpperCase(),
    },
  });
};

export const trackMetaAddPaymentInfo = ({
  organization,
  cart,
}: {
  organization?: TrackingOrganization | null;
  cart?: TrackingCart | null;
}) => {
  if (!canTrackCheckoutStarted(organization) || !cart) return;
  const contents = mapCartToContents(cart);
  trackMeta({
    organization,
    standardEventName: "AddPaymentInfo",
    customEventName: "add_payment_info",
    payload: {
      content_type: "product",
      content_ids: contents.map((item) => item.id),
      contents,
      value: Number(cart?.total) || 0,
      currency: String(cart?.currency || "USD").toUpperCase(),
    },
  });
};

export const trackMetaPurchase = ({
  organization,
  order,
}: {
  organization?: TrackingOrganization | null;
  order?: TrackingOrder | null;
}) => {
  if (
    typeof window === "undefined" ||
    !canTrackPurchases(organization) ||
    !order?.orderId
  )
    return;
  const dedupeKey = getSafeWindowFlag("meta-purchase-event", order.orderId);
  if ((window as unknown as Record<string, boolean>)[dedupeKey]) return;
  const contents = mapOrderToContents(order);
  trackMeta({
    organization,
    standardEventName: "Purchase",
    customEventName: "purchase",
    payload: {
      content_type: "product",
      content_ids: contents.map((item) => item.id),
      contents,
      value: Number(order?.total) || 0,
      currency: String(order?.currency || "USD").toUpperCase(),
      order_id: String(order.orderId),
    },
  });
  (window as unknown as Record<string, boolean>)[dedupeKey] = true;
};
