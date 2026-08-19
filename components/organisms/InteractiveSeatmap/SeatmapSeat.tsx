"use client";

import { memo, useMemo, useRef } from "react";
import type { SeatmapSeat } from "@/lib/seatmapLookups";
import type { TicketGroup } from "@/stores/filtersStore";
import useSeatmapStore from "@/stores/seatmapStore";
import type { SeatmapTooltipTarget } from "./SeatmapTooltip";

const TOOLTIP_TIMEOUT = 500;
const SEAT_SCALE = 0.95;
const MOBILE_MAX_PX = 768;

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
    onTooltip({ kind: "seat", seatId, x: clientX, y: clientY });
    return;
  }
  selectSpecificSeat(seatId, ticketGroup);
  if (isMobileSeatmapViewport()) {
    onTooltip({ kind: "seat", seatId, x: clientX, y: clientY });
  }
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
  isTooltipActive: boolean;
};

const SeatmapSeat = memo(function SeatmapSeat({
  seat,
  onTooltip,
  isTooltipActive,
}: Props) {
  const selectSpecificSeat = useSeatmapStore((s) => s.selectSpecificSeat);
  const unselectSeat = useSeatmapStore((s) => s.unselectSeat);
  const seatLookupTable = useSeatmapStore((s) => s.seatLookupTable);
  const seatOffersLookupTable = useSeatmapStore((s) => s.seatOffersLookupTable);
  const seatBorderRadius = useSeatmapStore((s) => s.seatBorderRadius);

  const ticketGroup = seatLookupTable[seat.seatId];
  const seatOffers = seatOffersLookupTable[seat.seatId] || [];
  const hasMultipleOffers = seatOffers.length > 1;

  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverCoordsRef = useRef({ x: 0, y: 0 });
  const touchHandledRef = useRef(false);

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
    if (ticketGroup.offer?.accessCode && !ticketGroup.offer?.unlocked)
      return "#353945";
    if (ticketGroup.resale) return "#E06C35";
    if (
      (ticketGroup.offer as { inventoryType?: string } | undefined)
        ?.inventoryType === "exclusive"
    ) {
      return "#9757D7";
    }
    const inventoryColor = offerColor(ticketGroup.offer?.color);
    if (inventoryColor) return inventoryColor;
    return "var(--seatmap-accent, #3E8BF7)";
  }, [accessibleType, isAccessible, seat.selected, ticketGroup]);

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
    const { x, y } = eventPoint(event);
    activateSellableSeat({
      ticketGroup,
      seatId: seat.seatId,
      selected: seat.selected,
      hasMultipleOffers,
      clientX: x,
      clientY: y,
      onTooltip,
      selectSpecificSeat,
      unselectSeat,
    });
  };

  const handleSeatClick = (event: React.MouseEvent) => {
    if (touchHandledRef.current) {
      event.stopPropagation();
      touchHandledRef.current = false;
      return;
    }
    activate(event);
  };

  const handleSeatTouchEnd = (event: React.TouchEvent) => {
    event.preventDefault();
    touchHandledRef.current = true;
    activate(event);
  };

  const handleMouseEnter = (event: React.MouseEvent) => {
    if (
      !ticketGroup ||
      isMobileSeatmapViewport() ||
      hasMultipleOffers ||
      (ticketGroup.offer?.accessCode && !ticketGroup.offer?.unlocked)
    ) {
      return;
    }
    hoverCoordsRef.current = { x: event.clientX, y: event.clientY };
    clearHover();
    hoverTimerRef.current = setTimeout(() => {
      const { x, y } = hoverCoordsRef.current;
      onTooltip({ kind: "seat", seatId: seat.seatId, x, y });
    }, TOOLTIP_TIMEOUT);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    hoverCoordsRef.current = { x: event.clientX, y: event.clientY };
    if (!ticketGroup || isMobileSeatmapViewport() || !isTooltipActive) return;
    onTooltip({
      kind: "seat",
      seatId: seat.seatId,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleMouseLeave = () => {
    if (isMobileSeatmapViewport() || hasMultipleOffers) return;
    clearHover();
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
    if (ticketGroup?.resale) return "icon-resale";
    if (isAccessible) return "icon-accessible";
    if (ticketGroup?.offer?.unlocked) return "icon-unlocked";
    if (ticketGroup?.offer?.accessCode) return "icon-locked";
    if (
      (ticketGroup?.offer as { inventoryType?: string } | undefined)
        ?.inventoryType === "exclusive"
    ) {
      return "icon-vip";
    }
    return null;
  })();

  return (
    <g data-interactive-seat="true">
      <rect
        id={seat.seatId}
        className={ticketGroup ? "cursor-pointer" : undefined}
        x={x}
        y={y}
        rx={radius}
        ry={radius}
        width={width}
        height={height}
        fill={seatColor}
        onClick={ticketGroup ? handleSeatClick : undefined}
        onTouchEnd={ticketGroup ? handleSeatTouchEnd : undefined}
        onMouseEnter={ticketGroup ? handleMouseEnter : undefined}
        onMouseMove={ticketGroup ? handleMouseMove : undefined}
        onMouseLeave={ticketGroup ? handleMouseLeave : undefined}
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
