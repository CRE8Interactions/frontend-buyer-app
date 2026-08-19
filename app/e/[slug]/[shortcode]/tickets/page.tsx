"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import RouteLoader from "@/components/molecules/RouteLoader";
import PremiumTicketing, {
  type TicketingData,
  type TicketingFilters,
} from "@/components/organisms/PremiumTicketing";
import {
  getEventByShortCode,
  getOffers,
  getSeatmapByShortCode,
  getTicketGroups,
} from "@/lib/api";
import { brandingToTicketingTheme, type OrgBranding } from "@/lib/branding";
import { cacheEventBranding } from "@/lib/orgBrandingCache";
import {
  eventDoorsIso,
  eventWhenShortWithDoors,
  eventWhenWithDoors,
  formatEventWhen,
  type ApiImage,
  type TimezoneLike,
} from "@/lib/helpers";
import {
  formatVenueCityState,
  formatVenueLocationLine,
} from "@/lib/venueLocation";
import type {
  SeatmapBackground,
  SeatmapMapping,
} from "@/lib/seatmapLookups";
import {
  createSeatLookupTables,
  createSectionLookupTable,
  normalizeSeatmapBackground,
} from "@/lib/seatmapLookups";
import {
  groupsToListings,
  type RawTicketGroup as RawGroup,
} from "@/lib/ticketListings";
import useFiltersStore from "@/stores/filtersStore";
import useSeatmapStore from "@/stores/seatmapStore";

type EventData = {
  id?: string | number;
  uuid?: string;
  name?: string;
  start?: string;
  doorsOpen?: string;
  realDoorsOpen?: string;
  summary?: string;
  image?: ApiImage;
  shortCode?: string;
  seoUrl?: string;
  slug?: string;
  attractions?: Array<{
    name?: string;
    primary?: boolean;
    artwork?: { url?: string };
  }>;
  branding?: OrgBranding | null;
  organization?: {
    name?: string;
    slug?: string;
    branding?: OrgBranding | null;
    primaryColor?: string;
    accentColor?: string;
    brandColor?: string;
    image?: ApiImage;
    logo?: ApiImage;
    logoUrl?: string;
  };
  venue?: {
    name?: string;
    slug?: string;
    timezone?: TimezoneLike;
    address?: Array<{
      address_1?: string;
      city?: string;
      state?: string;
      zipcode?: string;
    }>;
  };
};

const titleCase = (s?: string) =>
  (s || "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

function toTicketingData(
  ev: EventData,
  groups: RawGroup[],
  seatmap: {
    background: SeatmapBackground | null;
    mapping: SeatmapMapping | null;
  },
  offerNames: string[],
): TicketingData {
  const tz = ev.venue?.timezone;
  const doorsIso = eventDoorsIso(ev);
  const when = formatEventWhen(ev.start, tz) || "";
  const whenLong = eventWhenWithDoors(ev.start, doorsIso, tz);
  const addr = ev.venue?.address?.[0];
  const city = titleCase(addr?.city);
  const state = (addr?.state || "").toUpperCase();
  const venueName = ev.venue?.name || "Venue";
  const venueLine = formatVenueLocationLine(venueName, ev.venue?.address);
  const venueCityState = formatVenueCityState(ev.venue?.address);
  const venueAddress = [addr?.address_1, city, state, addr?.zipcode]
    .filter(Boolean)
    .join(", ");
  const home = ev.attractions?.find((a) => a.primary) || ev.attractions?.[0];
  const away = ev.attractions?.find((a) => a !== home);
  const orgLabel = ev.organization?.name || "Blocktickets";
  const listings = groupsToListings(groups);
  const theme = brandingToTicketingTheme(ev, ev.organization, imageOf(ev.image));

  return {
    ...theme,
    eventId: ev.id,
    eventName: ev.name || "Event",
    whenLong: whenLong || when,
    whenShort: eventWhenShortWithDoors(ev.start, doorsIso, tz),
    whenPlain: when,
    doorsLine: whenLong || when,
    venueName,
    venueSlug: ev.venue?.slug || undefined,
    venueLine,
    venueAddress: venueAddress || venueLine,
    venueCityState,
    mapsQuery: `${venueName} ${city} ${state}`.trim(),
    logoSrc: imageOf(ev.image) || theme.logoSrc,
    orgLabel,
    providerLabel: `Official ticketing marketplace for ${orgLabel}`,
    aboutText:
      ev.summary ||
      `Secure your seats for ${ev.name}. Mobile tickets delivered to your account, verified inventory, and all-in pricing with no surprises at checkout.`,
    homeLabel: home?.name || orgLabel,
    awayLabel: away?.name || "Visitor",
    awayShort: (away?.name || "AWAY").slice(0, 3).toUpperCase(),
    listings,
    lockedZones: [],
    mapBackground: seatmap.background,
    seatmapMapping: seatmap.mapping,
    offerNames,
  };
}

function imageOf(img: unknown): string | null {
  if (!img) return null;
  if (typeof img === "string") return img;
  const o = img as {
    url?: string;
    formats?: { small?: { url?: string }; thumbnail?: { url?: string } };
  };
  return o.url || o.formats?.small?.url || o.formats?.thumbnail?.url || null;
}

function hydrateSeatmapStores(
  event: EventData,
  groups: RawGroup[],
  seatmapRaw: {
    mapping?: SeatmapMapping;
    background?: unknown;
    id?: string | number;
    seat_border_radius?: number;
    max_scale?: number;
  } | null,
) {
  const {
    setEvent,
    setTicketGroups,
    setLoadingTicketGroups,
    setEventTicketLimit,
  } = useFiltersStore.getState();
  const {
    setData,
    setBackground,
    setSeatmapId,
    setSeatBorderRadius,
    setMaxScale,
    setSeatLookupTable,
    setSeatOffersLookupTable,
    setSectionLookupTable,
    resetMapState,
  } = useSeatmapStore.getState();

  resetMapState();
  setEvent({
    venue: event.venue,
    organization: event.organization,
    name: event.name,
    id: event.id,
    uuid: event.uuid,
  });
  setTicketGroups(groups);
  setLoadingTicketGroups(false);
  setEventTicketLimit(null);

  const mapping = (seatmapRaw?.mapping || null) as SeatmapMapping | null;
  setData(mapping);
  setBackground(normalizeSeatmapBackground(seatmapRaw?.background));
  if (seatmapRaw?.id != null) setSeatmapId(seatmapRaw.id);
  if (seatmapRaw?.seat_border_radius != null) {
    setSeatBorderRadius(seatmapRaw.seat_border_radius);
  }
  if (seatmapRaw?.max_scale != null) setMaxScale(seatmapRaw.max_scale);

  const { lookupTable, offersLookupTable } = createSeatLookupTables(groups);
  setSeatLookupTable(lookupTable);
  setSeatOffersLookupTable(offersLookupTable);
  setSectionLookupTable(createSectionLookupTable(groups));
}

/**
 * The seatmap needs every sellable seat, so the first fetch asks for all of
 * them: a quantity-filtered response only enumerates seats that fit that group
 * size, which leaves the map with nothing to paint.
 */
const BASELINE_FILTERS: TicketingFilters = {
  quantity: 0,
  accessible: false,
  sort: "price",
};

function fetchInventory(event: EventData, filters: TicketingFilters) {
  return getTicketGroups({
    event,
    quantity: filters.quantity,
    offerIds: [],
    priceRange: [0, 500],
    accessCodes: [],
    accessible: filters.accessible,
    sort: filters.sort,
    returnLocked: true,
  }).catch(() => null);
}

function SeatedTickets() {
  const params = useParams<{ slug: string; shortcode: string }>();
  const searchParams = useSearchParams();
  const code = searchParams.get("code") || "0";

  const [ev, setEv] = useState<EventData | null>(null);
  const [groups, setGroups] = useState<RawGroup[]>([]);
  const [offerNames, setOfferNames] = useState<string[]>([]);
  const [seatmap, setSeatmap] = useState<{
    background: SeatmapBackground | null;
    mapping: SeatmapMapping | null;
  }>({ background: null, mapping: null });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasInventory, setHasInventory] = useState(true);
  const [error, setError] = useState("");
  const eventRef = useRef<EventData | null>(null);
  const refetchId = useRef(0);
  /** Unfiltered inventory — what the seatmap is painted from. */
  const baselineGroups = useRef<RawGroup[]>([]);

  useEffect(() => {
    let cancelled = false;
    const started = Date.now();
    const MIN_MS = 1100;
    setLoading(true);
    getEventByShortCode(params.shortcode, params.slug, code)
      .then(async (res) => {
        if (cancelled) return;
        if (res.data?.status === 404 || !res.data?.event) {
          setError("This event page could not be found.");
          return;
        }
        const event = res.data.event as EventData;
        setEv(event);
        eventRef.current = event;
        cacheEventBranding(event, event.organization);

        const [groupsRes, seatmapRes, offersRes] = await Promise.all([
          fetchInventory(event, BASELINE_FILTERS),
          getSeatmapByShortCode(params.shortcode, params.slug).catch(
            () => null,
          ),
          event.uuid
            ? getOffers(event.uuid).catch(() => null)
            : Promise.resolve(null),
        ]);
        if (cancelled) return;

        const nextGroups = (groupsRes?.data?.ticketGroups || []) as RawGroup[];
        const seatmapRaw = (seatmapRes?.data || null) as {
          mapping?: SeatmapMapping;
          background?: unknown;
          id?: string | number;
          seat_border_radius?: number;
          max_scale?: number;
        } | null;

        setGroups(nextGroups);
        baselineGroups.current = nextGroups;
        setHasInventory(nextGroups.length > 0);
        setOfferNames(
          ((offersRes?.data?.offers || []) as Array<{
            name?: string;
            isLocked?: boolean;
          }>)
            .filter((o) => o.name && !o.isLocked)
            .map((o) => o.name as string),
        );
        setSeatmap({
          background: normalizeSeatmapBackground(seatmapRaw?.background),
          mapping: (seatmapRaw?.mapping || null) as SeatmapMapping | null,
        });
        hydrateSeatmapStores(event, nextGroups, seatmapRaw);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load this event.");
      })
      .finally(() => {
        if (cancelled) return;
        const wait = Math.max(0, MIN_MS - (Date.now() - started));
        setTimeout(() => {
          if (!cancelled) setLoading(false);
        }, wait);
      });
    return () => {
      cancelled = true;
    };
  }, [params.shortcode, params.slug, code]);

  /**
   * Refetch the listing rows for the shopper's filters. Only the list changes:
   * the seatmap keeps the unfiltered baseline so its seats never disappear, and
   * an empty filtered response falls back to it rather than blanking the page.
   */
  const handleFiltersChange = useCallback(async (filters: TicketingFilters) => {
    const event = eventRef.current;
    if (!event) return;
    const requestId = refetchId.current + 1;
    refetchId.current = requestId;
    setRefreshing(true);
    const res = await fetchInventory(event, filters);
    // A newer filter change already went out — its response wins.
    if (refetchId.current !== requestId) return;

    const nextGroups = (res?.data?.ticketGroups || []) as RawGroup[];
    const usable = groupsToListings(nextGroups).length > 0;
    setGroups(usable ? nextGroups : baselineGroups.current);
    setRefreshing(false);
  }, []);

  const data = useMemo(
    () => (ev ? toTicketingData(ev, groups, seatmap, offerNames) : null),
    [ev, groups, seatmap, offerNames],
  );

  if (loading) {
    const theme = ev ? brandingToTicketingTheme(ev, ev.organization) : null;
    return (
      <RouteLoader
        branding={
          theme && {
            primaryColor: theme.accent,
            logoSrc: theme.brandLogoSrc,
            name: ev?.organization?.name,
          }
        }
      />
    );
  }
  if (error || !data) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#9DA2B3",
        }}
      >
        {error || "Event not found."}
      </div>
    );
  }
  if (!hasInventory) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#9DA2B3",
          padding: 24,
          textAlign: "center",
        }}
      >
        No ticket inventory is currently on sale for this event.
      </div>
    );
  }
  return (
    <PremiumTicketing
      data={data}
      onFiltersChange={handleFiltersChange}
      refreshing={refreshing}
    />
  );
}

export default function SeatedTicketsRoute() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <SeatedTickets />
    </Suspense>
  );
}
