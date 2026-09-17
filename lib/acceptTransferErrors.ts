import { FIELD_COPY } from "@/lib/fieldValidation";

/**
 * Blocktickets POST /ticket-transfers/accept (acceptTransfer).
 * 226 IM Used means the transfer was already claimed.
 */

export const ACCEPT_TRANSFER_API_ERROR_MESSAGES = {
  alreadyClaimed: "Transfer has already been claimed",
  couldNotAccept: "Could not accept transfer. Please try again.",
} as const;

export function isAcceptTransferAlreadyClaimedStatus(status?: number): boolean {
  return status === 226;
}

/** 226 resolves as axios success; treat as already claimed before wallet sync. */
export function parseAcceptTransferApiResponse(res: {
  status?: number;
  data?: unknown;
}): string | null {
  if (isAcceptTransferAlreadyClaimedStatus(res.status)) {
    return ACCEPT_TRANSFER_API_ERROR_MESSAGES.alreadyClaimed;
  }
  return null;
}

/** Maps accept-transfer API errors for the confirm-accept popup. */
export function parseAcceptTransferApiError(error: unknown): string {
  const status = (error as { response?: { status?: number } }).response?.status;
  if (isAcceptTransferAlreadyClaimedStatus(status)) {
    return ACCEPT_TRANSFER_API_ERROR_MESSAGES.alreadyClaimed;
  }
  if (status && status >= 400 && status < 500) {
    return ACCEPT_TRANSFER_API_ERROR_MESSAGES.couldNotAccept;
  }
  return FIELD_COPY.network;
}
