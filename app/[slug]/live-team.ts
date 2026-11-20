import { categoryFor } from "../browse/category";
import { accentColor } from "@/lib/accent-color";
import { eventPurchasePath, formatEventWhen, imageUrl, type ApiImage } from "@/lib/helpers";
import { TEAMS, type FlexPack, type Team, type TeamEvent, type VenueInfo } from "./teams";

/* A team page is the static design (colour, logo, crest, venue photos) filled from the storefront API: the events, the months, the flex packs.
   Slugs the API knows but the design file does not get a generic design drawn from the organisation's own branding. */

type Attraction = { name?: string; primary?: boolean; order?: number; artwork?: ApiImage };
type ApiEvent = {
  uuid: string; name: string; start: string; soldOut?: boolean; slug?: string | null; seoUrl?: string; shortCode?: string;
  seatmap?: { ga_only?: boolean }; attractions?: Attraction[]; image?: ApiImage;
  venue?: { name?: string; timezone?: string };
};
type ApiAddress = { address_1?: string | null; address_2?: string | null; city?: string | null; state?: string | null; zipcode?: string | null };
type ApiVenue = { name: string; slug: string; banner?: ApiImage; image?: ApiImage | ApiImage[]; capacity?: number; timezone?: string; address?: ApiAddress[] };
type ApiFlex = { uuid: string; name: string; price?: number | null; gameTickets?: number; description?: string | null; start?: string | null; end?: string | null; venue?: { timezone?: string } | null };
export type Storefront = {
  organization: { name: string; image?: ApiImage; branding?: { primaryColor?: string; logo?: ApiImage }; address?: { city?: string; state?: string } | null };
  venues: ApiVenue[]; events: ApiEvent[]; flexPacks: ApiFlex[]; packages: unknown[];
};

/* design files are keyed by their own slug; the API's slug for the same organisation differs */
const DESIGN_FOR: Record<string, string> = { "nm-state-athletics": "nm-state" };

/* Which attraction is the left side of "A vs B" and which is the right. The names in the title decide it, so a game that lists only the opponent as an attraction shows that crest on the opponent's side, not as the home crest; titles that do not read "A vs B" fall back to the API's primary / order flags. */
const norm = (s?: string) => (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export function sides(e: { name: string; attractions?: Attraction[] }) {
  const sorted = [...(e.attractions ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const m = /^(.*?)\s+vs\.?\s+(.*)$/i.exec(e.name);
  if (m) {
    const find = (side: string, not?: Attraction) => sorted.find((a) => { const n = norm(a.name); return a !== not && !!n && (n === side || side.includes(n) || n.includes(side)); });
    const home = find(norm(m[1]));
    const away = find(norm(m[2]), home);
    if (home || away) return { home, away };
  }
  const home = sorted.find((a) => a.primary) ?? sorted[0];
  const away = sorted.find((a) => !a.primary && a.name !== home?.name) ?? sorted.find((a) => a !== home && a.name !== home?.name);
  return { home, away };
}

const base = () => (process.env.NEXT_PUBLIC_API || "").replace(/\/+$/, "");
async function get<T>(path: string): Promise<T | null> {
  if (!base()) return null;
  try {
    const res = await fetch(`${base()}${path}`, { next: { revalidate: 60 }, headers: { Accept: "application/json" } });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

const lowestPrice = async (uuid: string) => {
  const d = await get<{ offers?: { isLocked?: boolean; prices?: number[] }[] }>(`/events/offers?uuid=${uuid}`);
  const open = (d?.offers ?? []).filter((o) => !o.isLocked).flatMap((o) => o.prices ?? []).filter((p) => p > 0);
  return open.length ? Math.min(...open) : 0;
};

/* "FIU" stays FIU; a longer single word gives its first two letters; two or more words give the first letters of the first two */
const initials = (n: string) => {
  const w = n.split(/\s+/).filter((x) => /^[A-Za-z]/.test(x) && !/^(of|the|and|at)$/i.test(x));
  if (w.length === 1) return (w[0].length <= 4 ? w[0] : w[0].slice(0, 2)).toUpperCase();
  return w.slice(0, 2).map((x) => x[0].toUpperCase()).join("");
};
const MONTH = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export async function loadTeam(slug: string): Promise<Team | null> {
  const sf = await get<Storefront>(`/organizations/storefront/${encodeURIComponent(slug)}`);
  const design = TEAMS[DESIGN_FOR[slug.toLowerCase()] ?? slug.toLowerCase()];
  if (!sf?.organization) return design ?? null;

  const org = sf.organization;
  const orgName = org.name.trim();
  const events = [...sf.events].sort((a, b) => +new Date(a.start) - +new Date(b.start));
  const prices = await Promise.all(events.map((e) => lowestPrice(e.uuid)));
  const year0 = events.length ? Number(formatEventWhen(events[0].start, events[0].venue?.timezone, "YYYY")) : new Date().getFullYear();
  const months: Record<number, string> = {};

  /* each opponent logo is read once for its accent colour, which themes that side of the stage */
  const arts = events.map((e) => { const { away } = sides(e); return away?.artwork ? imageUrl(away.artwork, "") : ""; });
  const oppColors = await Promise.all(arts.map((u) => (u ? accentColor(u) : Promise.resolve(undefined))));
  const list: TeamEvent[] = events.map((e, i) => {
    const tz = e.venue?.timezone;
    const mo = Number(formatEventWhen(e.start, tz, "M"));
    const yr = Number(formatEventWhen(e.start, tz, "YYYY"));
    const m = mo + 12 * (yr - year0);
    months[m] = `${MONTH[mo]} ${yr}`;
    const { home, away } = sides(e);
    const oppArt = away?.artwork ? imageUrl(away.artwork, "") : "";
    return {
      m, d: Number(formatEventWhen(e.start, tz, "D")), dow: formatEventWhen(e.start, tz, "ddd"), time: formatEventWhen(e.start, tz, "h:mm A"),
      sport: categoryFor(`${e.name} ${orgName} ${e.venue?.name ?? ""}`),
      title: e.name, venue: e.venue?.name ?? "", p: prices[i],
      status: e.soldOut ? "Few left" : "On sale",
      href: eventPurchasePath({ ...e, slug: e.slug ?? undefined, venue: undefined }),
      opp: oppArt || undefined, homeArt: home?.artwork ? imageUrl(home.artwork, "") || undefined : undefined, oppColor: oppColors[i], mono: initials(away?.name ?? (/\svs\.?\s/i.test(e.name) ? e.name.replace(/^.*?\svs\.?\s+/i, "") : e.name)),
    };
  });

  /* a game whose home side has no artwork of its own borrows the one the org's other games use most, so the home crest stays a square and is never the wide logo */
  const tally = new Map<string, number>();
  list.forEach((e) => { if (e.homeArt) tally.set(e.homeArt, (tally.get(e.homeArt) ?? 0) + 1); });
  const commonHome = [...tally].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (commonHome) list.forEach((e) => { if (!e.homeArt && /\svs\.?\s/i.test(e.title)) e.homeArt = commonHome; });

  const flex: FlexPack[] = (sf.flexPacks ?? []).filter((f) => f.gameTickets && f.price).map((f) => ({
    count: f.gameTickets as number, price: `$${f.price}`, each: Math.round(((f.price as number) / (f.gameTickets as number)) * 100) / 100, href: `/${slug}/flex-pack/${f.uuid}`,
    name: f.name?.trim() || undefined, desc: f.description && f.description !== "None" ? f.description.trim() : undefined, start: f.start ?? undefined, end: f.end ?? undefined,
  }));

  const venueInfo: Record<string, VenueInfo> = { ...(design?.venueInfo ?? {}) };
  for (const v of sf.venues ?? []) {
    const banner = v.banner ? imageUrl(v.banner, "") : "";
    const pic = imageUrl(Array.isArray(v.image) ? v.image[0] : v.image, "");
    const a = v.address?.[0];
    const street = [a?.address_1, a?.address_2].filter(Boolean).join(" ");
    const address = [street, a?.city, [a?.state?.toUpperCase(), a?.zipcode].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    venueInfo[v.name] = { ...(banner && !venueInfo[v.name]?.banner ? { banner } : {}), ...(pic ? { photo: pic } : {}), ...(address ? { address } : {}), ...(v.timezone ? { tz: v.timezone } : {}), ...(venueInfo[v.name] ?? {}) };
  }

  const logo = imageUrl(org.branding?.logo ?? org.image, "/blocktickets-logo.svg");
  const home = sf.venues?.[0];
  const city = [org.address?.city, org.address?.state].filter(Boolean).join(", ");
  return {
    slug,
    name: orgName,
    city: city || design?.city || "",
    color: design?.color ?? org.branding?.primaryColor ?? "#1f419c",
    logo: design?.logo ?? logo,
    logoWide: design?.logoWide,
    crest: design?.crest ?? logo,
    photo: design?.photo ?? (home?.banner ? imageUrl(home.banner, logo) : logo),
    venueHref: home ? `/venue/${home.slug}` : design?.venueHref ?? "",
    venueInfo,
    months,
    featured: [],
    events: list,
    passes: [],
    flex,
  };
}
