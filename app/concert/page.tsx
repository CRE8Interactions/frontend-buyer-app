import PremiumTicketing, { type TicketingData, type GATier } from "@/components/organisms/PremiumTicketing";

export const metadata = {
  title: "The Midnight Riders — Neon Country Tour | Blocktickets",
};

/** Generic concert event — ported from Claude Design "Concert Event Page.dc.html". */
const CONCERT_DATA: TicketingData = {
  accent: "#051b35",
  accentDark: "#03101f",
  accentSoft: "#eef1f8",
  eventName: "The Midnight Riders — Neon Country Tour",
  whenLong: "Fri, Oct 9, 2026 8:00 PM · Doors 7:00 PM",
  whenShort: "Fri, Oct 9, 2026 · Doors 7:00 PM",
  whenPlain: "Fri, Oct 9, 2026 8:00 PM",
  doorsLine: "Fri, Oct 9, 2026 8:00 PM · Doors 7:00 PM",
  venueName: "The Fillmore Denver",
  venueLine: "The Fillmore Denver, Denver, CO",
  venueAddress: "1510 Clarkson St, Denver, CO 80218",
  venueCityState: "Denver, CO",
  mapsQuery: "The Fillmore Denver Denver CO",
  logoSrc: "/blocktickets-emblem-navy.svg",
  orgLabel: "The Midnight Riders",
  providerLabel: "Official ticketing marketplace on Blocktickets",
  aboutText:
    "The Midnight Riders bring the Neon Country Tour to The Fillmore Denver — a night of new songs, longtime favorites, and a full light show. Doors open one hour before the show. Mobile tickets only; all-in pricing with no surprises at checkout.",
  homeLabel: "The Midnight Riders",
  awayLabel: "Josey Wren",
  awayShort: "JW",
  listings: [
    { zone: "Pit", tier: "Standing pit", sec: "PIT", row: "GA", min: 1, max: 6, price: "$65.00" },
    { zone: "Floor", tier: "Floor reserved", sec: "A", row: "12", min: 1, max: 4, price: "$46.00" },
    { zone: "Club Level", tier: "Club seating", sec: "CL", row: "2", min: 2, max: 6, price: "$58.00" },
    { zone: "Loge Boxes", tier: "Loge box", sec: "LB", row: "1", min: 2, max: 4, price: "$50.00" },
    { zone: "Lower Bowl", tier: "Lower bowl reserved", sec: "F", row: "4", min: 1, max: 8, price: "$32.50" },
    { zone: "Mezzanine", tier: "Mezzanine reserved", sec: "MZ", row: "9", min: 1, max: 6, price: "$38.00" },
    { zone: "Balcony", tier: "Balcony reserved", sec: "K", row: "22", min: 2, max: 6, price: "$21.75" },
    { zone: "Terrace", tier: "Terrace reserved", sec: "T", row: "3", min: 1, max: 4, price: "$28.00" },
    { zone: "Upper Deck", tier: "Upper deck", sec: "U", row: "18", min: 1, max: 8, price: "$18.00" },
    { zone: "Rear GA", tier: "General admission", sec: "N", row: "I", min: 1, max: 8, price: "$13.16" },
  ],
  // "Club Level" is a passcode presale — its listings stay hidden until unlocked. Code: NEON26
  lockedZones: [{ zone: "Club Level", code: "NEON26" }],
};

/** GA tiers — ported from "GA Event Page - Generic.dc.html". */
const CONCERT_GA_TIERS: GATier[] = [
  { name: "General admission", sub: "General admission · unreserved seating", price: "$10.08", unit: 10.08, note: "Ticket limit: 100 per order", state: "live" },
  { name: "Balcony reserved", sub: "Seated balcony, rows A–F", price: "$18.00", unit: 18, note: "On sale Fri, Aug 14 at 10:00 AM MT", state: "scheduled", onSaleAt: "Friday, Aug 14 at 10:00 AM MT" },
  { name: "Student rush", sub: "Valid student ID required at the door", price: "Free", unit: 0, note: "All 300 student tickets claimed", state: "soldout" },
];

export default async function ConcertPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const sp = await searchParams;
  const data: TicketingData =
    sp?.type === "ga"
      ? { ...CONCERT_DATA, eventType: "ga", posterSrc: CONCERT_DATA.logoSrc, gaTiers: CONCERT_GA_TIERS }
      : CONCERT_DATA;
  return <PremiumTicketing data={data} />;
}
