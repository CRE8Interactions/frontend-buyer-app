import { getEventsByIds, getTicketGroups } from "@/lib/api";
import { formatOnSaleBadge } from "@/lib/helpers";
import moment from "moment-timezone";

export type SoldOutSource = {
  id?: string | number;
  uuid?: string;
  shortCode?: string;
  shortcode?: string;
  status?: string | null;
  soldout?: boolean | null;
  soldOut?: boolean | null;
  generalOnsale?: string | null;
  hideGeneralOnsale?: boolean | null;
  scheduled?: boolean | null;
  scheduledTime?: string | null;
  venue?: { timezone?: string | null } | null;
  seatmap?: { ga_only?: boolean } | null;
};

/** The API can keep status "on_sale" while the event record says soldOut. */
export function isEventSoldOut(ev: SoldOutSource | null | undefined) {
  if (!ev) return false;
  if (ev.soldOut === true || ev.soldout === true) return true;
  return (ev.status || "").replace(/[\s_]+/g, "").toLowerCase() === "soldout";
}

const NOT_YET_ON_SALE = new Set(["presale", "scheduled", "comingsoon", "onsalesoon"]);

/** Presale and other events whose tickets are not on sale yet. */
export function isNotYetOnSale(ev: SoldOutSource | null | undefined) {
  if (!ev || isEventSoldOut(ev)) return false;
  const raw = (ev.status || "").replace(/[\s_]+/g, "").toLowerCase();
  return NOT_YET_ON_SALE.has(raw);
}

function upcomingOnSaleIso(ev: SoldOutSource) {
  const iso =
    ev.scheduled && ev.scheduledTime
      ? ev.scheduledTime
      : ev.hideGeneralOnsale
        ? null
        : ev.generalOnsale || ev.scheduledTime || null;
  if (!iso) return null;
  const when = moment(iso);
  if (!when.isValid()) return null;
  if (when.isAfter(moment())) return iso;
  if (isNotYetOnSale(ev) || ev.scheduled) return iso;
  return null;
}

/**
 * On-sale badge for seated and GA events whose public on-sale time is still
 * ahead. Sold-out events keep the sold-out badge instead.
 */
export function onSaleBadgeLabel(ev: SoldOutSource | null | undefined) {
  if (!ev || isEventSoldOut(ev)) return "";
  const iso = upcomingOnSaleIso(ev);
  if (!iso) return "";
  return formatOnSaleBadge(iso, ev.venue?.timezone);
}

function withOnSaleFields<T extends SoldOutSource>(ev: T, detail: SoldOutSource): T {
  const patch: Partial<SoldOutSource> = {};
  if (ev.generalOnsale == null && detail.generalOnsale) {
    patch.generalOnsale = detail.generalOnsale;
  }
  if (ev.hideGeneralOnsale == null && detail.hideGeneralOnsale != null) {
    patch.hideGeneralOnsale = detail.hideGeneralOnsale;
  }
  if (ev.scheduled == null && detail.scheduled != null) {
    patch.scheduled = detail.scheduled;
  }
  if (ev.scheduledTime == null && detail.scheduledTime) {
    patch.scheduledTime = detail.scheduledTime;
  }
  const timezone = detail.venue?.timezone;
  const venue =
    !ev.venue?.timezone && timezone ? { ...ev.venue, timezone } : undefined;
  if (!Object.keys(patch).length && !venue) return ev;
  return { ...ev, ...patch, ...(venue ? { venue } : null) };
}

function lookupKeys(ev: SoldOutSource) {
  return [ev.uuid, ev.id, ev.shortCode, ev.shortcode]
    .filter((value) => value != null && value !== "")
    .map(String);
}

function unwrapRows(payload: unknown): SoldOutSource[] {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown })?.data)
      ? (payload as { data: unknown[] }).data
      : [];
  return rows.map((row) => {
    const r = row as { id?: string | number; attributes?: SoldOutSource } & SoldOutSource;
    return r.attributes ? { id: r.id, ...r.attributes } : r;
  });
}

function gaOnly(ev: SoldOutSource | undefined) {
  const seatmap = ev?.seatmap as
    | { ga_only?: boolean; data?: { attributes?: { ga_only?: boolean } } }
    | null
    | undefined;
  return seatmap?.ga_only ?? seatmap?.data?.attributes?.ga_only;
}

const GA_INVENTORY_MS = 60_000;
const gaInventoryCache = new Map<string, { expires: number; soldOut: Promise<boolean> }>();

/**
 * GA events can sell out without the event record saying so; only the
 * ticket-group inventory reports it. Matches the GA page: sold out with
 * nothing left to sell.
 */
function gaInventorySoldOut(id: string | number, uuid: string): Promise<boolean> {
  const key = `${id}:${uuid}`;
  const hit = gaInventoryCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.soldOut;
  const soldOut = Promise.resolve()
    .then(() =>
      getTicketGroups({
        event: { id, uuid },
        quantity: 0,
        offerIds: [],
        priceRange: [0, 500],
        accessCodes: [],
        accessible: false,
        sort: "price",
        returnLocked: true,
      }),
    )
    .then((res) => {
      const data = res?.data as { soldout?: boolean; ticketGroups?: unknown[] } | undefined;
      return Boolean(data?.soldout) && !(data?.ticketGroups || []).length;
    })
    .catch(() => false);
  gaInventoryCache.set(key, { expires: Date.now() + GA_INVENTORY_MS, soldOut });
  return soldOut;
}

async function markGaSoldOut<T extends SoldOutSource>(ev: T, detail?: SoldOutSource): Promise<T> {
  if (isEventSoldOut(ev) || isNotYetOnSale(ev)) return ev;
  if ((gaOnly(ev) ?? gaOnly(detail)) !== true) return ev;
  const id = ev.id ?? detail?.id;
  const uuid = ev.uuid || detail?.uuid;
  if (id == null || id === "" || !uuid) return ev;
  return (await gaInventorySoldOut(id, uuid)) ? { ...ev, soldOut: true } : ev;
}

/** Marks GA events whose ticket inventory is sold out. */
export function withGaInventorySoldOut<T extends SoldOutSource>(events: T[]): Promise<T[]> {
  return Promise.all(events.map((ev) => markGaSoldOut(ev)));
}

/**
 * List endpoints (on-sale, venue upcoming-events) omit soldOut, so read it
 * from the event records and mark matching events. GA events are also
 * checked against their ticket inventory.
 */
export async function withSoldOutFlags<T extends SoldOutSource>(events: T[]): Promise<T[]> {
  const ids = Array.from(
    new Set(
      events.flatMap((ev) => {
        const id = ev.uuid || ev.id || ev.shortCode || ev.shortcode;
        return id != null && id !== "" ? [String(id)] : [];
      }),
    ),
  );
  const details = new Map<string, SoldOutSource>();
  if (ids.length) {
    try {
      const res = await getEventsByIds(ids);
      unwrapRows(res?.data).forEach((detail) => {
        lookupKeys(detail).forEach((key) => details.set(key, detail));
      });
    } catch {
      /* fall back to what the list already says */
    }
  }
  return Promise.all(
    events.map((ev) => {
      const detail = lookupKeys(ev)
        .map((key) => details.get(key))
        .find(Boolean);
      if (!detail) return markGaSoldOut(ev);
      const soldOut = isEventSoldOut(ev) || isEventSoldOut(detail);
      const status = (ev.status || "").trim() ? ev.status : detail.status;
      const base = withOnSaleFields(ev, detail);
      const merged =
        !soldOut && status === base.status
          ? base
          : {
              ...base,
              ...(soldOut ? { soldOut: true } : null),
              ...(status && status !== base.status ? { status } : null),
            };
      return markGaSoldOut(merged, detail);
    }),
  );
}
