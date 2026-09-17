import {
  restoreCancelledTransferTicketsToOrders,
  type OrderLike,
  type PendingSentTransfer,
} from "@/lib/cartEvents";
import {
  transferTicketIdsKey,
  type TransferLike,
} from "@/lib/ticketTransfers";

const STORAGE_KEY = "blocktickets:wallet-cancel-restores";

type PersistedCancelRestore = {
  transferId: string;
  orderId: string;
  tickets: NonNullable<PendingSentTransfer["tickets"]>;
  ticketIdsKey?: string;
};

function readRestores(): PersistedCancelRestore[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as PersistedCancelRestore[]) : [];
  } catch {
    return [];
  }
}

function writeRestores(restores: PersistedCancelRestore[]) {
  if (typeof sessionStorage === "undefined") return;
  if (!restores.length) {
    sessionStorage.removeItem(STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(restores));
}

/** Remember cancelled transfer tickets until wallet orders reflect the cancel. */
export function persistCancelledTransferRestore(
  transfer?: PendingSentTransfer | null,
): void {
  const transferId = String(transfer?.id ?? "").trim();
  if (!transferId) return;
  const orderId = String(transfer?.orderId ?? "").trim();
  const tickets = transfer?.tickets ?? [];
  const restores = readRestores().filter((row) => row.transferId !== transferId);

  if (!tickets.length) {
    restores.push({
      transferId,
      orderId: orderId || transferId,
      tickets: [],
    });
    writeRestores(restores);
    return;
  }

  if (!orderId) return;

  restores.push({
    transferId,
    orderId,
    tickets,
    ticketIdsKey: transferTicketIdsKey(transfer ?? { tickets }),
  });
  writeRestores(restores);
}

function persistedCancelledTransferIds(): Set<string> {
  return new Set(
    readRestores()
      .map((row) => row.transferId)
      .filter(Boolean),
  );
}

function persistedCancelledScopeKey(restore: PersistedCancelRestore): string {
  const ticketKey =
    restore.ticketIdsKey || transferTicketIdsKey({ tickets: restore.tickets });
  if (!ticketKey) return "";
  return `${restore.orderId}|${ticketKey}`;
}

function persistedCancelledTicketIdsKeys(): Set<string> {
  return new Set(
    readRestores().map(persistedCancelledScopeKey).filter(Boolean),
  );
}

/** Hide sent transfers the shopper cancelled before the API list catches up. */
export function filterPersistedCancelledSentTransfers(
  transfers: TransferLike[],
): TransferLike[] {
  const cancelledIds = persistedCancelledTransferIds();
  const cancelledTicketKeys = persistedCancelledTicketIdsKeys();
  if (!cancelledIds.size && !cancelledTicketKeys.size) return transfers;

  return transfers.filter((transfer) => {
    const id = String(transfer.id ?? "").trim();
    if (id && cancelledIds.has(id)) return false;
    const orderId = String(transfer.orderId ?? "").trim();
    const ticketKey = transferTicketIdsKey(transfer);
    const scopedKey = ticketKey ? `${orderId}|${ticketKey}` : "";
    if (scopedKey && cancelledTicketKeys.has(scopedKey)) return false;
    return true;
  });
}

/** Drop persisted cancels once the API marks those transfers inactive. */
export function prunePersistedCancelledSentTransfers(
  apiSentTransfers: TransferLike[],
): void {
  const restores = readRestores();
  if (!restores.length) return;

  const inactiveIds = new Set(
    apiSentTransfers
      .filter((transfer) => {
        const status = String(transfer.status || "").trim().toLowerCase();
        return (
          status === "cancelled" ||
          status === "canceled" ||
          status === "rejected" ||
          status === "declined" ||
          status === "expired" ||
          status === "revoked"
        );
      })
      .map((transfer) => String(transfer.id ?? "").trim())
      .filter(Boolean),
  );
  const inactiveTicketKeys = new Set(
    apiSentTransfers
      .filter((transfer) => {
        const status = String(transfer.status || "").trim().toLowerCase();
        return status === "cancelled" || status === "canceled";
      })
      .map((transfer) => {
        const orderId = String(transfer.orderId ?? "").trim();
        const ticketKey = transferTicketIdsKey(transfer);
        return ticketKey ? `${orderId}|${ticketKey}` : "";
      })
      .filter(Boolean),
  );
  if (!inactiveIds.size && !inactiveTicketKeys.size) return;

  const remaining = restores.filter((restore) => {
    if (inactiveIds.has(restore.transferId)) return false;
    const scopedKey = persistedCancelledScopeKey(restore);
    if (scopedKey && inactiveTicketKeys.has(scopedKey)) return false;
    return true;
  });
  writeRestores(remaining);
}

export function applyPersistedCancelRestores(orders: OrderLike[]): OrderLike[] {
  let result = orders;
  for (const restore of readRestores()) {
    result = restoreCancelledTransferTicketsToOrders(result, {
      id: restore.transferId,
      orderId: restore.orderId,
      tickets: restore.tickets,
    });
  }
  return result;
}

export function prunePersistedCancelRestores(orders: OrderLike[]): void {
  const restores = readRestores();
  if (!restores.length) return;

  const remaining = restores.filter((restore) => {
    const order = orders.find(
      (row) =>
        String(row.orderId ?? "") === restore.orderId ||
        String(row.id ?? "") === restore.orderId,
    );
    if (!order) return true;

    const ids = new Set(
      (order.tickets ?? [])
        .map((ticket) => String(ticket.id ?? ""))
        .filter(Boolean),
    );
    return !restore.tickets.every((ticket) =>
      ids.has(String(ticket.id ?? "")),
    );
  });
  writeRestores(remaining);
}

export function clearPersistedCancelRestoresForTests() {
  writeRestores([]);
}
