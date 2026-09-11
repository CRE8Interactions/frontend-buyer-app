import moment from "moment-timezone";
import { formatEventWhen } from "@/lib/helpers";
import {
  formatTicketHolderName,
  seatLabel,
  strapiAttr,
  strapiRel,
  unwrapList,
  type EventLike,
  type TicketLike,
} from "@/lib/wallet";

export type WalletTransferRow = {
  id: string;
  to?: string;
  from?: string;
  title: string;
  seat: string;
  on: string;
  status: string;
  createdAt?: string;
};

export type TransferLike = {
  id?: number | string;
  status?: string;
  createdAt?: string;
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
  access_pass?: { name?: string } | null;
  accessPass?: { name?: string } | null;
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

  const event =
    strapiRel<EventLike>(row.event) ??
    (row.event as EventLike | undefined) ??
    null;
  const order =
    strapiRel<{ id?: string | number; orderId?: string | number }>(row.order) ??
    (row.order as { id?: string | number; orderId?: string | number } | undefined);
  const orderId = row.orderId ?? order?.orderId ?? order?.id;
  const accessPass =
    strapiRel<{ name?: string }>(row.access_pass ?? row.accessPass) ??
    (row.access_pass as { name?: string } | undefined) ??
    (row.accessPass as { name?: string } | undefined);
  const fromUser =
    strapiRel<{ firstName?: string; lastName?: string; email?: string }>(
      row.fromUser,
    ) ?? (row.fromUser as TransferLike["fromUser"] | undefined);

  return {
    id: id as number | string,
    status: String(row.status || ""),
    createdAt: String(row.createdAt || ""),
    orderId: orderId as string | number | undefined,
    emailAddressToUser: String(row.emailAddressToUser || row.email || ""),
    fromUserEmail: String(row.fromUserEmail || fromUser?.email || ""),
    fromUser,
    event,
    tickets: normalizeTicketList(row.tickets),
    access_pass: accessPass,
    accessPass,
  };
}

function titleCaseWord(value: string) {
  const word = value.trim();
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
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

  const email = String(
    transfer?.fromUserEmail || transfer?.fromUser?.email || "",
  ).trim();
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

function normalizedStatus(value: unknown) {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function transferStatusLabel(status?: string) {
  const normalized = normalizedStatus(status);
  if (PENDING.has(normalized)) return "pending";
  if (
    COMPLETED.has(normalized) ||
    normalized === "cancelled" ||
    normalized === "canceled"
  ) {
    return normalized === "cancelled" || normalized === "canceled"
      ? "cancelled"
      : "claimed";
  }
  return normalized || "pending";
}

function transferTitle(transfer: TransferLike) {
  return (
    String(transfer.event?.name || "").trim() ||
    String(transfer.access_pass?.name || transfer.accessPass?.name || "").trim() ||
    "Transfer"
  );
}

function transferSeat(transfer: TransferLike) {
  const tickets = transfer.tickets ?? [];
  if (!tickets.length) {
    const passName = String(
      transfer.access_pass?.name || transfer.accessPass?.name || "",
    ).trim();
    return passName ? `1 ${passName}` : "Tickets";
  }
  return tickets.map((ticket) => seatLabel(ticket)).join(", ");
}

function transferWhen(transfer: TransferLike) {
  const createdAt = String(transfer.createdAt || "").trim();
  if (!createdAt) return "";
  const timezone = transfer.event?.venue?.timezone;
  const when = formatEventWhen(createdAt, timezone, "MMM D, YYYY");
  if (when) return when;
  const parsed = moment(createdAt);
  return parsed.isValid() ? parsed.format("MMM D, YYYY") : createdAt;
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
        ? formatTransferSenderLabel(transfer)
        : undefined,
    title: transferTitle(transfer),
    seat: transferSeat(transfer),
    on: transferWhen(transfer),
    status,
    createdAt: transfer.createdAt,
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

export function mergeWalletTransferRows(
  primary: WalletTransferRow[],
  secondary: WalletTransferRow[],
): WalletTransferRow[] {
  const seen = new Set(primary.map((row) => row.id));
  const merged = [...primary];
  for (const row of secondary) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    merged.push(row);
  }
  return sortWalletTransferRows(merged);
}
