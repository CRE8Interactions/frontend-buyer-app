"use client";

import { memo, useMemo, useRef } from "react";
import type { SeatmapSeat } from "@/lib/seatmapLookups";
import useSeatmapStore from "@/stores/seatmapStore";
import type { SeatmapTooltipTarget } from "./SeatmapTooltip";

const TOOLTIP_TIMEOUT = 500;
const SEAT_SCALE = 0.95;

function accessibleColor(accessibleType?: string) {
  if (accessibleType === "DA") return "#2DEDB4";
  if (accessibleType === "DB") return "#F4BC16";
  return "#F4BC16";
}

type Props = {
  seat: SeatmapSeat;
  /** `force` closes a card a click opened too (picking a seat); without it a hover only changes a hover card */
  onTooltip: (target: SeatmapTooltipTarget | null, force?: boolean) => void;
  isTooltipActive: boolean;
  /** the colour of a seat nobody can buy (default: the pale grey the map has always used) */
  unavailableFill?: string;
  /** a buyable seat grows a little under the pointer (default: no) */
  hoverGrow?: boolean;
};

const SeatmapSeat = memo(function SeatmapSeat({
  seat,
  onTooltip,
  isTooltipActive,
  unavailableFill = "#E6E8EC",
  hoverGrow = false,
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
    /* a picked seat takes the team colour (--t, set on a team page) and the brand green anywhere else */
    if (seat.selected) return "var(--t, var(--green))";
    if (!ticketGroup) return unavailableFill;
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
    return "#3E8BF7";
  }, [accessibleType, isAccessible, seat.selected, ticketGroup, unavailableFill]);

  const clearHover = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  const handleSeatClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    clearHover();
    if (!ticketGroup) return;

    const locked = Boolean(
      ticketGroup.offer?.accessCode && !ticketGroup.offer?.unlocked,
    );
    if (locked || window.innerWidth <= 768 || hasMultipleOffers) {
      onTooltip({
        kind: "seat",
        seatId: seat.seatId,
        x: event.clientX,
        y: event.clientY,
        pinned: true,
      });
      return;
    }
    onTooltip(null, true);
    selectSpecificSeat(seat.seatId, ticketGroup);
  };

  const handleUnselect = (event: React.MouseEvent) => {
    event.stopPropagation();
    clearHover();
    if (!ticketGroup) return;
    unselectSeat(seat.seatId, ticketGroup);
  };

  const handleMouseEnter = (event: React.MouseEvent) => {
    /* a locked offer shows a hover card too (the click then keeps it open); a seat with several offers hovers as a short card (the place and "N offers from"), and its click opens the choice */
    if (!ticketGroup || window.innerWidth <= 768) {
      return;
    }
    hoverCoordsRef.current = { x: event.clientX, y: event.clientY };
    clearHover();
    hoverTimerRef.current = setTimeout(() => {
      const { x, y } = hoverCoordsRef.current;
      onTooltip({ kind: "seat", seatId: seat.seatId, x, y });
    }, hoverGrow ? 60 : TOOLTIP_TIMEOUT);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    hoverCoordsRef.current = { x: event.clientX, y: event.clientY };
    if (!ticketGroup || window.innerWidth <= 768 || !isTooltipActive) return;
    onTooltip({
      kind: "seat",
      seatId: seat.seatId,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleMouseLeave = () => {
    /* the map keeps a card that a click opened (it ignores this clear), and takes away a hover card */
    if (window.innerWidth <= 768) return;
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
        data-active={hoverGrow && isTooltipActive ? "true" : undefined}
        className={ticketGroup ? (hoverGrow ? "cursor-pointer [transform-box:fill-box] [transform-origin:center] transition-[fill,stroke] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:fill-[color-mix(in_oklab,var(--seat)_78%,black)] hover:stroke-[color-mix(in_oklab,var(--seat)_45%,transparent)] data-[active=true]:fill-[color-mix(in_oklab,var(--seat)_78%,black)] data-[active=true]:stroke-[color-mix(in_oklab,var(--seat)_45%,transparent)] [paint-order:stroke] [stroke:transparent] motion-reduce:transition-none" : "cursor-pointer") : undefined}
        style={hoverGrow && ticketGroup ? ({ "--seat": seatColor, strokeWidth: width * 0.5 } as React.CSSProperties) : undefined}
        x={x}
        y={y}
        rx={radius}
        ry={radius}
        width={width}
        height={height}
        fill={seatColor}
        onClick={
          ticketGroup
            ? seat.selected
              ? handleUnselect
              : handleSeatClick
            : undefined
        }
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
