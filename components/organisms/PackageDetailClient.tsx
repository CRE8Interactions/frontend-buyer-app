"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/templates/AppShell";
import BackChip from "@/components/molecules/BackChip";
import EmptyState from "@/components/molecules/EmptyState";
import PageLoader from "@/components/molecules/PageLoader";
import PageSkeleton from "@/components/molecules/PageSkeleton";
import DateChip from "@/components/molecules/DateChip";
import Modal from "@/components/molecules/Modal";
import { cardCls } from "@/components/molecules/Card";
import Button from "@/components/atoms/Button";
import Spinner from "@/components/atoms/Spinner";
import { ArrowRight } from "@/components/atoms/icons";
import { InteractiveSeatmap } from "@/components/organisms/InteractiveSeatmap";
import { getPackageFE, placePackageIntoCart } from "@/lib/api";
import { setStoredCart } from "@/lib/cart";
import { hideIntercomLauncher } from "@/lib/intercom";
import {
  createPackageLookupTables,
  type PackagePurchaseLog,
} from "@/lib/packageSeatmapLookups";
import type { SeatmapBackground, SeatmapMapping } from "@/lib/seatmapLookups";
import {
  dateChip,
  formatCurrency,
  formatEventWhen,
  imageUrl,
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
  organization?: TrackingOrganization & { name?: string; slug?: string };
  /** API often attaches the full utility.timezones() config object here. */
  timezone?: TimezoneLike;
};

type PackageInventory = {
  package_tickets?: PackageTicket[];
  seatmap?: EventPackage["seatmap"];
  purchaseLog: PackagePurchaseLog | null;
};

function normalizeBackground(raw: unknown): SeatmapBackground | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    return { url: raw, width: 1000, height: 1000 };
  }
  const obj = raw as {
    url?: string;
    width?: number;
    height?: number;
  };
  if (!obj.url) return null;
  return {
    url: obj.url,
    width: Number(obj.width) || 1000,
    height: Number(obj.height) || 1000,
  };
}

function toDisplayPackage(full: EventPackage): EventPackage {
  // Omit heavy inventory fields from React state.
  const display = { ...full };
  delete display.package_tickets;
  delete display.seatmap;
  return display;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [seatmapOpen, setSeatmapOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [preparingMap, setPreparingMap] = useState(false);
  const inventoryRef = useRef<PackageInventory | null>(null);

  const setEvent = useFiltersStore((s) => s.setEvent);
  const setEventTicketLimit = useFiltersStore((s) => s.setEventTicketLimit);
  const setLoadingTicketGroups = useFiltersStore(
    (s) => s.setLoadingTicketGroups,
  );

  const selectedFromMap = useSeatmapStore((s) => s.selectedFromMap);
  const totalCount = useSeatmapStore((s) => s.totalCount);
  const totalPrice = useSeatmapStore((s) => s.totalPrice);
  const unselectSeat = useSeatmapStore((s) => s.unselectSeat);
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

  useEffect(() => {
    let cancelled = false;
    inventoryRef.current = null;

    getPackageFE(packageId)
      .then((res) => {
        if (cancelled) return;
        const data = res.data as {
          eventPackage?: EventPackage;
          purchaseLog?: PackagePurchaseLog;
        };
        const full = data?.eventPackage ?? (res.data as EventPackage) ?? null;
        if (!full) {
          setPkg(null);
          return;
        }

        // Keep the 30MB+ inventory out of React state so renders stay responsive.
        inventoryRef.current = {
          package_tickets: full.package_tickets,
          seatmap: full.seatmap,
          purchaseLog: data?.purchaseLog ?? null,
        };
        setHasSeatmap(
          Boolean(
            full.seatmap?.mapping &&
              normalizeBackground(full.seatmap?.background),
          ),
        );
        setPkg(toDisplayPackage(full));
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

  const fromPrice = pkg?.pricingTiers?.[0]?.price;
  const events = sortByDate(pkg?.events || []);

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
    setPreparingMap(true);
    setSeatmapOpen(true);

    // Defer heavy lookup build so the overlay can paint first.
    window.setTimeout(() => {
      setEvent({
        venue: pkg.venue,
        organization: pkg.organization,
        name: pkg.name,
      });
      setEventTicketLimit(pkg.maxQuantity ?? null);

      const mapping = (inventory.seatmap?.mapping ||
        null) as SeatmapMapping | null;
      setData(mapping);
      setBackground(normalizeBackground(inventory.seatmap?.background));
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
    }, 50);
  };

  const checkout = async () => {
    if (!pkg || !selectedFromMap.length || checkingOut) return;
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
        setStoredCart(cartId, totalCount || selectedFromMap.length);
        trackAddToCart({
          organization: pkg.organization,
          cart: res.data,
        });
        storeCartSession({
          cartId: (res.data as { cartId?: string | number })?.cartId,
          sessionId: (res.data as { sessionId?: string })?.sessionId,
        });
        window.location.href = `/checkout/?cartId=${encodeURIComponent(String(cartId))}`;
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
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-[920px] pb-16">
        <BackChip href={backHref} />

        {loading ? (
          <PageSkeleton variant="detail"
            message="Loading package…"
            label="Loading package"
            className="mt-10 min-h-[30vh]" />
        ) : !pkg ? (
          <div className="mt-10">
            <EmptyState
              icon={
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden
                >
                  <rect x="3" y="6" width="18" height="13" rx="2" />
                  <path d="M3 10h18" />
                </svg>
              }
            >
              Package not found.
            </EmptyState>
          </div>
        ) : (
          <>
            <div
              className={`${cardCls} mt-7 flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:p-6`}
            >
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl(pkg.image)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                {pkg.organization?.name && (
                  <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink2">
                    {pkg.organization.name}
                  </p>
                )}
                <h1 className="mt-1 text-[clamp(26px,3.2vw,36px)] font-semibold tracking-[-0.02em]">
                  {pkg.name}
                </h1>
                {pkg.venue?.name && (
                  <p className="mt-1.5 text-[14px] text-ink3">
                    {pkg.venue.name}
                  </p>
                )}
                {pkg.description && (
                  <p className="mt-3 text-[14px] leading-relaxed text-ink2">
                    {pkg.description}
                  </p>
                )}
              </div>
            </div>

            {events.length > 0 && (
              <>
                <h2 className="mt-10 text-[20px] font-semibold tracking-[-0.01em]">
                  Included events
                </h2>
                <div className="mt-4 space-y-3">
                  {events.map((ev, i) => {
                    const chip = dateChip(
                      ev.start,
                      pkg.timezone || ev.venue?.timezone,
                    );
                    return (
                      <div
                        key={i}
                        className={`${cardCls} flex items-center gap-4 p-4`}
                      >
                        <DateChip variant="navy" month={chip.m} day={chip.d} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-semibold">
                            {ev.name}
                          </p>
                          <p className="mt-0.5 text-[13px] text-ink2">
                            {formatEventWhen(
                              ev.start,
                              pkg.timezone || ev.venue?.timezone,
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div
              className={`${cardCls} mt-10 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6`}
            >
              <div>
                <p className="text-[14px] text-ink2">
                  Total from{" "}
                  <span className="font-semibold text-white">
                    {formatCurrency(fromPrice)}
                  </span>
                </p>
                <p className="mt-1 text-[13px] text-ink2">
                  {events.length} event{events.length === 1 ? "" : "s"}
                </p>
              </div>
              <Button
                onClick={openSeatmap}
                className="w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-40"
              >
                Choose your seats <ArrowRight />
              </Button>
            </div>

            {error && (
              <p className="mt-4 text-[14px] text-destructive" role="alert">
                {error}
              </p>
            )}
          </>
        )}
      </div>

      {seatmapOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink2">
                Select your seats
              </p>
              <p className="truncate font-semibold">{pkg?.name}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-[14px] text-ink2">
                {totalCount} · {formatCurrency(totalPrice)}
              </span>
              <Button
                size="sm"
                disabled={!selectedFromMap.length || checkingOut || !mapReady}
                onClick={checkout}
              >
                {checkingOut ? <Spinner size={18} /> : "Checkout"}
              </Button>
              <Button variant="outline" size="sm" onClick={closeSeatmap}>
                Close
              </Button>
            </div>
          </div>

          {preparingMap || !mapReady || !background?.url ? (
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <PageLoader
                message="Preparing seat map…"
                label="Preparing seat map" />
            </div>
          ) : (
            <div className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_300px]">
              <InteractiveSeatmap
                className="h-full min-h-[calc(100svh-88px)] lg:min-h-0"
                lookupsMode="external"
              />
              <aside
                className={`${cardCls} flex h-fit flex-col p-5 lg:sticky lg:top-3`}
              >
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-ink2">
                  Your selection
                </h2>
                {selectedFromMap.length === 0 ? (
                  <p className="mt-3 text-[14px] text-ink2">
                    Click a section to zoom, then pick your seats on the map.
                  </p>
                ) : (
                  <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                    {selectedFromMap.map((g, i) => (
                      <li
                        key={`${g.seatId ?? g.id}-${i}`}
                        className="flex items-start justify-between gap-2 text-[14px]"
                      >
                        <span>
                          {g.GA
                            ? `${g.sectionName || "GA"} × ${g.quantity}`
                            : `Sec ${g.sectionName || g.sectionNumber} · Seat ${g.seatNumber}`}
                        </span>
                        <button
                          type="button"
                          className="text-ink2 hover:text-white"
                          onClick={() =>
                            unselectSeat(g.seatId ?? g.id ?? i, g)
                          }
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                  <span className="text-[14px] text-ink2">
                    {totalCount} ticket{totalCount === 1 ? "" : "s"}
                  </span>
                  <span className="text-[18px] font-semibold">
                    {formatCurrency(totalPrice)}
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  {selectedFromMap.length > 0 ? (
                    <Button
                      variant="ghost"
                      className="flex-1"
                      onClick={resetMapSelection}
                    >
                      Clear
                    </Button>
                  ) : null}
                  <Button
                    className="flex-1 disabled:opacity-50"
                    disabled={!selectedFromMap.length || checkingOut}
                    onClick={checkout}
                  >
                    {checkingOut ? <Spinner size={18} /> : "Checkout"}
                  </Button>
                </div>
              </aside>
            </div>
          )}
        </div>
      ) : null}

      {seatedError ? (
        <Modal title={seatedError.title} onClose={() => setSeatedError(null)}>
          <p className="mt-4 text-[15px] text-ink2">{seatedError.message}</p>
          <Button className="mt-6 w-full" onClick={() => setSeatedError(null)}>
            {seatedError.buttonText || "Close"}
          </Button>
        </Modal>
      ) : null}
    </AppShell>
  );
}
