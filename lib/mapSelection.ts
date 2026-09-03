import type { TicketGroup } from "@/stores/filtersStore";

export const MIXED_MAP_SELECTION_ERROR = {
  title: "Selected tickets not available",
  message:
    "You can only select tickets from one row or GA section at a time... Please change your selection.",
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

export function maxTicketLimitError(limit: number) {
  return {
    title: MAX_TICKET_LIMIT_ERROR.title,
    message: `Adding these tickets would exceed the ticket limit of ${limit}. Please change your selection.`,
    buttonText: MAX_TICKET_LIMIT_ERROR.buttonText,
  };
}

export function checkoutHoldError(err: unknown) {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "object" &&
          err &&
          "message" in err &&
          typeof (err as { message?: unknown }).message === "string"
        ? (err as { message: string }).message
        : "";
  if (msg.includes("not ready for checkout")) {
    return { ...CHECKOUT_EVENT_NOT_READY_ERROR };
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
