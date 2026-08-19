"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/atoms/Button";
import { formatOfferListPrice } from "@/lib/helpers";
import { selectionOfferName } from "@/lib/ticketSummary";
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
  buttonColor?: string;
  buttonTextColor?: string;
};

export default function SeatmapTooltip({
  target,
  onClose,
  onUnlock,
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

  const sectionMeta = useMemo(() => {
    if (target?.kind !== "section") return null;
    return data?.sections?.[target.sectionId] || null;
  }, [data?.sections, target]);

  if (!target) return null;

  const style: React.CSSProperties = {
    position: "fixed",
    left: Math.min(target.x + 12, window.innerWidth - 300),
    top: Math.min(target.y + 12, window.innerHeight - 220),
    zIndex: 80,
  };

  if (target.kind === "seat") {
    const primary = seatOffers[0];
    const locked = Boolean(
      primary?.offer?.accessCode && !primary?.offer?.unlocked,
    );
    const alreadySelected = selectedFromMap.some(
      (g) => g.seatId === target.seatId,
    );

    return (
      <div
        style={style}
        className="w-[280px] rounded-2xl border border-white/15 bg-[#0a2747] p-4 shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#9DA2B3]">
              Seat {seat?.seatNumber ?? "—"}
            </p>
            <p className="mt-1 text-[15px] font-semibold text-white">
              Sec {primary?.sectionName || primary?.sectionNumber} · Row{" "}
              {primary?.rowName || primary?.rowNumber}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#9DA2B3] hover:text-white"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {locked ? (
          <>
            <p className="mt-3 text-[14px] text-[#9DA2B3]">
              This seat requires an access code for{" "}
              <span className="font-semibold text-white">
                {primary?.offer?.name}
              </span>
              .
            </p>
            <Button
              className="mt-4 w-full"
              style={{ background: buttonColor, color: buttonTextColor }}
              onClick={() => {
                onUnlock?.(primary?.offer);
                onClose();
              }}
            >
              Unlock offer
            </Button>
          </>
        ) : seatOffers.length > 1 ? (
          <div className="mt-3 space-y-2">
            {seatOffers.map((offer) => {
              const key = String(offer.offer?.id ?? offer.id);
              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold">
                      {offer.offer?.name || "Offer"}
                    </p>
                    <p className="text-[12px] text-[#9DA2B3]">
                      {formatOfferListPrice(offer.price ?? 0, offer.offer)}
                    </p>
                  </div>
                  <select
                    className="h-8 rounded-lg border border-white/15 bg-[#051B35] px-2 text-[12px]"
                    value={offerQtys[key] || 1}
                    onChange={(e) =>
                      setOfferQtys((c) => ({
                        ...c,
                        [key]: Number(e.target.value),
                      }))
                    }
                  >
                    {[1, 2, 3, 4].map((n) => (
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
                style={{ background: buttonColor, color: buttonTextColor }}
                onClick={() => {
                  const picks = seatOffers.map((offer) => {
                    const key = String(offer.offer?.id ?? offer.id);
                    return { ...offer, quantity: offerQtys[key] || 1 };
                  });
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
            <p className="mt-3 text-[14px] text-[#9DA2B3]">
              {selectionOfferName(primary, "Standard")} ·{" "}
              {formatOfferListPrice(primary?.price ?? 0, primary?.offer)}
            </p>
          </>
        )}
      </div>
    );
  }

  // GA section tooltip
  const primary = sectionGroups[0];
  const packageLimits = primary?.package || primary?.offer;
  const minQty = Math.max(1, Number(packageLimits?.minQuantity) || 1);
  const packageMax = Number(packageLimits?.maxQuantity) || 12;
  const maxQty = Math.max(
    minQty,
    Math.min(primary?.availableCount || 8, packageMax, 12),
  );
  const selectedGaQty =
    gaQty === 0 ? 0 : Math.min(Math.max(gaQty, minQty), maxQty);
  const packageOrOfferName = selectionOfferName(primary, "GA");

  return (
    <div
      style={style}
      className="w-[280px] rounded-2xl border border-white/15 bg-[#0a2747] p-4 shadow-2xl shadow-black/50"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#9DA2B3]">
            General admission
          </p>
          <p className="mt-1 text-[15px] font-semibold text-white">
            {sectionMeta?.sectionNumber ||
              primary?.sectionName ||
              "Section"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[#9DA2B3] hover:text-white"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {sectionGroups.length === 0 || maxQty < minQty ? (
        <p className="mt-3 text-[14px] text-[#9DA2B3]">No tickets available.</p>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-white">
                {packageOrOfferName}
              </p>
              <p className="mt-1 text-[12px] font-semibold text-white">
                {formatOfferListPrice(primary?.price ?? 0, primary?.offer)} ea
              </p>
              <p className="mt-1 text-[10px] text-[#9DA2B3]">
                Incl. Taxes &amp; Fees
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                aria-label="Decrease quantity"
                disabled={selectedGaQty === 0}
                onClick={() =>
                  setGaQty((qty) => (qty <= minQty ? 0 : qty - 1))
                }
                className="flex h-10 w-8 items-center justify-center border-0 bg-transparent text-[28px] font-light text-white disabled:opacity-30"
              >
                −
              </button>
              <output
                aria-label="Ticket quantity"
                className="flex h-10 min-w-10 items-center justify-center rounded-lg bg-white/10 px-3 text-[16px] font-semibold text-white"
              >
                {selectedGaQty}
              </output>
              <button
                type="button"
                aria-label="Increase quantity"
                disabled={selectedGaQty >= maxQty}
                onClick={() =>
                  setGaQty((qty) =>
                    qty === 0 ? minQty : Math.min(maxQty, qty + 1),
                  )
                }
                className="flex h-10 w-8 items-center justify-center border-0 bg-transparent text-[28px] font-light text-white disabled:opacity-30"
              >
                +
              </button>
            </div>
          </div>
          <Button
            className="mt-4 w-full"
            style={{ background: buttonColor, color: buttonTextColor }}
            disabled={selectedGaQty === 0}
            onClick={() => {
              if (selectedGaQty === 0) return;
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
