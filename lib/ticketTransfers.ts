import moment from "moment-timezone";
import { formatEventWhen } from "@/lib/helpers";
import {
  eventTimezone,
  eventWhenLabel,
  formatTicketHolderName,
  groupedWalletSeatLines,
  resolveAccessPassTotalEventCount,
  seatLabel,
  strapiAttr,
  strapiRel,
  accessPassWalletOrderId,
  unwrapAccessPassRecord,
  unwrapList,
  type AccessPassLike,
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

type TransferOrderPackageLike = {
  uuid?: string;
  name?: string;
  start?: string;
  end?: string;
  image?: unknown;
  events?: EventLike[];
  venue?: EventLike["venue"];
  organization?: { name?: string };
};

type TransferOrderLike = {
  id?: number | string;
  orderId?: number | string;
  event?: EventLike | null;
  details?: {
    package?: TransferOrderPackageLike;
    details?: { package?: TransferOrderPackageLike };
  };
  package?: TransferOrderPackageLike | null;
};

type TransferPassLike = {
  uuid?: string;
  orderId?: string | number;
  name?: string;
  type?: string;
  start?: string;
  end?: string;
  events?: EventLike[];
  artwork?: unknown;
  generalAdmission?: boolean;
  GA?: boolean;
  sectionNumber?: string | number;
  rowNumber?: string | number;
  seatNumber?: string | number;
};

export type TransferLike = {
  id?: number | string;
  status?: string;
  createdAt?: string;
  transferedOn?: string;
  transferType?: string;
  accessPassId?: string | number;
  accessPassSnapshot?: TransferPassLike | null;
  orderId?: string | number;
  emailAddressToUser?: string;
  fromUserEmail?: string;
  fromUser?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
  event?: EventLike | { uuid?: string; name?: string; start?: string; venue?: { timezone?: string } } | null;
  /** Authoritative game uuid on package transfers; the `event` relation may be order.event. */
  eventUUID?: string;
  tickets?: TicketLike[];
  access_pass?: TransferPassLike | null;
  accessPass?: TransferPassLike | null;
  order?: TransferOrderLike | null;
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

  const order = enrichTransferOrder(
    (strapiRel<TransferOrderLike>(row.order) ??
      (row.order as TransferOrderLike | undefined)) as
      | TransferOrderLike
      | undefined,
  );
  const tickets = normalizeTicketList(row.tickets);
  const eventUUID = String(row.eventUUID || row.event_uuid || "").trim() || undefined;
  let event =
    strapiRel<EventLike>(row.event) ??
    (row.event as EventLike | undefined) ??
    null;
  event = resolveTransferEvent({ event, eventUUID, tickets, order });
  const orderId = row.orderId ?? order?.orderId ?? order?.id;
  const accessPassRelation =
    strapiRel<TransferPassLike>(row.access_pass ?? row.accessPass) ??
    (row.access_pass as TransferLike["access_pass"] | undefined) ??
    (row.accessPass as TransferLike["accessPass"] | undefined);
  const accessPassSnapshot =
    (row.accessPassSnapshot as TransferPassLike | undefined) ?? undefined;
  const accessPass = accessPassSnapshot
    ? { ...accessPassSnapshot, ...accessPassRelation }
    : accessPassRelation;
  const fromUser =
    strapiRel<{ firstName?: string; lastName?: string; email?: string }>(
      row.fromUser,
    ) ?? (row.fromUser as TransferLike["fromUser"] | undefined);

  return {
    id: id as number | string,
    status: String(row.status || ""),
    createdAt: String(row.createdAt || ""),
    transferedOn: String(row.transferedOn || row.transferredOn || ""),
    transferType: String(row.transferType || "").trim() || undefined,
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
    accessPassSnapshot,
    access_pass: accessPass,
    accessPass,
    order,
  };
}

/** Pass id on ticket-transfer payloads (season or organizer access pass). */
export function transferAccessPassId(transfer: TransferLike): string {
  const pass = resolveTransferPass(transfer);
  return String(transfer.accessPassId || pass?.uuid || "").trim();
}

function normalizedTransferType(transfer: TransferLike): string {
  return String(transfer.transferType || "").trim().toLowerCase();
}

function resolveTransferPass(
  transfer: TransferLike,
): TransferPassLike | null | undefined {
  const relation = transfer.access_pass ?? transfer.accessPass;
  const snapshot = transfer.accessPassSnapshot;
  const merged = relation?.name
    ? { ...snapshot, ...relation }
    : snapshot
      ? { ...relation, ...snapshot }
      : relation ?? snapshot;
  if (!merged) return merged;
  const artwork = snapshot?.artwork ?? relation?.artwork;
  return artwork && !merged.artwork ? { ...merged, artwork } : merged;
}

/** Whole pass transfer (season or organizer), not a single-game ticket transfer. */
export function isWholeAccessPassTransfer(transfer: TransferLike): boolean {
  if (normalizedTransferType(transfer) === "access_pass") return true;
  const pass = resolveTransferPass(transfer);
  const passId = transferAccessPassId(transfer);
  if (!passId && !pass) return false;
  return !(transfer.tickets?.length);
}

function isSingleGamePackageTicketTransfer(transfer: TransferLike): boolean {
  const event = resolveTransferEvent(transfer);
  if (!event?.name) return false;
  const eventUUID = transferTicketEventUUID(transfer);
  const tickets = transfer.tickets ?? [];
  if (!tickets.length) {
    const pass = transfer.access_pass ?? transfer.accessPass;
    if (!pass) return false;
    const hasSeatLink =
      pass.sectionNumber != null ||
      pass.rowNumber != null ||
      pass.seatNumber != null;
    return Boolean(event?.name && hasSeatLink);
  }
  if (!eventUUID) return false;
  const ticketEvents = new Set(
    tickets
      .map((ticket) => String(ticket.eventUUID || ticket.eventId || "").trim())
      .filter(Boolean),
  );
  if (ticketEvents.size > 1) return false;
  if (ticketEvents.size === 0) return false;
  return ticketEvents.has(eventUUID);
}

/** Pass transfer card copy (name + event count), including API rows that include tickets. */
export function isPassTransferRowPresentation(transfer: TransferLike): boolean {
  if (normalizedTransferType(transfer) === "access_pass") return true;
  if (isSingleGamePackageTicketTransfer(transfer)) return false;
  const pass = resolveTransferPass(transfer);
  const passId = transferAccessPassId(transfer);
  if (passId && pass?.name) return true;
  if (!pass && !passId) return false;
  return !(transfer.tickets?.length);
}

function formatPassEventCount(count: number): string {
  if (count <= 0) return "";
  return count === 1 ? "1 event" : `${count} events`;
}

function parsePassEventCount(schedule?: string): number {
  const match = String(schedule || "").match(/^(\d+)\s+events?$/i);
  return match ? Number(match[1]) : 0;
}

export type WalletTransferBuildContext = {
  orders?: OrderLike[];
  packageEventCounts?: Map<string, number>;
};

function transferOrderLookupIds(transfer: TransferLike): string[] {
  const ids = new Set<string>();
  const add = (value?: string | number | null) => {
    const normalized = String(value ?? "").trim();
    if (normalized) ids.add(normalized);
  };
  add(transfer.orderId);
  const pass = resolveTransferPass(transfer);
  add(pass?.orderId);
  if (transfer.order?.orderId != null) add(transfer.order.orderId);
  if (transfer.order?.id != null) add(transfer.order.id);
  return [...ids];
}

export function resolveTransferOrderPackage(
  order?: TransferOrderLike | null,
): TransferOrderPackageLike | undefined {
  if (!order) return undefined;
  const details = order.details;
  const fromDetails =
    details?.package ??
    details?.details?.package;
  const fromRelation = order.package;
  if (!fromDetails && !fromRelation) return undefined;
  return {
    ...fromRelation,
    ...fromDetails,
    events: mergeUniquePackageEvents(fromDetails?.events, fromRelation?.events),
    image: fromDetails?.image ?? fromRelation?.image,
    name: fromDetails?.name ?? fromRelation?.name,
    venue: fromDetails?.venue ?? fromRelation?.venue,
    organization: fromDetails?.organization ?? fromRelation?.organization,
  };
}

function enrichTransferOrder(
  order?: TransferOrderLike | null,
): TransferOrderLike | undefined {
  if (!order) return undefined;
  const pkg = resolveTransferOrderPackage(order);
  if (!pkg) return order;
  return { ...order, package: pkg };
}

function transferOrderHasPackageSnapshot(order?: TransferOrderLike | null) {
  const pkg = resolveTransferOrderPackage(order);
  if (!pkg) return false;
  return Boolean(
    pkg.name ||
      pkg.image ||
      (pkg.events?.length ?? 0) > 0,
  );
}

function findWalletOrderForTransfer(
  transfer: TransferLike,
  orders: OrderLike[] = [],
): OrderLike | undefined {
  if (transferOrderHasPackageSnapshot(transfer.order)) {
    return transfer.order as OrderLike;
  }
  for (const transferOrderId of transferOrderLookupIds(transfer)) {
    const match = orders.find((order) => {
      const walletOrderId = String(order.orderId ?? "").trim();
      const walletRecordId = String(order.id ?? "").trim();
      return (
        transferOrderId === walletOrderId ||
        transferOrderId === walletRecordId
      );
    });
    if (match) return match;
  }
  return undefined;
}

export function mergeUniquePackageEvents(
  ...sources: Array<EventLike[] | undefined>
): EventLike[] {
  const seen = new Set<string>();
  const out: EventLike[] = [];
  for (const events of sources) {
    for (const event of events ?? []) {
      const key = String(
        event.uuid ||
          event.name ||
          (event.id != null ? `id:${event.id}` : "") ||
          "",
      ).trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(event);
    }
  }
  return out;
}

/** Snapshot order.package (image + full schedule) onto pass transfer payloads. */
export function buildPassTransferOrderSnapshot(
  order: OrderLike | undefined,
  packageEvents: EventLike[] = [],
): TransferOrderLike | undefined {
  const pkg = order?.package;
  const events = mergeUniquePackageEvents(packageEvents, pkg?.events);
  if (!pkg && !events.length) return undefined;
  return {
    orderId: order?.orderId ?? order?.id,
    id: order?.id,
    package: {
      name: pkg?.name,
      image: pkg?.image,
      events: events.length ? events : pkg?.events,
      venue: pkg?.venue,
      organization: pkg?.organization,
    },
  };
}

export function resolvePassTransferPackageImage(
  transfer: TransferLike,
  orders: OrderLike[] = [],
): unknown {
  const pass = resolveTransferPass(transfer);
  const walletOrder = findWalletOrderForTransfer(transfer, orders);
  const transferPackage = resolveTransferOrderPackage(transfer.order);
  const walletPackage = resolveTransferOrderPackage(walletOrder);
  const event = transfer.event as EventLike | undefined;
  return (
    walletPackage?.image ??
    transferPackage?.image ??
    transfer.accessPassSnapshot?.artwork ??
    pass?.artwork ??
    event?.image ??
    undefined
  );
}

/** Union package games from the transfer payload and any matching wallet order. */
export function resolvePassTransferPackageEvents(
  transfer: TransferLike,
  orders: OrderLike[] = [],
): EventLike[] {
  const pass = resolveTransferPass(transfer);
  const walletOrder = findWalletOrderForTransfer(transfer, orders);
  return mergeUniquePackageEvents(
    resolveTransferOrderPackage(walletOrder)?.events,
    resolveTransferOrderPackage(transfer.order)?.events,
    pass?.events,
  );
}

export function mergePackageEventCountLookups(
  ...maps: Array<Map<string, number>>
): Map<string, number> {
  const merged = new Map<string, number>();
  for (const map of maps) {
    for (const [key, count] of map) {
      if (count > (merged.get(key) ?? 0)) merged.set(key, count);
    }
  }
  return merged;
}

export function unwrapAcceptTransferAccessPass(
  acceptResponse?: unknown,
): AccessPassLike | null {
  return unwrapAccessPassRecord(acceptResponse);
}

/** Recipient wallet order id after accept; synthetic `accepted-*` until reload. */
export function resolveAcceptedPassTransferWalletOrderId(
  transfer?: TransferLike | null,
  acceptResponse?: unknown,
): string {
  const acceptedPass = unwrapAcceptTransferAccessPass(acceptResponse);
  const fromPass = acceptedPass
    ? String(accessPassWalletOrderId(acceptedPass) || "").trim()
    : "";
  if (isWalletOrderIdForAccessPassFetch(fromPass)) return fromPass;

  const transferId = String(
    transfer?.id ?? acceptedPass?.uuid ?? "transfer",
  ).trim();
  return `accepted-${transferId || "transfer"}`;
}

/** True when wallet orders already include the accepted season pass package. */
export function walletOrdersIncludeAcceptedPassPackage(
  orders: OrderLike[],
  transfer?: TransferLike | null,
  acceptResponse?: unknown,
): boolean {
  const transferPackage = resolveTransferOrderPackage(transfer?.order);
  const packageUUID = String(transferPackage?.uuid ?? "").trim();
  const walletOrderId = resolveAcceptedPassTransferWalletOrderId(
    transfer,
    acceptResponse,
  );
  return orders.some((order) => {
    if (!order.package) return false;
    const orderId = String(order.orderId ?? order.id ?? "").trim();
    if (walletOrderId && orderId === walletOrderId) return true;
    const pkgUuid = String(order.package?.uuid ?? "").trim();
    return Boolean(packageUUID && pkgUuid === packageUUID);
  });
}

/** Wallet order ids accepted by GET /access-passes/by-order (not numeric record ids). */
export function isWalletOrderIdForAccessPassFetch(orderId: string): boolean {
  const normalized = String(orderId || "").trim();
  if (!normalized || /^\d+$/.test(normalized)) return false;
  return normalized.includes("-");
}

export function collectPassTransferOrderIds(
  transfers: TransferLike[],
  orders: OrderLike[] = [],
): string[] {
  const ids = new Set<string>();
  for (const transfer of transfers) {
    if (!isPassTransferRowPresentation(transfer)) continue;
    const order = findWalletOrderForTransfer(transfer, orders);
    const walletOrderId = String(order?.orderId ?? "").trim();
    if (isWalletOrderIdForAccessPassFetch(walletOrderId)) {
      ids.add(walletOrderId);
      continue;
    }
    for (const transferOrderId of transferOrderLookupIds(transfer)) {
      if (isWalletOrderIdForAccessPassFetch(transferOrderId)) {
        ids.add(transferOrderId);
      }
    }
  }
  return [...ids];
}

/** Merge live access-pass schedules onto transfer snapshots that omit past games. */
export function enrichPassTransfersFromAccessPasses(
  transfers: TransferLike[],
  passesByOrderId: Map<string, AccessPassLike[]>,
): TransferLike[] {
  return transfers.map((transfer) => {
    if (!isPassTransferRowPresentation(transfer)) return transfer;
    const passId = transferAccessPassId(transfer);
    if (!passId) return transfer;

    for (const orderId of transferOrderLookupIds(transfer)) {
      const passes = passesByOrderId.get(orderId);
      const match = passes?.find(
        (pass) => String(pass.uuid || "").trim() === passId,
      );
      if (!match?.events?.length) continue;

      const pass = resolveTransferPass(transfer);
      const mergedEvents = mergeUniquePackageEvents(
        match.events,
        pass?.events,
        transfer.order?.package?.events,
      );
      const access_pass = {
        ...pass,
        ...match,
        events: mergedEvents.length ? mergedEvents : match.events,
      };
      return {
        ...transfer,
        access_pass,
        accessPass: access_pass,
      };
    }

    return transfer;
  });
}

export function buildPackageEventCountLookupFromAccessPasses(
  passesByOrderId: Map<string, AccessPassLike[]>,
  orders: OrderLike[] = [],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const [orderId, passes] of passesByOrderId) {
    const order = orders.find(
      (row) =>
        String(row.orderId ?? "") === orderId ||
        String(row.id ?? "") === orderId,
    );
    for (const pass of passes) {
      const count = resolveAccessPassTotalEventCount(pass, {
        packageEvents: order?.package?.events,
      });
      if (count <= 0) continue;
      for (const key of [
        orderId,
        String(pass.orderId ?? "").trim(),
        order?.id != null ? String(order.id) : "",
        order?.orderId != null ? String(order.orderId) : "",
      ]) {
        if (!key) continue;
        if (count > (map.get(key) ?? 0)) map.set(key, count);
      }
    }
  }
  return map;
}

export function buildPackageEventCountLookupFromTransfers(
  transfers: TransferLike[],
  orders: OrderLike[] = [],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const transfer of transfers) {
    if (!isPassTransferRowPresentation(transfer)) continue;
    const [enriched] = enrichTransferRecordsFromOrders([transfer], orders);
    if (!enriched) continue;
    const count = resolvePassTransferPackageEvents(enriched, orders).length;
    if (count <= 0) continue;
    for (const key of transferOrderLookupIds(enriched)) {
      if (count > (map.get(key) ?? 0)) map.set(key, count);
    }
  }
  return map;
}

export function buildPackageEventCountLookup(
  packages: Array<{ key: string; orderId?: string; eventCount: number }>,
  orders: OrderLike[] = [],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const pkg of packages) {
    if (pkg.eventCount <= 0) continue;
    map.set(pkg.key, pkg.eventCount);
    if (pkg.orderId) {
      const orderId = String(pkg.orderId);
      map.set(orderId, pkg.eventCount);
      const order = orders.find(
        (row) =>
          String(row.orderId ?? "") === orderId ||
          String(row.id ?? "") === orderId,
      );
      if (order?.id != null) map.set(String(order.id), pkg.eventCount);
      if (order?.orderId != null) map.set(String(order.orderId), pkg.eventCount);
    }
  }
  return map;
}

/** Season-pass transfer cards use the snapshot schedule, not the package. */
export function resolvePassTransferEventCount(
  transfer: TransferLike,
  _context: WalletTransferBuildContext = {},
): number {
  const snapshotEvents = transfer.accessPassSnapshot?.events;
  if (snapshotEvents?.length) return snapshotEvents.length;
  const relation = transfer.access_pass ?? transfer.accessPass;
  return relation?.events?.length ?? 0;
}

function passEventCountLine(
  transfer: TransferLike,
  context: WalletTransferBuildContext = {},
): string {
  return formatPassEventCount(resolvePassTransferEventCount(transfer, context));
}

/** One season or access pass transfer represents a single pass ticket. */
export function resolveIncomingPassTicketCount(_transfer: TransferLike): number {
  return 1;
}

/** Pass-focused copy for pending incoming transfers on My Tickets. */
export function incomingPassTransferPresentation(
  transfer: TransferLike,
  context: WalletTransferBuildContext = {},
) {
  const eventCount = resolvePassTransferEventCount(transfer, context);
  return {
    title: transferTitle(transfer),
    seatLines: transferSeatLines(transfer),
    schedule: passEventCountLine(transfer, context),
    passKind: passTransferKind(transfer),
    accessPassId: transferAccessPassId(transfer) || undefined,
    eventCount,
    ticketCount: resolveIncomingPassTicketCount(transfer),
  };
}

/** Sender loses a pass from the wallet once a transfer is sent or claimed. */
export function filterWalletAccessPassesBySentTransfers<
  T extends { uuid?: string },
>(passes: T[], sentTransfers: TransferLike[]): T[] {
  const hiddenIds = new Set<string>();
  for (const transfer of sentTransfers) {
    if (!isWholeAccessPassTransfer(transfer)) continue;
    const passId = transferAccessPassId(transfer);
    if (!passId) continue;
    const status = transferStatusLabel(transfer.status);
    if (status === "claimed" || status === "pending") {
      hiddenIds.add(passId);
    }
  }
  return passes.filter((pass) => !hiddenIds.has(String(pass.uuid || "").trim()));
}

/** Hide access-pass summaries the sender has already transferred. */
export function filterAccessPassSummariesBySentTransfers<
  T extends { accessPassUUID?: string },
>(summaries: T[], sentTransfers: TransferLike[]): T[] {
  const allowed = filterWalletAccessPassesBySentTransfers(
    summaries.map((summary) => ({ uuid: summary.accessPassUUID })),
    sentTransfers,
  );
  const allowedIds = new Set(
    allowed.map((pass) => String(pass.uuid || "").trim()).filter(Boolean),
  );
  return summaries.filter((summary) =>
    allowedIds.has(String(summary.accessPassUUID || "").trim()),
  );
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

function ticketSeatRichness(ticket: TicketLike): number {
  let score = 0;
  if (ticket.sectionNumber != null) score += 1;
  if (ticket.rowNumber != null) score += 1;
  if (ticket.seatNumber != null) score += 1;
  if (ticket.generalAdmission || ticket.GA) score += 1;
  return score;
}

function transferTicketsRichness(tickets?: TicketLike[]): number {
  return (tickets ?? []).reduce(
    (total, ticket) => total + ticketSeatRichness(ticket),
    tickets?.length ?? 0,
  );
}

function preferRicherTransferTickets(
  left?: TicketLike[],
  right?: TicketLike[],
): TicketLike[] | undefined {
  const leftScore = transferTicketsRichness(left);
  const rightScore = transferTicketsRichness(right);
  if (leftScore !== rightScore) {
    return leftScore > rightScore ? left : right;
  }
  return (left?.length ?? 0) >= (right?.length ?? 0) ? left : right;
}

function mergeTransferRecord(
  existing: TransferLike,
  next: TransferLike,
): TransferLike {
  const primary = existing.event?.name ? existing : next.event?.name ? next : existing;
  const secondary = primary === existing ? next : existing;
  const tickets = preferRicherTransferTickets(primary.tickets, secondary.tickets);
  const primaryPass = primary.access_pass ?? primary.accessPass;
  const secondaryPass = secondary.access_pass ?? secondary.accessPass;
  const mergedPassEvents = mergeUniquePackageEvents(
    primary.accessPassSnapshot?.events,
    secondary.accessPassSnapshot?.events,
    primaryPass?.events,
    secondaryPass?.events,
  );
  const basePass = primaryPass?.name
    ? primaryPass
    : secondaryPass?.name
      ? secondaryPass
      : primaryPass ?? secondaryPass;
  const accessPass = basePass
    ? {
        ...basePass,
        ...(mergedPassEvents.length ? { events: mergedPassEvents } : {}),
      }
    : undefined;
  const accessPassSnapshot =
    primary.accessPassSnapshot ?? secondary.accessPassSnapshot;
  const mergedOrderPackageEvents = mergeUniquePackageEvents(
    primary.order?.package?.events,
    secondary.order?.package?.events,
    mergedPassEvents,
  );
  const order =
    primary.order || secondary.order
      ? {
          ...(secondary.order ?? {}),
          ...(primary.order ?? {}),
          ...(mergedOrderPackageEvents.length
            ? {
                package: {
                  ...(secondary.order?.package ?? {}),
                  ...(primary.order?.package ?? {}),
                  events: mergedOrderPackageEvents,
                },
              }
            : {}),
        }
      : primary.order ?? secondary.order;
  return {
    ...secondary,
    ...primary,
    event: primary.event?.name ? primary.event : secondary.event ?? primary.event,
    tickets,
    access_pass: accessPass,
    accessPass,
    accessPassSnapshot,
    order,
    transferType:
      normalizedTransferType(primary) === "access_pass" ||
      normalizedTransferType(secondary) === "access_pass"
        ? "access_pass"
        : primary.transferType || secondary.transferType,
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

/** Successful accept responses should stay visible on Received as claimed. */
function promotedReceivedTransferStatus(acceptResponse?: unknown): string {
  const responseMeta = readAcceptTransferResponseMeta(acceptResponse);
  const normalized = normalizedStatus(responseMeta.status);
  if (COMPLETED.has(normalized)) {
    return responseMeta.status || "claimed";
  }
  return "claimed";
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
    status: promotedReceivedTransferStatus(acceptResponse),
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

function orderTicketsForTransferLookup(
  order?: Pick<OrderLike, "tickets" | "originalTickets" | "details"> | null,
): TicketLike[] {
  if (!order) return [];
  const details = order.details as
    | {
        tickets?: TicketLike[];
        originalTickets?: TicketLike[];
      }
    | undefined;
  const originalTickets = Array.isArray(order.originalTickets)
    ? order.originalTickets
    : [];
  return [
    ...(order.tickets ?? []),
    ...originalTickets,
    ...(details?.tickets ?? []),
    ...(details?.originalTickets ?? []),
  ];
}

function buildTransferTicketLookupPool(
  order?: Pick<OrderLike, "tickets" | "originalTickets" | "details"> | null,
  transferOrder?: TransferOrderLike | null,
  orders: OrderLike[] = [],
): TicketLike[] {
  const seen = new Set<string>();
  const pool: TicketLike[] = [];
  const addTicket = (ticket: TicketLike) => {
    const ticketId = String(ticket.id ?? "").trim();
    if (ticketId) {
      if (seen.has(ticketId)) return;
      seen.add(ticketId);
    }
    pool.push(ticket);
  };
  for (const source of [
    order,
    transferOrder as OrderLike | undefined,
    ...orders,
  ]) {
    for (const ticket of orderTicketsForTransferLookup(source)) {
      addTicket(ticket);
    }
  }
  return pool;
}

function mergeTicketFromLookupPool(
  ticket: TicketLike,
  lookupPool: TicketLike[],
): TicketLike {
  const ticketId = String(ticket.id ?? "").trim();
  if (!ticketId) return ticket;
  for (const source of lookupPool) {
    if (String(source.id ?? "").trim() !== ticketId) continue;
    return {
      ...source,
      ...ticket,
      sectionNumber: ticket.sectionNumber ?? source.sectionNumber,
      rowNumber: ticket.rowNumber ?? source.rowNumber,
      seatNumber: ticket.seatNumber ?? source.seatNumber,
      sectionName: ticket.sectionName ?? source.sectionName,
      generalAdmission: ticket.generalAdmission ?? source.generalAdmission,
      GA: ticket.GA ?? source.GA,
      eventUUID: ticket.eventUUID ?? source.eventUUID,
      eventId: ticket.eventId ?? source.eventId,
    };
  }
  return ticket;
}

function seatsMatchPassSeat(
  ticket: TicketLike,
  pass: TransferPassLike,
): boolean {
  if (pass.sectionNumber != null) {
    if (String(ticket.sectionNumber ?? "") !== String(pass.sectionNumber)) {
      return false;
    }
  }
  if (pass.rowNumber != null) {
    if (String(ticket.rowNumber ?? "") !== String(pass.rowNumber)) {
      return false;
    }
  }
  if (pass.seatNumber != null) {
    if (String(ticket.seatNumber ?? "") !== String(pass.seatNumber)) {
      return false;
    }
  }
  return (
    pass.sectionNumber != null ||
    pass.rowNumber != null ||
    pass.seatNumber != null
  );
}

function inferWalletTicketsForTransfer(
  transfer: TransferLike,
  lookupPool: TicketLike[],
): TicketLike[] {
  if (isPassTransferRowPresentation(transfer)) return [];

  const eventUUID = transferTicketEventUUID(transfer);
  if (!eventUUID) return [];

  const eventTickets = lookupPool.filter((ticket) => {
    const ticketEvent = String(ticket.eventUUID || ticket.eventId || "").trim();
    return ticketEvent === eventUUID;
  });
  if (!eventTickets.length) return [];

  const pass = transfer.access_pass ?? transfer.accessPass;
  if (pass) {
    const seated = eventTickets.filter((ticket) =>
      seatsMatchPassSeat(ticket, pass),
    );
    if (seated.length) return seated;
  }

  if (eventTickets.length === 1) return eventTickets;
  return [];
}

function resolveTransferTickets(
  transfer: TransferLike,
  order?: Pick<OrderLike, "tickets" | "originalTickets" | "details"> | null,
  orders: OrderLike[] = [],
): TicketLike[] {
  const explicit = transfer.tickets ?? [];
  const lookupPool = buildTransferTicketLookupPool(
    order,
    transfer.order as TransferOrderLike | undefined,
    orders,
  );

  if (explicit.length) {
    if (!lookupPool.length) return explicit;
    return explicit.map((ticket) =>
      mergeTicketFromLookupPool(ticket, lookupPool),
    );
  }

  return inferWalletTicketsForTransfer(transfer, lookupPool);
}

/** Borrow package game names from wallet orders when transfer payloads omit `event`. */
export function enrichTransferRecordsFromOrders(
  transfers: TransferLike[],
  orders: OrderLike[] = [],
): TransferLike[] {
  const ordersById = new Map<string, TransferOrderLike>();
  for (const order of orders) {
    const key = walletOrderKey(order);
    if (key) ordersById.set(key, order);
    if (order.id != null) ordersById.set(String(order.id), order);
  }

  return transfers.map((transfer) => {
    const walletOrder =
      findWalletOrderForTransfer(transfer, orders) ??
      (() => {
        const key = String(transfer.orderId ?? "").trim();
        return key ? ordersById.get(key) : undefined;
      })();
    const order =
      walletOrder ??
      (transfer.order as OrderLike | undefined) ??
      undefined;
    const tickets = resolveTransferTickets(transfer, order, orders);
    const enrichedTransfer = tickets.length ? { ...transfer, tickets } : transfer;

    if (!order) return enrichedTransfer;

    const event = resolveTransferEvent({
      event: enrichedTransfer.event,
      eventUUID: enrichedTransfer.eventUUID,
      tickets: enrichedTransfer.tickets,
      order,
    });
    const pass = resolveTransferPass(enrichedTransfer);
    let access_pass = pass;
    const orderPackage = resolveTransferOrderPackage(order);
    if (isPassTransferRowPresentation(enrichedTransfer) && orderPackage) {
      const pkg = orderPackage;
      access_pass = {
        ...pass,
        name: pass?.name || pkg.name,
        start: pass?.start || pkg.start,
        end: pass?.end || pkg.end,
        ...(pass?.events?.length ? { events: pass.events } : {}),
        artwork: pass?.artwork ?? pkg.image,
        type: pass?.type || "package",
      };
    } else if (pass) {
      access_pass = pass;
    }

    const next = {
      ...enrichedTransfer,
      order: enrichedTransfer.order ?? order ?? null,
      event: isPassTransferRowPresentation(enrichedTransfer)
        ? enrichedTransfer.event
        : event?.name
          ? event
          : enrichedTransfer.event,
      ...(access_pass ? { access_pass: access_pass, accessPass: access_pass } : {}),
    };
    if (
      !isPassTransferRowPresentation(enrichedTransfer) &&
      !event?.name &&
      !enrichedTransfer.event?.name &&
      !access_pass
    ) {
      return enrichedTransfer;
    }
    return next;
  });
}

export function buildWalletSentTransferRows(
  sentTransfers: TransferLike[],
  orders: OrderLike[] = [],
  context: WalletTransferBuildContext = {},
): WalletTransferRow[] {
  const buildContext = { ...context, orders };
  return mapSentTransferRows(
    enrichTransferRecordsFromOrders(
      dedupeActivePendingSentByTicketIds(filterActiveTransferRecords(sentTransfers)),
      orders,
    ),
    buildContext,
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
    if (local) return mergeTransferRecord(local, transfer);
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

function sentStubMatchesTicketlessApi(
  stub: TransferLike,
  api: TransferLike,
): boolean {
  if (!PENDING.has(normalizedStatus(stub.status))) return false;
  if (!PENDING.has(normalizedStatus(api.status))) return false;
  const stubEventUUID = transferTicketEventUUID(stub);
  const apiEventUUID = transferTicketEventUUID(api);
  if (stubEventUUID && apiEventUUID && stubEventUUID !== apiEventUUID) {
    return false;
  }
  const stubEventName = String(stub.event?.name || "").trim().toLowerCase();
  const apiEventName = String(
    api.event?.name || api.order?.event?.name || "",
  )
    .trim()
    .toLowerCase();
  if (stubEventName && apiEventName && stubEventName !== apiEventName) {
    return false;
  }
  return Boolean(transferTicketIdsKey(stub));
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

  const exact = apiRecords.find((api) => {
    const apiId = String(api.id ?? "").trim();
    if (!apiId || usedApiIds.has(apiId)) return false;
    if (sentTransferRecipientEmail(api) !== stubEmail) return false;
    if (stubPassId) {
      return transferAccessPassId(api) === stubPassId;
    }
    if (!stubTicketKey) return false;
    return (
      transferTicketIdsKey(api) === stubTicketKey ||
      transferTicketsEquivalent(stub, api)
    );
  });
  if (exact) return exact;

  if (stubPassId || !stubTicketKey) return undefined;

  const ticketlessMatches = apiRecords.filter((api) => {
    const apiId = String(api.id ?? "").trim();
    if (!apiId || usedApiIds.has(apiId)) return false;
    if (sentTransferRecipientEmail(api) !== stubEmail) return false;
    if (transferAccessPassId(api)) return false;
    if (transferTicketIdsKey(api)) return false;
    return sentStubMatchesTicketlessApi(stub, api);
  });
  if (ticketlessMatches.length === 1) return ticketlessMatches[0];
  return undefined;
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

/** Append optimistic sent stubs after POST /ticket-transfers without dropping existing rows. */
export function appendLocalSentTransferStubs(
  existingSent: TransferLike[],
  newStubs: TransferLike[],
): TransferLike[] {
  return mergeWalletSentTransferRecords(existingSent, newStubs);
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
  const enrichedApiActive = apiActive.map((api) => {
    const localMatch = reconciledLocal.find(
      (local) =>
        findReconciledSentTransferMatch(local, [api], usedApiMatchIds) != null,
    );
    if (!localMatch) return api;
    usedApiMatchIds.add(String(api.id ?? "").trim());
    return mergeTransferRecord(localMatch, api);
  });
  const localPending = reconciledLocal.filter((transfer) => {
    const id = String(transfer.id ?? "").trim();
    if (id && apiInactiveIds.has(id)) return false;
    const scopedTicketKey = inactiveTicketScopeKey(transfer);
    if (scopedTicketKey && apiInactiveTicketKeys.has(scopedTicketKey)) return false;
    if (INACTIVE.has(normalizedStatus(transfer.status))) return false;
    if (COMPLETED.has(normalizedStatus(transfer.status))) return false;
    if (id && apiActiveIds.has(id)) return false;
    if (findReconciledSentTransferMatch(transfer, enrichedApiActive, usedApiMatchIds)) {
      return false;
    }
    return (
      isOptimisticWalletTransferId(id) ||
      !normalizedStatus(transfer.status) ||
      PENDING.has(normalizedStatus(transfer.status))
    );
  });
  return dedupeActivePendingSentByTicketIds(
    mergeTransferRecords(enrichedApiActive, localPending),
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

/** Blocktickets My Transfers → Received merges pending incoming pass transfers. */
export function buildWalletReceivedTransferRows(
  receivedTransfers: TransferLike[],
  incomingTransfers: TransferLike[] = [],
  orders: OrderLike[] = [],
  context: WalletTransferBuildContext = {},
): WalletTransferRow[] {
  const activeReceived = dedupeActivePendingReceivedByTicketIds(
    mergeTransferRecords(filterActiveTransferRecords(receivedTransfers)),
  );
  const receivedIds = new Set(
    activeReceived
      .map((transfer) => String(transfer.id ?? "").trim())
      .filter(Boolean),
  );
  const incomingPending = filterPendingIncomingTransfers(incomingTransfers);
  const incomingToMerge = incomingPending.filter((transfer) => {
    const id = String(transfer.id ?? "").trim();
    if (id && receivedIds.has(id)) return true;
    return (
      isPassTransferRowPresentation(transfer) &&
      (!id || !receivedIds.has(id))
    );
  });
  const mergedReceived = dedupeActivePendingReceivedByTicketIds(
    mergeTransferRecords(activeReceived, incomingToMerge),
  );
  const buildContext = { ...context, orders };
  return mapReceivedTransferRows(
    enrichTransferRecordsFromOrders(mergedReceived, orders),
    buildContext,
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
  if (isPassTransferRowPresentation(transfer)) {
    const passName = String(resolveTransferPass(transfer)?.name || "").trim();
    if (passName) return passName;
    const kind = passTransferKind(transfer);
    return kind === "season pass" ? "Season pass" : "Access pass";
  }
  const event = resolveTransferEvent(transfer);
  return String(event?.name || "").trim() || "Transfer";
}

function passTransferKind(
  transfer: TransferLike,
): "season pass" | "access pass" | undefined {
  if (!isPassTransferRowPresentation(transfer)) return undefined;
  const pass = resolveTransferPass(transfer);
  if (!pass && !transfer.accessPassId) return undefined;
  const type = String(pass?.type || "").trim().toLowerCase();
  if (type === "package" || type === "season_seat") return "season pass";
  return "access pass";
}

function passTransferSeatLabel(transfer: TransferLike) {
  const pass = resolveTransferPass(transfer);
  if (!pass) return "Tickets";
  const type = String(pass.type || "").trim().toLowerCase();
  if (type === "package" || type === "season_seat") return "1 Season pass";
  if (type === "organizer") return "1 Access pass";
  const passName = String(pass.name || "").trim();
  return passName ? `1 ${passName}` : "1 Access pass";
}

function passTransferSeatLines(transfer: TransferLike): string[] {
  const kind = passTransferKind(transfer);
  const tickets = transfer.tickets ?? [];
  if (kind === "season pass") {
    if (tickets.length) return groupedWalletSeatLines(tickets);
    const pass = resolveTransferPass(transfer);
    if (pass) {
      const seated = seatLabel(pass as TicketLike);
      if (seated && seated !== "Ticket") return [seated];
    }
    return [];
  }
  return [passTransferSeatLabel(transfer)];
}

function transferSeatLines(transfer: TransferLike): string[] {
  if (isPassTransferRowPresentation(transfer)) {
    return passTransferSeatLines(transfer);
  }
  const tickets = transfer.tickets ?? [];
  if (tickets.length) {
    return groupedWalletSeatLines(tickets);
  }
  const linkedPass = transfer.access_pass ?? transfer.accessPass;
  if (linkedPass) {
    const seated = seatLabel(linkedPass as TicketLike);
    if (seated && seated !== "Ticket") return [seated];
  }
  return [];
}

function transferScheduleLine(
  transfer: TransferLike,
  context: WalletTransferBuildContext = {},
): string {
  if (isPassTransferRowPresentation(transfer)) {
    return passEventCountLine(transfer, context);
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
  context: WalletTransferBuildContext = {},
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
    schedule: transferScheduleLine(transfer, context) || undefined,
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
  context: WalletTransferBuildContext = {},
): WalletTransferRow[] {
  return sortWalletTransferRows(
    transfers
      .map((transfer) => mapTransferRow(transfer, "sent", context))
      .filter((row): row is WalletTransferRow => Boolean(row)),
  );
}

export function mapReceivedTransferRows(
  transfers: TransferLike[],
  context: WalletTransferBuildContext = {},
): WalletTransferRow[] {
  return sortWalletTransferRows(
    transfers
      .map((transfer) => mapTransferRow(transfer, "received", context))
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

function transferTicketPairMatches(
  stubTicket: { id?: unknown; eventUUID?: unknown; eventId?: unknown },
  apiTicket: { id?: unknown; eventUUID?: unknown; eventId?: unknown },
): boolean {
  const stubId = String(stubTicket.id ?? "").trim();
  const apiId = String(apiTicket.id ?? "").trim();
  if (!stubId || !apiId) return false;
  if (stubId === apiId) return true;
  const stubEvent = String(stubTicket.eventUUID || stubTicket.eventId || "").trim();
  const apiEvent = String(apiTicket.eventUUID || apiTicket.eventId || "").trim();
  if (stubId.startsWith(`${apiId}-`)) {
    if (stubEvent && apiEvent) return stubEvent === apiEvent;
    if (apiEvent) return stubId.includes(apiEvent);
    return true;
  }
  return false;
}

function transferTicketsEquivalent(
  stub: TransferLike,
  api: TransferLike,
): boolean {
  const stubTickets = stub.tickets ?? [];
  const apiTickets = api.tickets ?? [];
  if (!stubTickets.length || stubTickets.length !== apiTickets.length) {
    return false;
  }
  const used = new Set<number>();
  return stubTickets.every((stubTicket) => {
    const matchIndex = apiTickets.findIndex(
      (apiTicket, index) =>
        !used.has(index) && transferTicketPairMatches(stubTicket, apiTicket),
    );
    if (matchIndex < 0) return false;
    used.add(matchIndex);
    return true;
  });
}

function recordMatchesOptimisticCancel(
  record: TransferLike,
  cancelId: string,
): boolean {
  const recordIds = recordTicketIds(record);
  if (!recordIds.length) return false;
  const suffix = String(cancelId).replace(/^transfer-/, "").trim();
  if (!suffix) return false;
  if (recordIds.join("-") === suffix) return true;
  const ticketIds = optimisticTransferTicketIds(cancelId);
  return (
    ticketIds.length === recordIds.length &&
    ticketIds.every((id) => recordIds.includes(id))
  );
}

function sentTransferRecordMatchesCancel(
  record: TransferLike,
  cancelRow: WalletTransferRow,
  cancelId: string,
  _orders: OrderLike[],
): boolean {
  const recordId = String(record.id ?? "").trim();
  if (cancelId && recordId && recordId === cancelId) {
    return true;
  }
  const mapped = mapTransferRow(record, "sent");
  if (mapped && walletTransferRowsEquivalent(mapped, cancelRow)) {
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

/** Resolve cancel id from local records, then sent-transfer API rows if needed. */
export function resolveCancelTransferIdWithSentLookup(
  cancelRow: Pick<
    WalletTransferRow,
    "id" | "seat" | "seatLines" | "to" | "status" | "title" | "accessPassId"
  >,
  localRecords: TransferLike[] = [],
  apiRecords: TransferLike[] = [],
): string | number | null {
  const direct = resolveCancelTransferIdForApi(
    cancelRow.id,
    localRecords,
    cancelRow,
  );
  if (direct != null && !isOptimisticWalletTransferId(String(direct))) {
    return direct;
  }
  const localRecord = findSentTransferRecordForCancel(
    localRecords,
    cancelRow as WalletTransferRow,
  );
  const stub =
    localRecord ??
    ({
      id: cancelRow.id,
      status: cancelRow.status,
      emailAddressToUser: cancelRow.to,
      tickets: [],
    } as TransferLike);
  return resolveSentTransferIdFromApi(stub, apiRecords);
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
        const existing = merged[equivalentIndex];
        const existingCount = parsePassEventCount(existing.schedule);
        const nextCount = parsePassEventCount(row.schedule);
        merged[equivalentIndex] =
          nextCount > existingCount
            ? { ...row, schedule: row.schedule || existing.schedule }
            : { ...row, schedule: existing.schedule || row.schedule };
      }
      continue;
    }
    if (merged.some((existing) => existing.id === row.id)) continue;
    merged.push(row);
  }

  return sortWalletTransferRows(merged);
}
