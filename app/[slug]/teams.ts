/* Team storefronts, one entry per slug. Adding a team means adding an entry here: the page reads its colour,
   artwork and listings from it, and no CSS or component changes. Colours in this file are each team's (and each
   opponent's) own brand colours, not Blocktickets tokens. */

export type Status = "On sale" | "Few left" | "Presale";

/* `m` is the month number and runs past 12 for the next year (16 is April of the following year), so a season sorts in order */
export type TeamEvent = { poster?: string; /** the home side's own (square) artwork for this game, when the data has it */ homeArt?: string; m: number; d: number; dow: string; time: string; sport: string; title: string; venue: string; p: number; status: Status; href: string; opp?: string; /** the opponent logo's accent colour, for its half of the stage */ oppColor?: string; mono: string };
/* a headline game for the stage; `o` is the opponent's colour and `opp` its crest card */
export type FeaturedGame = { sport: string; tag: string; head: string; short: string; date: string; time: string; venue: string; price: number; href: string; opp: string; o: string; /** initials of the opponent, for when it has no crest */ homeArt?: string; /** the venue's own picture, for the stage behind this game */ photo?: string; mono?: string; /** an event with no opponent (a show, a pass), so no "vs" */ solo?: boolean };
export type SeasonPass = { /** venues the pass is good at; left out, it is good at all of them */ venues?: string[]; cover?: string; n: number; unit: string; kicker: string; title: string; range: string; note: string; price: string; href: string; hot?: boolean };
export type FlexPack = { /** sports and venues the vouchers can be spent on; left out, any */ sports?: string[]; venues?: string[]; count: number; price: string; each: number; href: string; /** from the storefront API, shown on the card */ name?: string; desc?: string; start?: string; end?: string };

export type VenueInfo = { /** short facts for the moving strip */ facts?: string[]; capacity?: string; blurb?: string; photo?: string; /** the venue's own aerial drawing, when there is one; otherwise the page draws its main sport */ art?: string; /** the venue's profile image (a poster of the stadium) */ profile?: string; /** a wide banner for the schedule */ banner?: string; /** street address, as one line */ address?: string; /** timezone abbreviation, e.g. CDT */ tz?: string };

/* Where the stage photo is anchored when it is cropped to the stage (CSS background-position). The photos are wide, so the crop keeps the middle by default; a team whose subject sits off-centre names the point to keep here. */
export const PHOTO_FOCUS: Record<string, string> = {
  "des-moines-buccaneers": "60% 50%", // the jerseys run from a third of the way in to the right edge
};

export type Team = {
  slug: string;
  name: string;
  city: string;
  /** the team colour: the one value that themes the page */
  color: string;
  /** text on the team colour; worked out from `color` when left out */
  onColor?: string;
  logo: string;
  /** the full logo with its wordmark, for large placements; falls back to `logo` */
  logoWide?: string;
  /** the home crest card shown on the stage */
  crest: string;
  /** the venue photo behind the stage */
  photo: string;
  venueHref: string;
  /** extra facts per venue, keyed by the venue's name as it appears on the events; a venue with no entry still gets a page */
  venueInfo?: Record<string, VenueInfo>;
  months: Record<number, string>;
  featured: FeaturedGame[];
  events: TeamEvent[];
  passes: SeasonPass[];
  flex: FlexPack[];
};

const SEATED = "/e/nm-state/W50prW0I/tickets";
const GA = "/e/nm-state/KpIeUYbz";
const STADIUM = "Aggie Memorial Stadium";

export const TEAMS: Record<string, Team> = {
  "nm-state": {
    slug: "nm-state",
    name: "New Mexico State Athletics",
    city: "Las Cruces, NM",
    color: "#8c0b42",
    logo: "/nmstate/nmstate-logo-nowordmark.png",
    logoWide: "/nmstate/nmstate-logo-full.png",
    crest: "/teams/nm-state-aggies.png",
    photo: "/cases/nmstate.jpg",
    venueHref: "/venue/aggie-memorial-stadium",
    venueInfo: {
      "Aggie Memorial Stadium": { facts: ["Outdoor stadium", "On the NMSU campus", "Conference USA"], capacity: "30,343", art: "/nmstate/aggie-memorial-stadium.svg", profile: "/nmstate/aggie-venue-profile.png", banner: "/nmstate/aggie-venue-banner.jpg", blurb: "Aggie Memorial Stadium is an outdoor football stadium in the southwestern United States, located on the campus of New Mexico State University in Las Cruces, New Mexico. It is the home field of the New Mexico State Aggies of Conference USA." },
    },
    months: { 9: "September 2026", 10: "October 2026", 11: "November 2026", 16: "April 2027" },
    featured: [
      { sport: "Football", tag: "Rio Grande Rivalry", head: "Aggies vs. New Mexico", short: "New Mexico", date: "September 26", time: "7:00 PM", venue: STADIUM, price: 38, href: SEATED, opp: "/teams/new-mexico-lobos.png", o: "#ba0c2f" },
      { sport: "Football", tag: "Home opener", head: "Aggies vs. Mercyhurst", short: "Mercyhurst", date: "September 5", time: "7:00 PM", venue: STADIUM, price: 22, href: SEATED, opp: "/teams/mercyhurst.png", o: "#0f5a45" },
      { sport: "Football", tag: "Thursday night", head: "Aggies vs. Western Kentucky", short: "Western Kentucky", date: "October 1", time: "7:00 PM", venue: STADIUM, price: 24, href: SEATED, opp: "/teams/wku-hilltoppers.png", o: "#5b6770" },
    ],
    /* soccer and volleyball are general admission; the rest go to the reserved-seat page */
    events: [
      { m: 9, d: 3, dow: "Thu", time: "7:00 PM", sport: "Soccer", title: "Soccer vs. Grand Canyon", venue: "NMSU Soccer Field", p: 12, status: "On sale", href: GA, opp: "/teams/grand-canyon.png", mono: "GC" },
      { m: 9, d: 5, dow: "Sat", time: "7:00 PM", sport: "Football", title: "Aggies vs. Mercyhurst", venue: STADIUM, p: 22, status: "On sale", href: SEATED, opp: "/teams/mercyhurst.png", mono: "MU", poster: "/matchups/nmsu-vs-mercyhurst.png" },
      { m: 9, d: 14, dow: "Mon", time: "6:00 PM", sport: "Soccer", title: "Soccer vs. Seattle U", venue: "NMSU Soccer Field", p: 12, status: "On sale", href: GA, mono: "SU" },
      { m: 9, d: 26, dow: "Sat", time: "7:00 PM", sport: "Football", title: "Aggies vs. New Mexico", venue: STADIUM, p: 38, status: "Few left", href: SEATED, opp: "/teams/new-mexico-lobos.png", mono: "NM", poster: "/matchups/nmsu-vs-new-mexico.png" },
      { m: 10, d: 1, dow: "Thu", time: "7:00 PM", sport: "Football", title: "Aggies vs. Western Kentucky", venue: STADIUM, p: 24, status: "On sale", href: SEATED, opp: "/teams/wku-hilltoppers.png", mono: "WK", poster: "/matchups/nmsu-vs-wku.png" },
      { m: 11, d: 12, dow: "Thu", time: "7:00 PM", sport: "Basketball", title: "Men's Basketball vs. UTEP", venue: "Pan American Center", p: 20, status: "Presale", href: SEATED, opp: "/teams/utep-miners.png", mono: "UT" },
      { m: 11, d: 21, dow: "Sat", time: "5:00 PM", sport: "Volleyball", title: "Volleyball vs. Tarleton State", venue: "Pan American Center", p: 10, status: "On sale", href: GA, mono: "TS" },
      { m: 16, d: 10, dow: "Fri", time: "6:00 PM", sport: "Baseball", title: "Baseball vs. Grand Canyon", venue: "Presley Askew Field", p: 9, status: "On sale", href: SEATED, opp: "/teams/grand-canyon.png", mono: "GC" },
    ],
    passes: [
      { n: 6, unit: "home games", kicker: "Football", venues: [STADIUM], title: "Aggie Football season seats, Level A", range: "Sep 5 to Nov 7", note: "Sideline seats with playoff priority.", price: "$200", href: "/season-tickets" },
      { n: 42, unit: "events, five sports", kicker: "All sports", title: "Aggie All-Access Pass", cover: "/nmstate/aggie-country-pass.png", range: "Sep 2026 to May 2027", note: "Every home event across all five sports and four venues.", price: "$450", href: "/season-tickets", hot: true },
      { n: 16, unit: "home games", kicker: "Basketball", venues: ["Pan American Center"], title: "Men's Basketball season seats, Level B", range: "Nov 12 to Mar 3", note: "Lower bowl at the Pan American Center.", price: "$150", href: "/season-tickets" },
    ],
    flex: [
      { count: 3, price: "$66", each: 22, href: "/flex-pack" },
      { count: 5, price: "$99", each: 19.8, href: "/flex-pack" },
      { count: 10, price: "$185", each: 18.5, href: "/flex-pack" },
    ],
  },
};

/* Every team URL showed the NM State storefront before this file existed, so a slug with no entry still does. */
export const DEFAULT_TEAM = "nm-state";
export const getTeam = (slug: string): Team => TEAMS[slug.toLowerCase()] ?? TEAMS[DEFAULT_TEAM];

/* Text colour for the team colour: white on dark colours, near-black on light ones (yellow, white, pale blue),
   chosen by whichever has the higher WCAG contrast. Expects a 6-digit hex. */
export function onColor(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const lin = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return 1.05 / (L + 0.05) >= (L + 0.05) / 0.06 ? "#fff" : "#0a0508";
}

/* Venue pages live at /venue/<slug>; the slug is the venue's name, lower-cased and hyphenated. */
export const venueSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* Finds a venue by its slug across every team. Before venue pages were data-driven each one showed Aggie Memorial Stadium, so an unknown slug still does. */
export function getVenue(slug: string) {
  const want = slug.toLowerCase();
  for (const team of Object.values(TEAMS)) {
    const names = Array.from(new Set(team.events.map((e) => e.venue)));
    const name = names.find((n) => venueSlug(n) === want);
    if (name) return { team, name, info: team.venueInfo?.[name] ?? {}, events: team.events.filter((e) => e.venue === name) };
  }
  const team = TEAMS[DEFAULT_TEAM];
  const name = "Aggie Memorial Stadium";
  return { team, name, info: team.venueInfo?.[name] ?? {}, events: team.events.filter((e) => e.venue === name) };
}
