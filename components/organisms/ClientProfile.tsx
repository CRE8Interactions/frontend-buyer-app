"use client";

/**
 * ClientProfile — team / athletics-program storefront UI (from Claude Design
 * "Client Profile.dc.html"). Loads identity, events, packages, and flex packs
 * from GET /organizations/storefront/:slug so each org URL shows that org.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import InAppBackLink from "@/components/molecules/InAppBackLink";
import NavAuthActions from "@/components/molecules/NavAuthActions";
import RouteLoader from "@/components/molecules/RouteLoader";
import { fluidSize, shopperPageTypeCss } from "@/lib/shopperFluidType";
import { getOrganizationStorefront, getVenueUpcomingEvents } from "@/lib/api";
import {
  monthEventCountLabel,
  packageFromPriceLabel,
  type EventPriceSource,
} from "@/lib/eventFromPrice";
import { teamStorefrontDescription } from "@/lib/teamCopy";
import { categoryLabel, eventTypeLabel } from "@/lib/eventType";
import {
  BLOCKTICKETS_NAVY,
  resolveBrandLogo,
  resolveButtonColor,
  resolvePrimaryColor,
  type OrgBranding,
} from "@/lib/branding";
import {
  cacheOrgBranding,
  cacheOrgEventBranding,
  getCachedOrgBranding,
} from "@/lib/orgBrandingCache";
import { flexPackCardTone, flexPackEachPrice } from "@/lib/flexPackDisplay";
import {
  firstVenueWebsiteHref,
  venueWebsiteFromUpcomingEvents,
  venueWebsiteLookupSlug,
} from "@/lib/venueWebsite";
import {
  dateChip,
  eventPurchasePath,
  formatCurrency,
  formatEventWhen,
  imageUrl,
  sortByDate,
  type ApiImage,
} from "@/lib/helpers";
import {
  initializeTracking,
  type TrackingOrganization,
} from "@/lib/tracking";

const NAVY = "#051b35";

type VenueAddress =
  | { city?: string; state?: string }
  | Array<{ city?: string; state?: string }>;

type StoreEvent = {
  uuid?: string;
  id?: string | number;
  name?: string;
  title?: string;
  slug?: string;
  seoUrl?: string;
  shortCode?: string;
  shortcode?: string;
  start?: string;
  status?: string;
  sport?: string;
  category?: { name?: string } | null;
  image?: ApiImage;
  attractions?: Array<{ name?: string; primary?: boolean; order?: number }>;
  venue?: {
    name?: string;
    timezone?: string;
    isGeneralAdmissionOnly?: boolean;
    address?: VenueAddress;
  };
  seatmap?: { ga_only?: boolean };
  isGeneralAdmissionOnly?: boolean;
  generalAdmissionOnly?: boolean;
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
    slug?: string;
    name?: string;
    category?: { name?: string } | null;
  } | null;
};

type PackageItem = {
  uuid?: string;
  id?: number | string;
  name?: string;
  start?: string;
  end?: string;
  description?: string;
  pricingTiers?: { price?: number; name?: string }[];
  venue?: { timezone?: string; name?: string };
  category?: { name?: string } | null;
};

type FlexPackItem = {
  uuid?: string;
  id?: number | string;
  name?: string;
  start?: string;
  end?: string;
  price?: number;
  gameTickets?: number;
  image?: ApiImage;
  color?: string;
  backgroundColor?: string;
  offerColor?: string;
  venue?: { timezone?: string };
};

type VenueItem = {
  name?: string;
  slug?: string;
  timezone?: string;
  website?: string;
  url?: string;
  address?: VenueAddress;
};

type Org = TrackingOrganization & {
  name?: string;
  slug?: string;
  image?: ApiImage;
  website?: string;
  url?: string;
  primaryColor?: string;
  accentColor?: string;
  branding?: OrgBranding | null;
  description?: string;
  summary?: string;
  homeVenue?: VenueItem | null;
  venues?: VenueItem[];
  category?: { name?: string } | null;
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
  venue: string;
  status: string;
  href: string;
  sort: number;
};

export type StorefrontInitialData = {
  organization?: Org | null;
  venues?: VenueItem[];
  events?: StoreEvent[];
  packages?: PackageItem[];
  flexPacks?: FlexPackItem[];
  venueWebsite?: string | null;
} | null;

function teamVenues(org?: Org | null, venues: VenueItem[] = []) {
  return [org?.homeVenue, ...(org?.venues || []), ...venues];
}

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

function eventStatus(ev: StoreEvent) {
  const raw = (ev.status || "").trim();
  if (!raw || raw === "on_sale") return "On sale";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const ALL_FILTER = "All";

function matchesFilter(category: string | null | undefined, selected: string) {
  if (selected === ALL_FILTER) return true;
  const label = categoryLabel(category);
  if (!label) return true;
  return label === selected;
}

function toRow(ev: StoreEvent, org?: Org | null): RowEvent | null {
  const start = ev.start;
  if (!start) return null;
  const tz = ev.venue?.timezone;
  const chip = dateChip(start, tz);
  const m = new Date(start);
  const monthTitle = Number.isNaN(m.getTime())
    ? chip.m
    : m.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: undefined });
  // Prefer venue tz formatting for month header when possible
  const monthTitleTz = formatEventWhen(start, tz, "MMMM YYYY") || monthTitle;
  const monthKey = formatEventWhen(start, tz, "YYYY-MM") || start.slice(0, 7);

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
    venue: ev.venue?.name || "",
    status: eventStatus(ev),
    href: eventPurchasePath(ev),
    sort: new Date(start).getTime() || 0,
  };
}

export default function ClientProfile({
  slug,
  initialData = null,
}: {
  slug: string;
  initialData?: StorefrontInitialData;
}) {
  const [tab, setTab] = useState<"events" | "packages" | "flex">("events");
  const [sport, setSport] = useState(ALL_FILTER);
  const [vw, setVw] = useState(1440);

  const [organization, setOrganization] = useState<Org | null>(
    initialData?.organization ?? null,
  );
  const [venues, setVenues] = useState<VenueItem[]>(initialData?.venues ?? []);
  const [events, setEvents] = useState<StoreEvent[]>(
    initialData?.events ? sortByDate(initialData.events) : [],
  );
  const [packages, setPackages] = useState<PackageItem[]>(
    initialData?.packages ?? [],
  );
  const [flexPacks, setFlexPacks] = useState<FlexPackItem[]>(
    initialData?.flexPacks ?? [],
  );
  const [loading, setLoading] = useState(() => !initialData?.organization);
  const [missing, setMissing] = useState(false);
  const [venueWebsite, setVenueWebsite] = useState<string | null>(
    () =>
      initialData?.venueWebsite ||
      firstVenueWebsiteHref(
        teamVenues(initialData?.organization, initialData?.venues),
      ),
  );

  useEffect(() => {
    const onR = () => setVw(window.innerWidth);
    onR();
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  useEffect(() => {
    if (!initialData?.organization) return;
    initializeTracking(initialData.organization);
    cacheOrgBranding(initialData.organization);
    cacheOrgEventBranding(initialData.events, initialData.organization);
  }, [initialData]);

  useEffect(() => {
    let cancelled = false;
    setMissing(false);
    setSport(ALL_FILTER);
    setTab("events");

    if (initialData?.organization) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    getOrganizationStorefront(slug)
      .then(async (res) => {
        if (cancelled) return;
        const data = res.data as {
          organization?: Org | null;
          venues?: VenueItem[];
          events?: StoreEvent[];
          packages?: PackageItem[];
          flexPacks?: FlexPackItem[];
          venueWebsite?: string | null;
        };
        if (!data?.organization) {
          setMissing(true);
          return;
        }
        const incoming = data.events || [];
        // Branding can paint the loader immediately; shopper content remains
        // gated until the venue website lookup below has completed.
        setOrganization(data.organization);
        initializeTracking(data.organization);
        cacheOrgBranding(data.organization);
        cacheOrgEventBranding(incoming, data.organization);
        const candidates = teamVenues(data.organization, data.venues);
        let website =
          data.venueWebsite || firstVenueWebsiteHref(candidates);
        const venueSlug =
          candidates.find((venue) => venue?.slug)?.slug || "";
        if (!website && venueSlug) {
          try {
            const upcoming = await getVenueUpcomingEvents(venueSlug);
            website = venueWebsiteFromUpcomingEvents(upcoming?.data);
          } catch {
            /* website is optional, but its lookup is now complete */
          }
        }
        if (cancelled) return;
        setVenues(data.venues || []);
        setEvents(sortByDate(incoming));
        setPackages(data.packages || []);
        setFlexPacks(data.flexPacks || []);
        setVenueWebsite(website);
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, initialData?.organization, initialData?.events]);

  const mobile = vw < 900;
  const narrow = !mobile && vw < 1160;

  const cachedBranding = getCachedOrgBranding(slug);
  const ACC = organization
    ? resolvePrimaryColor(null, organization)
    : cachedBranding?.primaryColor || BLOCKTICKETS_NAVY;
  const BTN = organization
    ? resolveButtonColor(null, organization, ACC)
    : cachedBranding?.primaryColor || BLOCKTICKETS_NAVY;
  const orgName = organization?.name || cachedBranding?.name || "";
  const logoSrc = organization
    ? imageUrl(resolveBrandLogo(null, organization), "/blocktickets-logo-navy.svg")
    : imageUrl(cachedBranding?.logoSrc, "/blocktickets-logo-navy.svg");
  const hasLoaderBranding = Boolean(
    organization ||
      (cachedBranding && (cachedBranding.logoSrc || cachedBranding.primaryColor)),
  );
  const location =
    cityState(organization?.homeVenue?.address) ||
    cityState(venues[0]?.address) ||
    "";
  const about = teamStorefrontDescription(orgName, [
    organization?.homeVenue,
    ...(organization?.venues || []),
    ...venues,
  ]);
  const rows = useMemo(
    () =>
      events
        .map((ev) => toRow(ev, organization))
        .filter((r): r is RowEvent => Boolean(r))
        .sort((a, b) => a.sort - b.sort),
    [events, organization],
  );

  const { groups, sportFilters, showFilters, filterHeading, visiblePackages } =
    useMemo(() => {
      const eventLabels = [ALL_FILTER];
      rows.forEach((e) => {
        const label = categoryLabel(e.sport);
        if (label && !eventLabels.includes(label)) eventLabels.push(label);
      });
      const realSports = eventLabels.filter((s) => !/^events?$/i.test(s));
      const eventFilterLabels =
        realSports.length > 1
          ? realSports
          : eventLabels.length > 1
            ? eventLabels
            : [ALL_FILTER];

      const packageLabels = [ALL_FILTER];
      packages.forEach((p) => {
        const name = categoryLabel(p.category?.name);
        if (name && !packageLabels.includes(name)) packageLabels.push(name);
      });

      const filterLabels =
        tab === "packages" ? packageLabels : eventFilterLabels;
      const active = filterLabels.includes(sport) ? sport : ALL_FILTER;
      const filteredEvents =
        active === ALL_FILTER
          ? rows
          : rows.filter((e) => categoryLabel(e.sport) === active);

      const monthKeys: string[] = [];
      filteredEvents.forEach((e) => {
        if (!monthKeys.includes(e.monthKey)) monthKeys.push(e.monthKey);
      });
      const groups = monthKeys.map((mk) => {
        const list = filteredEvents.filter((e) => e.monthKey === mk);
        return {
          title: list[0]?.monthTitle || mk,
          meta: monthEventCountLabel(list.length),
          rows: list,
        };
      });

      const sourceCount =
        tab === "packages"
          ? (label: string) =>
              label === ALL_FILTER
                ? packages.length
                : packages.filter((p) => categoryLabel(p.category?.name) === label)
                    .length
          : (label: string) =>
              label === ALL_FILTER
                ? rows.length
                : rows.filter((e) => categoryLabel(e.sport) === label).length;

      const sportFilters = filterLabels.map((label) => ({
        label,
        n: sourceCount(label),
        on: label === active,
      }));

      const visiblePackages = packages.filter((p) =>
        matchesFilter(p.category?.name, active),
      );

      return {
        groups,
        sportFilters,
        showFilters: tab !== "flex" && filterLabels.length > 1,
        filterHeading: tab === "packages" ? "Category" : "Sport",
        visiblePackages,
      };
    }, [rows, sport, tab, packages]);

  const tabs = [
    { key: "events" as const, label: "Upcoming events" },
    { key: "packages" as const, label: "Season tickets" },
    { key: "flex" as const, label: "Flex packages" },
  ];

  const card: React.CSSProperties = {
    background: "#fff",
    border: "1px solid rgba(5,27,53,0.10)",
    borderRadius: 18,
    boxShadow: "0 1px 2px rgba(5,27,53,0.05)",
  };
  const rowCols = mobile || narrow ? "64px minmax(0, 1fr)" : "76px minmax(0, 1fr) auto";
  const dateW = mobile || narrow ? 64 : 76;
  const ctaSpan = mobile || narrow ? "1 / -1" : "auto";

  if (loading) {
    // Without branding a tenant loader would invent an identity, so let the
    // shared loader fall back to ours.
    return (
      <RouteLoader
        branding={
          hasLoaderBranding
            ? { primaryColor: ACC, logoSrc, name: orgName }
            : null
        }
      />
    );
  }

  if (missing || !organization) {
    notFound();
  }

  return (
    <div
      className="shopper-page"
      style={{
        background: "#f7f8fc",
        color: NAVY,
        minHeight: "100vh",
        fontFamily: "'Geist', system-ui, -apple-system, sans-serif",
        WebkitFontSmoothing: "antialiased",
        ["--cp-accent"]: ACC,
      } as React.CSSProperties}
    >
      <style>{`${shopperPageTypeCss()}
.cp-a{transition:background 140ms}.cp-row{transition:box-shadow 150ms ease}.cp-row:hover{box-shadow:0 8px 30px rgba(5,27,53,0.09)}.cp-action{outline:2px solid transparent;outline-offset:2px;transition:outline-color 140ms ease}.cp-action:hover,.cp-action:focus-visible{outline-color:var(--cp-accent)}`}</style>

      <header style={{ background: ACC, position: "sticky", top: 0, zIndex: 20 }}>
        <div
          style={{
            maxWidth: 1320,
            margin: "0 auto",
            padding: mobile ? "12px 20px" : "16px 32px",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <InAppBackLink
            href="/browse/"
            aria-label="Back to browse"
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              background: "rgba(255,255,255,0.14)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              textDecoration: "none",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 19, height: 19 }}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </InAppBackLink>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexShrink: 0,
            }}
          >
            <NavAuthActions
              buttonStyle={{
                fontFamily: "inherit",
                fontSize: fluidSize(14),
                fontWeight: 600,
                color: ACC,
                background: "#fff",
                border: "none",
                borderRadius: 999,
                padding: "11px 22px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            />
          </div>
        </div>
      </header>

      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: mobile ? "20px 20px 40px" : "32px 32px 48px",
          display: "grid",
          gridTemplateColumns: mobile
            ? "1fr"
            : narrow
              ? "300px minmax(0, 1fr)"
              : "344px minmax(0, 1fr)",
          gap: mobile ? 20 : 28,
          alignItems: "start",
        }}
      >
        {!mobile && (
          <aside
            style={{
              ...card,
              borderRadius: 24,
              boxShadow: "0 8px 30px rgba(5,27,53,0.08)",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 18,
              position: "sticky",
              top: 84,
              zIndex: 5,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
              <div
                style={{
                  width: 116,
                  height: 116,
                  borderRadius: 999,
                  background: "#fff",
                  border: "1px solid rgba(5,27,53,0.08)",
                  boxShadow: "0 8px 30px rgba(5,27,53,0.10)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 14,
                  boxSizing: "border-box",
                  flexShrink: 0,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoSrc} alt={orgName} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center", textAlign: "center", minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: fluidSize(10),
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: ACC,
                    whiteSpace: "nowrap",
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: 999, background: ACC }} />
                  {categoryLabel(organization.category?.name) || "Organization"}
                </div>
                <h1 style={{ margin: 0, fontSize: fluidSize(32), fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.08 }}>
                  {orgName}
                </h1>
                {location && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: fluidSize(13), color: "#6e7180" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13, flexShrink: 0 }}>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {location}
                  </div>
                )}
              </div>
            </div>

            {showFilters && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid rgba(5,27,53,0.08)" }}>
                <div style={{ fontSize: fluidSize(10), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "#8a93a3", paddingTop: 14 }}>
                  {filterHeading}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {sportFilters.map((f) => (
                    <button
                      key={f.label}
                      className="cp-a"
                      onClick={() => setSport(f.label)}
                      style={{
                        fontFamily: "inherit",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        textAlign: "left",
                        fontSize: fluidSize(14),
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                        background: f.on ? `${ACC}14` : "transparent",
                        color: f.on ? ACC : NAVY,
                        border: "none",
                        borderRadius: 10,
                        padding: "9px 10px",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{f.label}</span>
                      <span style={{ flexShrink: 0, fontSize: fluidSize(12), color: "#8a93a3", fontVariantNumeric: "tabular-nums" }}>{f.n}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p
              style={{
                margin: 0,
                paddingTop: 16,
                borderTop: "1px solid rgba(5,27,53,0.08)",
                fontSize: fluidSize(13),
                lineHeight: 1.6,
                color: "#6e7180",
              }}
            >
              {about}
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
              {venueWebsite && (
                <a
                  className="cp-action"
                  href={venueWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Visit venue website"
                  style={{
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
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </a>
              )}
              <button
                type="button"
                className="cp-action"
                aria-label="Share"
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.share) {
                    void navigator.share({ title: orgName, url: window.location.href });
                  } else if (typeof navigator !== "undefined" && navigator.clipboard) {
                    void navigator.clipboard.writeText(window.location.href);
                  }
                }}
                style={{
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
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}>
                  <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </button>
            </div>
          </aside>
        )}

        <main style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {mobile && (
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 999,
                  background: "#fff",
                  border: "1px solid rgba(5,27,53,0.08)",
                  boxShadow: "0 8px 30px rgba(5,27,53,0.10)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 9,
                  boxSizing: "border-box",
                  flexShrink: 0,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoSrc} alt={orgName} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                <div style={{ fontSize: fluidSize(10), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: ACC }}>
                  {categoryLabel(organization.category?.name) || "Organization"}
                </div>
                <h1 style={{ margin: 0, fontSize: fluidSize(21), fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                  {orgName}
                </h1>
              </div>
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#edeff7",
              borderRadius: 999,
              padding: 5,
              alignSelf: mobile ? "stretch" : "flex-start",
              width: mobile ? "100%" : "auto",
              boxSizing: "border-box",
            }}
          >
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  fontFamily: "inherit",
                  flex: mobile ? "1 1 0" : "0 0 auto",
                  fontSize: fluidSize(mobile ? 11 : 14),
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  border: "none",
                  borderRadius: 999,
                  padding: `11px ${mobile ? 6 : 20}px`,
                  cursor: "pointer",
                  background: t.key === tab ? ACC : "transparent",
                  color: t.key === tab ? "#fff" : "#4a5567",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "events" && (
            <>
              {mobile && showFilters && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto", margin: "0 -20px", padding: "0 20px" }}>
                  {sportFilters.map((f) => (
                    <button
                      key={f.label}
                      onClick={() => setSport(f.label)}
                      style={{
                        fontFamily: "inherit",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: fluidSize(13),
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        height: 34,
                        borderRadius: 8,
                        padding: "0 12px",
                        cursor: "pointer",
                        background: f.on ? `${ACC}14` : "#fff",
                        color: f.on ? ACC : "#4a5567",
                        border: `1px solid ${f.on ? ACC : "rgba(5,27,53,0.12)"}`,
                      }}
                    >
                      {f.label}
                      <span style={{ fontSize: fluidSize(11), fontWeight: 600, color: f.on ? `${ACC}99` : "#8a93a3", fontVariantNumeric: "tabular-nums" }}>
                        {f.n}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {groups.length === 0 && (
                <div style={{ ...card, padding: 28, textAlign: "center", color: "#6e7180", fontSize: fluidSize(14) }}>
                  No upcoming events for {orgName}.
                </div>
              )}

              {groups.map((g) => (
                <div key={g.title} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 2px 8px" }}>
                    <div style={{ fontSize: fluidSize(13), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: ACC, whiteSpace: "nowrap" }}>
                      {g.title}
                    </div>
                    <div style={{ fontSize: fluidSize(12), color: "#8a93a3", whiteSpace: "nowrap" }}>{g.meta}</div>
                    <div style={{ flex: 1, height: 1, background: "rgba(5,27,53,0.10)" }} />
                  </div>
                  {g.rows.map((e) => {
                    const soon = e.status === "Presale";
                    const tag = tagFor(e.status);
                    return (
                      <Link
                        key={e.key}
                        href={e.href}
                        className="cp-row"
                        style={{
                          ...card,
                          padding: mobile ? 14 : "16px 20px",
                          display: "grid",
                          gridTemplateColumns: rowCols,
                          gap: mobile ? 14 : 20,
                          alignItems: "center",
                          cursor: "pointer",
                          color: NAVY,
                          textDecoration: "none",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 2,
                            width: dateW,
                            height: dateW,
                            borderRadius: 14,
                            background: "#f1f3f8",
                            border: "1px solid rgba(5,27,53,0.08)",
                            flexShrink: 0,
                          }}
                        >
                          <div style={{ fontSize: fluidSize(10), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6e7180" }}>
                            {e.mon}
                          </div>
                          <div style={{ fontSize: fluidSize(22), fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                            {e.day}
                          </div>
                          <div style={{ fontSize: fluidSize(10), color: "#8a93a3" }}>{e.dow}</div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: fluidSize(12), color: "#6e7180" }}>
                              {e.sport}
                              {e.time ? ` · ${e.time}` : ""}
                            </span>
                            {e.status !== "On sale" && (
                              <span
                                style={{
                                  fontSize: fluidSize(10),
                                  fontWeight: 600,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.12em",
                                  color: tag.tagInk,
                                  background: tag.tagBg,
                                  borderRadius: 999,
                                  padding: "4px 9px",
                                }}
                              >
                                {e.status}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: fluidSize(mobile ? 16 : 17), fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.25 }}>
                            {e.title}
                          </div>
                          {e.venue && (
                            <div style={{ fontSize: fluidSize(13), color: "#6e7180", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {e.venue}
                            </div>
                          )}
                        </div>
                        <div
                          style={{
                            gridColumn: ctaSpan,
                            display: "flex",
                            alignItems: "center",
                            gap: mobile ? 12 : 18,
                            justifyContent: "flex-end",
                            paddingTop: mobile || narrow ? 12 : 0,
                            borderTop: mobile || narrow ? "1px solid rgba(5,27,53,0.08)" : "none",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "inherit",
                              fontSize: fluidSize(14),
                              fontWeight: 600,
                              color: soon ? NAVY : "#fff",
                              background: soon ? "#fff" : BTN,
                              border: `1px solid ${soon ? "rgba(5,27,53,0.14)" : BTN}`,
                              borderRadius: 999,
                              padding: "12px 22px",
                              minHeight: 44,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxSizing: "border-box",
                            }}
                          >
                            {soon ? "Remind me" : "Get tickets"}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </>
          )}

          {tab === "packages" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {mobile && showFilters && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto", margin: "0 -20px", padding: "0 20px" }}>
                  {sportFilters.map((f) => (
                    <button
                      key={f.label}
                      onClick={() => setSport(f.label)}
                      style={{
                        fontFamily: "inherit",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: fluidSize(13),
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        height: 34,
                        borderRadius: 8,
                        padding: "0 12px",
                        cursor: "pointer",
                        background: f.on ? `${ACC}14` : "#fff",
                        color: f.on ? ACC : "#4a5567",
                        border: `1px solid ${f.on ? ACC : "rgba(5,27,53,0.12)"}`,
                      }}
                    >
                      {f.label}
                      <span style={{ fontSize: fluidSize(11), color: "#8a93a3" }}>{f.n}</span>
                    </button>
                  ))}
                </div>
              )}
              {visiblePackages.length === 0 && (
                <div style={{ ...card, padding: 28, textAlign: "center", color: "#6e7180", fontSize: fluidSize(14) }}>
                  No season tickets
                  {sport !== ALL_FILTER ? ` for ${sport}` : ""} on sale right now.
                </div>
              )}
              {visiblePackages.map((p) => {
                const tz = p.venue?.timezone || venues[0]?.timezone;
                const range =
                  p.start && p.end
                    ? `${formatEventWhen(p.start, tz, "MMM D")} → ${formatEventWhen(p.end, tz, "MMM D, YYYY")}`
                    : "";
                const price = packageFromPriceLabel(p);
                return (
                  <Link
                    key={String(p.uuid || p.id)}
                    href={p.uuid ? `/${slug}/package/${p.uuid}/` : "#"}
                    className="cp-row"
                    style={{
                      ...card,
                      padding: mobile ? 14 : "16px 20px",
                      display: "grid",
                      gridTemplateColumns: mobile ? "1fr" : "minmax(0, 1fr) auto",
                      gap: mobile ? 14 : 20,
                      alignItems: "center",
                      cursor: "pointer",
                      color: NAVY,
                      textDecoration: "none",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                      <div style={{ fontSize: fluidSize(10), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: ACC }}>
                        {categoryLabel(p.category?.name) || "Season"}
                      </div>
                      <div style={{ fontSize: fluidSize(mobile ? 16 : 17), fontWeight: 600, letterSpacing: "-0.015em" }}>
                        {p.name || "Season package"}
                      </div>
                      {range && <div style={{ fontSize: fluidSize(13), color: "#6e7180" }}>{range}</div>}
                      {p.description && <div style={{ fontSize: fluidSize(13), color: "#4a5567" }}>{p.description}</div>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: mobile ? 12 : 18, justifyContent: mobile ? "space-between" : "flex-end" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 1, alignItems: mobile ? "baseline" : "flex-end" }}>
                        <span style={{ fontSize: fluidSize(10), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "#8a93a3" }}>From</span>
                        <span style={{ fontSize: fluidSize(17), fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.015em", color: price ? NAVY : "#8a93a3" }}>
                          {price || "—"}
                        </span>
                      </div>
                      <span
                        style={{
                          fontFamily: "inherit",
                          fontSize: fluidSize(14),
                          fontWeight: 600,
                          color: "#fff",
                          background: BTN,
                          border: `1px solid ${BTN}`,
                          borderRadius: 999,
                          padding: "12px 22px",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                      >
                        Select
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {tab === "flex" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: mobile
                  ? "1fr"
                  : narrow
                    ? "repeat(2, minmax(0, 1fr))"
                    : "repeat(3, minmax(0, 1fr))",
                gap: 14,
              }}
            >
              {flexPacks.length === 0 && (
                <div style={{ ...card, padding: 28, textAlign: "center", color: "#6e7180", fontSize: fluidSize(14), gridColumn: "1 / -1" }}>
                  No flex packages on sale right now.
                </div>
              )}
              {flexPacks.map((f) => {
                const count = f.gameTickets ?? 0;
                const price = f.price != null ? formatCurrency(f.price) : "—";
                const each = flexPackEachPrice(f.price, count);
                const packImage = f.image ? imageUrl(f.image, "") : "";
                const tone = flexPackCardTone(
                  f.name,
                  f.color || f.backgroundColor || f.offerColor,
                  ACC,
                );
                return (
                  <Link
                    key={String(f.uuid || f.id)}
                    href={f.uuid ? `/${slug}/flex-pack/${f.uuid}/` : "#"}
                    style={{
                      ...card,
                      borderRadius: 20,
                      overflow: "hidden",
                      padding: 0,
                      display: "flex",
                      flexDirection: "column",
                      textDecoration: "none",
                      color: NAVY,
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        height: 132,
                        background: packImage
                          ? `url(${packImage}) center/cover no-repeat`
                          : tone.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {packImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={packImage}
                          alt={f.name || "Flex pack"}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            fontSize: fluidSize(56),
                            fontWeight: 700,
                            letterSpacing: "-0.04em",
                            color: tone.ink,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {count || ""}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        padding: 20,
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      <div style={{ fontSize: fluidSize(18), fontWeight: 600, letterSpacing: "-0.02em" }}>
                        {f.name || (count ? `${count} vouchers` : "Flex pack")}
                      </div>
                      {count > 0 ? (
                        <div style={{ fontSize: fluidSize(14), color: "#6e7180" }}>
                          {count} {count === 1 ? "voucher" : "vouchers"}
                        </div>
                      ) : null}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <span style={{ fontSize: fluidSize(20), fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
                          {price}
                        </span>
                        {each != null && (
                          <span style={{ fontSize: fluidSize(13), fontWeight: 600, color: ACC, background: `${ACC}14`, borderRadius: 999, padding: "7px 14px", whiteSpace: "nowrap" }}>
                            {formatCurrency(each)} each
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
