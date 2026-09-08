"use client";

import Link from "next/link";
import {
  eventSearchName,
  formatSearchEventWhen,
  searchEventHref,
  searchEventImageSrc,
  searchResultsHref,
  type ShopperSearchEvent,
} from "@/lib/searchEvents";

export function SearchEventRow({
  event,
  onSelect,
}: {
  event: ShopperSearchEvent;
  onSelect?: () => void;
}) {
  const when = formatSearchEventWhen(event);
  const venue = event.venue?.name;
  const meta = [when, venue].filter(Boolean).join(" | ");

  return (
    <Link
      href={searchEventHref(event)}
      onClick={onSelect}
      className="flex items-center gap-3 rounded-xl px-2 py-2 text-[#051b35] no-underline hover:bg-[#f1f3f8]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={searchEventImageSrc(event)}
        alt=""
        className="h-12 w-12 shrink-0 rounded-lg object-cover bg-[#eef1f6]"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold">
          {eventSearchName(event)}
        </span>
        {meta ? (
          <span className="mt-0.5 block truncate text-[12px] text-[#6e7180]">
            {meta}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export default function SearchEventList({
  events,
  query,
  showSeeAll = false,
  onSelect,
}: {
  events: ShopperSearchEvent[];
  query?: string;
  showSeeAll?: boolean;
  onSelect?: () => void;
}) {
  return (
    <div>
      <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a93a3]">
        Events
      </p>
      <div className="flex flex-col gap-0.5">
        {events.map((event, index) => (
          <SearchEventRow
            key={String(event.uuid || event.id || event.shortCode || index)}
            event={event}
            onSelect={onSelect}
          />
        ))}
      </div>
      {showSeeAll && query?.trim() ? (
        <Link
          href={searchResultsHref(query)}
          onClick={onSelect}
          className="mt-2 block rounded-xl px-3 py-2 text-center text-[13px] font-semibold text-[#051b35] no-underline hover:bg-[#f1f3f8]"
        >
          See all results
        </Link>
      ) : null}
    </div>
  );
}
