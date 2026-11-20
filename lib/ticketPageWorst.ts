import type { WalletEvent } from "@/lib/walletDemo";

/* Worst-case data for the buyer ticket page (/t/<token>). Dev only: add `?data=<name>` to the URL. Each fixture is
   shaped exactly like an EVENTS entry and is built from values a real order can hold (a long matchup with a presenting
   sponsor, a club-level suite name, a wheelchair seat, a 24-ticket group order), not random strings. */
export const WORST: Record<string, WalletEvent> = {
  /* every string long, no artwork, mixed seat values, accessible */
  worst: {
    id: "phillies-angels-dh", past: false, inDays: 0,
    title: "Philadelphia Phillies vs. Los Angeles Angels of Anaheim: Opening Day Doubleheader Presented by Northwind Industries",
    date: "Wednesday, September 30, 2026", time: "12:35 PM", doors: "10:30 AM",
    venue: "Pierre S. du Pont III Memorial Stadium and Convention Center", city: "Wilmington, Delaware",
    address: "1200 Northwind Industries Boulevard, Building C, Suite 214B, Wilmington, DE 19801",
    tone: "navy", initials: "PP", kind: "Season ticket package, 41 home games",
    row: "Sec Club Level Lounge Suite 214B · Row Standing Room Only",
    seats: ["1", "12", "104", "Wheelchair space 3", "GA 1042", "Companion A-12", "7", "Standing"],
    total: "$4,812.00", bought: "Wed, Jul 22 · 4:12 PM", badges: ["Accessible seating"],
  },
  /* a 24-ticket group order: dots, counter, add-all */
  many: {
    id: "raptors", past: false, inDays: 0, title: "Ogden Raptors vs. Long Beach Coast", date: "Tonight", time: "6:30 PM", doors: "5:30 PM",
    venue: "Lindquist Field", city: "Ogden, UT", address: "2330 Lincoln Ave, Ogden, UT 84401", tone: "navy", initials: "OR", kind: "Single game",
    row: "Sec 112 · Row AA", seats: Array.from({ length: 24 }, (_, i) => String(i + 1)), total: "$1,152.00", bought: "Wed, Jul 22 · 4:12 PM",
  },
  /* the order shown in the text-delivery announcement email */
  email: {
    id: "icedogs", past: false, inDays: 0, title: "Niagara IceDogs vs. Brantford Bulldogs", date: "Tonight", time: "7:00 PM", doors: "6:00 PM",
    venue: "Meridian Centre", city: "St. Catharines, ON", address: "1 IceDogs Way, St. Catharines, ON L2R 0E2", tone: "feature", initials: "NI", kind: "Single game",
    row: "Sec 103 · Row R", seats: ["15", "16"], total: "$64.00", bought: "Tue, Mar 9 · 6:42 PM", badges: ["Accessible seating"], photo: "/cases/icedogs.jpg",
  },
  /* a 50-ticket group order: the windowed dots and the jump list */
  fifty: {
    id: "raptors", past: false, inDays: 0, title: "Ogden Raptors vs. Long Beach Coast", date: "Tonight", time: "6:30 PM", doors: "5:30 PM",
    venue: "Lindquist Field", city: "Ogden, UT", address: "2330 Lincoln Ave, Ogden, UT 84401", tone: "navy", initials: "OR", kind: "Single game",
    row: "Sec 112 · Row AA", seats: Array.from({ length: 50 }, (_, i) => String(i + 1)), total: "$2,400.00", bought: "Wed, Jul 22 · 4:12 PM",
  },
  /* general admission: no Sec/Row pattern, no badges, short title, no artwork */
  ga: {
    id: "jo", past: false, inDays: 3, title: "Jo", date: "Sat, Mar 9", time: "7:00 PM", doors: "6:00 PM",
    venue: "Hall", city: "NY", address: "1 Main St", tone: "seat", initials: "J", kind: "GA",
    row: "General admission, standing floor", seats: ["1"], total: "$0.00", bought: "Wed, Jul 22 · 4:12 PM",
  },
  /* the longest unbroken words a venue name or title can hold */
  nobreak: {
    id: "neon", past: false, inDays: 22, title: "Rhein-Main-Donau-Schifffahrtsgesellschaftsfest 2026 — Abschlusskonzert", date: "Fri, Aug 14", time: "8:00 PM", doors: "7:00 PM",
    venue: "Donaudampfschifffahrtsgesellschaft Arena", city: "Long Beach, CA", address: "bartholomew.fitzgerald@northwind-industries-holdings.example.com", tone: "feature", initials: "RM", kind: "General admission",
    row: "Sec Obergeschoss-Nordtribüne · Row 12", seats: ["Stehplatz-9306"], total: "$164.00", bought: "Mon, Jun 08 · 9:40 AM", badges: ["Accessible seating"],
  },
};

export function pickWorst(): WalletEvent | null {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return null;
  const name = new URLSearchParams(window.location.search).get("data");
  return name ? WORST[name] ?? null : null;
}
