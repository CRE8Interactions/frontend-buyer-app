/**
 * Demo axios adapter — used when NEXT_PUBLIC_DEMO=true.
 * Serves real captured snapshots (read-only, one-time pull) from /public/demo,
 * plus a few synthetic responses for login/cart. No request leaves the machine;
 * there is no backend and nothing touches a database.
 *
 * Snapshots cover two real events:
 *   • KpIeUYbz — New Mexico State Soccer (GA)
 *   • W50prW0I — Ogden Raptors vs. Long Beach Coast (seated, full seatmap)
 */
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import {
  DEMO_SESSION,
  DEMO_EVENTS,
  demoAccessPass,
  demoCart,
  demoCompletedFlexPackOrder,
  demoCompletedPackageOrder,
  demoCompletedTicketOrder,
  demoFundraisingCampaign,
  demoGroupInvitation,
  demoPackageAccessPass,
  demoPublicMenu,
  demoSeasonPackage,
} from "./fixtures";
import { filterGroupsForListings, type RawTicketGroup } from "@/lib/ticketListings";

type DemoResult = { data: unknown; status?: number };
type Route = {
  methods: string[];
  match: (path: string) => boolean;
  handle: (path: string, config: InternalAxiosRequestConfig) => DemoResult | Promise<DemoResult>;
};

const endsWith = (suffix: string) => (path: string) => path.split("?")[0].endsWith(suffix);
const GA_CODE = "KpIeUYbz";
const SEATED_CODE = "W50prW0I";
/** Only two events are snapshotted; map any shortcode onto the right one. */
const mapCode = (sc?: string) => (sc === GA_CODE ? GA_CODE : SEATED_CODE);
const lastSeg = (path: string) => {
  const segs = path.split("?")[0].split("/").filter(Boolean);
  return segs[segs.length - 1];
};

/** Fetch a staged snapshot from /public/demo (same-origin static file), cached. */
const snapCache = new Map<string, Promise<unknown>>();
function snap(file: string): Promise<unknown> {
  let p = snapCache.get(file);
  if (!p) {
    p = fetch(`/demo/${file}`).then((r) => r.json());
    snapCache.set(file, p);
  }
  return p;
}

let uuidMapP: Promise<Record<string, string>> | null = null;
function uuidToCode(): Promise<Record<string, string>> {
  if (!uuidMapP) {
    uuidMapP = Promise.all([snap(`event-${GA_CODE}.json`), snap(`event-${SEATED_CODE}.json`)]).then(
      ([a, b]) => {
        const m: Record<string, string> = {};
        const au = (a as { event?: { uuid?: string } })?.event?.uuid;
        const bu = (b as { event?: { uuid?: string } })?.event?.uuid;
        if (au) m[au] = GA_CODE;
        if (bu) m[bu] = SEATED_CODE;
        return m;
      },
    );
  }
  return uuidMapP;
}

function parseBody(config: InternalAxiosRequestConfig): Record<string, unknown> {
  const d = config.data;
  if (!d) return {};
  if (typeof d === "string") {
    try {
      return JSON.parse(d);
    } catch {
      return {};
    }
  }
  return d as Record<string, unknown>;
}

function cancelTransferIdFromBody(body: Record<string, unknown>): string {
  const nested =
    body.data && typeof body.data === "object"
      ? (body.data as Record<string, unknown>)
      : null;
  return String(nested?.transferId ?? body.transferId ?? "");
}

type DemoWalletEvent = {
  uuid?: string;
  name?: string;
  start?: string;
  image?: unknown;
  [key: string]: unknown;
};
type DemoWalletPackage = {
  uuid?: string;
  name?: string;
  image?: unknown;
  events?: DemoWalletEvent[];
  [key: string]: unknown;
};
type DemoTicket = {
  id?: number | string;
  eventUUID?: string;
  eventId?: string;
  transferStatus?: string;
  ticketTransfer?: { status?: string };
  transferredAt?: string;
  [key: string]: unknown;
};
type DemoWalletOrder = {
  id?: number | string;
  orderId?: string;
  email?: string;
  event?: DemoWalletEvent | null;
  package?: DemoWalletPackage | null;
  tickets?: DemoTicket[];
  flex_pack?: unknown;
  [key: string]: unknown;
};
type DemoSentTransfer = {
  id: string;
  status: "pending" | "claimed" | "cancelled";
  orderId?: string | number;
  email?: string;
  emailAddressToUser?: string;
  fromUserEmail?: string;
  createdAt?: string;
  transferedOn?: string;
  event?: DemoWalletEvent | null;
  tickets?: DemoTicket[];
  order?: {
    id?: string | number;
    orderId?: string | number;
    details?: { package?: DemoWalletPackage };
    package?: DemoWalletPackage | null;
  };
  accessPassId?: string;
  transferType?: string;
  accessPassSnapshot?: DemoSentTransfer["access_pass"];
  access_pass?: {
    uuid?: string;
    name?: string;
    type?: string;
    start?: string;
    end?: string;
    events?: DemoWalletEvent[];
    artwork?: unknown;
    sectionNumber?: string | number;
    rowNumber?: string | number;
    seatNumber?: string | number;
    generalAdmission?: boolean;
  };
};

function demoTransferOrderSnapshot(
  order: DemoWalletOrder | undefined,
  packageEvents?: DemoWalletEvent[],
): NonNullable<DemoSentTransfer["order"]> {
  const pkg = order?.package ?? demoSeasonPackage();
  const events = packageEvents?.length ? packageEvents : (pkg.events ?? []);
  const packageSnapshot = {
    ...pkg,
    events,
  };
  return {
    orderId: order?.orderId ?? order?.id,
    id: order?.id,
    details: {
      package: packageSnapshot,
    },
    package: {
      name: packageSnapshot.name,
      image: packageSnapshot.image,
      events: events.filter((event): event is DemoWalletEvent => Boolean(event)),
    },
  };
}

function initialWalletOrders(): DemoWalletOrder[] {
  return [
    demoCompletedTicketOrder({ source: "website" }),
    demoCompletedTicketOrder({
      id: 128186,
      orderId: "1474-145929-3863",
      source: "box_office",
    }),
    demoCompletedTicketOrder({
      id: 128187,
      orderId: "1474-145929-3864",
      source: "transfer",
    }),
    demoCompletedPackageOrder({ source: "transfer" }),
    demoCompletedFlexPackOrder({ source: "website" }),
  ];
}

let demoWalletOrdersState: DemoWalletOrder[] | null = null;
const demoSentTransfers: DemoSentTransfer[] = [];
const demoReceivedTransfers: DemoSentTransfer[] = [];
let demoOrganizerAccessPasses = [demoAccessPass()];
type DemoPackageAccessPass = ReturnType<typeof demoPackageAccessPass> & {
  order?: { orderId?: string };
};
const demoPackageAccessPassesByOrder: Record<string, DemoPackageAccessPass[]> = {
  [demoCompletedPackageOrder().orderId]: [demoPackageAccessPass()],
};

function walletOrders() {
  if (!demoWalletOrdersState) {
    demoWalletOrdersState = initialWalletOrders();
  }
  return demoWalletOrdersState;
}

function findDemoWalletOrder(orderId: unknown) {
  const target = String(orderId ?? "");
  return walletOrders().find(
    (row) => String(row.id) === target || String(row.orderId) === target,
  );
}

const routes: Route[] = [
  // ---- Browse / discovery (real snapshots) ----
  { methods: ["get"], match: endsWith("/organizations/on-sale"), handle: async () => ({ data: await snap("organizations-on-sale.json") }) },
  { methods: ["get"], match: endsWith("/events/on-sale"), handle: async () => ({ data: await snap("browse-events.json") }) },
  {
    methods: ["post"],
    match: endsWith("/events/search"),
    handle: (_path, config) => {
      const query = String(parseBody(config).data || "");
      const hits = DEMO_EVENTS.filter((event) =>
        event.name.toLowerCase().includes(query.trim().toLowerCase()),
      ).sort(
        (a, b) =>
          new Date(a.start).getTime() - new Date(b.start).getTime(),
      );
      return { data: query.trim() ? hits : [] };
    },
  },

  // ---- Shopper wallet ----
  {
    methods: ["get"],
    match: endsWith("/events/myUpcomingEvents"),
    handle: () => ({ data: walletOrders() }),
  },
  {
    methods: ["get"],
    match: (path) => path.includes("/orders?filters[orderId]"),
    handle: (path) => {
      const orderId = new URLSearchParams(path.split("?")[1] || "").get(
        "filters[orderId][$eq]",
      );
      const order = walletOrders().find((row) => row.orderId === orderId);
      return { data: order ?? null, status: order ? 200 : 404 };
    },
  },
  {
    methods: ["get"],
    match: endsWith("/events/myAccessPasses"),
    handle: () => ({ data: { data: demoOrganizerAccessPasses } }),
  },
  {
    methods: ["get"],
    match: (path) => /\/events\/myAccessPasses\/[^/?]+/.test(path),
    handle: (path) => {
      const uuid = lastSeg(path);
      const pass =
        demoOrganizerAccessPasses.find((row) => row.uuid === uuid) ??
        Object.values(demoPackageAccessPassesByOrder)
          .flat()
          .find((row) => row.uuid === uuid) ??
        null;
      return { data: { data: pass }, status: pass ? 200 : 404 };
    },
  },
  {
    methods: ["get"],
    match: (path) => /\/access-passes\/by-order\/[^/?]+/.test(path),
    handle: (path) => ({
      data: {
        data: demoPackageAccessPassesByOrder[lastSeg(path)] ?? [],
      },
    }),
  },

  // ---- Season packages ----
  {
    methods: ["get"],
    match: (p) => /\/packages\/get-package-fe/.test(p),
    handle: async (p) => {
      const uuid =
        new URLSearchParams(p.split("?")[1] || "").get("uuid") ||
        "pkg-nms-level-a";
      return {
        data: {
          eventPackage: demoSeasonPackage({ uuid, id: uuid }),
          purchaseLog: null,
        },
      };
    },
  },

  // ---- Seatmap (must come before the event route) ----
  {
    methods: ["get"],
    match: (p) => /\/events\/seatmap\//.test(p),
    handle: async (p) => ({ data: await snap(`seatmap-${mapCode(lastSeg(p))}.json`) }),
  },

  // ---- Offers ----
  {
    methods: ["get"],
    match: (p) => /\/events\/offers(\?|$)/.test(p),
    handle: async (p) => {
      const uuid = new URLSearchParams(p.split("?")[1] || "").get("uuid") || "";
      const code = (await uuidToCode())[uuid] || SEATED_CODE;
      return { data: await snap(`offers-${code}.json`) };
    },
  },

  // ---- Event detail: GET /events/{slug}/{shortcode} ----
  {
    methods: ["get"],
    match: (p) =>
      /\/events\/[^/?]+\/[^/?]+(\?|$)/.test(p) &&
      !/\/events\/(seatmap|on-sale|search|offers|my)/.test(p),
    handle: async (p) => ({ data: await snap(`event-${mapCode(lastSeg(p))}.json`) }),
  },

  // ---- Ticket groups: POST /ticket-group/get-ticket-groups (GA + seated inventory) ----
  {
    methods: ["post"],
    match: endsWith("/ticket-group/get-ticket-groups"),
    handle: async (_p, config) => {
      const body = parseBody(config);
      const ev = (body.event || {}) as { shortcode?: string; shortCode?: string; seatmap?: { ga_only?: boolean } };
      const code = ev.seatmap?.ga_only ? GA_CODE : mapCode(ev.shortcode || ev.shortCode);
      const payload = (await snap(`ticketgroups-${code}.json`)) as {
        ticketGroups?: RawTicketGroup[];
      };
      const groups = payload.ticketGroups;
      if (!Array.isArray(groups)) return { data: payload };
      const quantity = Number(body.quantity || 0);
      const accessible = Boolean(body.accessible);
      const sort = body.sort === "-price" ? "-price" : "price";
      const offerIds = Array.isArray(body.offerIds)
        ? (body.offerIds as Array<string | number>)
        : [];
      if (!(quantity > 0 || accessible || offerIds.length || body.sort)) {
        return { data: payload };
      }
      return {
        data: {
          ...payload,
          ticketGroups: filterGroupsForListings(groups, {
            quantity,
            accessible,
            sort,
            offerIds,
          }),
        },
      };
    },
  },

  // ---- Fundraising campaigns ----
  {
    methods: ["get"],
    match: (p) => /\/fundraising-campaigns\/public\/[^/?]+(\?|$)/.test(p),
    handle: (p) => ({
      data: { campaign: demoFundraisingCampaign({ slug: lastSeg(p) }) },
    }),
  },
  {
    methods: ["get"],
    match: (p) => /\/fundraising-campaigns\/resolve(\?|$)/.test(p),
    handle: () => ({ data: { campaign: demoFundraisingCampaign() } }),
  },

  // ---- Group purchase invitations ----
  {
    methods: ["get"],
    match: (p) => /\/group-purchase-invitations(\?|$)/.test(p),
    handle: (p) => {
      const code =
        new URLSearchParams(p.split("?")[1] || "").get(
          "filters[groupCode][$eq]",
        ) || undefined;
      return {
        data: {
          data: [
            {
              id: 1,
              attributes: demoGroupInvitation(code ? { groupCode: code } : {}),
            },
          ],
        },
      };
    },
  },

  // ---- In-venue food & beverage menu ----
  {
    methods: ["get"],
    match: (p) => /\/fnb-items\/public-menu\//.test(p),
    handle: () => ({ data: demoPublicMenu() }),
  },
  {
    methods: ["post"],
    match: endsWith("/fnb-items/public-pricing"),
    handle: (_p, config) => {
      const body = parseBody(config) as {
        data?: { items?: Array<{ itemId?: string; quantity?: number }> };
      };
      const menu = demoPublicMenu();
      const subtotal = (body.data?.items ?? []).reduce((sum, line) => {
        const item = menu.items.find((row) => row.id === line.itemId);
        return sum + (item ? item.price * Number(line.quantity || 0) : 0);
      }, 0);
      const serviceFee = subtotal ? 2.5 : 0;
      return {
        data: {
          pricing: { subtotal, serviceFee, total: subtotal + serviceFee },
        },
      };
    },
  },

  // ---- Cart / checkout stubs ----
  { methods: ["post"], match: endsWith("/events/place-ga-tickets-into-cart"), handle: () => ({ data: demoCart() }) },
  { methods: ["post"], match: endsWith("/events/place-tickets-into-cart"), handle: () => ({ data: demoCart() }) },
  { methods: ["post"], match: endsWith("/tickets/checkAccessCode"), handle: () => ({ data: true }) },
  {
    methods: ["get"],
    match: (path) => path.includes("/ticket-transfers?filters[fromUserEmail]"),
    handle: () => ({ data: demoSentTransfers }),
  },
  {
    methods: ["get"],
    match: endsWith("/ticket-transfers/incoming"),
    handle: () => ({
      data: demoReceivedTransfers.filter((row) => row.status === "pending"),
    }),
  },
  {
    methods: ["get"],
    match: (path) =>
      path.includes("/ticket-transfers?") &&
      path.includes("filters[emailAddressToUser]"),
    handle: (path) => {
      const match = path.match(/filters\[emailAddressToUser\]\[\$eq\]=([^&]+)/i);
      const email = decodeURIComponent(match?.[1] || "")
        .trim()
        .toLowerCase();
      return {
        data: demoReceivedTransfers.filter(
          (row) =>
            String(row.emailAddressToUser || row.email || "")
              .trim()
              .toLowerCase() === email,
        ),
      };
    },
  },
  {
    methods: ["post"],
    match: endsWith("/ticket-transfers/cancel"),
    handle: (_path, config) => {
      const transferId = cancelTransferIdFromBody(parseBody(config));
      const markCancelled = (list: typeof demoSentTransfers) => {
        const index = list.findIndex((row) => String(row.id) === transferId);
        if (index >= 0) {
          list[index] = { ...list[index]!, status: "cancelled" };
        }
      };
      const sentIndex = demoSentTransfers.findIndex(
        (row) => String(row.id) === transferId,
      );
      if (sentIndex >= 0) {
        const transfer = demoSentTransfers[sentIndex]!;
        markCancelled(demoSentTransfers);
        const tickets = transfer.tickets ?? [];
        if (tickets.length) {
          const order = findDemoWalletOrder(transfer.orderId);
          if (order) {
            const existing = new Set(
              (order.tickets ?? []).map((ticket) => String(ticket.id ?? "")),
            );
            const toRestore = tickets.filter(
              (ticket) => !existing.has(String(ticket.id ?? "")),
            );
            if (toRestore.length) {
              order.tickets = [
                ...(order.tickets ?? []),
                ...toRestore.map((ticket) => {
                  const raw = { ...ticket };
                  delete raw.transferStatus;
                  delete raw.ticketTransfer;
                  delete raw.transferredAt;
                  return raw;
                }),
              ];
            }
          }
        }
      } else {
        markCancelled(demoSentTransfers);
      }
      markCancelled(demoReceivedTransfers);
      return { data: { status: "cancelled", transferId } };
    },
  },
  {
    methods: ["post"],
    match: endsWith("/ticket-transfers/accept"),
    handle: (_path, config) => {
      const body = parseBody(config);
      const transferId = String(body.transferId || "");
      const index = demoReceivedTransfers.findIndex(
        (row) => String(row.id) === transferId,
      );
      if (index >= 0) {
        const claimedTransfer = demoReceivedTransfers[index]!;
        demoReceivedTransfers[index] = {
          ...claimedTransfer,
          status: "claimed",
          transferedOn: new Date().toISOString(),
        };
        const cleanedTickets = (claimedTransfer.tickets ?? []).map((ticket) => {
          const raw = { ...ticket };
          delete raw.transferStatus;
          delete raw.ticketTransfer;
          delete raw.transferredAt;
          return raw;
        });
        if (cleanedTickets.length && claimedTransfer.event) {
          const recipientOrder = demoCompletedTicketOrder({
            id: Number(transferId) || Date.now(),
            orderId: `1474-${transferId}-accepted`,
            source: "transfer",
            email: String(claimedTransfer.emailAddressToUser || claimedTransfer.email || ""),
            event: claimedTransfer.event,
            tickets: cleanedTickets,
          });
          walletOrders().unshift(recipientOrder);
        }
        if (
          claimedTransfer.transferType === "access_pass" &&
          claimedTransfer.accessPassId
        ) {
          const passSnapshot =
            claimedTransfer.access_pass ??
            claimedTransfer.accessPassSnapshot ??
            demoPackageAccessPass({ uuid: String(claimedTransfer.accessPassId) });
          const recipientOrderId = `1474-${transferId}-accepted`;
          const recipientPackageOrder = demoCompletedPackageOrder({
            id: Number(transferId) || Date.now(),
            orderId: recipientOrderId,
            source: "transfer",
            email: String(
              claimedTransfer.emailAddressToUser || claimedTransfer.email || "",
            ),
            tickets: [],
          });
          walletOrders().unshift(recipientPackageOrder);
          demoPackageAccessPassesByOrder[recipientOrderId] = [
            {
              ...passSnapshot,
              uuid: String(claimedTransfer.accessPassId),
              orderId: recipientOrderId,
              order: { orderId: recipientOrderId },
              status: "active",
            } as DemoPackageAccessPass,
          ];
          return {
            data: {
              uuid: String(claimedTransfer.accessPassId),
              type: passSnapshot.type || "package",
              orderId: recipientOrderId,
              order: { orderId: recipientOrderId },
              name: passSnapshot.name,
              events: passSnapshot.events,
              sectionNumber: passSnapshot.sectionNumber,
              rowNumber: passSnapshot.rowNumber,
              seatNumber: passSnapshot.seatNumber,
              status: "active",
            },
          };
        }
      }
      const sentIndex = demoSentTransfers.findIndex(
        (row) => String(row.id) === transferId,
      );
      if (sentIndex >= 0) {
        const claimed = demoSentTransfers[sentIndex]!;
        demoSentTransfers[sentIndex] = {
          ...claimed,
          status: "claimed",
        };
        if (claimed.accessPassId) {
          demoOrganizerAccessPasses = demoOrganizerAccessPasses.filter(
            (row) => row.uuid !== claimed.accessPassId,
          );
          for (const orderId of Object.keys(demoPackageAccessPassesByOrder)) {
            demoPackageAccessPassesByOrder[orderId] = (
              demoPackageAccessPassesByOrder[orderId] ?? []
            ).filter((row) => row.uuid !== claimed.accessPassId);
          }
        }
      }
      return { data: { status: "claimed", transferId } };
    },
  },
  {
    methods: ["post"],
    match: endsWith("/ticket-transfers"),
    handle: (_path, config) => {
      const body = parseBody(config);
      const accessPassId = String(body.accessPassId || "").trim();
      if (accessPassId) {
        const pass =
          accessPassId === demoAccessPass().uuid
            ? demoAccessPass()
            : accessPassId === demoPackageAccessPass().uuid
              ? demoPackageAccessPass()
              : null;
        if (pass) {
          const recipientEmail = String(body.email || "");
          const pkg = demoSeasonPackage();
          const walletOrder = findDemoWalletOrder(pass.orderId);
          const passFields = pass as {
            events?: DemoWalletEvent[];
            artwork?: unknown;
            sectionNumber?: string | number;
            rowNumber?: string | number;
            seatNumber?: string | number;
            generalAdmission?: boolean;
          };
          const events = passFields.events ?? [];
          const passTransferId = `demo-pass-transfer-${demoSentTransfers.length + 1}`;
          const accessPassSnapshot = {
            uuid: pass.uuid,
            name: pass.name,
            type: String(pass.type || ""),
            start: pkg.start || events[0]?.start,
            end: pkg.end || events.at(-1)?.start,
            events,
            artwork: passFields.artwork ?? pkg.image,
            sectionNumber: passFields.sectionNumber,
            rowNumber: passFields.rowNumber,
            seatNumber: passFields.seatNumber,
            generalAdmission: passFields.generalAdmission,
          };
          const transferRecord: DemoSentTransfer = {
            id: passTransferId,
            status: "pending",
            orderId: pass.orderId,
            email: recipientEmail,
            emailAddressToUser: recipientEmail,
            fromUserEmail: DEMO_SESSION.user.email,
            accessPassId: pass.uuid,
            transferType: "access_pass",
            order: demoTransferOrderSnapshot(walletOrder, events),
            accessPassSnapshot,
            access_pass: accessPassSnapshot,
            createdAt: new Date().toISOString(),
          };
          demoSentTransfers.unshift(transferRecord);
          demoReceivedTransfers.unshift(transferRecord);
          return {
            data: {
              id: passTransferId,
              status: "pending",
              createdAt: transferRecord.createdAt,
              ...body,
            },
          };
        }
        return { data: { status: "pending", ...body } };
      }
      const ticketIds = Array.isArray(body.ticketIds)
        ? body.ticketIds.map((value) => String(value))
        : [];
      const order = findDemoWalletOrder(body.orderId);
      const transferredTickets =
        order?.tickets?.filter((ticket) =>
          ticketIds.includes(String(ticket.id)),
        ) ?? [];
      if (order && transferredTickets.length) {
        order.tickets = (order.tickets ?? []).filter(
          (ticket) => !ticketIds.includes(String(ticket.id)),
        );
        const recipientEmail = String(body.email || "");
        const bodyEvent =
          body.event && typeof body.event === "object"
            ? (body.event as DemoWalletEvent)
            : undefined;
        const eventUUID = String(body.eventUUID || bodyEvent?.uuid || "").trim();
        let event: DemoWalletEvent | null | undefined = bodyEvent || order.event;
        if (!event && order.package?.events?.length) {
          event =
            order.package.events.find(
              (row) => String(row.uuid || "") === eventUUID,
            ) ??
            order.package.events.find((row) =>
              transferredTickets.some(
                (ticket) =>
                  String(ticket.eventUUID || ticket.eventId || "") ===
                  String(row.uuid || ""),
              ),
            );
        }
        const ticketTransferId = `demo-ticket-transfer-${demoSentTransfers.length + 1}`;
        const transferRecord: DemoSentTransfer = {
          id: ticketTransferId,
          status: "pending",
          orderId: order.id ?? order.orderId,
          email: recipientEmail,
          emailAddressToUser: recipientEmail,
          fromUserEmail: DEMO_SESSION.user.email,
          event: event
            ? {
                ...event,
                image:
                  event.image ??
                  order.event?.image ??
                  order.package?.events?.find(
                    (row) => String(row.uuid || "") === String(event.uuid || ""),
                  )?.image,
              }
            : event,
          ...(order.package
            ? { order: demoTransferOrderSnapshot(order) }
            : {}),
          createdAt: new Date().toISOString(),
          tickets: transferredTickets.map((ticket) => ({
            ...ticket,
            transferStatus: "pending",
            ticketTransfer: { status: "pending" },
          })),
        };
        demoSentTransfers.unshift(transferRecord);
        demoReceivedTransfers.unshift(transferRecord);
        return {
          data: {
            id: ticketTransferId,
            status: "pending",
            createdAt: transferRecord.createdAt,
            ...body,
          },
        };
      }
      return {
        data: {
          status: "pending",
          ...body,
        },
      };
    },
  },

  // ---- Login (any code works) ----
  { methods: ["post"], match: endsWith("/registration/validate-email"), handle: () => ({ data: { verdict: "Valid" } }) },
  { methods: ["post"], match: endsWith("/verifies/emailValid"), handle: () => ({ data: { verdict: "Valid" } }) },
  { methods: ["post"], match: endsWith("/verifies/phone-unique"), handle: () => ({ data: { unique: true } }) },
  { methods: ["post"], match: endsWith("/verifies/by-phone-or-email"), handle: () => ({ data: DEMO_SESSION }) },
  { methods: ["post"], match: endsWith("/verifies/newUser"), handle: () => ({ data: DEMO_SESSION }) },
  { methods: ["post"], match: endsWith("/verifies"), handle: () => ({ data: { status: "sent" } }) },
];

async function resolve(config: InternalAxiosRequestConfig): Promise<DemoResult> {
  const method = (config.method || "get").toLowerCase();
  const path = config.url || "";
  const route = routes.find((r) => r.methods.includes(method) && r.match(path));
  if (route) return route.handle(path, config);
  if (typeof console !== "undefined") {
    console.debug(`[demo] no fixture for ${method.toUpperCase()} ${path.split("?")[0]} — returning empty list`);
  }
  return { data: [] };
}

export const demoAdapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
  const { data, status = 200 } = await resolve(config);
  return {
    data,
    status,
    statusText: status === 200 ? "OK" : String(status),
    headers: {},
    config,
    request: {},
  } as AxiosResponse;
};
