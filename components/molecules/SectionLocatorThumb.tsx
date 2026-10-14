"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { SeatmapBackground, SeatmapMapping } from "@/lib/seatmapLookups";
import { SEAT_VIEW_PLACEHOLDER } from "@/lib/seatView";
import Spinner from "@/components/atoms/Spinner";

type Pin = { cx: number; cy: number };

/** "NORTH ADA" and "NORTH_ADA" are the same section on the venue map. */
function mapSectionKey(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "");
}

/** Average seat position for a section â€” used as the listing map pin. */
export function sectionPin(
  mapping: SeatmapMapping | null | undefined,
  sectionId?: string | null,
  sectionNumber?: string | number | null,
): Pin | null {
  const seats = Object.values(mapping?.seats || {});
  if (!seats.length) return null;

  const id = sectionId ? String(sectionId) : "";
  const num = mapSectionKey(sectionNumber);
  const matched = seats.filter((seat) => {
    if (id && String(seat.sectionId) === id) return true;
    if (num && mapSectionKey(seat.sectionNumber) === num) return true;
    return false;
  });
  const pool = matched.length ? matched : [];
  if (!pool.length) return null;

  const cx = pool.reduce((sum, seat) => sum + seat.cx, 0) / pool.length;
  const cy = pool.reduce((sum, seat) => sum + seat.cy, 0) / pool.length;
  return { cx, cy };
}

/** Section artwork on the venue map, matched by id or section number. */
export function sectionOnMap(
  mapping: SeatmapMapping | null | undefined,
  sectionId?: string | null,
  sectionNumber?: string | number | null,
) {
  const id = sectionId ? String(sectionId) : "";
  const num = mapSectionKey(sectionNumber);
  const section = Object.values(mapping?.sections || {}).find((row) => {
    if (id && String(row.sectionId) === id) return true;
    if (num && mapSectionKey(row.sectionNumber) === num) return true;
    return false;
  });
  const path = section?.path || section?.coverPath || section?.svg?.coverPath || "";
  const pin = sectionPin(
    mapping,
    section?.sectionId || sectionId,
    section?.sectionNumber ?? sectionNumber,
  );
  return { path, pin };
}

/**
 * DigitalOcean Spaces answers 503 when a page's first paint fires many
 * thumbnail requests at once. One short retry lets a throttled-but-real
 * image load instead of being treated as missing.
 */
export const CANDIDATE_RETRY_DELAY_MS = 600;
export const CANDIDATE_RETRY_LIMIT = 1;

/** Cache-busting suffix so the browser re-requests a 503'd URL. */
export function retryCandidateSrc(src: string, attempt: number) {
  if (attempt <= 0) return src;
  return `${src}${src.includes("?") ? "&" : "?"}retry=${attempt}`;
}

function ImageSpinner({ size = 22, color }: { size?: number; color?: string }) {
  return (
    <span
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Spinner size={size} variant="compact" color={color} label="Loading seat image" />
    </span>
  );
}

function CandidateThumbnail({
  candidates,
  alt,
  priority = false,
  onLoad,
  onExhausted,
}: {
  candidates: string[];
  alt: string;
  priority?: boolean;
  onLoad: () => void;
  onExhausted: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [retries, setRetries] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const key = candidates.join("|");

  useEffect(() => {
    setIndex(0);
    setRetries(0);
    setWaiting(false);
    setLoadedSrc(null);
  }, [key]);

  useEffect(() => {
    if (!waiting) return;
    // Hold the retry so the burst that triggered the 503 has drained.
    const timer = setTimeout(() => setWaiting(false), CANDIDATE_RETRY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [waiting]);

  if (!candidates.length) {
    return null;
  }

  const base = candidates[Math.min(index, candidates.length - 1)];
  const src = retryCandidateSrc(base, retries);

  const loaded = loadedSrc === src;

  if (waiting) {
    return (
      <div
        aria-busy="true"
        aria-label={alt}
        style={{ position: "absolute", inset: 0 }}
      />
    );
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => {
          setLoadedSrc(src);
          onLoad();
        }}
        onError={() => {
          setLoadedSrc(null);
          if (retries < CANDIDATE_RETRY_LIMIT) {
            setRetries(retries + 1);
            setWaiting(true);
            return;
          }
          const next = index + 1;
          if (next < candidates.length) {
            setIndex(next);
            setRetries(0);
          } else {
            onExhausted();
          }
        }}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
          opacity: loaded ? 1 : 0,
          background: "#edeff7",
        }}
      />
    </>
  );
}

function MapLocator({
  background,
  path,
  pin,
  pinColor,
  label,
  onLoad,
  onError,
}: {
  background: SeatmapBackground;
  path: string;
  pin: Pin | null;
  pinColor: string;
  label: string;
  onLoad: () => void;
  onError: () => void;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const w = background.width || 1000;
  const h = background.height || 1000;
  const [center, setCenter] = useState<Pin | null>(pin);

  useLayoutEffect(() => {
    const node = pathRef.current;
    if (node) {
      try {
        const box = node.getBBox();
        if (box.width || box.height) {
          setCenter({ cx: box.x + box.width / 2, cy: box.y + box.height / 2 });
          return;
        }
      } catch {
        // jsdom has no layout box for the path.
      }
    }
    setCenter(pin);
  }, [pin, path]);

  const marker = Math.max(w, h) * 0.022;

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", background: "#fff" }}
    >
      <image
        href={background.url}
        x={0}
        y={0}
        width={w}
        height={h}
        onLoad={onLoad}
        onError={onError}
      />
      {path ? (
        <path
          ref={pathRef}
          d={path}
          fill={pinColor}
          fillOpacity={0.55}
          stroke={pinColor}
          strokeWidth={Math.max(w, h) * 0.003}
        />
      ) : null}
      {center ? (
        <circle
          data-seat-pin=""
          cx={center.cx}
          cy={center.cy}
          r={marker}
          fill={pinColor}
          stroke="#fff"
          strokeWidth={marker * 0.35}
        />
      ) : null}
    </svg>
  );
}

/**
 * Listing and seat-location picture. A real highlights or thumbnail image
 * wins. With none, a mapped section is shown on the venue seatmap, highlighted
 * and pinned. An unmapped section keeps the ticket placeholder.
 */
export default function SectionLocatorThumb({
  background,
  mapping,
  sectionId,
  sectionNumber,
  pinColor = "#3E8BF7",
  thumbnailSrc,
  thumbnailCandidates,
  priority = false,
  onReady,
  spinnerColor,
  className = "",
}: {
  background?: SeatmapBackground | null;
  mapping?: SeatmapMapping | null;
  sectionId?: string | null;
  sectionNumber?: string | number | null;
  /** Letter used when the section is not on the map (A-N / GA). */
  section?: string;
  pinColor?: string;
  /** Pre-rendered venue/section thumbnail from the legacy ticket-image bucket. */
  thumbnailSrc?: string | null;
  /** CDN image candidates (highlights/thumbnail). Tried before the venue map. */
  thumbnailCandidates?: string[];
  /** Detail viewer: start the request immediately instead of waiting for lazy load. */
  priority?: boolean;
  /** Fires once the picture that should be on screen has loaded. */
  onReady?: () => void;
  /** Arc color for the loading ring. Defaults to the Blocktickets green. */
  spinnerColor?: string;
  className?: string;
}) {
  const [cdnExhausted, setCdnExhausted] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [cdnLoaded, setCdnLoaded] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [placeholderLoaded, setPlaceholderLoaded] = useState(false);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const location = useMemo(
    () => sectionOnMap(mapping, sectionId, sectionNumber),
    [mapping, sectionId, sectionNumber],
  );
  const candidates = thumbnailCandidates?.length
    ? thumbnailCandidates
    : thumbnailSrc
      ? [thumbnailSrc]
      : [];
  const candidatesKey = candidates.join("|");
  const showCdn = candidates.length > 0 && !cdnExhausted;
  const showMap = Boolean(
    !showCdn && background?.url && (location.path || location.pin) && !mapFailed,
  );

  useEffect(() => {
    setCdnExhausted(false);
    setMapFailed(false);
    setCdnLoaded(false);
    setMapLoaded(false);
    setPlaceholderLoaded(false);
  }, [candidatesKey, background?.url, location.path, location.pin]);

  const markLoaded = (setLoaded: (value: boolean) => void) => () => {
    setLoaded(true);
    onReadyRef.current?.();
  };
  const loaded = showCdn ? cdnLoaded : showMap ? mapLoaded : placeholderLoaded;
  const locationLabel = `Location of section ${sectionNumber || ""}`;

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: "#fff",
      }}
    >
      {showCdn ? (
        <CandidateThumbnail
          candidates={candidates}
          alt={locationLabel}
          priority={priority}
          onLoad={markLoaded(setCdnLoaded)}
          onExhausted={() => setCdnExhausted(true)}
        />
      ) : showMap && background ? (
        <MapLocator
          background={background}
          path={location.path}
          pin={location.pin}
          pinColor={pinColor}
          label={locationLabel}
          onLoad={markLoaded(setMapLoaded)}
          onError={() => setMapFailed(true)}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={SEAT_VIEW_PLACEHOLDER}
          alt="Seat view placeholder"
          onLoad={markLoaded(setPlaceholderLoaded)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
            opacity: placeholderLoaded ? 1 : 0,
            background: "#fff",
          }}
        />
      )}
      {loaded ? null : <ImageSpinner color={spinnerColor} />}
    </div>
  );
}
