"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type WheelEvent,
} from "react";

/** Horizontal offer chips with previous/next controls when the row overflows. */
function OfferScrollArrow({
  direction,
  color,
  hover,
  label,
  onClick,
}: {
  direction: "previous" | "next";
  color: string;
  hover: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="offer-scroll-arrow"
      style={{
        fontFamily: "inherit",
        flexShrink: 0,
        width: 40,
        height: 40,
        borderRadius: 999,
        border: "1px solid rgba(5,27,53,0.12)",
        color,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        cursor: "pointer",
        ["--offer-arrow-hover" as string]: hover,
      }}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <polyline points={direction === "previous" ? "15 6 9 12 15 18" : "9 6 15 12 9 18"} />
      </svg>
    </button>
  );
}

export default function OfferChipScroller({
  children,
  selectedId,
  accent = "#E10600",
  accentSoft = "#f4f5f6",
}: {
  children: ReactNode;
  selectedId?: string;
  accent?: string;
  accentSoft?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const update = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(max > 1 && el.scrollLeft > 4);
    setCanScrollRight(max > 1 && el.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    update();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    observer?.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    const onWheel = (event: globalThis.WheelEvent) => {
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 1) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const atStart = el.scrollLeft <= 0;
      const atEnd = el.scrollLeft >= max - 1;
      if ((event.deltaY < 0 && atStart) || (event.deltaY > 0 && atEnd)) return;
      event.preventDefault();
      el.scrollLeft += event.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      observer?.disconnect();
      el.removeEventListener("scroll", update);
      el.removeEventListener("wheel", onWheel);
    };
  }, [update, children]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !selectedId) return;
    const active = el.querySelector(`[data-offer-id="${CSS.escape(selectedId)}"]`);
    if (!(active instanceof HTMLElement)) return;
    const elRect = el.getBoundingClientRect();
    const btnRect = active.getBoundingClientRect();
    if (btnRect.left < elRect.left + 8) {
      el.scrollLeft += btnRect.left - elRect.left - 8;
    } else if (btnRect.right > elRect.right - 8) {
      el.scrollLeft += btnRect.right - elRect.right + 8;
    }
    update();
  }, [selectedId, update]);

  const scrollOffers = (direction: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollLeft += direction * Math.max(180, el.clientWidth * 0.75);
    update();
  };

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return (
    <div style={{ display: "flex", alignItems: "center", minWidth: 0, gap: 4 }}>
      <style>{`
        .offer-scroll-arrow { background: #fff; box-shadow: 0 1px 4px rgba(5, 27, 53, 0.16); transition: background 140ms ease, box-shadow 140ms ease; }
        .offer-scroll-arrow:hover,
        .offer-scroll-arrow:focus-visible { background: var(--offer-arrow-hover, #f4f5f6); }
      `}</style>
      {canScrollLeft ? (
        <OfferScrollArrow
          direction="previous"
          color={accent}
          hover={accentSoft}
          label="Show previous offers"
          onClick={() => scrollOffers(-1)}
        />
      ) : null}
      <div
        ref={scrollerRef}
        data-testid="offer-chip-scroller"
        onWheel={onWheel}
        className="nmt-filter-scroll nmt-noscroll"
        style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: "1 1 auto", overflowX: "auto", flexWrap: "nowrap", scrollbarWidth: "none" }}
      >
        {children}
      </div>
      {canScrollRight ? (
        <OfferScrollArrow
          direction="next"
          color={accent}
          hover={accentSoft}
          label="Show more offers"
          onClick={() => scrollOffers(1)}
        />
      ) : null}
    </div>
  );
}
