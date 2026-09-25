"use client";

import { memo, useMemo, useRef } from "react";
import type { SeatmapSeat } from "@/lib/seatmapLookups";
import { SEATMAP_TAP_THRESHOLD_PX } from "@/lib/seatmapPopup";
import type { TicketGroup } from "@/stores/filtersStore";
import useSeatmapStore from "@/stores/seatmapStore";
import type { SeatmapTooltipTarget } from "./SeatmapTooltip";

const TOOLTIP_TIMEOUT = 500;
export const TOOLTIP_DISMISS_DELAY_MS = 200;
const SEAT_SCALE = 0.95;
/** Matches the `vw < 900` layout breakpoint that swaps in the mobile selection footer. */
const MOBILE_MAX_PX = 899;

export function isMobileSeatmapViewport() {
  return typeof window !== "undefined" && window.innerWidth <= MOBILE_MAX_PX;
}

function eventPoint(event: {
  clientX?: number;
  clientY?: number;
  changedTouches?: ArrayLike<{ clientX: number; clientY: number }>;
}) {
  const touch = event.changedTouches?.[0];
  if (touch) return { x: touch.clientX, y: touch.clientY };
  return { x: event.clientX ?? 0, y: event.clientY ?? 0 };
}

function isLockedOffer(group: TicketGroup) {
  return Boolean(group.offer?.accessCode && !group.offer?.unlocked);
}

function isExclusiveOffer(group?: TicketGroup | null) {
  return (
    (group?.offer as { inventoryType?: string } | undefined)?.inventoryType ===
    "exclusive"
  );
}

/** Tap/click a sellable seat: select it, and on mobile also open the details panel. */
export function activateSellableSeat(args: {
  ticketGroup?: TicketGroup | null;
  seatId: string;
  selected?: boolean;
  hasMultipleOffers?: boolean;
  clientX: number;
  clientY: number;
  onTooltip: (target: SeatmapTooltipTarget | null) => void;
  selectSpecificSeat: (id: string, ticketGroup: TicketGroup) => void;
  unselectSeat: (id: string, ticketGroup: TicketGroup) => void;
}) {
  const {
    ticketGroup,
    seatId,
    selected,
    hasMultipleOffers,
    clientX,
    clientY,
    onTooltip,
    selectSpecificSeat,
    unselectSeat,
  } = args;
  if (!ticketGroup) return;

  const locked = Boolean(
    ticketGroup.offer?.accessCode && !ticketGroup.offer?.unlocked,
  );
  if (selected) {
    unselectSeat(seatId, ticketGroup);
    onTooltip(null);
    return;
  }
  if (locked || hasMultipleOffers) {
    onTooltip({ kind: "seat", seatId, x: clientX, y: clientY, pinned: true });
    return;
  }
  if (isMobileSeatmapViewport()) {
    onTooltip({ kind: "seat", seatId, x: clientX, y: clientY, pinned: true });
    return;
  }
  selectSpecificSeat(seatId, ticketGroup);
  // Selecting straight off the map is still a click elsewhere for whichever
  // card was open, so it closes rather than hanging over the new selection.
  onTooltip(null);
}

function accessibleColor(accessibleType?: string) {
  if (accessibleType === "DA") return "#2DEDB4";
  if (accessibleType === "DB") return "#F4BC16";
  return "#F4BC16";
}

function offerColor(color?: string | null) {
  const value = color?.trim();
  if (!value) return null;
  if (
    typeof CSS === "undefined" ||
    typeof CSS.supports !== "function" ||
    CSS.supports("color", value)
  ) {
    return value;
  }
  return null;
}

type Props = {
  seat: SeatmapSeat;
  onTooltip: (target: SeatmapTooltipTarget | null) => void;
  onTooltipLeave?: () => void;
  isTooltipActive: boolean;
};

const SeatmapSeat = memo(function SeatmapSeat({
  seat,
  onTooltip,
  onTooltipLeave,
  isTooltipActive,
}: Props) {
  const selectSpecificSeat = useSeatmapStore((s) => s.selectSpecificSeat);
  const unselectSeat = useSeatmapStore((s) => s.unselectSeat);
  const seatLookupTable = useSeatmapStore((s) => s.seatLookupTable);
  const seatOffersLookupTable = useSeatmapStore((s) => s.seatOffersLookupTable);
  const seatBorderRadius = useSeatmapStore((s) => s.seatBorderRadius);

  const ticketGroup = seatLookupTable[seat.seatId];
  const seatOffers =
    seatOffersLookupTable[seat.seatId]?.length
      ? seatOffersLookupTable[seat.seatId]
      : ticketGroup
        ? [ticketGroup]
        : [];
  const hasMultipleOffers = seatOffers.length > 1;
  const displayTicketGroup =
    ticketGroup && !isLockedOffer(ticketGroup)
      ? ticketGroup
      : seatOffers.find((offer) => !isLockedOffer(offer)) ?? ticketGroup;
  const canActivate = Boolean(ticketGroup);
  const canHoverPreview = Boolean(ticketGroup);

  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverCoordsRef = useRef({ x: 0, y: 0 });
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);
  const seatRectRef = useRef<SVGRectElement>(null);

  const tooltipAnchor = (fallback: { x: number; y: number }) => {
    const node = seatRectRef.current;
    if (!node) return fallback;
    const box = node.getBoundingClientRect();
    return {
      x: box.left + box.width / 2,
      y: box.top + box.height / 2,
    };
  };

  const accessibleType =
    seat.accessibleType ||
    seat.accessiblityType ||
    seat.accessibilityType ||
    (ticketGroup?.accessibleType as string | undefined) ||
    (ticketGroup?.accessiblityType as string | undefined) ||
    (ticketGroup?.accessibilityType as string | undefined);

  const isAccessible =
    Boolean(accessibleType) ||
    Boolean(seat.accessible || ticketGroup?.accessible);

  const seatColor = useMemo(() => {
    if (seat.selected) return "var(--seatmap-selected, #A6E773)";
    if (!ticketGroup) return "#E6E8EC";
    if (isAccessible) return accessibleColor(accessibleType);
    if (displayTicketGroup && isLockedOffer(displayTicketGroup)) return "#353945";
    if (displayTicketGroup?.resale) return "#E06C35";
    if (isExclusiveOffer(displayTicketGroup)) return "#9757D7";
    if (displayTicketGroup?.offer?.accessCode) {
      return "var(--seatmap-accent, #3E8BF7)";
    }
    const inventoryColor = offerColor(displayTicketGroup?.offer?.color);
    if (inventoryColor) return inventoryColor;
    return "var(--seatmap-accent, #3E8BF7)";
  }, [
    accessibleType,
    displayTicketGroup,
    isAccessible,
    seat.selected,
    ticketGroup,
  ]);

  const clearHover = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  const activate = (event: {
    stopPropagation: () => void;
    preventDefault?: () => void;
    clientX?: number;
    clientY?: number;
    changedTouches?: ArrayLike<{ clientX: number; clientY: number }>;
  }) => {
    event.stopPropagation();
    clearHover();
    const anchor = tooltipAnchor(eventPoint(event));
    activateSellableSeat({
      ticketGroup,
      seatId: seat.seatId,
      selected: seat.selected,
      hasMultipleOffers,
      clientX: anchor.x,
      clientY: anchor.y,
      onTooltip,
      selectSpecificSeat,
      unselectSeat,
    });
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    if (!canActivate) return;
    event.stopPropagation();
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const finishPointerTap = (event: React.PointerEvent) => {
    event.stopPropagation();
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.hypot(dx, dy) > SEATMAP_TAP_THRESHOLD_PX) return;

    suppressClickRef.current = true;
    activate(event);
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    if (event.pointerType === "touch") {
      event.preventDefault();
    }
    finishPointerTap(event);
  };

  const handlePointerCancel = () => {
    pointerStartRef.current = null;
  };

  const handleSeatClick = (event: React.MouseEvent) => {
    if (suppressClickRef.current) {
      event.stopPropagation();
      suppressClickRef.current = false;
      return;
    }
    activate(event);
  };

  const handleSeatTouchEnd = (event: React.TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = true;
    pointerStartRef.current = null;
    activate(event);
  };

  const handleMouseEnter = (event: React.MouseEvent) => {
    if (!canHoverPreview || isMobileSeatmapViewport()) {
      return;
    }
    hoverCoordsRef.current = tooltipAnchor({
      x: event.clientX,
      y: event.clientY,
    });
    clearHover();
    hoverTimerRef.current = setTimeout(() => {
      const { x, y } = hoverCoordsRef.current;
      onTooltip({ kind: "seat", seatId: seat.seatId, x, y, pinned: false });
    }, TOOLTIP_TIMEOUT);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    const anchor = tooltipAnchor({
      x: event.clientX,
      y: event.clientY,
    });
    hoverCoordsRef.current = anchor;
    if (!canHoverPreview || isMobileSeatmapViewport() || !isTooltipActive) return;
    onTooltip({
      kind: "seat",
      seatId: seat.seatId,
      x: anchor.x,
      y: anchor.y,
      pinned: false,
    });
  };

  const handleMouseLeave = () => {
    if (isMobileSeatmapViewport()) return;
    clearHover();
    if (onTooltipLeave) {
      onTooltipLeave();
      return;
    }
    onTooltip(null);
  };

  const x = seat.cx - (seat.w * SEAT_SCALE - seat.w) / 2;
  const y = seat.cy - (seat.h * SEAT_SCALE - seat.h) / 2;
  const width = seat.w * SEAT_SCALE;
  const height = seat.h * SEAT_SCALE;
  const radius =
    typeof seatBorderRadius === "number"
      ? seatBorderRadius * SEAT_SCALE
      : Number(seatBorderRadius) || 0;

  const iconId = (() => {
    if (seat.selected) return "icon-selected";
    if (!ticketGroup) return null;
    if (displayTicketGroup?.resale) return "icon-resale";
    if (isAccessible) return "icon-accessible";
    if (displayTicketGroup && isLockedOffer(displayTicketGroup)) {
      return "icon-locked";
    }
    if (isExclusiveOffer(displayTicketGroup)) {
      if (displayTicketGroup?.offer?.unlocked) return "icon-unlocked";
      return "icon-vip";
    }
    // Worth badging only when the code opened the seat's one offer. Sharing the
    // seat with open inventory means the shopper buys it either way.
    if (
      !hasMultipleOffers &&
      displayTicketGroup?.offer?.accessCode &&
      displayTicketGroup.offer.unlocked
    ) {
      return "icon-unlocked";
    }
    return null;
  })();

  return (
    <g data-interactive-seat="true">
      <rect
        ref={seatRectRef}
        id={seat.seatId}
        className={canActivate ? "cursor-pointer" : undefined}
        x={x}
        y={y}
        rx={radius}
        ry={radius}
        width={width}
        height={height}
        fill={seatColor}
        onPointerDown={canActivate ? handlePointerDown : undefined}
        onPointerUp={canActivate ? handlePointerUp : undefined}
        onPointerCancel={canActivate ? handlePointerCancel : undefined}
        onClick={canActivate ? handleSeatClick : undefined}
        onTouchEnd={canActivate ? handleSeatTouchEnd : undefined}
        onMouseEnter={canHoverPreview ? handleMouseEnter : undefined}
        onMouseMove={canHoverPreview ? handleMouseMove : undefined}
        onMouseLeave={canHoverPreview ? handleMouseLeave : undefined}
      />
      {iconId ? (
        <use
          href={`#${iconId}`}
          x={x + width * 0.2}
          y={y + height * 0.2}
          width={width * 0.6}
          height={height * 0.6}
          pointerEvents="none"
          fill="white"
        />
      ) : null}
    </g>
  );
});

export default SeatmapSeat;
