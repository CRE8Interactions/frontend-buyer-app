"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/atoms/Button";
import { formatOfferListPrice } from "@/lib/helpers";
import { expandGroupsWithConnectedOffers } from "@/lib/connectedOffers";
import {
  DEFAULT_GA_TICKET_LIMIT,
  DEFAULT_SEATED_TICKET_LIMIT,
  inventoryCapForLimits,
  limitsFromTicketGroup,
  quantityRestrictionLabel,
  validQuantityOptions,
} from "@/lib/ticketListings";
import type { RawTicketGroup } from "@/lib/ticketListings";
import { selectionOfferName } from "@/lib/ticketSummary";
import useFiltersStore from "@/stores/filtersStore";
import useSeatmapStore from "@/stores/seatmapStore";
import type { TicketGroup } from "@/stores/filtersStore";

export type SeatmapTooltipTarget =
  | { kind: "seat"; seatId: string; x: number; y: number }
  | { kind: "section"; sectionId: string; x: number; y: number }
  | null;

type Props = {
  target: SeatmapTooltipTarget;
  onClose: () => void;
  onUnlock?: (offer: TicketGroup["offer"]) => void;
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

export default function SeatmapTooltip({
  target,
  onClose,
  onUnlock,
  accent = "#0a2747",
  buttonColor = "#A6E773",
  buttonTextColor = "#051B35",
}: Props) {
  const data = useSeatmapStore((s) => s.data);
  const seatLookupTable = useSeatmapStore((s) => s.seatLookupTable);
  const seatOffersLookupTable = useSeatmapStore((s) => s.seatOffersLookupTable);
  const sectionLookupTable = useSeatmapStore((s) => s.sectionLookupTable);
  const selectSeatedOffers = useSeatmapStore((s) => s.selectSeatedOffers);
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

  const seat = target?.kind === "seat" ? data?.seats?.[target.seatId] : null;
  const seatOffers =
    target?.kind === "seat"
      ? seatOffersLookupTable[target.seatId] ||
        (seatLookupTable[target.seatId]
          ? [seatLookupTable[target.seatId]]
          : [])
      : [];
  const sectionGroups =
    target?.kind === "section"
      ? sectionLookupTable[target.sectionId] || []
      : [];
  const flattenedSeatOffers = useMemo(
    () => expandGroupsWithConnectedOffers(seatOffers),
    [seatOffers],
  );
  const flattenedSectionOffers = useMemo(
    () => expandGroupsWithConnectedOffers(sectionGroups),
    [sectionGroups],
  );

  const offerQuantityOptions = (group: TicketGroup, defaultMax: number) =>
    validQuantityOptions(group.offer || group.package, {
      available: inventoryCapForLimits(group as RawTicketGroup),
      defaultMax,
      globalMax: eventTicketLimit,
    });

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

  const sectionMeta = useMemo(() => {
    if (target?.kind !== "section") return null;
    return data?.sections?.[target.sectionId] || null;
  }, [data?.sections, target]);

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

  if (target.kind === "seat") {
    const primary = flattenedSeatOffers[0] || seatOffers[0];
    const locked = Boolean(
      primary?.offer?.accessCode && !primary?.offer?.unlocked,
    );
    const alreadySelected = selectedFromMap.some(
      (g) => g.seatId === target.seatId,
    );
    const multiOffer = flattenedSeatOffers.length > 1;

    return (
      <div
        style={style}
        className="w-[280px] rounded-2xl border p-4 shadow-2xl shadow-black/40"
        onClick={(e) => e.stopPropagation()}
      >
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

        {locked ? (
          <>
            <p className="mt-3 text-[14px]" style={{ color: muted }}>
              This seat requires an access code for{" "}
              <span className="font-semibold" style={{ color: ink }}>
                {primary?.offer?.name}
              </span>
              .
            </p>
            <Button
              className="mt-4 w-full"
              style={{ background: actionBg, color: actionInk }}
              onClick={() => {
                onUnlock?.(primary?.offer);
                onClose();
              }}
            >
              Unlock offer
            </Button>
          </>
        ) : multiOffer ? (
          <div className="mt-3 space-y-2">
            {flattenedSeatOffers.map((offer) => {
              const key = String(offer.offer?.id ?? offer.id);
              const limits = groupQuantityLimits(offer, 1);
              const qtyOptions = offerQuantityOptions(
                offer,
                DEFAULT_SEATED_TICKET_LIMIT,
              );
              const selectedQty = offerQtys[key] ?? qtyOptions[0] ?? limits.min;
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
                    <p className="text-[12px]" style={{ color: muted }}>
                      {formatOfferListPrice(offer.price ?? 0, offer.offer)}
                    </p>
                    {limits.valid ? (
                      <p className="text-[10px]" style={{ color: muted }}>
                        Ticket limit: {quantityRestrictionLabel(limits)}
                      </p>
                    ) : null}
                  </div>
                  <select
                    className="h-8 rounded-lg border px-2 text-[12px]"
                    style={{
                      borderColor: line,
                      background: ink === "#ffffff" ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.55)",
                      color: ink,
                    }}
                    value={selectedQty}
                    onChange={(e) =>
                      setOfferQtys((c) => ({
                        ...c,
                        [key]: Number(e.target.value),
                      }))
                    }
                  >
                    {qtyOptions.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
            {!alreadySelected ? (
              <Button
                className="mt-2 w-full"
                style={{ background: actionBg, color: actionInk }}
                onClick={() => {
                  const picks = flattenedSeatOffers
                    .map((offer) => {
                      const key = String(offer.offer?.id ?? offer.id);
                      return { ...offer, quantity: offerQtys[key] || 0 };
                    })
                    .filter((offer) => Number(offer.quantity) > 0);
                  if (!picks.length) return;
                  selectSeatedOffers(target.seatId, picks);
                  onClose();
                }}
              >
                Add seats
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <p className="mt-3 text-[14px]" style={{ color: muted }}>
              {selectionOfferName(primary, "Standard")} ·{" "}
              {formatOfferListPrice(primary?.price ?? 0, primary?.offer)}
            </p>
          </>
        )}
      </div>
    );
  }

  // GA section tooltip
  const primary = flattenedSectionOffers[0] || sectionGroups[0];
  const gaLimits = groupQuantityLimits(primary ?? {});
  const selectedGaQty = gaLimits.valid
    ? Math.min(Math.max(gaQty || gaLimits.min, gaLimits.min), gaLimits.max)
    : 0;
  const canIncrease =
    gaLimits.valid && selectedGaQty + gaLimits.step <= gaLimits.max;
  const canDecrease = gaLimits.valid && selectedGaQty > gaLimits.min;
  const packageOrOfferName = selectionOfferName(primary, "GA");
  const multiGaOffers = flattenedSectionOffers.length > 1;

  return (
    <div
      style={style}
      className="w-[280px] rounded-2xl border p-4 shadow-2xl shadow-black/40"
      onClick={(e) => e.stopPropagation()}
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

      {sectionGroups.length === 0 ? (
        <p className="mt-3 text-[14px]" style={{ color: muted }}>No tickets available.</p>
      ) : multiGaOffers ? (
        <>
          <div className="mt-3 space-y-2">
            {flattenedSectionOffers.map((group) => {
              const key = String(group.offer?.id ?? group.id);
              const limits = groupQuantityLimits(group);
              const qtyOptions = offerQuantityOptions(
                group,
                DEFAULT_GA_TICKET_LIMIT,
              );
              const selectedQty = offerQtys[key] ?? qtyOptions[0] ?? limits.min;
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
                    {limits.valid ? (
                      <p className="text-[10px]" style={{ color: muted }}>
                        Ticket limit: {quantityRestrictionLabel(limits)}
                      </p>
                    ) : null}
                  </div>
                  <select
                    className="h-8 rounded-lg border px-2 text-[12px]"
                    style={{
                      borderColor: line,
                      background: ink === "#ffffff" ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.55)",
                      color: ink,
                    }}
                    value={selectedQty}
                    onChange={(e) =>
                      setOfferQtys((c) => ({
                        ...c,
                        [key]: Number(e.target.value),
                      }))
                    }
                  >
                    {qtyOptions.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
          <Button
            className="mt-4 w-full"
            style={{ background: actionBg, color: actionInk }}
            onClick={() => {
              const picks = flattenedSectionOffers
                .map((group) => {
                  const key = String(group.offer?.id ?? group.id);
                  return { ...group, quantity: offerQtys[key] || 0 };
                })
                .filter((group) => Number(group.quantity) > 0);
              if (!picks.length) return;
              selectGASeats(picks);
              onClose();
            }}
          >
            Add to selection
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
              {gaLimits.valid ? (
                <p className="mt-1 text-[10px]" style={{ color: muted }}>
                  Ticket limit: {quantityRestrictionLabel(gaLimits)}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                aria-label="Decrease quantity"
                disabled={!canDecrease}
                onClick={() =>
                  setGaQty((qty) =>
                    Math.max(gaLimits.min, (qty || gaLimits.min) - gaLimits.step),
                  )
                }
                className="flex h-10 w-8 items-center justify-center border-0 bg-transparent text-[28px] font-light disabled:opacity-30"
                style={{ color: ink }}
              >
                −
              </button>
              <output
                aria-label="Ticket quantity"
                className="flex h-10 min-w-10 items-center justify-center rounded-lg px-3 text-[16px] font-semibold"
                style={{
                  background: ink === "#ffffff" ? "rgba(255,255,255,0.16)" : "rgba(5,27,53,0.08)",
                  color: ink,
                }}
              >
                {selectedGaQty}
              </output>
              <button
                type="button"
                aria-label="Increase quantity"
                disabled={!canIncrease}
                onClick={() =>
                  setGaQty((qty) =>
                    Math.min(
                      gaLimits.max,
                      (qty || gaLimits.min) + gaLimits.step,
                    ),
                  )
                }
                className="flex h-10 w-8 items-center justify-center border-0 bg-transparent text-[28px] font-light disabled:opacity-30"
                style={{ color: ink }}
              >
                +
              </button>
            </div>
          </div>
          <Button
            className="mt-4 w-full"
            style={{ background: actionBg, color: actionInk }}
            disabled={!gaLimits.valid || selectedGaQty < gaLimits.min}
            onClick={() => {
              if (selectedGaQty < gaLimits.min) return;
              selectGASeats(
                sectionGroups.map((g) => ({ ...g, quantity: selectedGaQty })),
              );
              onClose();
            }}
          >
            Add to selection
          </Button>
        </>
      )}
    </div>
  );
}
