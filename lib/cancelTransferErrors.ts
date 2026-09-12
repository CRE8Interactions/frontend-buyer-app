import { FIELD_COPY } from "@/lib/fieldValidation";

/**
 * Blocktickets POST /ticket-transfers/cancel (cancelTransfer).
 * 226 IM Used and 400 both mean the recipient already claimed the transfer.
 */

export const CANCEL_TRANSFER_API_ERROR_MESSAGES = {
  transferClaimed: "Transfer has been claimed",
} as const;

export function isCancelTransferClaimedStatus(status?: number): boolean {
  return status === 226 || status === 400;
}

function extractCancelApiMessage(error: unknown): string | undefined {
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

/** Maps cancel-transfer API errors for the confirm-cancel popup. */
export function parseCancelTransferApiError(error: unknown): string {
  const status = (error as { response?: { status?: number } }).response?.status;
  const raw = extractCancelApiMessage(error);
  if (
    isCancelTransferClaimedStatus(status) ||
    raw === CANCEL_TRANSFER_API_ERROR_MESSAGES.transferClaimed
  ) {
    return CANCEL_TRANSFER_API_ERROR_MESSAGES.transferClaimed;
  }
  return FIELD_COPY.network;
}
