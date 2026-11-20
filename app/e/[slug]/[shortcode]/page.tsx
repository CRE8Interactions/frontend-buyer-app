"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import BrandLoader from "@/components/molecules/BrandLoader";
import PremiumTicketing, {
  NM_STATE_DATA,
  type TicketingData,
} from "@/components/organisms/PremiumTicketing";
import { getEventByShortCode } from "@/lib/api";
import { formatEventWhen } from "@/lib/helpers";

type EventData = {
  name?: string;
  start?: string;
  doorsOpen?: string;
  summary?: string;
  image?: unknown;
  attractions?: Array<{ name?: string; primary?: boolean; artwork?: { url?: string } }>;
  organization?: { name?: string };
  venue?: { name?: string; timezone?: string; image?: unknown; address?: Array<{ address_1?: string; city?: string; state?: string; zipcode?: string }> };
};

const titleCase = (s?: string) =>
  (s || "").split(" ").filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

function imageOf(img: unknown): string | null {
  if (!img) return null;
  if (typeof img === "string") return img;
  const o = img as { url?: string; formats?: { small?: { url?: string }; thumbnail?: { url?: string } } };
  return o.url || o.formats?.small?.url || o.formats?.thumbnail?.url || null;
}

function formatDoors(iso?: string, tz?: string) {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz || undefined }).format(new Date(iso));
  } catch {
    return null;
  }
}

function toGaData(ev: EventData): TicketingData {
  const tz = ev.venue?.timezone;
  const when = formatEventWhen(ev.start, tz) || "";
  const doors = formatDoors(ev.doorsOpen, tz);
  const whenLong = [when, doors ? `Doors ${doors}` : null].filter(Boolean).join(" · ");
  const addr = ev.venue?.address?.[0];
  const city = titleCase(addr?.city);
  const state = (addr?.state || "").toUpperCase();
  const venueName = ev.venue?.name || "Venue";
  const venueCityState = [city, state].filter(Boolean).join(", ");
  const venueLine = [venueName, venueCityState].filter(Boolean).join(", ");
  const venueAddress = [addr?.address_1, city, state, addr?.zipcode].filter(Boolean).join(", ");
  const home = ev.attractions?.find((a) => a.primary) || ev.attractions?.[0];
  const away = ev.attractions?.find((a) => a !== home);
  const orgLabel = ev.organization?.name || "Blocktickets";
  const poster = imageOf(ev.image);

  return {
    ...NM_STATE_DATA,
    eventType: "ga",
    eventName: ev.name || "Event",
    whenLong: whenLong || when,
    whenShort: [when.replace(/\s\d{1,2}:\d{2}\s?[AP]M/i, ""), doors ? `Doors ${doors}` : null].filter(Boolean).join(" · "),
    whenPlain: when,
    doorsLine: whenLong || when,
    venueName,
    venueLine,
    venueAddress: venueAddress || venueLine,
    venueCityState,
    mapsQuery: `${venueName} ${venueCityState}`.trim(),
    logoSrc: imageOf(home?.artwork) || poster || NM_STATE_DATA.logoSrc,
    brandLogoSrc: NM_STATE_DATA.logoSrc,
    posterSrc: poster || NM_STATE_DATA.logoSrc,
    venuePhotoSrc: imageOf(ev.venue?.image) || poster || undefined,
    orgLabel,
    aboutText:
      ev.summary ||
      `General admission for ${ev.name}. Gates open one hour before start — mobile tickets, verified inventory, all-in pricing.`,
    homeLabel: home?.name || orgLabel,
    awayLabel: away?.name || "Visitor",
    awayShort: (away?.name || "AWAY").slice(0, 3).toUpperCase(),
    // gaTiers omitted → component uses the designed default tiers (on-sale / scheduled / sold-out)
  };
}

function GAEvent() {
  const params = useParams<{ slug: string; shortcode: string }>();
  const searchParams = useSearchParams();
  const code = searchParams.get("code") || "0";

  const [ev, setEv] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    // Keep the branded loader up for a beat so it never flashes like a glitch.
    const started = Date.now();
    const MIN_MS = 1100;
    setLoading(true);
    getEventByShortCode(params.shortcode, params.slug, code)
      .then((res) => {
        if (cancelled) return;
        if (res.data?.status === 404 || !res.data?.event) {
          setError("This event page could not be found.");
          return;
        }
        setEv(res.data.event as EventData);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load this event.");
      })
      .finally(() => {
        if (cancelled) return;
        const wait = Math.max(0, MIN_MS - (Date.now() - started));
        setTimeout(() => { if (!cancelled) setLoading(false); }, wait);
      });
    return () => {
      cancelled = true;
    };
  }, [params.shortcode, params.slug, code]);

  const data = useMemo(() => (ev ? toGaData(ev) : null), [ev]);

  if (loading) return <BrandLoader variant="tenant" accent={NM_STATE_DATA.accent} logoSrc={NM_STATE_DATA.logoSrc} name="NM State Athletics" message="Loading Aggie tickets" />;
  if (error || !data) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#9DA2B3" }}>
        {error || "Event not found."}
      </div>
    );
  }
  return <PremiumTicketing data={data} />;
}

export default function GAEventRoute() {
  return (
    <Suspense fallback={<BrandLoader variant="tenant" accent={NM_STATE_DATA.accent} logoSrc={NM_STATE_DATA.logoSrc} name="NM State Athletics" message="Loading Aggie tickets" />}>
      <GAEvent />
    </Suspense>
  );
}
