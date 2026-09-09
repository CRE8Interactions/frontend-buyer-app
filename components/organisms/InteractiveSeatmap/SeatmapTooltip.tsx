"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/atoms/Button";
import { formatOfferListPrice } from "@/lib/helpers";
import { gaOfferSelectionKey } from "@/lib/connectedOffers";
import {
  limitsFromSeatedOfferRow,
  limitsFromTicketGroup,
  offerRestrictionLabel,
  offerRestrictionLabelForSeatedRow,
  shouldShowSeatedMapOfferRow,
} from "@/lib/ticketListings";
import type { QuantityLimits, RawTicketGroup } from "@/lib/ticketListings";
import { selectionOfferName } from "@/lib/ticketSummary";
import useFiltersStore from "@/stores/filtersStore";
import useSeatmapStore from "@/stores/seatmapStore";
import type { TicketGroup } from "@/stores/filtersStore";
import { isMobileSeatmapViewport } from "./SeatmapSeat";
import type { PopupRect } from "@/lib/seatmapPopup";
import type { SeatmapSeat as SeatmapSeatData } from "@/lib/seatmapLookups";

export type SeatmapTooltipTarget =
  | { kind: "seat"; seatId: string; x: number; y: number; pinned?: boolean }
  | { kind: "section"; sectionId: string; x: number; y: number }
  | null;

type Props = {
  target: SeatmapTooltipTarget;
  onClose: () => void;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
  onUnlockOffer?: (offerName: string) => void;
  /** Asks the map to pan so the seat popup fits without being clipped. */
  onRequestReveal?: (rect: PopupRect) => void;
  accent?: string;
  buttonColor?: string;
  buttonTextColor?: string;
};

function inkOn(hex: string) {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  if (full.length < 6) return "#ffffff";
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#051b35" : "#ffffff";
}

function resolvedOfferQuantity(
  offerQtys: Record<string, number>,
  key: string,
  limits: QuantityLimits,
) {
  if (offerQtys[key] != null) return offerQtys[key];
  return limits.valid ? limits.min : 0;
}

function seatedResolvedOfferQuantity(
  offerQtys: Record<string, number>,
  key: string,
) {
  if (offerQtys[key] != null) return offerQtys[key];
  return 0;
}

function isLockedOffer(offer: TicketGroup) {
  return Boolean(offer.offer?.accessCode && !offer.offer?.unlocked);
}

function TooltipQuantityStepper({
  value,
  limits,
  ink,
  onChange,
  allowZero = false,
}: {
  value: number;
  limits: QuantityLimits;
  ink: string;
  onChange: (next: number) => void;
  allowZero?: boolean;
}) {
  const defaultQty = limits.valid ? limits.min : 0;
  const resolved =
    allowZero && value === 0
      ? 0
      : limits.valid
        ? Math.min(
            Math.max(value ?? defaultQty, allowZero ? 0 : limits.min),
            limits.max,
          )
        : allowZero
          ? Math.max(0, value ?? 0)
          : limits.min;
  const canDecrease = allowZero ? resolved > 0 : limits.valid && resolved > limits.min;
  const canIncrease =
    limits.valid &&
    (resolved === 0 ? limits.min <= limits.max : resolved + limits.step <= limits.max);
  const boxBg =
    ink === "#ffffff" ? "rgba(255,255,255,0.16)" : "rgba(5,27,53,0.08)";

  const decrease = () => {
    if (allowZero && resolved <= limits.min) {
      onChange(0);
      return;
    }
    onChange(Math.max(limits.min, resolved - limits.step));
  };

  const increase = () => {
    if (allowZero && resolved === 0) {
      onChange(limits.min);
      return;
    }
    onChange(Math.min(limits.max, resolved + limits.step));
  };

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={!canDecrease}
        onClick={decrease}
        className="flex h-10 w-7 items-center justify-center border-0 bg-transparent text-[24px] font-light disabled:opacity-30"
        style={{ color: ink }}
      >
        −
      </button>
      <output
        aria-label="Ticket quantity"
        className="flex h-10 min-w-10 items-center justify-center rounded-lg px-2 text-[16px] font-semibold tabular-nums"
        style={{ background: boxBg, color: ink }}
      >
        {resolved}
      </output>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={!canIncrease}
        onClick={increase}
        className="flex h-10 w-7 items-center justify-center border-0 bg-transparent text-[24px] font-light disabled:opacity-30"
        style={{ color: ink }}
      >
        +
      </button>
    </div>
  );
}

const MOBILE_SEAT_CARD_WIDTH = 272;
const MOBILE_SEAT_POPUP_WIDTH = 280;
const MOBILE_SEAT_CARET_SIZE = 10;
const MOBILE_SEAT_POPUP_ESTIMATED_HEIGHT = 140;

/** Anchor popup above the seat so the caret tip lands on target.y. */
export function mobileSeatPopupPosition(
  target: { x: number; y: number },
  cardWidth: number,
  cardHeight: number,
) {
  // Where the popup wants to sit so its caret lands on the seat; the clamped
  // values below keep it on screen, the desired ones tell the map how far to
  // pan so no clamping is needed.
  const desiredLeft = target.x - cardWidth / 2;
  const desiredTop = target.y - cardHeight - MOBILE_SEAT_CARET_SIZE;
  const left = Math.min(
    Math.max(desiredLeft, 16),
    window.innerWidth - cardWidth - 16,
  );
  const caretLeft = Math.min(
    Math.max(target.x - left - MOBILE_SEAT_CARET_SIZE, 20),
    cardWidth - 20,
  );
  const top = Math.max(desiredTop, 16);
  return { left, top, caretLeft, cardWidth, cardHeight, desiredLeft, desiredTop };
}

function SeatPopupCaret({ left, color }: { left: number; color: string }) {
  return (
    <div
      aria-hidden
      data-testid="seat-popup-caret"
      className="absolute h-0 w-0 border-x-[10px] border-t-[10px] border-x-transparent"
      style={{
        left,
        top: "100%",
        marginTop: -1,
        borderTopColor: color,
      }}
    />
  );
}

function MobileSeatAnchoredPopup({
  target,
  width,
  accent,
  caretColor,
  children,
  hoverProps,
  onRequestReveal,
}: {
  target: { x: number; y: number };
  width: number;
  accent: string;
  caretColor?: string;
  children: React.ReactNode;
  hoverProps?: React.HTMLAttributes<HTMLDivElement>;
  onRequestReveal?: (rect: PopupRect) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState(MOBILE_SEAT_POPUP_ESTIMATED_HEIGHT);
  const { left, top, caretLeft, desiredLeft, desiredTop } =
    mobileSeatPopupPosition(target, width, cardHeight);

  useLayoutEffect(() => {
    const nextHeight = cardRef.current?.offsetHeight;
    if (nextHeight && nextHeight !== cardHeight) {
      setCardHeight(nextHeight);
      return;
    }
    onRequestReveal?.({
      left: desiredLeft,
      top: desiredTop,
      width,
      height: cardHeight,
    });
  }, [
    cardHeight,
    children,
    desiredLeft,
    desiredTop,
    onRequestReveal,
    target.x,
    target.y,
    width,
  ]);

  return (
    <div
      className="fixed z-[80]"
      style={{ left, top, width }}
      onClick={(e) => e.stopPropagation()}
      {...hoverProps}
    >
      <div
        ref={cardRef}
        className="relative rounded-2xl border p-4 shadow-2xl shadow-black/40"
        style={{ background: accent, borderColor: "rgba(255,255,255,0.22)" }}
      >
        {children}
        <SeatPopupCaret left={caretLeft} color={caretColor ?? accent} />
      </div>
    </div>
  );
}

function mobileSeatCardPosition(
  target: { x: number; y: number },
  cardHeight: number,
) {
  return mobileSeatPopupPosition(target, MOBILE_SEAT_CARD_WIDTH, cardHeight);
}

function MobileSingleOfferSeatPopup({
  target,
  seat,
  primary,
  accent,
  onAdd,
  onRequestReveal,
}: {
  target: { x: number; y: number };
  seat: SeatmapSeatData | null | undefined;
  primary: TicketGroup;
  accent: string;
  onAdd: () => void;
  onRequestReveal?: (rect: PopupRect) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState(260);
  const { left, top, caretLeft, desiredLeft, desiredTop } =
    mobileSeatCardPosition(target, cardHeight);
  const offerName = selectionOfferName(primary, "Standard");
  const price = formatOfferListPrice(primary?.price ?? 0, primary?.offer);
  const section =
    primary?.sectionName ||
    primary?.sectionNumber ||
    seat?.sectionNumber ||
    "—";
  const row = primary?.rowName || primary?.rowNumber || "—";
  const seatNumber = seat?.seatNumber ?? "—";

  useLayoutEffect(() => {
    const nextHeight = cardRef.current?.offsetHeight;
    if (nextHeight && nextHeight !== cardHeight) {
      setCardHeight(nextHeight);
      return;
    }
    onRequestReveal?.({
      left: desiredLeft,
      top: desiredTop,
      width: MOBILE_SEAT_CARD_WIDTH,
      height: cardHeight,
    });
  }, [
    cardHeight,
    desiredLeft,
    desiredTop,
    offerName,
    onRequestReveal,
    price,
    section,
    row,
    seatNumber,
  ]);

  return (
    <div
      className="fixed z-[80]"
      style={{ left, top, width: MOBILE_SEAT_CARD_WIDTH }}
      onClick={(e) => e.stopPropagation()}
    >
      <div ref={cardRef} className="relative">
        <div
          className="overflow-hidden rounded-2xl shadow-2xl shadow-black/50"
          style={{ background: accent }}
        >
          <div className="px-4 py-3 text-center text-[15px] font-semibold text-white">
            {offerName}
          </div>
          <div className="px-5 pb-5 pt-4 text-white">
            <p className="text-center text-[32px] font-bold leading-none tracking-tight">
              {price}
            </p>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Section", value: section },
                { label: "Row", value: row },
                { label: "Seat", value: seatNumber },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[11px] text-white/70">{label}</p>
                  <p className="mt-1 text-[17px] font-semibold tabular-nums">
                    {value}
                  </p>
                </div>
              ))}
            </div>
            <Button
              className="mt-5 w-full rounded-full py-3 text-[16px] font-semibold"
              style={{ background: "#ffffff", color: accent }}
              onClick={onAdd}
            >
              Add now
            </Button>
          </div>
        </div>
        <SeatPopupCaret left={caretLeft} color={accent} />
      </div>
    </div>
  );
}

export default function SeatmapTooltip({
  target,
  onClose,
  onHoverStart,
  onHoverEnd,
  onUnlockOffer,
  onRequestReveal,
  accent = "#0a2747",
  buttonColor = "#A6E773",
  buttonTextColor = "#051B35",
}: Props) {
  const data = useSeatmapStore((s) => s.data);
  const seatLookupTable = useSeatmapStore((s) => s.seatLookupTable);
  const seatOffersLookupTable = useSeatmapStore((s) => s.seatOffersLookupTable);
  const sectionLookupTable = useSeatmapStore((s) => s.sectionLookupTable);
  const selectSeatedOffers = useSeatmapStore((s) => s.selectSeatedOffers);
  const selectSpecificSeat = useSeatmapStore((s) => s.selectSpecificSeat);
  const selectGASeats = useSeatmapStore((s) => s.selectGASeats);
  const selectedFromMap = useSeatmapStore((s) => s.selectedFromMap);
  const eventTicketLimit = useFiltersStore((s) => s.eventTicketLimit);

  const [gaQty, setGaQty] = useState(0);
  const [offerQtys, setOfferQtys] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target, onClose]);

  useEffect(() => {
    setOfferQtys({});
    setGaQty(0);
  }, [
    target?.kind,
    target?.kind === "seat"
      ? target.seatId
      : target?.kind === "section"
        ? target.sectionId
        : null,
  ]);

  const seat = target?.kind === "seat" ? data?.seats?.[target.seatId] : null;
  const seatOffers =
    target?.kind === "seat"
      ? seatOffersLookupTable[target.seatId] ||
        (seatLookupTable[target.seatId]
          ? [seatLookupTable[target.seatId]]
          : [])
      : [];
  const sectionOffers =
    target?.kind === "section"
      ? sectionLookupTable[target.sectionId] || []
      : [];

  const groupQuantityLimits = (
    group: TicketGroup,
    available?: number,
  ) =>
    limitsFromTicketGroup(
      {
        ...(group as RawTicketGroup),
        ...(available != null
          ? { availableCount: available, maxContiguous: available }
          : {}),
      },
      eventTicketLimit,
    );

  const groupRestrictionLabel = (group: TicketGroup, limits: QuantityLimits) =>
    offerRestrictionLabel(group.package || group.offer, limits);

  const sectionMeta = useMemo(() => {
    if (target?.kind !== "section") return null;
    return data?.sections?.[target.sectionId] || null;
  }, [data?.sections, target]);

  const visibleSeatOffers = useMemo(
    () =>
      seatOffers
        .map((offer, index) => ({ offer, index }))
        .filter(({ offer }) =>
          shouldShowSeatedMapOfferRow(
            offer as RawTicketGroup,
            eventTicketLimit,
          ),
        ),
    [seatOffers, eventTicketLimit],
  );

  if (!target) return null;

  const ink = inkOn(accent);
  const muted = ink === "#ffffff" ? "rgba(255,255,255,0.82)" : "rgba(5,27,53,0.72)";
  const line = ink === "#ffffff" ? "rgba(255,255,255,0.22)" : "rgba(5,27,53,0.14)";
  const actionBg = buttonColor.toLowerCase() === accent.toLowerCase() ? ink : buttonColor;
  const actionInk = buttonColor.toLowerCase() === accent.toLowerCase() ? accent : buttonTextColor;

  const style: React.CSSProperties = {
    position: "fixed",
    left: Math.min(target.x + 12, window.innerWidth - 300),
    top: Math.min(target.y + 12, window.innerHeight - 220),
    zIndex: 80,
    background: accent,
    color: ink,
    borderColor: line,
  };
  const hoverProps = {
    onMouseEnter: onHoverStart,
    onMouseLeave: onHoverEnd,
  };

  if (target.kind === "seat") {
    const primary = visibleSeatOffers[0]?.offer ?? seatOffers[0];
    const locked =
      visibleSeatOffers.length === 1 &&
      Boolean(primary && isLockedOffer(primary));
    const alreadySelected = selectedFromMap.some(
      (g) => g.seatId === target.seatId,
    );
    const multiOffer = visibleSeatOffers.length > 1;
    const showSeatActions =
      isMobileSeatmapViewport() || target.pinned === true;
    const showUnlockForLockedOffer = (offerLocked: boolean) =>
      offerLocked &&
      Boolean(onUnlockOffer) &&
      (showSeatActions || !isMobileSeatmapViewport());
    const mobileSingleOffer =
      isMobileSeatmapViewport() &&
      visibleSeatOffers.length === 1 &&
      primary &&
      !isLockedOffer(primary);

    if (mobileSingleOffer && primary) {
      return (
        <MobileSingleOfferSeatPopup
          target={target}
          seat={seat}
          primary={primary}
          accent={accent}
          onRequestReveal={onRequestReveal}
          onAdd={() => {
            selectSpecificSeat(target.seatId, primary);
            onClose();
          }}
        />
      );
    }

    const seatedOfferPicks = () =>
      seatOffers
        .map((offer, index) => {
          if (
            !shouldShowSeatedMapOfferRow(
              offer as RawTicketGroup,
              eventTicketLimit,
            ) ||
            isLockedOffer(offer)
          ) {
            return null;
          }
          const key = gaOfferSelectionKey(offer, index);
          return {
            ...offer,
            quantity: seatedResolvedOfferQuantity(offerQtys, key),
          };
        })
        .filter(
          (offer): offer is TicketGroup & { quantity: number } =>
            offer != null && Number(offer.quantity) > 0,
        );

    const seatPopupBody = (
      <>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p
              className="text-[12px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: muted }}
            >
              Seat {seat?.seatNumber ?? "—"}
            </p>
            <p className="mt-1 text-[15px] font-semibold" style={{ color: ink }}>
              Sec {primary?.sectionName || primary?.sectionNumber} · Row{" "}
              {primary?.rowName || primary?.rowNumber}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="opacity-80 hover:opacity-100"
            style={{ color: ink }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {visibleSeatOffers.length === 0 ? (
          <p className="mt-3 text-[14px]" style={{ color: muted }}>
            No ticket offers are available for this seat on the map.
          </p>
        ) : multiOffer ? (
          <div className="mt-3 space-y-2">
            {(() => {
              return visibleSeatOffers.map(({ offer, index }) => {
                const key = gaOfferSelectionKey(offer, index);
                const offerLocked = isLockedOffer(offer);
                const limits = limitsFromSeatedOfferRow(
                  offer as RawTicketGroup,
                  eventTicketLimit,
                );
                const selectedQty = seatedResolvedOfferQuantity(offerQtys, key);
                const restrictionLabel = offerRestrictionLabelForSeatedRow(
                  offer.package || offer.offer,
                  limits,
                );
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2"
                    style={{ borderColor: line }}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold" style={{ color: ink }}>
                        {offer.offer?.name || "Offer"}
                      </p>
                      {!offerLocked ? (
                        <p className="text-[12px]" style={{ color: muted }}>
                          {formatOfferListPrice(offer.price ?? 0, offer.offer)}
                        </p>
                      ) : null}
                    {offerLocked ? (
                      <p className="text-[10px]" style={{ color: muted }}>
                        Requires access code
                      </p>
                    ) : restrictionLabel ? (
                      <p className="text-[10px]" style={{ color: muted }}>
                        Ticket limit: {restrictionLabel}
                      </p>
                    ) : null}
                    </div>
                    {offerLocked &&
                    showUnlockForLockedOffer(offerLocked) &&
                    offer.offer?.name ? (
                      <Button
                        className="shrink-0 rounded-full px-3 py-2 text-[12px] font-semibold"
                        style={{ background: "#ffffff", color: accent }}
                        onClick={() => onUnlockOffer!(offer.offer!.name!)}
                      >
                        Unlock offer
                      </Button>
                    ) : showSeatActions ? (
                      <TooltipQuantityStepper
                        value={selectedQty}
                        limits={limits}
                        ink={ink}
                        allowZero
                        onChange={(next) =>
                          setOfferQtys((current) => {
                            const updated = { ...current, [key]: next };
                            if (next > 0) {
                              visibleSeatOffers.forEach(
                                ({ offer: otherOffer, index: otherIndex }) => {
                                  const otherKey = gaOfferSelectionKey(
                                    otherOffer,
                                    otherIndex,
                                  );
                                  if (otherKey !== key) updated[otherKey] = 0;
                                },
                              );
                            }
                            return updated;
                          })
                        }
                      />
                    ) : null}
                  </div>
                );
              });
            })()}
            {!alreadySelected && showSeatActions ? (
              <Button
                className="mt-2 w-full disabled:opacity-50"
                style={{ background: actionBg, color: actionInk }}
                disabled={seatedOfferPicks().length !== 1}
                onClick={() => {
                  const picks = seatedOfferPicks();
                  if (picks.length !== 1) return;
                  selectSeatedOffers(target.seatId, picks);
                  onClose();
                }}
              >
                Add seats
              </Button>
            ) : null}
          </div>
        ) : locked ? (
          <>
            <p className="mt-3 text-[14px]" style={{ color: muted }}>
              This seat requires an access code for{" "}
              <span className="font-semibold" style={{ color: ink }}>
                {primary?.offer?.name}
              </span>
              .
            </p>
            {showUnlockForLockedOffer(true) && primary?.offer?.name ? (
              <Button
                className="mt-4 w-full"
                style={{ background: "#ffffff", color: accent }}
                onClick={() => onUnlockOffer!(primary.offer!.name!)}
              >
                Unlock offer
              </Button>
            ) : null}
          </>
        ) : (
          <>
            <p className="mt-3 text-[14px]" style={{ color: muted }}>
              {selectionOfferName(primary, "Standard")} ·{" "}
              {formatOfferListPrice(primary?.price ?? 0, primary?.offer)}
            </p>
            {!alreadySelected && showSeatActions && primary ? (
              <Button
                className="mt-4 w-full"
                style={{ background: actionBg, color: actionInk }}
                onClick={() => {
                  selectSpecificSeat(target.seatId, primary);
                  onClose();
                }}
              >
                Add seats
              </Button>
            ) : null}
          </>
        )}
      </>
    );

    return (
      <MobileSeatAnchoredPopup
        target={target}
        width={MOBILE_SEAT_POPUP_WIDTH}
        accent={accent}
        hoverProps={hoverProps}
        onRequestReveal={onRequestReveal}
      >
        <div style={{ color: ink }}>{seatPopupBody}</div>
      </MobileSeatAnchoredPopup>
    );
  }

  // GA section tooltip
  const primary = sectionOffers[0];
  const gaLimits = groupQuantityLimits(primary ?? {});
  const selectedGaQty = gaLimits.valid
    ? Math.min(Math.max(gaQty || gaLimits.min, gaLimits.min), gaLimits.max)
    : 0;
  const packageOrOfferName = selectionOfferName(primary, "GA");
  const multiGaOffers = sectionOffers.length > 1;
  const primaryGaRestrictionLabel = primary
    ? groupRestrictionLabel(primary, gaLimits)
    : null;
  const gaOfferPicks = () =>
    sectionOffers
      .map((group, index) => {
        const key = gaOfferSelectionKey(group, index);
        const limits = groupQuantityLimits(group);
        return {
          ...group,
          quantity: resolvedOfferQuantity(offerQtys, key, limits),
        };
      })
      .filter((group) => Number(group.quantity) > 0);

  return (
    <div
      style={style}
      className="w-[280px] rounded-2xl border p-4 shadow-2xl shadow-black/40"
      onClick={(e) => e.stopPropagation()}
      {...hoverProps}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className="text-[12px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: muted }}
          >
            General admission
          </p>
          <p className="mt-1 text-[15px] font-semibold" style={{ color: ink }}>
            {sectionMeta?.sectionNumber ||
              primary?.sectionName ||
              "Section"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="opacity-80 hover:opacity-100"
          style={{ color: ink }}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {sectionOffers.length === 0 ? (
        <p className="mt-3 text-[14px]" style={{ color: muted }}>No tickets available.</p>
      ) : multiGaOffers ? (
        <>
          <div className="mt-3 space-y-2">
            {sectionOffers.map((group, index) => {
              const key = gaOfferSelectionKey(group, index);
              const limits = groupQuantityLimits(group);
              const selectedQty = resolvedOfferQuantity(offerQtys, key, limits);
              const restrictionLabel = groupRestrictionLabel(group, limits);
              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2"
                  style={{ borderColor: line }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold" style={{ color: ink }}>
                      {group.offer?.name || "Offer"}
                    </p>
                    <p className="text-[12px]" style={{ color: muted }}>
                      {formatOfferListPrice(group.price ?? 0, group.offer)} ea
                    </p>
                    {restrictionLabel ? (
                      <p className="text-[10px]" style={{ color: muted }}>
                        Ticket limit: {restrictionLabel}
                      </p>
                    ) : null}
                  </div>
                  <TooltipQuantityStepper
                    value={selectedQty}
                    limits={limits}
                    ink={ink}
                    allowZero
                    onChange={(next) =>
                      setOfferQtys((c) => ({
                        ...c,
                        [key]: next,
                      }))
                    }
                  />
                </div>
              );
            })}
          </div>
          <Button
            className="mt-4 w-full disabled:opacity-50"
            style={{ background: actionBg, color: actionInk }}
            disabled={gaOfferPicks().length === 0}
            onClick={() => {
              const picks = gaOfferPicks();
              if (!picks.length) return;
              selectGASeats(picks);
              onClose();
            }}
          >
            Add seats
          </Button>
        </>
      ) : !gaLimits.valid ? (
        <p className="mt-3 text-[14px]" style={{ color: muted }}>No tickets available.</p>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold" style={{ color: ink }}>
                {packageOrOfferName}
              </p>
              <p className="mt-1 text-[12px] font-semibold" style={{ color: ink }}>
                {formatOfferListPrice(primary?.price ?? 0, primary?.offer)} ea
              </p>
              <p className="mt-1 text-[10px]" style={{ color: muted }}>
                Incl. Taxes &amp; Fees
              </p>
              {primaryGaRestrictionLabel ? (
                <p className="mt-1 text-[10px]" style={{ color: muted }}>
                  Ticket limit: {primaryGaRestrictionLabel}
                </p>
              ) : null}
            </div>
            <TooltipQuantityStepper
              value={selectedGaQty}
              limits={gaLimits}
              ink={ink}
              onChange={setGaQty}
            />
          </div>
          <Button
            className="mt-4 w-full disabled:opacity-50"
            style={{ background: actionBg, color: actionInk }}
            disabled={!gaLimits.valid || selectedGaQty < gaLimits.min}
            onClick={() => {
              if (selectedGaQty < gaLimits.min) return;
              selectGASeats(
                sectionOffers.map((g) => ({ ...g, quantity: selectedGaQty })),
              );
              onClose();
            }}
          >
            Add seats
          </Button>
        </>
      )}
    </div>
  );
}
