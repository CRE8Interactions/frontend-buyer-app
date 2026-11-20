import { getEvents, getOffers, getOrganizationsOnSale, getVenues } from "@/lib/api";
import { eventPurchasePath, formatEventWhen, imageUrl } from "@/lib/helpers";
import { TEAMS } from "../[slug]/teams";
import { categoryFor } from "./category";
import type { Ev, Org } from "./data";

/* Browse reads the same three on-sale endpoints the rest of the app uses, then reshapes them into the rows and tiles the page draws.
   The API has no category or price on an event, so the category is read from the names and the price is the lowest open offer. */

type Img = Parameters<typeof imageUrl>[0];
type ApiEvent = {
  id: number; uuid: string; name: string; start: string; soldOut?: boolean; slug?: string | null; seoUrl?: string; shortCode?: string;
  image?: Img; seatmap?: { ga_only?: boolean };
  organization?: { name?: string };
  venue?: { name?: string; timezone?: string; address?: { city?: string; state?: string }[] };
};
type ApiOrg = { name: string; slug: string; image?: Img; branding?: { primaryColor?: string }; upcomingEventsCount?: number };
type ApiVenue = { name: string; slug: string; allEvents?: unknown[]; image?: Img | Img[] };

export type Featured = {
  a: string; b: string; tag: string; head: string; sub: string; title: string; m: number; d: number; time: string; venue: string; price: number; img: string; href: string;
};
export type BrowseData = { events: Ev[]; orgs: Org[]; featured: Featured[] };

const toList = <T,>(res: { data?: unknown }): T[] => {
  const d = res.data as T[] | { data?: T[] } | undefined;
  return Array.isArray(d) ? d : d?.data ?? [];
};

/* the lowest price among offers anyone can buy right now; 0 when none are published */
const lowestPrice = async (uuid: string): Promise<number> => {
  try {
    const res = await getOffers(uuid);
    const offers: { isLocked?: boolean; prices?: number[] }[] = res.data?.offers ?? [];
    const open = offers.filter((o) => !o.isLocked).flatMap((o) => o.prices ?? []).filter((p) => p > 0);
    return open.length ? Math.min(...open) : 0;
  } catch {
    return 0;
  }
};

/* the dominant colour of a picture, from the app's own /api/dominant-color endpoint (the image host sends no CORS headers, so the browser cannot read the pixels itself),
   lightened the same way the team accents are so the glow reads on the dark card. Undefined when it cannot be read (the tile keeps its default tint). */
const accentFrom = async (url: string): Promise<string | undefined> => {
  try {
    const res = await fetch(`/api/dominant-color/?src=${encodeURIComponent(url)}`);
    if (!res.ok) return undefined;
    const { color } = (await res.json()) as { color?: string };
    return color ? `color-mix(in srgb, ${color} 72%, white)` : undefined;
  } catch {
    return undefined;
  }
};

const GRADIENTS: [string, string][] = [["var(--green)", "var(--seat)"], ["var(--h-purple)", "var(--seat)"], ["var(--seat)", "var(--h-purple)"], ["var(--h-warning)", "var(--green)"], ["var(--h-purple)", "var(--h-warning)"]];

/** `onUpdate` is called again with the same data once each venue's picture colour is known: the page draws as soon as the lists arrive and the tints fade in after,
 *  instead of every tile waiting for the slowest colour lookup. */
export async function loadBrowse(onUpdate?: (d: BrowseData) => void): Promise<BrowseData> {
  const [evRes, orgRes, venRes] = await Promise.all([getEvents(), getOrganizationsOnSale(), getVenues()]);
  const raw = toList<ApiEvent>(evRes).sort((x, y) => +new Date(x.start) - +new Date(y.start));
  const prices = await Promise.all(raw.map((e) => lowestPrice(e.uuid)));

  const events: Ev[] = raw.map((e, i) => {
    const tz = e.venue?.timezone;
    const addr = e.venue?.address?.[0];
    const city = [addr?.city, addr?.state].filter(Boolean).map((s, n) => (n === 0 ? String(s).replace(/\b\w/g, (c) => c.toUpperCase()) : String(s).toUpperCase())).join(", ");
    const gaOnly = Boolean(e.seatmap?.ga_only);
    return {
      id: e.uuid,
      m: Number(formatEventWhen(e.start, tz, "M")),
      d: Number(formatEventWhen(e.start, tz, "D")),
      dow: formatEventWhen(e.start, tz, "ddd"),
      time: formatEventWhen(e.start, tz, "h:mm A"),
      title: e.name,
      venue: e.venue?.name ?? "",
      city,
      p: prices[i],
      status: e.soldOut ? "Resale only" : "On sale",
      kind: gaOnly ? "ga" : "seated",
      slug: e.slug || e.seoUrl || "",
      cat: categoryFor(`${e.name} ${e.organization?.name ?? ""} ${e.venue?.name ?? ""}`),
      href: eventPurchasePath({ ...e, slug: e.slug ?? undefined, venue: undefined }),
      img: e.image ? imageUrl(e.image, "") : undefined,
    };
  });

  const teams: Org[] = toList<ApiOrg>(orgRes).map((o) => ({
    name: o.name.trim(),
    count: o.upcomingEventsCount ?? 0,
    kind: "team",
    logo: imageUrl(o.image, "") || undefined,
    accent: o.branding?.primaryColor ? `color-mix(in srgb, ${o.branding.primaryColor} 72%, white)` : undefined,
    href: `/${o.slug}`,
  }));
  /* a venue's picture is its own image from the venues endpoint (the one the venue information uses; the API sends it as a list, so the first is taken),
     then the profile image in teams.ts. A venue with neither keeps its initials; a team's logo is never used for a venue. */
  const profileFor = (name: string) => {
    for (const t of Object.values(TEAMS)) {
      const p = t.venueInfo?.[name]?.profile;
      if (p) return p;
    }
    return undefined;
  };
  const venues: Org[] = toList<ApiVenue>(venRes).map((v) => {
    const name = v.name.trim();
    const logo = imageUrl(Array.isArray(v.image) ? v.image[0] : v.image, "") || profileFor(name);
    return { name, count: v.allEvents?.length ?? 0, kind: "venue", href: `/venue/${v.slug}`, logo } as Org;
  });

  const featured: Featured[] = events.slice(0, 5).map((e, i) => ({
    a: GRADIENTS[i % GRADIENTS.length][0], b: GRADIENTS[i % GRADIENTS.length][1],
    tag: e.cat, head: e.title, sub: raw[i].organization?.name?.trim() ?? e.venue, title: e.title,
    m: e.m, d: e.d, time: e.time, venue: [e.venue, e.city].filter(Boolean).join(", "), price: e.p, img: e.img ?? "", href: e.href ?? "",
  }));

  const data: BrowseData = { events, orgs: [...teams, ...venues], featured };

  /* a venue's tile glow and tint follow the picture's dominant colour (the host sends no CORS headers, so the browser could not read the pixels itself).
     It is looked up after the first draw, and each result updates the page as it arrives. */
  if (onUpdate) {
    const orgs = [...data.orgs];
    orgs.forEach((o, i) => {
      if (o.kind !== "venue" || !o.logo?.startsWith("http")) return;
      void accentFrom(o.logo).then((accent) => {
        if (!accent) return;
        orgs[i] = { ...orgs[i], accent };
        onUpdate({ ...data, orgs: [...orgs] });
      });
    });
  }

  return data;
}
