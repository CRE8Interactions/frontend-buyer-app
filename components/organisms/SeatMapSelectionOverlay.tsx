"use client";

import { useEffect, useState } from "react";
import BrandedActionButton from "@/components/atoms/BrandedActionButton";
import Modal from "@/components/molecules/Modal";
import ExpandableDescription from "@/components/molecules/ExpandableDescription";
import { BrandedLoader } from "@/components/molecules/RouteLoader";
import SectionLocatorThumb from "@/components/molecules/SectionLocatorThumb";
import { InteractiveSeatmap } from "@/components/organisms/InteractiveSeatmap";
import type { SeatmapBackground, SeatmapMapping } from "@/lib/seatmapLookups";
import { getSeatViewImageCandidates } from "@/lib/seatView";
import {
  quantityLimits,
  quantityRestrictionLabel,
  selectionPaneRestrictionLabel,
} from "@/lib/ticketListings";
import type { QuantityRestrictionSource } from "@/lib/ticketListings";
import { selectionOfferDescription, selectionOfferName, selectionTicketCards } from "@/lib/ticketSummary";
import useFiltersStore from "@/stores/filtersStore";
import useSeatmapStore from "@/stores/seatmapStore";

const NAVY = "#051b35";

/**
 * A seatmap can legitimately ship without a background image, so stop waiting
 * rather than pinning the loader open forever. Geometry is never waived —
 * InteractiveSeatmap renders here with its own spinner hidden, so an empty map
 * would leave the shopper with nothing.
 */
const MAX_PREPARING_MS = 6000;

/**
 * Artwork downloaded once this session should not put the loader back up when
 * the shopper closes and reopens the map.
 */
const loadedBackgrounds = new Set<string>();

export function __resetSeatmapBackgroundCacheForTests() {
  loadedBackgrounds.clear();
}

const money = (n: number) =>
  "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const checkoutBtnRow: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  whiteSpace: "nowrap",
};

const pill = (
  bg: string,
  color: string,
  wrap = false,
): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: wrap ? "flex-start" : "center",
  gap: 7,
  background: bg,
  color,
  fontSize: 13,
  fontWeight: 600,
  padding: "4px 12px",
  borderRadius: 999,
  whiteSpace: wrap ? "normal" : "nowrap",
  lineHeight: wrap ? 1.35 : undefined,
});

function SeatViewImage({ src, section }: { src?: string; section: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          background: "#e7eaf2",
          color: "#6e7180",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: 28, height: 28 }}
        >
          <path d="M3 20V9l9-5 9 5v11" />
          <path d="M3 20h18" />
          <path d="M7 20v-6h4v6" />
          <path d="M14 20v-6h3v6" />
        </svg>
        <div style={{ fontSize: 13, fontWeight: 500 }}>
          No seat view for Sec {section}
        </div>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`View from section ${section}`}
      onError={() => setFailedSrc(src)}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        objectFit: "cover",
      }}
    />
  );
}

const Star = ({ s = 14 }: { s?: number }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ width: s, height: s }}
    aria-hidden
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export default function SeatMapSelectionOverlay({
  title,
  accent,
  accentSoft,
  buttonColor,
  buttonTextColor,
  mobile,
  onClose,
  onCheckout,
  checkoutLoading = false,
  checkoutError = "",
  itemPriceNote = "Incl. Taxes & Fees",
  subtotalCaption,
  mapBackground,
  mapMapping,
  venueSlug,
  preparing = false,
  orgName,
  logoSrc,
  orderQuantitySource,
}: {
  title: string;
  accent: string;
  accentSoft: string;
  buttonColor: string;
  buttonTextColor: string;
  mobile: boolean;
  onClose: () => void;
  onCheckout: () => void;
  checkoutLoading?: boolean;
  checkoutError?: string;
  itemPriceNote?: string;
  subtotalCaption?: (count: number) => string;
  mapBackground?: SeatmapBackground | null;
  mapMapping?: SeatmapMapping | null;
  venueSlug?: string;
  preparing?: boolean;
  orgName?: string | null;
  logoSrc?: string | null;
  orderQuantitySource?: QuantityRestrictionSource | null;
}) {
  const selectedFromMap = useSeatmapStore((s) => s.selectedFromMap);
  const totalCount = useSeatmapStore((s) => s.totalCount);
  const totalPrice = useSeatmapStore((s) => s.totalPrice);
  const unselectSeat = useSeatmapStore((s) => s.unselectSeat);
  const getTicketImage = useSeatmapStore((s) => s.getTicketImage);
  const bucket = useSeatmapStore((s) => s.bucket);
  const storeMapping = useSeatmapStore((s) => s.data);
  const storeBackground = useSeatmapStore((s) => s.background);
  const seatedError = useSeatmapStore((s) => s.seatedError);
  const setSeatedError = useSeatmapStore((s) => s.setSeatedError);
  const eventTicketLimit = useFiltersStore((s) => s.eventTicketLimit);
  const seatmapTicketLimit = useSeatmapStore((s) => s.eventTicketLimit);
  const [prepareExpired, setPrepareExpired] = useState(false);
  const [dismissTooltipKey, setDismissTooltipKey] = useState(0);
  const dismissMapTooltip = () => setDismissTooltipKey((key) => key + 1);
  const paneRestrictionLabel = selectionPaneRestrictionLabel(
    seatmapTicketLimit ?? eventTicketLimit,
    selectedFromMap,
    orderQuantitySource,
  );

  const mapping = mapMapping || storeMapping;
  const background = mapBackground || storeBackground;

  // Paint only once the geometry and the background are both in. Either half
  // arriving a frame after the other reads as a flash. A URL alone is not
  // enough: InteractiveSeatmap draws seats at full opacity while its artwork is
  // still downloading, so wait for the image itself to decode.
  const backgroundUrl = background?.url || "";
  const [loadedBackgroundUrl, setLoadedBackgroundUrl] = useState("");
  const mapHasSeats = Boolean(mapping?.sections || mapping?.seats);
  const backgroundReady =
    Boolean(backgroundUrl) &&
    (loadedBackgroundUrl === backgroundUrl ||
      loadedBackgrounds.has(backgroundUrl));
  const markBackgroundLoaded = () => {
    loadedBackgrounds.add(backgroundUrl);
    setLoadedBackgroundUrl(backgroundUrl);
  };
  const mapPaintable = mapHasSeats && (backgroundReady || prepareExpired);
  const showOrgLoader = preparing || !mapPaintable;

  const [mapDetail, setMapDetail] = useState<number | null>(null);
  const [mapSelectionOpen, setMapSelectionOpen] = useState(false);
  const [media, setMedia] = useState(0);
  const [exitConfirm, setExitConfirm] = useState(false);

  const flip = () => setMedia((m) => (m === 0 ? 1 : 0));

  const mapDetailGroup =
    mapDetail === null ? null : selectedFromMap[mapDetail] || null;
  const mapDetailSection = String(
    mapDetailGroup?.sectionNumber || mapDetailGroup?.sectionName || "GA",
  );
  const mapDetailOffer = selectionOfferName(mapDetailGroup);
  const mapDetailOfferDescription = selectionOfferDescription(mapDetailGroup);
  const selectionCards = selectionTicketCards(selectedFromMap);
  const mapTicketCount = totalCount || selectedFromMap.length;
  const mapTicketLabel = subtotalCaption
    ? subtotalCaption(mapTicketCount)
    : mapTicketCount === 1
      ? "1 Ticket"
      : `${mapTicketCount} Tickets`;
  const showMobileMapBar =
    mobile &&
    selectedFromMap.length > 0 &&
    !mapSelectionOpen &&
    mapDetail == null;
  const showMapSelectionPanel =
    selectedFromMap.length > 0 &&
    (!mobile || mapSelectionOpen || mapDetail != null);
  const checkoutDisabled =
    checkoutLoading || showOrgLoader || selectedFromMap.length === 0;
  const handleCheckout = () => {
    if (checkoutDisabled) return;
    dismissMapTooltip();
    onCheckout();
  };

  useEffect(() => {
    if (selectedFromMap.length === 0) {
      setMapSelectionOpen(false);
      setMapDetail(null);
    }
  }, [selectedFromMap.length]);

  // Never reset this: closing the overlay unmounts it, and clearing the flag
  // while the loader is up would flip it straight back on.
  useEffect(() => {
    if (!showOrgLoader) return;
    const timer = window.setTimeout(
      () => setPrepareExpired(true),
      MAX_PREPARING_MS,
    );
    return () => window.clearTimeout(timer);
  }, [showOrgLoader]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const requestClose = () => {
    if (selectedFromMap.length > 0) {
      setExitConfirm(true);
      return;
    }
    onClose();
  };

  const venueImage = (
    section: string | number,
    type: "thumbnail" | "seat-view",
  ) => (venueSlug ? getTicketImage(venueSlug, section, type) : undefined);

  const venueImageCandidates = (section: string | number) =>
    venueSlug
      ? getSeatViewImageCandidates(
          venueSlug,
          section,
          section,
          ["highlights", "thumbnail"],
          bucket,
        )
      : [];

  const trustRows = (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(5,27,53,0.10)",
        boxShadow: "0 1px 2px rgba(5,27,53,0.05)",
        borderRadius: 20,
        padding: 20,
        width: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {[
        {
          t: "Mobile tickets.",
          d: " Securely stored in your account.",
          icon: (
            <>
              <rect x="5" y="2" width="14" height="20" rx="3" />
              <line x1="10" y1="18.5" x2="14" y2="18.5" />
            </>
          ),
        },
        {
          t: "Buyer protection.",
          d: " Safe from bots and scalpers.",
          icon: (
            <>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </>
          ),
        },
        {
          t: "Prices are all-in.",
          d: " Taxes and fees included.",
          icon: (
            <>
              <path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0l-7.2-7.2a2 2 0 0 1-.6-1.4V4a1 1 0 0 1 1-1h8a2 2 0 0 1 1.4.6l7.4 7.4a2 2 0 0 1 0 2.8z" />
              <line x1="7.5" y1="7.5" x2="7.51" y2="7.5" />
            </>
          ),
        },
      ].map((r) => (
        <div key={r.t} style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke={accent}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: 18, height: 18, flexShrink: 0 }}
          >
            {r.icon}
          </svg>
          <div style={{ flex: 1, minWidth: 0, fontSize: 14, color: "#4a5567" }}>
            <span style={{ fontWeight: 600, color: NAVY }}>{r.t}</span>
            {r.d}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        background: "rgba(5,27,53,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        padding: mobile ? 0 : 16,
        boxSizing: "border-box",
      }}
      onClick={requestClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Select your seats"
        onClick={(event) => event.stopPropagation()}
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          background: "#fff",
          color: NAVY,
          display: "flex",
          flexDirection: "column",
          borderRadius: mobile ? 0 : 22,
          overflow: "hidden",
          boxShadow: "0 24px 64px -20px rgba(5,27,53,0.45)",
        }}
      >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "14px 18px",
          borderBottom: "1px solid rgba(5,27,53,0.10)",
          flexShrink: 0,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#6e7180",
            }}
          >
            Select your seats
          </div>
          <div
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: NAVY,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <button
            onClick={requestClose}
            aria-label="Close seat map"
            style={{
              fontFamily: "inherit",
              width: 42,
              height: 42,
              borderRadius: 999,
              border: "1px solid #d3d6e0",
              background: "#fff",
              color: NAVY,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: 18, height: 18 }}
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {showOrgLoader ? (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            position: "relative",
          }}
        >
          <BrandedLoader
            embedded
            branding={{
              primaryColor: accent,
              logoSrc,
              name: orgName,
            }}
          />
          {backgroundUrl ? (
            // Warms the browser cache behind the loader so the seatmap's own
            // <image> paints on its first frame instead of after the seats.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={backgroundUrl}
              alt=""
              aria-hidden
              data-seatmap-background-preload="true"
              // An already-cached image can finish before React attaches onLoad.
              ref={(el) => {
                if (el?.complete) markBackgroundLoaded();
              }}
              onLoad={markBackgroundLoaded}
              onError={markBackgroundLoaded}
              style={{
                position: "absolute",
                width: 1,
                height: 1,
                opacity: 0,
                pointerEvents: "none",
              }}
            />
          ) : null}
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: mobile ? "flex" : "grid",
            flexDirection: "column",
            gridTemplateColumns:
              mobile || !showMapSelectionPanel
                ? undefined
                : "minmax(0, 1fr) 420px",
            gap: 0,
            position: "relative",
          }}
        >
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <InteractiveSeatmap
              className={mobile ? "h-full min-h-0" : "h-full min-h-[60vh]"}
              lookupsMode="external"
              accent={accent}
              buttonColor={buttonColor}
              buttonTextColor={buttonTextColor}
              compactChrome={mobile}
              hideLoadingSpinner
              dismissTooltipKey={dismissTooltipKey}
            />
            {showMobileMapBar ? (
              <div
                style={{
                  flexShrink: 0,
                  borderTop: "1px solid #dfe3eb",
                  padding: "16px 18px 18px",
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    gap: 16,
                    marginBottom: 14,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>Subtotal</div>
                    <div style={{ marginTop: 2, fontSize: 14, color: "#6e7180" }}>
                      {mapTicketLabel}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      letterSpacing: "-0.025em",
                    }}
                  >
                    {money(totalPrice)}
                  </div>
                </div>
                {checkoutError ? (
                  <div
                    style={{
                      marginBottom: 12,
                      fontSize: 13,
                      color: "#b91c1c",
                      textAlign: "center",
                    }}
                  >
                    {checkoutError}
                  </div>
                ) : null}
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      dismissMapTooltip();
                      setMapSelectionOpen(true);
                    }}
                    style={{
                      fontFamily: "inherit",
                      flex: "0 1 42%",
                      minHeight: 50,
                      fontSize: 15,
                      fontWeight: 600,
                      color: NAVY,
                      background: "#fff",
                      border: "1px solid #c5cad3",
                      borderRadius: 999,
                      cursor: "pointer",
                    }}
                  >
                    View selection
                  </button>
                  <BrandedActionButton
                    primaryColor={buttonColor}
                    textColor={buttonTextColor}
                    loading={checkoutLoading}
                    loadingLabel="Holding seats…"
                    disabled={checkoutDisabled}
                    onClick={handleCheckout}
                    className="flex-1 text-[16px]"
                    style={{ ...checkoutBtnRow, minHeight: 50, padding: "14px 18px" }}
                  >
                    Checkout
                  </BrandedActionButton>
                </div>
              </div>
            ) : null}
          </div>
          {showMapSelectionPanel && (
            <aside
              style={{
                ...(mobile
                  ? { position: "absolute", inset: 0, zIndex: 3 }
                  : { borderLeft: "1px solid #dfe3eb" }),
                background: "#fff",
                color: NAVY,
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
              }}
            >
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  padding: "24px 22px",
                }}
              >
                {mapDetailGroup ? (
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 18,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setMapDetail(null)}
                        aria-label="Back to selection"
                        style={{
                          fontFamily: "inherit",
                          width: 40,
                          height: 40,
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#fff",
                          border: "1px solid #d3d6e0",
                          borderRadius: 12,
                          color: NAVY,
                          cursor: "pointer",
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ width: 18, height: 18 }}
                        >
                          <polyline points="15 18 9 12 15 6" />
                        </svg>
                      </button>
                      <div
                        style={{
                          flex: 1,
                          textAlign: "center",
                          fontSize: 16,
                          fontWeight: 600,
                          letterSpacing: "-0.015em",
                        }}
                      >
                        Ticket details
                      </div>
                      <div style={{ width: 40, flexShrink: 0 }} />
                    </div>
                    <div
                      style={{
                        position: "relative",
                        height: 200,
                        borderRadius: 16,
                        background: "#f1f3f8",
                        border: "1px solid rgba(5,27,53,0.08)",
                        overflow: "hidden",
                      }}
                    >
                      {media === 0 ? (
                        <SectionLocatorThumb
                          background={background}
                          mapping={mapping}
                          sectionId={
                            mapDetailGroup.sectionId != null
                              ? String(mapDetailGroup.sectionId)
                              : undefined
                          }
                          sectionNumber={mapDetailSection}
                          section={mapDetailSection}
                          pinColor={accent}
                          thumbnailCandidates={venueImageCandidates(
                            mapDetailSection,
                          )}
                        />
                      ) : (
                        <SeatViewImage
                          src={venueImage(mapDetailSection, "seat-view")}
                          section={mapDetailSection}
                        />
                      )}
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          bottom: 12,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 12,
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 7,
                            background: "rgba(5,27,53,0.82)",
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: 600,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            padding: "6px 14px",
                            borderRadius: 999,
                          }}
                        >
                          {media === 0 ? "Seat location" : "Seat view"}
                        </span>
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: 999,
                              background:
                                media === 0 ? accent : "rgba(5,27,53,0.22)",
                            }}
                          />
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: 999,
                              background:
                                media === 1 ? accent : "rgba(5,27,53,0.22)",
                            }}
                          />
                        </span>
                      </div>
                      <button
                        onClick={flip}
                        aria-label="Previous view"
                        style={{
                          fontFamily: "inherit",
                          position: "absolute",
                          left: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 40,
                          height: 40,
                          borderRadius: 999,
                          background: "#fff",
                          border: "1px solid rgba(5,27,53,0.10)",
                          color: NAVY,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          boxShadow: "0 6px 18px -8px rgba(5,27,53,0.4)",
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ width: 18, height: 18 }}
                        >
                          <polyline points="15 18 9 12 15 6" />
                        </svg>
                      </button>
                      <button
                        onClick={flip}
                        aria-label="Next view"
                        style={{
                          fontFamily: "inherit",
                          position: "absolute",
                          right: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 40,
                          height: 40,
                          borderRadius: 999,
                          background: "#fff",
                          border: "1px solid rgba(5,27,53,0.10)",
                          color: NAVY,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          boxShadow: "0 6px 18px -8px rgba(5,27,53,0.4)",
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ width: 18, height: 18 }}
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        padding: "18px 0 16px",
                      }}
                    >
                      <span
                        style={{
                          alignSelf: "flex-start",
                          minWidth: 0,
                          maxWidth: "100%",
                          ...pill(accentSoft, accent, true),
                          fontSize: 14,
                          padding: "5px 10px",
                        }}
                      >
                        <Star s={14} /> {mapDetailOffer}
                      </span>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 5,
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 600,
                            letterSpacing: "-0.02em",
                          }}
                        >
                          {mapDetailGroup.GA
                            ? `Sec ${mapDetailSection} · General admission`
                            : `Sec ${mapDetailSection} · Row ${mapDetailGroup.rowNumber || mapDetailGroup.rowName || "—"} · Seat ${mapDetailGroup.seatNumber ?? "—"}`}
                        </div>
                        <div style={{ fontSize: 15, color: "#6e7180" }}>
                          1 Ticket
                        </div>
                      </div>
                    </div>
                    <div
                      style={{ height: 1, background: "rgba(5,27,53,0.08)" }}
                    />
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 8,
                        padding: "18px 0",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 18,
                          fontWeight: 600,
                          fontVariantNumeric: "tabular-nums",
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {money(Number(mapDetailGroup.price || 0))}
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 600 }}>ea</span>
                      <span style={{ fontSize: 14, color: "#6e7180" }}>
                        incl. fees
                      </span>
                    </div>
                    {mapDetailOfferDescription ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                          paddingBottom: 18,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            color: "#8a93a3",
                          }}
                        >
                          About this ticket
                        </div>
                        <div
                          style={{
                            fontSize: 16,
                            color: "#4a5567",
                            lineHeight: 1.6,
                          }}
                        >
                          <ExpandableDescription
                            text={mapDetailOfferDescription}
                            mobile={mobile}
                            toggleColor={accent}
                            style={{
                              fontSize: 16,
                              color: "#4a5567",
                              lineHeight: 1.6,
                            }}
                          />
                        </div>
                      </div>
                    ) : null}
                    {trustRows}
                  </>
                ) : (
                  <>
                    {mobile ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          marginBottom: 18,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setMapSelectionOpen(false);
                            setMapDetail(null);
                          }}
                          aria-label="Back to map"
                          style={{
                            fontFamily: "inherit",
                            width: 40,
                            height: 40,
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#f1f3f8",
                            border: "none",
                            borderRadius: 12,
                            color: NAVY,
                            cursor: "pointer",
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ width: 18, height: 18 }}
                          >
                            <polyline points="15 18 9 12 15 6" />
                          </svg>
                        </button>
                        <div
                          style={{
                            flex: 1,
                            textAlign: "center",
                            fontSize: 16,
                            fontWeight: 600,
                            letterSpacing: "-0.015em",
                          }}
                        >
                          Ticket details
                        </div>
                        <div style={{ width: 40, flexShrink: 0 }} />
                      </div>
                    ) : (
                      <>
                        <div
                          style={{
                            fontSize: 24,
                            fontWeight: 700,
                            textAlign: "center",
                            letterSpacing: "-0.025em",
                            marginBottom: paneRestrictionLabel ? 8 : 32,
                          }}
                        >
                          Your selection
                        </div>
                        {paneRestrictionLabel ? (
                          <p
                            style={{
                              margin: "0 0 32px",
                              fontSize: 14,
                              fontWeight: 600,
                              color: "#6e7180",
                              textAlign: "center",
                            }}
                          >
                            Ticket limit: {paneRestrictionLabel}
                          </p>
                        ) : null}
                      </>
                    )}
                    {selectedFromMap.length === 0 ? (
                      <p
                        style={{
                          margin: "0 auto",
                          maxWidth: 290,
                          fontSize: 14,
                          color: "#6e7180",
                          lineHeight: 1.55,
                          textAlign: "center",
                        }}
                      >
                        Click a section to zoom, then pick seats on the map.
                      </p>
                    ) : (
                      <ul
                        style={{
                          listStyle: "none",
                          margin: 0,
                          padding: 0,
                          display: "flex",
                          flexDirection: "column",
                          gap: 14,
                        }}
                      >
                        {selectionCards.map(({ group: g, groupIndex, unitIndex }) => {
                          const section =
                            g.sectionNumber || g.sectionName || "GA";
                          const row = g.rowNumber || g.rowName || "—";
                          const seat = g.seatNumber || "—";
                          const offer = selectionOfferName(g);
                          const itemPrice = Number(g.price || 0);
                          return (
                            <li
                              key={`${g.seatId ?? g.id}-${groupIndex}-${unitIndex}`}
                              style={{
                                position: "relative",
                                border: "1px solid #dfe3eb",
                                borderRadius: 14,
                                padding: "14px 16px 16px",
                              }}
                            >
                              <button
                                type="button"
                                aria-label="Remove ticket"
                                onClick={() =>
                                  unselectSeat(
                                    g.seatId ?? g.id ?? groupIndex,
                                    g,
                                  )
                                }
                                style={{
                                  fontFamily: "inherit",
                                  position: "absolute",
                                  top: -12,
                                  right: -12,
                                  width: 25,
                                  height: 25,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  borderRadius: 999,
                                  border: "1px solid #dfe3eb",
                                  background: "#fff",
                                  color: NAVY,
                                  fontSize: 17,
                                  lineHeight: 1,
                                  cursor: "pointer",
                                }}
                              >
                                ×
                              </button>
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "58px 58px 58px 1fr",
                                  gap: 10,
                                  alignItems: "start",
                                }}
                              >
                                {[
                                  ["Sec", section],
                                  ["Row", row],
                                  ["Seat", seat],
                                ].map(([label, value]) => (
                                  <div key={label}>
                                    <div
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: "#9DA2B3",
                                        textTransform: "uppercase",
                                      }}
                                    >
                                      {label}
                                    </div>
                                    <div
                                      style={{
                                        marginTop: 1,
                                        fontSize: 16,
                                        fontWeight: 700,
                                      }}
                                    >
                                      {value}
                                    </div>
                                  </div>
                                ))}
                                <div style={{ textAlign: "right" }}>
                                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                                    {money(itemPrice)}
                                  </div>
                                  <div
                                    style={{
                                      marginTop: 1,
                                      fontSize: 12,
                                      color: "#6e7180",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {itemPriceNote}
                                  </div>
                                </div>
                              </div>
                              <div
                                style={{
                                  height: 1,
                                  background: "#edf0f5",
                                  margin: "13px 0 12px",
                                }}
                              />
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "flex-start",
                                  justifyContent: "space-between",
                                  gap: 10,
                                  minWidth: 0,
                                }}
                              >
                                <span
                                  style={{
                                    ...pill(accentSoft, accent, true),
                                    width: "fit-content",
                                    maxWidth: "100%",
                                    minWidth: 0,
                                    flex: "0 1 auto",
                                  }}
                                >
                                  <Star s={13} /> {offer}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMapDetail(groupIndex);
                                    setMedia(0);
                                  }}
                                  style={{
                                    fontFamily: "inherit",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 5,
                                    border: 0,
                                    background: "transparent",
                                    color: NAVY,
                                    fontSize: 13,
                                    cursor: "pointer",
                                    padding: 0,
                                    flexShrink: 0,
                                  }}
                                >
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      width: 18,
                                      height: 18,
                                      border: "2px solid #9DA2B3",
                                      borderRadius: 999,
                                      color: "#6e7180",
                                      fontSize: 11,
                                      fontWeight: 700,
                                    }}
                                  >
                                    i
                                  </span>
                                  Details
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </>
                )}
                {checkoutError ? (
                  <div
                    style={{
                      marginTop: 14,
                      fontSize: 13,
                      color: "#b91c1c",
                      textAlign: "center",
                    }}
                  >
                    {checkoutError}
                  </div>
                ) : null}
              </div>
              <div
                style={{
                  borderTop: "1px solid #dfe3eb",
                  padding: "20px 22px 18px",
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "end",
                    gap: 16,
                    marginBottom: 18,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>Subtotal</div>
                    <div style={{ marginTop: 2, fontSize: 15, color: "#6e7180" }}>
                      {mapTicketLabel}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 600,
                      letterSpacing: "-0.025em",
                    }}
                  >
                    {money(totalPrice)}
                  </div>
                </div>
                <BrandedActionButton
                  primaryColor={buttonColor}
                  textColor={buttonTextColor}
                  loading={checkoutLoading}
                  loadingLabel="Holding seats…"
                  disabled={checkoutDisabled}
                  onClick={handleCheckout}
                  className="w-full text-[16px]"
                  style={{
                    ...checkoutBtnRow,
                    minHeight: 50,
                    padding: "14px 22px",
                  }}
                >
                  Checkout
                </BrandedActionButton>
              </div>
            </aside>
          )}
        </div>
      )}

      {seatedError ? (
        <Modal
          variant="light"
          title={seatedError.title}
          onClose={() => setSeatedError(null)}
        >
          <p className="mt-4 text-[15px] leading-relaxed text-[#4a5567]">
            {seatedError.message}
          </p>
          <BrandedActionButton
            primaryColor={buttonColor || accent}
            textColor={buttonTextColor}
            onClick={() => {
              const leave = seatedError.leaveMap;
              setSeatedError(null);
              if (leave) onClose();
            }}
            className="mt-6 w-full text-[16px]"
          >
            {seatedError.buttonText || "Close"}
          </BrandedActionButton>
        </Modal>
      ) : null}

      {exitConfirm ? (
        <Modal
          variant="light"
          title="Are you sure you want to exit?"
          onClose={() => setExitConfirm(false)}
        >
          <p className="mt-4 text-[15px] leading-relaxed text-[#4a5567]">
            You will lose your selected tickets....
          </p>
          <div className="mt-5 flex flex-col gap-3">
            <BrandedActionButton
              primaryColor={accent}
              textColor={buttonTextColor}
              onClick={onClose}
              className="w-full text-[16px]"
            >
              Exit anyway
            </BrandedActionButton>
            <BrandedActionButton
              tone="secondary"
              onClick={() => setExitConfirm(false)}
              className="w-full text-[16px]"
            >
              Cancel
            </BrandedActionButton>
          </div>
        </Modal>
      ) : null}
      </div>
    </div>
  );
}
