/**
 * Demo fixtures — local dummy data used when NEXT_PUBLIC_DEMO=true.
 * Nothing here touches a backend or network; images are local /public assets.
 * Shapes mirror what the pages/components consume (see EventCard / OrganizationCard).
 */

export type DemoImage = { url: string };

export const DEMO_USER = {
  id: 1,
  uuid: "demo-user-0001",
  email: "fan@blocktickets.xyz",
  firstName: "Demo",
  lastName: "Fan",
  phoneNumber: "+15555550123",
  dob: "01/01/1995",
  role: { name: "Authenticated" },
};

export const DEMO_SESSION = { jwt: "demo-jwt-token", user: DEMO_USER };

/** Organizations shown on Browse + org storefronts. */
export const DEMO_ORGS = [
  {
    name: "Niagara IceDogs",
    slug: "niagara-icedogs",
    uuid: "org-icedogs",
    subtitle: "OHL · St. Catharines, ON",
    image: { url: "/clients/icedogs.svg" },
    venue: { name: "Meridian Centre", city: "St. Catharines", state: "ON" },
    events: DEMO_ORG_EVENT_COUNT(6),
  },
  {
    name: "Des Moines Buccaneers",
    slug: "des-moines-buccaneers",
    uuid: "org-buccaneers",
    subtitle: "USHL · Des Moines, IA",
    image: { url: "/clients/buccaneers.svg" },
    venue: { name: "Buccaneer Arena", city: "Urbandale", state: "IA" },
    events: DEMO_ORG_EVENT_COUNT(4),
  },
  {
    name: "Ogden Raptors",
    slug: "ogden-raptors",
    uuid: "org-raptors",
    subtitle: "Pioneer League · Ogden, UT",
    image: { url: "/clients/raptors.svg" },
    venue: { name: "Lindquist Field", city: "Ogden", state: "UT" },
    events: DEMO_ORG_EVENT_COUNT(5),
  },
  {
    name: "NM State Athletics",
    slug: "nm-state",
    uuid: "org-nmstate",
    subtitle: "Conference USA · Las Cruces, NM",
    image: { url: "/clients/nmstate.png" },
    venue: { name: "Aggie Memorial Stadium", city: "Las Cruces", state: "NM" },
    events: DEMO_ORG_EVENT_COUNT(7),
  },
];

function DEMO_ORG_EVENT_COUNT(n: number) {
  // some org cards show an upcoming-event count; keep it a simple array of stubs
  return Array.from({ length: n }, (_, i) => ({ id: i + 1 }));
}

/** Events shown on Browse (trending) + event detail. */
export const DEMO_EVENTS = [
  {
    id: 101,
    uuid: "evt-icedogs-vs-otters",
    shortcode: "ICEDOG1",
    name: "IceDogs vs. Erie Otters",
    slug: "icedogs-vs-otters",
    start: "2026-08-15T23:00:00.000Z",
    image: { url: "/cases/icedogs.jpg" },
    venue: { name: "Meridian Centre", city: "St. Catharines", state: "ON" },
    seatmap: { ga_only: true },
    attractions: [
      { name: "Niagara IceDogs", order: 0, primary: true, artwork: { url: "/clients/icedogs.svg" } },
      { name: "Erie Otters", order: 1, primary: false, artwork: { url: "/clients/pjhl.png" } },
    ],
    organization: { name: "Niagara IceDogs", slug: "niagara-icedogs" },
  },
  {
    id: 102,
    uuid: "evt-bucs-vs-fighting-saints",
    shortcode: "BUCS002",
    name: "Buccaneers vs. Dubuque Fighting Saints",
    slug: "bucs-vs-fighting-saints",
    start: "2026-08-22T00:05:00.000Z",
    image: { url: "/cases/buccaneers.jpg" },
    venue: { name: "Buccaneer Arena", city: "Urbandale", state: "IA" },
    seatmap: { ga_only: true },
    attractions: [
      { name: "Des Moines Buccaneers", order: 0, primary: true, artwork: { url: "/clients/buccaneers.svg" } },
      { name: "Dubuque Fighting Saints", order: 1, primary: false, artwork: { url: "/clients/iowa-bulls.png" } },
    ],
    organization: { name: "Des Moines Buccaneers", slug: "des-moines-buccaneers" },
  },
  {
    id: 103,
    uuid: "evt-raptors-vs-voyagers",
    shortcode: "RAPT003",
    name: "Raptors vs. Great Falls Voyagers",
    slug: "raptors-vs-voyagers",
    start: "2026-08-09T01:35:00.000Z",
    image: { url: "/cases/raptors.jpg" },
    venue: { name: "Lindquist Field", city: "Ogden", state: "UT" },
    seatmap: { ga_only: true },
    attractions: [
      { name: "Ogden Raptors", order: 0, primary: true, artwork: { url: "/clients/raptors.svg" } },
      { name: "Great Falls Voyagers", order: 1, primary: false, artwork: { url: "/clients/houston-bulls.png" } },
    ],
    organization: { name: "Ogden Raptors", slug: "ogden-raptors" },
  },
  {
    id: 104,
    uuid: "evt-nmstate-vs-liberty",
    shortcode: "NMST004",
    name: "NM State Aggies vs. Liberty Flames",
    slug: "nmstate-vs-liberty",
    start: "2026-09-05T23:00:00.000Z",
    image: { url: "/cases/nmstate.jpg" },
    venue: { name: "Aggie Memorial Stadium", city: "Las Cruces", state: "NM" },
    seatmap: { ga_only: true },
    attractions: [
      { name: "NM State Aggies", order: 0, primary: true, artwork: { url: "/clients/nmstate.png" } },
      { name: "Liberty Flames", order: 1, primary: false, artwork: { url: "/clients/pjhl.png" } },
    ],
    organization: { name: "NM State Athletics", slug: "nm-state" },
  },
  {
    id: 105,
    uuid: "evt-icedogs-vs-spitfires",
    shortcode: "ICEDOG5",
    name: "IceDogs vs. Windsor Spitfires",
    slug: "icedogs-vs-spitfires",
    start: "2026-08-29T23:00:00.000Z",
    image: { url: "/cases/icedogs.jpg" },
    venue: { name: "Meridian Centre", city: "St. Catharines", state: "ON" },
    seatmap: { ga_only: true },
    attractions: [
      { name: "Niagara IceDogs", order: 0, primary: true, artwork: { url: "/clients/icedogs.svg" } },
      { name: "Windsor Spitfires", order: 1, primary: false, artwork: { url: "/clients/iowa-bulls.png" } },
    ],
    organization: { name: "Niagara IceDogs", slug: "niagara-icedogs" },
  },
  {
    id: 106,
    uuid: "evt-raptors-vs-chukars",
    shortcode: "RAPT006",
    name: "Raptors vs. Idaho Falls Chukars",
    slug: "raptors-vs-chukars",
    start: "2026-08-16T01:35:00.000Z",
    image: { url: "/cases/raptors.jpg" },
    venue: { name: "Lindquist Field", city: "Ogden", state: "UT" },
    seatmap: { ga_only: true },
    attractions: [
      { name: "Ogden Raptors", order: 0, primary: true, artwork: { url: "/clients/raptors.svg" } },
      { name: "Idaho Falls Chukars", order: 1, primary: false, artwork: { url: "/clients/houston-bulls.png" } },
    ],
    organization: { name: "Ogden Raptors", slug: "ogden-raptors" },
  },
];

/** Full event-detail payload for GET /events/{slug}/{shortcode} (getEventByShortCode). */
export function demoEventDetail(shortcode: string) {
  const base = DEMO_EVENTS.find((e) => e.shortcode === shortcode);
  if (!base) return { status: 404 };
  return {
    event: {
      ...base,
      summary:
        "Dummy event for UI/UX review — all data here is local demo content, not real inventory.",
      status: "on_sale",
      venue: {
        name: base.venue.name,
        timezone: "America/Denver",
        address: [{ city: base.venue.city, state: base.venue.state }],
      },
    },
  };
}

/** GA ticket groups for GET/POST ticket-group lookups. Prices are in dollars. */
export function demoTicketGroups() {
  return {
    soldout: false,
    ticketGroups: [
      {
        id: "grp-ga",
        price: 25,
        availableCount: 240,
        sectionName: "General Admission",
        sectionNumber: "GA",
        GA: true,
      },
      {
        id: "grp-vip",
        price: 75,
        availableCount: 24,
        sectionName: "VIP Club",
        sectionNumber: "VIP",
        GA: true,
        offer: { id: "off-vip", name: "VIP Club", description: "Premium club access + in-seat service." },
      },
      {
        id: "grp-family",
        price: 18,
        availableCount: 96,
        sectionName: "Family Zone (alcohol-free)",
        sectionNumber: "FAM",
        GA: true,
      },
      {
        id: "grp-presale",
        price: 30,
        availableCount: 40,
        sectionName: "Season-Ticket Holder Presale",
        sectionNumber: "PRE",
        GA: true,
        offer: { id: "off-presale", name: "STH Presale", accessCode: "GO2026", unlocked: false, description: "Locked — enter your presale code." },
      },
    ],
  };
}

/** Cart stub returned when adding GA tickets to cart. */
export function demoCart() {
  return { cartId: "demo-cart-0001", sessionId: "demo-session-0001", freeOffer: false };
}
