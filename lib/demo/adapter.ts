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
  demoAccessPass,
  demoCart,
  demoCompletedFlexPackOrder,
  demoCompletedPackageOrder,
  demoCompletedTicketOrder,
  demoFundraisingCampaign,
  demoGroupInvitation,
  demoPackageAccessPass,
  demoPublicMenu,
} from "./fixtures";

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

const walletOrders = () => [
  demoCompletedTicketOrder({ source: "website" }),
  demoCompletedTicketOrder({
    id: 128186,
    orderId: "1474-145929-3863",
    source: "box_office",
  }),
  demoCompletedTicketOrder({
    id: 128187,
    orderId: "1474-145929-3864",
    source: "ticket_assignment",
  }),
  demoCompletedPackageOrder({ source: "ticket_assignment" }),
  demoCompletedFlexPackOrder({ source: "website" }),
];

const routes: Route[] = [
  // ---- Browse / discovery (real snapshots) ----
  { methods: ["get"], match: endsWith("/organizations/on-sale"), handle: async () => ({ data: await snap("organizations-on-sale.json") }) },
  { methods: ["get"], match: endsWith("/events/on-sale"), handle: async () => ({ data: await snap("browse-events.json") }) },

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
    handle: () => ({ data: { data: [demoAccessPass()] } }),
  },
  {
    methods: ["get"],
    match: (path) => /\/events\/myAccessPasses\/[^/?]+/.test(path),
    handle: (path) => {
      const uuid = lastSeg(path);
      const pass =
        uuid === demoAccessPass().uuid
          ? demoAccessPass()
          : uuid === demoPackageAccessPass().uuid
            ? demoPackageAccessPass()
            : null;
      return { data: { data: pass }, status: pass ? 200 : 404 };
    },
  },
  {
    methods: ["get"],
    match: (path) => /\/access-passes\/by-order\/[^/?]+/.test(path),
    handle: (path) => ({
      data: {
        data:
          lastSeg(path) === demoCompletedPackageOrder().orderId
            ? [demoPackageAccessPass()]
            : [],
      },
    }),
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
      return { data: await snap(`ticketgroups-${code}.json`) };
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
    methods: ["post"],
    match: endsWith("/ticket-transfers"),
    handle: (_path, config) => ({
      data: {
        id: "demo-ticket-transfer",
        status: "pending",
        ...parseBody(config),
      },
    }),
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
