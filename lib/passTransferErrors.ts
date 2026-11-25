import { FIELD_COPY } from "@/lib/fieldValidation";

/**
 * Blocktickets POST /ticket-transfers (create with accessPassId).
 * See docs/transfer-pass-validations.mmd.
 */

export const PASS_TRANSFER_API_ERROR_MESSAGES = {
  recipientRequired: "Recipient email is required",
  accessPassPending: "This access pass already has a pending transfer",
  seasonPassUnavailable:
    "This season pass cannot be transferred because one or more included game tickets are unavailable",
  alreadyScanned: "Cannot transfer tickets that have already been scanned",
  alreadyAssigned: "ACCESS PASS IS ALREADY ASSIGNED TO THIS EMAIL ADDRESS",
  notFound: "Access pass not found",
} as const;

export const PASS_TRANSFER_DISPLAY_COPY = {
  assigned: "This pass is already assigned to this email address.",
  scanned: "These tickets have already been scanned and can't be transferred.",
  seasonPassTransferred:
    "This season pass can't be transferred because one or more included game tickets have already been transferred.",
  seasonPassTransferredOrResold:
    "This season pass can't be transferred because one or more included game tickets have already been transferred or listed for resale.",
} as const;

/** Card and API copy for a season pass blocked by an included game. */
export function seasonPassBlockedTransferCopy(resaleEnabled = false): string {
  return resaleEnabled
    ? PASS_TRANSFER_DISPLAY_COPY.seasonPassTransferredOrResold
    : PASS_TRANSFER_DISPLAY_COPY.seasonPassTransferred;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as { data?: unknown; attributes?: Record<string, unknown> };
  if (row.attributes && typeof row.attributes === "object") {
    return row.attributes;
  }
  if (row.data && typeof row.data === "object" && !Array.isArray(row.data)) {
    return asRecord(row.data);
  }
  return value as Record<string, unknown>;
}

function booleanFlag(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

/** GET /orders?filters[orderId] omits organization.enableResale. Resale is on the games and the org setting. */
export function organizationResaleEnabled(source: unknown): boolean {
  const flags: boolean[] = [];
  const pushOrg = (org: unknown) => {
    const record = asRecord(org);
    if (!record) return;
    const enableResale = booleanFlag(record.enableResale);
    if (enableResale !== undefined) flags.push(enableResale);
    const allowResales = booleanFlag(asRecord(record.setting)?.allowResales);
    if (allowResales !== undefined) flags.push(allowResales);
  };
  const pushEvent = (event: unknown) => {
    const record = asRecord(event);
    if (!record) return;
    const enableResale = booleanFlag(record.enableResale);
    if (enableResale !== undefined) flags.push(enableResale);
    pushOrg(record.organization);
  };
  const pushEvents = (events: unknown) => {
    const list = Array.isArray(events)
      ? events
      : Array.isArray(asRecord(events)?.data)
        ? (asRecord(events)?.data as unknown[])
        : [];
    for (const event of list) pushEvent(event);
  };

  const record = asRecord(source);
  if (!record) return false;
  pushOrg(record.organization);
  pushEvent(record.event);
  const pkg = asRecord(record.package);
  if (pkg) {
    pushOrg(pkg.organization);
    pushEvents(pkg.events);
  }
  pushEvents(record.events);
  return flags.some((flag) => flag);
}

function extractPassTransferApiMessage(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const data = (error as { response?: { data?: unknown } }).response?.data;
  if (typeof data === "string" && data.trim()) return data.trim();
  if (data && typeof data === "object") {
    const record = data as {
      error?: { message?: unknown };
      message?: unknown;
    };
    const message = record.error?.message ?? record.message;
    if (typeof message === "string" && message.trim()) return message.trim();
  }
  return undefined;
}

/** Maps pass-transfer API errors for the email step. */
export function parsePassTransferApiError(
  error: unknown,
  kind: "season pass" | "access pass",
  resaleEnabled = false,
): string {
  const status = (error as { response?: { status?: number } }).response?.status;
  const raw = extractPassTransferApiMessage(error);

  if (raw === PASS_TRANSFER_API_ERROR_MESSAGES.alreadyAssigned) {
    return PASS_TRANSFER_DISPLAY_COPY.assigned;
  }
  if (raw === PASS_TRANSFER_API_ERROR_MESSAGES.alreadyScanned) {
    return PASS_TRANSFER_DISPLAY_COPY.scanned;
  }
  if (raw === PASS_TRANSFER_API_ERROR_MESSAGES.seasonPassUnavailable) {
    return seasonPassBlockedTransferCopy(resaleEnabled);
  }
  // The API sends the access-pass wording for both kinds on this shared route.
  if (raw === PASS_TRANSFER_API_ERROR_MESSAGES.accessPassPending) {
    return `This ${kind} already has a pending transfer.`;
  }
  if (raw === PASS_TRANSFER_API_ERROR_MESSAGES.recipientRequired) {
    return FIELD_COPY.emailRequired;
  }

  if (!status || status >= 500) {
    return FIELD_COPY.network;
  }
  if (status === 400 || status === 404) {
    return `Unable to transfer this ${kind}. Please try again.`;
  }
  if (status === 402) {
    return `We couldn't transfer this ${kind}. Please try again.`;
  }
  return FIELD_COPY.network;
}
