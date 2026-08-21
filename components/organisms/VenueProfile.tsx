"use client";

/**
 * VenueProfile — venue page UI. Loads identity + upcoming events for the
 * route slug from Strapi (find-on-sale + venue filter), so each /venue/:slug
 * shows that venue — not hardcoded NM State fixtures.
 */

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import InAppBackLink from "@/components/molecules/InAppBackLink";
import RouteLoader from "@/components/molecules/RouteLoader";
import {
  resolveBrandLogo,
  resolveButtonColor,
  resolveButtonTextColor,
  resolvePrimaryColor,
  type BrandingOrganization,
} from "@/lib/branding";
import {
  cacheOrgBranding,
  cacheVenueBranding,
  getCachedBrandingForPath,
} from "@/lib/orgBrandingCache";
import {
  getOrganizationStorefront,
  getVenue,
  getVenueUpcomingEvents,
  getVenues,
} from "@/lib/api";
import {
  dateChip,
  eventPurchasePath,
  formatCurrency,
  formatEventWhen,
  imageUrl,
  sortByDate,
  type ApiImage,
} from "@/lib/helpers";
import { copyPageUrl } from "@/lib/copy";
import {
  monthEventCountLabel,
  type EventPriceSource,
} from "@/lib/eventFromPrice";
import { googleMapsDirectionsUrl } from "@/lib/venueLocation";
import {
  venueWebsiteFromUpcomingEvents,
  venueWebsiteHref,
} from "@/lib/venueWebsite";
import { categoryLabel, eventTypeLabel } from "@/lib/eventType";

const NAVY = "#051b35";
const GREEN = "#a6e773";
const LOCKUP = "/nmstate/blocktickets-lockup-white.svg";

type VenueAddress =
  | { city?: string; state?: string; address_1?: string }
  | Array<{ city?: string; state?: string; address_1?: string }>;

type VenueEvent = {
  id?: string | number;
  uuid?: string;
  name?: string;
  title?: string;
  start?: string;
  status?: string;
  sport?: string;
  category?: { name?: string } | null;
  slug?: string | null;
  seoUrl?: string;
  shortCode?: string;
  shortcode?: string;
  minPrice?: number;
  lowestPrice?: number;
  price?: number;
  pricingLevels?: EventPriceSource["pricingLevels"];
  priceLevels?: EventPriceSource["priceLevels"];
  pricingTiers?: EventPriceSource["pricingTiers"];
  offers?: EventPriceSource["offers"];
  ticketGroups?: EventPriceSource["ticketGroups"];
  ticket_groups?: EventPriceSource["ticket_groups"];
  tickets?: EventPriceSource["tickets"];
  organization?: {
    name?: string;
    slug?: string | null;
    website?: string;
    url?: string;
    category?: { name?: string } | null;
  };
  venue?: {
    name?: string;
    timezone?: string;
    isGeneralAdmissionOnly?: boolean;
  };
  seatmap?: { ga_only?: boolean };
  isGeneralAdmissionOnly?: boolean;
  generalAdmissionOnly?: boolean;
};

type VenueRecord = {
  id?: string | number;
  uuid?: string;
  name?: string;
  slug?: string;
  website?: string;
  url?: string;
  description?: string;
  capacity?: number | string | null;
  timezone?: string;
  image?: ApiImage | ApiImage[];
  address?: VenueAddress;
  allEvents?: VenueEvent[];
};

type RowEvent = {
  key: string;
  mon: string;
  day: string;
  dow: string;
  monthKey: string;
  monthTitle: string;
  time: string;
  sport: string;
  title: string;
  host: string;
  status: string;
  href: string;
  sort: number;
};

const tagFor = (st: string) =>
  st === "Few left"
    ? { tagBg: "#fbf1de", tagInk: "#b5791e" }
    : st === "Presale"
      ? { tagBg: "#f1f3f8", tagInk: "#4a5567" }
      : { tagBg: "#e6f4eb", tagInk: "#2f8f4e" };

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

/** Null unless the organization defines a color of its own. */
function organizationAccent(organization: BrandingOrganization | null) {
  if (!organization) return null;
  const hasColor = Boolean(
    organization.branding?.primaryColor ||
      organization.branding?.buttonColor ||
      organization.primaryColor ||
      organization.accentColor ||
      organization.brandColor,
  );
  return hasColor ? resolvePrimaryColor(null, organization) : null;
}

function venuePhoto(img?: ApiImage | ApiImage[], fallback = "/cases/nmstate.jpg") {
  if (Array.isArray(img)) return imageUrl(img[0], fallback);
  return imageUrl(img, fallback);
}

function unwrapVenueEntry(raw: unknown): VenueRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as {
    id?: string | number;
    attributes?: VenueRecord;
  } & VenueRecord;
  if (row.attributes) {
    return { id: row.id, ...row.attributes };
  }
  return row;
}

function eventStatus(ev: VenueEvent) {
  const raw = (ev.status || "").trim();
  if (!raw || raw === "on_sale" || raw === "published") return "On sale";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function unwrapEventList(payload: unknown): VenueEvent[] {
  if (!payload) return [];
  if (Array.isArray(payload)) {
    return payload.map((row) => {
      const r = row as { id?: string | number; attributes?: VenueEvent } & VenueEvent;
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

function toRow(
  ev: VenueEvent,
  timezone?: string,
  fallbackHost?: string,
  org?: BrandingOrganization | null,
): RowEvent | null {
  const start = ev.start;
  if (!start) return null;
  const tz = ev.venue?.timezone || timezone;
  const chip = dateChip(start, tz);
  const monthTitleTz =
    formatEventWhen(start, tz, "MMMM YYYY") ||
    chip.m;
  const monthKey = formatEventWhen(start, tz, "YYYY-MM") || start.slice(0, 7);
  const short =
    ev.shortCode || ev.shortcode || ev.seoUrl
      ? ev
      : { ...ev, slug: ev.seoUrl || ev.slug || undefined };
  const href =
    ev.shortCode || ev.shortcode || ev.seoUrl || ev.slug
      ? eventPurchasePath({
          ...short,
          slug: ev.seoUrl || ev.slug || undefined,
          shortCode: ev.shortCode || ev.shortcode,
        })
      : "#";

  return {
    key: String(ev.uuid || ev.id || ev.shortCode || ev.name || start),
    mon: chip.m,
    day: chip.d,
    dow: formatEventWhen(start, tz, "ddd") || "",
    monthKey,
    monthTitle: monthTitleTz,
    time: formatEventWhen(start, tz, "h:mm A") || "",
    sport: categoryLabel(eventTypeLabel(ev, org ? [org] : [])),
    title: ev.name || ev.title || "Event",
    host: ev.organization?.name?.trim() || fallbackHost || "",
    status: eventStatus(ev),
    href,
    sort: new Date(start).getTime() || 0,
  };
}

export default function VenueProfile({ slug }: { slug: string }) {
  const [vw, setVw] = useState(1440);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [venue, setVenue] = useState<VenueRecord | null>(null);
  const [events, setEvents] = useState<VenueEvent[]>([]);
  const [organization, setOrganization] = useState<BrandingOrganization | null>(
    null,
  );
  /** Cached team color for this venue — paints before the org fetch lands. */
  const [accentHint, setAccentHint] = useState<string | null>(null);

  useEffect(() => {
    const onR = () => setVw(window.innerWidth);
    onR();
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setMissing(false);
      setVenue(null);
      setEvents([]);
      setOrganization(null);
      setAccentHint(
        getCachedBrandingForPath(`/venue/${slug}/`)?.primaryColor || null,
      );

      try {
        const [detailRes, onSaleRes] = await Promise.all([
          getVenue(slug).catch(() => null),
          getVenues().catch(() => null),
        ]);

        if (cancelled) return;

        const detailBody = detailRes?.data as
          | { data?: unknown[] }
          | unknown[]
          | undefined;
        let detailRow: unknown = null;
        if (Array.isArray(detailBody)) {
          detailRow = detailBody[0];
        } else if (detailBody && typeof detailBody === "object") {
          detailRow = detailBody.data?.[0] ?? null;
        }
        const fromFilter = unwrapVenueEntry(detailRow);

        const onSaleList = Array.isArray(onSaleRes?.data)
          ? (onSaleRes.data as VenueRecord[])
          : [];
        const fromOnSale =
          onSaleList.find((v) => v.slug === slug) ||
          onSaleList.find(
            (v) => (v.slug || "").toLowerCase() === slug.toLowerCase(),
          ) ||
          null;

        const merged: VenueRecord | null =
          fromOnSale || fromFilter
            ? {
                ...(fromFilter || {}),
                ...(fromOnSale || {}),
                // find-on-sale only keeps 3 preview events — never use that list.
                allEvents: fromFilter?.allEvents,
                description:
                  fromFilter?.description || fromOnSale?.description,
                capacity: fromFilter?.capacity ?? fromOnSale?.capacity,
              }
            : null;

        if (!merged?.name && !merged?.id) {
          setMissing(true);
          return;
        }

        setVenue(merged);

        let stubs: VenueEvent[] = [];
        try {
          const up = await getVenueUpcomingEvents(merged.slug || slug);
          if (!cancelled) {
            stubs = unwrapEventList(up?.data);
            // This record carries the website even when /venues omits it.
            const site = venueWebsiteFromUpcomingEvents(up?.data);
            if (site) {
              setVenue((current) =>
                current && !venueWebsiteHref(current)
                  ? { ...current, website: site }
                  : current,
              );
            }
          }
        } catch {
          /* endpoint may 404 on some Strapi builds */
        }

        if (!stubs.length && Array.isArray(fromFilter?.allEvents)) {
          stubs = [...fromFilter.allEvents];
        }

        const upcoming = stubs.filter((e) => {
          if (!e.start) return false;
          return new Date(e.start).getTime() >= Date.now() - 3 * 60 * 60 * 1000;
        });

        setEvents(sortByDate(upcoming));

        // Venue records carry no branding, so take it from the team that plays
        // here and remember it for the next visit's loader. Keep the loader up
        // until the complete organization record has also arrived.
        const orgFromEvents = upcoming.find(
          (e) =>
            e.organization?.slug ||
            e.organization?.website ||
            e.organization?.url,
        )?.organization;
        if (orgFromEvents) {
          setOrganization((current) => current ?? orgFromEvents);
        }

        const orgSlug = orgFromEvents?.slug;
        if (orgSlug) {
          try {
            const res = await getOrganizationStorefront(orgSlug);
            if (cancelled) return;
            const org = (
              res.data as { organization?: BrandingOrganization | null }
            )?.organization;
            if (org) {
              setOrganization((current) => ({
                ...current,
                ...org,
                website:
                  org.website || org.url || current?.website || current?.url,
              }));
              cacheOrgBranding(org);
              cacheVenueBranding([{ slug }], org);
            }
          } catch {
            /* branding is optional — the page keeps the default palette */
          }
        }
      } catch {
        if (!cancelled) setMissing(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const mobile = vw < 900;
  const narrow = !mobile && vw < 1160;
  const stacked = mobile || narrow;

  const venueName = venue?.name || "Venue";
  const city = cityState(venue?.address) || "";
  const capacity =
    venue?.capacity != null && String(venue.capacity).trim() !== ""
      ? Number(venue.capacity).toLocaleString("en-US")
      : "";
  const description =
    venue?.description?.trim() ||
    `Find upcoming events and buy tickets at ${venueName}.`;
  const photoSrc = venuePhoto(venue?.image);
  const website = venueWebsiteHref(venue);
  const directionsHref = googleMapsDirectionsUrl(venue?.address);

  // Only take over the palette when the team actually has branding, so plain
  // venues keep the Blocktickets navy + green look.
  const accent = organizationAccent(organization) || accentHint;
  const ACC = accent || NAVY;
  const BTN = accent ? resolveButtonColor(null, organization, ACC) : GREEN;
  const BTN_INK = accent ? resolveButtonTextColor(null, organization) : NAVY;

  const groups = useMemo(() => {
    const rows = events
      .map((e) => toRow(e, venue?.timezone, venueName, organization))
      .filter(Boolean) as RowEvent[];
    rows.sort((a, b) => a.sort - b.sort);
    const keys: string[] = [];
    rows.forEach((e) => {
      if (!keys.includes(e.monthKey)) keys.push(e.monthKey);
    });
    return keys.map((k) => {
      const monthRows = rows.filter((e) => e.monthKey === k);
      return {
        title: monthRows[0]?.monthTitle || k,
        meta: monthEventCountLabel(monthRows.length),
        rows: monthRows,
      };
    });
  }, [events, venue?.timezone, venueName, organization]);

  if (missing) notFound();

  const cachedVenueBranding = getCachedBrandingForPath(`/venue/${slug}/`);
  const loaderName = organization?.name || cachedVenueBranding?.name || "";
  const loaderAccent = organization
    ? resolvePrimaryColor(null, organization)
    : cachedVenueBranding?.primaryColor || accentHint;
  const loaderLogo = organization
    ? imageUrl(resolveBrandLogo(null, organization), "")
    : cachedVenueBranding?.logoSrc || "";
  if (loading || !venue) {
    return (
      <RouteLoader
        branding={
          loaderAccent && (loaderLogo || loaderName)
            ? {
                primaryColor: loaderAccent,
                logoSrc: loaderLogo || undefined,
                name: loaderName || undefined,
              }
            : null
        }
      />
    );
  }

  const searchPill = (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 auto", maxWidth: 460, background: "rgba(255,255,255,0.10)", border: "1px solid rgba(158,182,216,0.22)", borderRadius: 999, padding: "10px 18px", color: "rgba(255,255,255,0.65)" }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17, flexShrink: 0 }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
      <span style={{ fontSize: 14, whiteSpace: "nowrap" }}>Search events, teams, venues</span>
    </div>
  );

  const iconBtn = {
    fontFamily: "inherit",
    width: 44,
    height: 44,
    borderRadius: 999,
    background: "#fff",
    border: "1px solid rgba(5,27,53,0.14)",
    color: NAVY,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    textDecoration: "none",
  } as const;

  const venueActions = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: mobile ? "flex-start" : "center" }}>
      {website ? (
        <a
          className="vp-action"
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visit venue website"
          style={iconBtn}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </a>
      ) : null}
      {directionsHref ? (
        <a
          className="vp-action"
          href={directionsHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Directions"
          style={iconBtn}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>
        </a>
      ) : null}
      <button
        type="button"
        className="vp-action"
        aria-label="Share"
        onClick={() => copyPageUrl()}
        style={iconBtn}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
      </button>
    </div>
  );

  return (
    <div style={{ background: "#f7f8fc", color: NAVY, minHeight: "100vh", fontFamily: "'Geist', system-ui, -apple-system, sans-serif", WebkitFontSmoothing: "antialiased", ["--vp-accent"]: ACC } as CSSProperties}>
      <style>{`.vp-row{transition:box-shadow 150ms ease,border-color 150ms ease}.vp-row:hover{box-shadow:0 8px 30px rgba(5,27,53,0.09);border-color:rgba(5,27,53,0.20)}.vp-action{outline:2px solid transparent;outline-offset:2px;transition:outline-color 140ms ease}.vp-action:hover,.vp-action:focus-visible{outline-color:var(--vp-accent)}`}</style>

      <header style={{ background: ACC, position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1320, margin: "0 auto", padding: mobile ? "12px 20px" : "16px 32px", display: "flex", alignItems: "center", gap: 16 }}>
          <InAppBackLink href="/browse/" aria-label="Back to browse" style={{ width: 40, height: 40, borderRadius: 999, background: "rgba(255,255,255,0.12)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, textDecoration: "none" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 19, height: 19 }}><polyline points="15 18 9 12 15 6" /></svg>
          </InAppBackLink>
          <Link href="/browse" style={{ display: "flex", alignItems: "center", flexShrink: 0, textDecoration: "none" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOCKUP} alt="blocktickets" style={{ height: 19, width: "auto" }} />
          </Link>
          {!mobile && searchPill}
          <Link href="/my-tickets/" style={{ fontFamily: "inherit", marginLeft: "auto", fontSize: 14, fontWeight: 600, color: ACC, background: "#fff", border: "none", borderRadius: 999, padding: "11px 22px", cursor: "pointer", whiteSpace: "nowrap", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>My wallet</Link>
        </div>
      </header>

      <div style={{ maxWidth: 1320, margin: "0 auto", padding: mobile ? "20px 20px 0" : "32px 32px 0", display: "grid", gridTemplateColumns: mobile ? "1fr" : narrow ? "300px minmax(0, 1fr)" : "344px minmax(0, 1fr)", gap: mobile ? 20 : 28, alignItems: "start" }}>

        {!mobile && (
          <aside style={{ background: "#fff", border: "1px solid rgba(5,27,53,0.10)", borderRadius: 24, boxShadow: "0 8px 30px rgba(5,27,53,0.08)", padding: 24, position: "sticky", top: 84, zIndex: 5, display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
              <div style={{ position: "relative", width: 116, height: 116, borderRadius: 24, overflow: "hidden", background: "#f1f3f8", border: "1px solid rgba(5,27,53,0.08)", flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoSrc} alt={venueName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center", textAlign: "center", minWidth: 0 }}>
                <h1 style={{ margin: 0, fontSize: 32, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.08 }}>{venueName}</h1>
                {city ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6e7180", whiteSpace: "nowrap" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13, flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                    {city}
                  </div>
                ) : null}
              </div>
            </div>

            <p style={{ margin: 0, paddingTop: 16, borderTop: "1px solid rgba(5,27,53,0.08)", fontSize: 13, lineHeight: 1.6, color: "#6e7180" }}>{description}</p>

            {venueActions}
          </aside>
        )}

        <main style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          {mobile && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ position: "relative", width: 64, height: 64, borderRadius: 16, overflow: "hidden", background: "#f1f3f8", border: "1px solid rgba(5,27,53,0.08)", flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoSrc} alt={venueName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                  <h1 style={{ margin: 0, fontSize: 21, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.15 }}>{venueName}</h1>
                  <div style={{ fontSize: 13, color: "#6e7180" }}>
                    {[city, capacity ? `${capacity} capacity` : ""].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </div>
              {venueActions}
            </div>
          )}

          <h2 style={{ margin: 0, fontSize: mobile ? 20 : 26, fontWeight: 600, letterSpacing: "-0.025em" }}>Upcoming events</h2>

          {!groups.length ? (
            <div style={{ background: "#fff", border: "1px solid rgba(5,27,53,0.10)", borderRadius: 18, padding: 28, color: "#6e7180", fontSize: 15 }}>
              No upcoming events for {venueName}.
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.title} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 2px 8px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: accent || "#7fbe4d", whiteSpace: "nowrap" }}>{g.title}</div>
                  <div style={{ fontSize: 12, color: "#8a93a3", whiteSpace: "nowrap" }}>{g.meta}</div>
                  <div style={{ flex: 1, height: 1, background: "rgba(5,27,53,0.10)" }} />
                </div>
                {g.rows.map((e) => {
                  const soon = e.status === "Presale";
                  const tag = tagFor(e.status);
                  const dateW = stacked ? 64 : 76;
                  return (
                    <Link key={e.key} href={e.href} className="vp-row" style={{ background: "#fff", border: "1px solid rgba(5,27,53,0.10)", borderRadius: 18, boxShadow: "0 1px 2px rgba(5,27,53,0.05)", padding: mobile ? 14 : "16px 20px", display: "grid", gridTemplateColumns: stacked ? "64px minmax(0, 1fr)" : "76px minmax(0, 1fr) auto", gap: mobile ? 14 : 20, alignItems: "center", cursor: "pointer", color: NAVY, textDecoration: "none" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, width: dateW, height: dateW, borderRadius: 14, background: "#f1f3f8", border: "1px solid rgba(5,27,53,0.08)", flexShrink: 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6e7180" }}>{e.mon}</div>
                        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{e.day}</div>
                        <div style={{ fontSize: 10, color: "#8a93a3" }}>{e.dow}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, color: "#6e7180" }}>{e.sport}{e.time ? ` · ${e.time}` : ""}</span>
                          {e.status !== "On sale" && (
                            <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: tag.tagInk, background: tag.tagBg, borderRadius: 999, padding: "4px 9px" }}>{e.status}</span>
                          )}
                        </div>
                        <div style={{ fontSize: mobile ? 16 : 17, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.25 }}>{e.title}</div>
                        {e.host ? (
                          <div style={{ fontSize: 13, color: "#6e7180", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.host}</div>
                        ) : null}
                      </div>
                      <div style={{ gridColumn: stacked ? "1 / -1" : "auto", display: "flex", alignItems: "center", gap: 16, justifyContent: "flex-end", paddingTop: stacked ? 12 : 0, borderTop: stacked ? "1px solid rgba(5,27,53,0.08)" : "none" }}>
                        <span style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: soon ? NAVY : BTN_INK, background: soon ? "#fff" : BTN, border: `1px solid ${soon ? "rgba(5,27,53,0.14)" : BTN}`, borderRadius: 999, padding: "12px 22px", minHeight: 44, display: "inline-flex", alignItems: "center", cursor: "pointer", whiteSpace: "nowrap" }}>{soon ? "Remind me" : "Get tickets"}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ))
          )}

          <div style={{ height: 32 }} />
        </main>
      </div>
    </div>
  );
}
