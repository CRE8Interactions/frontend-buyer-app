import moment from "moment-timezone";
import { formatEventWhen } from "@/lib/helpers";
import {
  eventTimezone,
  eventWhenLabel,
  formatPassDateRange,
  formatTicketHolderName,
  groupedWalletSeatLines,
  strapiAttr,
  strapiRel,
  unwrapList,
  type EventLike,
  type OrderLike,
  type TicketLike,
} from "@/lib/wallet";

export type WalletTransferRow = {
  id: string;
  to?: string;
  from?: string;
  title: string;
  /** @deprecated Use seatLines; kept for optimistic merge rows. */
  seat: string;
  seatLines: string[];
  schedule?: string;
  on: string;
  claimedOn?: string;
  status: string;
  createdAt?: string;
  accessPassId?: string;
  passKind?: "season pass" | "access pass";
  ticketCount?: number;
};

type TransferOrderLike = {
  id?: number | string;
  orderId?: number | string;
  event?: EventLike | null;
  package?: {
    name?: string;
    events?: EventLike[];
  } | null;
};

export type TransferLike = {
  id?: number | string;
  status?: string;
  createdAt?: string;
  transferedOn?: string;
  accessPassId?: string | number;
  orderId?: string | number;
  emailAddressToUser?: string;
  fromUserEmail?: string;
  fromUser?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
  event?: EventLike | { name?: string; venue?: { timezone?: string } } | null;
  /** Authoritative game uuid on package transfers; the `event` relation may be order.event. */
  eventUUID?: string;
  tickets?: TicketLike[];
  access_pass?: {
    uuid?: string;
    name?: string;
    type?: string;
    start?: string;
    end?: string;
    events?: EventLike[];
  } | null;
  accessPass?: {
    uuid?: string;
    name?: string;
    type?: string;
    start?: string;
    end?: string;
    events?: EventLike[];
  } | null;
};

function normalizeTicketList(raw: unknown): TicketLike[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((item) => strapiAttr<TicketLike>(item));
  }
  const related = strapiRel<TicketLike[]>(raw);
  if (!related) return [];
  return (Array.isArray(related) ? related : [related]).map((item) =>
    strapiAttr<TicketLike>(item),
  );
}

/** Flatten Strapi REST or db-query transfer rows into one wallet shape. */
export function normalizeTransferRecord(raw: unknown): TransferLike | null {
  if (!raw || typeof raw !== "object") return null;
  const row = strapiAttr<Record<string, unknown>>(raw);
  const id = row.id ?? (raw as { id?: unknown }).id;
  if (id == null || id === "") return null;

  const order =
    strapiRel<TransferOrderLike>(row.order) ??
    (row.order as TransferOrderLike | undefined);
  const tickets = normalizeTicketList(row.tickets);
  const eventUUID = String(row.eventUUID || row.event_uuid || "").trim() || undefined;
  let event =
    strapiRel<EventLike>(row.event) ??
    (row.event as EventLike | undefined) ??
    null;
  event = resolveTransferEvent({ event, eventUUID, tickets, order });
  const orderId = row.orderId ?? order?.orderId ?? order?.id;
  const accessPass =
    strapiRel<{
      uuid?: string;
      name?: string;
      type?: string;
      start?: string;
      end?: string;
      events?: EventLike[];
    }>(row.access_pass ?? row.accessPass) ??
    (row.access_pass as TransferLike["access_pass"] | undefined) ??
    (row.accessPass as TransferLike["accessPass"] | undefined);
  const fromUser =
    strapiRel<{ firstName?: string; lastName?: string; email?: string }>(
      row.fromUser,
    ) ?? (row.fromUser as TransferLike["fromUser"] | undefined);

  return {
    id: id as number | string,
    status: String(row.status || ""),
    createdAt: String(row.createdAt || ""),
    transferedOn: String(row.transferedOn || row.transferredOn || ""),
    orderId: orderId as string | number | undefined,
    emailAddressToUser: String(row.emailAddressToUser || row.email || ""),
    fromUserEmail: String(row.fromUserEmail || fromUser?.email || ""),
    fromUser,
    eventUUID,
    event,
    tickets,
    accessPassId:
      (row.accessPassId as string | number | undefined) ??
      accessPass?.uuid,
    access_pass: accessPass,
    accessPass,
  };
}

/** Pass id on ticket-transfer payloads (season or organizer access pass). */
export function transferAccessPassId(transfer: TransferLike): string {
  const pass = transfer.access_pass ?? transfer.accessPass;
  return String(transfer.accessPassId || pass?.uuid || "").trim();
}

/** Sender loses a pass from the wallet once a transfer is sent or claimed. */
export function filterWalletAccessPassesBySentTransfers<
  T extends { uuid?: string },
>(passes: T[], sentTransfers: TransferLike[]): T[] {
  const hiddenIds = new Set<string>();
  for (const transfer of sentTransfers) {
    if (!(transfer.access_pass || transfer.accessPass)) continue;
    // Ticket transfers out of a season package carry the pass relation as well;
    // only transferring the pass itself removes it from the wallet.
    if (transfer.tickets?.length) continue;
    const passId = transferAccessPassId(transfer);
    if (!passId) continue;
    const status = transferStatusLabel(transfer.status);
    if (status === "claimed" || status === "pending") {
      hiddenIds.add(passId);
    }
  }
  return passes.filter((pass) => !hiddenIds.has(String(pass.uuid || "").trim()));
}

function transferTicketEventUUID(
  transfer: Pick<TransferLike, "eventUUID" | "event" | "tickets">,
) {
  const fromRecord = String(transfer.eventUUID || "").trim();
  if (fromRecord) return fromRecord;
  for (const ticket of transfer.tickets ?? []) {
    const uuid = String(ticket.eventUUID || ticket.eventId || "").trim();
    if (uuid) return uuid;
  }
  return String(transfer.event?.uuid || "").trim();
}

/** Package transfers often omit `event`; borrow the matching package game. */
export function resolveTransferEvent(transfer: {
  event?: TransferLike["event"];
  eventUUID?: string;
  tickets?: TicketLike[];
  order?: TransferOrderLike | null;
}): EventLike | null {
  const direct = transfer.event;
  const eventUUID = transferTicketEventUUID(transfer);
  const directUUID = String(direct?.uuid || "").trim();
  const packageEvents = transfer.order?.package?.events ?? [];

  if (eventUUID && packageEvents.length) {
    const match = packageEvents.find(
      (row) => String(row.uuid || "") === eventUUID,
    );
    if (match) return match;
  }

  if (direct?.name) {
    if (!eventUUID || !directUUID || directUUID === eventUUID) {
      return direct;
    }
  }

  const orderEvent = transfer.order?.event;
  if (orderEvent?.name) {
    const orderEventUUID = String(orderEvent.uuid || "").trim();
    if (!eventUUID || orderEventUUID === eventUUID) {
      return orderEvent;
    }
  }

  if (eventUUID) {
    if (directUUID === eventUUID && direct) return direct;
    if (direct?.name || direct?.start) {
      return { ...direct, uuid: eventUUID };
    }
    return { uuid: eventUUID };
  }

  return direct?.name ? direct : null;
}

function preferTransferStatus(
  left?: string,
  right?: string,
): string {
  const a = normalizedStatus(left);
  const b = normalizedStatus(right);
  if (INACTIVE.has(a) || INACTIVE.has(b)) {
    return INACTIVE.has(a) ? String(left || "") : String(right || "");
  }
  if (COMPLETED.has(a) || COMPLETED.has(b)) {
    return COMPLETED.has(a) ? String(left || "") : String(right || "");
  }
  return String(left || right || "");
}

function mergeTransferRecord(
  existing: TransferLike,
  next: TransferLike,
): TransferLike {
  const primary = existing.event?.name ? existing : next.event?.name ? next : existing;
  const secondary = primary === existing ? next : existing;
  const tickets =
    (primary.tickets?.length ?? 0) >= (secondary.tickets?.length ?? 0)
      ? primary.tickets
      : secondary.tickets;
  const accessPass =
    primary.access_pass?.name || primary.accessPass?.name
      ? primary.access_pass ?? primary.accessPass
      : secondary.access_pass?.name || secondary.accessPass?.name
        ? secondary.access_pass ?? secondary.accessPass
        : primary.access_pass ??
          primary.accessPass ??
          secondary.access_pass ??
          secondary.accessPass;
  return {
    ...secondary,
    ...primary,
    event: primary.event?.name ? primary.event : secondary.event ?? primary.event,
    tickets,
    access_pass: accessPass,
    accessPass,
    eventUUID: primary.eventUUID || secondary.eventUUID,
    status: preferTransferStatus(primary.status, secondary.status),
    createdAt: primary.createdAt || secondary.createdAt,
    transferedOn: primary.transferedOn || secondary.transferedOn,
  };
}

function readAcceptTransferResponseMeta(acceptResponse?: unknown): {
  status?: string;
  transferedOn?: string;
} {
  if (!acceptResponse || typeof acceptResponse !== "object") return {};
  const body =
    (acceptResponse as { data?: unknown }).data ?? acceptResponse;
  if (!body || typeof body !== "object") return {};
  const row = body as Record<string, unknown>;
  const status = String(row.status || "").trim();
  const transferedOn = String(row.transferedOn || row.transferredOn || "").trim();
  return {
    status: status || undefined,
    transferedOn: transferedOn || undefined,
  };
}

/** Move an accepted pending incoming transfer into received history as claimed. */
export function promoteAcceptedIncomingTransferToReceived(
  receivedTransfers: TransferLike[],
  acceptedRecord: TransferLike | undefined,
  acceptResponse?: unknown,
): TransferLike[] {
  if (!acceptedRecord) return receivedTransfers;
  const id = String(acceptedRecord.id ?? "").trim();
  if (!id) return receivedTransfers;

  const responseMeta = readAcceptTransferResponseMeta(acceptResponse);

  const claimedRecord: TransferLike = {
    ...acceptedRecord,
    status: responseMeta.status || "claimed",
    transferedOn:
      responseMeta.transferedOn ||
      acceptedRecord.transferedOn ||
      new Date().toISOString(),
  };

  const withoutDuplicate = receivedTransfers.filter(
    (transfer) => String(transfer.id ?? "").trim() !== id,
  );
  return mergeTransferRecords(withoutDuplicate, [claimedRecord]);
}

/** Dedupe transfer rows from incoming and history endpoints. */
export function mergeTransferRecords(
  ...groups: TransferLike[][]
): TransferLike[] {
  const byId = new Map<string, TransferLike>();

  for (const group of groups) {
    for (const transfer of group) {
      const id = String(transfer.id ?? "").trim();
      if (!id) continue;
      const existing = byId.get(id);
      byId.set(id, existing ? mergeTransferRecord(existing, transfer) : transfer);
    }
  }

  return [...byId.values()];
}

function titleCaseWord(value: string) {
  const word = value.trim();
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function transferSenderEmail(transfer?: {
  fromUser?: TransferLike["fromUser"];
  fromUserEmail?: string;
} | null): string {
  return String(
    transfer?.fromUserEmail || transfer?.fromUser?.email || "",
  ).trim();
}

/** Wallet copy uses "M. Rivera" when only an email or partial name is available. */
export function formatTransferSenderLabel(transfer?: {
  fromUser?: TransferLike["fromUser"];
  fromUserEmail?: string;
} | null): string {
  const firstName = String(transfer?.fromUser?.firstName || "").trim();
  const lastName = String(transfer?.fromUser?.lastName || "").trim();
  if (firstName && lastName) {
    return `${firstName.charAt(0).toUpperCase()}. ${titleCaseWord(lastName)}`;
  }
  if (lastName) return titleCaseWord(lastName);

  const email = transferSenderEmail(transfer);
  if (!email) return "Someone";

  const local = email.split("@")[0] || "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]!.charAt(0).toUpperCase()}. ${titleCaseWord(parts[parts.length - 1]!)}`;
  }

  const named = formatTicketHolderName({ email });
  return named === email ? local || "Someone" : named;
}

export function pendingIncomingTransferLabel(transfer?: {
  fromUser?: TransferLike["fromUser"];
  fromUserEmail?: string;
} | null) {
  return `Pending transfer from ${formatTransferSenderLabel(transfer)}`;
}

/** Blocktickets upcoming wallet uses `/ticket-transfers/incoming`; history uses REST lists. */
export function unwrapTransferRecords(payload: unknown): TransferLike[] {
  return unwrapList<unknown>(payload)
    .map(normalizeTransferRecord)
    .filter((row): row is TransferLike => Boolean(row));
}

const PENDING = new Set([
  "pending",
  "pending_transfer",
  "transfer_pending",
  "assigned",
]);

const COMPLETED = new Set([
  "accepted",
  "complete",
  "completed",
  "transferred",
  "claimed",
]);

const INACTIVE = new Set([
  "cancelled",
  "canceled",
  "rejected",
  "declined",
  "expired",
  "revoked",
]);

function normalizedStatus(value: unknown) {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function transferStatusLabel(status?: string) {
  const normalized = normalizedStatus(status);
  if (PENDING.has(normalized)) return "pending";
  if (INACTIVE.has(normalized)) return "cancelled";
  if (COMPLETED.has(normalized)) return "claimed";
  if (!normalized) return "pending";
  return "cancelled";
}

/** Pending incoming rows for Upcoming and the accept flow. */
export function isPendingIncomingTransferRecord(
  transfer: TransferLike,
): boolean {
  const normalized = normalizedStatus(transfer.status);
  if (INACTIVE.has(normalized) || COMPLETED.has(normalized)) return false;
  return !normalized || PENDING.has(normalized);
}

export function filterPendingIncomingTransfers(
  transfers: TransferLike[],
): TransferLike[] {
  return transfers.filter(isPendingIncomingTransferRecord);
}

const locallyResolvedIncomingTransferIds = new Set<string>();

/** Keep accepted/cancelled incoming rows out of wallet reloads until the API catches up. */
export function markIncomingTransferLocallyResolved(transferId: string) {
  const id = String(transferId ?? "").trim();
  if (id) locallyResolvedIncomingTransferIds.add(id);
}

export function unmarkIncomingTransferLocallyResolved(transferId: string) {
  const id = String(transferId ?? "").trim();
  if (id) locallyResolvedIncomingTransferIds.delete(id);
}

/** @internal Test hook — clears locally resolved incoming transfer ids between cases. */
export function clearLocallyResolvedIncomingTransfersForTests() {
  locallyResolvedIncomingTransferIds.clear();
}

function inactiveReceivedTransferIds(receivedTransfers: TransferLike[]) {
  return new Set(
    receivedTransfers
      .filter((transfer) => INACTIVE.has(normalizedStatus(transfer.status)))
      .map((transfer) => String(transfer.id ?? "").trim())
      .filter(Boolean),
  );
}

function receivedHistoryResolvedTransferIds(receivedTransfers: TransferLike[]) {
  return new Set(
    receivedTransfers
      .filter((transfer) => {
        const status = normalizedStatus(transfer.status);
        return INACTIVE.has(status) || COMPLETED.has(status);
      })
      .map((transfer) => String(transfer.id ?? "").trim())
      .filter(Boolean),
  );
}

/** Drop incoming rows resolved on the received-history list (claimed/cancelled). */
export function filterIncomingTransfersAgainstReceivedHistory(
  incomingTransfers: TransferLike[],
  receivedTransfers: TransferLike[],
): TransferLike[] {
  const resolvedIds = receivedHistoryResolvedTransferIds(receivedTransfers);
  if (!resolvedIds.size) return incomingTransfers;
  return incomingTransfers.filter(
    (transfer) =>
      !resolvedIds.has(String(transfer.id ?? "").trim()),
  );
}

export function filterIncomingTransfersForWallet(
  incomingTransfers: TransferLike[],
  receivedTransfers: TransferLike[] = [],
): TransferLike[] {
  const pending = filterPendingIncomingTransfers(
    filterIncomingTransfersAgainstReceivedHistory(
      incomingTransfers,
      receivedTransfers,
    ),
  );
  const apiIds = new Set(
    pending
      .map((transfer) => String(transfer.id ?? "").trim())
      .filter(Boolean),
  );
  const receivedPendingIds = new Set(
    filterPendingIncomingTransfers(receivedTransfers)
      .map((transfer) => String(transfer.id ?? "").trim())
      .filter(Boolean),
  );
  for (const id of locallyResolvedIncomingTransferIds) {
    if (!apiIds.has(id) && !receivedPendingIds.has(id)) {
      locallyResolvedIncomingTransferIds.delete(id);
    }
  }
  return pending.filter(
    (transfer) =>
      !locallyResolvedIncomingTransferIds.has(
        String(transfer.id ?? "").trim(),
      ),
  );
}

export function filterActiveTransferRecords(
  transfers: TransferLike[],
): TransferLike[] {
  return transfers.filter(
    (transfer) => !INACTIVE.has(normalizedStatus(transfer.status)),
  );
}

function walletOrderKey(order: Pick<OrderLike, "id" | "orderId">) {
  return String(order.orderId || order.id || "").trim();
}

/** Borrow package game names from wallet orders when transfer payloads omit `event`. */
export function enrichTransferRecordsFromOrders(
  transfers: TransferLike[],
  orders: OrderLike[] = [],
): TransferLike[] {
  if (!orders.length) return transfers;

  const ordersById = new Map<string, TransferOrderLike>();
  for (const order of orders) {
    const key = walletOrderKey(order);
    if (key) ordersById.set(key, order);
    if (order.id != null) ordersById.set(String(order.id), order);
  }

  return transfers.map((transfer) => {
    const key = String(transfer.orderId ?? "").trim();
    const order = key ? ordersById.get(key) : undefined;
    if (!order) return transfer;

    const event = resolveTransferEvent({
      event: transfer.event,
      eventUUID: transfer.eventUUID,
      tickets: transfer.tickets,
      order,
    });
    const pass = transfer.access_pass ?? transfer.accessPass;
    let access_pass = pass;
    if (pass && order.package) {
      const pkg = order.package as {
        name?: string;
        start?: string;
        end?: string;
        events?: EventLike[];
      };
      access_pass = {
        ...pass,
        name: pass.name || pkg.name,
        start: pass.start || pkg.start,
        end: pass.end || pkg.end,
        events: pass.events?.length ? pass.events : pkg.events,
        type: pass.type || "package",
      };
    }

    const next = {
      ...transfer,
      event: event?.name ? event : transfer.event,
      ...(access_pass ? { access_pass: access_pass, accessPass: access_pass } : {}),
    };
    if (!event?.name && !transfer.event?.name && !access_pass) return transfer;
    return next;
  });
}

export function buildWalletSentTransferRows(
  sentTransfers: TransferLike[],
  orders: OrderLike[] = [],
): WalletTransferRow[] {
  return mapSentTransferRows(
    enrichTransferRecordsFromOrders(
      dedupeActivePendingSentByTicketIds(filterActiveTransferRecords(sentTransfers)),
      orders,
    ),
  );
}

/** Keep API received history while preserving optimistic claimed rows. */
export function mergeWalletReceivedTransferRecords(
  apiReceived: TransferLike[],
  localReceived: TransferLike[],
): TransferLike[] {
  const localById = new Map<string, TransferLike>();
  for (const transfer of localReceived) {
    const id = String(transfer.id ?? "").trim();
    if (id) localById.set(id, transfer);
  }

  const apiActive = filterActiveTransferRecords(apiReceived).map((transfer) => {
    const id = String(transfer.id ?? "").trim();
    if (!id) return transfer;
    const local = localById.get(id);
    const localClaimed =
      local && COMPLETED.has(normalizedStatus(local.status));
    if (localClaimed && isPendingIncomingTransferRecord(transfer)) {
      return local;
    }
    return transfer;
  });

  const apiIds = new Set(
    apiActive
      .map((transfer) => String(transfer.id ?? "").trim())
      .filter(Boolean),
  );
  const apiInactiveIds = new Set(
    apiReceived
      .filter((transfer) => INACTIVE.has(normalizedStatus(transfer.status)))
      .map((transfer) => String(transfer.id ?? "").trim())
      .filter(Boolean),
  );
  const localClaimed = localReceived.filter((transfer) => {
    const id = String(transfer.id ?? "").trim();
    if (!id || apiInactiveIds.has(id)) return false;
    if (!COMPLETED.has(normalizedStatus(transfer.status))) return false;
    if (apiIds.has(id)) return false;
    return true;
  });
  return mergeTransferRecords(apiActive, localClaimed);
}

export function transferTicketIdsKey(transfer: TransferLike): string {
  return (transfer.tickets ?? [])
    .map((ticket) => String(ticket.id ?? "").trim())
    .filter(Boolean)
    .sort()
    .join("|");
}

function sentTransferRecipientEmail(transfer: TransferLike): string {
  return String(transfer.emailAddressToUser || "").trim().toLowerCase();
}

/** Match an optimistic sent stub to the real Blocktickets transfer row. */
export function findReconciledSentTransferMatch(
  stub: TransferLike,
  apiRecords: TransferLike[],
  usedApiIds: Set<string> = new Set(),
): TransferLike | undefined {
  const stubEmail = sentTransferRecipientEmail(stub);
  const stubPassId = transferAccessPassId(stub);
  const stubTicketKey = transferTicketIdsKey(stub);

  return apiRecords.find((api) => {
    const apiId = String(api.id ?? "").trim();
    if (!apiId || usedApiIds.has(apiId)) return false;
    if (sentTransferRecipientEmail(api) !== stubEmail) return false;
    if (stubPassId) {
      return transferAccessPassId(api) === stubPassId;
    }
    if (!stubTicketKey) return false;
    return transferTicketIdsKey(api) === stubTicketKey;
  });
}

/** Resolve a sent transfer's real API id without merging lists (cancel preflight). */
export function resolveSentTransferIdFromApi(
  localRow: TransferLike,
  apiRecords: TransferLike[],
): string | number | null {
  const localId = String(localRow.id ?? "").trim();
  if (localId && !isOptimisticWalletTransferId(localId)) {
    return /^\d+$/.test(localId) ? Number(localId) : localId;
  }
  const match = findReconciledSentTransferMatch(
    localRow,
    filterActiveTransferRecords(apiRecords),
  );
  const resolved = String(match?.id ?? "").trim();
  if (!resolved || isOptimisticWalletTransferId(resolved)) return null;
  return /^\d+$/.test(resolved) ? Number(resolved) : resolved;
}

/** Replace optimistic sent ids with real API ids after POST /ticket-transfers. */
export function reconcileOptimisticSentTransfers(
  localRecords: TransferLike[],
  apiRecords: TransferLike[],
): TransferLike[] {
  const apiPending = filterActiveTransferRecords(apiRecords);
  const usedApiIds = new Set<string>();

  return localRecords.map((local) => {
    const localId = String(local.id ?? "").trim();
    if (!localId || !isOptimisticWalletTransferId(localId)) return local;
    const match = findReconciledSentTransferMatch(
      local,
      apiPending,
      usedApiIds,
    );
    if (!match) return local;
    usedApiIds.add(String(match.id ?? "").trim());
    return {
      ...mergeTransferRecord(local, match),
      id: match.id,
    };
  });
}

/** Only one pending sent transfer per ticket should be visible. */
export function dedupeActivePendingSentByTicketIds(
  transfers: TransferLike[],
): TransferLike[] {
  const claimedOrOther: TransferLike[] = [];
  const pendingByTicketKey = new Map<string, TransferLike>();

  for (const transfer of transfers) {
    if (INACTIVE.has(normalizedStatus(transfer.status))) {
      continue;
    }
    if (COMPLETED.has(normalizedStatus(transfer.status))) {
      claimedOrOther.push(transfer);
      continue;
    }
    const ticketKey = transferTicketIdsKey(transfer);
    const passId = transferAccessPassId(transfer);
    const dedupeKey = ticketKey
      ? ticketKey
      : passId
        ? `pass:${passId}`
        : "";
    if (!dedupeKey) {
      claimedOrOther.push(transfer);
      continue;
    }
    const existing = pendingByTicketKey.get(dedupeKey);
    if (!existing) {
      pendingByTicketKey.set(dedupeKey, transfer);
      continue;
    }
    const existingTime = moment(existing.createdAt || 0).valueOf();
    const nextTime = moment(transfer.createdAt || 0).valueOf();
    if (nextTime >= existingTime) {
      pendingByTicketKey.set(dedupeKey, transfer);
    }
  }

  return [...claimedOrOther, ...pendingByTicketKey.values()];
}

/** Keep API sent history while preserving optimistic pending rows. */
export function mergeWalletSentTransferRecords(
  apiSent: TransferLike[],
  localSent: TransferLike[],
): TransferLike[] {
  const apiActive = filterActiveTransferRecords(apiSent);
  const reconciledLocal = reconcileOptimisticSentTransfers(localSent, apiActive);
  const apiActiveIds = new Set(
    apiActive
      .map((transfer) => String(transfer.id ?? "").trim())
      .filter(Boolean),
  );
  const apiInactiveIds = new Set(
    apiSent
      .filter((transfer) => INACTIVE.has(normalizedStatus(transfer.status)))
      .map((transfer) => String(transfer.id ?? "").trim())
      .filter(Boolean),
  );
  const inactiveTicketScopeKey = (transfer: TransferLike) => {
    const ticketKey = transferTicketIdsKey(transfer);
    if (ticketKey) return ticketKey;
    const passId = transferAccessPassId(transfer);
    return passId ? `pass:${passId}` : "";
  };
  const apiInactiveTicketKeys = new Set(
    apiSent
      .filter((transfer) => INACTIVE.has(normalizedStatus(transfer.status)))
      .map(inactiveTicketScopeKey)
      .filter(Boolean),
  );
  const usedApiMatchIds = new Set<string>();
  const localPending = reconciledLocal.filter((transfer) => {
    const id = String(transfer.id ?? "").trim();
    if (id && apiInactiveIds.has(id)) return false;
    const scopedTicketKey = inactiveTicketScopeKey(transfer);
    if (scopedTicketKey && apiInactiveTicketKeys.has(scopedTicketKey)) return false;
    if (INACTIVE.has(normalizedStatus(transfer.status))) return false;
    if (COMPLETED.has(normalizedStatus(transfer.status))) return false;
    if (id && apiActiveIds.has(id)) return false;
    if (findReconciledSentTransferMatch(transfer, apiActive, usedApiMatchIds)) {
      return false;
    }
    return (
      isOptimisticWalletTransferId(id) ||
      !normalizedStatus(transfer.status) ||
      PENDING.has(normalizedStatus(transfer.status))
    );
  });
  return dedupeActivePendingSentByTicketIds(
    mergeTransferRecords(apiActive, localPending),
  );
}

/** Only one pending transfer per ticket should be visible on Received. */
export function dedupeActivePendingReceivedByTicketIds(
  transfers: TransferLike[],
): TransferLike[] {
  const claimedOrOther: TransferLike[] = [];
  const pendingByTicketKey = new Map<string, TransferLike>();

  for (const transfer of transfers) {
    if (!isPendingIncomingTransferRecord(transfer)) {
      claimedOrOther.push(transfer);
      continue;
    }
    const ticketKey = transferTicketIdsKey(transfer);
    if (!ticketKey) {
      claimedOrOther.push(transfer);
      continue;
    }
    const existing = pendingByTicketKey.get(ticketKey);
    if (!existing) {
      pendingByTicketKey.set(ticketKey, transfer);
      continue;
    }
    const existingTime = moment(existing.createdAt || 0).valueOf();
    const nextTime = moment(transfer.createdAt || 0).valueOf();
    if (nextTime >= existingTime) {
      pendingByTicketKey.set(ticketKey, transfer);
    }
  }

  return [...claimedOrOther, ...pendingByTicketKey.values()];
}

/** Blocktickets My Transfers → Received uses GET /ticket-transfers only (not /incoming). */
export function buildWalletReceivedTransferRows(
  receivedTransfers: TransferLike[],
  _incomingTransfers: TransferLike[] = [],
  orders: OrderLike[] = [],
): WalletTransferRow[] {
  const activeReceived = dedupeActivePendingReceivedByTicketIds(
    mergeTransferRecords(filterActiveTransferRecords(receivedTransfers)),
  );
  return mapReceivedTransferRows(
    enrichTransferRecordsFromOrders(activeReceived, orders),
  );
}

/** Hide cancelled/rejected transfers; list newest `createdAt` first. */
export function filterVisibleWalletTransferRows(
  rows: WalletTransferRow[],
): WalletTransferRow[] {
  return sortWalletTransferRows(
    rows.filter((row) => row.status === "pending" || row.status === "claimed"),
  );
}

function transferTitle(transfer: TransferLike) {
  const passName = String(
    transfer.access_pass?.name || transfer.accessPass?.name || "",
  ).trim();
  if (passName) return passName;
  const event = resolveTransferEvent(transfer);
  return String(event?.name || "").trim() || "Transfer";
}

function passTransferKind(
  transfer: TransferLike,
): "season pass" | "access pass" | undefined {
  if (transfer.tickets?.length) return undefined;
  const pass = transfer.access_pass ?? transfer.accessPass;
  if (!pass && !transfer.accessPassId) return undefined;
  const type = String(pass?.type || "").trim().toLowerCase();
  return type === "package" ? "season pass" : "access pass";
}

function passTransferSeatLabel(transfer: TransferLike) {
  const pass = transfer.access_pass ?? transfer.accessPass;
  if (!pass) return "Tickets";
  const type = String(pass.type || "").trim().toLowerCase();
  if (type === "package") return "1 Season pass";
  if (type === "organizer") return "1 Access pass";
  const passName = String(pass.name || "").trim();
  return passName ? `1 ${passName}` : "1 Access pass";
}

function transferSeatLines(transfer: TransferLike): string[] {
  const tickets = transfer.tickets ?? [];
  if (!tickets.length) {
    return [passTransferSeatLabel(transfer)];
  }
  return groupedWalletSeatLines(tickets);
}

function transferScheduleLine(transfer: TransferLike): string {
  const pass = transfer.access_pass ?? transfer.accessPass;
  if (!transfer.tickets?.length && pass) {
    const events = pass.events ?? [];
    const sorted = [...events].sort((a, b) =>
      String(a.start || "").localeCompare(String(b.start || "")),
    );
    const start = pass.start || sorted[0]?.start;
    const end = pass.end || sorted.at(-1)?.start || sorted.at(-1)?.end;
    const timezone =
      sorted[0]?.venue?.timezone ||
      transfer.event?.venue?.timezone ||
      undefined;
    return formatPassDateRange(start, end, timezone);
  }

  const event = resolveTransferEvent(transfer);
  if (!event?.start) return "";
  return eventWhenLabel(event as EventLike, eventTimezone(event as EventLike));
}

function formatTransferTimestamp(
  value: string | undefined,
  timezone: string | undefined,
) {
  const iso = String(value || "").trim();
  if (!iso) return "";
  const when = formatEventWhen(iso, timezone, "MMM D, YYYY");
  if (when) return when;
  const parsed = moment(iso);
  return parsed.isValid() ? parsed.format("MMM D, YYYY") : iso;
}

function transferEventTimezone(transfer: TransferLike) {
  return transfer.event?.venue?.timezone;
}

function transferWhen(transfer: TransferLike) {
  return formatTransferTimestamp(transfer.createdAt, transferEventTimezone(transfer));
}

function transferClaimedWhen(transfer: TransferLike) {
  return formatTransferTimestamp(
    transfer.transferedOn,
    transferEventTimezone(transfer),
  );
}

function mapTransferRow(
  transfer: TransferLike,
  direction: "sent" | "received",
): WalletTransferRow | null {
  const id = String(transfer.id ?? "").trim();
  if (!id) return null;
  const status = transferStatusLabel(transfer.status);
  return {
    id,
    to: direction === "sent" ? transfer.emailAddressToUser : undefined,
    from:
      direction === "received"
        ? transferSenderEmail(transfer) || "Someone"
        : undefined,
    title: transferTitle(transfer),
    seatLines: transferSeatLines(transfer),
    seat: transferSeatLines(transfer).join(" · "),
    schedule: transferScheduleLine(transfer) || undefined,
    on: transferWhen(transfer),
    claimedOn: transferClaimedWhen(transfer) || undefined,
    status,
    createdAt: transfer.createdAt,
    accessPassId: transferAccessPassId(transfer) || undefined,
    passKind: passTransferKind(transfer),
    ticketCount: transfer.tickets?.length,
  };
}

/** Blocktickets lists transfers newest first (`createdAt:desc`). */
export function sortWalletTransferRows(
  rows: WalletTransferRow[],
): WalletTransferRow[] {
  return [...rows].sort((a, b) => {
    const aTime = moment(a.createdAt || 0).valueOf();
    const bTime = moment(b.createdAt || 0).valueOf();
    if (aTime !== bTime) return bTime - aTime;
    return String(b.id).localeCompare(String(a.id));
  });
}

export function mapSentTransferRows(
  transfers: TransferLike[],
): WalletTransferRow[] {
  return sortWalletTransferRows(
    transfers
      .map((transfer) => mapTransferRow(transfer, "sent"))
      .filter((row): row is WalletTransferRow => Boolean(row)),
  );
}

export function mapReceivedTransferRows(
  transfers: TransferLike[],
): WalletTransferRow[] {
  return sortWalletTransferRows(
    transfers
      .map((transfer) => mapTransferRow(transfer, "received"))
      .filter((row): row is WalletTransferRow => Boolean(row)),
  );
}

export function isOptimisticWalletTransferId(id: string): boolean {
  return /^transfer-/.test(id) || /^access-pass-transfer-/.test(id);
}

export function resolveCreatedTransferId(
  data: unknown,
  fallback: string,
): string {
  return resolveCreatedTransferMeta(data, {
    id: fallback,
    createdAt: "",
  }).id;
}

export function resolveCreatedTransferMeta(
  data: unknown,
  fallback: { id: string; createdAt: string },
): { id: string; createdAt: string } {
  const normalized = normalizeTransferRecord(
    (data as { data?: unknown } | null | undefined)?.data ?? data,
  );
  const id = String(normalized?.id ?? "").trim();
  const createdAt = String(normalized?.createdAt ?? "").trim();
  return {
    id: id || fallback.id,
    createdAt: createdAt || fallback.createdAt,
  };
}

function optimisticTransferTicketIds(cancelId: string): string[] {
  if (!isOptimisticWalletTransferId(cancelId)) return [];
  const suffix = String(cancelId).replace(/^transfer-/, "");
  if (!suffix) return [];
  return suffix.split("-").filter(Boolean);
}

function recordTicketIds(record: TransferLike): string[] {
  return (record.tickets ?? [])
    .map((ticket) => String(ticket.id ?? "").trim())
    .filter(Boolean);
}

function recordMatchesOptimisticCancel(
  record: TransferLike,
  cancelId: string,
): boolean {
  const ticketIds = optimisticTransferTicketIds(cancelId);
  if (!ticketIds.length) return false;
  const recordIds = recordTicketIds(record);
  return (
    ticketIds.length === recordIds.length &&
    ticketIds.every((id) => recordIds.includes(id))
  );
}

function sentTransferRecordMatchesCancel(
  record: TransferLike,
  _cancelRow: WalletTransferRow,
  cancelId: string,
  _orders: OrderLike[],
): boolean {
  const recordId = String(record.id ?? "").trim();
  if (cancelId && recordId && recordId === cancelId) {
    return true;
  }
  if (!cancelId || !isOptimisticWalletTransferId(cancelId)) {
    return false;
  }
  return recordMatchesOptimisticCancel(record, cancelId);
}

export function findSentTransferRecordForCancel(
  records: TransferLike[],
  cancelRow: WalletTransferRow,
  orders: OrderLike[] = [],
): TransferLike | undefined {
  const cancelId = String(cancelRow.id ?? "").trim();
  return records.find((record) =>
    sentTransferRecordMatchesCancel(record, cancelRow, cancelId, orders),
  );
}

export function removeSentTransferRecordsForCancel(
  records: TransferLike[],
  cancelRow: WalletTransferRow,
  orders: OrderLike[] = [],
): TransferLike[] {
  const cancelId = String(cancelRow.id ?? "").trim();
  return records.filter(
    (record) =>
      !sentTransferRecordMatchesCancel(record, cancelRow, cancelId, orders),
  );
}

export function resolveCancelTransferId(
  data: unknown,
): string | number | null | undefined {
  if (typeof data === "string" || typeof data === "number") return data;
  const body = (data ?? {}) as {
    transferId?: string | number;
    data?: { transferId?: string | number };
  };
  return body.data?.transferId ?? body.transferId;
}

/** Blocktickets cancel route reads `transferId` from `ctx.request.body.data`. */
export function resolveCancelTransferIdForApi(
  cancelId: string | number | null | undefined,
  records: TransferLike[] = [],
  cancelRow?: Pick<WalletTransferRow, "id" | "seat" | "seatLines" | "to" | "status" | "title" | "accessPassId">,
): string | number | null {
  const raw = String(cancelId ?? "").trim();
  if (!raw) return null;
  if (!isOptimisticWalletTransferId(raw)) return raw;

  const matched = records.find((record) =>
    sentTransferRecordMatchesCancel(
      record,
      (cancelRow ?? { id: raw }) as WalletTransferRow,
      raw,
      [],
    ),
  );
  const resolved = String(matched?.id ?? "").trim();
  if (!resolved || isOptimisticWalletTransferId(resolved)) return null;
  return /^\d+$/.test(resolved) ? Number(resolved) : resolved;
}

export function buildCancelTransferRequestBody(
  transferId: string | number | null | undefined,
): { data: { transferId: number | string } } | null {
  const raw = String(transferId ?? "").trim();
  if (!raw || isOptimisticWalletTransferId(raw)) return null;
  return {
    data: {
      transferId: /^\d+$/.test(raw) ? Number(raw) : raw,
    },
  };
}

function normalizeTransferRecipient(value?: string): string {
  return String(value || "").trim().toLowerCase();
}

function normalizeTransferSeatKey(row: Pick<WalletTransferRow, "seatLines" | "seat">): string {
  const lines = row.seatLines?.length ? row.seatLines : [row.seat];
  return lines
    .map((line) => String(line || "").trim())
    .filter(Boolean)
    .sort()
    .join("|");
}

/** Optimistic rows use synthetic ids; match API rows by recipient, event, and seats. */
export function walletTransferRowsEquivalent(
  a: WalletTransferRow,
  b: WalletTransferRow,
): boolean {
  const aId = String(a.id ?? "").trim();
  const bId = String(b.id ?? "").trim();
  if (aId && bId && aId !== bId) {
    const aOptimistic = isOptimisticWalletTransferId(aId);
    const bOptimistic = isOptimisticWalletTransferId(bId);
    if (aOptimistic && bOptimistic) return false;
    if (!aOptimistic && !bOptimistic) return false;
  }
  if (normalizeTransferRecipient(a.to) !== normalizeTransferRecipient(b.to)) {
    return false;
  }
  if (a.status !== b.status) return false;
  if (a.title.trim().toLowerCase() !== b.title.trim().toLowerCase()) {
    return false;
  }
  if (normalizeTransferSeatKey(a) !== normalizeTransferSeatKey(b)) {
    return false;
  }
  if (a.accessPassId && b.accessPassId) {
    return a.accessPassId === b.accessPassId;
  }
  return true;
}

export function mergeWalletTransferRows(
  primary: WalletTransferRow[],
  secondary: WalletTransferRow[],
): WalletTransferRow[] {
  const merged = [...secondary];

  for (const row of primary) {
    const equivalentIndex = merged.findIndex((existing) =>
      walletTransferRowsEquivalent(existing, row),
    );
    if (equivalentIndex >= 0) {
      if (
        isOptimisticWalletTransferId(merged[equivalentIndex].id) &&
        !isOptimisticWalletTransferId(row.id)
      ) {
        merged[equivalentIndex] = row;
      }
      continue;
    }
    if (merged.some((existing) => existing.id === row.id)) continue;
    merged.push(row);
  }

  return sortWalletTransferRows(merged);
}
