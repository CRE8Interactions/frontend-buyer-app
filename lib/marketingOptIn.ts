type MarketingOrganization = {
  name?: string;
  opt_in_message?: string;
};

type CartWithOrganization = {
  event?: { organization?: unknown } | null;
  package?: { organization?: unknown } | null;
  flex_pack?: { organization?: unknown } | null;
  access_pass_template?: { organization?: unknown } | null;
} | null;

function asOrganization(value: unknown): MarketingOrganization | null {
  if (!value || typeof value !== "object") return null;
  const org = value as { name?: unknown; opt_in_message?: unknown };
  return {
    name: typeof org.name === "string" ? org.name : "",
    opt_in_message:
      typeof org.opt_in_message === "string" ? org.opt_in_message : "",
  };
}

/** First organization on the cart, then the checkout event. */
export function checkoutMarketingOrganization(
  cart?: CartWithOrganization,
  event?: { organization?: unknown } | null,
): MarketingOrganization | null {
  return (
    asOrganization(cart?.event?.organization) ||
    asOrganization(cart?.package?.organization) ||
    asOrganization(cart?.flex_pack?.organization) ||
    asOrganization(cart?.access_pass_template?.organization) ||
    asOrganization(event?.organization)
  );
}

/** Custom org copy, then a named team, then the generic opt-in sentence. */
export function marketingOptInLabel(
  organizationName?: string | null,
  optInMessage?: string | null,
) {
  const customMessage = String(optInMessage || "").trim();
  if (customMessage) return customMessage;
  const teamName = String(organizationName || "").trim();
  if (teamName) {
    return `Send me emails from ${teamName} about upcoming events and offers.`;
  }
  return "Send me emails about upcoming events and offers.";
}
