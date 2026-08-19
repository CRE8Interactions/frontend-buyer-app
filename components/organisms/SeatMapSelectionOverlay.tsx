"use client";

import { useEffect, useState } from "react";
import BrandedActionButton from "@/components/atoms/BrandedActionButton";
import Modal from "@/components/molecules/Modal";
import { BrandedLoader } from "@/components/molecules/RouteLoader";
import SectionLocatorThumb from "@/components/molecules/SectionLocatorThumb";
import { InteractiveSeatmap } from "@/components/organisms/InteractiveSeatmap";
import type { SeatmapBackground, SeatmapMapping } from "@/lib/seatmapLookups";
import { getSeatViewImageCandidates } from "@/lib/seatView";
import { selectionOfferName } from "@/lib/ticketSummary";
import useFiltersStore from "@/stores/filtersStore";
import useSeatmapStore from "@/stores/seatmapStore";

const NAVY = "#051b35";

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
  const loadingTicketGroups = useFiltersStore((s) => s.loadingTicketGroups);
  const showOrgLoader = preparing || loadingTicketGroups;

  const mapping = mapMapping || storeMapping;
  const background = mapBackground || storeBackground;

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
  const mapDetailQty = Number(mapDetailGroup?.quantity || 1);
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
    onCheckout();
  };

  useEffect(() => {
    if (selectedFromMap.length === 0) {
      setMapSelectionOpen(false);
      setMapDetail(null);
    }
  }, [selectedFromMap.length]);

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
        display: "flex",
        flexDirection: "column",
        gap: 14,
        background: "#f7f8fc",
        border: "1px solid rgba(5,27,53,0.08)",
        borderRadius: 14,
        padding: 18,
      }}
    >
      {[
        {
          t: "Mobile tickets.",
          d: " Delivered to your account and scanned at the gate.",
          icon: (
            <>
              <rect x="5" y="2" width="14" height="20" rx="3" />
              <line x1="10" y1="18.5" x2="14" y2="18.5" />
            </>
          ),
        },
        {
          t: "Buyer protection.",
          d: " Every listing is verified inventory, safe from bots and scalpers.",
          icon: (
            <>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </>
          ),
        },
        {
          t: "Prices are all-in.",
          d: " Taxes and fees included. No surprises at checkout.",
          icon: (
            <>
              <path d="M20.59 13.41 13.4 20.6a2 2 0 0 1-2.82 0L3 13V4a1 1 0 0 1 1-1h9l7.59 7.59a2 2 0 0 1 0 2.82Z" />
              <circle cx="7.5" cy="7.5" r="1.2" />
            </>
          ),
        },
      ].map((r) => (
        <div key={r.t} style={{ display: "flex", gap: 12 }}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke={accent}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }}
          >
            {r.icon}
          </svg>
          <div style={{ fontSize: 14, color: "#4a5567", lineHeight: 1.5 }}>
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
        padding: mobile ? 10 : 16,
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
          borderRadius: mobile ? 18 : 22,
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
                    onClick={() => setMapSelectionOpen(true)}
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
                          fontSize: 20,
                          fontWeight: 600,
                          letterSpacing: "-0.02em",
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
                            fontSize: 22,
                            fontWeight: 600,
                            letterSpacing: "-0.02em",
                          }}
                        >
                          {mapDetailGroup.GA
                            ? `Sec ${mapDetailSection} · General admission`
                            : `Sec ${mapDetailSection} · Row ${mapDetailGroup.rowNumber || mapDetailGroup.rowName || "—"} · Seat ${mapDetailGroup.seatNumber ?? "—"}`}
                        </div>
                        <div style={{ fontSize: 14, color: "#6e7180" }}>
                          {mapDetailQty === 1
                            ? "1 Ticket"
                            : `${mapDetailQty} Tickets`}
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
                          fontSize: 22,
                          fontWeight: 600,
                          fontVariantNumeric: "tabular-nums",
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {money(Number(mapDetailGroup.price || 0))} ea
                      </span>
                      <span style={{ fontSize: 14, color: "#6e7180" }}>
                        incl. fees
                      </span>
                    </div>
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
                          fontSize: 12,
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
                          fontSize: 14,
                          color: "#4a5567",
                          lineHeight: 1.6,
                        }}
                      >
                        {mapDetailOffer} seating in Section {mapDetailSection}{" "}
                        with covered concourse access.
                      </div>
                    </div>
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
                            fontSize: 20,
                            fontWeight: 600,
                            letterSpacing: "-0.02em",
                          }}
                        >
                          Ticket details
                        </div>
                        <div style={{ width: 40, flexShrink: 0 }} />
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: 24,
                          fontWeight: 700,
                          textAlign: "center",
                          letterSpacing: "-0.025em",
                          marginBottom: 32,
                        }}
                      >
                        Your selection
                      </div>
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
                        {selectedFromMap.map((g, i) => {
                          const section =
                            g.sectionNumber || g.sectionName || "GA";
                          const row = g.rowNumber || g.rowName || "—";
                          const seat = g.GA
                            ? `× ${g.quantity || 1}`
                            : g.seatNumber || "—";
                          const offer = selectionOfferName(g);
                          const itemPrice =
                            Number(g.price || 0) *
                            (g.GA ? Number(g.quantity || 1) : 1);
                          return (
                            <li
                              key={`${g.seatId ?? g.id}-${i}`}
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
                                  unselectSeat(g.seatId ?? g.id ?? i, g)
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
                                    setMapDetail(i);
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
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Subtotal</div>
                    <div style={{ marginTop: 4, fontSize: 12 }}>
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
