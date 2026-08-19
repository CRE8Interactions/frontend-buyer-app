"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import AppShell from "@/components/templates/AppShell";
import EmptyState from "@/components/molecules/EmptyState";
import PageLoader from "@/components/molecules/PageLoader";
import EventCard, { type EventCardEvent } from "@/components/organisms/EventCard";
import ProductCard from "@/components/organisms/ProductCard";
import { getOrganizationStorefront } from "@/lib/api";
import { packageFromPriceLabel } from "@/lib/eventFromPrice";
import {
  formatCurrency,
  formatEventWhen,
  imageUrl,
  sortByDate,
  type ApiImage,
} from "@/lib/helpers";
import { formatVenueCityState } from "@/lib/venueLocation";
import {
  initializeTracking,
  type TrackingOrganization,
} from "@/lib/tracking";

type Org = TrackingOrganization & {
  name?: string;
  slug?: string;
  image?: ApiImage;
};

type PackageItem = {
  uuid?: string;
  id?: number | string;
  name?: string;
  start?: string;
  end?: string;
  image?: ApiImage;
  pricingTiers?: { price?: number }[];
  venue?: { timezone?: string };
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
  venue?: { timezone?: string };
};

type VenueItem = {
  uuid?: string;
  id?: number | string;
  name?: string;
  slug?: string;
  image?: ApiImage | ApiImage[];
  address?: { city?: string; state?: string };
};

export default function OrgStorefrontClient({ slug }: { slug: string }) {
  const [organization, setOrganization] = useState<Org | null>(null);
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [events, setEvents] = useState<EventCardEvent[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [flexPacks, setFlexPacks] = useState<FlexPackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFoundOrg, setNotFoundOrg] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getOrganizationStorefront(slug)
      .then((res) => {
        if (cancelled) return;
        const data = res.data as {
          organization?: Org | null;
          venues?: VenueItem[];
          events?: EventCardEvent[];
          packages?: PackageItem[];
          flexPacks?: FlexPackItem[];
        };
        if (!data?.organization) {
          setNotFoundOrg(true);
          return;
        }
        setOrganization(data.organization);
        initializeTracking(data.organization);
        setVenues(data.venues || []);
        setEvents(sortByDate(data.events || []));
        setPackages(data.packages || []);
        setFlexPacks(data.flexPacks || []);
      })
      .catch(() => {
        if (!cancelled) setNotFoundOrg(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <AppShell>
        <PageLoader message="Loading storefront…" label="Loading storefront" />
      </AppShell>
    );
  }

  if (notFoundOrg || !organization) {
    notFound();
  }

  const primaryTz =
    venues[0] && "timezone" in venues[0]
      ? (venues[0] as { timezone?: string }).timezone
      : events[0]?.venue?.timezone;

  return (
    <AppShell>
      <div className="pb-16">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
          {organization.image && (
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/12 bg-[#06203c] p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl(organization.image)}
                alt=""
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#9DA2B3]">
              Organization
            </p>
            <h1 className="mt-2 text-[clamp(32px,4vw,44px)] font-semibold tracking-[-0.02em]">
              {organization.name}
            </h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[#9DA2B3]">
              Browse and buy tickets, season passes, and flex packs for{" "}
              {organization.name}.
            </p>
          </div>
        </div>

        <section className="mt-12">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#9DA2B3]">
            Upcoming events
          </h2>
          {events.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <rect x="3" y="5" width="18" height="16" rx="2.5" />
                    <path d="M3 10h18M8 3v4M16 3v4" />
                  </svg>
                }
              >
                No upcoming events.
              </EmptyState>
            </div>
          ) : (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <EventCard
                  key={String(event.uuid || event.shortCode || event.name)}
                  event={event}
                />
              ))}
            </div>
          )}
        </section>

        {packages.length > 0 && (
          <section className="mt-14">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#9DA2B3]">
              Season passes
            </h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {packages.map((pkg) => {
                const tz = pkg.venue?.timezone || primaryTz;
                const meta =
                  pkg.start && pkg.end
                    ? `${formatEventWhen(pkg.start, tz, "MMM D, YYYY")} – ${formatEventWhen(pkg.end, tz, "MMM D, YYYY")}`
                    : undefined;
                const from = packageFromPriceLabel(pkg);
                return (
                  <ProductCard
                    key={String(pkg.uuid || pkg.id)}
                    href={`/${slug}/package/${pkg.uuid}/`}
                    title={pkg.name || "Package"}
                    meta={meta}
                    price={from ? `From ${from}` : undefined}
                    image={pkg.image}
                  />
                );
              })}
            </div>
          </section>
        )}

        {flexPacks.length > 0 && (
          <section className="mt-14">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#9DA2B3]">
              Flex packs
            </h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {flexPacks.map((fp) => {
                const tz = fp.venue?.timezone || primaryTz;
                const meta = [
                  fp.gameTickets != null ? `${fp.gameTickets} vouchers` : null,
                  fp.start && fp.end
                    ? `${formatEventWhen(fp.start, tz, "MMM D, YYYY")} – ${formatEventWhen(fp.end, tz, "MMM D, YYYY")}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <ProductCard
                    key={String(fp.uuid || fp.id)}
                    href={`/${slug}/flex-pack/${fp.uuid}/`}
                    title={fp.name || "Flex pack"}
                    meta={meta || undefined}
                    price={
                      fp.price != null
                        ? `From ${formatCurrency(fp.price)}`
                        : undefined
                    }
                    image={fp.image}
                  />
                );
              })}
            </div>
          </section>
        )}

        {venues.length > 0 && (
          <section className="mt-14">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#9DA2B3]">
              Venues
            </h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {venues.map((venue) => {
                const cityState = formatVenueCityState(venue.address);
                return (
                  <ProductCard
                    key={String(venue.uuid || venue.id || venue.slug)}
                    href={`/venue/${venue.slug}/`}
                    title={venue.name || "Venue"}
                    meta={cityState || undefined}
                    image={venue.image}
                  />
                );
              })}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
