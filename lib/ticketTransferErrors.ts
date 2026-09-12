import { FIELD_COPY } from "@/lib/fieldValidation";

/**
 * Blocktickets POST /ticket-transfers (create with ticketIds).
 * See docs/transfer-ticket-validations.mmd.
 */

export const TICKET_TRANSFER_API_ERROR_MESSAGES = {
  alreadyScanned: "Cannot transfer tickets that have already been scanned",
  alreadyAssigned: "TICKETS ARE ALREADY ASSIGNED TO THIS EMAIL ADDRESS",
} as const;

export const TICKET_TRANSFER_DISPLAY_COPY = {
  assigned: "These tickets are already assigned to that email address.",
  scanned: "These tickets have already been scanned and can't be transferred.",
  failed: "We couldn't transfer those tickets. Please try again.",
} as const;

function extractTicketTransferApiMessage(error: unknown): string | undefined {
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

/** Maps ticket-transfer API errors for the confirm step. */
export function parseTicketTransferApiError(error: unknown): string {
  const status = (error as { response?: { status?: number } }).response?.status;
  const raw = extractTicketTransferApiMessage(error);

  if (raw === TICKET_TRANSFER_API_ERROR_MESSAGES.alreadyScanned) {
    return TICKET_TRANSFER_DISPLAY_COPY.scanned;
  }
  if (raw === TICKET_TRANSFER_API_ERROR_MESSAGES.alreadyAssigned) {
    return TICKET_TRANSFER_DISPLAY_COPY.assigned;
  }

  if (status === 402) {
    return TICKET_TRANSFER_DISPLAY_COPY.failed;
  }
  return FIELD_COPY.network;
}
