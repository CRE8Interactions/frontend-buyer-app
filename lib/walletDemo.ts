/**
 * Demo data for the wallet (no backend yet). Kept apart from the UI so the
 * pass, the runway and the transfer flow all read the same tickets.
 * `tone` points at a library colour token class, never a raw colour.
 */

export type WalletTone = "navy" | "seat" | "feature" | "card";

export type WalletEvent = {
  id: string;
  past: boolean;
  /** Days from today. 0 is tonight, negative is past. */
  inDays: number;
  title: string;
  date: string;
  time: string;
  doors: string;
  venue: string;
  city: string;
  address: string;
  tone: WalletTone;
  initials: string;
  kind: string;
  row: string;
  seats: string[];
  total: string;
  bought: string;
  /** Set when the ticket holder no longer has the seats, or has already been scanned in. */
  state?: "transferred" | "attended";
  /** Real artwork already used on Browse and the team pages: a wide photo, a 16:9 matchup poster, the opponent's crest. */
  photo?: string; poster?: string; crest?: string;
  /** Printed offer and seating notes, shown as chips. */
  badges?: string[];
};

export type WalletTicket = { seat: string; code: string; no: string };

export const EVENTS: WalletEvent[] = [
  { id: "raptors", past: false, inDays: 0, title: "Ogden Raptors vs. Long Beach Coast", date: "Tonight", time: "6:30 PM", doors: "5:30 PM", venue: "Lindquist Field", city: "Ogden, UT", address: "2330 Lincoln Ave, Ogden, UT 84401", tone: "navy", initials: "OR", kind: "Single game", row: "Sec A · Row F", seats: ["6", "7"], total: "$48.00", bought: "Wed, Jul 22 · 4:12 PM", badges: ["Accessible seating"], photo: "/cases/raptors.jpg" },
  { id: "neon", past: false, inDays: 22, title: "Neon Vibes — 2026 Summer Series", date: "Fri, Aug 14", time: "8:00 PM", doors: "7:00 PM", venue: "The Wharf Amphitheater", city: "Long Beach, CA", address: "1200 Queensway Dr, Long Beach, CA 90802", tone: "seat", initials: "NV", kind: "General admission", row: "GA Pit", seats: ["1", "2"], total: "$164.00", bought: "Mon, Jun 08 · 9:40 AM" },
  { id: "icedogs", past: false, inDays: 72, title: "Niagara IceDogs vs. Erie Otters", date: "Sat, Oct 03", time: "7:00 PM", doors: "6:00 PM", venue: "Meridian Centre", city: "St. Catharines, ON", address: "1 IceDogs Way, St. Catharines, ON L2R 0E2", tone: "feature", initials: "NI", kind: "Single game", row: "Sec 109 · Row A", seats: ["11"], total: "$32.00", bought: "Thu, Jul 30 · 1:05 PM", badges: ["Student offer"], photo: "/cases/icedogs.jpg" },
  { id: "hawks", past: false, inDays: 9, title: "Long Beach Coast vs. Boise Hawks", date: "Sun, Aug 01", time: "1:05 PM", doors: "12:05 PM", venue: "Blair Field", city: "Long Beach, CA", address: "4700 Deukmejian Dr, Long Beach, CA 90804", tone: "navy", initials: "LB", kind: "Single game", row: "Sec C · Row K", seats: ["3", "4"], total: "$56.00", bought: "Sat, Jul 11 · 8:30 PM", state: "transferred" },
  { id: "harvest", past: true, inDays: -78, title: "Harvest Nights Food & Wine", date: "Sat, May 16", time: "5:00 PM", doors: "4:30 PM", venue: "Riverfront Pavilion", city: "Boise, ID", address: "601 W Front St, Boise, ID 83702", tone: "card", initials: "HN", kind: "General admission", row: "General admission", seats: ["1", "2"], total: "$90.00", bought: "Tue, Apr 07 · 6:22 PM", state: "attended" },
];

/* The demo's "today" is Thu, Jul 23, 2026 (the Raptors game is tonight). More events so the feed has real length. */
const BASE = Date.UTC(2026, 6, 23);
export const dayOf = (inDays: number) => new Date(BASE + inDays * 86400000);
const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "2-digit", timeZone: "UTC" });
type More = { title: string; venue: string; city: string; kind: string; tone: WalletTone; ini: string; photo?: string; poster?: string; crest?: string };
const STADIUM = "Aggie Memorial Stadium";
const NMSU = { city: "Las Cruces, NM", tone: "feature" as WalletTone, ini: "NM" };
const FOOTBALL = { ...NMSU, venue: STADIUM, kind: "Single game", photo: "/cases/nmstate.jpg" };
/* Real games from the NM State schedule on the team page, on their real dates (the demo's today is Jul 23, 2026). Only art that belongs to the
   game is used: the matchup poster, the opponent's crest, and the stadium photo for football. */
const UPCOMING: [number, More][] = [
  [4, { title: "Ogden Raptors vs. Great Falls", venue: "Lindquist Field", city: "Ogden, UT", kind: "Single game", tone: "navy", ini: "OR", photo: "/cases/raptors.jpg" }],
  [11, { title: "Summer Nights Live: The Wharf Sessions", venue: "The Wharf Amphitheater", city: "Long Beach, CA", kind: "General admission", tone: "seat", ini: "SN" }],
  [30, { title: "Niagara IceDogs vs. Sudbury Wolves", venue: "Meridian Centre", city: "St. Catharines, ON", kind: "Single game", tone: "feature", ini: "NI", photo: "/cases/icedogs.jpg" }],
  [42, { ...NMSU, title: "Soccer vs. Grand Canyon", venue: "NMSU Soccer Field", kind: "General admission", crest: "/teams/grand-canyon.png" }],
  [44, { ...FOOTBALL, title: "Aggies vs. Mercyhurst", poster: "/matchups/sm/nmsu-vs-mercyhurst.webp", crest: "/teams/mercyhurst.png" }],
  [65, { ...FOOTBALL, title: "Aggies vs. New Mexico", poster: "/matchups/sm/nmsu-vs-new-mexico.webp", crest: "/teams/new-mexico-lobos.png" }],
  [70, { ...FOOTBALL, title: "Aggies vs. Western Kentucky", poster: "/matchups/sm/nmsu-vs-wku.webp", crest: "/teams/wku-hilltoppers.png" }],
  [88, { title: "Harvest Nights: Autumn Tasting", venue: "Riverfront Pavilion", city: "Boise, ID", kind: "General admission", tone: "card", ini: "HN" }],
  [112, { ...NMSU, title: "Men's Basketball vs. UTEP", venue: "Pan American Center", kind: "Single game", crest: "/teams/utep-miners.png" }],
];
/* Past events are the teams and places whose games have already been played by the demo's today. */
const PAST_KINDS: More[] = [
  { title: "Ogden Raptors vs. Rocky Mountain", venue: "Lindquist Field", city: "Ogden, UT", kind: "Single game", tone: "navy", ini: "OR", photo: "/cases/raptors.jpg" },
  { title: "Niagara IceDogs vs. Erie Otters", venue: "Meridian Centre", city: "St. Catharines, ON", kind: "Single game", tone: "feature", ini: "NI", photo: "/cases/icedogs.jpg" },
  { title: "Summer Nights Live: The Wharf Sessions", venue: "The Wharf Amphitheater", city: "Long Beach, CA", kind: "General admission", tone: "seat", ini: "SN" },
  { title: "Harvest Nights: Spring Tasting", venue: "Riverfront Pavilion", city: "Boise, ID", kind: "General admission", tone: "card", ini: "HN" },
];
const MORE_PAST = [-4, -9, -15, -23, -31, -38, -47, -55, -64, -90, -112, -140, -171, -204];
function mk(inDays: number, i: number, past: boolean, m: More): WalletEvent {
  const d = dayOf(inDays);
  const row = m.kind === "General admission" ? "General admission" : `Sec ${100 + ((i * 7) % 20)} · Row ${String.fromCharCode(65 + ((i * 5) % 14))}`;
  const seats = i % 3 === 0 ? ["4"] : i % 3 === 1 ? ["12", "13"] : ["8", "9", "10"];
  const total = `$${(seats.length * (28 + (i % 5) * 6)).toFixed(2)}`;
  return {
    id: `${past ? "p" : "u"}${i}`, past, inDays, title: m.title, date: fmtDate(d), time: "7:00 PM", doors: "6:00 PM",
    venue: m.venue, city: m.city, address: `${m.venue}, ${m.city}`, tone: m.tone, initials: m.ini, kind: m.kind, row, seats, total,
    photo: m.photo, poster: m.poster, crest: m.crest,
    bought: `${fmtDate(dayOf(inDays - 30 - i))} · ${1 + (i % 11)}:${i % 2 ? "40" : "15"} PM`,
    ...(past ? { state: "attended" as const } : {}),
  };
}
EVENTS.push(...UPCOMING.map(([d, m], i) => mk(d, i, false, m)), ...MORE_PAST.map((d, i) => mk(d, i, true, PAST_KINDS[i % PAST_KINDS.length])));

export function ticketsFor(e: WalletEvent): WalletTicket[] {
  return e.seats.map((n, i) => ({
    seat: `${e.row} · Seat ${n}`,
    code: `BT-${e.id.toUpperCase()}-4407-${100 + i}`,
    no: n,
  }));
}

export function orderFor(e: WalletEvent) {
  return [
    { k: "Order number", v: `BT-${e.id.toUpperCase()}-8021` },
    { k: "Purchased", v: e.bought },
    { k: "Total paid", v: e.total },
    { k: "Delivery", v: "Mobile entry" },
  ];
}

/** A stable, scannable-looking QR matrix from a seed (demo only, not a real code). */
export function qrMatrix(seed: string): { n: number; on: boolean[] } {
  const N = 25;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  let r = h >>> 0;
  const rnd = () => { r = (Math.imul(r, 1103515245) + 12345) >>> 0; return r / 4294967296; };
  const g: boolean[][] = Array.from({ length: N }, () => Array.from({ length: N }, () => rnd() > 0.5));
  const finder = (ox: number, oy: number) => {
    for (let y = -1; y < 8; y++) for (let x = -1; x < 8; x++) {
      const yy = oy + y, xx = ox + x;
      if (yy < 0 || xx < 0 || yy >= N || xx >= N) continue;
      const inside = x >= 0 && x < 7 && y >= 0 && y < 7;
      const edge = x === 0 || y === 0 || x === 6 || y === 6;
      const core = x > 1 && x < 5 && y > 1 && y < 5;
      g[yy][xx] = inside && (edge || core);
    }
  };
  finder(0, 0); finder(N - 7, 0); finder(0, N - 7);
  for (let i = 8; i < N - 8; i++) { g[6][i] = i % 2 === 0; g[i][6] = i % 2 === 0; }
  return { n: N, on: g.flat() };
}

export function countdownLabel(inDays: number) {
  if (inDays === 0) return "Tonight";
  if (inDays < 0) return `${Math.abs(inDays)} days ago`;
  if (inDays === 1) return "Tomorrow";
  return `In ${inDays} days`;
}

export type Transfer = { id: string; to?: string; from?: string; title: string; seat: string; on: string; status: "pending" | "claimed" | "cancelled";
  /** What is being sent. Left out, it is tickets. */
  kind?: "ticket" | "package" | "pass";
  /** The person or group the sender is acting for. */
  behalf?: string;
  /** Demo: the server answers this row's accept or cancel with this error. */
  fail?: "claimed" | "tech" };

export const SENT_DEFAULT: Transfer[] = [
  { id: "s1", to: "m.ortega@gmail.com", title: "Niagara IceDogs vs. Erie Otters", seat: "Sec 109 · Row A · Seat 11", on: "Jul 31, 2026", status: "pending" },
  { id: "s3", to: "late.claimer@gmail.com", title: "Neon Vibes — 2026 Summer Series", seat: "GA Pit · Seat 1", on: "Jul 20, 2026", status: "pending", fail: "claimed" },
  { id: "s2", to: "rach.venneri@gmail.com", title: "Harvest Nights Food & Wine", seat: "General admission · Seat 2", on: "May 09, 2026", status: "claimed" },
];
export const RECEIVED: Transfer[] = [
  { id: "r2", from: "sam.okafor@gmail.com", title: "Ogden Raptors vs. Rocky Mountain", seat: "Sec B · Row D · Seats 5–6", on: "Today", status: "pending", behalf: "the Okafor family" },
  { id: "r4", from: "alex.m@gmail.com", title: "Aggie Football Season Seats", seat: "5 games · Sec 112 · Row 18 · Seats 7–8", on: "Today", status: "pending", kind: "package" },
  { id: "r5", from: "member.services@aggieclub.org", title: "Aggie Club Access Pass", seat: "3 games · Club entry", on: "Yesterday", status: "pending", kind: "pass", behalf: "Aggie Club" },
  { id: "r3", from: "priya.n@gmail.com", title: "Aggies vs. Western Kentucky", seat: "Sec 120 · Row 9 · Seat 14", on: "Yesterday", status: "pending", fail: "claimed" },
  { id: "r1", from: "dad@reyesfamily.com", title: "Neon Vibes — 2026 Summer Series", seat: "GA Pit · Seat 2", on: "Jun 08, 2026", status: "claimed" },
];

export const BUYER_EMAIL = "jordan.reyes@gmail.com";
export const BUYER_NAME = "Jordan Reyes";


/** Availability of an event's tickets, shared by the runway, the pass and the detail views. */
export function availability(e: WalletEvent): { label: string; color: "success" | "warning" | "neutral" | "info" } {
  if (e.state === "transferred") return { label: "Transferred", color: "info" };
  if (e.past || e.state === "attended") return { label: "Attended", color: "neutral" };
  if (e.inDays === 0) return { label: "Tonight", color: "success" };
  return { label: "Upcoming", color: "warning" };
}

export type WalletGame = { id: string; title: string; date: string; seat: string; state: "upcoming" | "attended" | "transferred" };
export type WalletPackage = { id: string; name: string; venue: string; season: string; tone: WalletTone; initials: string; games: WalletGame[]; transferred?: boolean };
export type WalletVoucher = { id: string; label: string; redeemed?: string };
export type WalletFlex = { id: string; name: string; blurb: string; venue: string; vouchers: WalletVoucher[] };
export type WalletPassCard = {
  id: string; name: string; season: string; status: "active" | "transferred"; bg: string; fg: string; code: string; cover?: string;
  games: WalletGame[];
};

export const PACKAGES: WalletPackage[] = [
  {
    id: "season", name: "Aggie Football Season Seats", venue: "Aggie Memorial Stadium", season: "2026 season", tone: "feature", initials: "AF",
    games: [
      { id: "g1", title: "vs. Sam Houston", date: "Sat, Sep 05", seat: "Sec 112 · Row 18 · Seats 7–8", state: "attended" },
      { id: "g2", title: "at Liberty", date: "Sat, Sep 19", seat: "Away game · not included", state: "attended" },
      { id: "g3", title: "vs. Texas State", date: "Sat, Oct 10", seat: "Sec 112 · Row 18 · Seats 7–8", state: "upcoming" },
      { id: "g4", title: "vs. UTEP", date: "Sat, Oct 24", seat: "Sec 112 · Row 18 · Seats 7–8", state: "transferred" },
      { id: "g5", title: "vs. Jacksonville State", date: "Sat, Nov 07", seat: "Sec 112 · Row 18 · Seats 7–8", state: "upcoming" },
    ],
  },
  {
    id: "partial", name: "Raptors Weekend Pack", venue: "Lindquist Field", season: "Summer 2026", tone: "navy", initials: "RP", transferred: true,
    games: [
      { id: "p1", title: "vs. Rocky Mountain", date: "Fri, Aug 21", seat: "Sec A · Row F · Seats 6–7", state: "transferred" },
      { id: "p2", title: "vs. Idaho Falls", date: "Fri, Aug 28", seat: "Sec A · Row F · Seats 6–7", state: "transferred" },
    ],
  },
];

export const FLEX_PACKS: WalletFlex[] = [
  {
    id: "pick4", name: "Aggie Pick-4 Flex Pack", blurb: "Redeem any four home games", venue: "Aggie Memorial Stadium",
    vouchers: [
      { id: "v1", label: "Voucher 1", redeemed: "Sat, Sep 05 · vs. Sam Houston" },
      { id: "v2", label: "Voucher 2", redeemed: "Sat, Sep 26 · vs. Tarleton" },
      { id: "v3", label: "Voucher 3" },
      { id: "v4", label: "Voucher 4" },
    ],
  },
  { id: "pick2", name: "Raptors Pick-2 Flex Pack", blurb: "Redeem any two weeknight games", venue: "Lindquist Field", vouchers: [
    { id: "w1", label: "Voucher 1", redeemed: "Tue, Jun 16 · vs. Missoula" },
    { id: "w2", label: "Voucher 2", redeemed: "Tue, Jul 07 · vs. Great Falls" },
  ] },
];

export const ACCESS_PASSES: WalletPassCard[] = [
  {
    id: "club", name: "Aggie Club Access Pass", season: "2026 season", status: "active", bg: "#5c0025", fg: "#ffffff", code: "BT-PASS-AGCLUB-7741", cover: "/nmstate/aggie-country-pass.png",
    games: [
      { id: "a1", title: "vs. Sam Houston", date: "Sat, Sep 05", seat: "Club entry", state: "attended" },
      { id: "a2", title: "vs. Texas State", date: "Sat, Oct 10", seat: "Club entry", state: "upcoming" },
      { id: "a3", title: "vs. UTEP", date: "Sat, Oct 24", seat: "Club entry", state: "upcoming" },
    ],
  },
  {
    id: "lot", name: "Tailgate Lot Pass", season: "2026 season", status: "transferred", bg: "#1b2a41", fg: "#ffffff", code: "BT-PASS-LOT-2210",
    games: [{ id: "l1", title: "vs. Texas State", date: "Sat, Oct 10", seat: "Lot C", state: "transferred" }],
  },
];

export type WalletListing = {
  id: string; title: string; seat: string; qty: number; price: number; status: "active" | "sold" | "expired";
  on: string; soldTo?: string; payout?: number;
};
export const LISTINGS_DEFAULT: WalletListing[] = [
  { id: "l1", title: "Niagara IceDogs vs. Erie Otters", seat: "Sec 109 · Row A · Seat 11", qty: 1, price: 42, status: "active", on: "Jul 31" },
  { id: "l2", title: "Neon Vibes — 2026 Summer Series", seat: "GA Pit · Seat 2", qty: 1, price: 95, status: "sold", on: "Jul 12", soldTo: "t***@gmail.com", payout: 85.5 },
  { id: "l3", title: "Harvest Nights Food & Wine", seat: "General admission · Seat 1", qty: 1, price: 60, status: "expired", on: "May 16" },
];

/** Every demo outcome is logged here and to the console: window.__walletDemo.log */
export function demoLog(kind: string, detail: Record<string, unknown>) {
  const entry = { kind, at: new Date().toISOString(), ...detail };
  if (typeof window === "undefined") return;
  const w = window as unknown as { __walletDemo?: { log: unknown[] } };
  (w.__walletDemo ??= { log: [] }).log.push(entry);
  console.info("[wallet-demo]", entry);
}

/** The picture that stands for an event in a list: its opponent's crest, else its photo. */
/* The same picture lookup as Browse (app/browse/BrowseStudio.tsx), so an event wears the same image in both places. */
export const imageFor = (t: string) => {
  const s = t.toLowerCase();
  if (s.includes("raptor")) return "/cases/raptors.jpg";
  if (s.includes("nm state") || s.includes("aggie")) return "/cases/nmstate.jpg";
  if (s.includes("icedogs") || s.includes("niagara")) return "/cases/icedogs.jpg";
  return null;
};
export const thumbOf = (e: WalletEvent) => imageFor(e.title) ?? undefined;
/** Browse's monogram: the first letters of the venue's words, for a row with no picture. */
export const monogram = (n: string) => n.split(" ").filter((w) => /^[A-Za-z]/.test(w)).slice(0, 3).map((w) => w[0].toUpperCase()).join("");
export type Sport = "Baseball" | "Hockey" | "Football" | "Soccer" | "Basketball" | "Music" | "Other";
export function sportOf(e: WalletEvent): Sport {
  const t = `${e.title} ${e.venue}`.toLowerCase();
  if (/raptor|hawks|baseball/.test(t)) return "Baseball";
  if (/icedogs|hockey/.test(t)) return "Hockey";
  if (/soccer/.test(t)) return "Soccer";
  if (/basketball|pan american/.test(t)) return "Basketball";
  if (/aggies|football|stadium/.test(t)) return "Football";
  if (/neon|summer nights|live/.test(t)) return "Music";
  return "Other";
}
