"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import BrandedNotice from "@/components/molecules/BrandedNotice";
import RouteLoader from "@/components/molecules/RouteLoader";
import PremiumTicketing, {
  type GATier,
  type TicketingData,
} from "@/components/organisms/PremiumTicketing";
import { getEventByShortCode, getTicketGroups } from "@/lib/api";
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
import {
  normalizeGlobalTicketLimit,
  quantityLimits,
  quantityRestrictionLabel,
} from "@/lib/ticketListings";
import useWaitingRoomHeartbeat from "@/hooks/useWaitingRoomHeartbeat";
import {
  getWaitingRoomPath,
  hasValidWaitingRoomToken,
  isWaitingRoomRequired,
  rememberWaitingRoomEntry,
} from "@/lib/waitingRoom";

type RawGroup = {
  id?: string | number;
  GA?: boolean;
  price?: number;
  availableCount?: number;
  sectionName?: string;
  ticketGroupUUID?: string;
  eventUUID?: string;
  offer?: {
    id?: string | number;
    name?: string;
    isDefaultOffer?: boolean;
    minQuantity?: number | null;
    maxQuantity?: number | null;
    multipleOf?: number | null;
    incrementsOf?: number | null;
    limit?: number | null;
    accessCode?: string | null;
    freeOffer?: boolean | null;
  };
  [key: string]: unknown;
};

type EventData = {
  id?: string | number;
  uuid?: string;
  name?: string;
  slug?: string;
  seoUrl?: string;
  shortCode?: string;
  globalTicketLimit?: number | string | null;
  waitingRoomEnabled?: boolean | null;
  start?: string;
  doorsOpen?: string;
  realDoorsOpen?: string;
  summary?: string;
  image?: ApiImage;
  attractions?: Array<{ name?: string; primary?: boolean; artwork?: { url?: string } }>;
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
    timezone?: TimezoneLike;
    image?: unknown;
    address?: Array<{ address_1?: string; city?: string; state?: string; zipcode?: string }>;
  };
};

const titleCase = (s?: string) =>
  (s || "").split(" ").filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

function imageOf(img: unknown): string | null {
  if (!img) return null;
  if (typeof img === "string") return img;
  const o = img as { url?: string; formats?: { small?: { url?: string }; thumbnail?: { url?: string } } };
  return o.url || o.formats?.small?.url || o.formats?.thumbnail?.url || null;
}

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

/** Map Strapi GA ticket groups into checkout-ready tier cards. */
function groupsToGaTiers(
  groups: RawGroup[],
  globalMax?: number | null,
): GATier[] {
  const seen = new Set<string>();

  return groups
    .filter((g) => !g.offer?.accessCode)
    .filter((g) => {
      const key = `${g.id ?? g.ticketGroupUUID}-${g.offer?.id ?? "default"}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((g) => {
      const available = Number(g.availableCount || 0);
      const unit = Number(g.price || 0);
      const offerName = g.offer?.name || g.sectionName || "Standard admission";
      const limits = quantityLimits(g.offer, {
        available,
        defaultMax: 100,
        globalMax,
      });
      // Drained inventory is what sells a tier out. An offer flagged sold out
      // never reaches the page, so there is nothing else to read here.
      const soldout = available <= 0;
      const section = g.sectionName || "General admission";

      return {
        name: offerName,
        sub: `${section} · unreserved seating`,
        price: unit === 0 || g.offer?.freeOffer ? "Free" : money(unit),
        unit,
        note: `Ticket limit: ${quantityRestrictionLabel(limits)}`,
        state: soldout ? "soldout" : "live",
        min: limits.min,
        max: limits.max,
        multipleOf: limits.step,
        cartGroup: g as Record<string, unknown>,
      } satisfies GATier;
    })
    .filter((tier) => tier.state === "soldout" || tier.min <= tier.max)
    .sort((a, b) => {
      const rank = { live: 0, scheduled: 1, soldout: 2 };
      return rank[a.state] - rank[b.state];
    });
}

function toGaData(
  ev: EventData,
  groups: RawGroup[],
  soldOut: boolean,
  scheduled: boolean,
  scheduledTime?: string | null,
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
  const venueAddress = [addr?.address_1, city, state, addr?.zipcode].filter(Boolean).join(", ");
  const home = ev.attractions?.find((a) => a.primary) || ev.attractions?.[0];
  const away = ev.attractions?.find((a) => a !== home);
  const orgLabel = ev.organization?.name || "Blocktickets";
  const poster = imageOf(ev.image);
  const gaTiers = groupsToGaTiers(
    groups,
    normalizeGlobalTicketLimit(ev.globalTicketLimit),
  );
  const theme = brandingToTicketingTheme(ev, ev.organization, poster);

  return {
    ...theme,
    eventId: ev.id,
    eventType: "ga",
    listings: [],
    gaTiers: gaTiers.length ? gaTiers : undefined,
    soldOut,
    scheduled,
    scheduledAt: scheduledTime
      ? formatEventWhen(scheduledTime, tz) || scheduledTime
      : undefined,
    eventName: ev.name || "Event",
    whenLong: whenLong || when,
    whenShort: eventWhenShortWithDoors(ev.start, doorsIso, tz),
    whenPlain: when,
    doorsLine: whenLong || when,
    venueName,
    venueLine,
    venueAddress: venueAddress || venueLine,
    venueCityState,
    mapsQuery: `${venueName} ${city} ${state}`.trim(),
    logoSrc: imageOf(home?.artwork) || theme.logoSrc,
    posterSrc: poster || theme.brandLogoSrc,
    venuePhotoSrc: imageOf(ev.venue?.image) || poster || undefined,
    orgLabel,
    providerLabel: `Official ticketing marketplace for ${orgLabel}`,
    aboutText:
      ev.summary ||
      `General admission for ${ev.name}. Gates open one hour before start — mobile tickets, verified inventory, all-in pricing.`,
    homeLabel: home?.name || orgLabel,
    awayLabel: away?.name || "Visitor",
    awayShort: (away?.name || "AWAY").slice(0, 3).toUpperCase(),
  };
}

function GAEvent() {
  const params = useParams<{ slug: string; shortcode: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code") || "0";

  const [ev, setEv] = useState<EventData | null>(null);
  const [groups, setGroups] = useState<RawGroup[]>([]);
  const [soldOut, setSoldOut] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [leavingForWaitingRoom, setLeavingForWaitingRoom] = useState(false);
  const [error, setError] = useState("");

  useWaitingRoomHeartbeat(
    ev?.uuid,
    isWaitingRoomRequired(ev) && hasValidWaitingRoomToken(ev?.uuid),
  );

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
        cacheEventBranding(event, event.organization);
        if (
          event.uuid &&
          isWaitingRoomRequired(event) &&
          !hasValidWaitingRoomToken(event.uuid)
        ) {
          const returnPath = `${window.location.pathname}${window.location.search}`;
          rememberWaitingRoomEntry({
            eventUuid: event.uuid,
            destination: "ga",
            returnPath,
          });
          setLeavingForWaitingRoom(true);
          router.replace(
            getWaitingRoomPath(params.slug, params.shortcode),
          );
          return;
        }
        setEv(event);
        try {
          const gr = await getTicketGroups({
            event,
            quantity: 0,
            offerIds: [],
            priceRange: [0, 500],
            accessCodes: [],
            accessible: false,
            sort: "price",
            returnLocked: true,
          });
          if (!cancelled) {
            setGroups((gr.data?.ticketGroups || []) as RawGroup[]);
            setSoldOut(Boolean(gr.data?.soldout));
            setScheduled(Boolean(gr.data?.isScheduled));
            setScheduledTime(gr.data?.scheduledTime || null);
          }
        } catch {
          if (!cancelled) setGroups([]);
        }
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
  }, [params.shortcode, params.slug, code, router]);

  const data = useMemo(
    () =>
      ev
        ? toGaData(ev, groups, soldOut, scheduled, scheduledTime)
        : null,
    [ev, groups, soldOut, scheduled, scheduledTime],
  );

  const theme = ev ? brandingToTicketingTheme(ev, ev.organization) : null;
  const noticeBranding = theme && {
    primaryColor: theme.accent,
    logoSrc: theme.brandLogoSrc,
    name: ev?.organization?.name,
    slug: ev?.organization?.slug,
  };

  if (loading || leavingForWaitingRoom) {
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
      <BrandedNotice
        title="Event unavailable"
        message={error || "Event not found."}
        branding={noticeBranding}
      />
    );
  }
  // A sold-out event keeps its page and swaps the ticket card for the waitlist.
  // Anything else with no tiers has nothing to say, so the notice takes over.
  if (!data.gaTiers?.length && !soldOut && !scheduled) {
    return (
      <BrandedNotice
        title="No tickets on sale"
        message="No ticket inventory is currently on sale for this event."
        branding={noticeBranding}
      />
    );
  }
  return <PremiumTicketing data={data} />;
}

export default function GAEventRoute() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <GAEvent />
    </Suspense>
  );
}
