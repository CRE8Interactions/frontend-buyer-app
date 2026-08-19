"use client";

import { useEffect, useState, type ElementType } from "react";
import Link from "next/link";
import { cardCls } from "@/components/molecules/Card";
import { ArrowRight } from "@/components/atoms/icons";
import ProductCard from "@/components/organisms/ProductCard";
import {
  eventPurchasePath,
  formatEventWhen,
  imageUrl,
  type ApiImage,
} from "@/lib/helpers";
import { formatVenueCityState } from "@/lib/venueLocation";
import { categoryLabel } from "@/lib/eventType";

export type OrganizationCardAttraction = {
  name?: string;
  primary?: boolean;
  order?: number;
};

export type OrganizationCardEvent = {
  uuid?: string;
  name?: string;
  start?: string;
  slug?: string;
  seoUrl?: string;
  shortCode?: string;
  shortcode?: string;
  attractions?: OrganizationCardAttraction[];
  venue?: {
    name?: string;
    timezone?: string;
    isGeneralAdmissionOnly?: boolean;
  };
  seatmap?: { ga_only?: boolean };
};

export type OrganizationCardVenue = {
  name?: string;
  slug?: string;
  capacity?: number | null;
  ageRestriction?: string | null;
  address?:
    | { city?: string; state?: string }
    | Array<{ city?: string; state?: string }>;
};

export type OrganizationCardOrg = {
  name?: string;
  slug?: string;
  uuid?: string;
  image?: ApiImage;
  category?: { name?: string; uuid?: string } | null;
  homeVenue?: OrganizationCardVenue | null;
  venues?: OrganizationCardVenue[];
  upcomingEventsCount?: number;
  nextEvent?: OrganizationCardEvent | null;
  hasPackagesOnSale?: boolean;
  hasFlexPacksOnSale?: boolean;
};

const SPORTS_FALLBACK_BRAND = "#0d3d2e";
const MUSIC_FALLBACK_BRAND = "#6b2f1f";

function venueAddress(address?: OrganizationCardVenue["address"] | null) {
  const formatted = formatVenueCityState(address ?? undefined);
  return formatted || undefined;
}

function categoryKey(category?: { name?: string } | null) {
  return (category?.name || "").trim().toLowerCase();
}

function isSportsCategory(category?: { name?: string } | null) {
  return categoryKey(category) === "sports";
}

function isMusicCategory(category?: { name?: string } | null) {
  const key = categoryKey(category);
  return key === "music" || key === "concerts";
}

function orgInitials(name?: string) {
  const parts = (name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

async function sampleBrandColor(src: string, fallback: string): Promise<string> {
  if (!src || src.startsWith("/")) return fallback;
  try {
    const res = await fetch(
      `/api/dominant-color/?src=${encodeURIComponent(src)}`,
    );
    if (!res.ok) return fallback;
    const data = (await res.json()) as { color?: string };
    return data.color || fallback;
  } catch {
    return fallback;
  }
}

function getOpponentLabel(event?: OrganizationCardEvent | null) {
  const attractions = event?.attractions;
  if (!attractions || attractions.length < 2) return null;

  const sorted = [...attractions].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );
  const home = sorted.find((a) => a.primary) ?? sorted[0];
  const away = sorted.find((a) => a !== home) ?? sorted[1];
  if (!away?.name) return null;
  return away.name;
}

function primaryAttractionName(event?: OrganizationCardEvent | null) {
  const attractions = event?.attractions;
  if (!attractions?.length) return null;
  const sorted = [...attractions].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );
  const primary = sorted.find((a) => a.primary) ?? sorted[0];
  return primary?.name || null;
}

function nextSportsLabel(event?: OrganizationCardEvent | null) {
  if (!event?.start) return null;
  const when = formatEventWhen(event.start, event.venue?.timezone, "ddd, MMM D");
  const opponent = getOpponentLabel(event);
  if (opponent) return `${when} vs. ${opponent}`;
  return event.name ? `${when} · ${event.name}` : when;
}

function nextShowLabel(event?: OrganizationCardEvent | null) {
  if (!event?.start) return null;
  const when = formatEventWhen(event.start, event.venue?.timezone, "ddd, MMM D");
  const headliner = primaryAttractionName(event) || event.name;
  return headliner ? `${when} · ${headliner}` : when;
}

function orgHref(org: OrganizationCardOrg) {
  if (org.slug) return `/${org.slug}/`;
  return null;
}

function formatCapacity(capacity?: number | null) {
  if (capacity == null || !Number.isFinite(Number(capacity))) return null;
  return `${Number(capacity).toLocaleString()} cap`;
}

function formatAgePolicy(ageRestriction?: string | null) {
  const value = (ageRestriction || "").trim();
  return value || null;
}

type ProfileStat = {
  value: string;
  label: string;
};

function ProfileOrganizationCard({
  org,
  className = "",
  fallbackBrand,
  subtitle,
  stats,
  upcomingLabel,
  upcomingText,
}: {
  org: OrganizationCardOrg;
  className?: string;
  fallbackBrand: string;
  subtitle?: string;
  stats: ProfileStat[];
  upcomingLabel: string;
  upcomingText: string | null;
}) {
  const name = org.name || "Organization";
  const href = orgHref(org);
  const logoSrc = imageUrl(org.image, "");
  const hasLogo = Boolean(logoSrc && !logoSrc.includes("blocktickets-logo"));
  const [brand, setBrand] = useState(fallbackBrand);
  const nextHref = org.nextEvent ? eventPurchasePath(org.nextEvent) : null;

  useEffect(() => {
    if (!hasLogo) return;
    let cancelled = false;
    sampleBrandColor(logoSrc, fallbackBrand).then((color) => {
      if (!cancelled) setBrand(color);
    });
    return () => {
      cancelled = true;
    };
  }, [hasLogo, logoSrc, fallbackBrand]);

  const Banner = (href ? "a" : "div") as ElementType;
  const Avatar = (href ? "a" : "div") as ElementType;
  const statCols =
    stats.length >= 3 ? "grid-cols-3" : stats.length === 2 ? "grid-cols-2" : "grid-cols-1";

  return (
    <article
      className={`${cardCls} group flex flex-col overflow-hidden transition-transform hover:-translate-y-0.5 ${className}`}
    >
      <Banner
        {...(href ? { href } : {})}
        className="relative block h-16"
        style={{ backgroundColor: brand }}
      >
        <span className="sr-only">{name}</span>
      </Banner>

      <div className="relative px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="-mt-8 flex items-end justify-between gap-3">
          <Avatar
            {...(href ? { href } : {})}
            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-[#0a2747] bg-white text-[18px] font-bold tracking-tight shadow-[0_8px_20px_-10px_rgba(0,0,0,0.55)]"
          >
            {hasLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                alt=""
                className="h-full w-full object-contain p-1.5"
              />
            ) : (
              <span style={{ color: brand }}>{orgInitials(name)}</span>
            )}
          </Avatar>

          <button
            type="button"
            className="mt-10 rounded-lg px-3.5 py-1.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: brand }}
            aria-label={`Follow ${name}`}
          >
            Follow
          </button>
        </div>

        <div className="mt-3">
          {href ? (
            <Link
              href={href}
              className="group/name inline-block"
              style={{ ["--org-brand" as string]: brand }}
            >
              <h3 className="text-[20px] font-semibold leading-tight tracking-[-0.02em] text-white transition-colors duration-200 group-hover/name:text-[var(--org-brand)]">
                {name}
              </h3>
            </Link>
          ) : (
            <h3 className="text-[20px] font-semibold leading-tight tracking-[-0.02em]">
              {name}
            </h3>
          )}
          {subtitle ? (
            <p className="mt-1 text-[13px] text-[#9DA2B3]">{subtitle}</p>
          ) : null}
        </div>

        <div className={`mt-4 grid ${statCols} gap-2 border-y border-white/10 py-3.5`}>
          {stats.map((stat) => (
            <div key={stat.label} className="min-w-0">
              <p className="truncate text-[15px] font-semibold leading-none tracking-[-0.02em] sm:text-[16px]">
                {stat.value}
              </p>
              <p className="mt-1.5 text-[11px] leading-snug text-[#9DA2B3]">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {upcomingText && nextHref ? (
          <Link
            href={nextHref}
            className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 px-3.5 py-3 transition-colors hover:bg-black/35"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#9DA2B3]">
                {upcomingLabel}
              </p>
              <p className="mt-1 truncate text-[14px] font-semibold leading-snug">
                {upcomingText}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-white/80" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function SportsOrganizationCard({
  org,
  className = "",
}: {
  org: OrganizationCardOrg;
  className?: string;
}) {
  const homeVenue = org.homeVenue?.name || org.venues?.[0]?.name || "—";
  const location =
    venueAddress(org.homeVenue?.address) ||
    venueAddress(org.venues?.[0]?.address);
  const subtitle = [categoryLabel(org.category?.name) || undefined, location || undefined]
    .filter(Boolean)
    .join(" · ");

  return (
    <ProfileOrganizationCard
      org={org}
      className={className}
      fallbackBrand={SPORTS_FALLBACK_BRAND}
      subtitle={subtitle || undefined}
      stats={[
        {
          value: String(org.upcomingEventsCount ?? 0),
          label: "upcoming events",
        },
        { value: homeVenue, label: "home venue" },
      ]}
      upcomingLabel="next up"
      upcomingText={nextSportsLabel(org.nextEvent)}
    />
  );
}

function MusicOrganizationCard({
  org,
  className = "",
}: {
  org: OrganizationCardOrg;
  className?: string;
}) {
  const venue = org.homeVenue || org.venues?.[0];
  const capacity = formatCapacity(venue?.capacity);
  const agePolicy = formatAgePolicy(venue?.ageRestriction);
  const isGa =
    org.nextEvent?.seatmap?.ga_only ||
    org.nextEvent?.venue?.isGeneralAdmissionOnly;
  const location = venueAddress(venue?.address);
  const subtitle = ["Live music venue", location || undefined]
    .filter(Boolean)
    .join(" · ");

  const stats: ProfileStat[] = [
    {
      value: String(org.upcomingEventsCount ?? 0),
      label: "upcoming shows",
    },
  ];
  if (capacity) {
    stats.push({
      value: capacity,
      label: isGa ? "standing room" : "capacity",
    });
  }
  if (agePolicy) {
    stats.push({ value: agePolicy, label: "age policy" });
  }

  return (
    <ProfileOrganizationCard
      org={org}
      className={className}
      fallbackBrand={MUSIC_FALLBACK_BRAND}
      subtitle={subtitle}
      stats={stats}
      upcomingLabel="next show"
      upcomingText={nextShowLabel(org.nextEvent)}
    />
  );
}

/** Browse / listing card for organizations. Sports/music use profile layouts. */
export default function OrganizationCard({
  org,
  className = "",
}: {
  org: OrganizationCardOrg;
  className?: string;
}) {
  if (isSportsCategory(org.category)) {
    return <SportsOrganizationCard org={org} className={className} />;
  }
  if (isMusicCategory(org.category)) {
    return <MusicOrganizationCard org={org} className={className} />;
  }

  const cityState =
    venueAddress(org.homeVenue?.address) ||
    venueAddress(org.venues?.[0]?.address);
  const meta = [categoryLabel(org.category?.name) || undefined, cityState || undefined]
    .filter(Boolean)
    .join(" · ");
  const href = orgHref(org);
  if (!href) return null;

  return (
    <ProductCard
      href={href}
      title={org.name || "Organization"}
      meta={meta || undefined}
      image={org.image}
      className={className}
    />
  );
}
