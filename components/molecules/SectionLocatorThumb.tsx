"use client";

import { useEffect, useMemo, useState } from "react";
import type { SeatmapBackground, SeatmapMapping } from "@/lib/seatmapLookups";
import { SeatMapThumb } from "@/components/organisms/SeatMap";

type Pin = { cx: number; cy: number };

/** Average seat position for a section — used as the listing map pin. */
export function sectionPin(
  mapping: SeatmapMapping | null | undefined,
  sectionId?: string | null,
  sectionNumber?: string | number | null,
): Pin | null {
  const seats = Object.values(mapping?.seats || {});
  if (!seats.length) return null;

  const id = sectionId ? String(sectionId) : "";
  const num = sectionNumber != null ? String(sectionNumber).toLowerCase() : "";
  const matched = seats.filter((seat) => {
    if (id && String(seat.sectionId) === id) return true;
    if (num && String(seat.sectionNumber || "").toLowerCase() === num) return true;
    return false;
  });
  const pool = matched.length ? matched : [];
  if (!pool.length) return null;

  const cx = pool.reduce((sum, seat) => sum + seat.cx, 0) / pool.length;
  const cy = pool.reduce((sum, seat) => sum + seat.cy, 0) / pool.length;
  return { cx, cy };
}

function CandidateThumbnail({
  candidates,
  alt,
  className,
  onExhausted,
}: {
  candidates: string[];
  alt: string;
  className?: string;
  onExhausted: () => void;
}) {
  const [index, setIndex] = useState(0);
  const key = candidates.join("|");

  useEffect(() => {
    setIndex(0);
  }, [key]);

  if (!candidates.length) {
    return null;
  }

  const src = candidates[Math.min(index, candidates.length - 1)];

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => {
        const next = index + 1;
        if (next < candidates.length) setIndex(next);
        else onExhausted();
      }}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        display: "block",
        background: "#edeff7",
      }}
    />
  );
}

/**
 * Listing / sidebar locator: real venue seatmap background with a pin on the
 * section. Falls back to the generic ballpark thumb when no map is loaded.
 */
export default function SectionLocatorThumb({
  background,
  mapping,
  sectionId,
  sectionNumber,
  section,
  pinColor = "#2563eb",
  thumbnailSrc,
  thumbnailCandidates,
  className = "",
}: {
  background?: SeatmapBackground | null;
  mapping?: SeatmapMapping | null;
  sectionId?: string | null;
  sectionNumber?: string | number | null;
  /** Letter used by the generic fallback thumb (A–N / GA). */
  section?: string;
  pinColor?: string;
  /** Pre-rendered venue/section thumbnail from the legacy ticket-image bucket. */
  thumbnailSrc?: string | null;
  /** CDN image candidates (highlights/thumbnail) — tried before the live map. */
  thumbnailCandidates?: string[];
  className?: string;
}) {
  const [cdnExhausted, setCdnExhausted] = useState(false);
  const pin = useMemo(
    () => sectionPin(mapping, sectionId, sectionNumber),
    [mapping, sectionId, sectionNumber],
  );

  const candidates = thumbnailCandidates?.length
    ? thumbnailCandidates
    : thumbnailSrc
      ? [thumbnailSrc]
      : [];
  const candidatesKey = candidates.join("|");

  useEffect(() => {
    setCdnExhausted(false);
  }, [candidatesKey]);

  if (candidates.length && !cdnExhausted) {
    return (
      <CandidateThumbnail
        candidates={candidates}
        alt={`Location of section ${sectionNumber || section || ""}`}
        className={className}
        onExhausted={() => setCdnExhausted(true)}
      />
    );
  }

  if (!background?.url) {
    return (
      <SeatMapThumb
        section={(section || String(sectionNumber || "GA")).charAt(0).toUpperCase()}
        className={className}
      />
    );
  }

  const w = background.width || 1000;
  const h = background.height || 1000;
  const pinLeft = pin ? `${(pin.cx / w) * 100}%` : "50%";
  const pinTop = pin ? `${(pin.cy / h) * 100}%` : "50%";
  const mapZoom = pin ? 2.4 : sectionNumber || section ? 1.75 : 1;

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: "#edeff7",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: "100%",
          maxHeight: "100%",
          aspectRatio: `${w} / ${h}`,
          transform: `translate(-50%, -50%) scale(${mapZoom})`,
          transformOrigin: `${pinLeft} ${pinTop}`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={background.url}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
          }}
        />
        {pin ? (
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: pinLeft,
              top: pinTop,
              width: 15,
              height: 15,
              borderRadius: "50% 50% 50% 0",
              background: pinColor,
              border: "2px solid #fff",
              boxShadow: "0 1px 4px rgba(5,27,53,0.35)",
              transform: "translate(-50%, -100%) rotate(-45deg)",
              transformOrigin: "50% 100%",
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
