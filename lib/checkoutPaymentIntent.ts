import { resolveFlexPackCheckoutTotals } from "@/lib/ticketSummary";

type CartLike = {
  id?: string | number;
  ipAddress?: string;
  tickets?: Array<Record<string, unknown>>;
  package_tickets?: Array<Record<string, unknown>>;
  total?: number;
  totalTax?: number;
  flex_pack?: Record<string, unknown> | null;
  package?: Record<string, unknown> | null;
  access_pass_template?: Record<string, unknown> | null;
  event?: Record<string, unknown> | null;
  eventUUID?: string;
};

export type PaymentIntentGuest = {
  email: string;
  firstName: string;
  lastName: string;
};

/** Package/ticket carts already have an event; flex packs need org/venue for wallets. */
export const paymentEventFromCart = (
  cart: CartLike,
  event?: unknown,
) => {
  if (event) return event;
  const product = cart?.flex_pack || cart?.access_pass_template;
  if (!product || typeof product !== "object") return null;
  const organization = product.organization;
  const venue = product.venue;
  if (!organization && !venue) return null;
  return {
    name: product.name,
    start: product.start,
    organization,
    venue,
  };
};

const paymentIntentTotalFromCart = (cart: CartLike) => {
  if (cart?.flex_pack) return resolveFlexPackCheckoutTotals(cart).total;
  if (cart?.access_pass_template) {
    return Number(cart.total || 0) + Number(cart.totalTax || 0);
  }
  return cart.total;
};

export const buildPaymentIntentRequest = (
  cart: CartLike,
  event: unknown,
  guest?: PaymentIntentGuest | null,
) => ({
  ip: cart.ipAddress,
  cartId: cart.id,
  carted: true,
  cartTickets: cart.tickets,
  totalFromCart: paymentIntentTotalFromCart(cart),
  event: paymentEventFromCart(cart, event),
  flex_pack: cart?.flex_pack,
  access_pass_template: cart?.access_pass_template,
  cart,
  ...(guest ? { guest } : {}),
});
