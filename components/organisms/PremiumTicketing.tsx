"use client";

/**
 * PremiumTicketing — data-driven port of the Claude Design canvas
 * "NM State Ticketing.dc.html". Light theme, configurable accent. Renders the
 * full ticketing experience (filterable listings, seat-map modal, selection +
 * detail panel, event-info modal) from a `TicketingData`
 * prop, so any event can use it. See NM_STATE_DATA for the reference content.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BrandedActionButton from "@/components/atoms/BrandedActionButton";
import { Ticket } from "@/components/atoms/icons";
import EmailField from "@/components/molecules/EmailField";
import ExpandableDescription from "@/components/molecules/ExpandableDescription";
import LoginLink from "@/components/molecules/LoginLink";
import Modal from "@/components/molecules/Modal";
import MobileStickyFooter from "@/components/molecules/MobileStickyFooter";
import OnSaleSoonCard from "@/components/molecules/OnSaleSoonCard";
import ShopperBodyPortal from "@/components/templates/ShopperBodyPortal";
import RedemptionCodeField from "@/components/molecules/RedemptionCodeField";
import SectionLocatorThumb from "@/components/molecules/SectionLocatorThumb";
import SeatMapSelectionOverlay from "@/components/organisms/SeatMapSelectionOverlay";
import { placeGATicketsIntoCart, placeTicketsIntoCart } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isStandaloneCatalogOffer } from "@/lib/connectedOffers";
import { goBack } from "@/lib/inAppBack";
import { verifyOfferAccessCode } from "@/lib/offerUnlock";
import {
  CHECKOUT_DEMO_LISTINGS_ERROR,
  CHECKOUT_DEMO_TIERS_ERROR,
  checkoutHoldError,
} from "@/lib/mapSelection";
import {
  clampQuantity,
  initialTicketQuantity,
  limitsFromGaTier,
  limitsFromListing,
  listingAvailabilityRange,
  listingDetailAvailabilityLabel,
  quantityIsAllowed,
  ticketQuantityOptions,
} from "@/lib/ticketListings";
import { shopperShellVars } from "@/lib/branding";
import {
  selectionOfferDescription,
} from "@/lib/ticketSummary";
import { checkoutHref, rememberCheckoutReturnPath, setStoredCart } from "@/lib/cart";
import {
  emailBlurInvalid,
  emailSubmitError,
  emailSubmitInvalid,
  formString,
  normalizeRedemptionCode,
  redemptionCodeBlurFieldError,
  redemptionCodeSubmitError,
  submittedEmail,
  type EmailFieldError,
  type RedemptionCodeFieldError,
} from "@/lib/fieldValidation";
import { beginRouteTransition } from "@/lib/routeTransition";
import { walletSectionHref } from "@/lib/walletNav";
import type { SeatmapBackground, SeatmapMapping } from "@/lib/seatmapLookups";
import { getSeatViewImageCandidates } from "@/lib/seatView";
import {
  stickyOffsetBelowHeader,
  ticketingChromeReservePx,
  TICKETING_LISTINGS_MIN_PX,
  TICKETING_MAIN_PAD_BOTTOM_PX,
  TICKETING_MAIN_PAD_TOP_PX,
} from "@/lib/ticketingSticky";
import { mobileStickyFooterReservePx } from "@/lib/mobileStickyFooter";
import {
  fluidSize,
  shopperFluidDesktopPinVars,
  shopperPageTypeCss,
} from "@/lib/shopperFluidType";
import useFiltersStore from "@/stores/filtersStore";
import useSeatmapStore from "@/stores/seatmapStore";

const NAVY = "#051b35";

export type TicketingListing = {
  zone: string;
  tier: string;
  sec: string;
  row: string;
  min: number;
  max: number;
  multipleOf?: number;
  price: string;
  /** Seatmap section id — used to pin the listing on the venue map. */
  sectionId?: string;
  /** Strapi ticket-group payload used by place-tickets-into-cart */
  cartGroup?: Record<string, unknown>;
};

export type TicketingData = {
  /** Numeric Strapi event id — required to place tickets into a real cart */
  eventId?: string | number;
  accent: string;
  accentDark: string;
  accentSoft: string; // pale accent bg for badges
  buttonColor?: string;
  buttonTextColor?: string;
  eventName: string;
  whenLong: string; // "Sat, Sep 26, 2026 6:00 PM · Doors 5:00 PM"
  whenShort: string; // "Sat, Sep 26, 2026 · Doors 5:00 PM"
  whenPlain: string; // "Sat, Sep 26, 2026 6:00 PM"
  doorsLine: string; // "Sat, Sep 26, 2026 6:00 PM · Doors 5:00 PM" (success)
  venueName: string;
  venueSlug?: string;
  venueLine: string; // "Aggie Memorial Stadium, Las Cruces, NM"
  venueAddress: string;
  venueCityState: string; // "Las Cruces, NM"
  mapsQuery: string;
  logoSrc: string;
  /** Tenant mark shown top-left on branded events (GA header). Falls back to the Blocktickets lockup. */
  brandLogoSrc?: string;
  /** Storefront the tenant mark links to. */
  orgHref?: string;
  orgLabel: string;
  providerLabel: string;
  aboutText: string;
  homeLabel: string;
  awayLabel: string;
  awayShort: string;
  /** When false, hide Who's playing (no attractions on the event). */
  showMatchupSection?: boolean;
  /** When false, omit the away/visitor row (single-attraction events). */
  showAwayTeam?: boolean;
  /** Matchup logos for Who's playing — falls back to initials when absent. */
  homeLogoSrc?: string;
  awayLogoSrc?: string;
  listings: TicketingListing[];
  /** "reserved" (seatmap flow, default) or "ga" (general-admission tier flow). */
  eventType?: "reserved" | "ga";
  /** GA: event poster + venue photo (falls back to logo). */
  posterSrc?: string;
  venuePhotoSrc?: string;
  /** GA ticket tiers. */
  gaTiers?: GATier[];
  /** Passcode-locked zones — their listings stay hidden until the code is entered. */
  lockedZones?: { zone: string; code: string }[];
  /** Real venue seatmap background (from GET /events/seatmap/...). */
  mapBackground?: SeatmapBackground | null;
  /** Seat / section geometry for listing pins and InteractiveSeatmap. */
  seatmapMapping?: SeatmapMapping | null;
  /** Offer catalog from the ticket-groups response — drives the filter chips. */
  offerNames?: string[];
  /**
   * Unfiltered listings used for the All quantity dropdown. The visible
   * `listings` shrink when a quantity has no matches; this catalog must not.
   */
  quantityCatalog?: TicketingListing[];
  /** Whole event is sold out: no listings, waitlist only. */
  soldOut?: boolean;
  /** No offer is active yet; scheduled offers stay hidden until their window. */
  scheduled?: boolean;
  /** Shopper-facing on-sale date/time formatted in the venue timezone. */
  scheduledAt?: string;
};

export type TicketingFilters = {
  quantity: number;
  accessible: boolean;
  sort: "price" | "-price";
};

export type GATier = {
  name: string;
  sub: string;
  price: string; // "$10.08" or "Free"
  unit: number; // numeric price for totals
  note: string;
  state: "live" | "locked" | "scheduled" | "soldout";
  min?: number;
  max?: number;
  multipleOf?: number;
  onSaleAt?: string;
  cartGroup?: Record<string, unknown>;
};

/**
 * What the notify modal is collecting an address for: a sold-out offer or event
 * takes a waitlist signup, anything else takes an on-sale reminder.
 */
type NotifySubject = { name: string; soldout: boolean; onSaleAt?: string };

const LEGEND = [
  { label: "Unavailable", color: "#dfe3ee" },
  { label: "Available", color: "var(--acc)" },
  { label: "Premium", color: NAVY },
  { label: "Accessibility", color: "#a6e773" },
];
const money = (n: number) => "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const SEATMAP = "/nmstate/seatmap-dummy.svg";
/** How long the listing placeholders stay up after a filter change. */
const LIST_SHIMMER_MS = 420;
/** Bottom bar height reserved so the map fills the locked mobile viewport. */
const LISTINGS_SHEET_BAR_PX = 88;

const DEFAULT_GA_TIERS: GATier[] = [
  { name: "Standard admission", sub: "General admission · unreserved seating", price: "$10.08", unit: 10.08, note: "Ticket limit: 100 per order", state: "live" },
  { name: "Aggie student", sub: "Valid NMSU student ID required at the gate", price: "Free", unit: 0, note: "All 800 student tickets claimed", state: "soldout" },
];

type Pick = { sec: string; row: string; seat: string; zone: string; tier: string; unit: number; price: string };

function SeatViewImage({
  src,
  section,
}: {
  src?: string;
  section: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: "#e7eaf2", color: "#6e7180" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28 }}><path d="M3 20V9l9-5 9 5v11" /><path d="M3 20h18" /><path d="M7 20v-6h4v6" /><path d="M14 20v-6h3v6" /></svg>
        <div style={{ fontSize: fluidSize(13), fontWeight: 500 }}>No seat view for Sec {section}</div>
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

const Star = ({ s = 14, filled = true }: { s?: number; filled?: boolean }) => (
  <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke={filled ? "none" : "currentColor"} strokeWidth={2} style={{ width: s, height: s }} aria-hidden>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
const LockIcon = ({ s = 15 }: { s?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: s, height: s }} aria-hidden>
    <rect x="4.5" y="11" width="15" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
const TicketIcon = ({ s = 18, color }: { s?: number; color?: string }) => (
  <Ticket width={s} height={s} stroke={color || "currentColor"} strokeWidth={1.8} aria-hidden />
);

export default function PremiumTicketing({
  data: d,
  onFiltersChange,
  refreshing = false,
}: {
  data: TicketingData;
  /** Ask the route to refetch inventory for these filters (server-side truth). */
  onFiltersChange?: (filters: TicketingFilters) => void;
  /** True while the route is refetching after a filter change. */
  refreshing?: boolean;
}) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const ACC = d.accent;
  const ACC_DK = d.accentDark;
  const ACC_SOFT = d.accentSoft;
  const BTN = d.buttonColor || ACC;
  const BTN_INK = d.buttonTextColor || "#fff";
  const LOGO = d.logoSrc;
  const showMatchupSection = d.showMatchupSection ?? true;
  const showAwayTeam = d.showAwayTeam ?? Boolean(d.awayLabel);
  const isGa = d.eventType === "ga";
  const POSTER = d.posterSrc || LOGO;
  // Future offers never render as cards. The inventory response exposes their
  // schedule at event level until at least one offer becomes active.
  const activeGaTiers = d.gaTiers?.filter((tier) => tier.state !== "scheduled");
  const seatedScheduled = !isGa && !!d.scheduled && d.listings.length === 0;
  const gaScheduled = isGa && !!d.scheduled && !activeGaTiers?.length;
  const eventScheduled = gaScheduled || seatedScheduled;
  const gaSoldOut = isGa && !!d.soldOut && !activeGaTiers?.length;
  const seatedSoldOut = !isGa && !!d.soldOut && !seatedScheduled;
  const eventSoldOut = gaSoldOut || seatedSoldOut;
  const GA_TIERS: GATier[] =
    activeGaTiers && activeGaTiers.length
      ? activeGaTiers
      : gaSoldOut || gaScheduled || d.gaTiers
        ? []
        : DEFAULT_GA_TIERS;
  // Nav is crimson for reserved, white for GA.
  const navBg = isGa ? "#ffffff" : ACC;
  const navInk = isGa ? NAVY : "#fff";
  const navLine = isGa ? "rgba(5,27,53,0.10)" : "rgba(255,255,255,0.16)";
  const navFieldBg = isGa ? "#f1f3f8" : "rgba(255,255,255,0.12)";
  const navFieldLine = isGa ? "rgba(5,27,53,0.10)" : "rgba(255,255,255,0.22)";
  const navFieldInk = isGa ? "#6e7180" : "rgba(255,255,255,0.75)";
  const navBtnBg = isGa ? ACC : "#fff";
  const navBtnInk = isGa ? "#fff" : ACC;
  const navBtnStyle = { fontFamily: "inherit", fontSize: fluidSize(15), fontWeight: 600, color: navBtnInk, background: navBtnBg, border: "none", borderRadius: 999, padding: "13px 30px", whiteSpace: "nowrap", cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center" } as const;

  const selectedFromMap = useSeatmapStore((s) => s.selectedFromMap);
  const seatedError = useSeatmapStore((s) => s.seatedError);
  const setSeatedError = useSeatmapStore((s) => s.setSeatedError);
  const resetMapState = useSeatmapStore((s) => s.resetMapState);
  const getTicketImage = useSeatmapStore((s) => s.getTicketImage);
  const bucket = useSeatmapStore((s) => s.bucket);
  const storeMapping = useSeatmapStore((s) => s.data);
  const storeBackground = useSeatmapStore((s) => s.background);
  const setStoreMapping = useSeatmapStore((s) => s.setData);
  const setStoreBackground = useSeatmapStore((s) => s.setBackground);

  // Props and the seatmap store are hydrated from the same payload, but either
  // one can be behind the other (route refetch, Fast Refresh). Take whichever
  // has the venue geometry so the interactive map is never skipped.
  const mapMapping = d.seatmapMapping || storeMapping;
  const mapBackground = d.mapBackground || storeBackground;
  const MAP_SRC = mapBackground?.url || SEATMAP;
  const hasLiveSeatmap = Boolean(mapMapping?.sections || mapMapping?.seats);

  const [mounted, setMounted] = useState(false);
  const [vw, setVw] = useState(1440);
  const [want, setWant] = useState(() => initialTicketQuantity(d.listings));
  const [zoneFilter, setZoneFilter] = useState<string[]>([]);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [unlockZone, setUnlockZone] = useState<string | null>(null);
  const [unlockInput, setUnlockInput] = useState("");
  const [unlockFieldError, setUnlockFieldError] =
    useState<RedemptionCodeFieldError>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [qtyMenu, setQtyMenu] = useState(false);
  const [ada, setAda] = useState(false);
  const [sortDir, setSortDir] = useState<"price" | "-price">("price");
  const [loading, setLoading] = useState(true);
  const [pinned, setPinned] = useState(false);
  const [map, setMap] = useState(false);
  const [mapExitConfirm, setMapExitConfirm] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [legendOpen, setLegendOpen] = useState(false);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [detail, setDetail] = useState<number | null>(null);
  const [media, setMedia] = useState(0);
  const [info, setInfo] = useState(false);
  const [sel, setSel] = useState<number | null>(null);
  const [panelQty, setPanelQty] = useState(2);
  // GA mode state
  const [gaQuantities, setGaQuantities] = useState<Record<number, number>>({});
  const [notifySubject, setNotifySubject] = useState<NotifySubject | null>(null);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyEmailError, setNotifyEmailError] = useState<EmailFieldError>(null);
  const [notifySms, setNotifySms] = useState(false);
  const [notifySent, setNotifySent] = useState(false);
  const [notified, setNotified] = useState<Record<string, boolean>>({});
  const [gaSheet, setGaSheet] = useState(false);
  const [eventSoldOutSheet, setEventSoldOutSheet] = useState(false);
  const [listingsExpanded, setListingsExpanded] = useState(false);
  const [mapTop, setMapTop] = useState(0);
  const headerRef = useRef<HTMLElement | null>(null);
  const sticky = useRef<HTMLDivElement | null>(null);
  const listingsScroll = useRef<HTMLDivElement | null>(null);
  const qtyBtn = useRef<HTMLButtonElement | null>(null);
  const [headerH, setHeaderH] = useState(93);
  const loadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  // The interactive map reads geometry from the store only. If the store lost it
  // (Fast Refresh resets module state without refetching), re-seed from props so
  // the map does not report itself unavailable while the payload is in hand.
  useEffect(() => {
    if (d.seatmapMapping && !storeMapping) setStoreMapping(d.seatmapMapping);
    if (d.mapBackground && !storeBackground) setStoreBackground(d.mapBackground);
  }, [
    d.mapBackground,
    d.seatmapMapping,
    setStoreBackground,
    setStoreMapping,
    storeBackground,
    storeMapping,
  ]);

  useEffect(() => {
    setVw(window.innerWidth);
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", onResize);
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 700);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(t);
      if (loadTimer.current) clearTimeout(loadTimer.current);
    };
  }, []);

  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const apply = () => {
      const h = el.getBoundingClientRect().height;
      if (h > 1) setHeaderH(h);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [vw]);

  // This is a light-themed page; the app's default body background is navy and
  // otherwise bleeds through at the top and around overlays. Force a light body
  // while mounted, and restore it on unmount.
  useEffect(() => {
    const b = document.body;
    const h = document.documentElement;
    const prevB = b.style.background;
    const prevH = h.style.background;
    b.style.background = "#f7f8fc";
    h.style.background = "#f7f8fc";
    return () => {
      b.style.background = prevB;
      h.style.background = prevH;
    };
  }, []);

  // Lock background scroll while any overlay (map / drawer / info) is open.
  useEffect(() => {
    const overlayOpen = map || info || sel !== null;
    if (!overlayOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [map, info, sel]);

  const mobile = vw < 900;
  const narrow = mobile || vw < 1120;
  const wide = !narrow;
  const listingsSheet =
    !isGa && narrow && !d.soldOut && !eventScheduled && d.listings.length > 0;

  useEffect(() => {
    setListingsExpanded(listingsSheet);
  }, [listingsSheet]);

  useEffect(() => {
    if (!listingsSheet) return;
    const el = sticky.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const apply = () => {
      const top = Math.round(el.getBoundingClientRect().bottom + 8);
      if (top > 0) setMapTop(top);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener("resize", apply);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, [listingsSheet, vw, headerH]);

  const stickTop = stickyOffsetBelowHeader(headerH);
  const chromeReserve = ticketingChromeReservePx(headerH);
  const offersViewportMax = `calc(100dvh - ${chromeReserve}px)`;
  const listingsSheetTop = mapTop || headerH + 12 + (mobile ? 140 : 260) + 8;

  useEffect(() => {
    const onScroll = () => {
      const el = sticky.current;
      if (!el) return;
      const inner = listingsScroll.current;
      const p =
        (inner?.scrollTop ?? el.scrollTop) > 0 ||
        el.getBoundingClientRect().top <= stickTop + 1;
      setPinned((cur) => (cur !== p ? p : cur));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const node = sticky.current;
    const inner = listingsScroll.current;
    node?.addEventListener("scroll", onScroll, { passive: true });
    inner?.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      node?.removeEventListener("scroll", onScroll);
      inner?.removeEventListener("scroll", onScroll);
    };
  }, [stickTop]);

  const requestInventory = (next: Partial<TicketingFilters>) => {
    const filters: TicketingFilters = {
      quantity: next.quantity ?? want,
      accessible: next.accessible ?? ada,
      sort: next.sort ?? sortDir,
    };
    onFiltersChange?.(filters);
  };

  /**
   * Shimmer the rows for a beat so every filter change reads as a new list,
   * whether the page refetches inventory or the change is filtered client-side.
   */
  const shimmerListings = () => {
    if (loadTimer.current) clearTimeout(loadTimer.current);
    setLoading(true);
    loadTimer.current = setTimeout(() => setLoading(false), LIST_SHIMMER_MS);
  };

  const reload = (nextWant: number) => {
    setWant(nextWant);
    setSel(null);
    requestInventory({ quantity: nextWant });
    shimmerListings();
  };

  const toggleAda = () => {
    const nextAda = !ada;
    setAda(nextAda);
    setSel(null);
    requestInventory({ accessible: nextAda });
    shimmerListings();
  };

  const toggleSort = () => {
    const nextSort = sortDir === "price" ? "-price" : "price";
    setSortDir(nextSort);
    requestInventory({ sort: nextSort });
    shimmerListings();
  };

  const filterByZones = (next: (current: string[]) => string[]) => {
    setZoneFilter(next);
    setSel(null);
    shimmerListings();
  };

  const openNotify = (subject: NotifySubject) => {
    setNotifySubject(subject);
    setNotifySent(false);
  };

  const submitEventWaitlist = (
    email: string,
    onSuccess?: () => void,
  ): boolean => {
    if (emailSubmitInvalid(email)) {
      setNotifyEmailError(emailSubmitError(email));
      return false;
    }
    setNotifyEmail(email);
    setNotifyEmailError(null);
    setNotified((current) => ({ ...current, [d.eventName]: true }));
    onSuccess?.();
    return true;
  };

  const lockedMap = useMemo(() => {
    const m: Record<string, string> = {};
    (d.lockedZones || []).forEach((z) => { m[z.zone] = z.code.trim().toUpperCase(); });
    return m;
  }, [d.lockedZones]);
  const eventTicketLimit = useFiltersStore((s) => s.eventTicketLimit);
  const listingQtyLimits = (l: TicketingListing) =>
    limitsFromListing(l, eventTicketLimit);
  const gaTierQtyLimits = (t: GATier) => limitsFromGaTier(t, eventTicketLimit);
  const isLocked = (zone: string) => !!lockedMap[zone] && !unlocked.includes(zone);
  const busy = loading || refreshing;
  const mapLocked = Boolean(d.soldOut) || eventScheduled;
  const priceOf = (l: TicketingListing) =>
    parseFloat(l.price.replace(/[^0-9.]/g, "")) || 0;
  const rows = useMemo(() => {
    const filtered = d.listings.filter((l) => quantityIsAllowed(want, listingQtyLimits(l)) && (!zoneFilter.length || zoneFilter.includes(l.zone)) && !(!!lockedMap[l.zone] && !unlocked.includes(l.zone)) && (!ada || Boolean(l.cartGroup?.accessible)));
    const sorted = [...filtered].sort((a, b) =>
      sortDir === "price" ? priceOf(a) - priceOf(b) : priceOf(b) - priceOf(a),
    );
    return sorted.map((l) => ({
      ...l,
      range: `${l.min} – ${l.max} Tickets`,
    }));
  }, [want, d.listings, zoneFilter, lockedMap, unlocked, ada, sortDir, eventTicketLimit]);
  // Placeholder rows roughly match the list being replaced, so the column keeps
  // its height while new inventory settles.
  const skeletonRows = Math.min(Math.max(rows.length || 3, 3), 5);
  // Offer catalog first — it includes offers with no inventory right now.
  const zoneChips = useMemo(() => {
    const seen: string[] = [...(d.offerNames || [])];
    d.listings.forEach((l) => {
      const offer = (l.cartGroup as { offer?: { name?: string; isConnectedOffer?: boolean | null } })
        ?.offer;
      if (offer && !isStandaloneCatalogOffer(offer)) return;
      if (!seen.includes(l.zone)) seen.push(l.zone);
    });
    return seen;
  }, [d.listings, d.offerNames]);
  const quantityCatalogRef = useRef<TicketingListing[]>(
    d.quantityCatalog?.length ? d.quantityCatalog : d.listings,
  );
  if (d.quantityCatalog?.length) {
    quantityCatalogRef.current = d.quantityCatalog;
  } else if (d.listings.length) {
    quantityCatalogRef.current = d.listings;
  }
  const quantityCatalog = quantityCatalogRef.current.length
    ? quantityCatalogRef.current
    : d.listings;
  const quantityOptions = useMemo(() => {
    const scoped = zoneFilter.length
      ? quantityCatalog.filter((listing) => zoneFilter.includes(listing.zone))
      : quantityCatalog;
    const options = ticketQuantityOptions(
      eventTicketLimit,
      scoped.map((listing) => listing.cartGroup || {}),
    );
    if (want >= 1 && !options.includes(want)) {
      return [...options, want].sort((a, b) => a - b);
    }
    return options;
  }, [quantityCatalog, zoneFilter, eventTicketLimit, want]);
  const ZONES = useMemo(() => {
    // derive 4 map zones from the distinct listing zones (fallback to listings)
    const seen = new Map<string, TicketingListing>();
    d.listings.forEach((l) => { if (!seen.has(l.zone)) seen.set(l.zone, l); });
    const arr = Array.from(seen.values()).slice(0, 4);
    const pos = [{ x: "50%", y: "22%", bg: ACC }, { x: "20%", y: "52%", bg: NAVY }, { x: "80%", y: "52%", bg: NAVY }, { x: "50%", y: "84%", bg: "#4a5567" }];
    return arr.map((l, i) => ({ label: l.zone.replace(/Sections?\s*/i, ""), price: l.price, ...pos[i % 4], sec: l.sec, row: l.row, zone: l.zone, tier: l.tier, unit: parseFloat(l.price.replace(/[^0-9.]/g, "")) || 0 }));
  }, [d.listings, ACC]);

  const selRow =
    (sel === null ? rows[0] : rows[sel]) ||
    rows[0] ||
    d.listings.find((l) => !isLocked(l.zone));
  const unit = selRow ? parseFloat(selRow.price.replace(/[^0-9.]/g, "")) : 0;
  const panelOfferDescription = selectionOfferDescription(selRow?.cartGroup);
  const panelOpen = sel !== null && !map;

  const pickTotal = picks.reduce((t, p) => t + p.unit, 0);
  const gaLiveUnit = (GA_TIERS.find((t) => t.state === "live") || GA_TIERS[0])?.unit ?? 10.08;
  const gaAvail = GA_TIERS.filter((t) => t.state !== "soldout");
  const gaFromNum = gaAvail.length ? Math.min(...gaAvail.map((t) => t.unit)) : gaLiveUnit;

  const [holding, setHolding] = useState(false);
  // GA lists every offer at once, so the tier being held has to be tracked or
  // all of their checkout buttons spin together.
  const [holdingTier, setHoldingTier] = useState<number | null>(null);
  const [holdError, setHoldError] = useState("");

  const addPick = (z: (typeof ZONES)[number]) => setPicks((list) => [...list, { sec: z.sec, row: z.row, seat: String(21 + list.length), zone: z.zone, tier: z.tier, unit: z.unit, price: "$" + z.unit.toFixed(2) }]);
  const flip = () => setMedia((m) => (m === 0 ? 1 : 0));

  /** Closing with seats selected needs confirm so the shopper does not lose them by accident. */
  const requestCloseMap = () => {
    if (selectedFromMap.length > 0 || picks.length > 0) {
      setMapExitConfirm(true);
      return;
    }
    setMapExitConfirm(false);
    setMap(false);
    resetMapState();
    setPicks([]);
  };

  const confirmExitMap = () => {
    setMapExitConfirm(false);
    setMap(false);
    resetMapState();
    setPicks([]);
  };

  const submitUnlockCode = async (code = unlockInput) => {
    const zone = unlockZone;
    if (!zone || unlocking) return;
    const submitErr = redemptionCodeSubmitError(code);
    if (submitErr) {
      setUnlockFieldError(submitErr);
      return;
    }
    const typed = normalizeRedemptionCode(code);
    setUnlocking(true);
    const opened = await verifyOfferAccessCode({
      eventId: d.eventId,
      code: typed,
      expected: lockedMap[zone],
    });
    setUnlocking(false);
    if (!opened) {
      setUnlockFieldError("rejected");
      return;
    }
    setUnlockFieldError(null);
    setUnlocked((u) => (u.includes(zone) ? u : [...u, zone]));
    filterByZones((prev) => (prev.includes(zone) ? prev : [...prev, zone]));
    setUnlockZone(null);
  };

  const goToCheckout = (cartId: string) => {
    rememberCheckoutReturnPath();
    const href = checkoutHref(cartId);
    beginRouteTransition(href);
    router.push(href);
  };

  const placeSelectedTickets = async (
    groups: Array<Record<string, unknown> & { quantity: number }>,
  ) => {
    if (d.eventId == null) {
      throw new Error("This event is not ready for checkout yet.");
    }
    if (!groups.length) {
      throw new Error("Select tickets before checkout.");
    }
    const res = isGa
      ? await placeGATicketsIntoCart({
          eventId: d.eventId,
          ticketGroup: groups[0],
        })
      : await placeTicketsIntoCart({
          eventId: d.eventId,
          ticketGroups: groups,
        });
    const cartId =
      (res.data as { cartId?: string | number; id?: string | number })?.cartId ??
      (res.data as { id?: string | number })?.id;
    if (cartId == null) {
      throw new Error("Cart could not be created. Please try again.");
    }
    const qty = groups.reduce((sum, g) => sum + Number(g.quantity || 0), 0);
    setStoredCart(cartId, qty || 1);
    return String(cartId);
  };

  const runCheckoutWithGroup = async (
    group: Record<string, unknown>,
    quantity: number,
    opts?: { closeGaSheet?: boolean; tierIndex?: number },
  ) => {
    setHolding(true);
    setHoldingTier(opts?.tierIndex ?? null);
    setHoldError("");
    try {
      const cartId = await placeSelectedTickets([{ ...group, quantity }]);
      if (opts?.closeGaSheet) setGaSheet(false);
      goToCheckout(cartId);
    } catch (err: unknown) {
      setSeatedError(checkoutHoldError(err));
      setHolding(false);
      setHoldingTier(null);
    }
  };

  const startHoldFromMap = async () => {
    if (holding || !selectedFromMap.length) return;
    setHolding(true);
    setHoldError("");
    try {
      const groups = selectedFromMap.map((g) => ({
        ...(g as Record<string, unknown>),
        quantity: Number(g.quantity || 1),
      }));
      const cartId = await placeSelectedTickets(groups);
      goToCheckout(cartId);
    } catch (err: unknown) {
      setSeatedError(checkoutHoldError(err));
      setHolding(false);
    }
  };

  const startHold = async () => {
    if (holding) return;
    const listing = selRow as TicketingListing | undefined;
    const group = listing?.cartGroup;
    if (!group) {
      setSeatedError({ ...CHECKOUT_DEMO_LISTINGS_ERROR });
      return;
    }
    await runCheckoutWithGroup(group, panelQty);
  };

  // GA tier sheet → place inventory, then the checkout page (which gates login).
  const startGaCheckout = async (
    tier?: GATier,
    quantity?: number,
    tierIndex?: number,
  ) => {
    if (holding) return;
    const chosen = tier || GA_TIERS.find((t) => t.state === "live");
    const group = chosen?.cartGroup;
    if (!group) {
      setSeatedError({ ...CHECKOUT_DEMO_TIERS_ERROR });
      return;
    }
    await runCheckoutWithGroup(
      group,
      quantity ?? Math.max(1, chosen?.min || 1),
      { closeGaSheet: true, tierIndex },
    );
  };

  const checkoutBtnRow: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    whiteSpace: "nowrap",
  };

  const card: React.CSSProperties = { background: "#fff", border: "1px solid rgba(5,27,53,0.10)", boxShadow: "0 1px 2px rgba(5,27,53,0.05)" };
  const pill = (bg: string, color: string): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 7, background: bg, color, fontSize: fluidSize(13), fontWeight: 600, padding: "4px 12px", borderRadius: 999, whiteSpace: "nowrap" });
  const primaryBtn: React.CSSProperties = { fontFamily: "inherit", fontWeight: 600, color: BTN_INK, background: BTN, border: "none", borderRadius: 999, cursor: "pointer" };
  const shimmer: React.CSSProperties = { background: "linear-gradient(90deg,#eef0f6 0%,#f7f8fc 50%,#eef0f6 100%)", backgroundSize: "420px 100%", animation: "nmt-shimmer 1.4s linear infinite" };
  const thumbSize = mobile ? 52 : 96;

  const findOnMapBtn = (h: number, radius: number) => (
    <button
      className="nmt-map-btn"
      type="button"
      disabled={mapLocked}
      onClick={() => setMap(true)}
      style={{
        fontFamily: "inherit",
        position: "relative",
        width: "100%",
        height: h,
        borderRadius: radius,
        border: "1px solid rgba(5,27,53,0.10)",
        background: "#edeff7",
        cursor: mapLocked ? "default" : "pointer",
        opacity: mapLocked ? 0.55 : 1,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        ...card,
      }}
    >
      <div style={{ position: "absolute", inset: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MAP_SRC} alt="Seat map" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }} />
      </div>
      <span aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(5,27,53,0.05), rgba(5,27,53,0.18))" }} />
      <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 10, background: "#fff", borderRadius: 999, padding: "12px 22px", fontSize: fluidSize(15), fontWeight: 600, color: ACC, boxShadow: "0 6px 20px -6px rgba(5,27,53,0.35)", whiteSpace: "nowrap" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        Find on map
      </span>
    </button>
  );

  const venueImage = (
    section: string | number,
    type: "thumbnail" | "seat-view",
  ) =>
    d.venueSlug ? getTicketImage(d.venueSlug, section, type) : undefined;

  const venueImageCandidates = (section: string | number) =>
    d.venueSlug
      ? getSeatViewImageCandidates(
          d.venueSlug,
          section,
          section,
          ["highlights", "thumbnail"],
          bucket,
        )
      : [];

  const listingThumb = (l: TicketingListing) => (
    <SectionLocatorThumb
      background={mapBackground}
      mapping={mapMapping}
      sectionId={l.sectionId}
      sectionNumber={l.sec}
      section={l.sec}
      thumbnailCandidates={venueImageCandidates(l.sec)}
    />
  );

  const trustCard = (
    <div style={{ ...card, borderRadius: 20, padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      {[
        { t: "Mobile tickets", d: "Delivered to your account and scanned at the gate." },
        { t: "Buyer protection", d: "Every listing is verified inventory, safe from bots and scalpers." },
        { t: "Prices are all-in", d: "Taxes and fees included on every listing. No surprises at checkout." },
      ].map((r) => (
        <div key={r.t} style={{ display: "flex", gap: 14 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22, flexShrink: 0, marginTop: 2 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ fontSize: fluidSize(16), fontWeight: 600, letterSpacing: "-0.01em" }}>{r.t}</div>
            <div style={{ fontSize: fluidSize(14), color: "#6e7180" }}>{r.d}</div>
          </div>
        </div>
      ))}
    </div>
  );

  const compactTrustCard = (
    <div style={{ ...card, width: "100%", boxSizing: "border-box", borderRadius: 20, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
      {[
        { t: "Mobile tickets.", d: " Securely stored in your account.", icon: <><rect x="5" y="2" width="14" height="20" rx="3" /><line x1="10" y1="18.5" x2="14" y2="18.5" /></> },
        { t: "Buyer protection.", d: " Safe from bots and scalpers.", icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></> },
        { t: "Prices are all-in.", d: " Taxes and fees included.", icon: <><path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0l-7.2-7.2a2 2 0 0 1-.6-1.4V4a1 1 0 0 1 1-1h8a2 2 0 0 1 1.4.6l7.4 7.4a2 2 0 0 1 0 2.8z" /><line x1="7.5" y1="7.5" x2="7.51" y2="7.5" /></> },
      ].map((r) => (
        <div key={r.t} style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, flexShrink: 0 }}>{r.icon}</svg>
          <div style={{ flex: 1, minWidth: 0, fontSize: fluidSize(14), color: "#4a5567" }}><span style={{ fontWeight: 600, color: NAVY }}>{r.t}</span>{r.d}</div>
        </div>
      ))}
    </div>
  );

  /** Event-level schedule shown only when no offer is currently active. */
  const scheduledPanel = (wideLayout: boolean) => (
    <div
      style={
        wideLayout
          ? { padding: "4px 0" }
          : {
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              padding: mobile ? "12px 0 0" : "8px 0 0",
            }
      }
    >
      <OnSaleSoonCard
        scheduledAt={d.scheduledAt}
        accentColor={ACC}
        desktop={!mobile}
      />
    </div>
  );

  const scheduledBodyPanel = (desktop = false) => (
    <div
      data-testid="ticketing-scheduled-body"
      style={{
        flex: "1 1 0",
        minHeight: 0,
        alignSelf: "stretch",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <OnSaleSoonCard
        scheduledAt={d.scheduledAt}
        accentColor={ACC}
        desktop={desktop}
        fill
      />
    </div>
  );

  const scheduledStickyWhen = d.scheduledAt?.replace(" at ", " • ") ?? "";

  const scheduledStickyBar = (
    <MobileStickyFooter
      accentColor={ACC}
      data-testid="ticketing-scheduled-sticky"
      innerPadding="12px 16px"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            aria-hidden
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: ACC,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: fluidSize(mobile ? 12 : 16),
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#6e7180",
            }}
          >
            On sale soon
          </span>
        </div>
        {scheduledStickyWhen ? (
          <div
            style={{
              fontSize: fluidSize(mobile ? 18 : 22),
              fontWeight: 600,
              color: "#051b35",
              letterSpacing: "-0.02em",
              lineHeight: 1.25,
              paddingLeft: 16,
            }}
          >
            {scheduledStickyWhen}
          </div>
        ) : null}
        <p
          style={{
            margin: 0,
            fontSize: fluidSize(mobile ? 15 : 17),
            fontWeight: 400,
            color: "#8a93a3",
            lineHeight: 1.45,
            paddingLeft: 16,
          }}
        >
          This event does not have any tickets on sale yet. Check back in later.
        </p>
      </div>
    </MobileStickyFooter>
  );

  const eventSoldOutNotifyButton = (
    <button
      type="button"
      disabled={Boolean(notified[d.eventName])}
      onClick={() => {
        setNotifySent(false);
        setNotifyEmailError(null);
        setEventSoldOutSheet(true);
      }}
      style={{
        fontFamily: "inherit",
        flexShrink: 0,
        border: "none",
        borderRadius: 999,
        background: notified[d.eventName] ? ACC_SOFT : ACC,
        color: notified[d.eventName] ? ACC : BTN_INK,
        fontSize: fluidSize(15),
        fontWeight: 600,
        padding: "14px 22px",
        cursor: notified[d.eventName] ? "default" : "pointer",
        whiteSpace: "nowrap",
        ...(seatedSoldOut ? { width: "100%" } : {}),
      }}
    >
      {notified[d.eventName] ? "Reminder set" : "Notify me"}
    </button>
  );

  const eventSoldOutNotifyCopy = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, ...(seatedSoldOut ? { justifyContent: "center" } : {}) }}>
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: ACC,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: fluidSize(mobile ? 12 : 14),
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#6e7180",
          }}
        >
          Sold out
        </span>
      </div>
      <div
        style={{
          fontSize: fluidSize(mobile ? 16 : 22),
          fontWeight: 600,
          color: seatedSoldOut ? "#051b35" : "#4a5567",
          letterSpacing: seatedSoldOut ? "-0.02em" : undefined,
          lineHeight: seatedSoldOut ? 1.25 : 1.35,
          ...(seatedSoldOut ? {} : { paddingLeft: 16 }),
        }}
      >
        Get notified if tickets become available
      </div>
    </>
  );

  const eventSoldOutBodyPanel = () => (
    <div
      data-testid="ticketing-soldout-body"
      style={{
        flex: "1 1 0",
        minHeight: 0,
        alignSelf: "stretch",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          ...card,
          borderRadius: 20,
          flex: 1,
          minHeight: 0,
          width: "100%",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: 12,
          padding: "32px 24px",
        }}
      >
        {eventSoldOutNotifyCopy}
        <div style={{ width: "100%", maxWidth: 320, marginTop: 8 }}>
          {eventSoldOutNotifyButton}
        </div>
      </div>
    </div>
  );

  const eventSoldOutNotifyBarInner = (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          {eventSoldOutNotifyCopy}
        </div>
        {eventSoldOutNotifyButton}
      </div>
  );

  const eventSoldOutNotifyBar = (fixed: boolean) =>
    fixed ? (
      <MobileStickyFooter
        accentColor={ACC}
        data-testid="ticketing-soldout-sticky"
      >
        {eventSoldOutNotifyBarInner}
      </MobileStickyFooter>
    ) : (
      <div
        data-testid="ticketing-soldout-sticky"
        style={{ padding: "18px 20px", background: "#fff" }}
      >
        {eventSoldOutNotifyBarInner}
      </div>
    );

  // GA tier cards — rendered inline on desktop, inside the mobile bottom sheet.
  const gaTierCards = (
    <>
      {GA_TIERS.map((t, i) => {
        const effectiveState =
          t.state === "locked" && unlocked.includes(t.name) ? "live" : t.state;
        const live = effectiveState === "live";
        const soldout = effectiveState === "soldout";
        const locked = effectiveState === "locked";
        const limits = gaTierQtyLimits(t);
        const gaQty = clampQuantity(gaQuantities[i] ?? limits.min, limits);
        const setTierQuantity = (next: number) =>
          setGaQuantities((current) => ({
            ...current,
            [i]: clampQuantity(next, limits),
          }));
        const done = !!notified[t.name];
        const tierOfferDescription = selectionOfferDescription(t.cartGroup);
        const s = effectiveState === "live"
          ? { label: "On sale", dot: "#7fbe4d", pillBg: "rgba(166,231,115,0.22)", pillInk: "#3f6b1f" }
          : locked
            ? { label: "Access code", dot: "#8a6410", pillBg: "rgba(201,150,46,0.16)", pillInk: "#8a6410" }
          : effectiveState === "scheduled"
            ? { label: "Scheduled", dot: "#c9962e", pillBg: "rgba(201,150,46,0.16)", pillInk: "#8a6410" }
            : { label: "Sold out", dot: "#a9b0bd", pillBg: "#eef0f6", pillInk: "#6e7180" };
        const stepBtn: React.CSSProperties = { fontFamily: "inherit", width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", border: "none", borderRadius: 999, color: NAVY, cursor: "pointer" };
        return (
          <div key={t.name} style={{ border: live ? `1.5px solid ${ACC}` : locked ? "1.5px dashed rgba(201,150,46,0.55)" : "1px solid rgba(5,27,53,0.10)", background: soldout ? "#f7f8fc" : locked ? "#fffdf8" : "#fff", borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontSize: fluidSize(18), fontWeight: 600, letterSpacing: "-0.015em", color: soldout ? "#6e7180" : NAVY }}>{t.name}</div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: s.pillBg, color: s.pillInk, fontSize: fluidSize(11), fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", padding: "5px 11px", borderRadius: 999 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: s.dot }} />{s.label}
                  </span>
                </div>
                <div style={{ fontSize: fluidSize(14), color: "#6e7180" }}>{t.sub}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: fluidSize(26), fontWeight: 600, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", color: soldout ? "#6e7180" : NAVY }}>{t.price}</div>
                <div style={{ fontSize: fluidSize(13), color: "#6e7180" }}>Incl. taxes and fees</div>
              </div>
            </div>
            <div style={{ height: 1, background: "rgba(5,27,53,0.08)" }} />
            {tierOfferDescription ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: fluidSize(12), fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a93a3" }}>About this ticket</div>
                <ExpandableDescription
                  text={tierOfferDescription}
                  mobile={mobile}
                  toggleColor={ACC}
                  style={{ fontSize: fluidSize(14), color: "#4a5567", lineHeight: 1.6 }}
                />
              </div>
            ) : null}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ fontSize: fluidSize(13), color: "#6e7180" }}>{t.note}</div>
              {live ? (
                <div style={{ display: "flex", alignItems: "center", gap: 14, ...(mobile ? { width: "100%" } : {}) }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #d3d6e0", borderRadius: 999, padding: 5, flexShrink: 0 }}>
                    <button onClick={() => setTierQuantity(gaQty - limits.step)} aria-label="Remove a ticket" disabled={gaQty <= limits.min} style={{ ...stepBtn, opacity: gaQty <= limits.min ? 0.4 : 1 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </button>
                    <span style={{ minWidth: 30, textAlign: "center", fontSize: fluidSize(17), fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{gaQty}</span>
                    <button onClick={() => setTierQuantity(gaQty + limits.step)} aria-label="Add a ticket" disabled={gaQty >= limits.max} style={{ ...stepBtn, opacity: gaQty >= limits.max ? 0.4 : 1 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </button>
                  </div>
                  <BrandedActionButton
                    primaryColor={BTN}
                    textColor={BTN_INK}
                    loading={holding && holdingTier === i}
                    loadingLabel="Holding seats…"
                    disabled={holding && holdingTier !== i}
                    onClick={() => void startGaCheckout(t, gaQty, i)}
                    className="text-[16px]"
                    style={{
                      ...checkoutBtnRow,
                      padding: "15px 28px",
                      ...(mobile ? { flex: 1 } : {}),
                    }}
                  >
                    Checkout {money(t.unit * gaQty)}
                  </BrandedActionButton>
                </div>
              ) : locked ? (
                <BrandedActionButton
                  tone="secondary"
                  onClick={() => {
                    setUnlockZone(t.name);
                    setUnlockInput("");
                    setUnlockFieldError(null);
                  }}
                  className="text-[16px]"
                  style={{ padding: "13px 22px" }}
                >
                  <LockIcon s={16} /> Enter access code
                </BrandedActionButton>
              ) : done && soldout ? (
                <div
                  role="status"
                  style={{
                    fontSize: fluidSize(14),
                    fontWeight: 600,
                    color: "#3f6b1f",
                    background: "rgba(166,231,115,0.16)",
                    borderRadius: 14,
                    padding: "13px 18px",
                  }}
                >
                  You&rsquo;re on the waiting list
                </div>
              ) : (
                <button onClick={() => openNotify({ name: t.name, soldout, onSaleAt: t.onSaleAt })} style={{ fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 9, fontSize: fluidSize(15), fontWeight: 600, color: done ? "#3f6b1f" : NAVY, background: done ? "rgba(166,231,115,0.16)" : "#fff", border: `1px solid ${done ? "rgba(127,190,77,0.45)" : "#d3d6e0"}`, borderRadius: 999, padding: "13px 22px", cursor: "pointer" }}>
                  {done && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><polyline points="20 6 9 17 4 12" /></svg>}
                  {done ? "Reminder set" : soldout ? "Join waitlist" : "Remind me"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </>
  );

  const filterToolbar = (() => {
    const compact = listingsSheet;
    const type = fluidSize(compact ? 14 : 15);
    const chipPad = compact ? "10px 14px" : "12px 20px";
    const icon = compact ? 14 : 17;
    return (
    <>
      <div className="nmt-filter-scroll" style={{ display: "flex", alignItems: "center", gap: compact ? 8 : 10, minWidth: 0, overflowX: "auto", flexWrap: "nowrap", padding: compact ? "0 0 6px" : "2px 0 10px 2px" }}>
        <button ref={qtyBtn} onClick={() => setQtyMenu((v) => !v)} style={{ fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "space-between", gap: compact ? 6 : 8, minWidth: compact ? 108 : 132, minHeight: compact ? 40 : undefined, boxSizing: "border-box", fontSize: type, fontWeight: 600, color: "#fff", background: ACC, border: `1px solid ${ACC}`, borderRadius: 999, padding: chipPad, whiteSpace: "nowrap", cursor: "pointer", flexShrink: 0 }}>
          {want === 1 ? "1 ticket" : `${want} tickets`}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: icon, height: icon, opacity: 0.8, transform: qtyMenu ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 180ms ease" }}><polyline points="6 9 12 15 18 9" /></svg>
        </button>
        {qtyMenu && mounted && qtyBtn.current && createPortal(
          <>
            <div onClick={() => setQtyMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 29 }} />
            <div role="listbox" aria-label="Ticket quantity" style={{ position: "fixed", top: qtyBtn.current.getBoundingClientRect().bottom + 8, left: qtyBtn.current.getBoundingClientRect().left, zIndex: 30, minWidth: 150, maxHeight: 280, overflowY: "auto", background: "#fff", border: "1px solid rgba(5,27,53,0.10)", borderRadius: 14, boxShadow: "0 20px 44px -18px rgba(5,27,53,0.45)", padding: 6, display: "flex", flexDirection: "column" }}>
              {quantityOptions.map((n) => (
                <button key={n} onClick={() => { setQtyMenu(false); reload(n); }} style={{ fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%", textAlign: "left", fontSize: type, fontWeight: n === want ? 600 : 500, color: n === want ? ACC : NAVY, background: n === want ? ACC_SOFT : "transparent", border: "none", borderRadius: 10, padding: compact ? "10px 12px" : "11px 14px", cursor: "pointer", whiteSpace: "nowrap" }}>
                  {n === 1 ? "1 ticket" : `${n} tickets`}
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
        {[null, ...zoneChips].map((z) => {
            const active = z === null ? zoneFilter.length === 0 : zoneFilter.includes(z);
            const locked = z !== null && isLocked(z);
            const label = z === null ? "All" : z;
            return (
              <button
                key={z ?? "all"}
                onClick={() => {
                  if (locked) {
                    setUnlockZone(z);
                    setUnlockInput("");
                    setUnlockFieldError(null);
                    return;
                  }
                  if (z === null) {
                    filterByZones(() => []);
                    return;
                  }
                  filterByZones((prev) =>
                    prev.includes(z) ? prev.filter((name) => name !== z) : [...prev, z],
                  );
                }}
                className={`nmt-filter${active ? " active" : ""}`}
                style={{ fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: compact ? 6 : 9, fontSize: type, fontWeight: active ? 600 : 500, borderRadius: 999, padding: chipPad, minHeight: compact ? 40 : undefined, whiteSpace: "nowrap", flexShrink: 0, cursor: "pointer" }}
              >
                <span className="nmt-star">{locked ? <LockIcon s={compact ? 13 : 15} /> : <Star s={icon} filled={active} />}</span>
                {label}
              </button>
            );
          })}
        </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: compact ? 10 : 16, marginTop: compact ? 10 : 22 }}>
        {busy ? <div style={{ height: 20, width: 96, borderRadius: 999, ...shimmer }} /> : <div style={{ fontSize: type, fontWeight: 500, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{rows.length} Listings</div>}
        <div style={{ display: "flex", alignItems: "center", gap: compact ? 12 : 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: compact ? 8 : 10, color: "#6e7180" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: compact ? 18 : 21, height: compact ? 18 : 21 }}><circle cx="16" cy="4" r="1" /><path d="m18 19 1-7-6 1" /><path d="m5 8 3-3 5.5 3-2.36 3.5" /><path d="M4.24 14.5a5 5 0 0 0 6.88 6" /><path d="M13.76 17.5a5 5 0 0 0-6.88-6" /></svg>
            <button onClick={toggleAda} aria-label="Accessible seating only" style={{ width: compact ? 44 : 48, height: compact ? 26 : 28, borderRadius: 999, border: "none", padding: 3, cursor: "pointer", boxSizing: "border-box", display: "flex", alignItems: "center", transition: "background 180ms ease", background: ada ? ACC : "#d3d6e0" }}>
              <span style={{ display: "block", width: compact ? 20 : 22, height: compact ? 20 : 22, borderRadius: 999, background: "#fff", boxShadow: "0 1px 3px rgba(5,27,53,0.3)", transition: "transform 180ms cubic-bezier(0.2,0.8,0.2,1)", transform: ada ? (compact ? "translateX(18px)" : "translateX(20px)") : "translateX(0)" }} />
            </button>
          </div>
          <button onClick={toggleSort} aria-label={sortDir === "price" ? "Sorted by lowest price" : "Sorted by highest price"} style={{ fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, fontSize: type, fontWeight: 500, color: NAVY, background: "transparent", border: "none", padding: compact ? "8px 0" : 0, minHeight: compact ? 40 : undefined, whiteSpace: "nowrap", cursor: "pointer" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: compact ? 16 : 18, height: compact ? 16 : 18, transform: sortDir === "price" ? "none" : "scaleY(-1)" }}><path d="M11 5h10" /><path d="M11 9h7" /><path d="M11 13h4" /><path d="M3 17l3 3 3-3" /><path d="M6 4v16" /></svg>
            Sort by price
          </button>
        </div>
      </div>
      <div style={{ height: 1, background: "rgba(5,27,53,0.08)", margin: compact ? "10px 0 0" : "16px 0 0" }} />
    </>
    );
  })();

  return (
    <div className="shopper-page" data-theme="light" style={{ position: "relative", display: "flex", flexDirection: "column", background: "#f7f8fc", color: NAVY, width: "100%", minHeight: "100dvh", fontFamily: "'Geist', system-ui, -apple-system, sans-serif", WebkitFontSmoothing: "antialiased", ...shopperShellVars(ACC), ...(!isGa ? { height: "100dvh", overflowY: listingsSheet ? "hidden" : "auto" } : { minHeight: "100vh" }) }}>
      <style>{`
        ${shopperPageTypeCss()}
        @keyframes nmt-shimmer { 0% { background-position: -420px 0 } 100% { background-position: 420px 0 } }
        .nmt-primary { transition: transform 180ms cubic-bezier(0.2,0.8,0.2,1), background 180ms; }
        .nmt-primary:hover { transform: translateY(-1px); }
        .nmt-primary:active { transform: translateY(1px); background: ${ACC_DK}; }
        .nmt-listing { transition: transform 180ms cubic-bezier(0.2,0.8,0.2,1), box-shadow 180ms, border-color 180ms; }
        .nmt-listing:hover { transform: translateY(-2px); border-color: ${ACC}; box-shadow: 0 10px 30px -12px rgba(5,27,53,0.2); }
        .nmt-map-btn { transition: box-shadow 180ms, border-color 180ms; }
        .nmt-map-btn:hover { border-color: ${ACC}; box-shadow: 0 10px 34px -10px rgba(5,27,53,0.25); }
        .nmt-chip { transition: border-color 140ms; }
        .nmt-chip:hover { border-color: ${NAVY}; }
        .nmt-filter { background: #fff; border: 1px solid #d3d6e0; color: ${NAVY}; transition: background 140ms ease, border-color 140ms ease, color 140ms ease; }
        .nmt-filter .nmt-star { color: ${ACC}; display: inline-flex; }
        .nmt-filter:hover { border-color: ${NAVY}; background: #f1f3f8; }
        .nmt-filter.active { background: ${ACC}; border-color: ${ACC}; color: #fff; }
        .nmt-filter.active .nmt-star { color: #fff; }
        .nmt-filter-scroll { scrollbar-width: thin; scrollbar-color: ${ACC} #e7eaf1; }
        .nmt-filter-scroll::-webkit-scrollbar { height: 7px; }
        .nmt-filter-scroll::-webkit-scrollbar-track { background: #e7eaf1; border-radius: 999px; }
        .nmt-filter-scroll::-webkit-scrollbar-thumb { background: ${ACC}; border-radius: 999px; }
        .shopper-page .ga-soldout-notify-sheet h2 {
          font-size: var(--t-24) !important;
          letter-spacing: -0.01em;
          line-height: 1.25;
          margin: 0 !important;
        }
        .shopper-page .ga-soldout-notify-sheet .ga-soldout-notify-eyebrow {
          font-size: var(--t-11);
        }
        .shopper-page .ga-soldout-notify-sheet .ga-soldout-notify-desc {
          font-size: var(--t-15);
        }
        .shopper-page .ga-soldout-notify-sheet label {
          font-size: var(--t-12);
        }
        .shopper-page .ga-soldout-notify-sheet input[type="email"] {
          font-size: var(--t-15);
        }
        .shopper-page .ga-soldout-notify-sheet .ga-soldout-notify-submit {
          font-size: var(--t-16) !important;
        }
        .shopper-page .ga-soldout-notify-sheet .ga-soldout-notify-action {
          font-size: var(--t-15) !important;
        }
        @media (max-width: 899px) {
          .shopper-page .ga-soldout-notify-sheet {
            ${shopperFluidDesktopPinVars([11, 12, 13, 15, 16, 24])}
          }
          .ga-soldout-notify-sheet-overlay {
            width: 100vw !important;
            max-width: 100vw !important;
            justify-content: flex-start !important;
          }
          .shopper-page .ga-soldout-notify-sheet,
          .ga-soldout-notify-sheet-overlay .ga-soldout-notify-sheet {
            width: 100% !important;
            max-width: none !important;
          }
        }
      `}</style>

      {/* HEADER (desktop) */}
      {!mobile && (
        <header ref={headerRef} style={{ background: navBg, borderBottom: `1px solid ${navLine}`, color: navInk, position: "sticky", top: 0, zIndex: 12 }}>
          <div style={{ maxWidth: 1320, margin: "0 auto", padding: "14px 32px", display: "flex", alignItems: "center", gap: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0, flex: "1 1 auto" }}>
              {isGa ? (
                d.brandLogoSrc ? (
                  <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={d.brandLogoSrc} alt={d.orgLabel} style={{ height: 46, width: "auto", display: "block", objectFit: "contain" }} />
                  </span>
                ) : (
                  <Link href="/browse" aria-label="Blocktickets home" style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/blocktickets-logo-navy.svg" alt="Blocktickets" style={{ height: 26, width: "auto", display: "block", objectFit: "contain" }} />
                  </Link>
                )
              ) : (
                <>
                  <div style={{ width: 64, height: 64, borderRadius: 14, background: "#fff", border: "1px solid rgba(5,27,53,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 9, boxSizing: "border-box" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={LOGO} alt={d.homeLabel} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                    <div style={{ fontSize: fluidSize(19), fontWeight: 600, letterSpacing: "-0.015em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.eventName}</div>
                    <div style={{ fontSize: fluidSize(14), color: "rgba(255,255,255,0.72)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.whenLong} at <span style={{ color: "#fff", fontWeight: 500 }}>{d.venueLine}</span></div>
                    <button onClick={() => setInfo(true)} style={{ fontFamily: "inherit", alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6, fontSize: fluidSize(13), fontWeight: 500, color: "rgba(255,255,255,0.82)", background: "transparent", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                      Event information
                    </button>
                  </div>
                </>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, background: navFieldBg, border: `1px solid ${navFieldLine}`, borderRadius: 999, padding: "12px 20px", width: 300, color: navFieldInk }}>
              <span style={{ fontSize: fluidSize(14), whiteSpace: "nowrap", flex: 1 }}>Search for events</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
              {isAuthenticated ? (
                <Link href={walletSectionHref("events")} className="nmt-primary" style={navBtnStyle}>My wallet</Link>
              ) : (
                <LoginLink className="nmt-primary" style={navBtnStyle}>Login</LoginLink>
              )}
            </div>
          </div>
        </header>
      )}

      {/* HEADER (mobile) */}
      {mobile && (
        <header ref={headerRef} style={{ background: navBg, color: navInk, borderBottom: `1px solid ${navLine}`, position: "sticky", top: 0, zIndex: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <button aria-label="Back" onClick={() => goBack("/browse/", router)} style={{ fontFamily: "inherit", width: 44, height: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: navFieldBg, border: `1px solid ${navFieldLine}`, borderRadius: 999, color: navInk, cursor: "pointer" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          {isGa ? (
            d.brandLogoSrc ? (
              <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.brandLogoSrc} alt={d.orgLabel} style={{ height: 34, width: "auto", objectFit: "contain" }} />
              </span>
            ) : (
              <Link href="/browse" aria-label="Blocktickets home" style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/blocktickets-logo-navy.svg" alt="Blocktickets" style={{ height: 20, width: "auto", objectFit: "contain" }} />
              </Link>
            )
          ) : (
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ fontSize: fluidSize(16), fontWeight: 600, letterSpacing: "-0.015em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.eventName}</div>
              <div style={{ fontSize: fluidSize(13), color: "rgba(255,255,255,0.72)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.whenShort}</div>
            </div>
          )}
          <button onClick={() => setInfo(true)} aria-label="Event information" style={{ fontFamily: "inherit", width: 44, height: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", color: navInk, cursor: "pointer" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
          </button>
        </header>
      )}

      {/* MAIN (reserved / seatmap flow) */}
      {!isGa && (
      <main style={{ flex: "1 1 auto", width: "100%", maxWidth: 1320, margin: "0 auto", padding: eventScheduled ? (mobile ? 12 : `${TICKETING_MAIN_PAD_TOP_PX}px 32px ${TICKETING_MAIN_PAD_BOTTOM_PX}px`) : mobile ? `12px 12px ${gaSoldOut ? mobileStickyFooterReservePx() : "12px"}` : seatedSoldOut ? `${TICKETING_MAIN_PAD_TOP_PX}px 32px ${TICKETING_MAIN_PAD_BOTTOM_PX}px` : `${TICKETING_MAIN_PAD_TOP_PX}px 32px ${TICKETING_MAIN_PAD_BOTTOM_PX}px`, ...(eventScheduled || seatedSoldOut ? { display: "flex", flexDirection: "column", minHeight: 0 } : {}), ...(listingsSheet ? { paddingBottom: LISTINGS_SHEET_BAR_PX, minHeight: 0, overflow: "hidden" } : {}), boxSizing: "border-box", display: eventScheduled || seatedSoldOut || narrow ? "flex" : "grid", flexDirection: "column", gridTemplateColumns: eventScheduled || seatedSoldOut || narrow ? undefined : "minmax(0, 1fr) 340px", gap: 16, alignItems: listingsSheet ? "stretch" : "start" }}>
        {eventScheduled ? (
          scheduledBodyPanel(!mobile)
        ) : seatedSoldOut ? (
          eventSoldOutBodyPanel()
        ) : (
        <>
        {/* Scheduled and sold-out mobile have nothing to filter, so skip the listing chrome. */}
        {narrow && !d.soldOut && (
          <div
            ref={sticky}
            data-testid="ticketing-map"
            style={{ flexShrink: 0, alignSelf: "stretch" }}
          >
            {findOnMapBtn(mobile ? 140 : 260, mobile ? 16 : 14)}
          </div>
        )}
        {narrow && <div style={{ flexShrink: 0, width: "100%", alignSelf: "stretch" }}>{compactTrustCard}</div>}
        {!(eventSoldOut && mobile) && (
        <section
          data-testid="ticketing-offers"
          ref={wide ? sticky : undefined}
          style={{
            ...card,
            borderRadius: listingsSheet
              ? listingsExpanded
                ? "24px 24px 0 0"
                : 0
              : mobile
                ? 16
                : 20,
            padding: eventSoldOut
              ? 0
              : listingsSheet
                ? listingsExpanded
                  ? "0 16px calc(16px + env(safe-area-inset-bottom))"
                  : "12px 16px calc(12px + env(safe-area-inset-bottom))"
                : mobile
                  ? "16px 16px 20px"
                  : narrow
                    ? "14px 22px 26px"
                    : "0 32px 32px",
            minWidth: 0,
            ...(listingsSheet
              ? {
                  position: "fixed",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 18,
                  ...(listingsExpanded
                    ? {
                        top: listingsSheetTop,
                        height: "auto",
                        maxHeight: "none",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        boxShadow: "0 -20px 60px -20px rgba(5,27,53,0.5)",
                      }
                    : {
                        height: "auto",
                        boxShadow: "0 -8px 24px -12px rgba(5,27,53,0.25)",
                      }),
                }
              : {}),
            ...(narrow && !eventSoldOut && !listingsSheet
              ? {
                  flex: "1 1 0",
                  minHeight: TICKETING_LISTINGS_MIN_PX,
                  alignSelf: "stretch",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }
              : {}),
            ...(wide && !eventSoldOut
              ? {
                  position: "sticky",
                  top: stickTop,
                  alignSelf: "start",
                  zIndex: 5,
                  height: offersViewportMax,
                  maxHeight: offersViewportMax,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }
              : {}),
          }}
        >
          {eventSoldOut ? (
            !mobile ? eventSoldOutNotifyBar(false) : null
          ) : (
          <>
          {wide && (
            <div style={{ flexShrink: 0, background: "#fff", margin: "0 -32px", padding: "16px 32px 12px", borderRadius: "20px 20px 0 0", boxShadow: pinned ? "0 12px 24px -18px rgba(5,27,53,0.55)" : "none", transition: "box-shadow 180ms ease" }}>
              {filterToolbar}
            </div>
          )}
          {listingsSheet && !listingsExpanded && (
            <button
              type="button"
              className="nmt-primary"
              onClick={() => setListingsExpanded(true)}
              style={{ ...primaryBtn, width: "100%", fontSize: fluidSize(16), padding: "16px 24px" }}
            >
              Select tickets
            </button>
          )}
          {listingsSheet && listingsExpanded && (
            <div style={{ flexShrink: 0, background: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 10 }}>
                <div style={{ width: 40, height: 5, borderRadius: 999, background: "rgba(5,27,53,0.14)" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "8px 4px 12px" }}>
                <div style={{ fontSize: fluidSize(16), fontWeight: 600, letterSpacing: "-0.02em" }}>Select tickets</div>
                <button
                  type="button"
                  onClick={() => setListingsExpanded(false)}
                  aria-label="Close"
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
                    borderRadius: 999,
                    color: NAVY,
                    cursor: "pointer",
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
              {filterToolbar}
            </div>
          )}
          {(!listingsSheet || listingsExpanded) && (
          <div
            ref={listingsScroll}
            data-testid="ticketing-listings"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              marginTop: wide ? 18 : listingsSheet ? 14 : 0,
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overscrollBehavior: "contain",
            }}
          >
            {busy && (
              <div role="status" aria-label="Loading listings" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {Array.from({ length: skeletonRows }, (_, i) => (
                  <div key={i} aria-hidden style={{ display: "flex", alignItems: "center", gap: 18, background: "#fff", border: "1px solid rgba(5,27,53,0.10)", borderRadius: 16, padding: "16px 20px" }}>
                    <div style={{ width: thumbSize, height: thumbSize, borderRadius: 12, flexShrink: 0, ...shimmer }} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9, minWidth: 0 }}>
                      <div style={{ height: 24, width: 120, borderRadius: 999, ...shimmer }} />
                      <div style={{ height: 20, width: "58%", borderRadius: 8, ...shimmer }} />
                      <div style={{ height: 16, width: 128, borderRadius: 8, ...shimmer }} />
                    </div>
                    {!mobile && <div style={{ height: 22, width: 92, borderRadius: 8, flexShrink: 0, ...shimmer }} />}
                  </div>
                ))}
              </div>
            )}

            {!busy && rows.length === 0 && (() => {
              const noOfferInventory =
                zoneFilter.length > 0 &&
                !d.listings.some((l) => zoneFilter.includes(l.zone));
              const offerLabel =
                zoneFilter.length === 1
                  ? zoneFilter[0]
                  : zoneFilter.length > 1
                    ? "these offers"
                    : "";
              const title = noOfferInventory
                ? `No tickets for ${offerLabel}`
                : `No listings for ${want === 1 ? "1 ticket" : `${want} tickets`}`;
              const body = noOfferInventory
                ? zoneFilter.length === 1
                  ? "This offer doesn't have any inventory on sale right now. Try another section, or check back later."
                  : "None of the selected offers have inventory on sale right now. Try another section, or check back later."
                : "Nothing currently on sale fits this group size. Try a smaller quantity, or check back later.";
              return (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, padding: "56px 24px" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={{ width: 34, height: 34 }}><path d="M4 9V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4z" /><line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" /></svg>
                  <div style={{ fontSize: fluidSize(19), fontWeight: 600, letterSpacing: "-0.015em" }}>{title}</div>
                  <div style={{ fontSize: fluidSize(15), color: "#6e7180", maxWidth: 380 }}>{body}</div>
                  {!noOfferInventory && want > 1 ? (
                    <button className="nmt-primary" onClick={() => reload(quantityOptions[0] || 1)} style={{ ...primaryBtn, marginTop: 6, fontSize: fluidSize(15), padding: "13px 26px" }}>Reset quantity</button>
                  ) : null}
                </div>
              );
            })()}

            {!busy &&
              rows.map((l, idx) => (
                <div key={`${l.sec}-${l.row}-${idx}`} className="nmt-listing" onClick={() => { setSel(idx); setPanelQty(clampQuantity(want, listingQtyLimits(l))); setMedia(0); }} style={{ display: "flex", alignItems: mobile ? "flex-start" : "center", gap: mobile ? 10 : 18, background: "#fff", border: "1px solid rgba(5,27,53,0.10)", borderRadius: mobile ? 12 : 16, padding: mobile ? "10px 12px" : "16px 20px", cursor: "pointer" }}>
                  <div style={{ width: thumbSize, height: thumbSize, borderRadius: mobile ? 8 : 12, background: "#f1f3f8", border: "1px solid rgba(5,27,53,0.08)", flexShrink: 0, overflow: "hidden" }}>
                    {listingThumb(l)}
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: mobile ? 3 : 6, minWidth: 0 }}>
                    <span style={{ alignSelf: "flex-start", ...pill(ACC_SOFT, ACC), ...(mobile ? { fontSize: fluidSize(12), padding: "3px 8px" } : {}) }}><Star s={mobile ? 12 : 14} /> {l.zone}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: mobile ? 6 : 9, minWidth: 0, fontSize: fluidSize(18), fontWeight: 600, letterSpacing: "-0.015em" }}>
                      <span style={{ color: "#6e7180", flexShrink: 0, display: "flex", alignItems: "center" }}><TicketIcon s={mobile ? 14 : 18} /></span>
                      <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>Sec {l.sec} · Row {l.row}</span>
                    </div>
                    <div style={{ fontSize: fluidSize(15), color: "#6e7180" }}>{l.range}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
                    <div style={{ fontSize: fluidSize(20), fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.015em", whiteSpace: "nowrap" }}>{l.price} each</div>
                    <div style={{ fontSize: fluidSize(13), color: "#6e7180", marginTop: 2, whiteSpace: "nowrap" }}>{mobile ? "incl. fees" : "Incl. Taxes & Fees"}</div>
                  </div>
                </div>
              ))}
          </div>
          )}
          </>
          )}
        </section>
        )}

        {wide && !eventScheduled && !seatedSoldOut && (
          <aside
            data-testid="ticketing-map"
            style={{ display: "flex", flexDirection: "column", gap: 20, position: "sticky", top: stickTop, alignSelf: "start" }}
          >
            {findOnMapBtn(260, 20)}
            {trustCard}
          </aside>
        )}
        </>
        )}
      </main>
      )}

      {/* MAIN (GA / general-admission flow) */}
      {isGa && (
        <main style={{ flex: 1, width: "100%", maxWidth: 1320, margin: "0 auto", padding: mobile ? `14px 14px ${mobileStickyFooterReservePx()}` : "24px 32px 120px", boxSizing: "border-box", display: "grid", gridTemplateColumns: narrow ? "minmax(0, 1fr)" : "minmax(300px, 360px) minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
          {/* left: poster + info — pinned while the right column scrolls (desktop). */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0, ...(narrow ? {} : { position: "sticky", top: 92, alignSelf: "start" }) }}>
            <div
              data-testid="ga-event-poster"
              style={{
                ...card,
                borderRadius: 20,
                padding: narrow ? 12 : 16,
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <div
                data-testid="ga-event-poster-image"
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: narrow ? "16 / 9" : "1 / 1",
                  borderRadius: 14,
                  overflow: "hidden",
                  background: "#f1f3f8",
                  border: "1px solid rgba(5,27,53,0.08)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={POSTER} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
            </div>
            {compactTrustCard}
          </div>

          {/* right: title + tiers + about + who + venue */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            <div style={{ ...card, borderRadius: 20, padding: mobile ? 18 : 24, display: "flex", flexDirection: "column", gap: 12 }}>
              <h1 style={{ margin: 0, fontSize: fluidSize(42), fontWeight: 600, letterSpacing: "-0.035em", lineHeight: 1.08 }}>{d.eventName}</h1>
              <span style={{ alignSelf: "flex-start", fontSize: fluidSize(17), fontWeight: 600, color: ACC }}>{d.venueLine}</span>
              <div style={{ fontSize: fluidSize(16), color: "#4a5567" }}>{d.whenLong}</div>
            </div>

            {/* Sold-out GA uses the notify bar + sheet instead of the inline waitlist panel. */}
            {eventSoldOut ? (
              !mobile ? (
                <div style={{ ...card, borderRadius: 20, overflow: "hidden" }}>
                  {eventSoldOutNotifyBar(false)}
                </div>
              ) : null
            ) : gaScheduled ? (
              !mobile ? scheduledPanel(true) : null
            ) : !mobile ? (
              <div style={{ ...card, borderRadius: 20, padding: mobile ? 18 : 24, display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ fontSize: fluidSize(22), fontWeight: 600, letterSpacing: "-0.025em" }}>Get tickets</div>
                {gaTierCards}
                {holdError ? (
                  <div style={{ fontSize: fluidSize(13), color: "#b91c1c", lineHeight: 1.4 }}>{holdError}</div>
                ) : null}
              </div>
            ) : null}

            {d.aboutText ? (
              <div style={{ ...card, borderRadius: 20, padding: mobile ? 18 : 24, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ fontSize: fluidSize(12), fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a93a3" }}>About this event</div>
                <ExpandableDescription
                  text={d.aboutText}
                  mobile={mobile}
                  toggleColor={ACC}
                  style={{ fontSize: fluidSize(15), lineHeight: 1.6, color: "#4a5567" }}
                />
              </div>
            ) : null}

            {showMatchupSection ? (
            <div style={{ ...card, borderRadius: 20, padding: mobile ? 18 : 24, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: fluidSize(12), fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a93a3" }}>Who&rsquo;s playing</div>
              <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 999, background: "#f1f3f8", border: "1px solid rgba(5,27,53,0.08)", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box", overflow: "hidden" }}>
                    {d.homeLogoSrc || LOGO ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={d.homeLogoSrc || LOGO} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    ) : (
                      <span style={{ fontSize: fluidSize(13), fontWeight: 600, color: NAVY }}>{(d.homeLabel || "").slice(0, 3).toUpperCase()}</span>
                    )}
                  </div>
                  <div style={{ fontSize: fluidSize(15), fontWeight: 500 }}>{d.homeLabel}</div>
                </div>
                {showAwayTeam ? (
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 999, background: d.awayLogoSrc ? "#f1f3f8" : NAVY, border: d.awayLogoSrc ? "1px solid rgba(5,27,53,0.08)" : "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: fluidSize(13), fontWeight: 600, boxSizing: "border-box", overflow: "hidden" }}>
                    {d.awayLogoSrc ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={d.awayLogoSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    ) : (
                      d.awayShort
                    )}
                  </div>
                  <div style={{ fontSize: fluidSize(15), fontWeight: 500 }}>{d.awayLabel}</div>
                </div>
                ) : null}
              </div>
            </div>
            ) : null}

            <div style={{ ...card, borderRadius: 20, padding: mobile ? 18 : 24, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: fluidSize(12), fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a93a3" }}>Venue</div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ width: 148, height: 100, borderRadius: 12, overflow: "hidden", background: "#f1f3f8", border: "1px solid rgba(5,27,53,0.08)", flexShrink: 0 }}>
                  {d.venuePhotoSrc ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={d.venuePhotoSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  ) : null}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: fluidSize(19), fontWeight: 600, letterSpacing: "-0.02em" }}>{d.venueName}</div>
                  <div style={{ fontSize: fluidSize(14), color: "#6e7180" }}>{d.venueAddress}</div>
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(d.mapsQuery)}`} target="_blank" rel="noopener noreferrer" style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 9, fontSize: fluidSize(14), fontWeight: 600, color: NAVY, textDecoration: "none", background: "#fff", border: "1px solid #d3d6e0", borderRadius: 999, padding: "11px 18px" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                    Directions
                  </a>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* STICKY ON-SALE BAR (GA, mobile) */}
      {isGa && mobile && gaScheduled && scheduledStickyBar}

      {/* STICKY SOLD-OUT BAR (mobile, GA only — seated uses inline body card) */}
      {gaSoldOut && mobile && eventSoldOutNotifyBar(true)}

      {/* STICKY BUY BAR (GA, mobile) */}
      {isGa && mobile && !gaSoldOut && !gaScheduled && (
        <MobileStickyFooter
          accentColor={ACC}
          innerStyle={{ display: "flex", alignItems: "center", gap: 14 }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0, flexShrink: 0 }}>
            <div style={{ fontSize: fluidSize(12), color: "#6e7180" }}>From</div>
            <div style={{ fontSize: fluidSize(20), fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{money(gaFromNum)}</div>
          </div>
          <button className="nmt-primary" onClick={() => setGaSheet(true)} style={{ ...primaryBtn, marginLeft: "auto", flex: 1, maxWidth: 280, fontSize: fluidSize(16), padding: "16px 24px" }}>Buy tickets</button>
        </MobileStickyFooter>
      )}

      {/* GA TIER SHEET (mobile) */}
      {isGa && gaSheet && !gaSoldOut && !gaScheduled && (
        <div onClick={() => setGaSheet(false)} style={{ position: "fixed", inset: 0, zIndex: 55, background: "rgba(5,27,53,0.55)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, maxHeight: "88vh", background: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, boxShadow: "0 -20px 60px -20px rgba(5,27,53,0.5)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, flexShrink: 0 }}>
              <div style={{ width: 40, height: 5, borderRadius: 999, background: "rgba(5,27,53,0.14)" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 20px 16px", borderBottom: "1px solid rgba(5,27,53,0.08)", flexShrink: 0 }}>
              <div style={{ fontSize: fluidSize(20), fontWeight: 600, letterSpacing: "-0.025em" }}>Get tickets</div>
              <button onClick={() => setGaSheet(false)} aria-label="Close" style={{ fontFamily: "inherit", width: 40, height: 40, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", border: "1px solid #d3d6e0", borderRadius: 999, color: NAVY, cursor: "pointer" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
              {gaTierCards}
              {holdError ? (
                <div style={{ fontSize: fluidSize(13), color: "#b91c1c", lineHeight: 1.4 }}>{holdError}</div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* EVENT SOLD-OUT NOTIFY SHEET */}
      {eventSoldOut && eventSoldOutSheet && (!mobile || mounted) &&
        (() => {
          const overlay = (
        <div
          className="ga-soldout-notify-sheet-overlay"
          onClick={() => setEventSoldOutSheet(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 55,
            background: "rgba(5,27,53,0.55)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: mobile ? "flex-end" : "center",
            justifyContent: mobile ? "flex-start" : "center",
            padding: mobile ? 0 : 24,
            ...(mobile ? { width: "100vw", maxWidth: "100vw" } : {}),
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ga-soldout-sheet-title"
            className="ga-soldout-notify-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: mobile ? "none" : 480,
              maxHeight: mobile ? "88vh" : "min(88vh, 640px)",
              background: "#fff",
              borderRadius: mobile ? "24px 24px 0 0" : 24,
              boxShadow: "0 -20px 60px -20px rgba(5,27,53,0.5)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, flexShrink: 0 }}>
              <div style={{ width: 40, height: 5, borderRadius: 999, background: "rgba(5,27,53,0.14)" }} />
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "18px 20px calc(20px + env(safe-area-inset-bottom))" }}>
              {notified[d.eventName] || notifySent ? (
                <>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
                    <div
                      aria-hidden
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: ACC_SOFT,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }} aria-hidden>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        className="ga-soldout-notify-eyebrow"
                        style={{
                          fontWeight: 600,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: "#8a93a3",
                        }}
                      >
                        Alert set
                      </div>
                      <h2
                        id="ga-soldout-sheet-title"
                        className="text-[24px] font-semibold tracking-[-0.01em]"
                        style={{
                          margin: 0,
                          lineHeight: 1.25,
                          color: NAVY,
                        }}
                      >
                        You&rsquo;re on the list.
                      </h2>
                    </div>
                  </div>
                  <p className="ga-soldout-notify-desc" style={{ margin: "0 0 22px", lineHeight: 1.55, color: "#4a5567" }}>
                    We&rsquo;ll email{" "}
                    <strong style={{ fontWeight: 600, color: NAVY }}>{notifyEmail || "you"}</strong>{" "}
                    the moment a ticket is posted for this event.
                  </p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setNotified((current) => ({ ...current, [d.eventName]: false }));
                        setNotifySent(false);
                        setEventSoldOutSheet(false);
                      }}
                      style={{
                        fontFamily: "inherit",
                        flex: 1,
                        border: "1px solid #d3d6e0",
                        borderRadius: 999,
                        background: "#fff",
                        color: NAVY,
                        fontWeight: 600,
                        padding: "14px 18px",
                        cursor: "pointer",
                      }}
                      className="ga-soldout-notify-action"
                    >
                      Turn off
                    </button>
                    <Link
                      href="/browse/"
                      onClick={() => setEventSoldOutSheet(false)}
                      style={{
                        fontFamily: "inherit",
                        flex: 1,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "none",
                        borderRadius: 999,
                        background: ACC,
                        color: BTN_INK,
                        fontWeight: 600,
                        padding: "14px 18px",
                        textDecoration: "none",
                      }}
                      className="ga-soldout-notify-action"
                    >
                      Browse all events
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
                    <div
                      aria-hidden
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: ACC_SOFT,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <TicketIcon s={22} color={ACC} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        className="ga-soldout-notify-eyebrow"
                        style={{
                          fontWeight: 600,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: "#8a93a3",
                        }}
                      >
                        Sold out
                      </div>
                      <h2
                        id="ga-soldout-sheet-title"
                        className="text-[24px] font-semibold tracking-[-0.01em]"
                        style={{
                          margin: 0,
                          lineHeight: 1.25,
                          color: NAVY,
                        }}
                      >
                        Get the first email.
                      </h2>
                    </div>
                  </div>
                  <p className="ga-soldout-notify-desc" style={{ margin: "0 0 18px", lineHeight: 1.55, color: "#4a5567" }}>
                    Enter your email below to get notified in case a ticket becomes available.
                  </p>
                  <form
                    noValidate
                    onSubmit={(event) => {
                      event.preventDefault();
                      submitEventWaitlist(
                        submittedEmail(new FormData(event.currentTarget)),
                        () => setNotifySent(true),
                      );
                    }}
                    style={{ display: "flex", flexDirection: "column", gap: 14 }}
                  >
                    <EmailField
                      autoFocus
                      id="ga-soldout-email"
                      name="email"
                      label="Email address"
                      placeholder="you@example.com"
                      value={notifyEmail}
                      error={notifyEmailError}
                      onChange={(value) => {
                        setNotifyEmail(value);
                        setNotifyEmailError(null);
                      }}
                      onBlur={(value) =>
                        setNotifyEmailError(emailBlurInvalid(value) ? "invalid" : null)
                      }
                    />
                    <BrandedActionButton
                      type="submit"
                      primaryColor={ACC}
                      textColor={BTN_INK}
                      className="ga-soldout-notify-submit w-full"
                      style={{ padding: "16px 24px" }}
                    >
                      Notify me when tickets become available
                    </BrandedActionButton>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
          );
          return mobile && mounted
            ? (
              <ShopperBodyPortal accentColor={ACC}>
                {overlay}
              </ShopperBodyPortal>
            )
            : overlay;
        })()}

      {/* NOTIFY / WAITLIST MODAL */}
      {notifySubject && (() => {
        const t = notifySubject;
        const soldout = t.soldout;
        const title = soldout ? "Join the waitlist" : "Get notified when tickets go on sale";
        const body = soldout
          ? `${t.name} is sold out. If tickets are released back to inventory, waitlist members are contacted in order — one purchase window each, 30 minutes to complete.`
          : `${t.name} goes on sale ${t.onSaleAt || "soon"}. We will send a reminder one hour before, and a second the moment inventory opens.`;
        const confirm = soldout
          ? `You are on the waitlist for ${t.name}. We will email ${notifyEmail || "your account address"} if tickets are released.`
          : `Reminder set. We will email ${notifyEmail || "your account address"} before ${t.name} goes on sale.`;
        return (
          <Modal variant="light" title={title} onClose={() => setNotifySubject(null)}>
            <p className="mt-4 text-[14px] text-[#4a5567]">{body}</p>
            {!notifySent ? (
              <form
                noValidate
                className="mt-5 flex flex-col gap-3.5"
                onSubmit={(event) => {
                  event.preventDefault();
                  const next = submittedEmail(new FormData(event.currentTarget));
                  if (emailSubmitInvalid(next)) {
                    setNotifyEmailError(emailSubmitError(next));
                    return;
                  }
                  setNotifyEmail(next);
                  setNotifySent(true);
                  setNotified((m) => ({ ...m, [t.name]: true }));
                }}
              >
                <EmailField
                  autoFocus
                  id="notify-email"
                  name="email"
                  placeholder="you@example.com"
                  value={notifyEmail}
                  error={notifyEmailError}
                  onChange={(value) => {
                    setNotifyEmail(value);
                    setNotifyEmailError(null);
                  }}
                  onBlur={(value) =>
                    setNotifyEmailError(emailBlurInvalid(value) ? "invalid" : null)
                  }
                />
                <label className="flex cursor-pointer items-start gap-2.5 text-[14px] font-normal text-[#4a5567]">
                  <input
                    type="checkbox"
                    name="notifySms"
                    checked={notifySms}
                    onChange={() => setNotifySms((v) => !v)}
                    className="mt-0.5 h-[18px] w-[18px]"
                    style={{ accentColor: ACC }}
                  />
                  <span>Also text me at the number on my account</span>
                </label>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <BrandedActionButton
                    type="button"
                    tone="secondary"
                    onClick={() => setNotifySubject(null)}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </BrandedActionButton>
                  <BrandedActionButton
                    type="submit"
                    primaryColor={ACC}
                    textColor={BTN_INK}
                    className="w-full sm:w-auto"
                  >
                    {soldout ? "Join waitlist" : "Set reminder"}
                  </BrandedActionButton>
                </div>
              </form>
            ) : (
              <div className="mt-5 flex flex-col gap-4">
                <div className="flex items-center gap-3 rounded-[14px] border border-[rgba(127,190,77,0.35)] bg-[rgba(166,231,115,0.16)] px-4 py-3.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#3f6b1f" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0" aria-hidden>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <p className="text-[14px] text-[#3f6b1f]">{confirm}</p>
                </div>
                <BrandedActionButton
                  primaryColor={ACC}
                  textColor={BTN_INK}
                  onClick={() => setNotifySubject(null)}
                  className="w-full sm:ml-auto sm:w-auto"
                >
                  Done
                </BrandedActionButton>
              </div>
            )}
          </Modal>
        );
      })()}

      {/* provider pill — hidden under the seated mobile listings sheet */}
      {!listingsSheet && (
      <div style={{ position: "fixed", bottom: 20, left: 0, right: 0, zIndex: 14, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: NAVY, border: "1px solid rgba(158,182,216,0.14)", borderRadius: 999, padding: "10px 20px", boxShadow: "0 24px 60px -12px rgba(5,27,53,0.45)", maxWidth: "calc(100% - 32px)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/nmstate/blocktickets-lockup-white.svg" alt="blocktickets" style={{ height: 15, width: "auto", flexShrink: 0 }} />
          <span style={{ width: 1, height: 14, background: "rgba(158,182,216,0.3)", flexShrink: 0 }} />
          <span style={{ fontSize: fluidSize(12), fontWeight: 500, color: "#b8c6dc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.providerLabel}</span>
        </div>
      </div>
      )}

      {/* Same overlay as package: open immediately, org spinner until the map paints. */}
      {map && (
        <SeatMapSelectionOverlay
          title={d.eventName}
          accent={ACC}
          accentSoft={ACC_SOFT}
          buttonColor={BTN}
          buttonTextColor={BTN_INK}
          mobile={mobile}
          onClose={() => {
            setMap(false);
            resetMapState();
            setPicks([]);
          }}
          onCheckout={() => void startHoldFromMap()}
          checkoutLoading={holding}
          checkoutError=""
          mapBackground={mapBackground}
          mapMapping={mapMapping}
          venueSlug={d.venueSlug}
          preparing={!hasLiveSeatmap}
          orgName={d.orgLabel}
          logoSrc={d.brandLogoSrc || d.logoSrc}
        />
      )}


      {/* Confirm before discarding map selections */}
      {mapExitConfirm && (
        <Modal
          variant="light"
          title="Are you sure you want to exit?"
          onClose={() => setMapExitConfirm(false)}
        >
          <p className="mt-4 text-[15px] leading-relaxed text-[#4a5567]">
            You will lose your selected tickets....
          </p>
          <div className="mt-5 flex flex-col gap-3">
            <BrandedActionButton
              primaryColor={ACC}
              textColor={BTN_INK}
              onClick={confirmExitMap}
              className="w-full"
            >
              Exit anyway
            </BrandedActionButton>
            <BrandedActionButton
              tone="secondary"
              onClick={() => setMapExitConfirm(false)}
              className="w-full"
            >
              Cancel
            </BrandedActionButton>
          </div>
        </Modal>
      )}

      {/* TICKET DETAIL DRAWER */}
      {panelOpen && selRow && (
        <>
          <div onClick={() => setSel(null)} style={{ position: "fixed", inset: 0, zIndex: 20, background: "rgba(5,27,53,0.42)", backdropFilter: "blur(3px)" }} />
          <div style={{ position: "fixed", zIndex: 21, display: "flex", flexDirection: "column", background: "#fff", overflow: "hidden", boxShadow: "-30px 0 80px -20px rgba(5,27,53,0.45)", top: mobile ? "auto" : 0, right: 0, bottom: 0, left: "auto", width: mobile ? "100%" : 480, height: mobile ? "86vh" : "auto", maxWidth: "100%", borderRadius: mobile ? "24px 24px 0 0" : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid rgba(5,27,53,0.08)", flexShrink: 0 }}>
              <button onClick={() => setSel(null)} aria-label="Back" style={{ fontFamily: "inherit", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", border: "1px solid #d3d6e0", borderRadius: 12, color: NAVY, cursor: "pointer", flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <div style={{ flex: 1, textAlign: "center", fontSize: fluidSize(18), fontWeight: 600, letterSpacing: "-0.015em" }}>Ticket details</div>
              <div style={{ width: 44, flexShrink: 0 }} />
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              <div style={{ position: "relative", borderRadius: 16, background: "#f1f3f8", border: "1px solid rgba(5,27,53,0.08)", overflow: "hidden", height: 220 }}>
                {media === 0 ? (
                  <SectionLocatorThumb
                    background={mapBackground}
                    mapping={mapMapping}
                    sectionId={selRow.sectionId}
                    sectionNumber={selRow.sec}
                    section={selRow.sec}
                    pinColor={ACC}
                    thumbnailCandidates={venueImageCandidates(selRow.sec)}
                  />
                ) : (
                  <SeatViewImage
                    src={venueImage(selRow.sec, "seat-view")}
                    section={selRow.sec}
                  />
                )}
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(5,27,53,0.82)", color: "#fff", fontSize: fluidSize(12), fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", padding: "6px 14px", borderRadius: 999 }}>{media === 0 ? "Seat location" : "Seat view"}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: media === 0 ? ACC : "rgba(5,27,53,0.22)" }} />
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: media === 1 ? ACC : "rgba(5,27,53,0.22)" }} />
                  </span>
                </div>
                <button onClick={flip} aria-label="Previous view" style={{ fontFamily: "inherit", position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: 999, background: "#fff", border: "1px solid rgba(5,27,53,0.10)", color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 6px 18px -8px rgba(5,27,53,0.4)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                <button onClick={flip} aria-label="Next view" style={{ fontFamily: "inherit", position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: 999, background: "#fff", border: "1px solid rgba(5,27,53,0.10)", color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 6px 18px -8px rgba(5,27,53,0.4)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "18px 0 16px" }}>
                <span style={{ alignSelf: "flex-start", flexShrink: 0, ...pill(ACC_SOFT, ACC), ...(mobile ? { fontSize: fluidSize(14), padding: "5px 10px" } : {}) }}><Star s={14} /> {selRow.tier || selRow.zone}</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
                  <div style={{ fontSize: fluidSize(22), fontWeight: 600, letterSpacing: "-0.02em" }}>Sec {selRow.sec} · Row {selRow.row}</div>
                  <div style={{ fontSize: fluidSize(14), color: "#6e7180" }}>{listingDetailAvailabilityLabel(selRow.min, selRow.max, selRow.multipleOf)}</div>
                </div>
              </div>
              <div style={{ height: 1, background: "rgba(5,27,53,0.08)" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "18px 0" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 5, minWidth: 0, flexShrink: 1, whiteSpace: "nowrap" }}>
                  <span style={{ fontSize: fluidSize(22), fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>{selRow.price}</span>
                  <span style={{ fontSize: fluidSize(13), fontWeight: 600 }}>ea</span>
                  <span style={{ fontSize: fluidSize(12), color: "#6e7180" }}>incl. fees</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #d3d6e0", borderRadius: 999, padding: mobile ? "4px 6px" : "5px 8px", flexShrink: 0 }}>
                  <button
                    onClick={() => setPanelQty((q) => clampQuantity(q - Math.max(1, selRow.multipleOf || 1), listingQtyLimits(selRow)))}
                    aria-label="Fewer tickets"
                    disabled={panelQty <= selRow.min}
                    style={{ fontFamily: "inherit", width: mobile ? 40 : 36, height: mobile ? 40 : 36, borderRadius: 999, border: "none", background: "#f1f3f8", color: NAVY, fontSize: fluidSize(20), lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: panelQty <= selRow.min ? 0.4 : 1 }}
                  >−</button>
                  <span style={{ minWidth: mobile ? 82 : 74, textAlign: "center", fontSize: fluidSize(15), fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{panelQty === 1 ? "1 Ticket" : `${panelQty} Tickets`}</span>
                  <button
                    onClick={() => setPanelQty((q) => clampQuantity(q + Math.max(1, selRow.multipleOf || 1), listingQtyLimits(selRow)))}
                    aria-label="More tickets"
                    disabled={panelQty >= selRow.max}
                    style={{ fontFamily: "inherit", width: mobile ? 40 : 36, height: mobile ? 40 : 36, borderRadius: 999, border: "none", background: "#f1f3f8", color: NAVY, fontSize: fluidSize(20), lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: panelQty >= selRow.max ? 0.4 : 1 }}
                  >+</button>
                </div>
              </div>
              {panelOfferDescription ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 18 }}>
                  <div style={{ fontSize: fluidSize(12), fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a93a3" }}>About this ticket</div>
                  <ExpandableDescription
                    text={panelOfferDescription}
                    mobile={mobile}
                    toggleColor={ACC}
                    style={{
                      fontSize: fluidSize(14),
                      color: "#4a5567",
                      lineHeight: 1.6,
                    }}
                  />
                </div>
              ) : null}
              <div style={{ width: "100%", boxSizing: "border-box" }}>{compactTrustCard}</div>
            </div>
            <div style={{ flexShrink: 0, borderTop: "1px solid rgba(5,27,53,0.08)", padding: "18px 20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: fluidSize(16), fontWeight: 600, letterSpacing: "-0.01em" }}>Subtotal</span>
                  <span style={{ fontSize: fluidSize(14), color: "#6e7180" }}>{panelQty === 1 ? "1 Ticket" : `${panelQty} Tickets`}</span>
                </div>
                <span style={{ fontSize: fluidSize(28), fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.025em" }}>{money(unit * panelQty)}</span>
              </div>
              {holdError ? (
                <div style={{ fontSize: fluidSize(13), color: "#b91c1c", lineHeight: 1.4 }}>{holdError}</div>
              ) : null}
              <BrandedActionButton
                primaryColor={BTN}
                textColor={BTN_INK}
                loading={holding}
                loadingLabel="Holding seats…"
                onClick={() => void startHold()}
                className="w-full text-[16px]"
                style={{ ...checkoutBtnRow, padding: mobile ? 16 : 17, minHeight: 48 }}
              >
                Checkout
              </BrandedActionButton>
            </div>
          </div>
        </>
      )}

      {unlockZone !== null && (
        <Modal
          variant="light"
          title={isGa ? `${unlockZone} requires a code` : `${unlockZone} is locked`}
          onClose={() => setUnlockZone(null)}
        >
          <form
            noValidate
            className="mt-4 flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submitUnlockCode(formString(new FormData(e.currentTarget), "accessCode"));
            }}
          >
            <div
              className="flex h-[46px] w-[46px] items-center justify-center rounded-xl"
              style={{ background: ACC_SOFT, color: ACC }}
            >
              <LockIcon s={22} />
            </div>
            <p className="text-[14px] leading-relaxed text-[#6e7180]">
              Enter your access code to unlock {isGa ? "this offer" : "these seats"}.
            </p>
            <RedemptionCodeField
              name="accessCode"
              label="Access code"
              value={unlockInput}
              autoFocus
              placeholder="Access code"
              error={unlockFieldError}
              onChange={(value) => {
                setUnlockInput(value);
                setUnlockFieldError(null);
              }}
              onBlur={(value) =>
                setUnlockFieldError((current) =>
                  redemptionCodeBlurFieldError(current, value),
                )
              }
              inputClassName="tracking-[0.06em]"
            />
            <BrandedActionButton
              type="submit"
              primaryColor={ACC}
              textColor={BTN_INK}
              loading={unlocking}
              loadingLabel="Checking…"
              className="w-full text-[16px]"
            >
              <LockIcon s={16} /> {isGa ? "Unlock offer" : "Unlock seats"}
            </BrandedActionButton>
          </form>
        </Modal>
      )}

      {seatedError && !map ? (
        <Modal
          variant="light"
          title={seatedError.title}
          onClose={() => setSeatedError(null)}
        >
          <p className="mt-4 text-[15px] leading-relaxed text-[#4a5567]">
            {seatedError.message}
          </p>
          <BrandedActionButton
            primaryColor={BTN}
            textColor={BTN_INK}
            onClick={() => setSeatedError(null)}
            className="mt-6 w-full"
          >
            {seatedError.buttonText || "Close"}
          </BrandedActionButton>
        </Modal>
      ) : null}

      {info && (
        <Modal variant="light" sheet={mobile} title="Event information" onClose={() => setInfo(false)}>
          <div className={`mt-4 flex flex-col gap-[22px] ${mobile ? "" : "max-h-[min(70vh,640px)] overflow-y-auto"}`}>
            <div className="flex flex-col items-center gap-3.5 text-center">
              <div className="flex h-[132px] w-[132px] items-center justify-center overflow-hidden rounded-[22px] border border-[rgba(5,27,53,0.08)] bg-[#f1f3f8]">
                {d.homeLogoSrc || LOGO ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={d.homeLogoSrc || LOGO} alt={d.homeLabel} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[28px] font-semibold text-[#051b35]">{(d.homeLabel || "").slice(0, 3).toUpperCase()}</span>
                )}
              </div>
              <div className="text-[22px] font-semibold tracking-[-0.025em]">{d.eventName}</div>
              <div className="text-[15px] text-[#6e7180]">{d.doorsLine}</div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[rgba(5,27,53,0.08)] bg-[#f7f8fc] p-[18px]">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#8a93a3]">Venue</div>
                <div className="text-[17px] font-semibold tracking-[-0.015em]">{d.venueName}</div>
                <div className="text-[14px] text-[#6e7180]">{d.venueAddress}</div>
              </div>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(d.mapsQuery)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[#d3d6e0] bg-white px-[18px] py-[11px] text-[14px] font-semibold text-[#051b35] no-underline"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                Open in maps
              </a>
            </div>
            {showMatchupSection ? (
            <div className="flex flex-col gap-3.5 rounded-2xl border border-[rgba(5,27,53,0.08)] bg-[#f7f8fc] p-[18px]">
              <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#8a93a3]">Who&rsquo;s playing</div>
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-[42px] w-[42px] items-center justify-center overflow-hidden rounded-full border border-[rgba(5,27,53,0.08)] bg-white">
                    {d.homeLogoSrc || LOGO ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={d.homeLogoSrc || LOGO} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[14px] font-semibold text-[#051b35]">{(d.homeLabel || "").slice(0, 3).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="text-[15px] font-medium">{d.homeLabel}</div>
                </div>
                {showAwayTeam ? (
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-[42px] w-[42px] items-center justify-center overflow-hidden rounded-full text-[14px] font-semibold ${d.awayLogoSrc ? "border border-[rgba(5,27,53,0.08)] bg-white text-[#051b35]" : "bg-[#051b35] text-white"}`}>
                    {d.awayLogoSrc ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={d.awayLogoSrc} alt="" className="h-full w-full object-cover" />
                    ) : (
                      d.awayShort
                    )}
                  </div>
                  <div className="text-[15px] font-medium">{d.awayLabel}</div>
                </div>
                ) : null}
              </div>
              {d.aboutText ? (
                <>
                  <div className="h-px bg-[rgba(5,27,53,0.08)]" />
                  <div className="flex flex-col gap-2">
                    <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#8a93a3]">About this event</div>
                    <ExpandableDescription
                      text={d.aboutText}
                      mobile={mobile}
                      toggleColor={ACC}
                      className="leading-relaxed text-[#4a5567]"
                      style={{ fontSize: fluidSize(14) }}
                    />
                  </div>
                </>
              ) : null}
            </div>
            ) : d.aboutText ? (
              <div className="flex flex-col gap-2 rounded-2xl border border-[rgba(5,27,53,0.08)] bg-[#f7f8fc] p-[18px]">
                <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#8a93a3]">About this event</div>
                <ExpandableDescription
                  text={d.aboutText}
                  mobile={mobile}
                  toggleColor={ACC}
                  className="text-[14px] leading-relaxed text-[#4a5567]"
                />
              </div>
            ) : null}
          </div>
        </Modal>
      )}
    </div>
  );
}

/** Reference NM State content (the original design). */
export const NM_STATE_DATA: TicketingData = {
  accent: "#8c0b42",
  accentDark: "#6f0834",
  accentSoft: "#f7e8ee",
  eventName: "New Mexico State vs. New Mexico",
  whenLong: "Sat, Sep 26, 2026 6:00 PM · Doors 5:00 PM",
  whenShort: "Sat, Sep 26, 2026 · Doors 5:00 PM",
  whenPlain: "Sat, Sep 26, 2026 6:00 PM",
  doorsLine: "Sat, Sep 26, 2026 6:00 PM · Doors 5:00 PM",
  venueName: "Aggie Memorial Stadium",
  venueLine: "Aggie Memorial Stadium, Las Cruces, NM",
  venueAddress: "1810 E University Ave, Las Cruces, NM 88003",
  venueCityState: "Las Cruces, NM",
  mapsQuery: "Aggie Memorial Stadium Las Cruces NM",
  logoSrc: "/nmstate/nmstate-logo-nowordmark.png",
  orgLabel: "New Mexico State Athletics",
  providerLabel: "Official ticketing marketplace for New Mexico State venues",
  aboutText:
    "The Aggies host the Lobos for the 111th Rio Grande Rivalry under the lights at Aggie Memorial Stadium. Gates open 60 minutes before kickoff with the Pride of New Mexico band pregame show on the north plaza, and the first 5,000 fans through the gates receive a commemorative rally towel.",
  homeLabel: "New Mexico State",
  awayLabel: "New Mexico",
  awayShort: "UNM",
  showMatchupSection: true,
  showAwayTeam: true,
  listings: [
    { zone: "Sections A–B", tier: "Premium chairback", sec: "A", row: "12", min: 1, max: 4, price: "$46.00" },
    { zone: "Sections A–B", tier: "Premium chairback", sec: "B", row: "3", min: 2, max: 6, price: "$44.00" },
    { zone: "Sections C–I", tier: "Reserved sideline", sec: "F", row: "4", min: 1, max: 8, price: "$32.50" },
    { zone: "Sections C–I", tier: "Reserved sideline", sec: "H", row: "19", min: 1, max: 2, price: "$28.00" },
    { zone: "Sections J–L", tier: "Reserved endzone", sec: "K", row: "22", min: 2, max: 6, price: "$21.75" },
    { zone: "Sections M–N & GA", tier: "General admission", sec: "N", row: "I", min: 1, max: 8, price: "$13.16" },
    { zone: "Sections M–N & GA", tier: "General admission", sec: "N", row: "M", min: 1, max: 6, price: "$13.16" },
  ],
};
