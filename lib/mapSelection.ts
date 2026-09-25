import type { TicketGroup } from "@/stores/filtersStore";

export const MIXED_MAP_SELECTION_ERROR = {
  title: "Selected tickets not available",
  message:
    "You can only select tickets from one row or GA section at a time.",
  buttonText: "Close",
  leaveMap: false,
} as const;

export const CHECKOUT_UNAVAILABLE_ERROR = {
  title: "Selected tickets not available",
  message: "Tickets are no longer available. Please change your selection.",
  buttonText: "Close",
  leaveMap: false,
} as const;

export const CHECKOUT_EVENT_NOT_READY_ERROR = {
  ...CHECKOUT_UNAVAILABLE_ERROR,
  message: "This event is not ready for checkout yet.",
} as const;

export const CHECKOUT_DEMO_LISTINGS_ERROR = {
  ...CHECKOUT_UNAVAILABLE_ERROR,
  message:
    "These listings are demo-only. Real inventory is required to checkout.",
} as const;

export const CHECKOUT_DEMO_TIERS_ERROR = {
  ...CHECKOUT_UNAVAILABLE_ERROR,
  message:
    "These tiers are demo-only. Real inventory is required to checkout.",
} as const;

export const MAX_TICKET_LIMIT_ERROR = {
  title: "Max ticket limit reached",
  buttonText: "Close",
} as const;

/**
 * `offerName` names the offer whose cap was hit; pass it when the seat sells
 * under several offers so the shopper knows which one is full.
 */
export function maxTicketLimitError(limit: number, offerName?: string | null) {
  const name = offerName?.trim();
  return {
    title: MAX_TICKET_LIMIT_ERROR.title,
    message: name
      ? `Adding these tickets would exceed the ticket limit of ${limit} for ${name}.`
      : `Adding these tickets would exceed the ticket limit of ${limit}.`,
    buttonText: MAX_TICKET_LIMIT_ERROR.buttonText,
  };
}

export function invalidOfferQuantityError(restrictionLabel: string) {
  return {
    title: "Invalid ticket quantity",
    message: `This offer requires ${restrictionLabel}. Please change your selection.`,
    buttonText: "Close",
    leaveMap: false,
  };
}

export function adjacentSeatsUnavailableError(quantity: number) {
  return {
    title: "Adjacent seats unavailable",
    message: `We couldn't find ${quantity} adjacent seats in this row for this offer. Choose another seat or quantity.`,
    buttonText: "Close",
    leaveMap: false,
  };
}

/** A rejected hold comes back as `{ error: { status, name, message } }`. */
function holdApiError(err: unknown) {
  if (!err || typeof err !== "object") return {};
  const response = (err as {
    response?: { status?: number; data?: unknown };
  }).response;
  const data = response?.data;
  let status = response?.status;
  let message: unknown;
  if (typeof data === "string") {
    message = data;
  } else if (data && typeof data === "object") {
    const record = data as {
      error?: { message?: unknown; status?: unknown } | string;
      message?: unknown;
    };
    if (typeof record.error === "string") {
      message = record.error;
    } else {
      message = record.error?.message ?? record.message;
      if (typeof record.error?.status === "number") status = record.error.status;
    }
  }
  return {
    status,
    message:
      typeof message === "string" && message.trim() ? message.trim() : undefined,
  };
}

function thrownHoldMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (
    err &&
    typeof err === "object" &&
    "message" in err &&
    typeof (err as { message?: unknown }).message === "string"
  ) {
    return (err as { message: string }).message;
  }
  return "";
}

export function checkoutHoldError(err: unknown) {
  const api = holdApiError(err);
  const thrown = thrownHoldMessage(err);
  if (
    thrown.includes("not ready for checkout") ||
    api.message?.includes("not ready for checkout")
  ) {
    return { ...CHECKOUT_EVENT_NOT_READY_ERROR };
  }
  // A 500 has no shopper-facing explanation, so it keeps the generic copy.
  if (api.message && api.status !== 500) {
    return { ...CHECKOUT_UNAVAILABLE_ERROR, message: api.message };
  }
  return { ...CHECKOUT_UNAVAILABLE_ERROR };
}

function isGa(group: TicketGroup) {
  return Boolean(group.GA || group.generalAdmission);
}

function sectionKey(group: TicketGroup) {
  return String(group.sectionId ?? group.sectionNumber ?? group.sectionName ?? "");
}

function rowKey(group: TicketGroup) {
  return `${sectionKey(group)}:${String(
    group.rowId ?? group.rowNumber ?? group.rowName ?? "",
  )}`;
}

/** Null if the incoming seats may join the current map selection. */
export function mixedMapSelectionError(
  selected: TicketGroup[],
  incoming: TicketGroup | TicketGroup[],
) {
  if (!selected.length) return null;
  const next = Array.isArray(incoming) ? incoming : [incoming];
  if (!next.length) return null;

  const all = [...selected, ...next];
  const seated = all.filter((group) => !isGa(group));
  const ga = all.filter(isGa);

  if (seated.length && ga.length) return { ...MIXED_MAP_SELECTION_ERROR };

  if (ga.length) {
    const section = sectionKey(ga[0]);
    if (ga.some((group) => sectionKey(group) !== section)) {
      return { ...MIXED_MAP_SELECTION_ERROR };
    }
    return null;
  }

  const row = rowKey(seated[0]);
  if (seated.some((group) => rowKey(group) !== row)) {
    return { ...MIXED_MAP_SELECTION_ERROR };
  }
  return null;
}
