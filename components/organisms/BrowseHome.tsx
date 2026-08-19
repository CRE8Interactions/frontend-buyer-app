"use client";

/**
 * BrowseHome — browse / discovery page. Navy header, featured hero carousel,
 * Teams & venues rail, Events grid, footer. Data from Strapi on-sale endpoints
 * (or local demo snapshots when NEXT_PUBLIC_DEMO=true).
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Nav, { type SearchGroup } from "@/components/organisms/Nav";
import SiteFooter from "@/components/organisms/SiteFooter";
import {
  getEvents,
  getOrganizationsOnSale,
  getVenueUpcomingEvents,
  getVenues,
} from "@/lib/api";
import {
  resolveBrandLogo,
  resolvePrimaryColor,
  type OrgBranding,
} from "@/lib/branding";
import {
  cacheEventBranding,
  cacheOrgsBranding,
  cacheVenueBranding,
} from "@/lib/orgBrandingCache";
import {
  eventPurchasePath,
  formatEventWhen,
  imageUrl,
  type ApiImage,
} from "@/lib/helpers";
import { venueUpcomingEventCount } from "@/lib/eventFromPrice";
import {
  categoryLabel,
  eventTypeLabel,
  featuredEventPool,
  pickFeaturedEvents,
} from "@/lib/eventType";

const NAVY = "#051b35";
const GREEN = "#a6e773";
const FEATURED_COUNT = 3;
const GRADIENT = "linear-gradient(135deg, #0a2747 0%, #051b35 60%, #071a30 100%)";

type VenueAddress =
  | { city?: string; state?: string }
  | Array<{ city?: string; state?: string }>;

type BrowseEvent = {
  uuid?: string;
  id?: string | number;
  name?: string;
  title?: string;
  slug?: string;
  seoUrl?: string;
  shortCode?: string;
  shortcode?: string;
  start?: string;
  image?: ApiImage;
  status?: string;
  organization?: {
    name?: string;
    slug?: string;
    category?: { name?: string } | null;
  };
  category?: { name?: string } | null;
  sport?: string;
  minPrice?: number;
  lowestPrice?: number;
  price?: number;
  pricingLevels?: import("@/lib/eventFromPrice").EventPriceSource["pricingLevels"];
  priceLevels?: import("@/lib/eventFromPrice").EventPriceSource["priceLevels"];
  pricingTiers?: import("@/lib/eventFromPrice").EventPriceSource["pricingTiers"];
  offers?: import("@/lib/eventFromPrice").EventPriceSource["offers"];
  attractions?: Array<{ name?: string; primary?: boolean; order?: number }>;
  venue?: {
    name?: string;
    slug?: string;
    timezone?: string;
    isGeneralAdmissionOnly?: boolean;
    address?: VenueAddress;
  };
  seatmap?: { ga_only?: boolean };
  isGeneralAdmissionOnly?: boolean;
  generalAdmissionOnly?: boolean;
};

type BrowseOrg = {
  name?: string;
  slug?: string;
  image?: ApiImage;
  branding?: OrgBranding | null;
  primaryColor?: string;
  accentColor?: string;
  brandColor?: string;
  upcomingEventsCount?: number;
  category?: { name?: string } | null;
  upcomingEvents?: BrowseEvent[];
  venues?: Array<{
    name?: string;
    slug?: string;
    address?: VenueAddress;
  }>;
  homeVenue?: {
    name?: string;
    slug?: string;
    address?: VenueAddress;
  } | null;
};

type BrowseVenue = {
  name?: string;
  slug?: string;
  upcomingEventsCount?: number;
  eventsCount?: number;
  /** Present on GET /venues/find-on-sale — count when numeric fields are absent. */
  allEvents?: unknown[];
  address?: VenueAddress;
};

const RECENT_SEARCHES = ["NM State", "IceDogs", "Raptors"];

const initials2 = (t: string) =>
  t
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

const monogram = (name: string) =>
  name
    .split(" ")
    .filter((w) => w[0] && /[A-Za-z]/.test(w[0]))
    .slice(0, 3)
    .map((w) => w[0].toUpperCase())
    .join("");

function firstAddress(address?: VenueAddress) {
  if (!address) return undefined;
  return Array.isArray(address) ? address[0] : address;
}

function cityState(address?: VenueAddress) {
  const a = firstAddress(address);
  if (!a) return "";
  const city = (a.city || "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
  const state = (a.state || "").toUpperCase();
  return [city, state].filter(Boolean).join(", ");
}

function asArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const o = data as { data?: unknown; results?: unknown };
    if (Array.isArray(o.data)) return o.data as T[];
    if (Array.isArray(o.results)) return o.results as T[];
  }
  return [];
}

function eventTitle(ev: BrowseEvent) {
  return ev.name || ev.title || "Event";
}

function eventWhen(ev: BrowseEvent) {
  return formatEventWhen(ev.start, ev.venue?.timezone, "ddd MMM D · h:mm A");
}

function eventVenueLine(ev: BrowseEvent) {
  const name = ev.venue?.name || "";
  const loc = cityState(ev.venue?.address);
  return [name, loc].filter(Boolean).join(", ");
}

function unwrapEventList(payload: unknown): BrowseEvent[] {
  if (!payload) return [];
  if (Array.isArray(payload)) {
    return payload.map((row) => {
      const r = row as { id?: string | number; attributes?: BrowseEvent } & BrowseEvent;
      return r.attributes ? { id: r.id, ...r.attributes } : r;
    });
  }
  const obj = payload as { data?: unknown; events?: unknown; allEvents?: unknown };
  if (Array.isArray(obj.allEvents)) return unwrapEventList(obj.allEvents);
  if (Array.isArray(obj.data)) return unwrapEventList(obj.data);
  if (obj.data && typeof obj.data === "object") return unwrapEventList(obj.data);
  if (Array.isArray(obj.events)) return unwrapEventList(obj.events);
  return [];
}

function eventStatus(ev: BrowseEvent) {
  const raw = (ev.status || "").trim();
  if (!raw || raw === "on_sale") return "On sale";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const tagFor = (st: string) =>
  st === "Few left"
    ? { tagBg: "#fbf1de", tagInk: "#b5791e" }
    : st === "Resale only"
      ? { tagBg: "rgba(255,255,255,0.92)", tagInk: "#6e7180" }
      : st === "Presale"
        ? { tagBg: "rgba(255,255,255,0.92)", tagInk: "#4a5567" }
        : { tagBg: "#e6f4eb", tagInk: "#2f8f4e" };

function venuesFromOrgs(orgs: BrowseOrg[]): BrowseVenue[] {
  const map = new Map<string, BrowseVenue>();
  for (const org of orgs) {
    const list = [
      ...(org.homeVenue ? [org.homeVenue] : []),
      ...(org.venues || []),
    ];
    for (const v of list) {
      if (!v?.name) continue;
      const key = (v.slug || v.name).toLowerCase();
      if (map.has(key)) continue;
      map.set(key, {
        name: v.name,
        slug: v.slug,
        address: v.address,
        upcomingEventsCount: org.upcomingEventsCount,
      });
    }
  }
  return [...map.values()];
}

type BrowseSnapshot = {
  events: BrowseEvent[];
  featured: BrowseEvent[];
  orgs: BrowseOrg[];
  venues: BrowseVenue[];
  expires: number;
};

/** Survives Soft Nav remounts (back button) so browse does not flash + refetch. */
const BROWSE_CACHE_MS = 5 * 60_000;
let browseSnapshot: BrowseSnapshot | null = null;
let browseInflight: Promise<BrowseSnapshot> | null = null;

/** Clears the module snapshot so unit tests start from a cold fetch. */
export function __resetBrowseCacheForTests() {
  browseSnapshot = null;
  browseInflight = null;
}

function seedBranding(nextEvents: BrowseEvent[], nextOrgs: BrowseOrg[]) {
  cacheOrgsBranding(nextOrgs);
  nextOrgs.forEach((org) => {
    cacheVenueBranding(
      [...(org.homeVenue ? [org.homeVenue] : []), ...(org.venues || [])],
      org,
    );
  });
  nextEvents.forEach((event) => {
    const owner = nextOrgs.find(
      (org) =>
        (event.organization?.slug && org.slug === event.organization.slug) ||
        (event.organization?.name && org.name === event.organization.name),
    );
    if (!owner) return;
    cacheEventBranding(
      {
        seoUrl: event.seoUrl,
        slug: event.slug,
        shortCode: event.shortCode || event.shortcode,
      },
      owner,
      { touchLast: false },
    );
    // An event here means this team plays this venue, whatever the org payload
    // lists as its venues.
    cacheVenueBranding([event.venue], owner);
  });
}

async function withVenueScheduleCounts(
  venues: BrowseVenue[],
): Promise<BrowseVenue[]> {
  return Promise.all(
    venues.map(async (venue) => {
      if (venueUpcomingEventCount(venue) > 0) return venue;
      if (!venue.slug) return venue;
      try {
        const res = await getVenueUpcomingEvents(venue.slug);
        const count = unwrapEventList(res.data).length;
        return count > 0 ? { ...venue, upcomingEventsCount: count } : venue;
      } catch {
        return venue;
      }
    }),
  );
}

function isBrowseSnapshotFresh() {
  return Boolean(browseSnapshot && browseSnapshot.expires > Date.now());
}

function loadBrowseSnapshot(force = false): Promise<BrowseSnapshot> {
  if (!force && browseSnapshot && isBrowseSnapshotFresh()) {
    return Promise.resolve(browseSnapshot);
  }
  if (!force && browseInflight) return browseInflight;

  browseInflight = Promise.all([
    getEvents(),
    getOrganizationsOnSale(),
    getVenues(),
  ])
    .then(async ([evRes, orgRes, venueRes]) => {
      const nextOrgs = asArray<BrowseOrg>(orgRes.data);
      const listedVenues = asArray<BrowseVenue>(venueRes.data);
      const listedEvents = asArray<BrowseEvent>(evRes.data);
      const venueEvents = listedVenues.flatMap((venue) =>
        unwrapEventList(venue.allEvents),
      );
      const featured = pickFeaturedEvents(
        featuredEventPool(listedEvents, nextOrgs, venueEvents),
        nextOrgs,
        FEATURED_COUNT,
      );
      const nextEvents = listedEvents;
      const nextVenues = await withVenueScheduleCounts(
        listedVenues.length ? listedVenues : venuesFromOrgs(nextOrgs),
      );
      const snapshot: BrowseSnapshot = {
        events: nextEvents,
        featured,
        orgs: nextOrgs,
        venues: nextVenues,
        expires: Date.now() + BROWSE_CACHE_MS,
      };
      browseSnapshot = snapshot;
      seedBranding(nextEvents, nextOrgs);
      return snapshot;
    })
    .finally(() => {
      browseInflight = null;
    });

  return browseInflight;
}

export default function BrowseHome() {
  // Seed from the module snapshot so a remount (back button) paints instantly.
  const [query, setQuery] = useState("");
  const [feat, setFeat] = useState(0);
  const [vw, setVw] = useState(1440);
  const [events, setEvents] = useState<BrowseEvent[]>(
    () => browseSnapshot?.events ?? [],
  );
  const [featured, setFeatured] = useState<BrowseEvent[]>(
    () => browseSnapshot?.featured ?? [],
  );
  const [orgs, setOrgs] = useState<BrowseOrg[]>(
    () => browseSnapshot?.orgs ?? [],
  );
  const [venues, setVenues] = useState<BrowseVenue[]>(
    () => browseSnapshot?.venues ?? [],
  );
  const [loading, setLoading] = useState(() => !browseSnapshot);
  const [error, setError] = useState("");

  useEffect(() => {
    const onR = () => setVw(window.innerWidth);
    onR();
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  useEffect(() => {
    let cancelled = false;
    // State already holds a fresh snapshot, so there is nothing to fetch.
    if (isBrowseSnapshotFresh()) return;

    loadBrowseSnapshot()
      .then((snapshot) => {
        if (cancelled) return;
        setEvents(snapshot.events);
        setFeatured(snapshot.featured);
        setOrgs(snapshot.orgs);
        setVenues(snapshot.venues);
        setError("");
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load browse data.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const mobile = vw < 900;
  const narrow = !mobile && vw < 1160;

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) => {
      const hay = [
        eventTitle(e),
        e.venue?.name,
        cityState(e.venue?.address),
        e.organization?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [events, query]);

  const featIndex = featured.length ? feat % featured.length : 0;

  const searchGroups = useMemo<SearchGroup[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [
        {
          title: "Recent searches",
          items: RECENT_SEARCHES.map((r) => ({
            title: r,
            sub: "Search again",
            meta: "",
            initials: initials2(r),
            iconBg: "#f1f3f8",
            iconInk: "#6e7180",
            href: "/browse",
          })),
        },
      ];
    }
    const match = (s: string) => s.toLowerCase().includes(q);
    const evHits = events
      .filter((e) =>
        match(
          `${eventTitle(e)} ${e.venue?.name || ""} ${cityState(e.venue?.address)}`,
        ),
      )
      .slice(0, 4)
      .map((e) => ({
        title: eventTitle(e),
        sub: [eventWhen(e), e.venue?.name].filter(Boolean).join(" · "),
        meta: "Event",
        initials: initials2(eventTitle(e)),
        iconBg: "#eef1f6",
        iconInk: NAVY,
        href: eventPurchasePath(e),
      }));
    const tmHits = orgs
      .filter((t) => match(`${t.name || ""}`))
      .slice(0, 3)
      .map((t) => ({
        title: t.name || "Team",
        sub: `${t.upcomingEventsCount ?? 0} upcoming events`,
        meta: "Team",
        initials: initials2(t.name || "T"),
        iconBg: GREEN,
        iconInk: NAVY,
        href: t.slug ? `/${t.slug}` : "/browse",
      }));
    const vnHits = venues
      .filter((v) => match(`${v.name || ""} ${cityState(v.address)}`))
      .slice(0, 3)
      .map((v) => ({
        title: v.name || "Venue",
        sub: cityState(v.address) || "Venue",
        meta: "Venue",
        initials: initials2(v.name || "V"),
        iconBg: NAVY,
        iconInk: GREEN,
        href: v.slug ? `/venue/${v.slug}` : "/browse",
      }));
    const groups: SearchGroup[] = [];
    if (evHits.length) groups.push({ title: "Events", items: evHits });
    if (tmHits.length) groups.push({ title: "Teams", items: tmHits });
    if (vnHits.length) groups.push({ title: "Venues", items: vnHits });
    return groups;
  }, [query, events, orgs, venues]);

  const hero = featured[featIndex];
  const cardCols = mobile
    ? "1fr"
    : narrow
      ? "repeat(3, minmax(0, 1fr))"
      : "repeat(4, minmax(0, 1fr))";
  const h2 = mobile ? 22 : 28;
  const avSize = mobile ? 92 : 116;

  const railItems = useMemo(() => {
    const teamItems = orgs.map((o) => {
      const logo = resolveBrandLogo(null, o);
      return {
        key: `org-${o.slug || o.name}`,
        name: o.name || "Team",
        count: o.upcomingEventsCount ?? 0,
        isTeam: true as const,
        href: o.slug ? `/${o.slug}/` : "/browse/",
        image: logo ? imageUrl(logo, "") : imageUrl(o.image, ""),
        accent: resolvePrimaryColor(null, o),
      };
    });
    const venueItems = venues.map((v) => ({
      key: `venue-${v.slug || v.name}`,
      name: v.name || "Venue",
      count: venueUpcomingEventCount(v),
      isTeam: false as const,
      href: v.slug ? `/venue/${v.slug}/` : "/browse/",
      image: "",
    }));
    // Prefer teams first, then venues, capped for the horizontal rail.
    return [...teamItems, ...venueItems].slice(0, 12);
  }, [orgs, venues]);

  return (
    <div
      style={{
        background: "#f7f8fc",
        color: NAVY,
        minHeight: "100vh",
        overflowX: "hidden",
        fontFamily: "'Geist', system-ui, -apple-system, sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <style>{`.bh-ev,.bh-av{transition:box-shadow 160ms ease,transform 160ms ease}.bh-ev:hover{box-shadow:0 8px 30px rgba(5,27,53,0.10);transform:translateY(-2px);border-color:rgba(5,27,53,0.22)}.bh-av:hover{box-shadow:0 12px 28px -8px rgba(5,27,53,0.30);transform:scale(1.04)}`}</style>

      <Nav
        search={{
          value: query,
          onChange: setQuery,
          groups: searchGroups,
          seeAllHref: "/browse",
        }}
      />

      {/* hero */}
      <section
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: mobile ? "16px 20px 0" : "28px 32px 0",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: mobile ? 400 : narrow ? 380 : 440,
            borderRadius: mobile ? 20 : 28,
            overflow: "hidden",
            background: NAVY,
          }}
        >
          {loading || !hero ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: GRADIENT,
                display: "flex",
                alignItems: "flex-end",
                padding: mobile ? 24 : 44,
                color: "#cdd9ea",
                fontSize: 15,
              }}
            >
              {error || (loading ? "Loading featured events…" : "No featured events yet.")}
            </div>
          ) : (
            <>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: imageUrl(hero.image, "") ? undefined : GRADIENT,
                }}
              >
                {imageUrl(hero.image, "") && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl(hero.image)}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(90deg, rgba(3,16,31,0.94) 0%, rgba(3,16,31,0.72) 46%, rgba(3,16,31,0.15) 100%)",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  gap: mobile ? 14 : 18,
                  padding: mobile ? 24 : 44,
                  color: "#f4f7fc",
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    alignSelf: "flex-start",
                    background: "rgba(166,231,115,0.14)",
                    border: "1px solid rgba(166,231,115,0.4)",
                    color: GREEN,
                    borderRadius: 999,
                    padding: "6px 13px",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      background: GREEN,
                    }}
                  />
                  Featured · {categoryLabel(eventTypeLabel(hero, orgs))}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    maxWidth: 640,
                  }}
                >
                  <div
                    style={{
                      fontSize: mobile ? 32 : narrow ? 40 : 50,
                      fontWeight: 600,
                      letterSpacing: "-0.03em",
                      lineHeight: 1.03,
                    }}
                  >
                    {eventTitle(hero)}
                  </div>
                  <div style={{ fontSize: mobile ? 14 : 16, color: "#cdd9ea" }}>
                    {[eventWhen(hero), eventVenueLine(hero)]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    flexWrap: "wrap",
                    pointerEvents: "auto",
                  }}
                >
                  <Link
                    href={eventPurchasePath(hero)}
                    style={{
                      fontFamily: "inherit",
                      fontSize: 15,
                      fontWeight: 600,
                      color: NAVY,
                      background: GREEN,
                      border: "none",
                      borderRadius: 999,
                      padding: "14px 26px",
                      cursor: "pointer",
                      textDecoration: "none",
                    }}
                  >
                    Get tickets
                  </Link>
                </div>
              </div>
              {featured.length > 1 && (
                <div
                  style={{
                    position: "absolute",
                    bottom: mobile ? 24 : 44,
                    right: mobile ? 24 : 44,
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                  }}
                >
                  {featured.map((ev, i) => (
                    <button
                      key={ev.uuid || ev.id || i}
                      onClick={() => setFeat(i)}
                      aria-label={`Featured event ${i + 1}`}
                      style={{
                        fontFamily: "inherit",
                        width: i === featIndex ? 22 : 7,
                        height: 7,
                        borderRadius: 999,
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        background:
                          i === featIndex ? GREEN : "rgba(255,255,255,0.45)",
                        transition: "width 160ms ease",
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* teams & venues */}
      <section
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: mobile ? "24px 20px 0" : "40px 32px 0",
        }}
      >
        <h2
          style={{
            margin: "0 0 18px",
            fontSize: h2,
            fontWeight: 600,
            letterSpacing: "-0.025em",
          }}
        >
          Teams &amp; venues
        </h2>
        <div
          style={{
            display: "flex",
            gap: mobile ? 14 : 20,
            overflowX: "auto",
            padding: "8px 0 12px",
          }}
        >
          {railItems.length === 0 && !loading && (
            <div style={{ fontSize: 14, color: "#6e7180", padding: "12px 0" }}>
              No teams or venues on sale yet.
            </div>
          )}
          {railItems.map((v) => (
            <Link
              key={v.key}
              href={v.href}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                width: mobile ? 104 : 132,
                flex: "0 0 auto",
                cursor: "pointer",
                color: NAVY,
                textDecoration: "none",
              }}
            >
              {v.isTeam && v.image ? (
                <div
                  className="bh-av"
                  style={{
                    width: avSize,
                    height: avSize,
                    borderRadius: 999,
                    overflow: "hidden",
                    background: "#fff",
                    boxShadow: "0 1px 2px rgba(5,27,53,0.08)",
                    border: "1px solid rgba(5,27,53,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 14,
                    boxSizing: "border-box",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.image}
                    alt={v.name}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                    }}
                  />
                </div>
              ) : (
                <div
                  className="bh-av"
                  style={{
                    width: avSize,
                    height: avSize,
                    borderRadius: 999,
                    overflow: "hidden",
                    background:
                      v.isTeam && "accent" in v && v.accent
                        ? v.accent
                        : GRADIENT,
                    boxShadow: "0 1px 2px rgba(5,27,53,0.08)",
                    border: "1px solid rgba(5,27,53,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255,255,255,0.92)",
                    fontSize: avSize * 0.24,
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                  }}
                >
                  {monogram(v.name)}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  textAlign: "center",
                }}
              >
                <div
                  style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}
                >
                  {v.name}
                </div>
                <div style={{ fontSize: 12, color: "#6e7180" }}>
                  {v.count} {v.count === 1 ? "event" : "events"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* events */}
      <section
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: mobile ? "32px 20px 0" : "48px 32px 0",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 18,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: h2,
              fontWeight: 600,
              letterSpacing: "-0.025em",
            }}
          >
            Events
          </h2>
          <span style={{ fontSize: 13, color: "#6e7180" }}>
            {loading
              ? "Loading…"
              : `${filteredEvents.length} ${filteredEvents.length === 1 ? "event" : "events"}`}
          </span>
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: cardCols, gap: 16 }}
        >
          {filteredEvents.map((e, i) => {
            const status = eventStatus(e);
            const soon = status.toLowerCase() === "presale";
            const tag = tagFor(status);
            const img = imageUrl(e.image, "");
            const when = eventWhen(e);
            const loc = cityState(e.venue?.address);
            return (
              <Link
                key={e.uuid || e.id || `${eventTitle(e)}-${i}`}
                href={eventPurchasePath(e)}
                className="bh-ev"
                style={{
                  background: "#fff",
                  border: "1px solid rgba(5,27,53,0.10)",
                  borderRadius: 20,
                  overflow: "hidden",
                  boxShadow: "0 1px 2px rgba(5,27,53,0.05)",
                  display: "flex",
                  flexDirection: "column",
                  cursor: "pointer",
                  color: NAVY,
                  textDecoration: "none",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "4 / 3",
                    background: img ? "#f1f3f8" : GRADIENT,
                  }}
                >
                  {img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  )}
                  <div
                    style={{
                      position: "absolute",
                      top: 12,
                      left: 12,
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: tag.tagInk,
                      background: tag.tagBg,
                      borderRadius: 999,
                      padding: "5px 10px",
                    }}
                  >
                    {status}
                  </div>
                </div>
                <div
                  style={{
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 5,
                      minWidth: 0,
                    }}
                  >
                    {when && (
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          color: "#7fbe4d",
                        }}
                      >
                        {when}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: 17,
                        fontWeight: 600,
                        letterSpacing: "-0.015em",
                        lineHeight: 1.25,
                      }}
                    >
                      {eventTitle(e)}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#6e7180",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {[e.venue?.name, loc].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: "auto",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: 12,
                      paddingTop: 12,
                      borderTop: "1px solid rgba(5,27,53,0.08)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: NAVY,
                        background: soon ? "#fff" : "#ecf8dd",
                        border: `1px solid ${soon ? "rgba(5,27,53,0.14)" : "#ecf8dd"}`,
                        borderRadius: 999,
                        padding: "10px 18px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {soon ? "Remind me" : "Get tickets"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {!loading && filteredEvents.length === 0 && (
          <div
            style={{
              background: "#fff",
              border: "1px dashed rgba(5,27,53,0.18)",
              borderRadius: 20,
              padding: "44px 24px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: 17,
                fontWeight: 600,
                letterSpacing: "-0.015em",
              }}
            >
              {query
                ? `No events match “${query}”`
                : error || "No events on sale right now"}
            </div>
            <div style={{ fontSize: 14, color: "#6e7180" }}>
              {query
                ? "Try a team, venue or city name."
                : "Check back soon or browse a team storefront."}
            </div>
          </div>
        )}
      </section>

      <div style={{ marginTop: 32 }}>
        <SiteFooter />
      </div>
    </div>
  );
}
