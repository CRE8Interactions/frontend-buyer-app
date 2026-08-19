"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DateChip from "@/components/molecules/DateChip";
import { cardCls } from "@/components/molecules/Card";
import { ArrowRight } from "@/components/atoms/icons";
import {
  dateChip,
  eventPurchasePath,
  formatEventWhen,
  imageUrl,
  type ApiImage,
} from "@/lib/helpers";

export type EventCardAttraction = {
  name?: string;
  primary?: boolean;
  order?: number;
  artwork?: ApiImage;
};

export type EventCardEvent = {
  uuid?: string;
  id?: string | number;
  name?: string;
  title?: string;
  slug?: string;
  seoUrl?: string;
  shortCode?: string;
  shortcode?: string;
  start?: string;
  startDate?: string;
  image?: ApiImage;
  attractions?: EventCardAttraction[];
  venue?: {
    name?: string;
    timezone?: string;
    isGeneralAdmissionOnly?: boolean;
  };
  seatmap?: { ga_only?: boolean };
  isGeneralAdmissionOnly?: boolean;
  generalAdmissionOnly?: boolean;
};

function getMatchup(attractions?: EventCardAttraction[]) {
  if (!attractions || attractions.length !== 2) return null;

  const sorted = [...attractions].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );
  const home = sorted.find((a) => a.primary) ?? sorted[0];
  const away = sorted.find((a) => a !== home) ?? sorted[1];
  if (!home?.name || !away?.name) return null;

  return { home, away };
}

/** Sample logo brand color via server route (avoids CDN CORS tainting canvas). */
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

function MatchupPanel({
  name,
  artwork,
  side,
  fallbackColor,
}: {
  name: string;
  artwork?: ApiImage;
  side: "away" | "home";
  fallbackColor: string;
}) {
  const src = imageUrl(artwork);
  const [bg, setBg] = useState(fallbackColor);

  useEffect(() => {
    let cancelled = false;
    sampleBrandColor(src, fallbackColor).then((color) => {
      if (!cancelled) setBg(color);
    });
    return () => {
      cancelled = true;
    };
  }, [src, fallbackColor]);

  const isAway = side === "away";

  return (
    <div
      className={`absolute inset-0 ${isAway ? "z-[2]" : "z-[1]"}`}
      style={{
        clipPath: isAway
          ? "polygon(0 0, 58% 0, 42% 100%, 0 100%)"
          : "polygon(58% 0, 100% 0, 100% 100%, 42% 100%)",
        backgroundColor: bg,
        filter: isAway
          ? "drop-shadow(3px 0 6px rgba(0,0,0,0.35))"
          : undefined,
      }}
      aria-hidden={!isAway}
    >
      <div
        className={`absolute top-1/2 flex -translate-y-1/2 items-center justify-center ${
          isAway
            ? "left-[4%] right-[42%] sm:left-[6%] sm:right-[44%]"
            : "left-[42%] right-[4%] sm:left-[44%] sm:right-[6%]"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={name}
          className="h-[72px] w-[72px] object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.35)] transition-transform duration-500 group-hover:scale-[1.04] sm:h-[88px] sm:w-[88px]"
        />
      </div>
    </div>
  );
}

/** Reusable event listing card — image, date chip, title, venue, purchase link. */
export default function EventCard({
  event,
  href,
  className = "",
}: {
  event: EventCardEvent;
  href?: string;
  className?: string;
}) {
  const title = event.name || event.title || "Event";
  const start = event.start || event.startDate;
  const timezone = event.venue?.timezone;
  const chip = dateChip(start, timezone);
  const when = formatEventWhen(start, timezone);
  const to = href || eventPurchasePath(event);
  const matchup = getMatchup(event.attractions);

  return (
    <Link
      href={to}
      className={`${cardCls} group flex flex-col overflow-hidden transition-transform hover:-translate-y-0.5 ${className}`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[#06203c]">
        {matchup ? (
          <>
            <MatchupPanel
              side="home"
              name={matchup.home.name || "Home"}
              artwork={matchup.home.artwork}
              fallbackColor="#0d3d2e"
            />
            <MatchupPanel
              side="away"
              name={matchup.away.name || "Away"}
              artwork={matchup.away.artwork}
              fallbackColor="#1a4a7a"
            />
          </>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl(event.image)}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, transparent 40%, rgba(5,27,53,0.85) 100%)",
              }}
              aria-hidden
            />
          </>
        )}
        <div className="absolute bottom-3 left-3 z-[3]">
          <DateChip month={chip.m} day={chip.d} />
        </div>
      </div>
      <div className="flex flex-1 items-start gap-3 p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-[16px] font-semibold leading-snug tracking-[-0.01em]">
            {title}
          </h3>
          {when && (
            <p className="mt-1.5 text-[13px] text-[#9DA2B3]">{when}</p>
          )}
          {event.venue?.name && (
            <p className="mt-0.5 truncate text-[13px] text-[#BCBFCC]">
              {event.venue.name}
            </p>
          )}
        </div>
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-white transition-transform group-hover:translate-x-0.5"
          aria-hidden
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
