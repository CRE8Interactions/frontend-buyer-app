export type PrintedOfferInfo = {
  label: string;
  window: string;
  shortLabel: string;
};

const GENERIC_OFFER_NAMES = new Set([
  "open",
  "standard",
  "standard admission",
  "general admission",
  "ga",
]);

const SESSION_OFFERS: Array<{
  match: RegExp;
  label: string;
  shortLabel: string;
  window: string;
  bareNames: string[];
}> = [
  {
    match: /\ball\s*day\b|\bday\s*pass\b/i,
    label: "ALL DAY PASS",
    shortLabel: "ALL DAY",
    window: "ALL DAY",
    bareNames: ["day pass", "all day", "all day pass"],
  },
  {
    match: /\bprelims?\b/i,
    label: "PRELIMS",
    shortLabel: "PRELIMS",
    window: "MORNING UNTIL 4:00",
    bareNames: ["prelim", "prelims"],
  },
  {
    match: /\bfinals?\b/i,
    label: "FINALS",
    shortLabel: "FINALS",
    window: "6:00PM UNTIL END",
    bareNames: ["final", "finals"],
  },
];

function looksLikeSessionOffer(name: string) {
  return SESSION_OFFERS.some((session) => session.match.test(name));
}

function offerFromTicket(ticket: Record<string, unknown> | null | undefined) {
  const raw = ticket?.offer;
  const offer = Array.isArray(raw) ? raw[0] : raw;
  if (offer && typeof offer === "object") {
    return offer as { name?: unknown; description?: unknown };
  }
  return undefined;
}

function offerName(ticket: Record<string, unknown> | null | undefined) {
  const offer = offerFromTicket(ticket);
  const fromOffer = String(
    offer?.name || ticket?.offerName || ticket?.offer_name || "",
  ).trim();
  if (fromOffer) return fromOffer;

  // Sold tickets store the offer name on ticket.name; offer_uuid is often empty.
  const fromTicket = String(ticket?.name || "").trim();
  if (fromTicket && looksLikeSessionOffer(fromTicket)) return fromTicket;
  return "";
}

function shortDescription(ticket: Record<string, unknown> | null | undefined) {
  const description = String(offerFromTicket(ticket)?.description || "").trim();
  if (!description || description.includes("\n") || description.length > 40) {
    return "";
  }
  return description;
}

function sessionLabel(name: string, session: (typeof SESSION_OFFERS)[number]) {
  if (session.bareNames.includes(name.toLowerCase())) return session.label;
  return name.toUpperCase();
}

export function resolvePrintedOfferInfo(
  ticket: Record<string, unknown> | null | undefined,
): PrintedOfferInfo | null {
  const name = offerName(ticket);
  if (!name) return null;
  if (GENERIC_OFFER_NAMES.has(name.toLowerCase())) return null;

  for (const session of SESSION_OFFERS) {
    if (session.match.test(name)) {
      return {
        label: sessionLabel(name, session),
        shortLabel: session.shortLabel,
        window: session.window,
      };
    }
  }

  return {
    label: name,
    shortLabel: name,
    window: shortDescription(ticket),
  };
}

export function formatPrintedOfferLine(
  ticket: Record<string, unknown> | null | undefined,
) {
  const info = resolvePrintedOfferInfo(ticket);
  if (!info) return "";
  if (!info.window || /\d/.test(info.label)) return info.label;
  return `${info.label} • ${info.window}`;
}

/** Lime badge copy on wallet tickets; empty when the offer should stay "Tickets". */
export function printedOfferBadgeName(
  ticket: Record<string, unknown> | null | undefined,
) {
  return resolvePrintedOfferInfo(ticket)?.label || "";
}
