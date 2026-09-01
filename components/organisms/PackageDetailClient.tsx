"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import InAppBackLink from "@/components/molecules/InAppBackLink";
import RouteLoader from "@/components/molecules/RouteLoader";
import Modal from "@/components/molecules/Modal";
import BrandedActionButton from "@/components/atoms/BrandedActionButton";
import SeatMapSelectionOverlay from "@/components/organisms/SeatMapSelectionOverlay";
import { getPackageFE, placePackageIntoCart } from "@/lib/api";
import {
  brandingToTicketingTheme,
  type BrandingOrganization,
} from "@/lib/branding";
import {
  checkoutHref,
  rememberCheckoutReturnPath,
  setStoredCart,
} from "@/lib/cart";
import { beginRouteTransition } from "@/lib/routeTransition";
import { hideIntercomLauncher } from "@/lib/intercom";
import { cacheOrgBranding } from "@/lib/orgBrandingCache";
import { formatPackageFromPrice, packageFromPrice } from "@/lib/eventFromPrice";
import {
  createPackageLookupTables,
  type PackagePurchaseLog,
} from "@/lib/packageSeatmapLookups";
import type { SeatmapMapping } from "@/lib/seatmapLookups";
import { normalizeSeatmapBackground } from "@/lib/seatmapLookups";
import {
  dateChip,
  formatEventWhen,
  sortByDate,
  type TimezoneLike,
} from "@/lib/helpers";
import {
  storeCartSession,
  trackAddToCart,
  type TrackingOrganization,
} from "@/lib/tracking";
import useFiltersStore from "@/stores/filtersStore";
import useSeatmapStore from "@/stores/seatmapStore";
import { TICKETING_STICKY_GAP_PX } from "@/lib/ticketingSticky";

const NAVY = "#051b35";
const MUTE = "#8a93a3";
const SUB = "#6e7180";
const FIELD = "#f7f8fc";

type PackageTicket = {
  id?: string | number;
  sectionId?: string;
  seatId?: string;
  rowId?: string;
  generalAdmission?: boolean;
  GA?: boolean;
  price?: number;
  quantity?: number;
  on_sale_status?: string;
  [key: string]: unknown;
};

type EventPackage = {
  id: number | string;
  uuid?: string;
  name?: string;
  description?: string;
  image?: { url?: string };
  start?: string;
  end?: string;
  maxQuantity?: number;
  minQuantity?: number;
  pricingTiers?: { price?: number }[];
  package_tickets?: PackageTicket[];
  seatmap?: {
    id?: string | number;
    mapping?: SeatmapMapping;
    background?: unknown;
    seat_border_radius?: number;
    max_scale?: number;
  };
  events?: {
    name?: string;
    start?: string;
    slug?: string;
    seoUrl?: string;
    shortCode?: string;
    venue?: { name?: string; timezone?: string };
  }[];
  venue?: { name?: string; slug?: string; timezone?: string };
  organization?: TrackingOrganization &
    BrandingOrganization & { name?: string; slug?: string };
  /** API often attaches the full utility.timezones() config object here. */
  timezone?: TimezoneLike;
};

type PackageInventory = {
  package_tickets?: PackageTicket[];
  seatmap?: EventPackage["seatmap"];
  purchaseLog: PackagePurchaseLog | null;
};

function toDisplayPackage(full: EventPackage): EventPackage {
  const display = { ...full };
  delete display.package_tickets;
  delete display.seatmap;
  return display;
}

function packageDateRange(
  events: { start?: string }[],
  timezone?: TimezoneLike,
) {
  if (!events.length) return "";
  const first = formatEventWhen(events[0].start, timezone, "MMM D");
  const last = formatEventWhen(
    events[events.length - 1].start,
    timezone,
    "MMM D",
  );
  if (first && last && first !== last) return `${first} – ${last}`;
  return first || last;
}

function packageSeasonYear(
  pkg: EventPackage,
  events: { start?: string }[],
  timezone?: TimezoneLike,
) {
  return formatEventWhen(pkg.start || events[0]?.start, timezone, "YYYY");
}

/** Shared package detail + seat selection for org and venue routes. */
export default function PackageDetailClient({
  packageId,
  backHref,
}: {
  packageId: string;
  backHref: string;
}) {
  const [pkg, setPkg] = useState<EventPackage | null>(null);
  const [hasSeatmap, setHasSeatmap] = useState(false);
  const [fromPrice, setFromPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [seatmapOpen, setSeatmapOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [preparingMap, setPreparingMap] = useState(false);
  const [vw, setVw] = useState(1440);
  const [heroH, setHeroH] = useState(0);
  const inventoryRef = useRef<PackageInventory | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const checkingOutRef = useRef(false);
  const router = useRouter();

  const setEvent = useFiltersStore((s) => s.setEvent);
  const setEventTicketLimit = useFiltersStore((s) => s.setEventTicketLimit);
  const setLoadingTicketGroups = useFiltersStore(
    (s) => s.setLoadingTicketGroups,
  );

  const selectedFromMap = useSeatmapStore((s) => s.selectedFromMap);
  const totalCount = useSeatmapStore((s) => s.totalCount);
  const resetMapSelection = useSeatmapStore((s) => s.resetMapSelection);
  const seatedError = useSeatmapStore((s) => s.seatedError);
  const setSeatedError = useSeatmapStore((s) => s.setSeatedError);
  const setData = useSeatmapStore((s) => s.setData);
  const setBackground = useSeatmapStore((s) => s.setBackground);
  const setSeatmapId = useSeatmapStore((s) => s.setSeatmapId);
  const setSeatBorderRadius = useSeatmapStore((s) => s.setSeatBorderRadius);
  const setMaxScale = useSeatmapStore((s) => s.setMaxScale);
  const setSeatLookupTable = useSeatmapStore((s) => s.setSeatLookupTable);
  const setSeatOffersLookupTable = useSeatmapStore(
    (s) => s.setSeatOffersLookupTable,
  );
  const setSectionLookupTable = useSeatmapStore((s) => s.setSectionLookupTable);
  const background = useSeatmapStore((s) => s.background);
  const storeMapping = useSeatmapStore((s) => s.data);

  const theme = brandingToTicketingTheme(null, pkg?.organization);
  const mobile = vw < 900;

  useEffect(() => {
    const onR = () => setVw(window.innerWidth);
    onR();
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const update = () => setHeroH(el.offsetHeight);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pkg, vw]);

  useEffect(() => {
    let cancelled = false;
    inventoryRef.current = null;
    setLoading(true);

    getPackageFE(packageId)
      .then((res) => {
        if (cancelled) return;
        const data = res.data as {
          eventPackage?: EventPackage;
          purchaseLog?: PackagePurchaseLog;
        };
        const candidate =
          data?.eventPackage ?? (res.data as EventPackage | undefined);
        const full =
          candidate &&
          (candidate.id != null || candidate.uuid || candidate.name)
            ? candidate
            : null;
        if (!full) {
          setPkg(null);
          return;
        }

        inventoryRef.current = {
          package_tickets: full.package_tickets,
          seatmap: full.seatmap,
          purchaseLog: data?.purchaseLog ?? null,
        };
        setHasSeatmap(Boolean(full.seatmap?.mapping));
        setFromPrice(packageFromPrice(full));
        setPkg(toDisplayPackage(full));
        cacheOrgBranding(full.organization);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load this package.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [packageId]);

  const events = sortByDate(pkg?.events || []);
  const timezone = pkg?.timezone || pkg?.venue?.timezone;
  const seasonYear = pkg ? packageSeasonYear(pkg, events, timezone) : "";
  const dateRange = packageDateRange(events, timezone);
  const gameCount = events.length;
  const sameSeatLabel =
    gameCount === 1 ? "Same seat, 1 game" : `Same seat, ${gameCount} games`;

  const closeSeatmap = () => {
    setSeatmapOpen(false);
    setMapReady(false);
    setPreparingMap(false);
    resetMapSelection();
  };

  const openSeatmap = () => {
    if (!pkg) return;
    setError("");

    const inventory = inventoryRef.current;
    if (!hasSeatmap || !inventory?.seatmap?.mapping) {
      setError(
        "Seat selection is not available for this package yet. Please try again later.",
      );
      return;
    }

    hideIntercomLauncher();
    setLoadingTicketGroups(false);

    const mapping = (inventory.seatmap?.mapping ||
      null) as SeatmapMapping | null;
    const store = useSeatmapStore.getState();
    const skipPrepare = Boolean(
      (store.data?.sections || store.data?.seats) && store.background?.url,
    );

    if (!skipPrepare) setPreparingMap(true);
    setSeatmapOpen(true);

    const hydrate = () => {
      setEvent({
        venue: pkg.venue,
        organization: pkg.organization,
        name: pkg.name,
      });
      setEventTicketLimit(pkg.maxQuantity ?? null);

      setData(mapping);
      setBackground(normalizeSeatmapBackground(inventory.seatmap?.background));
      if (inventory.seatmap?.id != null) setSeatmapId(inventory.seatmap.id);
      if (inventory.seatmap?.seat_border_radius != null) {
        setSeatBorderRadius(inventory.seatmap.seat_border_radius);
      }
      if (inventory.seatmap?.max_scale != null) {
        setMaxScale(inventory.seatmap.max_scale);
      }

      const lookups = createPackageLookupTables(
        {
          ...pkg,
          package_tickets: inventory.package_tickets,
        },
        inventory.purchaseLog,
        mapping,
      );
      setSeatLookupTable(lookups.seatLookupTable);
      setSeatOffersLookupTable(lookups.seatOffersLookupTable);
      setSectionLookupTable(lookups.sectionLookupTable);
      resetMapSelection();
      setMapReady(true);
      setPreparingMap(false);
    };

    if (skipPrepare) hydrate();
    else window.setTimeout(hydrate, 50);
  };

  const checkout = async () => {
    if (!pkg || !selectedFromMap.length || checkingOutRef.current) return;
    checkingOutRef.current = true;
    setCheckingOut(true);
    setError("");
    try {
      const res = await placePackageIntoCart({
        eventPackageId: pkg.id,
        packageTickets: selectedFromMap,
      });
      const cartId =
        (res.data as { cartId?: string | number })?.cartId ??
        (res.data as { id?: string | number })?.id;
      if (cartId != null) {
        rememberCheckoutReturnPath();
        setStoredCart(cartId, totalCount || selectedFromMap.length);
        trackAddToCart({
          organization: pkg.organization,
          cart: res.data,
        });
        storeCartSession({
          cartId: (res.data as { cartId?: string | number })?.cartId,
          sessionId: (res.data as { sessionId?: string })?.sessionId,
        });
        const href = checkoutHref(cartId);
        beginRouteTransition(href);
        router.push(href);
        return;
      }
      setError("Cart could not be created. Please try again.");
    } catch (err: unknown) {
      const message =
        err &&
        typeof err === "object" &&
        "response" in err &&
        (err as { response?: { data?: { error?: { message?: string } } } })
          .response?.data?.error?.message
          ? (err as { response: { data: { error: { message: string } } } })
              .response.data.error.message
          : "Selected seats are not available.";
      setSeatedError({
        title: "Selected tickets not available",
        message,
        buttonText: "Close",
      });
    }
    checkingOutRef.current = false;
    setCheckingOut(false);
  };

  const pills = [
    pkg?.venue?.name,
    gameCount > 0 ? sameSeatLabel : null,
    "Transfer any game",
  ].filter((value): value is string => Boolean(value));

  return (
    <div
      style={{
        minHeight: "100vh",
        background: FIELD,
        color: NAVY,
      }}
    >
      {loading ? (
        <RouteLoader />
      ) : !pkg ? (
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px" }}>
          <InAppBackLink
            href={backHref}
            aria-label="Back"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              fontWeight: 600,
              color: NAVY,
              textDecoration: "none",
            }}
          >
            Back
          </InAppBackLink>
          <p
            style={{ marginTop: 24, fontSize: 16, color: SUB }}
            role="status"
          >
            {error || "Package not found."}
          </p>
        </div>
      ) : (
        <>
          <div
            ref={heroRef}
            style={{
              position: "sticky",
              top: 0,
              zIndex: 20,
              overflow: "hidden",
              background: `linear-gradient(115deg, ${theme.accentDark} 0%, ${theme.accent} 52%, ${theme.accent} 100%)`,
              color: "#fff",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -70,
                right: -40,
                width: 320,
                height: 320,
                borderRadius: 999,
                background: "rgba(255,255,255,0.06)",
              }}
            />
            <div
              style={{
                position: "relative",
                maxWidth: 1180,
                margin: "0 auto",
                padding: mobile ? "16px 18px 20px" : "22px 32px 26px",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <InAppBackLink
                  href={backHref}
                  aria-label="Back"
                  style={{
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 40,
                    height: 40,
                    color: "#fff",
                    background: "rgba(255,255,255,0.14)",
                    borderRadius: 999,
                    textDecoration: "none",
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
                    <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                </InAppBackLink>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    color: "rgba(255,255,255,0.75)",
                  }}
                >
                  Season package
                  {seasonYear ? ` · ${seasonYear} season` : ""}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 20,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    width: 104,
                    height: 104,
                    flexShrink: 0,
                    borderRadius: 22,
                    background: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 14,
                    boxSizing: "border-box",
                    boxShadow: "0 12px 24px -12px rgba(0,0,0,0.5)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={theme.brandLogoSrc || theme.logoSrc}
                    alt={pkg.organization?.name || "Organization"}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      display: "block",
                      objectFit: "contain",
                    }}
                  />
                </div>
                <div
                  style={{
                    flex: "1 1 300px",
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <h1
                    style={{
                      margin: 0,
                      fontSize: mobile ? 30 : 46,
                      fontWeight: 600,
                      letterSpacing: "-0.03em",
                      lineHeight: 1.06,
                    }}
                  >
                    {pkg.name}
                  </h1>
                  {pills.length > 0 && (
                    <div
                      style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
                    >
                      {pills.map((label) => (
                        <span
                          key={label}
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#fff",
                            background: "rgba(255,255,255,0.14)",
                            borderRadius: 999,
                            padding: "7px 12px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div
              style={{
                maxWidth: 1180,
                margin: "0 auto",
                padding: mobile
                  ? "20px 18px 120px"
                  : `${TICKETING_STICKY_GAP_PX}px 32px 120px`,
                boxSizing: "border-box",
                display: "grid",
                gridTemplateColumns: mobile
                  ? "minmax(0, 1fr)"
                  : "minmax(0, 1fr) 360px",
                gap: 32,
              }}
            >
              <div
                style={{
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 26,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        color: MUTE,
                      }}
                    >
                      {gameCount} game{gameCount === 1 ? "" : "s"} included
                    </div>
                    {dateRange ? (
                      <div style={{ fontSize: 13, color: MUTE }}>{dateRange}</div>
                    ) : null}
                  </div>
                  <div style={{ borderTop: "1px solid rgba(5,27,53,0.10)" }}>
                    {events.map((ev, i) => {
                      const tz = timezone || ev.venue?.timezone;
                      const chip = dateChip(ev.start, tz);
                      const venueName = ev.venue?.name || pkg.venue?.name;
                      const when = formatEventWhen(ev.start, tz, "MMM D, h:mm A");
                      const sub = [when, venueName].filter(Boolean).join(" · ");
                      return (
                        <div
                          key={`${ev.slug || ev.name || i}-${ev.start || i}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 16,
                            padding: "13px 0",
                            borderBottom: "1px solid rgba(5,27,53,0.08)",
                          }}
                        >
                          <div
                            style={{
                              width: 46,
                              flexShrink: 0,
                              display: "flex",
                              flexDirection: "column",
                              gap: 1,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                color: MUTE,
                              }}
                            >
                              {chip.m}
                            </div>
                            <div
                              style={{
                                fontSize: 19,
                                fontWeight: 600,
                                letterSpacing: "-0.02em",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {chip.d}
                            </div>
                          </div>
                          <div
                            style={{
                              flex: 1,
                              minWidth: 0,
                              display: "flex",
                              flexDirection: "column",
                              gap: 3,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 15,
                                fontWeight: 600,
                                letterSpacing: "-0.01em",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {ev.name}
                            </div>
                            {sub ? (
                              <div
                                style={{
                                  fontSize: 13,
                                  color: SUB,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {sub}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {error ? (
                  <p
                    style={{ margin: 0, fontSize: 14, color: "#b91c1c" }}
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}
              </div>

              {!mobile && (
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                      background: FIELD,
                      borderRadius: 22,
                      padding: 22,
                      boxSizing: "border-box",
                      position: "sticky",
                      top: heroH + TICKETING_STICKY_GAP_PX,
                      maxHeight: `calc(100vh - ${heroH + TICKETING_STICKY_GAP_PX + 24}px)`,
                      overflowY: "auto",
                      boxShadow: "0 18px 40px -26px rgba(5,27,53,0.45)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <span style={{ fontSize: 13, color: MUTE }}>
                        Season tickets
                      </span>
                      <span
                        style={{
                          fontSize: 34,
                          fontWeight: 600,
                          letterSpacing: "-0.03em",
                          lineHeight: 1,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {fromPrice != null
                          ? formatPackageFromPrice(fromPrice)
                          : "See tickets"}
                      </span>
                    </div>
                    <BrandedActionButton
                      primaryColor={theme.buttonColor}
                      textColor={theme.buttonTextColor}
                      onClick={openSeatmap}
                      className="w-full text-[16px]"
                      style={{ minHeight: 52, padding: 16, borderRadius: 999 }}
                    >
                      Choose your seats
                    </BrandedActionButton>
                    <div style={{ fontSize: 13, color: SUB }}>
                      Delivered to your wallet. Transfer any single game you
                      can&apos;t make.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {mobile && (
            <div
              style={{
                position: "fixed",
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 40,
                background: "rgba(255,255,255,0.96)",
                backdropFilter: "blur(10px)",
                borderTop: "1px solid rgba(5,27,53,0.10)",
                boxShadow: "0 -12px 30px -24px rgba(5,27,53,0.6)",
                padding: "12px 16px calc(14px + env(safe-area-inset-bottom))",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div
                style={{ display: "flex", flexDirection: "column", gap: 1 }}
              >
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fromPrice != null
                    ? formatPackageFromPrice(fromPrice)
                    : "See tickets"}
                </span>
              </div>
              <BrandedActionButton
                primaryColor={theme.buttonColor}
                textColor={theme.buttonTextColor}
                onClick={openSeatmap}
                className="text-[15px]"
                style={{
                  flexShrink: 0,
                  minHeight: 48,
                  padding: "14px 22px",
                  borderRadius: 999,
                }}
              >
                Choose your seats
              </BrandedActionButton>
            </div>
          )}
        </>
      )}

      {seatmapOpen && pkg ? (
        <SeatMapSelectionOverlay
          title={pkg.name || "Season package"}
          accent={theme.accent}
          accentSoft={theme.accentSoft}
          buttonColor={theme.buttonColor}
          buttonTextColor={theme.buttonTextColor}
          mobile={mobile}
          onClose={closeSeatmap}
          onCheckout={() => void checkout()}
          checkoutLoading={checkingOut}
          itemPriceNote={`All ${gameCount || 1} games · incl. fees`}
          subtotalCaption={(count) =>
            `${count} season seat${count === 1 ? "" : "s"} · ${gameCount || 1} games`
          }
          mapBackground={background}
          mapMapping={storeMapping}
          venueSlug={pkg.venue?.slug}
          preparing={preparingMap || !mapReady}
          orgName={pkg.organization?.name}
          logoSrc={theme.brandLogoSrc || theme.logoSrc}
        />
      ) : null}

      {seatedError && !seatmapOpen ? (
        <Modal
          variant="light"
          title={seatedError.title}
          onClose={() => setSeatedError(null)}
          busy={checkingOut}
        >
          <p className="mt-4 text-[15px] text-[#6e7180]">{seatedError.message}</p>
          <BrandedActionButton
            primaryColor={theme.accent}
            textColor={theme.buttonTextColor}
            disabled={checkingOut}
            onClick={() => setSeatedError(null)}
            className="mt-6 w-full"
          >
            {seatedError.buttonText || "Close"}
          </BrandedActionButton>
        </Modal>
      ) : null}
    </div>
  );
}
