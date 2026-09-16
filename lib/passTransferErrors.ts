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
} as const;

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
    return PASS_TRANSFER_DISPLAY_COPY.seasonPassTransferred;
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
