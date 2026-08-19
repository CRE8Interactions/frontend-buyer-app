/**
 * Demo fixtures — local dummy data used when NEXT_PUBLIC_DEMO=true
 * and as the shared source of truth for unit/component tests.
 * Nothing here touches a backend or network; images are local /public assets.
 * Shapes mirror what the pages/components consume (see EventCard / OrganizationCard).
 */

import type { TicketingData } from "@/components/organisms/PremiumTicketing";
import { brandingToTicketingTheme } from "@/lib/branding";
import { CHECKOUT_HOLD_SECONDS } from "@/lib/checkoutBranding";
import {
  eventWhenShortWithDoors,
  eventWhenWithDoors,
  formatEventWhen,
} from "@/lib/helpers";
import {
  formatVenueCityState,
  formatVenueLocationLine,
} from "@/lib/venueLocation";
import type { SeatmapMapping } from "@/lib/seatmapLookups";
import { groupsToListings, type RawTicketGroup } from "@/lib/ticketListings";

export type DemoImage = { url: string };

export type DemoVenue = {
  name: string;
  city: string;
  state: string;
  slug: string;
  timezone?: string;
  address: Array<{ address_1?: string; city: string; state: string }>;
};

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

const DEMO_BRANDING: Record<
  string,
  {
    enabled: boolean;
    primaryColor: string;
    buttonColor: string;
    buttonTextColor?: string;
    logo: DemoImage;
  }
> = {
  "niagara-icedogs": {
    enabled: true,
    primaryColor: "#c8102e",
    buttonColor: "#c8102e",
    logo: { url: "/clients/icedogs.svg" },
  },
  "des-moines-buccaneers": {
    enabled: true,
    primaryColor: "#003366",
    buttonColor: "#003366",
    logo: { url: "/clients/buccaneers.svg" },
  },
  "ogden-raptors": {
    enabled: true,
    primaryColor: "#1a3a6b",
    buttonColor: "#1a3a6b",
    buttonTextColor: "#ffffff",
    logo: { url: "/clients/raptors.svg" },
  },
  "nm-state": {
    enabled: true,
    primaryColor: "#8c0b42",
    buttonColor: "#8c0b42",
    logo: { url: "/clients/nmstate.png" },
  },
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function demoVenue(
  name: string,
  city: string,
  state: string,
  timezone = "America/Denver",
  address_1?: string,
): DemoVenue {
  return {
    name,
    city,
    state,
    slug: slugify(name),
    timezone,
    address: [{ ...(address_1 ? { address_1 } : {}), city, state }],
  };
}

/** Pricing levels used on team/venue event rows. Lowest is P2. */
export const DEMO_EVENT_PRICING_LEVELS = {
  1: { id: 1, name: "P1", price: 45 },
  2: { id: 2, name: "P2", price: 25 },
};

const DEMO_ORG_WEBSITES: Record<string, string> = {
  "nm-state":
    "https://nmstatesports.com/facilities/aggie-memorial-stadium/5",
};

function demoOrg(slug: string, name: string, category?: string) {
  return {
    name,
    slug,
    branding: DEMO_BRANDING[slug],
    image: DEMO_BRANDING[slug]?.logo,
    category: category ? { name: category } : undefined,
    website: DEMO_ORG_WEBSITES[slug],
  };
}

const VENUE_MERIDIAN = demoVenue(
  "Meridian Centre",
  "St. Catharines",
  "ON",
  "America/Toronto",
);
const VENUE_BUCS = demoVenue("Buccaneer Arena", "Urbandale", "IA");
const VENUE_LINDQUIST = demoVenue("Lindquist Field", "Ogden", "UT");
const VENUE_AGGIE = demoVenue(
  "Aggie Memorial Stadium",
  "Las Cruces",
  "NM",
  "America/Denver",
  "1810 E University Ave",
);
const VENUE_PAN_AM = demoVenue(
  "Pan American Center",
  "Las Cruces",
  "NM",
  "America/Denver",
);

function DEMO_ORG_EVENT_COUNT(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: i + 1 }));
}

/** Organizations shown on Browse + org storefronts. */
export const DEMO_ORGS = [
  {
    name: "Niagara IceDogs",
    slug: "niagara-icedogs",
    uuid: "org-icedogs",
    subtitle: "OHL · St. Catharines, ON",
    image: { url: "/clients/icedogs.svg" },
    branding: DEMO_BRANDING["niagara-icedogs"],
    category: { name: "Hockey" },
    venue: VENUE_MERIDIAN,
    homeVenue: VENUE_MERIDIAN,
    venues: [VENUE_MERIDIAN],
    upcomingEventsCount: 6,
    events: DEMO_ORG_EVENT_COUNT(6),
  },
  {
    name: "Des Moines Buccaneers",
    slug: "des-moines-buccaneers",
    uuid: "org-buccaneers",
    subtitle: "USHL · Des Moines, IA",
    image: { url: "/clients/buccaneers.svg" },
    branding: DEMO_BRANDING["des-moines-buccaneers"],
    category: { name: "Hockey" },
    venue: VENUE_BUCS,
    homeVenue: VENUE_BUCS,
    venues: [VENUE_BUCS],
    upcomingEventsCount: 4,
    events: DEMO_ORG_EVENT_COUNT(4),
  },
  {
    name: "Ogden Raptors",
    slug: "ogden-raptors",
    uuid: "org-raptors",
    subtitle: "Pioneer League · Ogden, UT",
    image: { url: "/clients/raptors.svg" },
    branding: DEMO_BRANDING["ogden-raptors"],
    category: { name: "Baseball" },
    venue: VENUE_LINDQUIST,
    homeVenue: VENUE_LINDQUIST,
    venues: [VENUE_LINDQUIST],
    upcomingEventsCount: 5,
    events: DEMO_ORG_EVENT_COUNT(5),
  },
  {
    name: "NM State Athletics",
    slug: "nm-state",
    uuid: "org-nmstate",
    subtitle: "Conference USA · Las Cruces, NM",
    image: { url: "/clients/nmstate.png" },
    branding: DEMO_BRANDING["nm-state"],
    category: { name: "Football" },
    venue: VENUE_AGGIE,
    homeVenue: VENUE_AGGIE,
    venues: [VENUE_AGGIE, VENUE_PAN_AM],
    website: DEMO_ORG_WEBSITES["nm-state"],
    upcomingEventsCount: 7,
    events: DEMO_ORG_EVENT_COUNT(7),
  },
];

/** Events shown on Browse (trending) + event detail. */
export const DEMO_EVENTS = [
  {
    id: 101,
    uuid: "evt-icedogs-vs-otters",
    shortcode: "ICEDOG1",
    shortCode: "ICEDOG1",
    name: "IceDogs vs. Erie Otters",
    slug: "icedogs-vs-otters",
    seoUrl: "icedogs-vs-otters",
    start: "2026-08-15T23:00:00.000Z",
    doorsOpen: "2026-08-15T22:00:00.000Z",
    status: "on_sale",
    pricingLevels: DEMO_EVENT_PRICING_LEVELS,
    image: { url: "/cases/icedogs.jpg" },
    venue: { ...VENUE_MERIDIAN, isGeneralAdmissionOnly: true },
    seatmap: { ga_only: true },
    attractions: [
      {
        name: "Niagara IceDogs",
        order: 0,
        primary: true,
        artwork: { url: "/clients/icedogs.svg" },
      },
      {
        name: "Erie Otters",
        order: 1,
        primary: false,
        artwork: { url: "/clients/pjhl.png" },
      },
    ],
    organization: demoOrg("niagara-icedogs", "Niagara IceDogs", "Hockey"),
  },
  {
    id: 102,
    uuid: "evt-bucs-vs-fighting-saints",
    shortcode: "BUCS002",
    shortCode: "BUCS002",
    name: "Buccaneers vs. Dubuque Fighting Saints",
    slug: "bucs-vs-fighting-saints",
    seoUrl: "bucs-vs-fighting-saints",
    start: "2026-08-22T00:05:00.000Z",
    doorsOpen: "2026-08-21T23:05:00.000Z",
    status: "on_sale",
    pricingLevels: DEMO_EVENT_PRICING_LEVELS,
    image: { url: "/cases/buccaneers.jpg" },
    venue: { ...VENUE_BUCS, isGeneralAdmissionOnly: true },
    seatmap: { ga_only: true },
    attractions: [
      {
        name: "Des Moines Buccaneers",
        order: 0,
        primary: true,
        artwork: { url: "/clients/buccaneers.svg" },
      },
      {
        name: "Dubuque Fighting Saints",
        order: 1,
        primary: false,
        artwork: { url: "/clients/iowa-bulls.png" },
      },
    ],
    organization: demoOrg(
      "des-moines-buccaneers",
      "Des Moines Buccaneers",
      "Hockey",
    ),
  },
  {
    id: 103,
    uuid: "evt-raptors-vs-voyagers",
    shortcode: "RAPT003",
    shortCode: "RAPT003",
    name: "Raptors vs. Great Falls Voyagers",
    slug: "raptors-vs-voyagers",
    seoUrl: "raptors-vs-voyagers",
    start: "2026-08-09T01:35:00.000Z",
    doorsOpen: "2026-08-09T00:35:00.000Z",
    status: "on_sale",
    pricingLevels: DEMO_EVENT_PRICING_LEVELS,
    image: { url: "/cases/raptors.jpg" },
    venue: { ...VENUE_LINDQUIST, isGeneralAdmissionOnly: true },
    seatmap: { ga_only: true },
    attractions: [
      {
        name: "Ogden Raptors",
        order: 0,
        primary: true,
        artwork: { url: "/clients/raptors.svg" },
      },
      {
        name: "Great Falls Voyagers",
        order: 1,
        primary: false,
        artwork: { url: "/clients/houston-bulls.png" },
      },
    ],
    organization: demoOrg("ogden-raptors", "Ogden Raptors", "Baseball"),
  },
  {
    id: 104,
    uuid: "evt-nmstate-vs-liberty",
    shortcode: "NMST004",
    shortCode: "NMST004",
    name: "NM State Aggies vs. Liberty Flames",
    slug: "nmstate-vs-liberty",
    seoUrl: "nmstate-vs-liberty",
    start: "2026-09-05T23:00:00.000Z",
    doorsOpen: "2026-09-05T22:00:00.000Z",
    status: "on_sale",
    pricingLevels: DEMO_EVENT_PRICING_LEVELS,
    image: { url: "/cases/nmstate.jpg" },
    venue: { ...VENUE_AGGIE, isGeneralAdmissionOnly: true },
    seatmap: { ga_only: true },
    attractions: [
      {
        name: "NM State Aggies",
        order: 0,
        primary: true,
        artwork: { url: "/clients/nmstate.png" },
      },
      {
        name: "Liberty Flames",
        order: 1,
        primary: false,
        artwork: { url: "/clients/pjhl.png" },
      },
    ],
    organization: demoOrg("nm-state", "NM State Athletics", "Football"),
  },
  {
    id: 105,
    uuid: "evt-icedogs-vs-spitfires",
    shortcode: "ICEDOG5",
    shortCode: "ICEDOG5",
    name: "IceDogs vs. Windsor Spitfires",
    slug: "icedogs-vs-spitfires",
    seoUrl: "icedogs-vs-spitfires",
    start: "2026-08-29T23:00:00.000Z",
    doorsOpen: "2026-08-29T22:00:00.000Z",
    status: "presale",
    pricingLevels: DEMO_EVENT_PRICING_LEVELS,
    image: { url: "/cases/icedogs.jpg" },
    venue: { ...VENUE_MERIDIAN, isGeneralAdmissionOnly: false },
    seatmap: { ga_only: false },
    attractions: [
      {
        name: "Niagara IceDogs",
        order: 0,
        primary: true,
        artwork: { url: "/clients/icedogs.svg" },
      },
      {
        name: "Windsor Spitfires",
        order: 1,
        primary: false,
        artwork: { url: "/clients/iowa-bulls.png" },
      },
    ],
    organization: demoOrg("niagara-icedogs", "Niagara IceDogs", "Hockey"),
  },
  {
    id: 106,
    uuid: "evt-raptors-vs-chukars",
    shortcode: "RAPT006",
    shortCode: "RAPT006",
    name: "Raptors vs. Idaho Falls Chukars",
    slug: "raptors-vs-chukars",
    seoUrl: "raptors-vs-chukars",
    start: "2026-08-16T01:35:00.000Z",
    doorsOpen: "2026-08-16T00:35:00.000Z",
    status: "on_sale",
    pricingLevels: DEMO_EVENT_PRICING_LEVELS,
    image: { url: "/cases/raptors.jpg" },
    venue: { ...VENUE_LINDQUIST, isGeneralAdmissionOnly: false },
    seatmap: { ga_only: false },
    attractions: [
      {
        name: "Ogden Raptors",
        order: 0,
        primary: true,
        artwork: { url: "/clients/raptors.svg" },
      },
      {
        name: "Idaho Falls Chukars",
        order: 1,
        primary: false,
        artwork: { url: "/clients/houston-bulls.png" },
      },
    ],
    organization: demoOrg("ogden-raptors", "Ogden Raptors", "Baseball"),
  },
];

/** Full event-detail payload for GET /events/{slug}/{shortcode} (getEventByShortCode). */
export function demoEventDetail(shortcode: string) {
  const base = DEMO_EVENTS.find(
    (e) => e.shortcode === shortcode || e.shortCode === shortcode,
  );
  if (!base) return { status: 404 };
  return {
    event: {
      ...base,
      summary:
        "Dummy event for UI/UX review — all data here is local demo content, not real inventory.",
      status: base.status || "on_sale",
      venue: {
        ...base.venue,
        timezone: base.venue.timezone || "America/Denver",
        address: base.venue.address || [
          { city: base.venue.city, state: base.venue.state },
        ],
      },
    },
  };
}

/** Section that the GA demo inventory sits in, and that demoSeatmapMapping draws. */
export const DEMO_GA_SECTION_ID = "sec-ga";

/** GA ticket groups for GET/POST ticket-group lookups. Prices are in dollars. */
export function demoTicketGroups() {
  return {
    soldout: false,
    ticketGroups: [
      {
        id: "grp-ga",
        price: 25,
        availableCount: 240,
        sectionId: DEMO_GA_SECTION_ID,
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
        offer: {
          id: "off-vip",
          name: "VIP Club",
          description: "Premium club access + in-seat service.",
        },
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
        offer: {
          id: "off-presale",
          name: "STH Presale",
          accessCode: "GO2026",
          unlocked: false,
          description: "Locked — enter your presale code.",
        },
      },
    ],
  };
}

/**
 * Seated inventory used by select-tickets tests and demo seated flows.
 * Includes coded / sold-out / duplicate rows so listing helpers can be covered.
 */
export const DEMO_SEATED_TICKET_GROUPS: RawTicketGroup[] = [
  {
    id: 1,
    sectionId: "sec-m",
    sectionNumber: "M",
    rowNumber: "M3",
    price: 33.59,
    availableCount: 4,
    maxContiguous: 4,
    seatIds: ["s1", "s2", "s3", "s4"],
    GA: false,
    accessible: false,
    offer: {
      id: 10,
      name: "Field Club",
      color: "#F032E6",
      inventoryType: "exclusive",
      minQuantity: 1,
      maxQuantity: null,
    },
  },
  {
    id: 2,
    sectionId: "sec-a",
    sectionNumber: "A",
    rowNumber: "12",
    price: 21.94,
    availableCount: 6,
    maxContiguous: 6,
    seatIds: ["a1", "a2", "a3", "a4", "a5", "a6"],
    GA: false,
    accessible: true,
    offer: {
      id: 11,
      name: "Section A-B",
      color: "#F58231",
      inventoryType: "exclusive",
      minQuantity: 2,
      maxQuantity: 6,
    },
  },
  {
    id: 3,
    sectionNumber: "Z",
    rowNumber: "1",
    price: 99,
    availableCount: 8,
    maxContiguous: 8,
    seatIds: ["z1", "z2"],
    offer: {
      id: 12,
      name: "VIP Coded",
      color: "#9757D7",
      inventoryType: "exclusive",
      accessCode: "SECRET",
      minQuantity: 1,
      maxQuantity: 4,
    },
  },
  {
    id: 4,
    sectionId: "sec-b",
    sectionNumber: "B",
    rowNumber: "2",
    price: 15,
    availableCount: 0,
    maxContiguous: 0,
    seatIds: [],
    GA: false,
    offer: { id: 13, name: "Sold Out Row" },
  },
  // Duplicate of group 2 — groupsToListings should keep only one.
  {
    id: 2,
    sectionId: "sec-a",
    sectionNumber: "A",
    rowNumber: "12",
    price: 21.94,
    availableCount: 6,
    maxContiguous: 6,
    seatIds: ["a1", "a2", "a3", "a4", "a5", "a6"],
    GA: false,
    accessible: true,
    offer: {
      id: 11,
      name: "Section A-B",
      color: "#F58231",
      inventoryType: "exclusive",
      minQuantity: 2,
      maxQuantity: 6,
    },
  },
  {
    id: 5,
    sectionId: "sec-n",
    sectionNumber: "N",
    rowNumber: "I",
    price: 11.64,
    availableCount: 8,
    maxContiguous: 8,
    seatIds: ["n1", "n2", "n3", "n4", "n5", "n6", "n7", "n8"],
    GA: false,
    accessible: false,
    offer: {
      id: 14,
      name: "Section M-N & GA",
      color: "#FFE119",
      inventoryType: "exclusive",
      minQuantity: 1,
      maxQuantity: 8,
    },
  },
];

/** Attach sellable ticket inventory so FROM prices come from tickets, not tiers. */
for (const event of DEMO_EVENTS) {
  Object.assign(event, {
    ticketGroups:
      event.seatmap?.ga_only === false
        ? DEMO_SEATED_TICKET_GROUPS
        : demoTicketGroups().ticketGroups,
  });
}

/**
 * Fill the demo mapping authors on every section, the way real venue maps do.
 * Deliberately not the seatmap's own available blue, so tests can tell an
 * authored colour apart from an availability colour.
 */
export const DEMO_SECTION_FILL = "#1F6FD0";

/** Seated geometry, keyed to the sectionIds/seatIds in DEMO_SEATED_TICKET_GROUPS. */
const DEMO_MAPPING_SECTIONS = [
  { sectionId: "sec-m", sectionNumber: "M", rowId: "row-m3", seats: ["s1", "s2", "s3", "s4"] },
  {
    sectionId: "sec-a",
    sectionNumber: "A",
    rowId: "row-a12",
    seats: ["a1", "a2", "a3", "a4", "a5", "a6"],
  },
  {
    sectionId: "sec-n",
    sectionNumber: "N",
    rowId: "row-n1",
    seats: ["n1", "n2", "n3", "n4", "n5", "n6", "n7", "n8"],
  },
  // Geometry exists but its group has no sellable seats — the sold-out case.
  { sectionId: "sec-b", sectionNumber: "B", rowId: "row-b2", seats: ["b1", "b2"] },
];

/**
 * Lindquist Field-style mapping: seated sections marked zoomable with their
 * seats hanging off rows, GA areas as plain sections, and an authored fill on
 * every section.
 */
export function demoSeatmapMapping(): SeatmapMapping {
  const sections: NonNullable<SeatmapMapping["sections"]> = {};
  const rows: NonNullable<SeatmapMapping["rows"]> = {};
  const seats: NonNullable<SeatmapMapping["seats"]> = {};

  DEMO_MAPPING_SECTIONS.forEach((section, sectionIndex) => {
    rows[section.rowId] = {
      rowId: section.rowId,
      sectionId: section.sectionId,
      seats: [...section.seats],
    };
    section.seats.forEach((seatId, seatIndex) => {
      seats[seatId] = {
        seatId,
        seatNumber: seatIndex + 1,
        rowId: section.rowId,
        sectionId: section.sectionId,
        cx: 100 + seatIndex * 14,
        cy: 200 + sectionIndex * 60,
        w: 10,
        h: 10,
      };
    });
    sections[section.sectionId] = {
      sectionId: section.sectionId,
      sectionNumber: section.sectionNumber,
      path: `M0 ${sectionIndex * 60} H240 V${sectionIndex * 60 + 40} H0 Z`,
      fill: DEMO_SECTION_FILL,
      zoomable: true,
      rows: [section.rowId],
    };
  });

  sections[DEMO_GA_SECTION_ID] = {
    sectionId: DEMO_GA_SECTION_ID,
    sectionNumber: "The Tar Pit",
    path: "M0 300 H320 V380 H0 Z",
    fill: DEMO_SECTION_FILL,
    zoomable: false,
    spots: ["ga-spot-1", "ga-spot-2"],
  };

  return { sections, rows, seats };
}

/** Cart stub returned when adding GA tickets to cart. */
export function demoCart() {
  return {
    cartId: "demo-cart-0001",
    sessionId: "demo-session-0001",
    freeOffer: false,
  };
}

/** Full checkout cart for GET /cart/myCart — Raptors seated hold by default. */
export function demoCheckoutCart(
  overrides: {
    organization?: null | (typeof DEMO_EVENTS)[number]["organization"];
    remainingTime?: number | null;
    ticketCount?: number;
    serviceFee?: number;
    processingFee?: number;
  } = {},
) {
  const event =
    DEMO_EVENTS.find((e) => e.shortCode === "RAPT006") || DEMO_EVENTS[0];
  const organization =
    overrides.organization === null
      ? undefined
      : (overrides.organization ?? event.organization);
  const listing = DEMO_SEATED_TICKET_GROUPS[0];
  const ticketCount = Math.max(1, overrides.ticketCount ?? 1);
  const serviceFee = overrides.serviceFee ?? 0;
  const processingFee = overrides.processingFee ?? 0;
  return {
    id: "cart-raptors-1",
    remainingTime:
      overrides.remainingTime === undefined
        ? CHECKOUT_HOLD_SECONDS
        : overrides.remainingTime ?? undefined,
    event: {
      uuid: event.uuid,
      name: event.name,
      start: event.start,
      doorsOpen: event.doorsOpen,
      realDoorsOpen: event.realDoorsOpen,
      slug: event.slug,
      seoUrl: event.seoUrl,
      shortCode: event.shortCode,
      shortcode: event.shortcode,
      image: event.image,
      branding: organization?.branding,
      organization,
      venue: event.venue,
      seatmap: event.seatmap,
    },
    tickets: Array.from({ length: ticketCount }, (_, index) => ({
      sectionName: listing.sectionNumber,
      sectionNumber: listing.sectionNumber,
      rowNumber: listing.rowNumber,
      seatNumber: 7 + index,
      cost: listing.price,
      price: listing.price,
      offerName: listing.offer?.name,
    })),
    total: listing.price * ticketCount + serviceFee + processingFee,
    serviceFee,
    processingFee,
    estimatedProcessingFee: processingFee,
  };
}

/** Browse-page event list derived from DEMO_EVENTS (no duplicated fixtures). */
export function demoBrowseEvents() {
  return DEMO_EVENTS.map((event) => ({ ...event }));
}

/** Browse-page org list derived from DEMO_ORGS. */
export function demoBrowseOrgs() {
  return DEMO_ORGS.map((org) => ({ ...org }));
}

/** Upcoming events that belong to a venue slug. */
export function demoVenueEvents(slug: string) {
  return DEMO_EVENTS.filter((event) => event.venue?.slug === slug);
}

/** Browse-page venue list derived from org home venues. */
export function demoBrowseVenues() {
  const seen = new Set<string>();
  const venues: Array<{
    name: string;
    slug: string;
    address: Array<{ city: string; state: string }>;
    upcomingEventsCount?: number;
  }> = [];
  for (const org of DEMO_ORGS) {
    const venue = org.homeVenue || org.venue;
    if (!venue?.slug || seen.has(venue.slug)) continue;
    seen.add(venue.slug);
    venues.push({
      name: venue.name,
      slug: venue.slug,
      address: venue.address,
      upcomingEventsCount: org.upcomingEventsCount,
    });
  }
  return venues;
}

const DEMO_SEATED_EVENT =
  DEMO_EVENTS.find((e) => e.shortcode === "RAPT006") || DEMO_EVENTS[0];

/**
 * PremiumTicketing payload for the seated Raptors demo event.
 * Listings come from DEMO_SEATED_TICKET_GROUPS via groupsToListings.
 */
export function demoSeatedTicketingData(
  overrides: Partial<TicketingData> = {},
): TicketingData {
  const event = DEMO_SEATED_EVENT;
  const org = event.organization;
  const theme = brandingToTicketingTheme(event, org);
  const listings = groupsToListings(DEMO_SEATED_TICKET_GROUPS);
  const home = event.attractions?.find((a) => a.primary)?.name || org.name;
  const away =
    event.attractions?.find((a) => !a.primary)?.name || "Visitor";
  const venueCityState = formatVenueCityState(event.venue.address);
  const venueLine = formatVenueLocationLine(event.venue.name, event.venue.address);
  const tz = event.venue.timezone;
  const whenPlain = formatEventWhen(event.start, tz);
  const whenLong = eventWhenWithDoors(event.start, event.doorsOpen, tz);

  return {
    eventId: event.id,
    ...theme,
    eventName: event.name,
    whenLong,
    whenShort: eventWhenShortWithDoors(event.start, event.doorsOpen, tz),
    whenPlain,
    doorsLine: whenLong,
    venueName: event.venue.name,
    venueSlug: event.venue.slug,
    venueLine,
    venueAddress: venueLine,
    venueCityState,
    mapsQuery: `${event.venue.name} ${event.venue.city} ${event.venue.state}`,
    orgLabel: org.name,
    providerLabel: `Official ticketing marketplace for ${org.name}`,
    aboutText:
      "Dummy event for UI/UX review — all data here is local demo content, not real inventory.",
    homeLabel: home,
    awayLabel: away,
    awayShort: away.slice(0, 3).toUpperCase(),
    offerNames: ["Field Club", "Section A-B", "Section M-N & GA"],
    listings,
    ...overrides,
  };
}

export function demoLockedTicketingData(
  overrides: Partial<TicketingData> = {},
): TicketingData {
  return demoSeatedTicketingData({
    lockedZones: [{ zone: "Field Club", code: "CLUB26" }],
    ...overrides,
  });
}

const DEMO_NM_STATE_EVENT =
  DEMO_EVENTS.find((e) => e.shortCode === "NMST004") || DEMO_EVENTS[0];

const DEMO_NM_STATE_ORG =
  DEMO_ORGS.find((o) => o.slug === "nm-state") || DEMO_ORGS[0];

/**
 * Season-package payload for GET /packages/get-package-fe.
 * Included games start from the NM State demo event and share its venue/org.
 */
export function demoSeasonPackage(
  overrides: Record<string, unknown> = {},
) {
  const event = DEMO_NM_STATE_EVENT;
  const org = DEMO_NM_STATE_ORG;
  const venue = {
    name: event.venue.name,
    slug: event.venue.slug,
    timezone: event.venue.timezone,
  };
  const events = [
    {
      uuid: event.uuid,
      name: event.name,
      start: event.start,
      slug: event.slug,
      shortCode: event.shortCode,
      venue,
    },
    {
      uuid: "evt-nmstate-vs-lobos",
      name: `${event.attractions?.[0]?.name || org.name} vs. New Mexico Lobos`,
      start: "2026-09-26T19:30:00.000Z",
      venue,
    },
    {
      uuid: "evt-nmstate-vs-wku",
      name: `${event.attractions?.[0]?.name || org.name} vs. Western Kentucky Hilltoppers`,
      start: "2026-10-02T00:00:00.000Z",
      venue,
    },
    {
      uuid: "evt-nmstate-vs-jax",
      name: `${event.attractions?.[0]?.name || org.name} vs. Jacksonville State Gamecocks`,
      start: "2026-10-28T00:00:00.000Z",
      venue,
    },
    {
      uuid: "evt-nmstate-vs-delaware",
      name: `${event.attractions?.[0]?.name || org.name} vs. Delaware Fightin' Blue Hens`,
      start: "2026-11-21T19:00:00.000Z",
      venue,
    },
  ];

  return {
    id: "pkg-nms-level-a",
    uuid: "pkg-nms-level-a",
    name: "NMS Football Season Seats - Pricing Level A",
    start: events[0].start,
    end: events[events.length - 1].start,
    maxQuantity: 4,
    pricingTiers: [{ price: 200, name: "Level A" }],
    venue,
    organization: org,
    category: org.category,
    timezone: event.venue.timezone,
    events,
    seatmap: {
      id: "pkg-map-1",
      mapping: demoSeatmapMapping(),
      background: {
        url: "https://example.com/pkg-seatmap.svg",
        width: 1000,
        height: 800,
      },
    },
    package_tickets: [
      { id: "pt-ga-family", price: 175, quantity: 4, availableCount: 4 },
      { id: "pt-club", price: 200, quantity: 4, availableCount: 4 },
    ] as Array<Record<string, unknown>>,
    ...overrides,
  };
}

/** Checkout cart for a season package hold — NM State seats by default. */
export function demoPackageCheckoutCart(
  overrides: {
    tickets?: Array<Record<string, unknown>>;
    serviceFee?: number;
    processingFee?: number;
    remainingTime?: number | null;
    total?: number;
  } = {},
) {
  const pkg = demoSeasonPackage();
  const listing = DEMO_SEATED_TICKET_GROUPS[0];
  const unit = Number(pkg.pricingTiers[0].price);
  const tickets =
    overrides.tickets ??
    [
      {
        sectionName: listing.sectionNumber,
        sectionNumber: listing.sectionNumber,
        rowNumber: listing.rowNumber,
        seatNumber: 21,
        cost: unit,
        price: unit,
        offerName: listing.offer?.name,
      },
    ];
  const serviceFee = overrides.serviceFee ?? 8;
  const processingFee = overrides.processingFee ?? 4;
  const subtotal = tickets.reduce(
    (sum, ticket) => sum + Number(ticket.cost || ticket.price || 0),
    0,
  );
  return {
    id: "cart-package-1",
    remainingTime:
      overrides.remainingTime === undefined
        ? CHECKOUT_HOLD_SECONDS
        : overrides.remainingTime ?? undefined,
    package: pkg,
    organization: pkg.organization,
    tickets,
    total: overrides.total ?? subtotal + serviceFee + processingFee,
    serviceFee,
    processingFee,
    totalTax: 0,
  };
}

/** Completed single-event order used by checkout-success receipt PDFs. */
export function demoCompletedTicketOrder(
  overrides: Record<string, unknown> = {},
) {
  const cart = demoCheckoutCart({ ticketCount: 4 });
  const subtotal = cart.tickets.reduce(
    (sum, ticket) => sum + Number(ticket.cost || ticket.price || 0),
    0,
  );
  const serviceFee = 14;
  const processingFee = 3.92;
  return {
    id: 1474,
    orderId: "1474-643535-0700",
    processedAt: "2026-08-18T16:00:00.000Z",
    dateOfIssue: "2026-08-18T16:00:00.000Z",
    firstName: DEMO_USER.firstName,
    lastName: DEMO_USER.lastName,
    email: DEMO_USER.email,
    paymentMethodType: "mastercard",
    last4: "5652",
    tickets: cart.tickets,
    event: cart.event,
    organization: cart.event.organization,
    total: subtotal + serviceFee + processingFee,
    serviceFee,
    estimatedProcessingFee: processingFee,
    processingFee,
    salesTax: 0,
    ...overrides,
  };
}

/** Completed season-package order used by checkout-success receipt PDFs. */
export function demoCompletedPackageOrder(
  overrides: Record<string, unknown> = {},
) {
  const listing = DEMO_SEATED_TICKET_GROUPS[0];
  const pkg = demoSeasonPackage();
  const unit = Number(pkg.pricingTiers[0].price);
  const cart = demoPackageCheckoutCart({
    tickets: [21, 22].map((seatNumber) => ({
      sectionName: listing.sectionNumber,
      sectionNumber: listing.sectionNumber,
      rowNumber: listing.rowNumber,
      seatNumber,
      cost: unit,
      price: unit,
      offerName: listing.offer?.name,
    })),
  });
  return {
    id: 1474,
    orderId: "1474-601490-8744",
    processedAt: "2026-08-17T16:00:00.000Z",
    dateOfIssue: "2026-08-17T16:00:00.000Z",
    firstName: DEMO_USER.firstName,
    lastName: DEMO_USER.lastName,
    email: DEMO_USER.email,
    paymentMethodType: "mastercard",
    last4: "5652",
    tickets: cart.tickets,
    package: cart.package,
    organization: cart.organization,
    total: cart.total,
    serviceFee: cart.serviceFee,
    estimatedProcessingFee: cart.processingFee,
    processingFee: cart.processingFee,
    salesTax: 0,
    ...overrides,
  };
}

const DEMO_ICEDOGS_ORG =
  DEMO_ORGS.find((o) => o.slug === "niagara-icedogs") || DEMO_ORGS[0];

/** Flex-pack payload for GET /flex-pack/get-flex-pack and storefront `flexPacks`. */
export function demoFlexPack(overrides: Record<string, unknown> = {}) {
  const org = DEMO_ICEDOGS_ORG;
  const venue = org.homeVenue || org.venue;
  return {
    id: "flex-icedogs-gold-6",
    uuid: "cfa9c3cb-e81c-4141-ac56-c8edcd0f0303",
    name: "6 - Gold Flex Pack",
    description:
      "Six Gold vouchers for any IceDogs home game. Redeem when you know you can go.",
    price: 145,
    gameTickets: 6,
    start: "2026-09-01T00:00:00.000Z",
    end: "2027-04-30T00:00:00.000Z",
    image: { url: "/cases/icedogs.jpg" },
    venue: {
      name: venue.name,
      slug: venue.slug,
      timezone: venue.timezone,
    },
    organization: org,
    ...overrides,
  };
}

/** Completed flex-pack order used by the wallet Flex packs tab. */
export function demoCompletedFlexPackOrder(
  overrides: Record<string, unknown> = {},
) {
  const pack = demoFlexPack(
    (overrides.flex_pack as Record<string, unknown> | undefined) || {},
  );
  const cart = demoFlexPackCheckoutCart({
    flex_pack: pack,
  });
  const codes = ["868364", "146459", "229187", "551034", "774210", "903812"];
  return {
    id: 128185,
    orderId: "1474-145929-3862",
    status: "complete",
    createdAt: "2026-08-19T22:47:16.540Z",
    email: DEMO_USER.email,
    event: null,
    package: null,
    tickets: [],
    flex_pack: pack,
    vouchers: codes.map((code, index) => ({
      id: 2000 + index,
      uuid: `vouch-flex-${index + 1}`,
      code,
      status: "active",
      flex_pack: pack,
    })),
    type: "primary",
    paymentMethodType: "visa",
    last4: "4242",
    total: cart.total,
    serviceFee: cart.serviceFee,
    processingFee: cart.processingFee,
    estimatedProcessingFee: cart.processingFee,
    salesTax: 0,
    ...overrides,
  };
}

/** Checkout cart for a flex-pack hold — $1 service fee per voucher. */
export function demoFlexPackCheckoutCart(
  overrides: {
    flex_pack?: Record<string, unknown>;
    serviceFee?: number;
    processingFee?: number;
    remainingTime?: number | null;
    total?: number;
  } = {},
) {
  const pack = demoFlexPack(overrides.flex_pack);
  const gameTickets = Number(pack.gameTickets || 0);
  const serviceFee = overrides.serviceFee ?? gameTickets;
  const processingFee = overrides.processingFee ?? 4;
  const subtotal = Number(pack.price || 0);
  return {
    id: "cart-flex-1",
    remainingTime:
      overrides.remainingTime === undefined
        ? CHECKOUT_HOLD_SECONDS
        : overrides.remainingTime ?? undefined,
    flex_pack: pack,
    organization: pack.organization,
    total: overrides.total ?? subtotal + serviceFee + processingFee,
    serviceFee,
    processingFee,
    totalTax: 0,
  };
}
