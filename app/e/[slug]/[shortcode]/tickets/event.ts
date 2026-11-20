import { categoryFor } from "@/app/browse/category";
import { accentColor } from "@/lib/accent-color";
import { formatEventWhen, imageUrl, type ApiImage } from "@/lib/helpers";
import { sides } from "@/app/[slug]/live-team";
import type { Team } from "@/app/[slug]/teams";

/* The ticket page is filled on the server, so the page is in the first HTML and there is nothing to wait behind: no loader, no spinner.
   Everything on the front door comes from the event itself (its sides, time, doors, venue, price levels and limits); the seat map is
   fetched later, in the background, only when the buyer is close to asking for it. */

type Attraction = { name?: string; primary?: boolean; order?: number; artwork?: ApiImage };
type ApiAddress = { address_1?: string | null; city?: string | null; state?: string | null; zipcode?: string | null };
type ApiEvent = {
  uuid: string; name: string; start: string; doorsOpen?: string; end?: string; soldOut?: boolean; summary?: string | null;
  slug?: string; shortCode?: string; image?: ApiImage; attractions?: Attraction[];
  includeFees?: boolean; globalTicketLimit?: number; ticketLimit?: boolean; allAges?: boolean; is18andUp?: boolean; is21andUp?: boolean; ageMinimum?: number | null;
  organization?: { name?: string; image?: ApiImage; branding?: { primaryColor?: string; logo?: ApiImage } };
  venue?: { name?: string; slug?: string; timezone?: string; image?: ApiImage | ApiImage[]; capacity?: number; address?: ApiAddress[] };
};

export type EventInfo = {
  slug: string; code: string; uuid: string; name: string; sport: string; verb: string;
  home: { name: string; art?: string }; away: { name: string; art?: string; mono: string; color?: string };
  startISO: string; doorsISO?: string; endISO?: string;
  day: string; date: string; time: string; doors?: string; tz: string;
  venue: { name: string; slug: string; address: string; line: string; maps: string; photo?: string; capacity?: number };
  org: { name: string; logo: string; color: string };
  /** every price an open (not code-locked) offer sells at, lowest first; empty when the API did not say */
  prices: number[]; lockedOffers: number;
  fees: boolean; limit: number; age: string; soldOut: boolean; summary?: string;
};

const base = () => (process.env.NEXT_PUBLIC_API || "").replace(/\/+$/, "");
async function get<T>(path: string): Promise<T | null> {
  if (!base()) return null;
  try {
    const res = await fetch(`${base()}${path}`, { next: { revalidate: 30 }, headers: { Accept: "application/json" } });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

const initials = (n: string) => {
  const w = n.split(/\s+/).filter((x) => /^[A-Za-z]/.test(x) && !/^(of|the|and|at)$/i.test(x));
  if (!w.length) return "";
  if (w.length === 1) return (w[0].length <= 4 ? w[0] : w[0].slice(0, 2)).toUpperCase();
  return w.slice(0, 2).map((x) => x[0].toUpperCase()).join("");
};
const titleCase = (s?: string | null) => (s || "").split(" ").filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(" ");

/* The API has a venue picture field, but most venues have none yet. Until they do, a venue we hold a real photograph of is listed here by its slug
   (this one is the Meridian Centre, from the IceDogs case study). The event's own image is never used in its place: it is a logo, not a photograph. */
const VENUE_PHOTOS: Record<string, string> = { "niagara-icedogs-hockey-club": "/cases/icedogs.jpg" };

/* what the start of each kind of event is called */
const VERB: Record<string, string> = { Hockey: "Puck drop", Basketball: "Tip-off", Football: "Kickoff", Soccer: "Kickoff", Baseball: "First pitch", MMA: "First bout", Volleyball: "First serve", Comedy: "Showtime", Music: "Showtime" };

export async function loadEvent(slug: string, code: string, access: string): Promise<EventInfo | null> {
  const res = await get<{ event?: ApiEvent; status?: number }>(`/events/${encodeURIComponent(slug)}/${encodeURIComponent(code)}?code=${encodeURIComponent(access || "0")}`);
  const ev = res?.event;
  if (!ev || res?.status === 404) return null;

  const tz = ev.venue?.timezone;
  const { home, away } = sides(ev);
  const m = /^(.*?)\s+vs\.?\s+(.*)$/i.exec(ev.name);
  const awayName = away?.name ?? (m ? m[2].trim() : "");
  const homeName = home?.name ?? (m ? m[1].trim() : ev.organization?.name?.trim() ?? ev.name);
  const orgName = (ev.organization?.name ?? "").trim() || "Blocktickets";
  const awayArt = away?.artwork ? imageUrl(away.artwork, "") : "";
  const orgColor = ev.organization?.branding?.primaryColor ?? "#1f419c";

  const [offers, awayColor] = await Promise.all([
    get<{ offers?: { isLocked?: boolean; prices?: number[] }[] }>(`/events/offers?uuid=${ev.uuid}`),
    awayArt ? accentColor(awayArt) : Promise.resolve(undefined),
  ]);
  const open = (offers?.offers ?? []).filter((o) => !o.isLocked).flatMap((o) => o.prices ?? []).filter((p) => p > 0);
  const prices = [...new Set(open)].sort((a, b) => a - b);

  const a = ev.venue?.address?.[0];
  const city = titleCase(a?.city);
  const state = (a?.state || "").toUpperCase();
  const street = a?.address_1 ?? "";
  const venueName = ev.venue?.name ?? "the venue";
  const photoImg = Array.isArray(ev.venue?.image) ? ev.venue?.image[0] : ev.venue?.image;
  /* a picture we hold wins; the API's own venue image is used only when it is wide like a photograph (here it is the team logo, a square) */
  const wide = (i: unknown) => { const o = i as { width?: number; height?: number } | null | undefined; return !!o && typeof i === "object" && !!o.width && !!o.height && o.width / o.height >= 1.3; };
  const photo = (ev.venue?.slug ? VENUE_PHOTOS[ev.venue.slug] : "") || (wide(photoImg) ? imageUrl(photoImg, "") : "") || "";

  const age = ev.is21andUp ? "21 and over" : ev.is18andUp ? "18 and over" : ev.ageMinimum ? `Ages ${ev.ageMinimum} and up` : ev.allAges ? "All ages" : "";
  const sport = categoryFor(`${ev.name} ${orgName} ${venueName}`);

  return {
    slug, code, uuid: ev.uuid, name: ev.name, sport, verb: VERB[sport] ?? "Starts",
    home: { name: homeName, art: home?.artwork ? imageUrl(home.artwork, "") || undefined : undefined },
    away: { name: awayName, art: awayArt || undefined, mono: initials(awayName), color: awayColor },
    startISO: ev.start, doorsISO: ev.doorsOpen, endISO: ev.end,
    day: formatEventWhen(ev.start, tz, "dddd"), date: formatEventWhen(ev.start, tz, "MMM D"), time: formatEventWhen(ev.start, tz, "h:mm A"),
    doors: ev.doorsOpen ? formatEventWhen(ev.doorsOpen, tz, "h:mm A") : undefined, tz: tz ?? "",
    venue: { name: venueName, slug: ev.venue?.slug || venueName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), address: [street, city, [state, a?.zipcode].filter(Boolean).join(" ")].filter(Boolean).join(", "), line: [venueName, [city, state].filter(Boolean).join(", ")].filter(Boolean).join(", "), maps: `${venueName} ${street} ${city} ${state}`.trim(), photo: photo || undefined, capacity: ev.venue?.capacity },
    org: { name: orgName, logo: imageUrl(ev.organization?.branding?.logo ?? ev.organization?.image, "/blocktickets-logo.svg"), color: orgColor },
    prices, lockedOffers: (offers?.offers ?? []).filter((o) => o.isLocked).length,
    fees: ev.includeFees !== false, limit: ev.ticketLimit && ev.globalTicketLimit ? ev.globalTicketLimit : 8, age, soldOut: !!ev.soldOut, summary: ev.summary?.trim() || undefined,
  };
}

/** a Team the storefront shell and the seat scene can read, made from the event's own organisation */
export function teamOf(e: EventInfo): Team {
  return {
    slug: e.slug, name: e.org.name, city: "", color: e.org.color, logo: e.org.logo, crest: e.home.art ?? e.org.logo, photo: e.venue.photo ?? e.home.art ?? e.org.logo,
    venueHref: "", months: {}, featured: [], events: [], passes: [], flex: [],
  };
}
