"use client";

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ArrowsOut, CaretDown, Crosshair, House, Minus, Plus } from "@phosphor-icons/react";
import Button from "@/components/atoms/Button";
import Spinner from "@/components/atoms/Spinner";
import {
  createSeatLookupTables,
  createSectionLookupTable,
  isSectionCoverVenue,
} from "@/lib/seatmapLookups";
import useFiltersStore from "@/stores/filtersStore";
import useSeatmapStore from "@/stores/seatmapStore";
import type { TicketGroup } from "@/stores/filtersStore";
import SeatmapIcons from "./SeatmapIcons";
import SeatmapSeat from "./SeatmapSeat";
import SeatmapSections from "./SeatmapSections";
import SeatmapTooltip, { type SeatmapTooltipTarget } from "./SeatmapTooltip";
import SeatmapSectionTip, { type SectionTipTarget } from "./SeatmapSectionTip";

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
  /**
   * `auto` (default): rebuild seat/section lookups from event ticket groups.
   * `external`: parent already populated seatmapStore lookups (e.g. packages).
   */
  lookupsMode?: "auto" | "external";
  /** room the page keeps for its own floating controls, in px: the map is fitted into what is left, so nothing sits on it (default: none) */
  inset?: { top: number; right: number; bottom: number; left: number };
  /** the zoom buttons as frosted glass (the site's glass recipe) instead of the plain bordered ones */
  glassChrome?: boolean;
  /** sections to mark with a wheelchair pin, a button of a fixed size that stays easy to hit at any zoom (a page's accessibility filter uses it for spaces that are small on the map) */
  pins?: string[];
};

/** the small whole-venue map in the corner (kept in the code, switched off for now) */
const SHOW_MINIMAP = false;

export default function InteractiveSeatmap({
  className = "",
  onUnlockOffer,
  lookupsMode = "auto",
  inset,
  glassChrome = false,
  pins,
}: Props) {
  const inT = inset?.top ?? 0, inR = inset?.right ?? 0, inB = inset?.bottom ?? 0, inL = inset?.left ?? 0;
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

  /* section covers (blue blocks over each section, click to zoom to its seats) are on for the named venues, and for any map on the season-style page (the one that passes an
     inset) whose own data marks its sections zoomable. Without covers a seat-level map draws every seat as its own tiny, hoverable shape: unreadable and slow. */
  const sectionCoversEnabled = isSectionCoverVenue(venueSlug) || (Boolean(inset) && Object.values(data?.sections ?? {}).some((sec) => Boolean((sec as { zoomable?: boolean }).zoomable)));
  /* the season page (the one that passes an inset) gets the polished behaviour: tinted focus, click-away, double-click, steadier zoom. Other pages keep the original. */
  const polish = Boolean(inset);
  const downRef = useRef({ x: 0, y: 0 });
  const reachedFocus = useRef(false);
  const [hoverSec, setHoverSec] = useState<SectionTipTarget>(null);
  const picked = useSeatmapStore((s) => s.selectedFromMap);
  const [seatsOn, setSeatsOn] = useState(false);
  const seatTimer = useRef<number | null>(null);

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
  const gRef = useRef<SVGGElement>(null);
  const animating = useRef(false);
  /* a glide never goes through React: each frame writes the transform straight onto the map group (one attribute, no re-render of a thousand seats)
     and the state catches up once, when it lands. Anything that needs the live view reads viewportRef. */
  if (!animating.current) viewportRef.current = viewport;
  useLayoutEffect(() => {
    if (animating.current) {
      const v = viewportRef.current;
      gRef.current?.setAttribute("transform", `translate(${v.posX} ${v.posY}) scale(${v.scale})`);
    }
  });
  /* while the map is moving the frosted pills drop their blur (a 40px backdrop blur over a map that repaints every frame is the costliest thing on screen) */
  const moving = useCallback((on: boolean) => {
    if (on) document.documentElement.dataset.seatMoving = "1";
    else delete document.documentElement.dataset.seatMoving;
  }, []);
  useEffect(() => () => { delete document.documentElement.dataset.seatMoving; }, []);
  const paintView = useCallback((v: Viewport) => {
    moving(true);
    viewportRef.current = v;
    gRef.current?.setAttribute("transform", `translate(${v.posX} ${v.posY}) scale(${v.scale})`);
    svgRef.current?.style.setProperty("--vs", String(v.scale));
  }, [moving]);
  const [pinAt, setPinAt] = useState<{ sid: string; x: number; y: number; box: DOMRect }[]>([]);
  const glide = useCallback((from: Viewport, to: Viewport, ms: number, after?: () => void) => {
    animating.current = true;
    runViewportAnimation(from, to, ms, paintView, () => {
      animating.current = false;
      moving(false);
      setViewport(to);
      after?.();
    }, zoomAnimRafRef);
  }, [paintView, moving]);
  /* the user grabbing the map mid-glide stops it where it is and hands the view back to state */
  const settle = useCallback(() => {
    if (!animating.current) return;
    if (zoomAnimRafRef.current) cancelAnimationFrame(zoomAnimRafRef.current);
    zoomAnimRafRef.current = null;
    if (commitTimer.current) window.clearTimeout(commitTimer.current);
    commitTimer.current = null;
    animating.current = false;
    moving(false);
    setViewport(viewportRef.current);
  }, [moving]);
  /* drag, pinch and wheel: the same trick as a glide. Each event writes the transform straight onto the map group, and the state is brought
     up to date once, a moment after the last event (so a thousand seats are not re-processed per pointer move). Other pages keep plain state. */
  const commitTimer = useRef<number | null>(null);
  const setLive = useCallback((u: Viewport | ((p: Viewport) => Viewport)) => {
    if (!polish) { setViewport(u); return; }
    const next = typeof u === "function" ? u(viewportRef.current) : u;
    if (next === viewportRef.current) return;
    animating.current = true;
    paintView(next);
    if (commitTimer.current) window.clearTimeout(commitTimer.current);
    commitTimer.current = window.setTimeout(() => {
      commitTimer.current = null;
      if (!animating.current || zoomAnimRafRef.current) return;
      animating.current = false;
      moving(false);
      setViewport(viewportRef.current);
    }, 140);
  }, [polish, paintView, moving]);
  maxScaleRef.current = maxScale;
  const [tooltip, setTooltip] = useState<SeatmapTooltipTarget>(null);
  /* a card a click opened (a locked offer, several offers, a general admission section) is pinned: hovering other seats, or leaving the seat, does not replace or
     take it away. It closes on a click on the map, a pan, Escape, or its own close; another click-opened card replaces it. */
  const showTip = useCallback((t: SeatmapTooltipTarget, force = false) => {
    setTooltip((prev) => {
      if (prev?.pinned && !(t && t.pinned) && !force) return prev;
      if (t?.pinned && prev && prev.kind === "seat" && t.kind === "seat" && prev.seatId === t.seatId) return { ...t, x: prev.x, y: prev.y };
      return t;
    });
  }, []);
  useEffect(() => {
    if (!tooltip?.pinned) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); setTooltip(null); } };
    window.addEventListener("keydown", esc, true);
    return () => window.removeEventListener("keydown", esc, true);
  }, [tooltip?.pinned]);
  const [focusedSectionId, setFocusedSectionId] = useState<string | null>(null);
  const [activeRowIds, setActiveRowIds] = useState<string[] | null>(null);
  const [lookupsReady, setLookupsReady] = useState(lookupsMode === "external");

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

  // the drawn stadium's own bounds (the background image has uneven margins), used to fit and centre when the page reserves an inset
  const [content, setContent] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  useEffect(() => {
    const sections = data?.sections;
    if (!inset || !sections) return;
    const raf = requestAnimationFrame(() => {
      const svg = svgRef.current;
      if (!svg) return;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const id of Object.keys(sections)) {
        const el = svg.querySelector<SVGGraphicsElement>(`path[id="${CSS.escape(id)}"]`);
        if (!el) continue;
        const b = el.getBBox();
        if (!b.width) continue;
        x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height);
      }
      if (x1 > x0 && y1 > y0) {
        /* the stadium (its ring, gate names and suites) is drawn centred on the background image, while the section shapes alone are lopsided (wings on one side), so
           their bounding box sits off to one side of what you see. Centre on the image's own middle when the sections are near it, and leave room each side for the ring. */
        let cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        const bw = background?.width, bh = background?.height;
        if (bw && Math.abs(cx - bw / 2) < bw * 0.08) cx = bw / 2;
        if (bh && Math.abs(cy - bh / 2) < bh * 0.08) cy = bh / 2;
        const hw = Math.max(cx - x0, x1 - cx) + (x1 - x0) * 0.05, hh = Math.max(cy - y0, y1 - cy) + (y1 - y0) * 0.02;
        setContent({ x: cx - hw, y: cy - hh, w: hw * 2, h: hh * 2 });
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [inset, data?.sections, background]);

  // Fit map to container
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !background?.width || !background?.height) return;

    const fit = () => {
      const { clientWidth, clientHeight } = el;
      if (!clientWidth || !clientHeight) return;
      setSize({ width: clientWidth, height: clientHeight });

      const freeW = Math.max(clientWidth - inL - inR, 1);
      const freeH = Math.max(clientHeight - inT - inB, 1);
      const box = content ?? { x: 0, y: 0, w: background.width, h: background.height };
      const scale = Math.min(freeW / box.w, freeH / box.h) * (polish && clientWidth >= 768 ? 0.9375 : 1);
      const posX = inL + (freeW - box.w * scale) / 2 - box.x * scale;
      const posY = inT + (freeH - box.h * scale) / 2 - box.y * scale;
      const next = { scale, posX, posY };
      defaultViewRef.current = next;
      setViewport(next);
      setScale(scale);
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [background, content, setScale, inT, inR, inB, inL]);

  useEffect(() => {
    setScale(viewport.scale);
  }, [viewport.scale, setScale]);

  const zoomBy = useCallback(
    (factor: number, cx?: number, cy?: number) => {
      setLive((prev) => {
        const minScale = defaultViewRef.current?.scale
          ? defaultViewRef.current.scale * (polish ? 1 : 0.8)
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
    [maxScale, size.height, size.width, polish, setLive],
  );

  /* an eased zoom step (buttons, double-click): glides to the new scale around a point instead of jumping */
  const glideZoom = useCallback(
    (factor: number, cx?: number, cy?: number) => {
      const from = viewportRef.current;
      const min = defaultViewRef.current?.scale ?? 0.2;
      const nextScale = Math.min(maxScale, Math.max(min, from.scale * factor));
      if (nextScale === from.scale) return;
      const ox = cx ?? size.width / 2, oy = cy ?? size.height / 2;
      const wx = (ox - from.posX) / from.scale, wy = (oy - from.posY) / from.scale;
      glide(from, { scale: nextScale, posX: ox - wx * nextScale, posY: oy - wy * nextScale }, 260);
    },
    [maxScale, size.height, size.width, glide],
  );

  const resetView = useCallback(() => {
    if (!defaultViewRef.current) return;
    setFocusedSectionId(null);
    setActiveRowIds(null);
    if (seatTimer.current) { window.clearTimeout(seatTimer.current); seatTimer.current = null; }
    setSeatsOn(false);
    if (polish) { glide(viewportRef.current, defaultViewRef.current, 320); return; }
    runViewportAnimation(
      viewport,
      defaultViewRef.current,
      280,
      setViewport,
      undefined,
      zoomAnimRafRef,
    );
  }, [viewport, polish, glide]);

  const focusSection = useCallback(
    (sectionId: string, bounds: DOMRect, byVisitor = true) => {
      if (!size.width || !size.height) return;
      if (byVisitor) useSeatmapStore.getState().noteSectionTap(sectionId);
      const freeW = size.width - inL - inR;
      const freeH = size.height - inT - inB;
      const section = data?.sections?.[sectionId];

      let box = bounds;
      let rowIds: string[] | null = section?.rows ? [...section.rows] : null;
      let cap = maxScale;
      if (polish && data) {
        /* polished: zoom to the section's own seats (the cover's outline is much bigger than where the seats sit), close enough to read them, and
           and draw only that section's seats */
        let seatW = 0;
        const seatBox = (rows: string[]) => {
          let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
          for (const rid of rows) for (const id of data.rows?.[rid]?.seats ?? []) {
            const st = data.seats?.[id] ?? data.seats?.[String(id)];
            if (!st) continue;
            seatW = seatW || st.w;
            x0 = Math.min(x0, st.cx - st.w / 2); y0 = Math.min(y0, st.cy - st.h / 2);
            x1 = Math.max(x1, st.cx + st.w / 2); y1 = Math.max(y1, st.cy + st.h / 2);
          }
          return x1 > x0 && y1 > y0 ? new DOMRect(x0, y0, x1 - x0, y1 - y0) : null;
        };
        const own = rowIds ? seatBox(rowIds) : null;
        if (own) box = own;
        /* a small section (a few wheelchair spaces) would zoom until each seat is a plate: a seat never grows past about 56px on screen */
        cap = seatW > 0 ? Math.min(40, 56 / seatW) : 40;
      }
      /* polished: the section fills the space between the floating header and dock, its first and last rows nearly touching them (the fit
         reserves a 16px breathing gap around those pills, so focusing takes most of it back) */
      const takeBack = polish ? 12 : 0;
      const fT = inT - takeBack, fB = inB - takeBack;
      const fH = size.height - fT - fB;
      const padX = polish ? 28 : 48, padY = polish ? 4 : 48;
      const fitScale = Math.min(
        (freeW - padX * 2) / Math.max(box.width, 1),
        (fH - padY * 2) / Math.max(box.height, 1),
      );
      /* polished: a little closer than a fit, so the seats are big enough to aim at (the outer rows slip under the glass pills) */
      const scale = Math.min(fitScale * (polish ? 1.3 : 1), cap);
      const posX = inL + freeW / 2 - (box.x + box.width / 2) * scale;
      const posY = fT + fH / 2 - (box.y + box.height / 2) * scale;

      reachedFocus.current = false;
      setFocusedSectionId(sectionId);
      /* polished: the old seats fade out, the glide runs, and the new section's seats are put in a little way into it (a thousand shapes mounting is
         one heavy frame, so it is better spent while the view is already moving and slowing down) and fade in */
      if (polish) {
        if (seatTimer.current) window.clearTimeout(seatTimer.current);
        setSeatsOn(false);
        seatTimer.current = window.setTimeout(() => {
          seatTimer.current = null;
          setActiveRowIds(rowIds);
          requestAnimationFrame(() => requestAnimationFrame(() => setSeatsOn(true)));
        }, 150);
      } else setActiveRowIds(rowIds);

      if (polish) { glide(viewportRef.current, { scale, posX, posY }, 440); return; }
      runViewportAnimation(
        viewport,
        { scale, posX, posY },
        320,
        setViewport,
        undefined,
        zoomAnimRafRef,
      );
    },
    [data, maxScale, polish, glide, size.height, size.width, viewport, inT, inR, inB, inL],
  );

  /* the pins sit at the middle of their sections (read from the drawn outlines), and the pin size follows the zoom through --vs */
  useEffect(() => { svgRef.current?.style.setProperty("--vs", String(viewport.scale)); }, [viewport.scale]);
  useEffect(() => {
    if (!pins || pins.length === 0 || !data) { setPinAt([]); return; }
    const svg = svgRef.current;
    if (!svg) return;
    const next: { sid: string; x: number; y: number; box: DOMRect }[] = [];
    for (const sid of pins) {
      const el = svg.querySelector<SVGGraphicsElement>(`path[id="${CSS.escape(sid)}"]`);
      if (!el) continue;
      const b = el.getBBox();
      next.push({ sid, x: b.x + b.width / 2, y: b.y + b.height / 2, box: new DOMRect(b.x, b.y, b.width, b.height) });
    }
    setPinAt(next);
  }, [pins?.join("|"), data]); // eslint-disable-line react-hooks/exhaustive-deps

  // A page can ask the map to zoom to a section (for example to show seats it just found): the section's own path gives the bounds.
  const focusRequest = useSeatmapStore((s) => s.focusRequest);
  useEffect(() => {
    if (!focusRequest || !size.width) return;
    const el = svgRef.current?.querySelector<SVGGraphicsElement>(`path[id="${CSS.escape(focusRequest.sectionId)}"]`);
    if (el) focusSection(focusRequest.sectionId, el.getBBox() as unknown as DOMRect, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new request should move the view
  }, [focusRequest]);

  // Wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      settle();
      const rect = el.getBoundingClientRect();
      /* polished: the step follows how far the wheel or trackpad moved (a pinch on a trackpad arrives as ctrl+wheel), so slow is gentle and fast is quick */
      const factor = polish ? Math.min(1.25, Math.max(0.8, Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0018)))) : e.deltaY < 0 ? 1.12 : 1 / 1.12;
      zoomBy(factor, e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomBy, polish, settle]);

  // polished: zooming back out (wheel, pinch, buttons) hands the shapes back their fill and drops the seats, as Back to map does.
  // It only counts once the zoom-in has actually arrived, so a slow frame during the glide in is never mistaken for zooming out.
  useEffect(() => {
    if (!polish || !focusedSectionId || !defaultViewRef.current) { reachedFocus.current = false; return; }
    const limit = defaultViewRef.current.scale * 3;
    if (viewport.scale >= limit) { reachedFocus.current = true; return; }
    if (reachedFocus.current) {
      reachedFocus.current = false;
      setFocusedSectionId(null);
      setActiveRowIds(null);
    }
  }, [polish, focusedSectionId, viewport.scale]);

  // Escape steps back out of a focused section (polished)
  useEffect(() => {
    if (!polish || !focusedSectionId) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); resetView(); } };
    /* capture phase, so the page behind (whose Escape closes the whole seat screen) sees it already handled */
    window.addEventListener("keydown", esc, true);
    return () => window.removeEventListener("keydown", esc, true);
  }, [polish, focusedSectionId, resetView]);

  // Touch: pinch zoom + single-finger pan (native listeners so preventDefault works on iOS).
  // Pointer handlers below are mouse-only — dual pointer+touch streams fight on Safari.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !background?.url) return;

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
        setLive((vp) => ({ ...vp, posX: newPos.x, posY: newPos.y }));
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
        setLive({
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
        setLive((prev) => ({
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
  }, [background?.url]);

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
      originX: viewportRef.current.posX,
      originY: viewportRef.current.posY,
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
    setLive((prev) => ({
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

  const ready = Boolean(data && background?.url && lookupsReady);
  const showLoading =
    !ready || (lookupsMode === "auto" && loadingTicketGroups);

  if (!background?.url) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-white/12 bg-card ${className}`}
      >
        <p className="text-[14px] text-ink2">Seat map unavailable</p>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/12 bg-card ${className}`}>
      <div
        ref={containerRef}
        className="relative h-full min-h-[420px] w-full touch-none select-none"
        onPointerDownCapture={(e) => { settle(); downRef.current = { x: e.clientX, y: e.clientY }; }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={(e) => {
          /* a click on the map away from the seats clears the hover and any card; the view stays where it is (the home button on the right puts it back) */
          setTooltip(null);
          if (polish) setHoverSec(null);
        }}
        onDoubleClick={polish ? (e) => {
          const t = e.target as Element;
          if (t.closest?.("[data-section-root],[data-interactive-seat]")) return;
          const r = e.currentTarget.getBoundingClientRect();
          glideZoom(2, e.clientX - r.left, e.clientY - r.top);
        } : undefined}
      >
        {showLoading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40">
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
            ref={gRef}
            style={polish ? { willChange: "transform" } : undefined}
            transform={`translate(${viewport.posX} ${viewport.posY}) scale(${viewport.scale})`}
          >
            <image
              href={background.url}
              x={0}
              y={0}
              width={background.width}
              height={background.height}
              preserveAspectRatio="none"
            />
            {data ? (
              <>
                <SeatmapSections
                  data={data}
                  sectionCoversEnabled={sectionCoversEnabled}
                  showCovers={polish ? true : !focusedSectionId}
                  polish={polish}
                  onHover={setHoverSec}
                  focusedSectionId={focusedSectionId}
                  onZoomableSectionClick={focusSection}
                  onTooltip={showTip}
                />
                <g className="seats" style={polish ? { opacity: seatsOn ? 1 : 0, transition: "opacity 200ms cubic-bezier(0.2,0,0,1)" } : undefined}>
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
                              onTooltip={showTip}
                              unavailableFill={polish ? "#C6CBD6" : undefined}
                              hoverGrow={polish}
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
                {pinAt.length > 0 ? (
                  <g className="pins" style={{ opacity: focusedSectionId == null ? 1 : 0, pointerEvents: focusedSectionId == null ? "auto" : "none", transition: "opacity 200ms cubic-bezier(0.2,0,0,1)" }}>
                    {pinAt.map((p) => (
                      <g key={p.sid} transform={`translate(${p.x} ${p.y})`}>
                        <g style={{ transform: "scale(calc(1 / var(--vs, 1)))", transformOrigin: "0 0" }} className="cursor-pointer" role="button" aria-label="Accessible seating, zoom to this section" tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); focusSection(p.sid, p.box); }}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); focusSection(p.sid, p.box); } }}>
                          <circle r={17} fill="#F4BC16" opacity={0.5} style={{ animation: "bt-ping 1.9s cubic-bezier(0,0,0.2,1) infinite", transformOrigin: "0 0" }} />
                          <circle r={26} fill="transparent" />
                          <circle r={17} fill="#0B1220" stroke="#ffffff" strokeWidth={2} />
                          <use href="#icon-accessible" x={-9} y={-9} width={18} height={18} pointerEvents="none" />
                        </g>
                      </g>
                    ))}
                  </g>
                ) : null}
              </>
            ) : null}
          </g>
        </svg>

        {/* Seat key (from the map player): a small glass disclosure that says what the colours mean. On a screen too narrow to keep it beside the page's dock (a page that
            passes an inset has one) it rides just above the dock, so the dock never covers it, on a phone too. */}
        {glassChrome ? (
          <details className="group absolute left-4 z-10 rounded-[20px] glass glass-float text-h-foreground max-md:left-3" style={{ bottom: polish && size.width < 1000 ? inB : 16 }}>
            <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-[20px] px-3 py-2 text-xs font-medium outline-none transition-colors hover:bg-h-default focus-visible:ring-2 focus-visible:ring-h-focus group-open:hover:bg-transparent [&::-webkit-details-marker]:hidden">
              <span className="flex"><i className="size-2.5 rounded-full bg-[#3E8BF7]" /><i className="-ml-1 size-2.5 rounded-full bg-[#C6CBD6]" /></span>Seat key
              <CaretDown weight="bold" className="ml-auto size-3 text-h-muted transition-transform duration-150 group-open:rotate-180" aria-hidden />
            </summary>
            <ul className="grid gap-2 border-t border-h-separator px-3 pb-3 pt-2 text-xs text-h-muted">
              <li className="flex items-center gap-2"><i className="size-2.5 rounded-full bg-[#3E8BF7]" />Available</li>
              <li className="flex items-center gap-2"><i className="size-2.5 rounded-full bg-[#C6CBD6]" />Taken or sold out</li>
              <li className="flex items-center gap-2"><i className="size-2.5 rounded-full bg-[#7F8697]" />Sold-out section</li>
              <li className="flex items-center gap-2"><i className="size-2.5 rounded-full bg-[var(--t,var(--green,#97dd62))]" />Yours</li>
            </ul>
          </details>
        ) : null}

        {/* Zoom chrome */}
        {glassChrome ? (
          /* one glass pill, vertical, middle right (the player's control rail): home, find my seat, full screen, zoom in, zoom out */
          (() => {
            const away = Boolean(focusedSectionId) || Boolean(defaultViewRef.current && Math.abs(viewport.scale - defaultViewRef.current.scale) > 0.01);
            const btn = "grid size-10 place-items-center rounded-full text-foreground transition-colors hover:bg-foreground/10 active:scale-95 disabled:pointer-events-none disabled:opacity-35";
            const mine = [...picked].reverse().find((g) => g.sectionId != null);
            const locate = () => {
              if (!mine) return;
              const sid = String(mine.sectionId);
              const el = svgRef.current?.querySelector<SVGGraphicsElement>(`path[id="${CSS.escape(sid)}"]`);
              if (el) focusSection(sid, el.getBBox() as unknown as DOMRect, false);
            };
            const canFull = typeof document !== "undefined" && document.fullscreenEnabled;
            const toggleFull = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen?.(); };
            return (
              <>
                <div role="group" aria-label="Map controls" className={`absolute right-4 top-1/2 flex -translate-y-1/2 flex-col items-center gap-0.5 rounded-full glass glass-float p-1 max-md:right-3 ${away || mine ? "" : "max-md:hidden"}`}>
                  <button type="button" aria-label="Back to the whole map" title="Whole map" className={btn} disabled={!away} onClick={resetView}><House weight="bold" className="size-[18px]" aria-hidden /></button>
                  <button type="button" aria-label="Find my seats" title="My seats" className={btn} disabled={!mine} onClick={locate}><Crosshair weight="bold" className="size-[18px]" aria-hidden /></button>
                  {canFull ? <button type="button" aria-label="Full screen" title="Full screen" className={`${btn} max-md:hidden`} onClick={toggleFull}><ArrowsOut weight="bold" className="size-[18px]" aria-hidden /></button> : null}
                  <span aria-hidden className="my-0.5 h-px w-5 bg-foreground/15 max-md:hidden" />
                  <button type="button" aria-label="Zoom in" className={`${btn} max-md:hidden`} onClick={() => glideZoom(1.4)}><Plus weight="bold" className="size-[18px]" aria-hidden /></button>
                  <button type="button" aria-label="Zoom out" className={`${btn} max-md:hidden`} onClick={() => glideZoom(1 / 1.4)}><Minus weight="bold" className="size-[18px]" aria-hidden /></button>
                </div>
                {/* the player's minimap: the whole venue in a small glass card, with where you are; click it to go there. Only once you are zoomed in. */}
                {SHOW_MINIMAP && away && background?.url ? (
                  <button
                    type="button"
                    aria-label="Full venue, click to move there"
                    className="absolute bottom-16 left-4 z-10 hidden w-40 overflow-hidden rounded-[18px] glass glass-float p-1.5 text-left md:block"
                    onClick={(e) => {
                      const r = e.currentTarget.getBoundingClientRect();
                      const pad = 6, w = r.width - pad * 2, h = w * (background.height / background.width);
                      const wx = ((e.clientX - r.left - pad) / w) * background.width;
                      const wy = ((e.clientY - r.top - pad) / h) * background.height;
                      const v = viewportRef.current;
                      glide(v, { scale: v.scale, posX: size.width / 2 - wx * v.scale, posY: size.height / 2 - wy * v.scale }, 360);
                    }}
                  >
                    <span className="mb-1 block px-1 text-[11px] font-medium leading-4 text-h-muted">Full venue</span>
                    <svg viewBox={`0 0 ${background.width} ${background.height}`} className="block w-full rounded-[12px] bg-white" aria-hidden>
                      <image href={background.url} width={background.width} height={background.height} preserveAspectRatio="none" />
                      <rect
                        x={-viewport.posX / viewport.scale}
                        y={-viewport.posY / viewport.scale}
                        width={size.width / viewport.scale}
                        height={size.height / viewport.scale}
                        fill="rgb(62 139 247 / 0.18)"
                        stroke="#3E8BF7"
                        strokeWidth={Math.max(background.width / 90, 4)}
                        rx={background.width / 120}
                      />
                    </svg>
                  </button>
                ) : null}
              </>
            );
          })()
        ) : (
          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            <button type="button" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.25)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-foreground/15 bg-background/90 text-foreground backdrop-blur hover:bg-foreground/10">−</button>
            <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1.25)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-foreground/15 bg-background/90 text-foreground backdrop-blur hover:bg-foreground/10">+</button>
            {focusedSectionId ||
            (defaultViewRef.current &&
              Math.abs(viewport.scale - defaultViewRef.current.scale) > 0.01) ? (
              <Button variant="outline" size="sm" className="!h-9 backdrop-blur" onClick={resetView}>
                Back to map
              </Button>
            ) : null}
          </div>
        )}

        <div className={`pointer-events-none absolute right-4 top-4 rounded-full px-3 py-1.5 text-[12px] max-md:hidden ${glassChrome ? "glass glass-float text-foreground" : "border border-white/10 bg-background/80 text-ink2 backdrop-blur"}`}>
          Pinch or scroll to zoom · drag to pan
        </div>
      </div>

      {polish && !focusedSectionId && !tooltip && !animating.current ? <SeatmapSectionTip target={hoverSec} /> : null}

      <SeatmapTooltip
        target={tooltip}
        onClose={() => setTooltip(null)}
        onUnlock={onUnlockOffer}
        glass={glassChrome}
      />
    </div>
  );
}

export const InteractiveSeatmapMemo = memo(InteractiveSeatmap);
