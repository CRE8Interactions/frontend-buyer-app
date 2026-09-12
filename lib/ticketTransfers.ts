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
  let event =
    strapiRel<EventLike>(row.event) ??
    (row.event as EventLike | undefined) ??
    null;
  event = resolveTransferEvent({ event, tickets, order });
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
  transfer: Pick<TransferLike, "event" | "tickets">,
) {
  const fromEvent = String(transfer.event?.uuid || "").trim();
  if (fromEvent) return fromEvent;
  for (const ticket of transfer.tickets ?? []) {
    const uuid = String(ticket.eventUUID || ticket.eventId || "").trim();
    if (uuid) return uuid;
  }
  return "";
}

/** Package transfers often omit `event`; borrow the matching package game. */
export function resolveTransferEvent(transfer: {
  event?: TransferLike["event"];
  tickets?: TicketLike[];
  order?: TransferOrderLike | null;
}): EventLike | null {
  const direct = transfer.event;
  if (direct?.name) return direct;

  const eventUUID = transferTicketEventUUID(transfer);
  const packageEvents = transfer.order?.package?.events ?? [];
  if (eventUUID && packageEvents.length) {
    const match = packageEvents.find(
      (row) => String(row.uuid || "") === eventUUID,
    );
    if (match) return match;
  }

  if (transfer.order?.event?.name) return transfer.order.event;
  if (direct?.uuid || eventUUID) {
    return direct?.uuid ? direct : { uuid: eventUUID };
  }
  return null;
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
    status: primary.status || secondary.status,
    createdAt: primary.createdAt || secondary.createdAt,
    transferedOn: primary.transferedOn || secondary.transferedOn,
  };
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

function transferSenderEmail(transfer?: {
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
      filterActiveTransferRecords(sentTransfers),
      orders,
    ),
  );
}

export function buildWalletReceivedTransferRows(
  receivedTransfers: TransferLike[],
  incomingTransfers: TransferLike[],
  orders: OrderLike[] = [],
): WalletTransferRow[] {
  const pendingIncoming = filterPendingIncomingTransfers(incomingTransfers);
  const merged = mergeTransferRecords(
    filterActiveTransferRecords(receivedTransfers),
    pendingIncoming,
  );
  return mapReceivedTransferRows(
    enrichTransferRecordsFromOrders(merged, orders),
  );
}

/** Hide cancelled/rejected transfers from wallet transfer tabs. */
export function filterVisibleWalletTransferRows(
  rows: WalletTransferRow[],
): WalletTransferRow[] {
  return rows.filter((row) => row.status === "pending" || row.status === "claimed");
}

function transferTitle(transfer: TransferLike) {
  const passName = String(
    transfer.access_pass?.name || transfer.accessPass?.name || "",
  ).trim();
  if (passName) return passName;
  const event = resolveTransferEvent(transfer);
  return String(event?.name || "").trim() || "Transfer";
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
