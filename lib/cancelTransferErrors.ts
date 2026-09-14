import { FIELD_COPY } from "@/lib/fieldValidation";

/**
 * Blocktickets POST /ticket-transfers/cancel (cancelTransfer).
 * 400 means the recipient already claimed the transfer.
 */

export const CANCEL_TRANSFER_API_ERROR_MESSAGES = {
  alreadyClaimed: "Transfer has already been claimed",
  couldNotCancel: "Could not cancel transfer. Please try again.",
} as const;

export function isCancelTransferAlreadyClaimedStatus(status?: number): boolean {
  return status === 400;
}

export function parseCancelTransferApiResponse(res: {
  status?: number;
  data?: unknown;
}): string | null {
  if (isCancelTransferAlreadyClaimedStatus(res.status)) {
    return CANCEL_TRANSFER_API_ERROR_MESSAGES.alreadyClaimed;
  }
  return null;
}

/** Maps cancel-transfer API errors for the confirm-cancel popup. */
export function parseCancelTransferApiError(error: unknown): string {
  const status = (error as { response?: { status?: number } }).response?.status;
  if (isCancelTransferAlreadyClaimedStatus(status)) {
    return CANCEL_TRANSFER_API_ERROR_MESSAGES.alreadyClaimed;
  }
  if (status && status >= 400 && status < 500) {
    return CANCEL_TRANSFER_API_ERROR_MESSAGES.couldNotCancel;
  }
  return FIELD_COPY.network;
}
