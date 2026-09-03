"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Button from "@/components/atoms/Button";
import Spinner from "@/components/atoms/Spinner";
import {
  createSeatLookupTables,
  createSectionLookupTable,
  isSectionCoverVenue,
  mappingStageSize,
} from "@/lib/seatmapLookups";
import useFiltersStore from "@/stores/filtersStore";
import useSeatmapStore from "@/stores/seatmapStore";
import type { TicketGroup } from "@/stores/filtersStore";
import SeatmapIcons from "./SeatmapIcons";
import SeatmapSeat from "./SeatmapSeat";
import SeatmapSections from "./SeatmapSections";
import SeatmapTooltip, { type SeatmapTooltipTarget } from "./SeatmapTooltip";

const PAN_THRESHOLD_PX = 5;
/** Softens pinch scale changes so zoom feels less jumpy on iOS. */
const PINCH_ZOOM_DAMPING = 0.7;

/**
 * Same ZoomLevel % formula as the legacy SvgSeatmap `calculateScalePercentage`.
 * Default fit ≈ 0; ~3.2× fit ≈ 22.
 */
function calculateScalePercentage(scale: number, originalScale: number) {
  const base = Math.max(originalScale, 0.001);
  const ratio = scale / base;
  return Number(((ratio * 100 - 100) / 10).toFixed(0));
}

/** Legacy zoom-level % below which cover-venue seats stay hidden without a section focus. */
const SEAT_HIDE_MAX_PERCENT = 22;

type Viewport = { scale: number; posX: number; posY: number };
type Point = { x: number; y: number };

function getTouchDistance(p1: Point, p2: Point) {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

function getTouchCenter(p1: Point, p2: Point): Point {
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}

function runViewportAnimation(
  from: Viewport,
  to: Viewport,
  durationMs: number,
  onFrame: (v: Viewport) => void,
  onFinish?: () => void,
  rafRef?: { current: number | null },
) {
  if (rafRef?.current) cancelAnimationFrame(rafRef.current);
  const start = performance.now();
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / durationMs);
    const k = t * (2 - t);
    onFrame({
      scale: from.scale + (to.scale - from.scale) * k,
      posX: from.posX + (to.posX - from.posX) * k,
      posY: from.posY + (to.posY - from.posY) * k,
    });
    if (t < 1) {
      const id = requestAnimationFrame(tick);
      if (rafRef) rafRef.current = id;
    } else {
      if (rafRef) rafRef.current = null;
      onFinish?.();
    }
  };
  const id = requestAnimationFrame(tick);
  if (rafRef) rafRef.current = id;
}

type Props = {
  className?: string;
  onUnlockOffer?: (offer: TicketGroup["offer"]) => void;
  accent?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  /**
   * `auto` (default): rebuild seat/section lookups from event ticket groups.
   * `external`: parent already populated seatmapStore lookups (e.g. packages).
   */
  lookupsMode?: "auto" | "external";
  /** Mobile find-on-map: collapsed legend + zoom pill, no pinch hint. */
  compactChrome?: boolean;
  /** Parent (seat-map modal) already shows the org loader. */
  hideLoadingSpinner?: boolean;
  /** Increment to clear the seat/section tooltip (mobile View selection / Checkout). */
  dismissTooltipKey?: number;
};

export default function InteractiveSeatmap({
  className = "",
  onUnlockOffer,
  accent = "#3E8BF7",
  buttonColor = accent,
  buttonTextColor = "#fff",
  lookupsMode = "auto",
  compactChrome = false,
  hideLoadingSpinner = false,
  dismissTooltipKey = 0,
}: Props) {
  const data = useSeatmapStore((s) => s.data);
  const background = useSeatmapStore((s) => s.background);
  const setScale = useSeatmapStore((s) => s.setScale);
  const maxScale = useSeatmapStore((s) => s.maxScale);
  const ticketGroups = useFiltersStore((s) => s.ticketGroups);
  const loadingTicketGroups = useFiltersStore((s) => s.loadingTicketGroups);
  const selectedOfferIds = useFiltersStore((s) => s.filters.selectedOfferIds);
  const venueSlug = useFiltersStore(
    (s) => (s.event?.venue as { slug?: string } | undefined)?.slug,
  );

  const setSeatLookupTable = useSeatmapStore((s) => s.setSeatLookupTable);
  const setSeatOffersLookupTable = useSeatmapStore(
    (s) => s.setSeatOffersLookupTable,
  );
  const setSectionLookupTable = useSeatmapStore((s) => s.setSectionLookupTable);

  const sectionCoversEnabled = isSectionCoverVenue(venueSlug);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomAnimRafRef = useRef<number | null>(null);
  const defaultViewRef = useRef<Viewport | null>(null);
  const viewportRef = useRef<Viewport>({ scale: 1, posX: 0, posY: 0 });
  const maxScaleRef = useRef(maxScale);
  const pinchRef = useRef<{ lastCenter: Point | null; lastDist: number }>({
    lastCenter: null,
    lastDist: 0,
  });
  const pinchActiveRef = useRef(false);
  const dragStoppedRef = useRef(false);
  const transitionTouchInfo = useRef<{
    stagePosOnLift: Point;
    touchPosOnLift: Point;
  } | null>(null);
  const panRef = useRef({
    candidate: false,
    active: false,
    pointerId: null as number | null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [viewport, setViewport] = useState<Viewport>({
    scale: 1,
    posX: 0,
    posY: 0,
  });
  viewportRef.current = viewport;
  maxScaleRef.current = maxScale;
  const [tooltip, setTooltip] = useState<SeatmapTooltipTarget>(null);
  useEffect(() => {
    if (!dismissTooltipKey) return;
    setTooltip(null);
  }, [dismissTooltipKey]);
  const [focusedSectionId, setFocusedSectionId] = useState<string | null>(null);
  const [activeRowIds, setActiveRowIds] = useState<string[] | null>(null);
  const [lookupsReady, setLookupsReady] = useState(lookupsMode === "external");
  const [legendOpen, setLegendOpen] = useState(!compactChrome);
  const [fitScale, setFitScale] = useState(1);
  // Venue artwork can arrive after geometry — keep the Find-on-map spinner up
  // until the SVG background has loaded (or failed) so the canvas is not blank.
  const [backgroundReady, setBackgroundReady] = useState(!background?.url);

  useEffect(() => {
    setBackgroundReady(!background?.url);
  }, [background?.url]);

  // Build availability lookups when ticket groups change
  useEffect(() => {
    if (lookupsMode === "external") {
      setLookupsReady(true);
      return;
    }
    if (loadingTicketGroups) return;
    const sectionTable = createSectionLookupTable(ticketGroups);
    setSectionLookupTable(sectionTable);
    const { lookupTable, offersLookupTable } = createSeatLookupTables(
      ticketGroups,
      selectedOfferIds,
    );
    setSeatLookupTable(lookupTable);
    setSeatOffersLookupTable(offersLookupTable);
    setLookupsReady(true);
  }, [
    lookupsMode,
    ticketGroups,
    loadingTicketGroups,
    selectedOfferIds,
    setSeatLookupTable,
    setSeatOffersLookupTable,
    setSectionLookupTable,
  ]);

  // Venues without a background image still have geometry worth drawing.
  const bgWidth = background?.width;
  const bgHeight = background?.height;
  const stage = useMemo(
    () =>
      bgWidth && bgHeight
        ? { width: bgWidth, height: bgHeight }
        : mappingStageSize(data),
    [bgWidth, bgHeight, data],
  );
  const stageWidth = stage?.width;
  const stageHeight = stage?.height;

  // Fit map to container. Later resizes (mobile selection bar) must not
  // reset pan/zoom — that made the map jump under the shopper's finger.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !stageWidth || !stageHeight) return;

    const computeFit = () => {
      const { clientWidth, clientHeight } = el;
      if (!clientWidth || !clientHeight) return null;
      const scale = Math.min(
        clientWidth / stageWidth,
        clientHeight / stageHeight,
      );
      return {
        size: { width: clientWidth, height: clientHeight },
        view: {
          scale,
          posX: (clientWidth - stageWidth * scale) / 2,
          posY: (clientHeight - stageHeight * scale) / 2,
        },
      };
    };

    const applyFit = (resetViewport: boolean) => {
      const fitted = computeFit();
      if (!fitted) return;
      setSize(fitted.size);
      defaultViewRef.current = fitted.view;
      setFitScale(fitted.view.scale);
      if (resetViewport) {
        setViewport(fitted.view);
        setScale(fitted.view.scale);
      }
    };

    applyFit(true);
    const ro = new ResizeObserver(() => applyFit(false));
    ro.observe(el);
    return () => ro.disconnect();
  }, [stageHeight, stageWidth, setScale]);

  useEffect(() => {
    setScale(viewport.scale);
  }, [viewport.scale, setScale]);

  const zoomBy = useCallback(
    (factor: number, cx?: number, cy?: number) => {
      setViewport((prev) => {
        const minScale = defaultViewRef.current?.scale
          ? defaultViewRef.current.scale * 0.8
          : 0.2;
        const nextScale = Math.min(
          maxScale,
          Math.max(minScale, prev.scale * factor),
        );
        if (nextScale === prev.scale) return prev;
        const originX = cx ?? size.width / 2;
        const originY = cy ?? size.height / 2;
        const worldX = (originX - prev.posX) / prev.scale;
        const worldY = (originY - prev.posY) / prev.scale;
        return {
          scale: nextScale,
          posX: originX - worldX * nextScale,
          posY: originY - worldY * nextScale,
        };
      });
    },
    [maxScale, size.height, size.width],
  );

  const resetView = useCallback(() => {
    if (!defaultViewRef.current) return;
    setFocusedSectionId(null);
    setActiveRowIds(null);
    runViewportAnimation(
      viewport,
      defaultViewRef.current,
      280,
      setViewport,
      undefined,
      zoomAnimRafRef,
    );
  }, [viewport]);

  const focusSection = useCallback(
    (sectionId: string, bounds: DOMRect) => {
      if (!size.width || !size.height) return;
      const pad = 48;
      const scale = Math.min(
        (size.width - pad * 2) / Math.max(bounds.width, 1),
        (size.height - pad * 2) / Math.max(bounds.height, 1),
        maxScale,
      );
      const posX =
        size.width / 2 - (bounds.x + bounds.width / 2) * scale;
      const posY =
        size.height / 2 - (bounds.y + bounds.height / 2) * scale;

      setFocusedSectionId(sectionId);
      const section = data?.sections?.[sectionId];
      setActiveRowIds(section?.rows ? [...section.rows] : null);

      runViewportAnimation(
        viewport,
        { scale, posX, posY },
        320,
        setViewport,
        undefined,
        zoomAnimRafRef,
      );
    },
    [data?.sections, maxScale, size.height, size.width, viewport],
  );

  // Wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      zoomBy(factor, e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  // Touch: pinch zoom + single-finger pan (native listeners so preventDefault works on iOS).
  // Pointer handlers below are mouse-only — dual pointer+touch streams fight on Safari.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !stage) return;

    const toLocal = (clientX: number, clientY: number): Point => {
      const rect = el.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const clearPan = () => {
      panRef.current = {
        candidate: false,
        active: false,
        pointerId: null,
        startX: 0,
        startY: 0,
        originX: 0,
        originY: 0,
      };
    };

    const minScale = () =>
      defaultViewRef.current?.scale
        ? defaultViewRef.current.scale * 0.8
        : 0.2;

    const beginTouchPan = (touch: Touch) => {
      const target = touch.target as Element | null;
      if (target?.closest?.("[data-interactive-seat]")) return;
      const v = viewportRef.current;
      panRef.current = {
        candidate: true,
        active: false,
        pointerId: touch.identifier,
        startX: touch.clientX,
        startY: touch.clientY,
        originX: v.posX,
        originY: v.posY,
      };
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        // Hand off from single-finger pan to pinch.
        e.preventDefault();
        if (zoomAnimRafRef.current) {
          cancelAnimationFrame(zoomAnimRafRef.current);
          zoomAnimRafRef.current = null;
        }
        pinchActiveRef.current = true;
        clearPan();
        dragStoppedRef.current = true;
        transitionTouchInfo.current = null;
        setTooltip(null);
        const p1 = toLocal(e.touches[0].clientX, e.touches[0].clientY);
        const p2 = toLocal(e.touches[1].clientX, e.touches[1].clientY);
        pinchRef.current = {
          lastCenter: getTouchCenter(p1, p2),
          lastDist: getTouchDistance(p1, p2),
        };
        return;
      }

      if (e.touches.length === 1 && !pinchActiveRef.current) {
        beginTouchPan(e.touches[0]);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const touches = e.touches;
      const touch1 = touches[0];
      const touch2 = touches[1];
      const v = viewportRef.current;

      // After lifting one finger from a pinch, resume single-finger pan smoothly
      if (
        touches.length === 1 &&
        dragStoppedRef.current &&
        transitionTouchInfo.current
      ) {
        e.preventDefault();
        const current = touches[0];
        const local = toLocal(current.clientX, current.clientY);
        const { stagePosOnLift, touchPosOnLift } = transitionTouchInfo.current;
        const newPos = {
          x: stagePosOnLift.x + (local.x - touchPosOnLift.x),
          y: stagePosOnLift.y + (local.y - touchPosOnLift.y),
        };
        setViewport((vp) => ({ ...vp, posX: newPos.x, posY: newPos.y }));
        transitionTouchInfo.current = null;
        dragStoppedRef.current = false;
        pinchActiveRef.current = false;
        panRef.current = {
          candidate: false,
          active: true,
          pointerId: current.identifier,
          startX: current.clientX,
          startY: current.clientY,
          originX: newPos.x,
          originY: newPos.y,
        };
        return;
      }

      if (touch1 && touch2) {
        e.preventDefault();
        if (zoomAnimRafRef.current) {
          cancelAnimationFrame(zoomAnimRafRef.current);
          zoomAnimRafRef.current = null;
        }

        pinchActiveRef.current = true;
        if (panRef.current.active || panRef.current.candidate) {
          clearPan();
          dragStoppedRef.current = true;
        }

        const p1 = toLocal(touch1.clientX, touch1.clientY);
        const p2 = toLocal(touch2.clientX, touch2.clientY);
        const newCenter = getTouchCenter(p1, p2);
        const dist = getTouchDistance(p1, p2);

        const { lastCenter } = pinchRef.current;
        if (lastCenter == null || pinchRef.current.lastDist <= 0) {
          pinchRef.current = { lastCenter: newCenter, lastDist: dist };
          return;
        }

        const lastDist = pinchRef.current.lastDist;
        const oldScale = v.scale;
        const pointTo = {
          x: (lastCenter.x - v.posX) / oldScale,
          y: (lastCenter.y - v.posY) / oldScale,
        };

        const rawZoomRatio = dist / lastDist;
        const effectiveZoomRatio = 1 + (rawZoomRatio - 1) * PINCH_ZOOM_DAMPING;
        const nextScale = Math.min(
          maxScaleRef.current,
          Math.max(minScale(), oldScale * effectiveZoomRatio),
        );

        const dx = newCenter.x - lastCenter.x;
        const dy = newCenter.y - lastCenter.y;
        setViewport({
          scale: nextScale,
          posX: newCenter.x - pointTo.x * nextScale + dx,
          posY: newCenter.y - pointTo.y * nextScale + dy,
        });
        pinchRef.current = { lastCenter: newCenter, lastDist: dist };
        return;
      }

      // Single-finger pan
      if (touches.length === 1 && panRef.current.candidate) {
        const pan = panRef.current;
        const touch = touches[0];
        if (pan.pointerId !== touch.identifier) return;
        const dx = touch.clientX - pan.startX;
        const dy = touch.clientY - pan.startY;
        if (!pan.active && Math.hypot(dx, dy) < PAN_THRESHOLD_PX) return;
        e.preventDefault();
        if (!pan.active) {
          pan.active = true;
          setTooltip(null);
        }
        setViewport((prev) => ({
          ...prev,
          posX: pan.originX + dx,
          posY: pan.originY + dy,
        }));
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const touches = e.touches;

      if (touches.length === 1 && (dragStoppedRef.current || pinchActiveRef.current)) {
        const remaining = touches[0];
        const v = viewportRef.current;
        dragStoppedRef.current = true;
        transitionTouchInfo.current = {
          stagePosOnLift: { x: v.posX, y: v.posY },
          touchPosOnLift: toLocal(remaining.clientX, remaining.clientY),
        };
        pinchRef.current = { lastCenter: null, lastDist: 0 };
        return;
      }

      pinchRef.current = { lastCenter: null, lastDist: 0 };
      dragStoppedRef.current = false;
      transitionTouchInfo.current = null;
      pinchActiveRef.current = false;
      if (touches.length === 0) clearPan();
    };

    const opts: AddEventListenerOptions = { passive: false };
    el.addEventListener("touchstart", onTouchStart, opts);
    el.addEventListener("touchmove", onTouchMove, opts);
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [stage]);

  // Mouse pan (touch pan is handled above)
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    const target = e.target as Element | null;
    if (target?.closest?.("[data-interactive-seat]")) return;
    panRef.current = {
      candidate: true,
      active: false,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: viewport.posX,
      originY: viewport.posY,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    const pan = panRef.current;
    if (!pan.candidate || pan.pointerId !== e.pointerId) return;
    const dx = e.clientX - pan.startX;
    const dy = e.clientY - pan.startY;
    if (!pan.active && Math.hypot(dx, dy) < PAN_THRESHOLD_PX) return;
    if (!pan.active) {
      pan.active = true;
      setTooltip(null);
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }
    setViewport((prev) => ({
      ...prev,
      posX: pan.originX + dx,
      posY: pan.originY + dy,
    }));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    if (panRef.current.pointerId === e.pointerId) {
      panRef.current.candidate = false;
      panRef.current.active = false;
      panRef.current.pointerId = null;
    }
  };

  // Cover venues: seats only appear after clicking a section (or when that
  // focus is still active). Never dump every row at overview — that painted
  // seats on top of covers. Also clear seats if the user zooms back out
  // without using "Back to map".
  useEffect(() => {
    if (!sectionCoversEnabled || !defaultViewRef.current) return;
    if (focusedSectionId) return;
    const pct = calculateScalePercentage(
      viewport.scale,
      defaultViewRef.current.scale,
    );
    // Legacy zoom-reveal (viewport section at ~3.2×) is not ported yet; keep
    // seats hidden until a section is focused.
    if (pct < SEAT_HIDE_MAX_PERCENT) {
      setActiveRowIds(null);
    }
  }, [focusedSectionId, sectionCoversEnabled, viewport.scale]);

  const rowsSource = useMemo(() => {
    if (!data?.rows) return [];
    if (sectionCoversEnabled && !activeRowIds) return [];
    if (sectionCoversEnabled && Array.isArray(activeRowIds)) {
      const seenRows = new Set<string>();
      return activeRowIds
        .map((id) => data.rows?.[id])
        .filter((row): row is NonNullable<typeof row> => {
          if (!row?.rowId) return false;
          const rid = String(row.rowId);
          if (seenRows.has(rid)) return false;
          seenRows.add(rid);
          return true;
        });
    }
    return Object.values(data.rows);
  }, [activeRowIds, data?.rows, sectionCoversEnabled]);

  const fitted = size.width > 0 && size.height > 0;
  const ready = Boolean(data && stage && lookupsReady);
  const zoomPercent = Math.max(
    1,
    Math.round((viewport.scale / Math.max(fitScale, 0.001)) * 100),
  );
  const showReset =
    Boolean(focusedSectionId) || Math.abs(viewport.scale - fitScale) > 0.01;
  // Find-on-map popup: spin until geometry, inventory, viewport fit, and
  // background artwork are ready — including when the parent hydrates lookups.
  const showLoading =
    !ready || !fitted || loadingTicketGroups || !backgroundReady;

  // Only give up when there is nothing to draw — a missing background image is
  // survivable as long as the mapping has geometry.
  if (!stage) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-[#E2E5EA] bg-[#F4F5F7] ${className}`}
      >
        <p className="text-[14px] text-[#667085]">Seat map unavailable</p>
      </div>
    );
  }

  return (
    <div
      data-seatmap-canvas="true"
      className={`relative overflow-hidden rounded-2xl border border-[#E2E5EA] bg-[#F4F5F7] ${className}`}
      style={{
        "--seatmap-accent": "#3E8BF7",
        "--seatmap-selected": accent,
      } as React.CSSProperties}
    >
      <div
        ref={containerRef}
        className={`relative h-full w-full touch-none select-none ${compactChrome ? "min-h-0" : "min-h-[420px]"}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={(event) => {
          if ((event.target as Element | null)?.closest?.("[data-interactive-seat]")) {
            return;
          }
          setTooltip(null);
        }}
      >
        {showLoading && !hideLoadingSpinner ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/55">
            <Spinner size={72} variant="branded" label="Loading seat map" />
          </div>
        ) : null}

        <svg
          ref={svgRef}
          width={size.width || "100%"}
          height={size.height || "100%"}
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label="Interactive seat map"
        >
          <g
            transform={`translate(${viewport.posX} ${viewport.posY}) scale(${viewport.scale})`}
            // Hide the map as a whole, not just the artwork: revealing seats
            // before the background has painted or the viewport has been fitted
            // shows them on a blank stage and then snaps them into place.
            opacity={showLoading ? 0 : 1}
          >
            {background?.url ? (
              <image
                href={background.url}
                x={0}
                y={0}
                width={stage.width}
                height={stage.height}
                preserveAspectRatio="none"
                onLoad={() => setBackgroundReady(true)}
                onError={() => setBackgroundReady(true)}
              />
            ) : null}
            {data ? (
              <>
                <SeatmapSections
                  data={data}
                  sectionCoversEnabled={sectionCoversEnabled}
                  showCovers={!focusedSectionId}
                  focusedSectionId={focusedSectionId}
                  onZoomableSectionClick={focusSection}
                  onTooltip={setTooltip}
                />
                <g className="seats">
                  <SeatmapIcons />
                  {rowsSource.map((row) => {
                    const seenSeats = new Set<string>();
                    return (
                      <g key={String(row.rowId)}>
                        {row.seats.map((seatId) => {
                          const sid = String(seatId);
                          if (seenSeats.has(sid)) return null;
                          seenSeats.add(sid);
                          const seat = data.seats?.[seatId] ?? data.seats?.[sid];
                          if (!seat) return null;
                          return (
                            <SeatmapSeat
                              key={sid}
                              seat={seat}
                              onTooltip={setTooltip}
                              isTooltipActive={
                                tooltip?.kind === "seat" &&
                                String(tooltip.seatId) === sid
                              }
                            />
                          );
                        })}
                      </g>
                    );
                  })}
                </g>
              </>
            ) : null}
          </g>
        </svg>

        {compactChrome ? (
          <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 rounded-full border border-[#D9DEE7] bg-white/95 px-1.5 py-1 shadow-sm backdrop-blur">
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => zoomBy(1 / 1.25)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[20px] text-[#051B35]"
            >
              −
            </button>
            <span
              aria-label="Zoom level"
              className="min-w-[3.25rem] text-center text-[13px] font-semibold tabular-nums text-[#051B35]"
            >
              {zoomPercent}%
            </span>
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => zoomBy(1.25)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[20px] text-[#051B35]"
            >
              +
            </button>
          </div>
        ) : (
          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => zoomBy(1 / 1.25)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D9DEE7] bg-white/95 text-[#051B35] shadow-sm backdrop-blur hover:bg-[#F4F5F7]"
            >
              −
            </button>
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => zoomBy(1.25)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D9DEE7] bg-white/95 text-[#051B35] shadow-sm backdrop-blur hover:bg-[#F4F5F7]"
            >
              +
            </button>
            {showReset ? (
              <Button
                size="sm"
                className="!h-9 border-0 backdrop-blur"
                style={{
                  background: buttonColor,
                  color: buttonTextColor,
                  borderColor: buttonColor,
                }}
                onClick={resetView}
              >
                Back to map
              </Button>
            ) : null}
          </div>
        )}

        {compactChrome ? null : (
          <div className="pointer-events-none absolute right-4 top-4 rounded-full border border-[#D9DEE7] bg-white/90 px-3 py-1.5 text-[12px] text-[#667085] shadow-sm backdrop-blur">
            Pinch or scroll to zoom · drag to pan
          </div>
        )}

        <div
          className={`absolute left-4 z-10 overflow-hidden rounded-xl border border-[#dfe3eb] bg-white text-[#051B35] shadow-lg ${compactChrome ? "bottom-4 w-auto min-w-[108px]" : "bottom-16 w-[154px]"}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setLegendOpen((open) => !open)}
            aria-expanded={legendOpen}
            className="flex w-full items-center justify-between border-0 bg-white px-4 py-3 text-left text-[14px] font-semibold text-[#051B35]"
          >
            Legend
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`h-4 w-4 transition-transform ${legendOpen ? "" : "rotate-180"}`}
              aria-hidden
            >
              <path d="m5 12 5-5 5 5" />
            </svg>
          </button>
          {legendOpen ? (
            <div className="space-y-3 px-4 pb-4">
              {[
                { label: "Unavailable", color: "#E6E8EC" },
                { label: "Available", color: "#3E8BF7" },
                { label: "Selected", color: accent },
                { label: "Exclusive", color: "#9757D7" },
                { label: "Accessibility", color: "#F4BC16" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 text-[13px]"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-[4px]"
                    style={{ background: item.color }}
                  />
                  {item.label}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <SeatmapTooltip
        target={tooltip}
        onClose={() => setTooltip(null)}
        onUnlock={onUnlockOffer}
        accent={accent}
        buttonColor={buttonColor}
        buttonTextColor={buttonTextColor}
      />
    </div>
  );
}

export const InteractiveSeatmapMemo = memo(InteractiveSeatmap);
