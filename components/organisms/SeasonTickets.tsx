"use client";

import { browseLeading } from "@/lib/browseType";
import {
  fluidSize,
  shopperPageTypeCss,
} from "@/lib/shopperFluidType";

/**
 * SeasonTickets — NM State season-ticket-holder portal, ported from the
 * Claude Design "My Tickets.dc.html" handoff. A self-contained, dummy-data
 * flow (no backend): login → code → My Tickets → event detail → flex package
 * → transfers → giving → profile, plus transfer wizard / details / field-edit
 * / vouchers / cancel modals. Blocktickets chrome; event copy stays as-is.
 *
 * Team-specific wedge/banner art isn't in the repo, so rows fall back to the
 * designed initials-on-brand-color wedge (exactly the design's own fallback).
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import EntryQrSheet from "@/components/molecules/EntryQrSheet";
import MobileStickyFooter from "@/components/molecules/MobileStickyFooter";
import WalletChrome from "@/components/organisms/WalletChrome";
import {
  WalletTicketsBlocksLoading,
} from "@/components/organisms/WalletTicketsLoader";
import { BLOCKTICKETS_GREEN, BLOCKTICKETS_NAVY } from "@/lib/branding";
import { lockPageScroll, unlockPageScroll } from "@/lib/pageScroll";
import EmailField from "@/components/molecules/EmailField";
import SeasonTicketsBadge from "@/components/molecules/SeasonTicketsBadge";
import useAutoFocus from "@/hooks/useAutoFocus";
import {
  emailBlurInvalid,
  FIELD_COPY,
  normalizeEmail,
  submittedEmail,
  type EmailFieldError,
} from "@/lib/fieldValidation";
import { validateSubmittedEmail } from "@/lib/submitEmailValidation";
import {
  ACCEPT_TRANSFER_API_ERROR_MESSAGES,
  isAcceptTransferAlreadyClaimedStatus,
  parseAcceptTransferApiError,
  parseAcceptTransferApiResponse,
} from "@/lib/acceptTransferErrors";
import {
  CANCEL_TRANSFER_API_ERROR_MESSAGES,
  isCancelTransferAlreadyClaimedStatus,
  parseCancelTransferApiError,
  parseCancelTransferApiResponse,
} from "@/lib/cancelTransferErrors";
import {
  PASS_TRANSFER_DISPLAY_COPY,
  parsePassTransferApiError,
} from "@/lib/passTransferErrors";
import {
  parseTicketTransferApiError,
  ticketTransferAssignedCopy,
} from "@/lib/ticketTransferErrors";
import {
  transferConfirmTitle,
  transferLoadingTitle,
  transferRecipientNotifyCopy,
  transferSuccessBody,
  transferSuccessTitle,
  transferAcceptConfirmCopy,
  transferCancelReturnCopy,
  transferKindFromWalletRow,
  transferModalDetailLines,
  transferWalletRemovalCopy,
  type TransferModalKind,
} from "@/lib/transferModalCopy";
import {
  acceptIncomingTransfers,
  cancelMyTransfers,
  createTicketTransfer,
  getAccessPassesByOrder,
  getMyAccessPass,
  getMyAccessPasses,
  getMyEvents,
  getIncomingTransfers,
  invalidateMyEventsCache,
  getMyListings,
  getMyReceivedTransfers,
  getMySentTransfers,
  getOrder,
} from "@/lib/api";
import { getSession } from "@/lib/auth";
import { imageUrl, isRequestCanceled } from "@/lib/helpers";
import {
  applyAcceptedIncomingPassTransferToOrders,
  buildFlexPackSummaries,
  buildSeasonPackageSummaries,
  formatPackageRemainingTicketsLabel,
  buildWalletEventDetails,
  mergeWalletOrdersPreservingLocalTickets,
  seasonPassHasTicketTransfers,
  removeTicketsFromWalletDetails,
  removeTicketsFromWalletOrders,
  restoreCancelledTransferTicketsToOrders,
  summarizeEventDetails,
  summarizeIncomingAccessPassTransfers,
  summarizeIncomingPassPackageTransfers,
  summarizeUpcomingWalletEvents,
  ticketIdsForPassSeat,
  walletEventAvailabilityBadge,
  type PendingReceivedTransfer,
  type PendingSentTransfer,
  augmentPackageEventCountLookup,
  formatCartOrderTotal,
  formatSeasonPassHolderName,
  orderAcquiredLabel,
  ticketEntryLine,
  walletAccessPassPath,
  walletEventScheduleLine,
  walletEventTicketsPath,
  walletFlexPackPath,
  walletPackageEventPath,
  walletPackagePath,
  walletRouteFromPath,
  withFullOrder,
  type AttractionCard,
  type CartEventDetail,
  type CartEventSummary,
  type FlexPackSummary,
  type SeasonPackageSummary,
} from "@/lib/cartEvents";
import {
  applyPersistedCancelRestores,
  filterPersistedCancelledSentTransfers,
  persistCancelledTransferRestore,
  prunePersistedCancelRestores,
  prunePersistedCancelledSentTransfers,
} from "@/lib/walletCancelPersistence";
import {
  buildPackageEventCountLookup,
  buildPackageEventCountLookupFromTransfers,
  buildPassTransferOrderSnapshot,
  mergePackageEventCountLookups,
  buildWalletReceivedTransferRows,
  buildWalletSentTransferRows,
  filterActiveTransferRecords,
  clearLocallyResolvedIncomingTransfersForTests,
  filterIncomingTransfersForWallet,
  filterVisibleWalletTransferRows,
  markIncomingTransferLocallyResolved,
  filterAccessPassSummariesBySentTransfers,
  filterWalletAccessPassesBySentTransfers,
  formatAccessPassRemainingLine,
  isAccessPassHiddenBySentTransfers,
  mergeWalletAccessPassesPreservingLocal,
  mergeWalletReceivedTransferRecords,
  appendLocalSentTransferStubs,
  mergeWalletSentTransferRecords,
  mergeWalletTransferRows,
  mergeUniquePackageEvents,
  findSentTransferRecordForCancel,
  isPassTransferRowPresentation,
  isOptimisticWalletTransferId,
  isWalletOrderIdForAccessPassFetch,
  promoteAcceptedIncomingTransferToReceived,
  resolveAcceptedPassTransferWalletOrderId,
  resolveTransferOrderPackage,
  incomingAccessPassSummaryFromTransfer,
  unwrapAcceptTransferAccessPass,
  walletOrdersIncludeAcceptedPassPackage,
  removeSentTransferRecordsForCancel,
  resolveCancelTransferIdForApi,
  resolveCancelTransferIdWithSentLookup,
  resolveCreatedTransferMeta,
  transferPartyDateLine,
  unwrapTransferRecords,
  type TransferLike,
  type WalletTransferRow,
} from "@/lib/ticketTransfers";
import {
  buildAccessPassSummaries,
  mergeAccessPassSummaries,
  sortAccessPassSummaries,
  eventWhenLabel,
  isPhoneDevice,
  isScannedTicket,
  isUpcomingEvent,
  groupedWalletSeatLines,
  transferGroupLabel,
  transferSeatChip,
  ticketRowValue,
  ticketSeatValue,
  ticketSectionValue,
  unwrapList,
  unwrapAccessPassList,
  unwrapOrder,
  type AccessPassLike,
  type AccessPassSummary,
  type OrderLike,
  type TicketLike,
} from "@/lib/wallet";
import {
  addAccessPassToPhoneWallet,
  addTicketToPhoneWallet,
  phoneWalletKind,
  phoneWalletLabel,
  phoneWalletTheme,
  type PhoneWalletKind,
} from "@/lib/phoneWallet";
import {
  WALLET_NAV,
  walletSectionFromPath,
  walletSectionHref,
} from "@/lib/walletNav";
import { notifyWalletShellReady } from "@/lib/routeTransition";
import { isWalletNavigationPending } from "@/lib/walletTransition";
import { useWalletNavigationPending } from "@/hooks/useWalletNavigationPending";
import { Ticket } from "@/components/atoms/icons";
import { ButtonBusyContents } from "@/components/atoms/BrandedActionButton";
import { printedTicketHolderName, printTicketsPdf } from "@/lib/ticketPdf";
import {
  formatPrintedOfferLine,
  printedOfferBadgeName,
} from "@/lib/printedOfferLabel";
import { mobileStickyFooterReservePx } from "@/lib/mobileStickyFooter";
import { googleMapsDirectionsUrl } from "@/lib/venueLocation";

/* ---- brand tokens ---- */
const CRIMSON = "#8c0b42";
const ACCENT = BLOCKTICKETS_GREEN;
const INK = BLOCKTICKETS_NAVY;
const SUB = "#6e7180";
const MUTE = "#8a93a3";
const FAINT = "#4a5567";
const FIELD = "#f7f8fc";
const LINE = "rgba(5,27,53,0.10)";
const GREEN = "#2f8f4e";
const GREEN_BG = "#e7f5ec";
const DANGER = "#c2394a";
const SOFT = "#ecf8dd";
const LOGO = "/nmstate/nmstate-logo-nowordmark.png";
const CODE_BOXES = [0, 1, 2, 3, 4, 5];
const SEATMAP_THUMB = "/nmstate/seatmap-thumb.svg";
const PACKAGE_PASS_ATTEMPTS = 2;
const PACKAGE_PASS_RETRY_MS = 600;
const PASS_PHONE_QR_HINT =
  "Tap the QR code to scan at entry for any included event or add this pass to your Apple/Google wallet.";

const card: React.CSSProperties = {
  background: "#fff",
  border: `1px solid ${LINE}`,
  borderRadius: 20,
  boxShadow: "0 1px 2px rgba(5,27,53,0.05), 0 10px 24px -14px rgba(5,27,53,0.34)",
};
const walletEmptyState: React.CSSProperties = {
  ...card,
  borderRadius: 20,
  padding: "28px 22px",
  textAlign: "center",
};
const eyebrow: React.CSSProperties = {
  fontSize: fluidSize(10), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", lineHeight: 1.5, color: MUTE,
};

function EventScheduleMeta({
  today,
  scheduleLine,
}: {
  today: boolean;
  scheduleLine: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: fluidSize(12),
        fontWeight: 600,
        lineHeight: 1.5,
        color: today ? INK : SUB,
      }}
    >
      {today ? (
        <span
          style={{
            fontSize: fluidSize(11),
            fontWeight: 600,
            lineHeight: 1.5,
            textTransform: "uppercase",
            letterSpacing: "0.10em",
            color: INK,
            background: ACCENT,
            borderRadius: 999,
            padding: "4px 10px",
          }}
        >
          Today
        </span>
      ) : (
        <span
          style={{ width: 5, height: 5, borderRadius: 999, background: SUB }}
        />
      )}
      {scheduleLine}
    </div>
  );
}

type Game = { id: string; opp: string; date: string; dayMon: string; dayNum: string; time: string; doors: string; rec: string; brand: string; initials: string; blurb: string };

const SCHEDULE: Game[] = [
  { id: "mercyhurst", opp: "Mercyhurst", date: "Sat, Sep 5", dayMon: "Sep", dayNum: "05", time: "9:00 PM", doors: "7:30 PM", rec: "2-2 (1-1 NEC)", brand: "#0d3b2e", initials: "MERCYHURST", blurb: "Season opener under the lights at Aggie Memorial. Gates open 60 minutes before kickoff, clear-bag policy in effect, and season-ticket parking is included in Lot 5." },
  { id: "lobos", opp: "New Mexico", date: "Sat, Sep 26", dayMon: "Sep", dayNum: "26", time: "3:30 PM", doors: "2:00 PM", rec: "3-2 (1-1 MW)", brand: "#6d040e", initials: "LOBOS", blurb: "The Rio Grande Rivalry — the oldest series in the Southwest and the one that decides the Silver Spade. Expect a full house; arrive early, Lot 5 fills by 2:00 PM." },
  { id: "wku", opp: "Western Kentucky", date: "Thu, Oct 1", dayMon: "Oct", dayNum: "01", time: "8:00 PM", doors: "6:30 PM", rec: "4-1 (2-0 CUSA)", brand: "#80050e", initials: "WKU", blurb: "Conference USA opener against the reigning division champs. Homecoming week: alumni tailgate opens in Lot 5 four hours before kickoff." },
  { id: "jax", opp: "Jax State", date: "Wed, Oct 28", dayMon: "Oct", dayNum: "28", time: "8:00 PM", doors: "6:30 PM", rec: "3-2 (1-1 CUSA)", brand: "#850000", initials: "JAX STATE", blurb: "Midweek CUSA showdown on national TV. Kickoff is 8:00 PM MT — gates open at 6:30 and the student section is expected at capacity." },
  { id: "liberty", opp: "Liberty", date: "Sat, Nov 7", dayMon: "Nov", dayNum: "07", time: "5:00 PM", doors: "3:30 PM", rec: "5-0 (2-0 CUSA)", brand: "#030b17", initials: "LIBERTY", blurb: "Undefeated Liberty comes to Las Cruces in the game that likely decides the conference title race. Blackout: wear crimson." },
  { id: "delaware", opp: "Delaware", date: "Sat, Nov 21", dayMon: "Nov", dayNum: "21", time: "3:00 PM", doors: "1:30 PM", rec: "3-3 (1-2 CUSA)", brand: "#00194b", initials: "DELAWARE", blurb: "Senior Day and the season finale. The 2026 class is honored on the field 30 minutes before kickoff — season-ticket holders are invited down at 2:15 PM." },
];

/** Opponent banner art (public/teams) keyed by game id. Falls back to the initials wedge. */
const BANNER: Record<string, string> = {
  mercyhurst: "/teams/mercyhurst.png",
  lobos: "/teams/new-mexico-lobos.png",
  wku: "/teams/wku-hilltoppers.png",
  jax: "/teams/jax-state.png",
  liberty: "/teams/liberty-flames.png",
  delaware: "/teams/delaware-blue-hens.png",
};

/** Opponent banner filling a panel, with a graceful fallback to the initials text. */
function TeamPanelArt({ src, initials, fontSize }: { src?: string; initials: string; fontSize: number }) {
  const [err, setErr] = useState(false);
  if (src && !err) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={initials} onError={() => setErr(true)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
    );
  }
  return <span style={{ position: "relative", fontSize, fontWeight: 600, letterSpacing: "0.06em", color: "rgba(255,255,255,0.94)", whiteSpace: "nowrap" }}>{initials}</span>;
}

/** Full matchup hero art (public/matchups) keyed by game id. */
const MATCHUP: Record<string, string> = {
  mercyhurst: "/matchups/nmsu-vs-mercyhurst.png",
  lobos: "/matchups/nmsu-vs-new-mexico.png",
  wku: "/matchups/nmsu-vs-wku.png",
  jax: "/matchups/nmsu-vs-jax-state.png",
  liberty: "/matchups/nmsu-vs-liberty.png",
  delaware: "/matchups/nmsu-vs-delaware.png",
};

/** Square team-logo cards (public/teams). Home is NM State; opponents keyed by game id. */
const HOME_CARD = "/teams/nm-state-aggies-card.png";
const CARD: Record<string, string> = {
  mercyhurst: "/teams/mercyhurst-card.png",
  lobos: "/teams/new-mexico-lobos-card.png",
  wku: "/teams/wku-hilltoppers-card.png",
  jax: "/teams/jax-state-card.png",
  liberty: "/teams/liberty-flames-card.png",
  delaware: "/teams/delaware-blue-hens-card.png",
};

/** Square logo tile that cover-fits the team card, falling back to the initials wedge. */
function LogoTile({ logo, brand, initials, size, big }: { logo?: string; brand: string; initials: string; size: number; big?: boolean }) {
  const [err, setErr] = useState(false);
  return (
    <div style={{ width: size, height: size, borderRadius: 14, background: brand, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
      {logo && !err ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt={initials} onError={() => setErr(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span style={{ fontSize: big ? fluidSize(13) : fluidSize(11), fontWeight: 600, letterSpacing: "0.04em", color: "rgba(255,255,255,0.94)", textAlign: "center", padding: 4, lineHeight: 1.1 }}>{initials}</span>
      )}
    </div>
  );
}

/** Single-attraction poster — cover-fill, centered, brand color behind. */
function PosterHero({
  src,
  alt,
  bg,
  radius,
}: {
  src: string;
  alt: string;
  bg: string;
  radius?: number;
}) {
  const [err, setErr] = useState(false);
  if (err) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        borderRadius: radius,
        backgroundColor: bg,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onError={() => setErr(true)}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          height: "100%",
          width: "auto",
          maxWidth: "none",
          objectFit: "cover",
          objectPosition: "center",
        }}
      />
    </div>
  );
}

/** Wide matchup banner; falls back to a brand gradient + text. */
function MatchupHero({
  src,
  brand,
  oppBrand,
  text,
  textSize,
  radius,
  fit = "cover",
}: {
  src?: string;
  brand: string;
  oppBrand: string;
  text: string;
  textSize: number;
  radius?: number;
  fit?: "cover" | "contain";
}) {
  const [err, setErr] = useState(false);
  if (src && !err) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={text}
        onError={() => setErr(true)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: fit,
          objectPosition: "center",
          borderRadius: radius,
        }}
      />
    );
  }
  return (
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(120deg, ${brand} 0%, ${oppBrand} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: radius }}>
      <span style={{ fontSize: textSize, fontWeight: 700, letterSpacing: "0.04em", color: "rgba(255,255,255,0.92)" }}>{text}</span>
    </div>
  );
}

/** Jersey mesh overlay on brand-color panels. */
function meshPanelStyle(brand: string): React.CSSProperties {
  return {
    backgroundColor: brand,
    backgroundImage: [
      "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.24) 1px, transparent 0)",
      "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)",
    ].join(", "),
    backgroundSize: "9px 9px",
    backgroundPosition: "0 0, 4px 4px",
  };
}

function splitHeroLogoAnchor(panel: "left" | "right") {
  return {
    x: panel === "right" ? "77%" : "23%",
    y: "56%",
  };
}

/** Place text marks away from the diagonal overlap between panels. */
function splitHeroMarkAnchor(panel: "left" | "right") {
  return {
    x: panel === "right" ? "84%" : "16%",
    y: "56%",
  };
}

function splitHeroPlaceholderMark(side: AttractionCard) {
  if (side.initials.trim()) return side.initials.trim();
  if (side.role === "Visitor") return "AWA";
  return side.name.slice(0, 3).toUpperCase() || "AWA";
}

function resolveImageSrc(src: string) {
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  const path = src.startsWith("/") ? src : `/${src}`;
  if (typeof window !== "undefined") return `${window.location.origin}${path}`;
  return path;
}

const jerseyPanelFillCache = new Map<string, string>();

/** @internal Test hook — clears cached jersey panel fills between cases. */
export function clearJerseyPanelFillCacheForTests() {
  jerseyPanelFillCache.clear();
}

async function fetchJerseyPanelFill(
  src: string,
  fallback: string,
): Promise<string> {
    const absolute = resolveImageSrc(src);
  const cached = jerseyPanelFillCache.get(absolute);
  if (cached) return cached;

  try {
    const res = await fetch(
      `/api/dominant-color/?src=${encodeURIComponent(absolute)}&mode=jersey`,
    );
    const color = res.ok
      ? ((await res.json()) as { color?: string }).color || fallback
      : fallback;
    jerseyPanelFillCache.set(absolute, color);
    return color;
  } catch {
    jerseyPanelFillCache.set(absolute, fallback);
    return fallback;
  }
}

function usesSplitAttractionHero(
  showMatchupCards: boolean,
  cards: AttractionCard[],
  ev: { id: string; isCart?: boolean },
) {
  if (!showMatchupCards || !cards[0] || !cards[1]) return false;
  if (!ev.isCart && MATCHUP[ev.id]) return false;
  return true;
}

function splitAttractionHeroKey(
  evId: string,
  cards: AttractionCard[],
  ev: { id: string; isCart?: boolean },
) {
  if (!usesSplitAttractionHero(cards.length >= 2, cards, ev)) return "";
  return [
    evId,
    cards[0]?.logo || "",
    cards[1]?.logo || "",
    ev.isCart ? "cart" : "event",
  ].join("|");
}

async function prefetchSplitAttractionHeroPanels(cards: AttractionCard[]) {
  await Promise.all(
    cards
      .filter((side) => side.logo)
      .map((side) => fetchJerseyPanelFill(side.logo!, side.brand)),
  );
}

function SplitHeroPanel({
  side,
  panel,
  logoSize,
  zIndex,
  clipPath,
  dropShadow,
}: {
  side: AttractionCard;
  panel: "left" | "right";
  logoSize: number;
  zIndex: number;
  clipPath: string;
  dropShadow?: boolean;
}) {
  const anchor = splitHeroLogoAnchor(panel);
  const markAnchor = splitHeroMarkAnchor(panel);
  const placeholderMark = splitHeroPlaceholderMark(side);
  const markSize = Math.max(34, Math.round(logoSize * 0.42));
  const [panelColor, setPanelColor] = useState(side.brand);

  useEffect(() => {
    if (!side.logo) {
      setPanelColor(side.brand);
      return;
    }
    let cancelled = false;
    fetchJerseyPanelFill(side.logo, side.brand).then((color) => {
      if (!cancelled) setPanelColor(color);
    });
    return () => {
      cancelled = true;
    };
  }, [side.brand, side.logo]);

  return (
    <div
      aria-hidden={panel === "right"}
      style={{
        position: "absolute",
        inset: 0,
        zIndex,
        clipPath,
        overflow: "hidden",
        filter: dropShadow ? "drop-shadow(3px 0 8px rgba(0,0,0,0.35))" : undefined,
      }}
    >
      {side.logo ? (
        <>
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              ...meshPanelStyle(panelColor),
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={side.logo}
            alt={side.name}
            style={{
              position: "absolute",
              top: anchor.y,
              left: anchor.x,
              transform: "translate(-50%, -50%)",
              objectFit: "cover",
              objectPosition: "center",
            }}
          />
        </>
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            ...meshPanelStyle(side.brand),
          }}
        >
          <span
            style={{
              position: "absolute",
              top: markAnchor.y,
              left: markAnchor.x,
              transform: "translate(-50%, -50%)",
              fontSize: markSize,
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "rgba(255,255,255,0.94)",
              textAlign: "center",
              lineHeight: 1,
              textShadow: "0 2px 12px rgba(0,0,0,0.4)",
            }}
          >
            {placeholderMark}
          </span>
        </div>
      )}
    </div>
  );
}

/** Diagonal split hero — home (left) vs visitor (right), with logos from attractions. */
function SplitAttractionHero({
  home,
  away,
  radius,
  logoSize = 88,
}: {
  home: AttractionCard;
  away: AttractionCard;
  radius?: number;
  logoSize?: number;
}) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: radius, background: "#06203c" }}>
      <SplitHeroPanel
        side={away}
        panel="right"
        logoSize={logoSize}
        zIndex={1}
        clipPath="polygon(58% 0, 100% 0, 100% 100%, 42% 100%)"
      />
      <SplitHeroPanel
        side={home}
        panel="left"
        logoSize={logoSize}
        zIndex={2}
        clipPath="polygon(0 0, 58% 0, 42% 100%, 0 100%)"
        dropShadow
      />
      {/* Diagonal seam highlight */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 3,
          pointerEvents: "none",
          background:
            "linear-gradient(118deg, transparent 49.35%, rgba(255,255,255,0.92) 49.85%, rgba(255,255,255,0.92) 50.15%, transparent 50.65%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 4,
          width: 48,
          height: 48,
          borderRadius: 999,
          background: "#14161c",
          border: "2px solid rgba(255,255,255,0.92)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: fluidSize(14),
          fontWeight: 700,
          color: "#fff",
          letterSpacing: "0.04em",
          textTransform: "lowercase",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        }}
      >
        vs
      </div>
    </div>
  );
}

type EventT = {
  title: string; when: string; whenDate?: string; doors: string; venue: string; city: string; address: string;
  id: string; brand: string; initials: string; blurb: string; rec: string; opp: string;
  teams: { name: string; role: string; rec: string; initials: string; brand: string; logo?: string }[];
  tickets: { id?: number | string; seat: string; holder: string; code: string; raw?: Record<string, unknown> }[];
  attractions?: AttractionCard[];
  heroImage?: string;
  posterSrc?: string;
  ticketLabel?: string;
  packageName?: string;
  isCart?: boolean;
  orderId?: string;
  purchasedAt?: string;
  cartId?: string;
  cartTotal?: number;
  orderRecordId?: number | string;
  eventUUID?: string;
  event?: CartEventDetail["event"];
  transfersEnabled?: boolean;
  resaleEnabled?: boolean;
  pendingIncomingTransfer?: boolean;
  incomingTransferId?: string | number;
  incomingTransferFrom?: string;
  incomingTransferOn?: string;
};

function detailToEventT(d: CartEventDetail, isCart = false): EventT {
  return {
    id: d.key,
    title: d.title,
    when: d.when,
    whenDate: d.whenDate,
    doors: d.doors,
    venue: d.venue,
    city: d.city,
    address: d.address,
    brand: d.brand,
    initials: d.initials,
    blurb: d.blurb,
    rec: "",
    opp: d.opp,
    teams: d.teams,
    tickets: d.tickets,
    attractions: d.attractions,
    heroImage: d.heroImage,
    posterSrc: d.posterSrc,
    ticketLabel: d.ticketLabel,
    packageName: d.packageName,
    isCart,
    orderId: d.orderId,
    purchasedAt: d.purchasedAt,
    cartId: d.cartId,
    cartTotal: d.cartTotal,
    orderRecordId: d.orderRecordId,
    eventUUID: d.eventUUID,
    event: d.event,
    transfersEnabled: d.transfersEnabled,
    resaleEnabled: d.resaleEnabled,
    pendingIncomingTransfer: d.pendingIncomingTransfer,
    incomingTransferId: d.incomingTransferId,
    incomingTransferFrom: d.incomingTransferFrom,
    incomingTransferOn: d.incomingTransferOn,
  };
}

function buildEvents(): Record<string, EventT> {
  const map: Record<string, EventT> = {};
  SCHEDULE.forEach((g) => {
    map[g.id] = {
      title: "New Mexico State vs. " + g.opp,
      when: g.id === "mercyhurst" ? "Tonight · " + g.time : g.date + " · " + g.time,
      doors: g.doors, venue: "Aggie Memorial Stadium", city: "Las Cruces, NM",
      address: "1400 E University Ave, Las Cruces, NM 88003",
      id: g.id, brand: g.brand, initials: g.initials, blurb: g.blurb, rec: g.rec, opp: g.opp,
      teams: [
        { name: "New Mexico State", role: "Home", rec: "4-1 (2-0 CUSA)", initials: "NMSU", brand: CRIMSON, logo: HOME_CARD },
        { name: g.opp, role: "Visitor", rec: g.rec, initials: g.initials, brand: g.brand, logo: CARD[g.id] },
      ],
      tickets: [
        { seat: "Sec G · Row 25 · Seat 22", holder: "harrison.cogan", code: "BT-" + g.id.toUpperCase() + "-440197-2210" },
        { seat: "Sec G · Row 25 · Seat 23", holder: "harrison.cogan", code: "BT-" + g.id.toUpperCase() + "-440197-2211" },
      ],
    };
  });
  return map;
}

/**
 * The event screen reflows from the real viewport rather than a measured width,
 * so a narrow desktop window stacks to one column even before (or without) a
 * width measurement — the sidebar cards drop under the tickets instead of
 * squeezing the event beside them.
 */
const EVENT_CSS = `
.st-ev{padding:40px 32px 96px}
.st-ev-hero{aspect-ratio:3.4 / 1}
.st-ev-grid{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:40px;align-items:start}
.st-ev-aside{min-width:0;display:flex;flex-direction:column;gap:12px}
.st-ev-title{font-size:var(--t-30);letter-spacing:-0.025em;line-height:var(--bt-leading-h2)}
.st-ev-teams{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px}
.st-ev-seat{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.st-ev-seat-actions{display:flex;gap:8px;flex-shrink:0}
@media (max-width:900px){
  .st-ev{padding:24px 16px 128px}
  .st-ev-hero{aspect-ratio:2.1 / 1}
  .st-ev-grid{grid-template-columns:minmax(0,1fr);gap:16px}
}
@media (max-width:560px){
  .st-ev-seat-actions{width:100%}
  .st-ev-seat-actions>button{flex:1}
}
`;

type Screen = "login" | "code" | "events" | "event" | "seasonPackage" | "package" | "listings" | "resale" | "giving" | "profile";
type Sent = WalletTransferRow;

type ConfirmAcceptTransfer = {
  transferId: string | number;
  title: string;
  seat: string;
  from?: string;
  to?: string;
  on?: string;
  passKind?: TransferModalKind;
  ticketCount?: number;
  seatLines?: string[];
  accessPassId?: string;
  id?: string;
  eventCount?: number;
  remainingCount?: number;
  when?: string;
};

type ConfirmAcceptSource =
  | "wallet-upcoming"
  | "wallet-event"
  | "wallet-access"
  | "transfers-received";

function incomingPassEventCountLabel(count?: number) {
  if (!count || count <= 0) return "";
  return count === 1 ? "1 event" : `${count} events`;
}

function buildWalletTransferRowContext(
  orders: OrderLike[],
  transfers: TransferLike[],
  details: Record<string, CartEventDetail>,
  seasonPackages: SeasonPackageSummary[],
  extraPackageEventCounts?: Map<string, number>,
) {
  return {
    orders,
    packageEventCounts: augmentPackageEventCountLookup(
      mergePackageEventCountLookups(
        buildPackageEventCountLookup(seasonPackages, orders),
        buildPackageEventCountLookupFromTransfers(transfers, orders),
        extraPackageEventCounts ?? new Map(),
      ),
      details,
      orders,
    ),
  };
}

function acceptTargetFromUpcoming(row: CartEventSummary): ConfirmAcceptTransfer {
  const seatLines = row.ticketSeats ?? [];
  return {
    transferId: String(row.incomingTransferId ?? ""),
    title: row.name,
    seat:
      seatLines.join(" · ") ||
      (row.incomingPassTransfer
        ? ""
        : `${row.ticketCount} ${row.ticketCount === 1 ? "ticket" : "tickets"}`),
    from: row.incomingTransferFrom,
    on: row.incomingTransferOn,
    passKind: row.passKind,
    accessPassId: row.accessPassId,
    ticketCount: row.incomingPassTransfer
      ? row.passEventCount ?? row.ticketCount
      : row.ticketCount,
    seatLines,
    eventCount: row.passEventCount,
    remainingCount: row.passRemainingCount,
    when: row.whenDate || row.when,
  };
}

function acceptTargetFromWalletRow(row: WalletTransferRow): ConfirmAcceptTransfer {
  return {
    transferId: row.id,
    title: row.title,
    seat: row.seat,
    from: row.from,
    to: row.to,
    on: row.on,
    passKind: row.passKind,
    ticketCount: row.ticketCount,
    seatLines: row.seatLines,
    accessPassId: row.accessPassId,
    id: row.id,
    eventCount: row.eventCount,
    remainingCount: row.remainingCount,
    when: row.schedule,
  };
}

function acceptTargetFromEventDetail(ev: EventT): ConfirmAcceptTransfer {
  const seatLines = ev.tickets
    .map((ticket) => String(ticket.seat || "").trim())
    .filter(Boolean);
  return {
    transferId: String(ev.incomingTransferId ?? ""),
    title: ev.title,
    seat:
      seatLines.join(" · ") ||
      `${ev.tickets.length} ${ev.tickets.length === 1 ? "ticket" : "tickets"}`,
    from: ev.incomingTransferFrom,
    on: ev.incomingTransferOn,
    ticketCount: ev.tickets.length,
    seatLines,
    when: ev.whenDate || ev.when,
  };
}

function StackedSeatLines({
  lines,
  style,
}: {
  lines: string[];
  style?: CSSProperties;
}) {
  if (!lines.length) return null;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        ...style,
      }}
    >
      {lines.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </div>
  );
}

function transferSeatLines(row: Pick<WalletTransferRow, "seatLines" | "seat">) {
  return row.seatLines?.length ? row.seatLines : row.seat ? [row.seat] : [];
}

function walletAvailabilityBadgeKind(
  availability: CartEventSummary["availability"],
  availabilityBadge?: CartEventSummary["availabilityBadge"],
): CartEventSummary["availabilityBadge"] | null {
  const badge = availabilityBadge || availability;
  if (badge === "attended" || badge === "transferred" || badge === "past") {
    return badge;
  }
  return null;
}

function upcomingAvailabilityLabel(
  availability: CartEventSummary["availability"],
  availabilityBadge?: CartEventSummary["availabilityBadge"],
) {
  const badge = walletAvailabilityBadgeKind(availability, availabilityBadge);
  if (badge === "attended" || badge === "past") return "Attended";
  if (badge === "transferred") return "Transferred";
  return "";
}

/** Filled pill badges for non-actionable games — same weight as the Today chip. */
function walletAvailabilityBadgeStyle(
  kind: NonNullable<CartEventSummary["availabilityBadge"]> | "upcoming",
): CSSProperties {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    fontSize: fluidSize(11),
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.10em",
    borderRadius: 999,
    padding: "4px 10px",
    whiteSpace: "nowrap",
    alignSelf: "flex-start",
  };
  if (kind === "transferred") {
    return { ...base, color: "#8a5300", background: "#fff0c8" };
  }
  if (kind === "upcoming" || kind === "available") {
    return { ...base, color: INK, background: ACCENT };
  }
  return { ...base, color: INK, background: "#d8deea" };
}
type TransferWizard = {
  step: number;
  sel: string[];
  email: string;
  evId: string;
  pass?: AccessPassSummary;
  passKind?: Exclude<TransferModalKind, "ticket">;
};

let walletApiHydratedInBrowserSession = false;

/** Reset first-load API-only hydration (tests simulate a fresh browser session). */
export function resetWalletApiHydrationForTests() {
  walletApiHydratedInBrowserSession = false;
}

export default function SeasonTickets({
  initialScreen = "events",
  eventUUID,
  flexPackUUID,
}: {
  initialScreen?: Screen;
  eventUUID?: string;
  flexPackUUID?: string;
}) {
  const params = useParams<{
    orderId?: string | string[];
    eventUUID?: string | string[];
    flexPackUUID?: string | string[];
    packageUUID?: string | string[];
    accessPassUUID?: string | string[];
  }>();
  const pathname = usePathname() || "";
  const pendingNavPath = useWalletNavigationPending();
  const searchParams = useSearchParams();
  const route = walletRouteFromPath(pathname, params);
  const routedOrderId = route.orderId;
  const routedEventUUID = eventUUID || route.eventUUID;
  const routedFlexPackUUID = flexPackUUID || route.flexPackUUID;
  const routedPackageUUID = route.packageUUID;
  const routedAccessPassUUID = route.accessPassUUID;
  const section = walletSectionFromPath(pathname);
  const displaySection = walletSectionFromPath(pendingNavPath || pathname);
  const walletNavPending = isWalletNavigationPending(pathname, pendingNavPath);
  const resolvedInitialScreen =
    initialScreen !== "events"
      ? initialScreen
      : searchParams?.has("login")
        ? "login"
        : section;
  const [vw, setVw] = useState(1440);
  const [screen, setScreen] = useState<Screen>(resolvedInitialScreen);
  const [tab, setTab] = useState<"upcoming" | "season" | "flex" | "access">("upcoming");
  const [email, setEmail] = useState("harrison.cogan@gmail.com");
  const [code, setCode] = useState("");
  const [evId, setEvId] = useState("lobos");
  const [listTab, setListTab] = useState<"active" | "received">("active");
  const [saleTab, setSaleTab] = useState<"active" | "sold" | "expired">("active");
  const [modal, setModal] = useState<null | "details" | "qr" | "field" | "vouchers">(null);
  const [detail, setDetail] = useState<{
    seat?: string;
    holder?: string;
    code?: string;
    raw?: Record<string, unknown>;
  } | null>(null);
  const [printing, setPrinting] = useState<string | null>(null);
  const [printError, setPrintError] = useState("");
  const [field, setField] = useState<{ group: string; heading: string; label: string; help: string; key: string } | null>(null);
  const [fieldValue, setFieldValue] = useState("");
  const [pvals, setPvals] = useState<Record<string, string>>({});
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [tf, setTf] = useState<TransferWizard | null>(null);
  const [tfEmailErr, setTfEmailErr] = useState<EmailFieldError>(null);
  const [tfError, setTfError] = useState("");
  const [tfSaving, setTfSaving] = useState(false);
  const [qrPass, setQrPass] = useState<{
    pass: AccessPassSummary;
    kind: "season pass" | "access pass";
  } | null>(null);
  const [passWallet, setPassWallet] = useState<PhoneWalletKind | null>(null);
  const [passWalletSaving, setPassWalletSaving] = useState(false);
  const [passWalletError, setPassWalletError] = useState("");
  const [ticketWalletSaving, setTicketWalletSaving] = useState<string | null>(null);
  const [ticketWalletError, setTicketWalletError] = useState("");
  const [confirmCancel, setConfirmCancel] = useState<Sent | null>(null);
  const [confirmCancelSaving, setConfirmCancelSaving] = useState(false);
  const [confirmCancelError, setConfirmCancelError] = useState("");
  const [confirmAccept, setConfirmAccept] = useState<ConfirmAcceptTransfer | null>(
    null,
  );
  const [confirmAcceptSaving, setConfirmAcceptSaving] = useState(false);
  const [confirmAcceptError, setConfirmAcceptError] = useState("");
  const [confirmAcceptSource, setConfirmAcceptSource] =
    useState<ConfirmAcceptSource>("wallet-upcoming");
  const [sent, setSent] = useState<Sent[] | null>(null);
  const [sentTransferRecords, setSentTransferRecords] = useState<
    PendingSentTransfer[]
  >([]);
  const sentTransferRecordsRef = useRef<PendingSentTransfer[]>([]);
  const seasonPackagesRef = useRef<SeasonPackageSummary[]>([]);
  const walletOrdersRef = useRef<OrderLike[]>([]);
  const [, setIncomingTransferRecords] = useState<TransferLike[]>([]);
  const incomingTransferRecordsRef = useRef<TransferLike[]>([]);
  const [, setReceivedTransferRecords] = useState<TransferLike[]>([]);
  const receivedTransferRecordsRef = useRef<TransferLike[]>([]);
  const walletReloadGenerationRef = useRef(0);
  const walletReloadAbortRef = useRef<AbortController | null>(null);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [resaleListingsLoading, setResaleListingsLoading] = useState(false);
  const [sentTransferListLoading, setSentTransferListLoading] = useState(false);
  const [receivedTransferListLoading, setReceivedTransferListLoading] =
    useState(false);
  const cancelInFlightWalletSectionReloads = useCallback(() => {
    walletReloadGenerationRef.current += 1;
    walletReloadAbortRef.current?.abort();
    walletReloadAbortRef.current = null;
    setSentTransferListLoading(false);
    setReceivedTransferListLoading(false);
    setEventsLoading(false);
    setResaleListingsLoading(false);
  }, []);
  const acquireWalletReloadSignal = useCallback(() => {
    if (
      !walletReloadAbortRef.current ||
      walletReloadAbortRef.current.signal.aborted
    ) {
      walletReloadAbortRef.current = new AbortController();
    }
    return {
      generation: walletReloadGenerationRef.current,
      signal: walletReloadAbortRef.current.signal,
    };
  }, []);
  const walletReloadFetch = useCallback(
    async <T,>(
      signal: AbortSignal,
      request: () => Promise<T>,
    ): Promise<T | null> => {
      try {
        return await request();
      } catch (err) {
        if (isRequestCanceled(err)) return null;
        return null;
      }
    },
    [],
  );
  const [walletOrders, setWalletOrders] = useState<OrderLike[]>([]);
  const [received, setReceived] = useState<Sent[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<CartEventSummary[]>([]);
  const [seasonPackages, setSeasonPackages] = useState<SeasonPackageSummary[]>([]);
  const [seasonPackageKey, setSeasonPackageKey] = useState<string | null>(null);
  const [packageAccessPasses, setPackageAccessPasses] = useState<
    Record<string, AccessPassSummary[]>
  >({});
  const [packagePassChecked, setPackagePassChecked] = useState<
    Record<string, boolean>
  >({});
  const packagePassRequested = useRef<Record<string, boolean>>({});
  const packagePassAttempts = useRef<Record<string, number>>({});
  const packagePassRetryTimers = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});
  const [packagePassRetryTick, setPackagePassRetryTick] = useState(0);
  const walletOrdersLocallyMutatedRef = useRef(false);
  const [listingsSnapshotStale, setListingsSnapshotStale] = useState(false);
  const restoreSeasonPassPackageAfterCancelRef = useRef<
    (
      cancelledRecord?: PendingSentTransfer | null,
      cancelRow?: Sent | null,
    ) => Promise<void>
  >(async () => undefined);
  const [fullOrders, setFullOrders] = useState<Record<string, OrderLike>>({});
  const [fullOrderChecked, setFullOrderChecked] = useState<
    Record<string, boolean>
  >({});
  const [matchupHeroReadyKey, setMatchupHeroReadyKey] = useState("");
  const [packageView, setPackageView] = useState<"pass" | "events">("pass");
  const [flexPacks, setFlexPacks] = useState<FlexPackSummary[]>([]);
  const [accessPasses, setAccessPasses] = useState<AccessPassSummary[]>([]);
  const accessPassesRef = useRef<AccessPassSummary[]>([]);
  const [accessPassDetails, setAccessPassDetails] = useState<
    Record<string, AccessPassSummary>
  >({});
  const [accessPassDetailChecked, setAccessPassDetailChecked] = useState<
    Record<string, boolean>
  >({});
  const [flexPackKey, setFlexPackKey] = useState<string | null>(null);
  const [eventDetails, setEventDetails] = useState<Record<string, CartEventDetail>>({});
  const [eventsChecked, setEventsChecked] = useState(false);
  const [resaleListingsChecked, setResaleListingsChecked] = useState(false);
  const [phoneDevice, setPhoneDevice] = useState(false);
  const passWalletTheme = passWallet ? phoneWalletTheme(passWallet) : null;
  const codeBoxes = useRef<(HTMLInputElement | null)[]>([]);
  const autoFocusField = useAutoFocus<HTMLInputElement>(true);
  const setCodeRef = useMemo(
    () =>
      CODE_BOXES.map((index) => (field: HTMLInputElement | null) => {
        codeBoxes.current[index] = field;
        if (index === 0) autoFocusField(field);
      }),
    [autoFocusField],
  );
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSection = useRef(section);

  const setCodeValue = (raw: string) => {
    const next = raw.replace(/\D/g, "").slice(0, 6);
    setCode(next);
    if (next.length === 6) setTimeout(() => { setScreen("events"); setCode(""); }, 260);
    return next;
  };
  const focusCodeBox = (index: number) => codeBoxes.current[Math.min(Math.max(index, 0), CODE_BOXES.length - 1)]?.focus();
  /** Digits land in the box they were typed in; a whole code fills from there. */
  const typeCodeBox = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) { setCodeValue(code.slice(0, index) + code.slice(index + 1)); return; }
    const next = setCodeValue(digits.length > 1 ? code.slice(0, index) + digits : code.slice(0, index) + digits + code.slice(index + 1));
    focusCodeBox(Math.min(index + digits.length, next.length));
  };
  const moveCodeBox = (index: number, e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      e.preventDefault();
      setCodeValue(code.slice(0, index - 1) + code.slice(index));
      focusCodeBox(index - 1);
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focusCodeBox(index - 1);
    } else if (e.key === "ArrowRight" && index < CODE_BOXES.length - 1) {
      e.preventDefault();
      focusCodeBox(index + 1);
    }
  };

  useEffect(() => {
    setVw(window.innerWidth);
    setPhoneDevice(isPhoneDevice());
    setPassWallet(phoneWalletKind());
    const onR = () => setVw(window.innerWidth);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  useEffect(() => {
    const session = getSession();
    if (session?.user?.email) {
      setEmail(String(session.user.email));
    }
  }, []);

  useEffect(() => {
    accessPassesRef.current = accessPasses;
  }, [accessPasses]);

  // One wallet instance serves every section route, so a nav click only changes
  // the URL — the screen follows it here.
  useEffect(() => {
    if (lastSection.current === section) return;
    lastSection.current = section;
    if (screen === "login" || screen === "code") return;
    setScreen(section);
  }, [screen, section]);

  const applyWalletSnapshot = useCallback(
    (snapshot: {
      orders: OrderLike[];
      sentTransfers: TransferLike[];
      incomingTransfers: TransferLike[];
      receivedTransfers: TransferLike[];
      accessPasses?: AccessPassLike[];
      removedTicketIds?: Array<number | string>;
      mergeSentTransfers?: boolean;
      appendSentTransferStubs?: boolean;
      mergeReceivedTransfers?: boolean;
      packageEventCounts?: Map<string, number>;
    }) => {
      const holderEmail = String(getSession()?.user?.email || email);
      const sentAsPending = filterPersistedCancelledSentTransfers(
        snapshot.appendSentTransferStubs
          ? appendLocalSentTransferStubs(
              sentTransferRecordsRef.current,
              snapshot.sentTransfers,
            )
          : snapshot.mergeSentTransfers
            ? mergeWalletSentTransferRecords(
                snapshot.sentTransfers,
                sentTransferRecordsRef.current,
              )
            : filterActiveTransferRecords(snapshot.sentTransfers),
      ) as PendingSentTransfer[];
      sentTransferRecordsRef.current = sentAsPending;
      const receivedAsHistory = snapshot.mergeReceivedTransfers
        ? mergeWalletReceivedTransferRecords(
            snapshot.receivedTransfers,
            receivedTransferRecordsRef.current,
          )
        : filterActiveTransferRecords(snapshot.receivedTransfers);
      receivedTransferRecordsRef.current = receivedAsHistory;
      const pendingIncoming = filterIncomingTransfersForWallet(
        snapshot.incomingTransfers,
        receivedAsHistory,
      );
      incomingTransferRecordsRef.current = pendingIncoming;
      let { allDetails, upcomingEvents: walletUpcoming } =
        buildWalletEventDetails(snapshot.orders, holderEmail, {
          sentTransfers: sentAsPending,
          incomingTransfers: pendingIncoming as PendingReceivedTransfer[],
        });
      if (snapshot.removedTicketIds?.length) {
        allDetails = removeTicketsFromWalletDetails(
          allDetails,
          snapshot.removedTicketIds,
        );
        walletUpcoming = summarizeUpcomingWalletEvents(allDetails);
      }

      walletOrdersRef.current = snapshot.orders;
      setWalletOrders(snapshot.orders);
      setSentTransferRecords(sentAsPending);
      setIncomingTransferRecords(pendingIncoming);
      setReceivedTransferRecords(receivedAsHistory);
      setEventDetails(allDetails);
      setUpcomingEvents(walletUpcoming);
      const nextSeasonPackages = buildSeasonPackageSummaries(
        snapshot.orders,
        sentAsPending,
        seasonPackagesRef.current,
      );
      seasonPackagesRef.current = nextSeasonPackages;
      setSeasonPackages(nextSeasonPackages);
      setFlexPacks(buildFlexPackSummaries(snapshot.orders));
      const transferBuildContext = buildWalletTransferRowContext(
        snapshot.orders,
        [...sentAsPending, ...receivedAsHistory, ...pendingIncoming],
        allDetails,
        nextSeasonPackages,
        snapshot.packageEventCounts,
      );
      setSent(
        buildWalletSentTransferRows(
          sentAsPending,
          snapshot.orders,
          transferBuildContext,
        ),
      );
      setReceived(
        buildWalletReceivedTransferRows(
          receivedAsHistory,
          pendingIncoming,
          snapshot.orders,
          transferBuildContext,
        ),
      );
      if (snapshot.accessPasses) {
        const mergedPasses = mergeWalletAccessPassesPreservingLocal(
          snapshot.accessPasses,
          accessPassesRef.current.map((row) => row.pass),
          sentAsPending,
        );
        const nextAccessPasses = buildAccessPassSummaries(mergedPasses);
        accessPassesRef.current = nextAccessPasses;
        setAccessPasses(nextAccessPasses);
      }
    },
    [email],
  );

  const reloadWalletTickets = useCallback(async (options?: {
    fresh?: boolean;
    background?: boolean;
    trustApiOnly?: boolean;
    fetchReceivedTransfers?: boolean;
  }) => {
    const session = getSession();
    if (!session?.jwt) {
      setUpcomingEvents([]);
      setSeasonPackages([]);
      seasonPackagesRef.current = [];
      setPackageAccessPasses({});
      packagePassRequested.current = {};
      setPackagePassChecked({});
      setFlexPacks([]);
      setAccessPasses([]);
      setAccessPassDetails({});
      setAccessPassDetailChecked({});
      setEventDetails({});
      setWalletOrders([]);
      walletOrdersRef.current = [];
      setSentTransferRecords([]);
      sentTransferRecordsRef.current = [];
      setIncomingTransferRecords([]);
      incomingTransferRecordsRef.current = [];
      setReceivedTransferRecords([]);
      receivedTransferRecordsRef.current = [];
      clearLocallyResolvedIncomingTransfersForTests();
      setEventsLoading(false);
      setEventsChecked(true);
      return;
    }

    const fetchReceived = options?.fetchReceivedTransfers === true;
    if (!options?.background) setEventsLoading(true);
    const { generation: reloadGeneration, signal } = acquireWalletReloadSignal();
    try {
      const holderEmail = String(session.user?.email || email);
      const [
        res,
        accessPassRes,
        incomingTransfersRes,
        receivedTransfersRes,
        sentTransfersRes,
      ] = await Promise.all([
        walletReloadFetch(signal, () =>
          getMyEvents({ fresh: options?.fresh, signal }),
        ),
        walletReloadFetch(signal, () =>
          getMyAccessPasses("organizer", { signal }),
        ),
        walletReloadFetch(signal, () => getIncomingTransfers({ signal })),
        fetchReceived
          ? walletReloadFetch(signal, () =>
              getMyReceivedTransfers(holderEmail, 1, { signal }),
            )
          : Promise.resolve(null),
        walletReloadFetch(signal, () =>
          getMySentTransfers(holderEmail, 1, { signal }),
        ),
      ]);
      const apiOrders = unwrapList<OrderLike>(res?.data);
      const trustApiOnly = options?.trustApiOnly === true;
      let orders = applyPersistedCancelRestores(apiOrders);
      if (!trustApiOnly) {
        orders = mergeWalletOrdersPreservingLocalTickets(
          orders,
          walletOrdersRef.current,
        );
      }
      prunePersistedCancelRestores(apiOrders);
      const passes = accessPassRes
        ? unwrapAccessPassList(accessPassRes.data)
        : [];
      if (reloadGeneration !== walletReloadGenerationRef.current) return;
      const apiSentTransfers = sentTransfersRes
        ? unwrapTransferRecords(sentTransfersRes.data)
        : [];
      const rawSentTransfers = mergeWalletSentTransferRecords(
        apiSentTransfers,
        sentTransferRecordsRef.current,
      );
      if (trustApiOnly) {
        prunePersistedCancelledSentTransfers(rawSentTransfers);
        prunePersistedCancelRestores(apiOrders);
      } else {
        prunePersistedCancelledSentTransfers(rawSentTransfers);
      }
      const sentTransfers = trustApiOnly
        ? filterActiveTransferRecords(rawSentTransfers)
        : filterPersistedCancelledSentTransfers(
            filterActiveTransferRecords(rawSentTransfers),
          );
      const incomingTransfers = incomingTransfersRes
        ? unwrapTransferRecords(incomingTransfersRes.data)
        : [];
      const receivedTransfers = receivedTransfersRes
        ? unwrapTransferRecords(receivedTransfersRes.data)
        : receivedTransferRecordsRef.current;
      if (reloadGeneration !== walletReloadGenerationRef.current) return;
      applyWalletSnapshot({
        orders,
        sentTransfers,
        incomingTransfers,
        receivedTransfers,
        accessPasses: passes,
        mergeReceivedTransfers: fetchReceived,
      });
    } catch {
      if (reloadGeneration !== walletReloadGenerationRef.current) return;
      setUpcomingEvents([]);
      setSeasonPackages([]);
      seasonPackagesRef.current = [];
      setPackageAccessPasses({});
      packagePassRequested.current = {};
      setPackagePassChecked({});
      setFlexPacks([]);
      setAccessPasses([]);
      setAccessPassDetails({});
      setAccessPassDetailChecked({});
      setEventDetails({});
      setWalletOrders([]);
      walletOrdersRef.current = [];
      setSentTransferRecords([]);
      sentTransferRecordsRef.current = [];
      setIncomingTransferRecords([]);
      incomingTransferRecordsRef.current = [];
      setReceivedTransferRecords([]);
      receivedTransferRecordsRef.current = [];
    } finally {
      if (reloadGeneration !== walletReloadGenerationRef.current) return;
      setSent((current) => current ?? []);
      setReceived((current) => current ?? []);
      if (!options?.background) setEventsLoading(false);
      setEventsChecked(true);
    }
  }, [
    acquireWalletReloadSignal,
    applyWalletSnapshot,
    email,
    walletReloadFetch,
  ]);

  /** Refresh owned tickets and pending incoming only — used after My Tickets accept. */
  const reloadWalletEventsAndIncoming = useCallback(
    async (options?: { fresh?: boolean }) => {
      const session = getSession();
      if (!session?.jwt) return;

      invalidateMyEventsCache();
      const { generation: reloadGeneration, signal } =
        acquireWalletReloadSignal();
      try {
        const [eventsRes, incomingTransfersRes] = await Promise.all([
          walletReloadFetch(signal, () =>
            getMyEvents({ fresh: options?.fresh ?? true, signal }),
          ),
          walletReloadFetch(signal, () => getIncomingTransfers({ signal })),
        ]);
        if (reloadGeneration !== walletReloadGenerationRef.current) return;

        const apiOrders = unwrapList<OrderLike>(eventsRes?.data);
        let orders = applyPersistedCancelRestores(apiOrders);
        orders = mergeWalletOrdersPreservingLocalTickets(
          orders,
          walletOrdersRef.current,
        );
        prunePersistedCancelRestores(apiOrders);

        const incomingTransfers = incomingTransfersRes
          ? unwrapTransferRecords(incomingTransfersRes.data)
          : [];

        applyWalletSnapshot({
          orders,
          sentTransfers: sentTransferRecordsRef.current,
          incomingTransfers,
          receivedTransfers: receivedTransferRecordsRef.current,
        });
      } catch {
        /* keep current wallet on partial reload failure */
      }
    },
    [
      acquireWalletReloadSignal,
      applyWalletSnapshot,
      walletReloadFetch,
    ],
  );

  const reloadListingsTransfers = useCallback(async () => {
    const session = getSession();
    if (!session?.jwt) {
      setSentTransferListLoading(false);
      setReceivedTransferListLoading(false);
      return;
    }
    const holderEmail = String(session.user?.email || email);
    const { generation: reloadGeneration, signal } = acquireWalletReloadSignal();
    setSentTransferListLoading(true);
    setReceivedTransferListLoading(true);
    try {
      const [sentTransfersRes, receivedTransfersRes, incomingTransfersRes] =
        await Promise.all([
          walletReloadFetch(signal, () =>
            getMySentTransfers(holderEmail, 1, { signal }),
          ),
          walletReloadFetch(signal, () =>
            getMyReceivedTransfers(holderEmail, 1, { signal }),
          ),
          walletReloadFetch(signal, () => getIncomingTransfers({ signal })),
        ]);
      if (reloadGeneration !== walletReloadGenerationRef.current) return;
      const rawSentTransfers = sentTransfersRes
        ? unwrapTransferRecords(sentTransfersRes.data)
        : [];
      prunePersistedCancelledSentTransfers(rawSentTransfers);
      const sentTransfers = filterPersistedCancelledSentTransfers(
        filterActiveTransferRecords(rawSentTransfers),
      );
      const receivedTransfers = receivedTransfersRes
        ? unwrapTransferRecords(receivedTransfersRes.data)
        : [];
      const incomingTransfers = incomingTransfersRes
        ? unwrapTransferRecords(incomingTransfersRes.data)
        : incomingTransferRecordsRef.current;
      if (reloadGeneration !== walletReloadGenerationRef.current) return;
      applyWalletSnapshot({
        orders: walletOrdersRef.current,
        sentTransfers,
        incomingTransfers,
        receivedTransfers,
        mergeSentTransfers: true,
        mergeReceivedTransfers: true,
      });
    } catch {
      /* keep the current transfer lists on refresh failure */
    } finally {
      if (reloadGeneration === walletReloadGenerationRef.current) {
        setSentTransferListLoading(false);
        setReceivedTransferListLoading(false);
      }
    }
  }, [
    acquireWalletReloadSignal,
    applyWalletSnapshot,
    email,
    walletReloadFetch,
  ]);

  const reloadResaleListings = useCallback(async () => {
    const session = getSession();
    if (!session?.jwt) {
      setResaleListingsLoading(false);
      setResaleListingsChecked(true);
      return;
    }
    const { generation: reloadGeneration, signal } = acquireWalletReloadSignal();
    setResaleListingsLoading(true);
    try {
      await walletReloadFetch(signal, () => getMyListings({ signal }));
      if (reloadGeneration !== walletReloadGenerationRef.current) return;
    } catch {
      /* keep the current resale empty state on refresh failure */
    } finally {
      if (reloadGeneration !== walletReloadGenerationRef.current) return;
      setResaleListingsLoading(false);
      setResaleListingsChecked(true);
    }
  }, [acquireWalletReloadSignal, walletReloadFetch]);

  const openReceivedTransfersTab = () => {
    setListTab("received");
  };

  const syncWalletAfterTransferAction = useCallback(
    async (snapshot: {
      sentTransfers?: TransferLike[];
      incomingTransfers?: TransferLike[];
      receivedTransfers?: TransferLike[];
      orders?: OrderLike[];
      removedTicketIds?: Array<number | string>;
      mergeSentTransfers?: boolean;
      appendSentTransferStubs?: boolean;
      mergeReceivedTransfers?: boolean;
    }) => {
      const nextSent =
        snapshot.sentTransfers ??
        sentTransferRecordsRef.current;
      const nextIncoming =
        snapshot.incomingTransfers ?? incomingTransferRecordsRef.current;
      const nextReceived =
        snapshot.receivedTransfers ?? receivedTransferRecordsRef.current;
      const nextOrders = snapshot.orders ?? walletOrders;
      const ordersChanged =
        snapshot.orders !== undefined &&
        snapshot.orders !== walletOrdersRef.current;
      applyWalletSnapshot({
        orders: nextOrders,
        sentTransfers: nextSent,
        incomingTransfers: nextIncoming,
        receivedTransfers: nextReceived,
        removedTicketIds: snapshot.removedTicketIds,
        mergeSentTransfers: snapshot.mergeSentTransfers,
        appendSentTransferStubs: snapshot.appendSentTransferStubs,
      });
      if (ordersChanged) {
        walletOrdersLocallyMutatedRef.current = true;
      }
    },
    [applyWalletSnapshot, walletOrders],
  );

  useEffect(() => {
    if (walletApiHydratedInBrowserSession) return;
    walletApiHydratedInBrowserSession = true;
    if (section === "listings") {
      setListingsSnapshotStale(true);
      void reloadListingsTransfers().finally(() => {
        setListingsSnapshotStale(false);
      });
      return;
    }
    if (section === "resale") {
      void reloadResaleListings();
      return;
    }
    if (section === "events") {
      void reloadWalletTickets({ trustApiOnly: true });
    }
  }, [
    reloadWalletTickets,
    reloadListingsTransfers,
    reloadResaleListings,
    section,
  ]);

  const prevWalletSectionRef = useRef(section);
  useLayoutEffect(() => {
    const prevSection = prevWalletSectionRef.current;
    if (prevSection !== section && walletApiHydratedInBrowserSession) {
      cancelInFlightWalletSectionReloads();
      if (section === "listings") {
        setListingsSnapshotStale(true);
        void reloadListingsTransfers().finally(() => {
          setListingsSnapshotStale(false);
        });
      } else if (section === "resale") {
        void reloadResaleListings();
      } else if (section === "events") {
        if (!walletOrdersLocallyMutatedRef.current) {
          void reloadWalletTickets({ trustApiOnly: true, fresh: true });
        } else {
          walletOrdersLocallyMutatedRef.current = false;
        }
      }
    }
    prevWalletSectionRef.current = section;
  }, [
    cancelInFlightWalletSectionReloads,
    section,
    reloadListingsTransfers,
    reloadResaleListings,
    reloadWalletTickets,
  ]);

  useEffect(
    () => () => {
      cancelInFlightWalletSectionReloads();
      walletApiHydratedInBrowserSession = false;
    },
    [cancelInFlightWalletSectionReloads],
  );

  useEffect(() => {
    const uuid = routedAccessPassUUID;
    if (
      !uuid ||
      accessPassDetails[uuid] ||
      accessPassDetailChecked[uuid] ||
      isAccessPassHiddenBySentTransfers(uuid, sentTransferRecords)
    ) {
      return;
    }

    let cancelled = false;
    getMyAccessPass(uuid)
      .then((res) => {
        if (cancelled) return;
        const payload = res.data;
        const pass =
          payload && typeof payload === "object" && "data" in payload
            ? (payload as { data?: AccessPassLike }).data
            : (payload as AccessPassLike);
        const [summary] = pass ? buildAccessPassSummaries([pass]) : [];
        if (summary) {
          setAccessPassDetails((current) => ({
            ...current,
            [uuid]: {
              ...summary,
              orderId: summary.orderId || routedOrderId,
            },
          }));
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setAccessPassDetailChecked((current) => ({
            ...current,
            [uuid]: true,
          }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    accessPassDetailChecked,
    accessPassDetails,
    routedAccessPassUUID,
    routedOrderId,
    sentTransferRecords,
  ]);

  const mobile = vw < 900;
  // Swipeable cards are phone-only: narrow width plus a phone UA (not tablet / DevTools iPad).
  const mobileTicketView = vw <= 767 && phoneDevice;
  const isHolder = email.trim().toLowerCase() === "harrison.cogan@gmail.com";
  const events = useMemo(buildEvents, []);
  const showRoutedWallet = Boolean(
    routedOrderId ||
      routedEventUUID ||
      routedFlexPackUUID ||
      routedPackageUUID ||
      routedAccessPassUUID,
  );
  const routedSeasonPackage = useMemo(
    () =>
      routedPackageUUID
        ? seasonPackages.find(
            (row) =>
              (row.packageUUID === routedPackageUUID ||
                row.key === routedPackageUUID) &&
              (!routedOrderId || row.orderId === routedOrderId),
          ) ||
          seasonPackages.find(
            (row) =>
              row.packageUUID === routedPackageUUID || row.key === routedPackageUUID,
          ) ||
          null
        : null,
    [routedOrderId, routedPackageUUID, seasonPackages],
  );
  const routedPackagePassPending = Boolean(
    routedSeasonPackage &&
      (routedOrderId || routedSeasonPackage.orderId) &&
      !routedEventUUID &&
      !packagePassChecked[routedSeasonPackage.key],
  );
  const routedDetail = useMemo(() => {
    const list = Object.values(eventDetails);
    const sameOrder = (d: CartEventDetail) =>
      !routedOrderId || d.orderId === routedOrderId;
    if (routedPackageUUID && routedEventUUID) {
      return (
        list.find(
          (d) =>
            sameOrder(d) &&
            d.eventUUID === routedEventUUID &&
            d.key.startsWith(`${routedPackageUUID}:`),
        ) ||
        list.find(
          (d) =>
            d.eventUUID === routedEventUUID &&
            d.key.startsWith(`${routedPackageUUID}:`),
        ) ||
        null
      );
    }
    if (routedEventUUID) {
      return (
        list.find(
          (d) =>
            sameOrder(d) &&
            d.eventUUID === routedEventUUID &&
            !d.key.includes(":"),
        ) ||
        list.find((d) => sameOrder(d) && d.eventUUID === routedEventUUID) ||
        list.find(
          (d) => d.eventUUID === routedEventUUID && !d.key.includes(":"),
        ) ||
        list.find((d) => d.eventUUID === routedEventUUID) ||
        null
      );
    }
    if (
      routedOrderId &&
      !routedPackageUUID &&
      !routedFlexPackUUID &&
      !routedAccessPassUUID
    ) {
      return (
        list.find(
          (d) => d.orderId === routedOrderId && !d.key.includes(":"),
        ) || null
      );
    }
    return null;
  }, [
    routedAccessPassUUID,
    routedEventUUID,
    routedFlexPackUUID,
    routedOrderId,
    routedPackageUUID,
    eventDetails,
  ]);
  const routedFlexPack = useMemo(
    () =>
      routedFlexPackUUID
        ? flexPacks.find(
            (row) =>
              (row.flexPackUUID === routedFlexPackUUID ||
                row.key === routedFlexPackUUID) &&
              (!routedOrderId || row.orderId === routedOrderId),
          ) ||
          flexPacks.find(
            (row) =>
              row.flexPackUUID === routedFlexPackUUID ||
              row.key === routedFlexPackUUID,
          ) ||
          null
        : null,
    [routedFlexPackUUID, routedOrderId, flexPacks],
  );
  const routedAccessPass = useMemo(() => {
    if (!routedAccessPassUUID) return null;
    if (
      isAccessPassHiddenBySentTransfers(
        routedAccessPassUUID,
        sentTransferRecords,
      )
    ) {
      return null;
    }
    const byOrder = (row: AccessPassSummary) =>
      !routedOrderId || row.orderId === routedOrderId;
    return (
      (accessPassDetails[routedAccessPassUUID] &&
      byOrder(accessPassDetails[routedAccessPassUUID])
        ? accessPassDetails[routedAccessPassUUID]
        : null) ||
      accessPasses.find(
        (row) => row.key === routedAccessPassUUID && byOrder(row),
      ) ||
      accessPassDetails[routedAccessPassUUID] ||
      accessPasses.find((row) => row.key === routedAccessPassUUID) ||
      null
    );
  }, [
    routedAccessPassUUID,
    routedOrderId,
    accessPassDetails,
    accessPasses,
    sentTransferRecords,
  ]);
  const routedAccessPassPending = Boolean(
    routedAccessPassUUID &&
      !routedAccessPass &&
      !accessPassDetailChecked[routedAccessPassUUID],
  );
  const routedTargetFound = Boolean(
    routedFlexPack ||
      routedAccessPass ||
      (routedDetail &&
        !routedPackageUUID &&
        !routedFlexPackUUID &&
        !routedAccessPassUUID) ||
      (routedEventUUID && routedDetail) ||
      (routedPackageUUID && !routedEventUUID && routedSeasonPackage),
  );
  const orderEventKey = routedDetail
    ? routedDetail.key
    : evId.startsWith("order:")
      ? evId.slice(6)
      : null;
  const activeEvId = orderEventKey ? `order:${orderEventKey}` : evId;
  const activeDetail = orderEventKey ? eventDetails[orderEventKey] ?? null : null;
  const activeOrderId = activeDetail?.orderId ?? "";
  const activeWalletOrder =
    activeOrderId
      ? walletOrders.find(
          (order) =>
            String(order.orderId ?? order.id ?? "").trim() === activeOrderId,
        ) ?? null
      : null;
  const sessionUser = getSession()?.user;
  const ticketOrder = activeOrderId
    ? fullOrders[activeOrderId] ?? activeWalletOrder
    : null;
  const ticketBuyer = {
    firstName: ticketOrder?.firstName || sessionUser?.firstName,
    lastName: ticketOrder?.lastName || sessionUser?.lastName,
    email: ticketOrder?.email || sessionUser?.email,
    users_permissions_user: ticketOrder?.users_permissions_user,
    user: ticketOrder?.user ?? sessionUser,
  };
  const ev =
    (activeDetail
      ? detailToEventT(
          withFullOrder(
            activeDetail,
            ticketOrder || sessionUser
              ? {
                  ...(ticketOrder || {}),
                  firstName: ticketBuyer.firstName,
                  lastName: ticketBuyer.lastName,
                  email: ticketBuyer.email,
                  users_permissions_user: ticketBuyer.users_permissions_user,
                  user: ticketBuyer.user,
                }
              : null,
          ),
        )
      : events[evId]) || events.lobos;
  const attractionCards: AttractionCard[] = ev.attractions?.length
    ? ev.attractions
    : ev.teams.map((t) => ({
        name: t.name,
        role: t.role,
        logo: t.logo,
        brand: t.brand,
        initials: t.initials,
      }));
  const eventOrderPending = Boolean(
    activeOrderId && !fullOrderChecked[activeOrderId],
  );
  const matchupHeroKey = splitAttractionHeroKey(
    activeEvId,
    attractionCards,
    ev,
  );
  const matchupHeroPending = Boolean(
    !eventOrderPending &&
      matchupHeroKey &&
      matchupHeroReadyKey !== matchupHeroKey,
  );
  const eventDetailPending = eventOrderPending || matchupHeroPending;
  const routedWalletPending =
    routedPackagePassPending ||
    routedAccessPassPending ||
    eventDetailPending ||
    (showRoutedWallet &&
      !routedTargetFound &&
      (eventsLoading || !eventsChecked));
  const routedWalletMissing =
    showRoutedWallet && !routedTargetFound && !routedWalletPending;
  const showingEventDetail =
    showRoutedWallet
      ? Boolean(
          routedDetail &&
            !routedDetail.pendingIncomingTransfer &&
            !eventDetailPending &&
            !routedWalletPending &&
            !routedWalletMissing,
        )
      : screen === "event" &&
          !eventDetailPending &&
          !activeDetail?.pendingIncomingTransfer;
  const showingSeasonPackage =
    showRoutedWallet
      ? Boolean(
          routedSeasonPackage &&
            !routedEventUUID &&
            !routedWalletPending &&
            !routedWalletMissing,
        )
      : screen === "seasonPackage";
  const showingPackage =
    showRoutedWallet
      ? Boolean(routedFlexPack && !routedDetail && !routedWalletPending && !routedWalletMissing)
      : screen === "package";
  const showingAccessPass = Boolean(
    showRoutedWallet &&
      routedAccessPass &&
      !routedWalletPending &&
      !routedWalletMissing,
  );
  useEffect(() => {
    notifyWalletShellReady();
  }, []);

  useEffect(() => {
    if (eventOrderPending || !matchupHeroKey) return;
    if (matchupHeroReadyKey === matchupHeroKey) return;

    let cancelled = false;
    prefetchSplitAttractionHeroPanels(attractionCards).finally(() => {
      if (!cancelled) setMatchupHeroReadyKey(matchupHeroKey);
    });

    return () => {
      cancelled = true;
    };
  }, [eventOrderPending, matchupHeroKey, matchupHeroReadyKey]);

  /* Only package inventory carries the hero badge — singles belong to no pack. */
  const packagedTicketBadge = ev.packageName ? "Season Tickets" : "";
  const showMatchupCards = attractionCards.length >= 2;
  const eventPosterSrc =
    ev.posterSrc ||
    (!showMatchupCards
      ? attractionCards[0]?.logo || ev.heroImage || undefined
      : undefined);
  const matchupSrc = MATCHUP[ev.id] || ev.heroImage;
  const visitorTeam = showMatchupCards
    ? {
        brand: attractionCards[1]?.brand || "#1b1e26",
        initials: attractionCards[1]?.initials || ev.initials,
      }
    : {
        brand: ev.teams[1]?.brand || "#1b1e26",
        initials: ev.teams[1]?.initials || ev.initials,
      };

  const anyModal = !!modal || !!tf || !!confirmCancel || !!confirmAccept || !!qrPass;
  useEffect(() => {
    if (!anyModal) return;
    lockPageScroll();
    return () => unlockPageScroll();
  }, [anyModal]);

  const flashToast = (msg: string) => {
    setToast(msg);
    if (toastT.current) clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(null), 2400);
  };

  const isSeasonPassIncomingTransfer = (transfer?: TransferLike | null) => {
    if (!transfer || !isPassTransferRowPresentation(transfer)) return false;
    const pass = transfer.access_pass ?? transfer.accessPass;
    const type = String(pass?.type ?? "").trim().toLowerCase();
    return type === "package" || type === "season_seat";
  };

  const promoteAcceptedIncomingPassToWallet = useCallback(
    async (
      transferId: string,
      acceptedRecord?: TransferLike | null,
      acceptResponse?: unknown,
      options?: { ordersAndPassesOnly?: boolean },
    ) => {
      if (!acceptedRecord) return;
      const recipientEmail = String(getSession()?.user?.email || email);
      const nextOrders = applyAcceptedIncomingPassTransferToOrders(
        walletOrdersRef.current,
        acceptedRecord as PendingReceivedTransfer,
        recipientEmail,
        acceptResponse,
      );
      if (options?.ordersAndPassesOnly) {
        await syncWalletAfterTransferAction({ orders: nextOrders });
      } else {
        const nextIncoming = incomingTransferRecordsRef.current.filter(
          (transfer) => String(transfer.id ?? "") !== transferId,
        );
        const nextReceived = promoteAcceptedIncomingTransferToReceived(
          receivedTransferRecordsRef.current,
          acceptedRecord,
          acceptResponse,
        );
        markIncomingTransferLocallyResolved(transferId);
        await syncWalletAfterTransferAction({
          incomingTransfers: nextIncoming,
          receivedTransfers: nextReceived,
          orders: nextOrders,
        });
      }

      const acceptedPass = unwrapAcceptTransferAccessPass(acceptResponse);
      const pass = (acceptedPass ??
        acceptedRecord.access_pass ??
        acceptedRecord.accessPass) as AccessPassLike | undefined;
      const walletOrderId = resolveAcceptedPassTransferWalletOrderId(
        acceptedRecord,
        acceptResponse,
      );
      if (!walletOrderId || !pass?.uuid) return;

      const transferPackage = resolveTransferOrderPackage(acceptedRecord.order);
      const packageUUID = String(transferPackage?.uuid ?? "").trim();
      const pkg =
        seasonPackagesRef.current.find(
          (row) =>
            row.orderId === walletOrderId ||
            row.key === walletOrderId ||
            (packageUUID && row.packageUUID === packageUUID),
        ) ?? null;
      const packageKey = pkg?.key ?? walletOrderId;
      const packageOrder = nextOrders.find(
        (row) =>
          String(row.orderId || "") === walletOrderId ||
          String(row.id || "") === walletOrderId,
      );
      const packageEvents = mergeUniquePackageEvents(
        packageOrder?.package?.events,
        pass.events,
        acceptedPass?.events,
        transferPackage?.events,
      );
      const needsPassRefetch =
        isWalletOrderIdForAccessPassFetch(walletOrderId) &&
        (!pass.sectionNumber ||
          !pass.rowNumber ||
          pass.seatNumber == null ||
          !(pass.events?.length ?? 0));

      let passRows = buildAccessPassSummaries([pass], {
        includeInactive: true,
        packageEvents,
      }).map((row) => ({ ...row, orderId: row.orderId || walletOrderId }));

      if (needsPassRefetch) {
        try {
          const res = await getAccessPassesByOrder(walletOrderId);
          const rawPasses = unwrapAccessPassList(res.data);
          const owned = filterWalletAccessPassesBySentTransfers(
            rawPasses,
            sentTransferRecordsRef.current,
          );
          passRows = buildAccessPassSummaries(owned, {
            includeInactive: true,
            packageEvents,
          }).map((row) => ({
            ...row,
            orderId: row.orderId || walletOrderId,
          }));
        } catch {
          /* keep incoming snapshot */
        }
      }

      packagePassRequested.current[packageKey] = true;
      setPackageAccessPasses((current) => ({
        ...current,
        [packageKey]: passRows,
      }));
      setPackagePassChecked((current) => ({
        ...current,
        [packageKey]: true,
      }));
    },
    [email, syncWalletAfterTransferAction],
  );

  const promoteAcceptedIncomingAccessPassToWallet = useCallback(
    async (
      transferId: string,
      acceptedRecord?: TransferLike | null,
      acceptResponse?: unknown,
    ) => {
      const nextIncoming = incomingTransferRecordsRef.current.filter(
        (transfer) => String(transfer.id ?? "") !== transferId,
      );
      const nextReceived = promoteAcceptedIncomingTransferToReceived(
        receivedTransferRecordsRef.current,
        acceptedRecord ?? undefined,
        acceptResponse,
      );
      markIncomingTransferLocallyResolved(transferId);
      await syncWalletAfterTransferAction({
        incomingTransfers: nextIncoming,
        receivedTransfers: nextReceived,
      });

      const acceptedPass = unwrapAcceptTransferAccessPass(acceptResponse);
      const pass = (acceptedPass ??
        acceptedRecord?.access_pass ??
        acceptedRecord?.accessPass ??
        acceptedRecord?.accessPassSnapshot) as AccessPassLike | undefined;
      const snapshotSummary =
        incomingAccessPassSummaryFromTransfer(acceptedRecord ?? {}) ??
        (pass
          ? buildAccessPassSummaries([pass], { includeInactive: true })[0]
          : undefined);
      let summaries = snapshotSummary ? [snapshotSummary] : [];
      const needsPassRefetch = !pass?.uuid || !(pass.events?.length ?? 0);

      if (needsPassRefetch) {
        try {
          const res = await getMyAccessPasses("organizer");
          const fetched = unwrapAccessPassList(res.data);
          const owned = filterWalletAccessPassesBySentTransfers(
            fetched,
            sentTransferRecordsRef.current,
          );
          const fetchedSummaries = buildAccessPassSummaries(owned, {
            includeInactive: true,
          });
          if (fetchedSummaries.length) {
            summaries = mergeAccessPassSummaries(summaries, fetchedSummaries);
          }
        } catch {
          /* keep incoming snapshot */
        }
      }

      if (!summaries.length) return;
      setAccessPasses((current) =>
        mergeAccessPassSummaries(current, summaries),
      );
    },
    [syncWalletAfterTransferAction],
  );

  const refreshReceivedTransferRowsFromRefs = useCallback(() => {
    const receivedRecords = receivedTransferRecordsRef.current;
    const incomingRecords = incomingTransferRecordsRef.current;
    setReceived(
      buildWalletReceivedTransferRows(
        receivedRecords,
        incomingRecords,
        walletOrdersRef.current,
        buildWalletTransferRowContext(
          walletOrdersRef.current,
          [...receivedRecords, ...incomingRecords],
          eventDetails,
          seasonPackagesRef.current,
        ),
      ),
    );
  }, [eventDetails]);

  const openConfirmAccept = (
    target: ConfirmAcceptTransfer,
    source: ConfirmAcceptSource,
  ) => {
    const id = String(target.transferId ?? "").trim();
    if (!id) return;
    setConfirmAcceptError("");
    setConfirmAcceptSaving(false);
    setConfirmAcceptSource(source);
    setConfirmAccept({ ...target, transferId: id });
  };

  const submitAcceptTransfer = async () => {
    if (!confirmAccept?.transferId || confirmAcceptSaving) return;
    const id = String(confirmAccept.transferId);
    const source = confirmAcceptSource;
    setConfirmAcceptSaving(true);
    setConfirmAcceptError("");
    const acceptedRecord =
      incomingTransferRecordsRef.current.find(
        (transfer) => String(transfer.id ?? "") === id,
      ) ??
      receivedTransferRecordsRef.current.find(
        (transfer) => String(transfer.id ?? "") === id,
      );
    const dropPendingTransfer = async (acceptResponse?: unknown) => {
      const nextIncoming = incomingTransferRecordsRef.current.filter(
        (transfer) => String(transfer.id ?? "") !== id,
      );
      const nextReceived = promoteAcceptedIncomingTransferToReceived(
        receivedTransferRecordsRef.current,
        acceptedRecord,
        acceptResponse,
      );
      markIncomingTransferLocallyResolved(id);
      await syncWalletAfterTransferAction({
        incomingTransfers: nextIncoming,
        receivedTransfers: nextReceived,
      });
      if (source === "transfers-received") {
        refreshReceivedTransferRowsFromRefs();
      }
    };
    const claimAcceptedTransfer = async (acceptResponse: unknown) => {
      const nextIncoming = incomingTransferRecordsRef.current.filter(
        (transfer) => String(transfer.id ?? "") !== id,
      );
      const nextReceived = promoteAcceptedIncomingTransferToReceived(
        receivedTransferRecordsRef.current,
        acceptedRecord,
        acceptResponse,
      );
      markIncomingTransferLocallyResolved(id);
      await syncWalletAfterTransferAction({
        incomingTransfers: nextIncoming,
        receivedTransfers: nextReceived,
      });
      refreshReceivedTransferRowsFromRefs();
    };
    const completeMyTicketsAccept = async (acceptResponse: unknown) => {
      const nextIncoming = incomingTransferRecordsRef.current.filter(
        (transfer) => String(transfer.id ?? "") !== id,
      );
      const nextReceived = promoteAcceptedIncomingTransferToReceived(
        receivedTransferRecordsRef.current,
        acceptedRecord,
        acceptResponse,
      );
      markIncomingTransferLocallyResolved(id);
      await syncWalletAfterTransferAction({
        incomingTransfers: nextIncoming,
        receivedTransfers: nextReceived,
      });
      await reloadWalletEventsAndIncoming({ fresh: true });
      if (
        isSeasonPassIncomingTransfer(acceptedRecord) &&
        !walletOrdersIncludeAcceptedPassPackage(
          walletOrdersRef.current,
          acceptedRecord,
          acceptResponse,
        )
      ) {
        await promoteAcceptedIncomingPassToWallet(
          id,
          acceptedRecord,
          acceptResponse,
          { ordersAndPassesOnly: true },
        );
      }
      setConfirmAccept(null);
      flashToast("Transfer accepted");
    };
    try {
      const res = await acceptIncomingTransfers({ transferId: id });
      const alreadyClaimed = parseAcceptTransferApiResponse(res);
      if (alreadyClaimed) {
        setConfirmAcceptError(alreadyClaimed);
        await dropPendingTransfer(res?.data);
        return;
      }
      if (source === "wallet-access") {
        await promoteAcceptedIncomingAccessPassToWallet(
          id,
          acceptedRecord,
          res?.data,
        );
        setConfirmAccept(null);
        flashToast("Transfer accepted");
        return;
      }
      if (source === "wallet-upcoming" || source === "wallet-event") {
        await completeMyTicketsAccept(res?.data);
        return;
      }
      if (
        source === "transfers-received" &&
        isSeasonPassIncomingTransfer(acceptedRecord)
      ) {
        await promoteAcceptedIncomingPassToWallet(
          id,
          acceptedRecord,
          res?.data,
        );
        refreshReceivedTransferRowsFromRefs();
        setConfirmAccept(null);
        flashToast("Transfer accepted");
        return;
      }
      if (source === "transfers-received") {
        await claimAcceptedTransfer(res?.data);
        setConfirmAccept(null);
        flashToast("Transfer accepted");
        return;
      }
    } catch (err) {
      const message = parseAcceptTransferApiError(err);
      setConfirmAcceptError(message);
      if (
        isAcceptTransferAlreadyClaimedStatus(
          (err as { response?: { status?: number } }).response?.status,
        ) ||
        message === ACCEPT_TRANSFER_API_ERROR_MESSAGES.alreadyClaimed
      ) {
        await dropPendingTransfer(
          (err as { response?: { data?: unknown } }).response?.data,
        );
      }
    } finally {
      setConfirmAcceptSaving(false);
    }
  };

  const openConfirmCancel = (transfer: Sent) => {
    setConfirmCancelError("");
    setConfirmCancelSaving(false);
    setConfirmCancel(transfer);
  };

  const submitCancelTransfer = async () => {
    if (!confirmCancel?.id || confirmCancelSaving) return;
    setConfirmCancelSaving(true);
    setConfirmCancelError("");
    let resolvedCancelIdForPersist: string | number | undefined;
    const dropCancelledTransfer = async (
      resolvedTransferId?: string | number,
    ) => {
      const currentSentRecords = sentTransferRecordsRef.current;
      const cancelledRecord = findSentTransferRecordForCancel(
        currentSentRecords,
        confirmCancel,
        walletOrders,
      ) as PendingSentTransfer | undefined;
      const nextSent = removeSentTransferRecordsForCancel(
        currentSentRecords,
        confirmCancel,
        walletOrders,
      );
      const nextOrders = restoreCancelledTransferTicketsToOrders(
        walletOrders,
        cancelledRecord,
      );
      const persistIds = new Set(
        [
          cancelledRecord?.id,
          resolvedTransferId,
          confirmCancel.id,
        ]
          .map((value) => String(value ?? "").trim())
          .filter(Boolean),
      );
      for (const transferId of persistIds) {
        persistCancelledTransferRestore({
          ...(cancelledRecord ?? {}),
          id: transferId,
          orderId: cancelledRecord?.orderId,
          tickets: cancelledRecord?.tickets,
        });
      }
      await syncWalletAfterTransferAction({
        sentTransfers: nextSent,
        orders: nextOrders,
      });
      setSent(
        buildWalletSentTransferRows(
          nextSent,
          nextOrders,
          buildWalletTransferRowContext(
            nextOrders,
            nextSent,
            eventDetails,
            seasonPackagesRef.current,
          ),
        ),
      );
      await restoreSeasonPassPackageAfterCancelRef.current(
        cancelledRecord,
        confirmCancel,
      );
      if (confirmCancel.passKind === "access pass") {
        const passSnapshot = (cancelledRecord?.access_pass ??
          cancelledRecord?.accessPass ??
          cancelledRecord?.accessPassSnapshot) as AccessPassLike | undefined;
        if (passSnapshot?.uuid) {
          const summaries = buildAccessPassSummaries([passSnapshot]);
          setAccessPasses((current) =>
            mergeAccessPassSummaries(current, summaries),
          );
        }
      }
    };
    try {
      let resolvedCancelId = resolveCancelTransferIdForApi(
        confirmCancel.id,
        sentTransferRecordsRef.current,
        confirmCancel,
      );
      if (
        resolvedCancelId == null ||
        isOptimisticWalletTransferId(String(resolvedCancelId))
      ) {
        const session = getSession();
        const holderEmail = String(session?.user?.email || email);
        try {
          const sentRes = await getMySentTransfers(holderEmail, 1);
          const apiRecords = sentRes
            ? unwrapTransferRecords(sentRes.data)
            : [];
          resolvedCancelId = resolveCancelTransferIdWithSentLookup(
            confirmCancel,
            sentTransferRecordsRef.current,
            apiRecords,
          );
        } catch {
          /* fall through to could-not-cancel */
        }
      }
      if (
        resolvedCancelId == null ||
        isOptimisticWalletTransferId(String(resolvedCancelId))
      ) {
        setConfirmCancelError(CANCEL_TRANSFER_API_ERROR_MESSAGES.couldNotCancel);
        return;
      }
      resolvedCancelIdForPersist = resolvedCancelId;
      const res = await cancelMyTransfers(resolvedCancelId);
      const alreadyClaimed = parseCancelTransferApiResponse(res);
      if (alreadyClaimed) {
        setConfirmCancelError(alreadyClaimed);
        await dropCancelledTransfer(resolvedCancelId);
        return;
      }
      await dropCancelledTransfer(resolvedCancelId);
      setConfirmCancel(null);
      flashToast("Transfer cancelled");
    } catch (err) {
      if ((err as { code?: string }).code === "INVALID_TRANSFER_ID") {
        setConfirmCancelError(CANCEL_TRANSFER_API_ERROR_MESSAGES.couldNotCancel);
        return;
      }
      const message = parseCancelTransferApiError(err);
      setConfirmCancelError(message);
      if (
        isCancelTransferAlreadyClaimedStatus(
          (err as { response?: { status?: number } }).response?.status,
        ) ||
        message === CANCEL_TRANSFER_API_ERROR_MESSAGES.alreadyClaimed
      ) {
        await dropCancelledTransfer(resolvedCancelIdForPersist);
      }
    } finally {
      setConfirmCancelSaving(false);
    }
  };

  const renderAcceptTransferButton = (
    target: ConfirmAcceptTransfer,
    source: ConfirmAcceptSource,
    style?: CSSProperties,
    layout: "inline" | "footer" = "inline",
  ) => {
    const id = String(target.transferId ?? "").trim();
    if (!id) return null;
    const accepting = confirmAcceptSaving && String(confirmAccept?.transferId) === id;
    const baseStyle: CSSProperties =
      layout === "footer"
        ? {
            fontFamily: "inherit",
            flexShrink: 0,
            fontSize: fluidSize(15),
            fontWeight: 600,
            color: INK,
            background: "transparent",
            border: "none",
            borderRadius: 0,
            padding: "2px 0",
            minHeight: "auto",
            whiteSpace: "nowrap",
            cursor: confirmAcceptSaving ? "default" : "pointer",
            opacity: confirmAcceptSaving && !accepting ? 0.55 : 1,
          }
        : {
            fontFamily: "inherit",
            flexShrink: 0,
            fontSize: fluidSize(13),
            fontWeight: 600,
            color: INK,
            background: "#fff",
            border: "1px solid rgba(5,27,53,0.16)",
            borderRadius: 999,
            padding: "10px 16px",
            minHeight: 42,
            whiteSpace: "nowrap",
            cursor: confirmAcceptSaving ? "default" : "pointer",
            opacity: confirmAcceptSaving && !accepting ? 0.55 : 1,
          };
    return (
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          openConfirmAccept(target, source);
        }}
        disabled={confirmAcceptSaving}
        aria-busy={accepting || undefined}
        style={{ ...baseStyle, ...style }}
      >
        Accept transfer
      </button>
    );
  };

  const sentList = filterVisibleWalletTransferRows(sent ?? []);
  const receivedList = filterVisibleWalletTransferRows(received ?? []);

  const padX = mobile ? 18 : 22;
  const cardPad = mobile ? "14px 16px" : "16px 20px";
  const bodyPad = mobile ? "22px 18px 104px" : "40px 32px 96px";

  /* ---------- small building blocks ---------- */
  const chip = (on: boolean): React.CSSProperties => ({
    fontFamily: "inherit", flexShrink: 0, display: "flex", alignItems: "center", gap: 8, fontSize: fluidSize(14), fontWeight: 600, lineHeight: 1.5,
    whiteSpace: "nowrap", background: on ? INK : "#fff", color: on ? "#fff" : INK,
    border: `1px solid ${on ? INK : "rgba(5,27,53,0.12)"}`, borderRadius: 999,
    padding: mobile ? "13px 16px" : "10px 16px", minHeight: mobile ? 46 : undefined, cursor: "pointer",
  });
  const accentBtn: React.CSSProperties = { fontFamily: "inherit", fontSize: fluidSize(14), fontWeight: 600, color: INK, background: ACCENT, border: "none", borderRadius: 999, padding: "13px 20px", cursor: "pointer" };
  const ghostBtn: React.CSSProperties = { fontFamily: "inherit", fontSize: fluidSize(14), fontWeight: 600, color: INK, background: "#fff", border: "1px solid rgba(5,27,53,0.14)", borderRadius: 999, padding: "13px 20px", cursor: "pointer" };
  const backBtn: React.CSSProperties = { fontFamily: "inherit", alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 8, fontSize: fluidSize(14), lineHeight: 1.5, fontWeight: 600, color: INK, background: "#fff", border: "1px solid rgba(5,27,53,0.12)", borderRadius: 999, padding: "9px 16px 9px 12px", cursor: "pointer" };
  const mobileEventBackBtn: React.CSSProperties = {
    fontFamily: "inherit",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    borderRadius: 999,
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.22)",
    color: "#fff",
    cursor: "pointer",
  };
  const BackArrow = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>);


  /* ---------- header ---------- */
  const onTickets = displaySection === "events";
  const navDefs = WALLET_NAV.map((item) => ({
    ...item,
    on: item.id === "events" ? onTickets : displaySection === item.id,
  }));
  const authed = screen !== "login" && screen !== "code";
  const showHeader = !(mobileTicketView && showingEventDetail);
  const showTabBar =
    mobile &&
    authed &&
    !showingEventDetail &&
    !showingSeasonPackage &&
    !showingAccessPass;

  const Header = () => (
    <WalletChrome
      items={navDefs.map((n) => ({
        id: n.id,
        label: n.label,
        href: n.href,
        on: n.on,
      }))}
      showNav={authed}
      showHeader
      showTabBar={showTabBar}
      compact={mobile}
    />
  );

  /* ---------- login ---------- */
  const Login = () => (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: mobile ? "32px 18px 56px" : "64px 32px 80px", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ width: 76, height: 76, borderRadius: 999, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 13, boxSizing: "border-box", marginBottom: 6, boxShadow: "0 1px 2px rgba(5,27,53,0.05), 0 10px 24px -14px rgba(5,27,53,0.34)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="New Mexico State Athletics" style={{ maxWidth: "100%", maxHeight: "100%", display: "block" }} />
          </div>
          <div style={eyebrow}>NM State Athletics · Season ticket account</div>
          <h1 style={{ margin: 0, fontSize: fluidSize(42), fontWeight: 600, letterSpacing: "-0.03em", lineHeight: browseLeading("h2") }}>Welcome Aggie Nation!</h1>
          <p style={{ margin: 0, fontSize: fluidSize(15), lineHeight: browseLeading("body"), color: SUB }}>Sign in to the email on your NM State season ticket account and we&apos;ll send a six-digit code. No password to remember.</p>
        </div>
        <form
          noValidate
          style={{ ...card, borderRadius: 24, boxShadow: "0 1px 2px rgba(5,27,53,0.05), 0 20px 46px -22px rgba(5,27,53,0.45)", padding: 22, display: "flex", flexDirection: "column", gap: 14 }}
          onSubmit={(e) => {
            e.preventDefault();
            setScreen("code");
            setCode("");
          }}
        >
          <label style={{ fontSize: fluidSize(12), fontWeight: 600, color: FAINT }}>Email address</label>
          <input ref={autoFocusField} name="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" style={{ fontFamily: "inherit", width: "100%", boxSizing: "border-box", fontSize: fluidSize(16), color: INK, background: "#fff", border: "1px solid rgba(5,27,53,0.12)", borderRadius: 14, padding: "15px 16px", outline: "none" }} />
          <button type="submit" style={{ fontFamily: "inherit", width: "100%", fontSize: fluidSize(15), fontWeight: 600, color: INK, background: ACCENT, border: "none", borderRadius: 999, padding: 16, cursor: "pointer" }}>Send my code</button>
          <div style={{ fontSize: fluidSize(12), lineHeight: browseLeading("body"), color: MUTE, textAlign: "center" }}>By continuing you agree to the Blocktickets terms and privacy policy.</div>
        </form>
      </div>
    </div>
  );

  /* ---------- code ---------- */
  const CodeScreen = () => (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: mobile ? "32px 18px 56px" : "64px 32px 80px", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 22 }}>
        <button onClick={() => setScreen("login")} style={backBtn}><BackArrow />Back</button>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h1 style={{ margin: 0, fontSize: fluidSize(42), fontWeight: 600, letterSpacing: "-0.03em", lineHeight: browseLeading("h2") }}>Enter your code</h1>
          <p style={{ margin: 0, fontSize: fluidSize(15), lineHeight: browseLeading("body"), color: SUB }}>Sent to <strong style={{ fontWeight: 600, color: INK }}>{email}</strong></p>
        </div>
        <div style={{ ...card, borderRadius: 24, padding: 22, display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
            {CODE_BOXES.map((i) => (
              <input key={i} ref={setCodeRef[i]} value={code[i] || ""} inputMode="numeric" autoComplete="one-time-code"
                aria-label={i === 0 ? "Six-digit code" : `Digit ${i + 1} of 6`}
                onChange={(e) => typeCodeBox(i, e.target.value)}
                onKeyDown={(e) => moveCodeBox(i, e)}
                onFocus={(e) => e.currentTarget.select()}
                style={{ fontFamily: "inherit", width: "100%", boxSizing: "border-box", height: mobile ? 54 : 60, border: "1px solid rgba(5,27,53,0.12)", background: "#fff", borderRadius: 14, textAlign: "center", fontSize: fluidSize(22), fontWeight: 600, fontVariantNumeric: "tabular-nums", color: INK, outline: "none" }} />
              ))}
            </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, fontSize: fluidSize(13), color: MUTE, textAlign: "center" }}>
            <div>Codes expire after 10 minutes, so be sure to use the right one.</div>
            <div>Haven&apos;t received your code? Check your spam folder or <a href="#" style={{ color: INK, fontWeight: 600 }}>Send a new code</a></div>
          </div>
        </div>
      </div>
    </div>
  );

  const TicketIcon = () => (
    <Ticket width={14} height={14} strokeWidth={1.8} aria-hidden />
  );

  /* ---------- My Tickets (events list) ---------- */
  const incomingPassPackages = summarizeIncomingPassPackageTransfers(eventDetails);
  const incomingAccessPasses = summarizeIncomingAccessPassTransfers(eventDetails);
  const visibleAccessPasses = filterAccessPassSummariesBySentTransfers(
    accessPasses,
    sentTransferRecords,
  );
  const showDemoSchedule =
    eventsChecked &&
    isHolder &&
    upcomingEvents.length === 0 &&
    seasonPackages.length === 0 &&
    flexPacks.length === 0 &&
    visibleAccessPasses.length === 0 &&
    incomingAccessPasses.length === 0 &&
    !eventsLoading;
  const listPending = !eventsChecked || eventsLoading;
  const upcomingCount = upcomingEvents.length;
  const seasonCount =
    seasonPackages.length +
    incomingPassPackages.length +
    (showDemoSchedule ? 1 : 0);
  const tabDefs = [
    { id: "upcoming" as const, label: "Upcoming", n: upcomingCount },
    { id: "season" as const, label: "Packages", n: seasonCount },
    { id: "flex" as const, label: "Flex packs", n: flexPacks.length + (showDemoSchedule ? 1 : 0) },
    {
      id: "access" as const,
      label: "Access passes",
      n: visibleAccessPasses.length + incomingAccessPasses.length,
    },
  ];
  const selectedSeasonPackage =
    routedSeasonPackage ??
    seasonPackages.find((pkg) => pkg.key === seasonPackageKey) ??
    null;
  const activePackageKey = selectedSeasonPackage?.key ?? seasonPackageKey;
  const seasonPackageGames = selectedSeasonPackage
    ? summarizeEventDetails(
        Object.fromEntries(
          Object.entries(eventDetails).filter(
            ([key, detail]) =>
              (!selectedSeasonPackage.orderId ||
                detail.orderId === selectedSeasonPackage.orderId) &&
              (selectedSeasonPackage.packageUUID
                ? key.startsWith(`${selectedSeasonPackage.packageUUID}:`)
                : key.startsWith(`${activePackageKey}:`)),
          ),
        ),
        "schedule",
      )
    : [];
  const selectedPackagePasses = activePackageKey
    ? packageAccessPasses[activePackageKey] ?? []
    : [];
  const visiblePackagePasses = useMemo(
    () =>
      sortAccessPassSummaries(
        filterAccessPassSummariesBySentTransfers(
          selectedPackagePasses,
          sentTransferRecords,
        ),
      ),
    [selectedPackagePasses, sentTransferRecords],
  );
  const prevVisiblePackagePassCount = useRef(0);
  useEffect(() => {
    const count = visiblePackagePasses.length;
    if (
      prevVisiblePackagePassCount.current === 0 &&
      count > 0 &&
      activePackageKey &&
      !routedEventUUID
    ) {
      setPackageView("pass");
    }
    prevVisiblePackagePassCount.current = count;
  }, [activePackageKey, routedEventUUID, visiblePackagePasses.length]);
  // The routed order id is the one the shopper opened; the summary falls back
  // to the order record id, which /access-passes/by-order cannot resolve.
  const selectedPackageOrderId =
    routedOrderId || selectedSeasonPackage?.orderId || "";

  const reloadPackagePasses = useCallback(
    async (
      key: string,
      orderId: string,
      options?: { force?: boolean },
    ) => {
      if (!key || !orderId) return;
      if (options?.force) {
        delete packagePassRequested.current[key];
        delete packagePassAttempts.current[key];
        const retryTimer = packagePassRetryTimers.current[key];
        if (retryTimer) {
          clearTimeout(retryTimer);
          delete packagePassRetryTimers.current[key];
        }
      } else if (packagePassRequested.current[key]) {
        return;
      }
      packagePassRequested.current[key] = true;

      try {
        const res = await getAccessPassesByOrder(orderId);
        const rawPasses = unwrapAccessPassList(res.data);
        const owned = filterWalletAccessPassesBySentTransfers(
          rawPasses,
          sentTransferRecordsRef.current,
        );
        const packageOrder = walletOrdersRef.current.find(
          (row) =>
            String(row.orderId || "") === orderId ||
            String(row.id || "") === orderId,
        );
        const passes = buildAccessPassSummaries(owned, {
          includeInactive: true,
          packageEvents: packageOrder?.package?.events,
        }).map((pass) => ({ ...pass, orderId: pass.orderId || orderId }));
        setPackageAccessPasses((current) => ({
          ...current,
          [key]: mergeAccessPassSummaries(current[key] ?? [], passes),
        }));
      } catch {
        /* keep cached passes when the fetch fails or lags behind a cancel */
        const attempts = (packagePassAttempts.current[key] ?? 0) + 1;
        packagePassAttempts.current[key] = attempts;
        if (attempts >= PACKAGE_PASS_ATTEMPTS) return;
        // A dropped request must not hide the pass for the rest of the session.
        packagePassRetryTimers.current[key] = setTimeout(() => {
          delete packagePassRetryTimers.current[key];
          delete packagePassRequested.current[key];
          setPackagePassChecked((current) => {
            const next = { ...current };
            delete next[key];
            return next;
          });
          setPackagePassRetryTick((tick) => tick + 1);
        }, PACKAGE_PASS_RETRY_MS);
      } finally {
        setPackagePassChecked((current) => ({ ...current, [key]: true }));
      }
    },
    [email],
  );

  const closeTransferModal = useCallback(async () => {
    setTf(null);
  }, []);

  const restoreSeasonPassPackageAfterCancel = useCallback(
    async (
      cancelledRecord?: PendingSentTransfer | null,
      cancelRow?: Sent | null,
    ) => {
      const passSnapshot = (cancelledRecord?.access_pass ??
        cancelledRecord?.accessPass ??
        cancelledRecord?.accessPassSnapshot) as AccessPassLike | undefined;
      const passType = String(passSnapshot?.type ?? "")
        .trim()
        .toLowerCase();
      const isSeasonPass =
        cancelRow?.passKind === "season pass" ||
        (cancelledRecord?.transferType === "access_pass" &&
          (passType === "package" || passType === "season_seat"));
      if (!isSeasonPass) return;

      const orderId = String(
        cancelledRecord?.orderId ?? passSnapshot?.orderId ?? "",
      ).trim();
      if (!orderId) return;

      const pkg = seasonPackagesRef.current.find(
        (row) =>
          row.orderId === orderId ||
          row.key === orderId ||
          String(row.packageUUID || "") === String(routedPackageUUID || ""),
      );
      const packageKey = pkg?.key ?? orderId;
      const packageOrderId = pkg?.orderId ?? orderId;
      const packageOrder = walletOrdersRef.current.find(
        (row) =>
          String(row.orderId || "") === packageOrderId ||
          String(row.id || "") === packageOrderId,
      );

      if (passSnapshot?.uuid) {
        const summaries = buildAccessPassSummaries([passSnapshot], {
          includeInactive: true,
          packageEvents: packageOrder?.package?.events,
        }).map((pass) => ({
          ...pass,
          orderId: pass.orderId || packageOrderId,
        }));
        packagePassRequested.current[packageKey] = true;
        setPackageAccessPasses((current) => ({
          ...current,
          [packageKey]: mergeAccessPassSummaries(
            current[packageKey] ?? [],
            summaries,
          ),
        }));
        setPackagePassChecked((current) => ({
          ...current,
          [packageKey]: true,
        }));
      }

      setPackageView("pass");
    },
    [routedPackageUUID],
  );
  restoreSeasonPassPackageAfterCancelRef.current =
    restoreSeasonPassPackageAfterCancel;

  useEffect(() => {
    const key = selectedSeasonPackage?.key;
    const orderId = selectedPackageOrderId;
    if (routedEventUUID || !key || !orderId) return;
    if (walletOrdersLocallyMutatedRef.current) return;
    const cachedPasses = packageAccessPasses[key] ?? [];
    if (
      cachedPasses.length > 0 &&
      filterAccessPassSummariesBySentTransfers(
        cachedPasses,
        sentTransferRecordsRef.current,
      ).length === 0
    ) {
      return;
    }
    void reloadPackagePasses(key, orderId);
  }, [
    packageAccessPasses,
    packagePassRetryTick,
    reloadPackagePasses,
    routedEventUUID,
    selectedPackageOrderId,
    selectedSeasonPackage?.key,
    sentTransferRecords,
  ]);

  useEffect(
    () => () => {
      for (const timer of Object.values(packagePassRetryTimers.current)) {
        clearTimeout(timer);
      }
      packagePassRetryTimers.current = {};
    },
    [],
  );

  const loadFullOrder = useCallback(async (orderId: string) => {
    try {
      const order = unwrapOrder((await getOrder(orderId)).data);
      if (order) {
        setFullOrders((current) => ({ ...current, [orderId]: order }));
      }
    } catch {
      // Screens fall back to what the wallet list returned for the order.
    } finally {
      setFullOrderChecked((current) => ({ ...current, [orderId]: true }));
    }
  }, []);

  useEffect(() => {
    if (!activeOrderId || fullOrderChecked[activeOrderId]) return;
    void loadFullOrder(activeOrderId);
  }, [activeOrderId, fullOrderChecked, loadFullOrder]);

  useEffect(() => {
    // The pass card names its holder from the order record, which the wallet
    // list endpoint leaves out, so the package screen fetches the order too.
    if (
      !selectedPackageOrderId ||
      selectedPackageOrderId === activeOrderId ||
      fullOrderChecked[selectedPackageOrderId]
    ) {
      return;
    }
    void loadFullOrder(selectedPackageOrderId);
  }, [
    activeOrderId,
    fullOrderChecked,
    loadFullOrder,
    selectedPackageOrderId,
  ]);

  const DetailLoader = () => <WalletTicketsBlocksLoading routeDestination />;
  const pillCountStyle = (on: boolean): React.CSSProperties => ({
    fontSize: fluidSize(12),
    fontWeight: 500,
    lineHeight: 1.5,
    fontVariantNumeric: "tabular-nums",
    minWidth: "2ch",
    textAlign: "center",
    visibility: listPending ? "hidden" : "visible",
    color: on ? "rgba(255,255,255,0.72)" : MUTE,
  });
  const pillCount = (n: number, on: boolean) => (
    <span aria-hidden={listPending || undefined} style={pillCountStyle(on)}>
      {listPending ? "" : n}
    </span>
  );

  const RoutedEventShell = (
    children: React.ReactNode,
    { showBack = true }: { showBack?: boolean } = {},
  ) => (
    <div style={{ maxWidth: 1100, margin: "0 auto", boxSizing: "border-box", padding: mobile ? "24px 16px 128px" : "40px 32px 96px", display: "flex", flexDirection: "column", gap: 18 }}>
      {showBack ? (
        <Link href={walletSectionHref("events")} style={{ ...backBtn, textDecoration: "none" }}><BackArrow />All tickets</Link>
      ) : null}
      {children}
    </div>
  );

  const RoutedEventMissing = () =>
    RoutedEventShell(
      <div style={{ ...card, borderRadius: 20, padding: mobile ? "28px 20px" : "40px 32px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: fluidSize(16), fontWeight: 600, letterSpacing: "-0.02em" }}>
          {routedAccessPassUUID
            ? "We couldn't find that access pass"
            : routedPackageUUID && !routedEventUUID
            ? "We couldn't find that package"
            : flexPackUUID && !eventUUID
            ? "We couldn't find that flex pack"
            : "Order not found"}
        </div>
        <div style={{ fontSize: fluidSize(14), color: SUB }}>
          {routedAccessPassUUID
            ? "This access pass isn't in your wallet. Go back to see all of your tickets."
            : routedPackageUUID && !routedEventUUID
            ? "This package isn't in your wallet. Go back to see all of your tickets."
            : flexPackUUID && !eventUUID
            ? "This flex pack isn't in your wallet. Go back to see all of your tickets."
            : "This event isn't in your wallet. Go back to see all of your tickets."}
        </div>
      </div>,
    );

  const openSeasonPackage = (key: string) => {
    setSeasonPackageKey(key);
    setScreen("seasonPackage");
  };

  const openFlexPack = (key: string | null) => {
    setFlexPackKey(key);
    setScreen("package");
  };

  const IncomingPassPackageRow = ({ row }: { row: CartEventSummary }) => {
    const gameCount = row.passEventCount ?? 0;
    const packageRowLayout = {
      position: "relative" as const,
      overflow: "hidden" as const,
      minHeight: mobile ? 124 : undefined,
      boxSizing: "border-box" as const,
      padding: cardPad,
      paddingRight: mobile ? 112 : 240,
      display: "flex",
      alignItems: "center",
      gap: mobile ? 14 : 18,
      color: "inherit",
    };
    const body = (
      <>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: fluidSize(12), fontWeight: 600, color: SUB }}>
            {gameCount} {gameCount === 1 ? "game" : "games"}
          </div>
          <div style={{ fontSize: mobile ? fluidSize(15) : 17, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis" }}>
            {row.name}
          </div>
          {!mobile && row.venueLine ? (
            <div style={{ fontSize: fluidSize(13), color: SUB, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {row.venueLine}
            </div>
          ) : null}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
            <SeasonTicketsBadge />
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: mobile ? 124 : 268,
            background: row.thumb
              ? `url(${row.thumb}) center/cover no-repeat`
              : CRIMSON,
            clipPath: `polygon(${mobile ? "14%" : "17%"} 0, 100% 0, 100% 100%, 0 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: `14px 14px 14px ${mobile ? 24 : 46}px`,
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          {!row.thumb ? (
            <span style={{ position: "relative", fontSize: fluidSize(17), fontWeight: 600, letterSpacing: "0.06em", color: "rgba(255,255,255,0.94)", whiteSpace: "nowrap" }}>
              SEASON
            </span>
          ) : null}
        </div>
      </>
    );

    return (
      <div
        style={{
          ...card,
          borderRadius: 20,
          overflow: "hidden",
          color: "inherit",
        }}
      >
        <div
          style={{
            padding: mobile ? "12px 16px" : "12px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            fontSize: fluidSize(12),
            fontWeight: 600,
            color: "#c07a12",
            borderBottom: "1px solid rgba(192,122,18,0.14)",
            background: "#fffaf2",
          }}
        >
          <span
            style={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {`Pending transfer from ${row.incomingTransferFrom || "Someone"}`}
          </span>
          {row.ticketSeats?.length ? (
            <StackedSeatLines
              lines={row.ticketSeats}
              style={{
                minWidth: 0,
                fontWeight: 500,
                color: "#9a7028",
              }}
            />
          ) : null}
        </div>
        <div
          style={{
            ...packageRowLayout,
            cursor: "default",
            ...(mobile
              ? {
                  minHeight: undefined,
                  alignItems: "flex-start",
                  padding: "10px 16px 14px",
                  paddingRight: 112,
                }
              : {}),
          }}
        >
          {body}
        </div>
        <div
          style={{
            borderTop: "1px solid rgba(5,27,53,0.08)",
            padding: mobile ? "12px 16px" : "12px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#fff",
          }}
        >
          {renderAcceptTransferButton(acceptTargetFromUpcoming(row), "wallet-upcoming", {
            width: "100%",
            textAlign: "center",
          }, "footer")}
        </div>
      </div>
    );
  };

  const IncomingAccessPassRow = ({ row }: { row: CartEventSummary }) => {
    const eventCount = row.passEventCount ?? row.incomingAccessPass?.eventCount ?? 0;
    const remainingCount =
      row.passRemainingCount ??
      row.incomingAccessPass?.eventCount ??
      eventCount;
    const fallbackPass: AccessPassSummary = row.incomingAccessPass ?? {
      key: row.key,
      pass: {},
      name: row.name,
      typeLabel: "All-access pass",
      checkInCode: "",
      seat: "",
      eventCount,
      attendedCount: Math.max(0, eventCount - remainingCount),
      season: "",
      status: "Active",
      validThrough: "",
      events: [],
      artwork: row.thumb,
    };
    const sibling = visibleAccessPasses.find(
      (owned) => owned.name === fallbackPass.name,
    );
    const pass: AccessPassSummary = {
      ...fallbackPass,
      backgroundColor:
        fallbackPass.backgroundColor || sibling?.backgroundColor || CRIMSON,
    };
    return (
      <div
        style={{
          ...card,
          borderRadius: 20,
          overflow: "hidden",
          color: "inherit",
          cursor: "default",
        }}
      >
        <div
          style={{
            padding: mobile ? "12px 16px" : "12px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            fontSize: fluidSize(12),
            fontWeight: 600,
            color: "#c07a12",
            borderBottom: "1px solid rgba(192,122,18,0.14)",
            background: "#fffaf2",
          }}
        >
          <span
            style={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {`Pending transfer from ${row.incomingTransferFrom || "Someone"}`}
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: mobile ? "1fr" : "minmax(220px, 0.8fr) 1.2fr",
          }}
        >
          <AccessPassCardBody row={pass} hideEventCount />
        </div>
        <div
          style={{
            borderTop: "1px solid rgba(5,27,53,0.08)",
            padding: mobile ? "12px 16px" : "12px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#fff",
          }}
        >
          {renderAcceptTransferButton(
            acceptTargetFromUpcoming(row),
            "wallet-access",
            {
              width: "100%",
              textAlign: "center",
            },
            "footer",
          )}
        </div>
      </div>
    );
  };

  const SeasonPackageRow = ({ row }: { row: SeasonPackageSummary }) => {
    const href = walletPackagePath(row.orderId, row.packageUUID);
    const rowStyle = {
        ...card,
        borderRadius: 20,
      position: "relative" as const,
      overflow: "hidden" as const,
        minHeight: mobile ? 124 : undefined,
      boxSizing: "border-box" as const,
        padding: cardPad,
        paddingRight: mobile ? 112 : 240,
        display: "flex",
        alignItems: "center",
        gap: mobile ? 14 : 18,
      cursor: "pointer" as const,
      color: "inherit",
      textDecoration: "none",
    };
    const body = (
      <>
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: fluidSize(12), fontWeight: 600, color: SUB }}>
          {row.eventCount} {row.eventCount === 1 ? "game" : "games"}
        </div>
        <div style={{ fontSize: mobile ? fluidSize(15) : 17, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis" }}>
          {row.name}
        </div>
        {!mobile && row.venueLine ? (
          <div style={{ fontSize: fluidSize(13), color: SUB, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {row.venueLine}
          </div>
        ) : null}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
          <span style={{ fontSize: fluidSize(12), fontWeight: 600, color: INK, border: "1px solid rgba(5,27,53,0.16)", borderRadius: 8, padding: "5px 10px", whiteSpace: "nowrap" }}>
            Season tickets
          </span>
          {row.fullyTransferred || row.ticketCount > 0 ? (
            <span
              style={
                row.fullyTransferred
                  ? walletAvailabilityBadgeStyle("transferred")
                  : {
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: fluidSize(12),
                      fontWeight: 600,
                      color: INK,
                      border: "1px solid rgba(5,27,53,0.16)",
                      borderRadius: 8,
                      padding: "5px 10px",
                      whiteSpace: "nowrap",
                    }
              }
            >
              {row.fullyTransferred ? null : <TicketIcon />}
              {formatPackageRemainingTicketsLabel(
                row.ticketCount,
                row.fullyTransferred,
              )}
            </span>
          ) : null}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: mobile ? 124 : 268,
          background: row.thumb
            ? `url(${row.thumb}) center/cover no-repeat`
            : CRIMSON,
          clipPath: `polygon(${mobile ? "14%" : "17%"} 0, 100% 0, 100% 100%, 0 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: `14px 14px 14px ${mobile ? 24 : 46}px`,
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {!row.thumb ? (
          <span style={{ position: "relative", fontSize: fluidSize(17), fontWeight: 600, letterSpacing: "0.06em", color: "rgba(255,255,255,0.94)", whiteSpace: "nowrap" }}>
            SEASON
          </span>
        ) : null}
      </div>
      </>
    );
    if (href) {
      return (
        <Link href={href} style={rowStyle}>
          {body}
        </Link>
      );
    }
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => openSeasonPackage(row.key)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openSeasonPackage(row.key);
          }
        }}
        style={rowStyle}
      >
        {body}
    </div>
  );
  };

  const FlexPackRow = ({ row }: { row: FlexPackSummary }) => {
    const href = walletFlexPackPath(row.orderId, row.flexPackUUID);
    const rowStyle = {
      ...card,
      borderRadius: 20,
      position: "relative" as const,
      overflow: "hidden" as const,
      minHeight: mobile ? 124 : undefined,
      boxSizing: "border-box" as const,
      padding: cardPad,
      paddingRight: mobile ? 112 : 240,
      display: "flex",
      alignItems: "center",
      gap: mobile ? 14 : 18,
      cursor: "pointer" as const,
      color: "inherit",
      textDecoration: "none",
    };
    const body = (
      <>
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 5, flex: 1, lineHeight: 1.5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: fluidSize(12), fontWeight: 600, color: SUB }}>
          {row.remainingCount} of {row.voucherCount} {row.voucherCount === 1 ? "voucher" : "vouchers"} left
        </div>
        <div style={{ fontSize: mobile ? fluidSize(15) : 17, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis" }}>
          {row.name}
        </div>
        {!mobile && row.venueLine ? (
          <div style={{ fontSize: fluidSize(13), color: SUB, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {row.venueLine}
          </div>
        ) : null}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
          <span style={{ fontSize: fluidSize(12), fontWeight: 600, color: INK, border: "1px solid rgba(5,27,53,0.16)", borderRadius: 8, padding: "5px 10px", whiteSpace: "nowrap" }}>
            Flex pack
          </span>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: mobile ? 124 : 268,
          background: row.thumb
            ? `url(${row.thumb}) center/cover no-repeat`
            : CRIMSON,
          clipPath: `polygon(${mobile ? "14%" : "17%"} 0, 100% 0, 100% 100%, 0 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: `14px 14px 14px ${mobile ? 24 : 46}px`,
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {!row.thumb ? (
          <span style={{ position: "relative", fontSize: 17, fontWeight: 600, letterSpacing: "0.06em", lineHeight: 1.5, color: "rgba(255,255,255,0.94)", whiteSpace: "nowrap" }}>
            FLEX
          </span>
        ) : null}
      </div>
      </>
    );
    if (href) {
      return (
        <Link href={href} style={rowStyle}>
          {body}
        </Link>
      );
    }
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => openFlexPack(row.key)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openFlexPack(row.key);
          }
        }}
        style={rowStyle}
      >
        {body}
      </div>
    );
  };

  const DemoSeasonPackageRow = () => (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openSeasonPackage("demo")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openSeasonPackage("demo");
        }
      }}
      style={{ ...card, borderRadius: 20, position: "relative", overflow: "hidden", minHeight: mobile ? 124 : undefined, boxSizing: "border-box", padding: cardPad, paddingRight: mobile ? 112 : 240, display: "flex", alignItems: "center", gap: mobile ? 14 : 18, cursor: "pointer" }}
    >
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: fluidSize(12), fontWeight: 600, color: SUB }}>6 games</div>
        <div style={{ fontSize: mobile ? fluidSize(15) : 17, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.2 }}>NMS Football Season Seats</div>
        {!mobile && <div style={{ fontSize: fluidSize(13), color: SUB }}>Aggie Memorial Stadium · Las Cruces, NM</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
          <span style={{ fontSize: fluidSize(12), fontWeight: 600, color: INK, border: "1px solid rgba(5,27,53,0.16)", borderRadius: 8, padding: "5px 10px", whiteSpace: "nowrap" }}>Season tickets</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: fluidSize(12), fontWeight: 600, color: INK, border: "1px solid rgba(5,27,53,0.16)", borderRadius: 8, padding: "5px 10px", whiteSpace: "nowrap" }}>
            <TicketIcon />2
          </span>
        </div>
      </div>
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: mobile ? 124 : 268, background: CRIMSON, clipPath: `polygon(${mobile ? "14%" : "17%"} 0, 100% 0, 100% 100%, 0 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: `14px 14px 14px ${mobile ? 24 : 46}px`, boxSizing: "border-box" }}>
        <span style={{ position: "relative", fontSize: fluidSize(17), fontWeight: 600, letterSpacing: "0.06em", color: "rgba(255,255,255,0.94)", whiteSpace: "nowrap" }}>SEASON</span>
      </div>
    </div>
  );

  const openOrderEvent = (key: string) => {
    setEvId(`order:${key}`);
    setScreen("event");
  };

  const UpcomingEventRow = ({
    row,
    packageUUID,
  }: {
    row: CartEventSummary;
    packageUUID?: string;
  }) => {
    const available = row.availability === "available";
    const pendingIncoming = row.pendingIncomingTransfer === true;
    const incomingPass = row.incomingPassTransfer === true;
    const passEventCountLabel = incomingPassEventCountLabel(row.passEventCount);
    const orderNavReady = Boolean(row.orderId);
    const href = packageUUID
      ? orderNavReady
        ? walletPackageEventPath(row.orderId, packageUUID, row.eventUUID)
        : ""
      : orderNavReady
        ? walletEventTicketsPath(row.orderId)
        : "";
    const eventRowLayout = {
      position: "relative" as const,
      overflow: "hidden" as const,
      minHeight: mobile ? 124 : undefined,
      boxSizing: "border-box" as const,
      padding: cardPad,
      paddingRight: mobile ? 112 : 240,
      display: "flex",
      alignItems: "center",
      gap: mobile ? 14 : 18,
      color: "inherit",
      textDecoration: "none",
    };
    const rowStyle = {
      ...card,
      borderRadius: 20,
      ...eventRowLayout,
      cursor:
        available && !pendingIncoming
          ? ("pointer" as const)
          : ("default" as const),
    };
    const body = (
      <>
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
        <EventScheduleMeta
          today={incomingPass ? false : row.today}
          scheduleLine={
            incomingPass && passEventCountLabel
              ? passEventCountLabel
              : walletEventScheduleLine(row)
          }
        />
        <div style={{ fontSize: mobile ? fluidSize(15) : 17, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis" }}>
          {row.name}
        </div>
        {!incomingPass && !mobile && row.venueLine ? (
          <div style={{ fontSize: fluidSize(13), lineHeight: 1.5, color: SUB, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {row.venueLine}
          </div>
        ) : null}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
          {available ? (
            incomingPass && passEventCountLabel ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: fluidSize(12), fontWeight: 600, lineHeight: 1.5, color: INK, border: "1px solid rgba(5,27,53,0.16)", borderRadius: 8, padding: "5px 10px", whiteSpace: "nowrap", alignSelf: "flex-start" }}>
                {passEventCountLabel}
              </span>
            ) : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: fluidSize(12), fontWeight: 600, lineHeight: 1.5, color: INK, border: "1px solid rgba(5,27,53,0.16)", borderRadius: 8, padding: "5px 10px", whiteSpace: "nowrap", alignSelf: "flex-start" }}>
              <TicketIcon />
            {row.ticketCount} {row.ticketCount === 1 ? "ticket" : "tickets"}
          </span>
            )
          ) : (
            <span
              style={walletAvailabilityBadgeStyle(
                walletAvailabilityBadgeKind(row.availability, row.availabilityBadge) ||
                  "transferred",
              )}
            >
              {upcomingAvailabilityLabel(row.availability, row.availabilityBadge) ||
                "Transferred"}
            </span>
          )}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: mobile ? 124 : 268,
          background: row.thumb
            ? `url(${row.thumb}) center/cover no-repeat`
            : CRIMSON,
          clipPath: `polygon(${mobile ? "14%" : "17%"} 0, 100% 0, 100% 100%, 0 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: `14px 14px 14px ${mobile ? 24 : 46}px`,
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {!row.thumb ? (
          <span style={{ position: "relative", fontSize: fluidSize(17), fontWeight: 600, letterSpacing: "0.06em", color: "rgba(255,255,255,0.94)", whiteSpace: "nowrap" }}>
            EVENT
          </span>
        ) : null}
      </div>
      </>
    );
    if (pendingIncoming) {
      return (
        <div
          style={{
            ...card,
            borderRadius: 20,
            overflow: "hidden",
            color: "inherit",
          }}
        >
          <div
            style={{
              padding: mobile ? "12px 16px" : "12px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              fontSize: fluidSize(12),
              fontWeight: 600,
              color: "#c07a12",
              borderBottom: "1px solid rgba(192,122,18,0.14)",
              background: "#fffaf2",
            }}
          >
            <span
              style={{
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {`Pending transfer from ${row.incomingTransferFrom || "Someone"}`}
            </span>
            {row.ticketSeats?.length ? (
              <StackedSeatLines
                lines={row.ticketSeats}
                style={{
                  minWidth: 0,
                  fontWeight: 500,
                  color: "#9a7028",
                }}
              />
            ) : null}
          </div>
          <div
            style={{
              ...eventRowLayout,
              cursor: "default",
              ...(mobile
                ? {
                    minHeight: undefined,
                    alignItems: "flex-start",
                    padding: "10px 16px 14px",
                    paddingRight: 112,
                  }
                : {}),
            }}
          >
            {body}
          </div>
          {pendingIncoming && incomingPass ? (
            <div
              style={{
                borderTop: "1px solid rgba(5,27,53,0.08)",
                padding: mobile ? "10px 16px 12px" : "10px 18px 12px",
                background: "#fff",
              }}
            >
              <SeasonTicketsBadge />
            </div>
          ) : null}
          <div
            style={{
              borderTop: "1px solid rgba(5,27,53,0.08)",
              padding: mobile ? "12px 16px" : "12px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#fff",
            }}
          >
            {renderAcceptTransferButton(acceptTargetFromUpcoming(row), "wallet-upcoming", {
              width: "100%",
              textAlign: "center",
            }, "footer")}
          </div>
        </div>
      );
    }
    if (available && href) {
      return (
        <Link href={href} aria-label={`View ${row.name}`} style={rowStyle}>
          {body}
        </Link>
      );
    }
    if (!available) {
      return <div style={rowStyle}>{body}</div>;
    }
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => openOrderEvent(row.key)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openOrderEvent(row.key);
          }
        }}
        style={rowStyle}
      >
        {body}
      </div>
    );
  };

  const AccessPassCardBody = ({
    row,
    hideEventCount = false,
  }: {
    row: AccessPassSummary;
    hideEventCount?: boolean;
  }) => {
    const nextEventWhen = row.nextEvent
      ? eventWhenLabel(row.nextEvent, row.nextEvent.venue?.timezone)
      : "";
    const foreground = row.fontColor || "#ffffff";
    return (
      <>
        <div
          style={{
            minHeight: mobile ? 150 : 190,
            padding: mobile ? 20 : 24,
            color: foreground,
            background: row.backgroundColor || INK,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 18,
          }}
        >
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            {row.artwork ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.artwork}
                alt=""
                style={{ width: 58, height: 58, borderRadius: 12, objectFit: "contain", background: "#fff", padding: 6 }}
              />
            ) : null}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: fluidSize(11), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.8 }}>
                {row.typeLabel}
              </div>
              <div style={{ marginTop: 5, fontSize: mobile ? fluidSize(15) : 17, fontWeight: 600, lineHeight: 1.25 }}>
                {row.name}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-end" }}>
            <div>
              {row.checkInCode ? (
                <div style={{ fontSize: fluidSize(13), opacity: 0.82 }}>Pass #{row.checkInCode}</div>
              ) : null}
              {row.seat && row.seat !== "Ticket" ? (
                <div style={{ marginTop: 4, fontSize: fluidSize(13), fontWeight: 600 }}>{row.seat}</div>
              ) : null}
            </div>
            {!hideEventCount && !row.checkInCode ? (
              <div style={{ fontSize: fluidSize(12), fontWeight: 600 }}>
                {row.eventCount} {row.eventCount === 1 ? "event" : "events"}
              </div>
            ) : null}
          </div>
        </div>
        <div style={{ padding: mobile ? 20 : 24, display: "flex", flexDirection: "column", justifyContent: "center", gap: 7 }}>
          <div style={{ fontSize: fluidSize(11), fontWeight: 600, color: MUTE, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Next event
          </div>
          {row.nextEvent ? (
            <>
              <div style={{ fontSize: mobile ? fluidSize(15) : 17, fontWeight: 600 }}>{row.nextEvent.name || "Upcoming event"}</div>
              <div style={{ fontSize: fluidSize(13), color: SUB }}>
                {[row.nextEvent.venue?.name, nextEventWhen].filter(Boolean).join(" · ")}
              </div>
            </>
          ) : (
            <div style={{ fontSize: fluidSize(14), color: SUB }}>No upcoming events on this pass.</div>
          )}
          <div style={{ marginTop: 5, fontSize: fluidSize(12), color: MUTE }}>
            {row.attendedCount} attended · {Math.max(0, row.eventCount - row.attendedCount)} remaining
          </div>
        </div>
      </>
    );
  };

  const AccessPassRow = ({ row }: { row: AccessPassSummary }) => {
    const href = walletAccessPassPath(
      row.orderId,
      row.accessPassUUID || row.key,
    );
    const rowStyle = {
      ...card,
      borderRadius: 20,
      overflow: "hidden",
      display: "grid",
      gridTemplateColumns: mobile ? "1fr" : "minmax(220px, 0.8fr) 1.2fr",
      color: "inherit",
      textDecoration: "none",
    };
    return href ? (
      <Link
        href={href}
        aria-label={`View ${row.name}`}
        style={{ ...rowStyle, cursor: "pointer" }}
      >
        <AccessPassCardBody row={row} />
      </Link>
    ) : (
      <div style={rowStyle}>
        <AccessPassCardBody row={row} />
      </div>
    );
  };

  const openPassTransfer = (
    pass: AccessPassSummary,
    kind: Exclude<TransferModalKind, "ticket">,
  ) => {
    setTfEmailErr(null);
    setTfError("");
    setTfSaving(false);
    setTf({
      step: 2,
      sel: [],
      email: "",
      evId: activeEvId,
      pass,
      passKind: kind,
    });
  };

  const PackageAccessPassCard = ({ row }: { row: AccessPassSummary }) => {
    const showPhoneQr = mobileTicketView && Boolean(row.checkInCode);
    const packageArt = selectedSeasonPackage?.thumb || row.artwork;
    // Legacy order: the name saved on the order, then the pass holder's email.
    // The email only stands in once the order fetch has come back empty.
    const holderName =
      formatSeasonPassHolderName(fullOrders[selectedPackageOrderId]) ||
      selectedSeasonPackage?.holderName ||
      (fullOrderChecked[selectedPackageOrderId]
        ? formatSeasonPassHolderName(null, { email: row.holderEmail })
        : "");
    const helperCopy = showPhoneQr ? PASS_PHONE_QR_HINT : "";
    const seasonPassTransferBlocked = seasonPassHasTicketTransfers(row.pass, {
      orderId: selectedPackageOrderId,
      sentTransfers: sentTransferRecords,
      orders: walletOrders,
      eventDetails,
    });
    const summary = (
      <>
      <div style={{ padding: cardPad, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, borderBottom: `1px solid ${LINE}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          {row.artwork ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.artwork}
              alt=""
              style={{ width: 52, height: 52, borderRadius: 12, objectFit: "contain", background: FIELD, padding: 6, boxSizing: "border-box" }}
            />
          ) : null}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: mobile ? fluidSize(15) : 17, fontWeight: 600, lineHeight: 1.25 }}>{row.name}</div>
            {row.seat && row.seat !== "Ticket" ? (
              <div style={{ marginTop: 4, fontSize: mobile ? fluidSize(12) : fluidSize(14), color: SUB }}>{row.seat}</div>
            ) : null}
          </div>
        </div>
        {row.checkInCode ? (
          <div style={{ fontSize: fluidSize(11), color: MUTE, whiteSpace: "nowrap" }}>
            No. {row.checkInCode}
          </div>
        ) : null}
      </div>

      <div style={{ padding: cardPad, display: "flex", alignItems: "center", gap: 16 }}>
        {showPhoneQr ? (
          <button
            type="button"
            aria-label={`Show QR code for ${row.name}`}
            onClick={() => setQrPass({ pass: row, kind: "season pass" })}
            style={{ fontFamily: "inherit", flexShrink: 0, background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, padding: 8, lineHeight: 0, cursor: "pointer" }}
          >
            <span role="img" aria-label={`QR code for ${row.name}`} style={{ display: "block" }}>
              <QRCodeSVG value={row.checkInCode} size={72} />
            </span>
          </button>
        ) : packageArt ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={packageArt}
            alt=""
            style={{ width: 72, height: 72, flexShrink: 0, borderRadius: 12, objectFit: "contain", background: FIELD, padding: 6, boxSizing: "border-box" }}
          />
        ) : null}
        <div style={{ minWidth: 0 }}>
          {holderName ? (
            <div style={{ fontSize: fluidSize(15), fontWeight: 600 }}>{holderName}</div>
          ) : null}
          {helperCopy ? (
            <div style={{ marginTop: holderName ? 5 : 0, fontSize: fluidSize(13), color: SUB }}>
              {helperCopy}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderTop: `1px solid ${LINE}` }}>
        {[
          {
            label: "Games included",
            value: `${row.eventCount} ${row.eventCount === 1 ? "game" : "games"}`,
          },
          { label: "Season", value: row.season || "—" },
          { label: "Status", value: row.status },
        ].map((item) => (
          <div key={item.label} style={{ padding: mobile ? "14px 12px" : "16px 18px", borderRight: item.label === "Status" ? "none" : `1px solid ${LINE}` }}>
            <div style={{ fontSize: fluidSize(10), fontWeight: 600, color: MUTE, textTransform: "uppercase", letterSpacing: "0.07em" }}>{item.label}</div>
            <div style={{ marginTop: 5, fontSize: fluidSize(14), fontWeight: 600, color: item.label === "Status" && item.value === "Active" ? GREEN : INK }}>{item.value}</div>
          </div>
        ))}
      </div>
      </>
    );
    return (
      // Like the legacy pass card, only the QR and transfer controls act;
      // the card itself never routes away from the package.
      <div style={{ ...card, borderRadius: 20, overflow: "hidden" }}>
        {summary}
        {row.status === "Active" && row.accessPassUUID ? (
          <div
            style={{
              padding: "12px 16px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <button
              type="button"
              disabled={seasonPassTransferBlocked}
              onClick={() => openPassTransfer(row, "season pass")}
              style={{
                fontFamily: "inherit",
                width: "100%",
                fontSize: fluidSize(14),
                fontWeight: 600,
                color: INK,
                background: "#fff",
                border: `1px solid ${LINE}`,
                borderRadius: 999,
                padding: "12px 16px",
                cursor: seasonPassTransferBlocked ? "not-allowed" : "pointer",
                opacity: seasonPassTransferBlocked ? 0.55 : 1,
              }}
            >
              Transfer season pass
            </button>
            {seasonPassTransferBlocked ? (
              <p
                style={{
                  margin: 0,
                  fontSize: fluidSize(13),
                  lineHeight: browseLeading("body"),
                  color: DANGER,
                }}
              >
                {PASS_TRANSFER_DISPLAY_COPY.seasonPassTransferred}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  const AccessPassDetail = () => {
    if (!routedAccessPass) return null;
    const pass = routedAccessPass;
    const foreground = pass.fontColor || "#ffffff";
    const background = pass.backgroundColor || CRIMSON;
    const remainingCount = Math.max(
      0,
      pass.eventCount - pass.attendedCount,
    );
    const showPhoneQr = phoneDevice && Boolean(pass.checkInCode);
    const canTransferAccessPass =
      pass.status === "Active" && Boolean(pass.accessPassUUID);

    const eventRow = (
      event: AccessPassSummary["events"][number],
      highlighted = false,
    ) => {
      const when = eventWhenLabel(event, event.venue?.timezone);
      const eventArt = imageUrl(event.image, "/blocktickets-logo.svg");
      const eventUUID = String(event.uuid || "").trim();
      const matchingDetail = eventUUID
        ? Object.values(eventDetails).find(
            (detail) => detail.eventUUID === eventUUID,
          )
        : undefined;
      const availability =
        matchingDetail?.availability ||
        (isUpcomingEvent(event) ? "available" : "past");
      const rawBadge = matchingDetail
        ? walletEventAvailabilityBadge(matchingDetail)
        : availability;
      const badge =
        rawBadge === "past" || isScannedTicket(event) ? "attended" : rawBadge;
      const status =
        badge === "transferred"
          ? "Transferred"
          : badge === "attended"
            ? "Attended"
            : "Upcoming";
      const clickable =
        pass.typeLabel === "Season pass" &&
        availability === "available" &&
        Boolean(matchingDetail && eventUUID);
      const content = (
        <div
          key={`${highlighted ? "next-" : ""}${event.uuid || event.name}`}
          style={{
            boxSizing: "border-box",
            width: "100%",
            background: highlighted ? FIELD : "transparent",
            borderRadius: highlighted ? 14 : 0,
            border: highlighted ? `1px solid ${LINE}` : "none",
            borderBottom: `1px solid ${LINE}`,
            boxShadow: "none",
            padding: highlighted ? 14 : "13px 0",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={eventArt}
            alt=""
            style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover", background: FIELD }}
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: mobile ? fluidSize(15) : 17, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.2 }}>
              {event.name || "Event"}
            </div>
            <div style={{ marginTop: 4, fontSize: fluidSize(13), lineHeight: 1.5, color: SUB }}>
              {highlighted
                ? [event.venue?.name, when].filter(Boolean).join(" · ")
                : when}
            </div>
          </div>
          <span
            style={
              highlighted && pass.seat !== "Ticket"
                ? {
                    flexShrink: 0,
                    borderRadius: 999,
                    padding: "4px 10px",
                    fontSize: fluidSize(11),
                    fontWeight: 600,
                    color: INK,
                    background: ACCENT,
                  }
                : {
                    flexShrink: 0,
                    ...walletAvailabilityBadgeStyle(
                      badge === "transferred" || badge === "attended"
                        ? badge
                        : "upcoming",
                    ),
                  }
            }
          >
            {highlighted && pass.seat !== "Ticket" ? pass.seat : status}
          </span>
        </div>
      );
      return clickable ? (
        <Link
          key={`${highlighted ? "next-link-" : ""}${event.uuid || event.name}`}
          href={(() => {
            const detail = Object.values(eventDetails).find(
              (d) => d.eventUUID === eventUUID,
            );
            if (detail?.key.includes(":")) {
              const packageUUID = detail.key.split(":")[0];
              return walletPackageEventPath(
                detail.orderId,
                packageUUID,
                eventUUID,
              );
            }
            return walletEventTicketsPath(detail?.orderId || routedOrderId);
          })()}
          aria-label={`View ${event.name || "event"}`}
          style={{ color: "inherit", textDecoration: "none" }}
        >
          {content}
        </Link>
      ) : content;
    };

    const transferButton = (placement: "header" | "footer") => (
      <button
        type="button"
        onClick={() => openPassTransfer(pass, "access pass")}
        style={{
          fontFamily: "inherit",
          width: placement === "footer" ? "100%" : "auto",
          alignSelf: placement === "header" ? "flex-start" : undefined,
          marginTop: placement === "header" ? 12 : undefined,
          fontSize: fluidSize(placement === "footer" ? 16 : 13),
          fontWeight: 600,
          color: INK,
          background: "#fff",
          border: placement === "footer" ? "1px solid rgba(5,27,53,0.14)" : "none",
          borderRadius: placement === "footer" ? 14 : 999,
          padding: placement === "footer" ? "12px 16px" : "9px 14px",
          minHeight: placement === "footer" ? 50 : undefined,
          cursor: "pointer",
        }}
      >
        Transfer access pass
      </button>
    );

    return (
      <>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            width: "100%",
            maxWidth: mobile ? 760 : 1100,
            margin: "0 auto",
            padding:
              canTransferAccessPass && mobile
                ? `16px 18px ${mobileStickyFooterReservePx(74)}`
                : mobile
                  ? "16px 18px 16px"
                  : "24px 32px 32px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            boxSizing: "border-box",
          }}
        >
          <Link href={walletSectionHref("events")} style={{ ...backBtn, textDecoration: "none", flexShrink: 0 }}>
            <BackArrow />All tickets
          </Link>
          <div
            style={{
              ...card,
              borderRadius: mobile ? "22px 22px 0 0" : 22,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              flex: 1,
            }}
          >
              <div style={{ flexShrink: 0, padding: mobile ? 18 : 24, color: foreground, background }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  {pass.artwork ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pass.artwork}
                      alt=""
                      style={{ width: mobile ? 58 : 70, height: mobile ? 58 : 70, flexShrink: 0, borderRadius: 12, objectFit: "contain", background: "#fff", padding: 7, boxSizing: "border-box" }}
                    />
                  ) : null}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: fluidSize(10), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.82 }}>
                      {pass.typeLabel}
                    </div>
                    <h1 style={{ margin: "4px 0 0", fontSize: mobile ? fluidSize(15) : 17, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.2 }}>
                      {pass.name}
                    </h1>
                    {pass.checkInCode ? (
                      <div style={{ marginTop: 6, fontSize: fluidSize(12), opacity: 0.82 }}>
                        Pass #{pass.checkInCode}
                      </div>
                    ) : null}
                    {canTransferAccessPass && !mobile ? transferButton("header") : null}
                  </div>
                  {showPhoneQr ? (
                    <button
                      type="button"
                      aria-label={`Show QR code for ${pass.name}`}
                      onClick={() => setQrPass({ pass, kind: "access pass" })}
                      style={{ flexShrink: 0, borderRadius: 10, padding: 6, lineHeight: 0, border: "1px solid rgba(255,255,255,0.25)", background: "transparent", cursor: "pointer" }}
                    >
                      <span role="img" aria-label={`QR code for ${pass.name}`} style={{ display: "block" }}>
                        <QRCodeSVG
                          value={pass.checkInCode}
                          size={mobile ? 48 : 58}
                          fgColor={foreground}
                          bgColor={background}
                        />
                      </span>
                    </button>
                  ) : null}
                </div>
                {showPhoneQr ? (
                  <div style={{ marginTop: 12, fontSize: fluidSize(13), opacity: 0.88, lineHeight: browseLeading("body") }}>
                    {PASS_PHONE_QR_HINT}
                  </div>
                ) : null}
                <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.18)", display: "flex", justifyContent: "space-between", gap: 18 }}>
                  <div>
                    <div style={{ fontSize: fluidSize(10), opacity: 0.72 }}>Events included</div>
                    <div style={{ marginTop: 3, fontSize: fluidSize(13), fontWeight: 600 }}>
                      {remainingCount} of {pass.eventCount} remaining
                    </div>
                  </div>
                  {pass.validThrough ? (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: fluidSize(10), opacity: 0.72 }}>Valid through</div>
                      <div style={{ marginTop: 3, fontSize: fluidSize(13), fontWeight: 600 }}>
                        {pass.validThrough}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  WebkitOverflowScrolling: "touch",
                  overscrollBehavior: "contain",
                  padding: mobile ? 18 : 24,
                }}
              >
                {pass.nextEvent ? (
                  <section>
                    <div style={{ ...eyebrow, marginBottom: 9 }}>Next up</div>
                    {eventRow(pass.nextEvent, true)}
                  </section>
                ) : null}
                {pass.events.length > 0 ? (
                  <section style={{ marginTop: pass.nextEvent ? 22 : 0 }}>
                    <div style={{ ...eyebrow, marginBottom: 2 }}>All events</div>
                    {pass.events.map((event) => eventRow(event))}
                  </section>
                ) : (
                  <div style={{ fontSize: fluidSize(14), color: SUB }}>
                    No events are currently attached to this pass.
                  </div>
                )}
              </div>
            </div>
        </div>
        {canTransferAccessPass && mobile ? (
          <MobileStickyFooter
            zIndex={44}
            background="#fff"
            innerPadding="12px 16px"
            data-testid="wallet-access-pass-actions-footer"
          >
            {transferButton("footer")}
          </MobileStickyFooter>
        ) : null}
      </>
    );
  };

  const WalletPageTitle = (title: string) => (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
      <h1 style={{ margin: 0, fontSize: mobile ? 32 : 42, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1 }}>{title}</h1>
      {!mobile && <div style={{ fontSize: fluidSize(13), lineHeight: 1.5, color: MUTE, whiteSpace: "nowrap" }}>{email}</div>}
    </div>
  );

  const Events = () => (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: bodyPad, display: "flex", flexDirection: "column", gap: 18 }}>
      {WalletPageTitle("My tickets")}

          <div className="st-noscroll" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
            {tabDefs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} style={chip(tab === t.id)}>
            {t.label}{pillCount(t.n, tab === t.id)}
              </button>
            ))}
          </div>
      {!eventsChecked || eventsLoading ? (
        <WalletTicketsBlocksLoading routeDestination />
      ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {tab === "upcoming" ? (
              <>
                {upcomingEvents.map((row) => (
                  <UpcomingEventRow key={row.key} row={row} />
                ))}
                {upcomingEvents.length === 0 ? (
                  <div style={walletEmptyState}>
                    <div style={{ fontSize: fluidSize(15), fontWeight: 600 }}>No upcoming tickets yet</div>
                    <div style={{ marginTop: 6, fontSize: fluidSize(13), color: SUB }}>Tickets you buy or receive will show up here.</div>
                  </div>
                ) : null}
              </>
            ) : tab === "season" ? (
              <>
                {incomingPassPackages.map((row) => (
                  <IncomingPassPackageRow key={row.key} row={row} />
                ))}
                {seasonPackages.map((row) => (
                  <SeasonPackageRow key={row.key} row={row} />
                ))}
                {showDemoSchedule ? <DemoSeasonPackageRow /> : null}
                {seasonPackages.length === 0 &&
                incomingPassPackages.length === 0 &&
                !showDemoSchedule ? (
                  <div style={walletEmptyState}>
                    <div style={{ fontSize: fluidSize(15), fontWeight: 600 }}>No packages yet</div>
                    <div style={{ marginTop: 6, fontSize: fluidSize(13), color: SUB }}>Packages you buy or receive will show up here.</div>
                  </div>
                ) : null}
              </>
            ) : tab === "flex" ? (
              <>
                {flexPacks.map((row) => (
                  <FlexPackRow key={row.key} row={row} />
                ))}
                {showDemoSchedule ? (
                <div onClick={() => openFlexPack(null)} style={{ ...card, borderRadius: 20, position: "relative", overflow: "hidden", minHeight: mobile ? 124 : undefined, boxSizing: "border-box", padding: cardPad, paddingRight: mobile ? 112 : 240, display: "flex", alignItems: "center", gap: mobile ? 14 : 18, cursor: "pointer" }}>
                  <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 5, flex: 1, lineHeight: 1.5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: fluidSize(12), fontWeight: 600, color: "#b5791e" }}><span style={{ width: 5, height: 5, borderRadius: 999, background: "#b5791e" }} />2 of 4 credits left</div>
                    <div style={{ fontSize: mobile ? fluidSize(15) : 17, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.2 }}>Aggie Pick-4 Flex Pack</div>
                    {!mobile && <div style={{ fontSize: fluidSize(13), color: SUB }}>Redeem any four home games</div>}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                      <span style={{ fontSize: fluidSize(12), fontWeight: 600, color: INK, border: "1px solid rgba(5,27,53,0.16)", borderRadius: 8, padding: "5px 10px" }}>Flex pack</span>
                    </div>
                  </div>
                  <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: mobile ? 124 : 268, background: CRIMSON, clipPath: `polygon(${mobile ? "14%" : "17%"} 0, 100% 0, 100% 100%, 0 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: `14px 14px 14px ${mobile ? 24 : 46}px`, boxSizing: "border-box" }}>
                    <span style={{ position: "relative", fontSize: 17, fontWeight: 600, letterSpacing: "0.06em", lineHeight: 1.5, color: "rgba(255,255,255,0.94)", whiteSpace: "nowrap" }}>PICK-4</span>
                  </div>
                </div>
                ) : null}
                {flexPacks.length === 0 && !showDemoSchedule ? (
                <div style={walletEmptyState}>
                  <div style={{ fontSize: fluidSize(15), fontWeight: 600 }}>No flex packs yet</div>
                  <div style={{ marginTop: 6, fontSize: fluidSize(13), color: SUB }}>Flex packs you buy or receive will show up here.</div>
                </div>
                ) : null}
              </>
            ) : (
              <>
                {incomingAccessPasses.map((row) => (
                  <IncomingAccessPassRow key={row.key} row={row} />
                ))}
                {visibleAccessPasses.map((row) => (
                  <AccessPassRow key={row.key} row={row} />
                ))}
                {visibleAccessPasses.length === 0 &&
                incomingAccessPasses.length === 0 ? (
                  <div style={walletEmptyState}>
                    <div style={{ fontSize: fluidSize(15), fontWeight: 600 }}>No access passes yet</div>
                    <div style={{ marginTop: 6, fontSize: fluidSize(13), color: SUB }}>Access passes you buy or receive will show up here.</div>
          </div>
                ) : null}
              </>
              )}
        </div>
      )}
    </div>
  );

  /* ---------- event detail ---------- */
  const ticketRows = ev.tickets.map((t) => {
    const entryLine = ticketEntryLine(t.raw, ev.venue, ev.event);
    const offerBadge = printedOfferBadgeName(t.raw);
    const raw = t.raw as TicketLike | undefined;
    const isGA = Boolean(raw?.generalAdmission || raw?.GA);
    if (isGA) {
      return {
        ...t,
        sec: ticketSectionValue(raw) || "GA",
        row: ticketRowValue(raw) || "GA",
        seatNo: ticketSeatValue(raw) || "GA",
        entryLine,
        offerBadge,
      };
    }
    const parts = t.seat.split("·").map((p) => p.trim());
    const peel = (part: string, prefix: RegExp) => {
      const value = part.replace(prefix, "").trim();
      return value || "—";
    };
    if (parts.length >= 3) {
      return {
        ...t,
        sec: peel(parts[0], /^Sec\s*/i),
        row: peel(parts[1], /^Row\s*/i),
        seatNo: peel(parts[2], /^Seat\s*/i),
        entryLine,
        offerBadge,
      };
    }
    if (parts.length === 2 && /^GA$/i.test(parts[1])) {
      return {
        ...t,
        sec: peel(parts[0], /^Sec\s*/i),
        row: "GA",
        seatNo: "GA",
        entryLine,
        offerBadge,
      };
    }
    if (parts.length === 2) {
      return {
        ...t,
        sec: peel(parts[0], /^Sec\s*/i),
        row: peel(parts[1], /^Row\s*/i),
        seatNo: "—",
        entryLine,
        offerBadge,
      };
    }
    return {
      ...t,
      sec: peel(parts[0] || "GA", /^Sec\s*/i),
      row: "GA",
      seatNo: "GA",
      entryLine,
      offerBadge,
    };
  });
  const acquiredAtLabel = orderAcquiredLabel(
    activeDetail ?? {
      key: orderEventKey ?? ev.id,
      tickets: ev.tickets,
      pendingIncomingTransfer: ev.pendingIncomingTransfer,
      incomingTransferId: ev.incomingTransferId,
    },
    activeOrderId ? fullOrders[activeOrderId] : undefined,
  );
  const orderRows = ev.isCart
    ? [
        { k: "Cart", v: ev.cartId || "—" },
        { k: "Status", v: "In cart" },
        { k: "Total", v: formatCartOrderTotal(ev.cartTotal) },
        { k: "Delivery", v: "Mobile entry" },
      ]
    : [
        { k: "Order number", v: ev.orderId || "—" },
        { k: acquiredAtLabel, v: ev.purchasedAt || "—" },
        { k: "Total paid", v: formatCartOrderTotal(ev.cartTotal) },
        { k: "Delivery", v: "Mobile entry" },
      ];
  const directionsHref =
    googleMapsDirectionsUrl(ev.event?.venue?.address) ||
    (ev.address || ev.venue
      ? `https://google.com/maps?q=${encodeURIComponent(
          [ev.venue, ev.address || ev.city].filter(Boolean).join(", "),
        )}`
      : "");
  const openTransfer = () => {
    setTf({ step: 1, sel: [], email: "", evId: activeEvId });
    setTfEmailErr(null);
    setTfError("");
    setModal(null);
  };
  const printTickets = async (
    tickets: EventT["tickets"],
    mode: "open" | "download",
  ) => {
    const printKey =
      mode === "download" ? "all" : String(tickets[0]?.id || tickets[0]?.code);
    setPrinting(printKey);
    setPrintError("");
    try {
      await printTicketsPdf({
        event: ev.event || {
          name: ev.title,
          venue: { name: ev.venue },
          organization: { name: ev.teams[0]?.name },
        },
        buyer: ticketBuyer,
        tickets: tickets.map((ticket) => ({
          ...(ticket.raw || {}),
          id: ticket.id,
          checkInCode: ticket.code,
          holder: ticket.holder,
        })),
        packageName: ev.packageName,
        filename: ev.title,
        mode,
      });
    } catch {
      setPrintError("We couldn’t prepare your ticket PDF. Please try again.");
    } finally {
      setPrinting(null);
    }
  };
  const addTicketCardToWallet = async (ticket: EventT["tickets"][number]) => {
    if (!passWallet) return;
    setTicketWalletSaving(String(ticket.id || ticket.code));
    setTicketWalletError("");
    const error = await addTicketToPhoneWallet(
      {
        ...(ev.event || {}),
        uuid: ev.event?.uuid || ev.eventUUID,
      },
      {
        ...(ticket.raw || {}),
        checkInCode: ticket.code,
        eventUUID:
          (typeof ticket.raw?.eventUUID === "string" && ticket.raw.eventUUID) ||
          ev.eventUUID,
      },
      passWallet,
    );
    setTicketWalletSaving(null);
    if (error) setTicketWalletError(error);
    else flashToast("Pass sent to your phone wallet");
  };
  const pendingIncomingEvent = ev.pendingIncomingTransfer === true;
  const canTransferEvent =
    !pendingIncomingEvent &&
    ev.transfersEnabled === true &&
    ev.tickets.some((ticket) => ticket.id != null);
  const canSellEvent =
    !pendingIncomingEvent &&
    ev.resaleEnabled === true &&
    ev.tickets.some((ticket) => ticket.id != null);
  const showEventActionsFooter =
    pendingIncomingEvent || canTransferEvent || canSellEvent;
  const manageActionBtnStyle: React.CSSProperties = {
    fontFamily: "inherit",
    width: "100%",
    textAlign: "left",
    fontSize: fluidSize(14),
    lineHeight: 1.5,
    fontWeight: 600,
    color: INK,
    background: "#fff",
    border: "1px solid rgba(5,27,53,0.14)",
    borderRadius: 12,
    padding: "13px 16px",
    cursor: "pointer",
    textDecoration: "none",
    boxSizing: "border-box",
    display: "block",
  };

  /* When the event screen owns the URL, leaving it has to pop back to tickets. */
  const EventBackControl = (
    style: React.CSSProperties,
    children: React.ReactNode,
    label?: string,
    preferSeasonPackage = true,
  ) =>
    eventUUID || flexPackUUID || routedEventUUID || routedFlexPackUUID || routedPackageUUID || routedOrderId ? (
      <Link
        href={
          routedPackageUUID && routedEventUUID && preferSeasonPackage
            ? walletPackagePath(routedOrderId, routedPackageUUID)
            : walletSectionHref("events")
        }
        aria-label={label}
        style={{ textDecoration: "none", ...style }}
      >
        {children}
      </Link>
    ) : (
      <button
        onClick={() => setScreen(preferSeasonPackage && seasonPackageKey ? "seasonPackage" : "events")}
        aria-label={label}
        style={style}
      >
        {children}
      </button>
    );

  const renderEventHero = ({
    radius,
    logoSize,
    compactTextSize,
    fullTextSize,
  }: {
    radius?: number;
    logoSize?: number;
    compactTextSize?: number;
    fullTextSize?: number;
  }) => {
    if (showMatchupCards && attractionCards[0] && attractionCards[1]) {
      if (!ev.isCart && MATCHUP[ev.id]) {
        return (
          <MatchupHero
            src={MATCHUP[ev.id]}
            brand={attractionCards[0].brand}
            oppBrand={attractionCards[1].brand}
            text={ev.title}
            textSize={compactTextSize ?? fullTextSize ?? 40}
            radius={radius}
          />
        );
      }
      return (
        <SplitAttractionHero
          home={attractionCards[0]}
          away={attractionCards[1]}
          radius={radius}
          logoSize={logoSize}
        />
      );
    }
    if (eventPosterSrc) {
      const posterBg = attractionCards[0]?.brand || ev.brand || CRIMSON;
      return (
        <PosterHero
          src={eventPosterSrc}
          alt={ev.title}
          bg={posterBg}
          radius={radius}
        />
      );
    }
    return (
      <MatchupHero
        src={matchupSrc}
        brand={CRIMSON}
        oppBrand={ev.brand}
        text={ev.isCart ? ev.title : `NMSU vs ${ev.initials}`}
        textSize={compactTextSize ?? fullTextSize ?? 40}
        radius={radius}
      />
    );
  };

  const EventHeroBanner = ({
    className,
    logoSize = mobile ? 88 : 120,
    compactTextSize = mobile ? 20 : 26,
    fullTextSize = mobile ? 24 : 40,
  }: {
    /** Carries the banner's responsive aspect ratio. */
    className?: string;
    logoSize?: number;
    compactTextSize?: number;
    fullTextSize?: number;
  }) => (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        overflow: "hidden",
        background:
          eventPosterSrc && !showMatchupCards
            ? attractionCards[0]?.brand || ev.brand || CRIMSON
            : "#f1f3f8",
      }}
    >
      {renderEventHero({ logoSize, compactTextSize, fullTextSize })}
    </div>
  );

  const AttractionCards = () => {
    if (!attractionCards.length) return null;
    return (
      <div className="st-ev-teams">
        {attractionCards.map((tm) => (
          <div
            key={`${tm.role}-${tm.name}`}
            style={{
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              gap: 14,
              background: FIELD,
              border: "1px solid rgba(5,27,53,0.07)",
              borderRadius: 16,
              padding: "12px 16px 12px 12px",
            }}
          >
            <LogoTile logo={tm.logo} brand={tm.brand} initials={tm.initials} size={56} big />
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ ...eyebrow, letterSpacing: "0.10em", lineHeight: 1.5 }}>{tm.role}</div>
              <div style={{ fontSize: fluidSize(16), fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.2 }}>
                {tm.name}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const MobileEvent = () => (
    <>
      {/* Blocktickets mobile event bar — fluid type, not desktop-pinned with ticket cards */}
      <div style={{ position: "fixed", left: 0, right: 0, top: 0, zIndex: 45, boxSizing: "border-box", background: INK, boxShadow: "0 12px 30px -18px rgba(3,16,31,0.9)", padding: "calc(env(safe-area-inset-top) + 12px) 16px 12px", display: "flex", alignItems: "center", gap: 12 }}>
        {EventBackControl(mobileEventBackBtn, <BackArrow />, "Back")}
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: fluidSize(16), fontWeight: 600, lineHeight: 1.5, color: "#fff", letterSpacing: "-0.015em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</div>
          <div style={{ fontSize: fluidSize(12), lineHeight: 1.5, color: "rgba(255,255,255,0.78)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.when} · {ev.venue}</div>
        </div>
      </div>

    <div className="st-mobile-ticket" style={{ boxSizing: "border-box", padding: `calc(env(safe-area-inset-top) + 74px) 12px ${showEventActionsFooter ? mobileStickyFooterReservePx(74) : "calc(28px + env(safe-area-inset-bottom))"}`, display: "flex", flexDirection: "column", gap: 16 }}>
      {pendingIncomingEvent ? (
        <div style={{ ...card, borderRadius: 16, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6, border: "1px solid rgba(192,122,18,0.28)", background: "#fffaf2" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: fluidSize(13), fontWeight: 600, color: "#c07a12" }}>
            <span style={{ width: 5, height: 5, flexShrink: 0, borderRadius: 999, background: "#c07a12" }} />
            Pending transfer
          </div>
          <div style={{ fontSize: fluidSize(13), lineHeight: browseLeading("body"), color: SUB }}>
            Accept this transfer to add {ev.tickets.length > 1 ? "these tickets" : "this ticket"} to your account.
          </div>
        </div>
      ) : null}
      {/* ticket carousel */}
      <div className="st-noscroll" style={{ display: "flex", gap: 14, overflowX: "auto", scrollSnapType: "x mandatory", scrollbarWidth: "none", msOverflowStyle: "none", margin: "12px -12px 0", padding: "2px 12px 6px" } as React.CSSProperties}>
        {ticketRows.map((t, i) => (
          <div key={i} style={{ flex: "0 0 94%", scrollSnapAlign: "center", overflow: "hidden", borderRadius: 20, background: "#fff", boxShadow: "0 1px 2px rgba(5,27,53,0.06), 0 18px 38px -22px rgba(5,27,53,0.55)", display: "flex", flexDirection: "column" }}>
            {/* card header — matchup */}
            <div style={{ position: "relative", height: 210, overflow: "hidden", background: "#06203c" }}>
              {renderEventHero({ radius: 0, logoSize: 72, compactTextSize: 16, fullTextSize: 16 })}
              <div style={{ position: "absolute", inset: 0, zIndex: 5, background: "linear-gradient(180deg, rgba(6,8,14,0.05) 30%, rgba(6,8,14,0.86) 100%)" }} />
              {packagedTicketBadge ? (
                <div data-testid="wallet-ticket-card-badge" style={{ position: "absolute", zIndex: 6, left: 16, top: 16, fontSize: fluidSize(10), fontWeight: 600, lineHeight: 1.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "#fff", background: "rgba(10,12,18,0.55)", backdropFilter: "blur(6px)", borderRadius: 999, padding: "6px 11px" }}>{packagedTicketBadge}</div>
              ) : null}
              <div style={{ position: "absolute", zIndex: 6, left: 0, right: 0, bottom: 0, padding: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: fluidSize(16), fontWeight: 600, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.title}</div>
                <div style={{ fontSize: fluidSize(12), lineHeight: 1.5, color: "rgba(255,255,255,0.74)" }}>{ev.when} · {ev.venue}</div>
              </div>
            </div>

            {/* seat strip */}
            <div style={{ display: "flex", alignItems: "stretch", borderBottom: "1px solid rgba(5,27,53,0.08)" }}>
              <div style={{ width: 5, background: ACCENT }} />
              <div style={{ flex: 1, minWidth: 0, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                {t.offerBadge ? (
                  <span style={{ alignSelf: "flex-start", fontSize: fluidSize(11), fontWeight: 600, color: INK, background: SOFT, borderRadius: 999, padding: "4px 10px" }}>{t.offerBadge}</span>
                ) : null}
                <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                  {[["Sec", t.sec], ["Row", t.row], ["Seat", t.seatNo]].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <span style={{ fontSize: fluidSize(10), fontWeight: 600, lineHeight: 1.5, letterSpacing: "0.14em", textTransform: "uppercase", color: MUTE }}>{k}</span>
                      <span style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.5, letterSpacing: "-0.025em", fontVariantNumeric: "tabular-nums" }}>{v === "—" ? "GA" : v}</span>
                    </div>
                  ))}
                </div>
                {t.entryLine ? (
                  <div style={{ fontSize: fluidSize(13), lineHeight: 1.5, color: SUB }}>{t.entryLine}</div>
                ) : null}
              </div>
            </div>

            {/* actions */}
            <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
              {passWallet ? (
                <button
                  type="button"
                  disabled={ticketWalletSaving !== null}
                  aria-busy={ticketWalletSaving === String(t.id || t.code) || undefined}
                  onClick={() => void addTicketCardToWallet(t)}
                  style={{ fontFamily: "inherit", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 50, fontSize: fluidSize(15), fontWeight: 600, lineHeight: 1.5, color: passWalletTheme?.buttonColor, background: passWalletTheme?.buttonBg, border: "none", borderRadius: 12, cursor: ticketWalletSaving ? "default" : "pointer", opacity: ticketWalletSaving ? 0.7 : 1 }}
                >
                  <ButtonBusyContents
                    loading={ticketWalletSaving === String(t.id || t.code)}
                    loadingLabel="Adding…"
                    spinnerColor={passWalletTheme?.buttonColor}
                    trackColor="rgba(255,255,255,0.35)"
                  >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><rect x="2" y="6" width="20" height="13" rx="3" /><path d="M2 11h20" /></svg>
                    {phoneWalletLabel(passWallet)}
                  </ButtonBusyContents>
              </button>
              ) : null}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button onClick={() => { setDetail(t); setModal("qr"); }} style={{ fontFamily: "inherit", minHeight: 48, fontSize: fluidSize(14), fontWeight: 600, lineHeight: 1.5, color: INK, background: "#fff", border: `1px solid ${ACCENT}`, borderRadius: 12, cursor: "pointer" }}>View QR-Code</button>
                <button onClick={() => { setDetail(t); setModal("details"); }} style={{ fontFamily: "inherit", minHeight: 48, fontSize: fluidSize(14), fontWeight: 600, lineHeight: 1.5, color: INK, background: "#fff", border: "1px solid rgba(5,27,53,0.14)", borderRadius: 12, cursor: "pointer" }}>Ticket details</button>
              </div>
              {ticketWalletError ? (
                <p role="alert" style={{ margin: 0, color: DANGER, fontSize: fluidSize(13) }}>{ticketWalletError}</p>
              ) : null}
            </div>

            {/* verified footer */}
            <div style={{ borderTop: "1px dashed rgba(5,27,53,0.16)", padding: "11px 18px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><path d="M12 3l7 3v5c0 4.4-2.9 8.3-7 10-4.1-1.7-7-5.6-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>
                <span style={{ fontSize: fluidSize(11), fontWeight: 600, lineHeight: 1.5, letterSpacing: "0.12em", textTransform: "uppercase", color: INK }}>Verified Ticket</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* dots */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
        {ticketRows.map((_, i) => (
          <div key={i} style={{ width: 7, height: 7, borderRadius: 999, background: i === 0 ? ACCENT : "rgba(5,27,53,0.22)" }} />
        ))}
      </div>

      </div>
    {pendingIncomingEvent ? (
      <MobileStickyFooter
        zIndex={44}
        background="#fff"
        innerPadding="12px 16px"
        shellClassName="st-mobile-ticket"
        data-testid="wallet-event-accept-transfer-footer"
      >
        {renderAcceptTransferButton(acceptTargetFromEventDetail(ev), "wallet-event", {
          width: "100%",
          minHeight: 50,
          fontSize: fluidSize(16),
          borderRadius: 14,
          padding: "12px 16px",
        })}
      </MobileStickyFooter>
    ) : canTransferEvent || canSellEvent ? (
      <MobileStickyFooter
        zIndex={44}
        background="#fff"
        innerPadding="12px 16px"
        shellClassName="st-mobile-ticket"
        data-testid="wallet-event-actions-footer"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {canTransferEvent ? (
            <button
              type="button"
              onClick={openTransfer}
              style={{
                fontFamily: "inherit",
                width: "100%",
                minHeight: 50,
                fontSize: fluidSize(14),
                fontWeight: 600,
                lineHeight: 1.5,
                color: INK,
                background: "#fff",
                border: "1px solid rgba(5,27,53,0.14)",
                borderRadius: 14,
                padding: "12px 16px",
                cursor: "pointer",
              }}
            >
              Transfer
            </button>
          ) : null}
          {canSellEvent ? (
            <Link
              href={walletSectionHref("resale")}
              style={{
                fontFamily: "inherit",
                width: "100%",
                minHeight: 50,
                fontSize: fluidSize(16),
                fontWeight: 600,
                color: INK,
                background: "#fff",
                border: "1px solid rgba(5,27,53,0.14)",
                borderRadius: 14,
                padding: "12px 16px",
                cursor: "pointer",
                textDecoration: "none",
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Sell
            </Link>
          ) : null}
    </div>
      </MobileStickyFooter>
    ) : null}
    </>
  );

  const EventDetail = () =>
    mobileTicketView ? MobileEvent() : DesktopEvent();

  const DesktopEvent = () => (
    <div className="st-ev" style={{ maxWidth: 1100, margin: "0 auto", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 18 }}>
      {EventBackControl(backBtn, <><BackArrow />All tickets</>)}
      <div style={{ overflow: "hidden", borderRadius: 20, ...card, boxShadow: "0 1px 2px rgba(5,27,53,0.05), 0 14px 30px -18px rgba(5,27,53,0.40)" }}>
        <EventHeroBanner className="st-ev-hero" />
      </div>

      <div className="st-ev-grid">
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ ...card, borderRadius: 20, padding: cardPad, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <h1 className="st-ev-title" style={{ margin: 0, fontWeight: 600, letterSpacing: "-0.03em", ...(mobile ? { lineHeight: browseLeading("h2") } : { fontSize: 30, lineHeight: 1.1 }) }}>{ev.title}</h1>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 20px", fontSize: fluidSize(14), lineHeight: 1.5, color: SUB }}>
                <span style={{ fontWeight: 600, color: INK }}>{ev.when}</span>{ev.doors ? <span>Doors open {ev.doors}</span> : null}
              </div>
            </div>
            <div style={{ height: 1, background: "rgba(5,27,53,0.08)" }} />
            <AttractionCards />
            {ev.blurb ? (
              <>
                <div style={{ height: 1, background: "rgba(5,27,53,0.08)" }} />
                <p style={{ margin: 0, fontSize: fluidSize(14), lineHeight: browseLeading("body"), color: FAINT, whiteSpace: "pre-line" }}>{ev.blurb}</p>
              </>
            ) : null}
          </div>

          <div style={{ ...card, borderRadius: 20, overflow: "hidden" }}>
            {ticketRows.map((t, i) => (
              <div key={i} className="st-ev-seat" style={{ padding: cardPad, borderBottom: "1px solid rgba(5,27,53,0.07)" }}>
                <div style={{ width: 72, height: 72, borderRadius: 14, background: FIELD, border: "1px solid rgba(5,27,53,0.08)", flexShrink: 0, overflow: "hidden" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={SEATMAP_THUMB} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ flex: 1, minWidth: 150, display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ alignSelf: "flex-start", fontSize: fluidSize(11), lineHeight: 1.5, fontWeight: 600, color: INK, background: SOFT, borderRadius: 999, padding: "4px 10px" }}>{t.offerBadge || (ev.packageName || routedPackageUUID ? "Season tickets" : "Tickets")}</span>
                  <div style={{ fontSize: mobile ? fluidSize(17) : 17, lineHeight: 1.5, fontWeight: 600, letterSpacing: "-0.015em" }}>{t.seat}</div>
                </div>
                <div className="st-ev-seat-actions">
                  <button
                    type="button"
                    disabled={printing !== null}
                    aria-busy={printing === String(t.id || t.code) || undefined}
                    onClick={() => void printTickets([t], "open")}
                    style={{
                      ...ghostBtn,
                      fontSize: fluidSize(13),
                      lineHeight: 1.5,
                      padding: "11px 18px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      cursor: printing !== null ? "default" : "pointer",
                      opacity: printing !== null ? 0.55 : 1,
                    }}
                  >
                    <ButtonBusyContents
                      loading={printing === String(t.id || t.code)}
                      loadingLabel="Preparing…"
                      spinnerColor={INK}
                      trackColor="rgba(5,27,53,0.2)"
                    >
                      Print PDF
                    </ButtonBusyContents>
                  </button>
                  <button onClick={() => { setDetail(t); setModal("details"); }} style={{ fontFamily: "inherit", fontSize: fluidSize(13), lineHeight: 1.5, fontWeight: 600, color: INK, background: "#f1f3f8", border: "none", borderRadius: 999, padding: "11px 18px", cursor: "pointer" }}>Details</button>
                </div>
              </div>
            ))}
            <div style={{ padding: `14px ${padX}px`, background: "#fbfcfe", display: "flex", alignItems: "center", gap: 12 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, flexShrink: 0 }}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><line x1="14" y1="14" x2="21" y2="14" /><line x1="14" y1="18" x2="18" y2="18" /><line x1="18" y1="21" x2="21" y2="21" /></svg>
              <div style={{ fontSize: fluidSize(13), lineHeight: mobile ? browseLeading("body") : 1.5, color: FAINT }}><strong style={{ fontWeight: 600, color: INK }}>Your phone is your ticket.</strong> Show the QR code straight from your phone to scan at entry, or add each ticket to your Apple/Google wallet ahead of time.</div>
            </div>
          </div>
        </div>

        <aside className="st-ev-aside">
          {pendingIncomingEvent ? (
            <div style={{ ...card, borderRadius: 20, padding: cardPad, display: "flex", flexDirection: "column", gap: 10, border: "1px solid rgba(192,122,18,0.28)", background: "#fffaf2" }}>
              <div style={{ ...eyebrow, paddingBottom: 4, lineHeight: 1.5, color: "#c07a12" }}>Pending transfer</div>
              <div style={{ fontSize: fluidSize(13), lineHeight: mobile ? browseLeading("body") : 1.5, color: SUB }}>
                Accept this transfer to add {ev.tickets.length > 1 ? "these tickets" : "this ticket"} to your account.
              </div>
              {renderAcceptTransferButton(acceptTargetFromEventDetail(ev), "wallet-event", {
                width: "100%",
                textAlign: "center",
              })}
            </div>
          ) : null}
          <div style={{ ...card, borderRadius: 20, padding: cardPad, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ ...eyebrow, paddingBottom: 4, lineHeight: 1.5 }}>Manage</div>
            {canTransferEvent ? (
              <button type="button" onClick={openTransfer} style={manageActionBtnStyle}>Transfer</button>
            ) : null}
            {canSellEvent ? (
              <Link href={walletSectionHref("resale")} style={manageActionBtnStyle}>Sell</Link>
            ) : null}
            <button
              type="button"
              disabled={printing !== null || ev.tickets.length === 0}
              aria-busy={printing === "all" || undefined}
              onClick={() => void printTickets(ev.tickets, "download")}
              style={{
                fontFamily: "inherit",
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                textAlign: "left",
                fontSize: fluidSize(14),
                lineHeight: 1.5,
                fontWeight: 600,
                color: INK,
                background: "#fff",
                border: "1px solid rgba(5,27,53,0.14)",
                borderRadius: 12,
                padding: "13px 16px",
                cursor: printing !== null || ev.tickets.length === 0 ? "default" : "pointer",
                opacity: printing !== null || ev.tickets.length === 0 ? 0.55 : 1,
              }}
            >
              <ButtonBusyContents
                loading={printing === "all"}
                loadingLabel="Preparing…"
                spinnerColor={INK}
                trackColor="rgba(5,27,53,0.2)"
              >
                Print all
              </ButtonBusyContents>
            </button>
            {printError ? <p role="alert" style={{ margin: 0, color: "#c2394a", fontSize: fluidSize(13) }}>{printError}</p> : null}
          </div>
          <div style={{ ...card, borderRadius: 20, padding: cardPad, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ ...eyebrow, lineHeight: 1.5 }}>Getting there</div>
            <div style={{ fontSize: fluidSize(15), lineHeight: 1.5, fontWeight: 600 }}>{ev.venue}</div>
            <div style={{ fontSize: fluidSize(13), lineHeight: mobile ? browseLeading("body") : 1.5, color: SUB }}>{ev.address}</div>
            {directionsHref ? (
              <a
                href={directionsHref}
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...accentBtn, alignSelf: "flex-start", marginTop: 6, display: "flex", alignItems: "center", gap: 7, fontSize: fluidSize(13), lineHeight: 1.5, padding: "11px 18px", textDecoration: "none" }}
              >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>Get directions
              </a>
            ) : null}
          </div>
          <div style={{ ...card, borderRadius: 20, padding: cardPad, display: "flex", flexDirection: "column" }}>
            <div style={{ ...eyebrow, paddingBottom: 10, lineHeight: 1.5 }}>Order</div>
            {orderRows.map((o) => (
              <div key={o.k} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, padding: "9px 0", borderTop: "1px solid rgba(5,27,53,0.07)" }}>
                <div style={{ fontSize: fluidSize(13), lineHeight: 1.5, color: MUTE }}>{o.k}</div>
                <div style={{ fontSize: fluidSize(13), lineHeight: 1.5, fontWeight: 600, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{o.v}</div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );

  /* ---------- season package ---------- */
  const DemoScheduleRows = () => (
    <>
      {SCHEDULE.map((g) => {
        const today = g.id === "mercyhurst";
        return (
          <div
            key={g.id}
            role="button"
            tabIndex={0}
            onClick={() => { setEvId(g.id); setScreen("event"); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setEvId(g.id);
                setScreen("event");
              }
            }}
            style={{ ...card, borderRadius: 20, position: "relative", overflow: "hidden", minHeight: mobile ? 124 : undefined, boxSizing: "border-box", padding: cardPad, paddingRight: mobile ? 112 : 240, display: "flex", alignItems: "center", gap: mobile ? 14 : 18, cursor: "pointer" }}
          >
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
              <EventScheduleMeta
                today={today}
                scheduleLine={
                  today
                    ? `Doors open · ${g.doors}`
                    : `${g.date} · ${g.time}`
                }
              />
              <div style={{ fontSize: fluidSize(17), fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis" }}>New Mexico State vs. {g.opp}</div>
              {!mobile && <div style={{ fontSize: fluidSize(13), color: SUB, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Aggie Memorial Stadium · Las Cruces, NM</div>}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                <span style={{ fontSize: fluidSize(12), fontWeight: 600, color: INK, border: "1px solid rgba(5,27,53,0.16)", borderRadius: 8, padding: "5px 10px", whiteSpace: "nowrap" }}>Season Tickets</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: fluidSize(12), fontWeight: 600, color: INK, border: "1px solid rgba(5,27,53,0.16)", borderRadius: 8, padding: "5px 10px", whiteSpace: "nowrap" }}>
                  <TicketIcon />2
                </span>
              </div>
            </div>
            <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: mobile ? 124 : 268, background: g.brand, clipPath: `polygon(${mobile ? "14%" : "17%"} 0, 100% 0, 100% 100%, 0 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: `14px 14px 14px ${mobile ? 24 : 46}px`, boxSizing: "border-box", overflow: "hidden" }}>
              <TeamPanelArt src={BANNER[g.id]} initials={g.initials} fontSize={mobile ? 14 : 17} />
            </div>
          </div>
        );
      })}
    </>
  );

  const SeasonPackage = () => {
    const isDemo = seasonPackageKey === "demo";
    const title = isDemo
      ? "NMS Football Season Seats"
      : selectedSeasonPackage?.name || "Season tickets";
    const eventCount = isDemo ? 6 : selectedSeasonPackage?.eventCount ?? 0;
    // Tickets for games already played are listed but do not count as usable.
    const gameTicketCount = seasonPackageGames.reduce(
      (count, row) =>
        row.availability === "past" ? count : count + row.ticketCount,
      0,
    );
    const eventsBody = isDemo ? (
      <DemoScheduleRows />
    ) : seasonPackageGames.length > 0 ? (
      seasonPackageGames.map((row) => (
        <UpcomingEventRow
          key={row.key}
          row={row}
          packageUUID={selectedSeasonPackage?.packageUUID}
        />
      ))
    ) : (
      <div style={walletEmptyState}>
        <div style={{ fontSize: fluidSize(15), fontWeight: 600 }}>No upcoming games</div>
        <div style={{ marginTop: 6, fontSize: fluidSize(13), color: SUB }}>Games in this package will show up here when they are available.</div>
      </div>
    );
    return (
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: bodyPad, display: "flex", flexDirection: "column", gap: 16 }}>
        {routedPackageUUID ? (
          <Link href={walletSectionHref("events")} style={{ ...backBtn, textDecoration: "none" }}>
            <BackArrow />All tickets
          </Link>
        ) : (
        <button
          onClick={() => {
            setTab("season");
            setScreen("events");
          }}
          style={backBtn}
        >
          <BackArrow />All tickets
        </button>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={eyebrow}>Season tickets</div>
          <h1 style={{ margin: 0, fontSize: mobile ? fluidSize(26) : 30, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: browseLeading("h3") }}>{title}</h1>
          <div style={{ fontSize: fluidSize(13), color: SUB }}>
            {eventCount} {eventCount === 1 ? "game" : "games"}
            {selectedSeasonPackage?.venueLine ? ` · ${selectedSeasonPackage.venueLine}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visiblePackagePasses.length > 0 ? (
            <>
              <div
                role="tablist"
                aria-label="Package ticket views"
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={packageView === "pass"}
                  onClick={() => setPackageView("pass")}
                  style={chip(packageView === "pass")}
                >
                  Season pass
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={packageView === "events"}
                  onClick={() => setPackageView("events")}
                  style={chip(packageView === "events")}
                >
                  Game tickets ({gameTicketCount || eventCount})
                </button>
              </div>
              {packageView === "pass"
                ? visiblePackagePasses.map((row) => (
                    <PackageAccessPassCard key={row.key} row={row} />
                  ))
                : eventsBody}
            </>
          ) : (
            eventsBody
          )}
        </div>
      </div>
    );
  };

  /* ---------- flex package ---------- */
  const selectedFlexPack =
    routedFlexPack ??
    flexPacks.find((row) => row.key === flexPackKey) ??
    null;
  const demoVoucherCodes = ["765148", "482913", "239487", "579623", "864205", "302478", "918204", "156839", "473526", "324589"];
  const vouchers = (selectedFlexPack?.codes.length
    ? selectedFlexPack.codes
    : demoVoucherCodes.map((code, i) => ({
        code,
        status: (i >= 8 ? "Redeemed" : "Active") as "Active" | "Redeemed",
      }))
  ).map((v) => {
    const used = v.status === "Redeemed";
    return { code: v.code, status: v.status, ink: used ? "#a3aab8" : INK, tagInk: used ? "#2f6bd6" : GREEN, tagBg: used ? "#e8f0fd" : GREEN_BG };
  });
  const flexRemaining = vouchers.filter((v) => v.status === "Active").length;
  const Package = () => (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: bodyPad, display: "flex", flexDirection: "column", gap: 16, lineHeight: 1.5 }}>
      {EventBackControl(backBtn, <><BackArrow />All tickets</>, undefined, false)}
      <div style={{ ...card, borderRadius: 24, boxShadow: "0 1px 2px rgba(5,27,53,0.05), 0 20px 46px -22px rgba(5,27,53,0.45)", padding: cardPad, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={eyebrow}>FLEX PACKAGE</div>
          <h1 style={{ margin: 0, fontSize: mobile ? 22 : 28, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.12 }}>{selectedFlexPack?.name || "Aggie Pick-4 Flex Pack"}</h1>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 10 }}>
          {[{ k: "Vouchers", v: String(vouchers.length) }, { k: "Status", v: flexRemaining > 0 ? "Active" : "Redeemed" }, { k: "Credits left", v: `${flexRemaining} of ${vouchers.length}` }].map((s) => (
            <div key={s.k} style={{ background: FIELD, borderRadius: 14, padding: "13px 15px", display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ fontSize: fluidSize(11), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: MUTE }}>{s.k}</div>
              <div style={{ fontSize: fluidSize(16), fontWeight: 600, letterSpacing: "-0.01em" }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, background: SOFT, borderRadius: 16, padding: "14px 16px" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17, flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
        <div style={{ fontSize: fluidSize(13), lineHeight: 1.5, color: INK }}>Redeem a voucher for a ticket at the Box Office for any available game.</div>
      </div>
      <div style={{ ...card, borderRadius: 20, overflow: "hidden" }}>
        <div style={{ padding: `15px ${padX}px`, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, borderBottom: "1px solid rgba(5,27,53,0.08)" }}>
          <div style={{ fontSize: fluidSize(15), fontWeight: 600, letterSpacing: "-0.01em" }}>Vouchers</div>
          <div style={{ fontSize: fluidSize(13), color: SUB, fontVariantNumeric: "tabular-nums" }}>{flexRemaining} active · {vouchers.length - flexRemaining} redeemed</div>
        </div>
        {vouchers.map((v) => (
          <div key={v.code} style={{ padding: `14px ${padX}px`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottom: "1px solid rgba(5,27,53,0.05)" }}>
            <div style={{ fontSize: fluidSize(16), fontWeight: 600, letterSpacing: "0.05em", fontVariantNumeric: "tabular-nums", color: v.ink }}>{v.code}</div>
            <span style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 7, fontSize: fluidSize(12), fontWeight: 600, color: v.tagInk, background: v.tagBg, borderRadius: 999, padding: "6px 11px" }}>{v.status}<span style={{ width: 7, height: 7, borderRadius: 999, background: v.tagInk }} /></span>
          </div>
        ))}
      </div>
    </div>
  );

  /* ---------- transfers (listings) ---------- */
  const listData = listTab === "received" ? receivedList : sentList;
  const listingsTabsPending =
    sentTransferListLoading ||
    receivedTransferListLoading ||
    listingsSnapshotStale;
  const transfersListPending = listingsTabsPending;
  const Listings = () => (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: bodyPad, display: "flex", flexDirection: "column", gap: 18 }}>
      {WalletPageTitle("Transfers")}
      <div style={{ display: "flex", gap: 6 }}>
        {[{ id: "active" as const, label: "Sent", n: sentList.length }, { id: "received" as const, label: "Received", n: receivedList.length }].map((t) => (
          <button
            key={t.id}
            onClick={() => {
              if (t.id === "received") openReceivedTransfersTab();
              else setListTab(t.id);
            }}
            style={chip(listTab === t.id)}
          >
            {t.label}
            <span
              aria-hidden={listingsTabsPending || undefined}
              style={{
                ...pillCountStyle(listTab === t.id),
                visibility: listingsTabsPending ? "hidden" : "visible",
              }}
            >
              {listingsTabsPending ? "" : t.n}
            </span>
          </button>
        ))}
      </div>
      {transfersListPending ? (
        <WalletTicketsBlocksLoading routeDestination />
      ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {listData.length === 0 ? (
          <div style={walletEmptyState}>
            <div style={{ fontSize: fluidSize(15), fontWeight: 600 }}>{listTab === "received" ? "Nothing received yet" : "No transfers sent"}</div>
            <div style={{ marginTop: 6, fontSize: fluidSize(13), color: SUB }}>{listTab === "received" ? "Tickets people send you will land here." : "Open a ticket and tap Transfer to send a seat."}</div>
          </div>
        ) : listData.map((t) => {
          const pending = t.status === "pending";
          return (
            <div key={t.id} style={{ ...card, borderRadius: 20, padding: cardPad, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: fluidSize(12), fontWeight: 600, whiteSpace: "nowrap", color: pending ? "#c07a12" : GREEN }}>
                  <span style={{ width: 5, height: 5, flexShrink: 0, borderRadius: 999, background: pending ? "#c07a12" : GREEN }} />
                  {pending ? "Pending · awaiting claim" : "Claimed · " + (t.claimedOn || t.on)}
                </div>
                <div style={{ fontSize: fluidSize(17), fontWeight: 600, letterSpacing: "-0.015em" }}>{t.title}</div>
                {t.schedule ? (
                  <div style={{ fontSize: fluidSize(13), color: SUB }}>{t.schedule}</div>
                ) : null}
                <StackedSeatLines
                  lines={transferSeatLines(t)}
                  style={{ fontSize: fluidSize(13), color: SUB }}
                />
                <div style={{ fontSize: fluidSize(13), color: SUB }}>{transferPartyDateLine({
                  direction: listTab === "received" ? "received" : "sent",
                  email: listTab === "received" ? t.from : t.to,
                  on: t.on,
                })}</div>
                {t.passKind === "season pass" ? (
                  <div style={{ marginTop: 2 }}>
                    <SeasonTicketsBadge />
                  </div>
                ) : null}
              </div>
              {listTab === "received" && pending
                ? renderAcceptTransferButton(
                    acceptTargetFromWalletRow(t),
                    "transfers-received",
                  )
                : null}
              {listTab !== "received" && pending && (
                <button onClick={() => openConfirmCancel(t)} style={{ fontFamily: "inherit", flexShrink: 0, fontSize: fluidSize(13), fontWeight: 600, color: DANGER, background: "#fff", border: "1px solid rgba(194,57,74,0.28)", borderRadius: 999, padding: "10px 16px", minHeight: 42, whiteSpace: "nowrap", cursor: "pointer" }}>Cancel transfer</button>
              )}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );

  /* ---------- resale listings ---------- */
  const saleEmpty = {
    active: {
      title: "No active listings",
      body: "When you list tickets for resale, they will show up here.",
    },
    sold: {
      title: "Nothing sold yet",
      body: "Listings that sell will move here.",
    },
    expired: {
      title: "No expired listings",
      body: "Listings that end without a sale will move here.",
    },
  } as const;
  const Resale = () => (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: bodyPad, display: "flex", flexDirection: "column", gap: 18 }}>
      {WalletPageTitle("Listings")}
      <div
        role="tablist"
        aria-label="Listing status"
        style={{
          display: "inline-flex",
          alignSelf: "flex-start",
          alignItems: "center",
          background: INK,
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 999,
          padding: 4,
        }}
      >
        {([
          { id: "active" as const, label: "Active" },
          { id: "sold" as const, label: "Sold" },
          { id: "expired" as const, label: "Expired" },
        ]).map((t) => {
          const on = saleTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setSaleTab(t.id)}
              style={{
                fontFamily: "inherit",
                fontSize: fluidSize(14),
                fontWeight: 600,
                color: on ? INK : "rgba(184, 198, 220, 0.92)",
                background: on ? ACCENT : "transparent",
                border: "none",
                borderRadius: 999,
                padding: "10px 18px",
                minWidth: 96,
                minHeight: 40,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {!resaleListingsChecked || resaleListingsLoading ? (
        <WalletTicketsBlocksLoading routeDestination />
      ) : (
      <div style={walletEmptyState}>
        <div style={{ fontSize: fluidSize(15), fontWeight: 600 }}>{saleEmpty[saleTab].title}</div>
        <div style={{ marginTop: 6, fontSize: fluidSize(13), color: SUB }}>{saleEmpty[saleTab].body}</div>
      </div>
      )}
    </div>
  );

  /* ---------- giving ---------- */
  const givingStats = isHolder
    ? [{ k: "This year", v: "$3,600" }, { k: "Level", v: "Silver Aggie" }, { k: "Priority points", v: "1,240" }]
    : [{ k: "This year", v: "$0" }, { k: "Level", v: "Not enrolled" }, { k: "Priority points", v: "0" }];
  const gifts = isHolder ? [
    { fund: "Aggie Club — Annual Fund", date: "Jun 12, 2026", who: "Myself", amt: "$2,500" },
    { fund: "Football Excellence Fund", date: "Mar 04, 2026", who: "Myself", amt: "$750" },
    { fund: "Aggie Club — Annual Fund", date: "Jan 09, 2026", who: "On behalf of D. Cogan", amt: "$350" },
  ] : [];
  const Giving = () => (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: bodyPad, display: "flex", flexDirection: "column", gap: 18 }}>
      {WalletPageTitle("Giving")}
      <div style={{ ...card, borderRadius: 24, boxShadow: "0 1px 2px rgba(5,27,53,0.05), 0 20px 46px -22px rgba(5,27,53,0.45)", padding: cardPad, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 10 }}>
          {givingStats.map((s) => (
            <div key={s.k} style={{ background: FIELD, borderRadius: 14, padding: "13px 15px", display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ fontSize: fluidSize(11), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: MUTE }}>{s.k}</div>
              <div style={{ fontSize: fluidSize(16), fontWeight: 600, letterSpacing: "-0.01em" }}>{s.v}</div>
            </div>
          ))}
        </div>
        {isHolder && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontSize: fluidSize(13), fontWeight: 600 }}>$1,400 to Crimson level</div>
              <div style={{ fontSize: fluidSize(12), color: MUTE }}>unlocks earlier seat selection</div>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: "#edeff7", overflow: "hidden" }}><div style={{ width: "64%", height: "100%", background: ACCENT }} /></div>
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button style={accentBtn}>Make a gift</button>
          <button style={ghostBtn}>Export tax receipts</button>
        </div>
      </div>
      <div style={{ ...card, borderRadius: 20, overflow: "hidden" }}>
        {gifts.length === 0 ? (
          <div style={{ padding: "30px 22px", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, textAlign: "center" }}>
            <div style={{ fontSize: fluidSize(15), fontWeight: 600 }}>No gifts yet</div>
            <div style={{ fontSize: fluidSize(13), color: SUB }}>Aggie Club gifts you make will show up here.</div>
          </div>
        ) : gifts.map((g, i) => (
          <div key={i} style={{ padding: `15px ${padX}px`, display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid rgba(5,27,53,0.06)" }}>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ fontSize: fluidSize(14), fontWeight: 600 }}>{g.fund}</div>
              <div style={{ fontSize: fluidSize(12), color: SUB }}>{g.date} · {g.who}</div>
            </div>
            <div style={{ fontSize: fluidSize(15), fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{g.amt}</div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ---------- profile ---------- */
  const profileDefs = [
    { title: "You", rows: [
      { k: "Name", v: isHolder ? "Harrison Cogan" : "Add your name", action: "Edit", help: "This is the name printed on tickets and will-call lists." },
      { k: "Email", v: email, action: "Edit", help: "Sign-in codes and ticket transfers are sent here." },
      { k: "Phone", v: isHolder ? "(917) 555-0148" : "Add a phone number", action: "Edit", help: "Used for game-day texts and gate support." },
      { k: "Mailing address", v: isHolder ? "412 Solano Dr, Las Cruces, NM 88001" : "Add an address", action: "Edit", help: "Where printed packets and Aggie Club mail are sent." },
    ] },
    { title: "Payment", rows: [
      { k: "Card on file", v: isHolder ? "Visa ···4417 · exp 09/29" : "No card saved", action: "Manage", help: "Charged for renewals, add-ons, and Aggie Club gifts." },
      { k: "Billing address", v: isHolder ? "412 Solano Dr, Las Cruces, NM 88001" : "Add an address", action: "Edit", help: "Must match the address on your card statement." },
    ] },
    { title: "Security & preferences", rows: [
      { k: "Sign-in", v: "Passkey + email code", action: "Change", help: "Choose how you verify it is you at sign-in." },
      { k: "Event reminders", v: "Text + email 24h before kickoff", toggle: true, on: true },
      { k: "NM State marketing", v: "Offers, presales, and Aggie Club news", toggle: true, on: true },
    ] },
  ];
  const activity = isHolder ? [
    { item: "NMS Season Seats — Level A", when: "Jul 12, 2026", kind: "Purchase", amt: "−$780.00", ink: INK },
    { item: "Aggie Club — Annual Fund", when: "Jun 12, 2026", kind: "Donation", amt: "−$2,500.00", ink: INK },
    { item: "Account credit applied", when: "May 28, 2026", kind: "Credit", amt: "+$25.00", ink: GREEN },
  ] : [];
  const Profile = () => (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: bodyPad, display: "flex", flexDirection: "column", gap: 18 }}>
      <h1 style={{ margin: 0, fontSize: fluidSize(42), fontWeight: 600, letterSpacing: "-0.03em", lineHeight: browseLeading("h2") }}>Profile</h1>
      <div style={{ ...card, borderRadius: 24, boxShadow: "0 1px 2px rgba(5,27,53,0.05), 0 20px 46px -22px rgba(5,27,53,0.45)", padding: cardPad, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: 999, background: ACCENT, color: INK, display: "flex", alignItems: "center", justifyContent: "center", fontSize: fluidSize(19), fontWeight: 600, flexShrink: 0 }}>{isHolder ? "HC" : (email[0] || "?").toUpperCase()}</div>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ fontSize: fluidSize(18), fontWeight: 600, letterSpacing: "-0.015em" }}>{isHolder ? "Harrison Cogan" : email}</div>
          <div style={{ fontSize: fluidSize(13), color: SUB }}>{isHolder ? "Account 4407086 · member since 2024" : "No season ticket account linked to this email"}</div>
        </div>
        <Link href="/sign-out/" style={{ fontFamily: "inherit", marginLeft: "auto", flexShrink: 0, fontSize: fluidSize(13), fontWeight: 600, color: DANGER, background: "#fff", border: "1px solid rgba(194,57,74,0.28)", borderRadius: 999, padding: "10px 16px", minHeight: 40, whiteSpace: "nowrap", cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Sign out</Link>
      </div>

      <div style={{ ...card, borderRadius: 20, overflow: "hidden" }}>
        <div style={{ padding: `14px ${padX}px`, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, borderBottom: "1px solid rgba(5,27,53,0.06)" }}>
          <div style={{ ...eyebrow, whiteSpace: "nowrap" }}>Account activity</div>
          <div style={{ fontSize: fluidSize(13), fontWeight: 600, color: GREEN, background: GREEN_BG, borderRadius: 999, padding: "5px 11px", whiteSpace: "nowrap" }}>{isHolder ? "$25.00 credit" : "No credit"}</div>
        </div>
        {activity.length === 0 ? (
          <div style={{ padding: "30px 22px", textAlign: "center", display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: fluidSize(15), fontWeight: 600 }}>Nothing here yet</div>
            <div style={{ fontSize: fluidSize(13), color: SUB }}>Purchases, gifts, and credits will appear here.</div>
          </div>
        ) : activity.map((a, i) => (
          <div key={i} style={{ padding: `14px ${padX}px`, display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid rgba(5,27,53,0.06)" }}>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ fontSize: fluidSize(14), fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.item}</div>
              <div style={{ fontSize: fluidSize(12), color: SUB }}>{a.when} · {a.kind}</div>
            </div>
            <div style={{ fontSize: fluidSize(15), fontWeight: 600, fontVariantNumeric: "tabular-nums", color: a.ink }}>{a.amt}</div>
          </div>
        ))}
      </div>

      {profileDefs.map((g) => (
        <div key={g.title} style={{ ...card, borderRadius: 20, overflow: "hidden" }}>
          <div style={{ padding: `14px ${padX}px`, ...eyebrow, borderBottom: "1px solid rgba(5,27,53,0.06)" }}>{g.title}</div>
          {g.rows.map((r) => {
            const val = pvals[r.k] != null ? pvals[r.k] : r.v;
            const isToggle = "toggle" in r && r.toggle;
            const on = toggles[r.k] != null ? toggles[r.k] : ("on" in r ? !!r.on : false);
            return (
              <div key={r.k} style={{ padding: `14px ${padX}px`, display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid rgba(5,27,53,0.06)" }}>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ fontSize: fluidSize(12), color: MUTE }}>{r.k}</div>
                  <div style={{ fontSize: fluidSize(14), fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>{isToggle ? r.v : val}</div>
                </div>
                {isToggle ? (
                  <button onClick={() => setToggles((p) => ({ ...p, [r.k]: !on }))} aria-label={r.k} style={{ flexShrink: 0, width: 50, height: 30, borderRadius: 999, border: "none", padding: 3, boxSizing: "border-box", cursor: "pointer", background: on ? ACCENT : "#d7dbe6", display: "flex", justifyContent: on ? "flex-end" : "flex-start" }}>
                    <span style={{ width: 24, height: 24, borderRadius: 999, background: "#fff", boxShadow: "0 2px 5px rgba(5,27,53,0.28)", display: "block" }} />
                  </button>
                ) : (
                  <button onClick={() => { setField({ group: g.title, heading: (r as { action: string }).action + " " + r.k.toLowerCase(), label: r.k, help: (r as { help: string }).help, key: r.k }); setFieldValue(String(val)); setModal("field"); }} style={{ fontFamily: "inherit", flexShrink: 0, fontSize: fluidSize(13), fontWeight: 600, color: INK, background: "#f1f3f8", border: "none", borderRadius: 999, padding: "9px 15px", whiteSpace: "nowrap", cursor: "pointer" }}>{(r as { action: string }).action}</button>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  /* ---------- modals ---------- */
  const overlay: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 80,
    background: "rgba(5,27,53,0.55)",
    display: "flex",
    alignItems: mobile ? "flex-end" : "center",
    justifyContent: "center",
    padding: mobile ? 0 : 32,
    boxSizing: "border-box",
  };
  const sheet: React.CSSProperties = {
    width: "100%",
    maxWidth: mobile ? "100%" : 460,
    background: "#fff",
    borderRadius: mobile ? "26px 26px 0 0" : 26,
    padding: 22,
    paddingBottom: mobile ? "calc(22px + env(safe-area-inset-bottom))" : 22,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 18,
    maxHeight: mobile ? "92vh" : undefined,
    overflowY: mobile ? "auto" : undefined,
    boxShadow: mobile
      ? "0 -20px 60px -20px rgba(5,27,53,0.5)"
      : "0 30px 70px -30px rgba(5,27,53,0.6)",
  };
  const mobileSheetClass = mobile ? "st-sheet-up" : undefined;
  const closeX = (onClose: () => void, label = "Close", disabled = false) => (
    <button onClick={onClose} aria-label={label} disabled={disabled} style={{ fontFamily: "inherit", flexShrink: 0, width: 34, height: 34, borderRadius: 999, background: "#f1f3f8", border: "none", color: FAINT, display: "flex", alignItems: "center", justifyContent: "center", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.45 : 1 }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
    </button>
  );

  const closeQrPass = () => {
    setQrPass(null);
    setPassWalletError("");
  };

  const addQrPassToPhoneWallet = async () => {
    if (!qrPass || !passWallet) return;
    setPassWalletSaving(true);
    setPassWalletError("");
    const error = await addAccessPassToPhoneWallet(
      qrPass.pass,
      passWallet,
      selectedSeasonPackage?.firstEvent,
    );
    setPassWalletSaving(false);
    if (error) setPassWalletError(error);
    else flashToast("Pass sent to your phone wallet");
  };

  const AccessPassQrModal = () => {
    if (!qrPass?.pass.checkInCode) return null;
    const { pass } = qrPass;
    const seatLine = pass.seat && pass.seat !== "Ticket" ? pass.seat : "";
    const title = seatLine || pass.name;
    return (
      <EntryQrSheet
        title={title}
        value={pass.checkInCode}
        qrAriaLabel={`Enlarged QR code for ${pass.name}`}
        hint="Show this code at entry for any included event."
        onClose={closeQrPass}
        mobile={mobile}
      >
        {passWallet ? (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={eyebrow}>Add this pass to your phone wallet</div>
            <button
              type="button"
              onClick={addQrPassToPhoneWallet}
              disabled={passWalletSaving}
              aria-busy={passWalletSaving || undefined}
              style={{ fontFamily: "inherit", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 50, fontSize: fluidSize(15), fontWeight: 600, color: passWalletTheme?.buttonColor, background: passWalletTheme?.buttonBg, border: "none", borderRadius: 999, cursor: passWalletSaving ? "default" : "pointer", opacity: passWalletSaving ? 0.7 : 1 }}
            >
              <ButtonBusyContents
                loading={passWalletSaving}
                loadingLabel="Adding…"
                spinnerColor={passWalletTheme?.buttonColor}
                trackColor="rgba(255,255,255,0.35)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><rect x="2" y="6" width="20" height="13" rx="3" /><path d="M2 11h20" /></svg>
                {phoneWalletLabel(passWallet)}
              </ButtonBusyContents>
            </button>
            {passWalletError ? (
              <div role="alert" style={{ fontSize: fluidSize(13), lineHeight: browseLeading("body"), color: DANGER, textAlign: "center" }}>
                {passWalletError}
              </div>
            ) : null}
          </div>
        ) : null}
      </EntryQrSheet>
    );
  };

  const offerLine = formatPrintedOfferLine(detail?.raw);
  const detailRows = [
    { k: "Ticket", v: detail?.seat || "" },
    ...(offerLine ? [{ k: "Offer", v: offerLine }] : []),
    {
      k: "Holder",
      v: printedTicketHolderName(
        {
          ...(detail?.raw || {}),
          checkInCode: String(detail?.code || detail?.raw?.checkInCode || ""),
          holder: detail?.holder,
        },
        ticketBuyer,
      ),
    },
    { k: "Barcode", v: detail?.code || "—" },
    { k: "Order", v: ev.orderId || "—" },
    { k: acquiredAtLabel, v: ev.purchasedAt || "—" },
    { k: "Delivery", v: "Mobile entry" },
  ];

  const DetailsModal = () => (
    <div
      onClick={() => setModal(null)}
      style={{ ...overlay, alignItems: "center", padding: 18 }}
    >
      <div className="st-details-sheet" onClick={(e) => e.stopPropagation()} style={{ ...sheet, maxWidth: 460, borderRadius: 26, padding: 22, paddingBottom: 22, maxHeight: "88vh", overflowY: "auto", gap: 16, boxShadow: "0 30px 70px -30px rgba(5,27,53,0.6)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 21, lineHeight: 1.5, fontWeight: 600, letterSpacing: "-0.02em" }}>Ticket details</h2>
          {closeX(() => setModal(null))}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {detailRows.map((d) => (
            <div key={d.k} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, padding: "13px 0", borderBottom: "1px solid rgba(5,27,53,0.07)" }}>
              <div style={{ fontSize: fluidSize(13), lineHeight: 1.5, color: MUTE, flexShrink: 0 }}>{d.k}</div>
              <div style={{ fontSize: fluidSize(14), lineHeight: 1.5, fontWeight: 600, textAlign: "right", fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere" }}>{d.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const TicketQrModal = () => {
    if (!detail?.code) return null;
    return (
      <EntryQrSheet
        title={detail.seat || "Ticket"}
        value={detail.code}
        qrAriaLabel={`QR code for ${detail.seat || "ticket"}`}
        hint="Scan this code at entry"
        onClose={() => setModal(null)}
        mobile={mobile}
      />
    );
  };

  const FieldModal = () => (
    <div style={overlay}>
      <div className={mobileSheetClass} onClick={(e) => e.stopPropagation()} style={sheet}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={eyebrow}>{field?.group}</div>
            <h2 style={{ margin: 0, fontSize: 21, lineHeight: 1.5, fontWeight: 600, letterSpacing: "-0.02em" }}>{field?.heading}</h2>
          </div>
          {closeX(() => setModal(null))}
        </div>
        <form
          noValidate
          style={{ display: "flex", flexDirection: "column", gap: 18 }}
          onSubmit={(e) => {
            e.preventDefault();
            const next = String(new FormData(e.currentTarget).get("fieldValue") || fieldValue);
            setFieldValue(next);
            if (field) {
              setPvals((p) => ({ ...p, [field.key]: next }));
              flashToast(field.key + " updated");
            }
            setModal(null);
          }}
        >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: fluidSize(12), fontWeight: 600, color: FAINT }}>{field?.label}</label>
          <input ref={autoFocusField} name="fieldValue" value={fieldValue} onChange={(e) => setFieldValue(e.target.value)} style={{ fontFamily: "inherit", width: "100%", boxSizing: "border-box", fontSize: fluidSize(16), color: INK, background: "#fff", border: "1px solid rgba(5,27,53,0.12)", borderRadius: 14, padding: "14px 16px", outline: "none" }} />
          <div style={{ fontSize: fluidSize(12), lineHeight: browseLeading("body"), color: MUTE }}>{field?.help}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setModal(null)} style={{ fontFamily: "inherit", flex: 1, fontSize: fluidSize(15), fontWeight: 600, color: INK, background: "#f1f3f8", border: "none", borderRadius: 999, padding: 14, minHeight: 48, cursor: "pointer" }}>Cancel</button>
          <button type="submit" style={{ fontFamily: "inherit", flex: 1, fontSize: fluidSize(15), fontWeight: 600, color: INK, background: ACCENT, border: "none", borderRadius: 999, padding: 14, minHeight: 48, cursor: "pointer" }}>Save</button>
        </div>
        </form>
      </div>
    </div>
  );

  /* transfer wizard */
  const tfEv = tf ? (events[tf.evId] || ev) : ev;
  const tfTickets = (tfEv?.tickets || [])
    .map((ticket, index) => {
      const chip = transferSeatChip(ticket.raw, ticket.seat);
      return {
        ticket,
        key: String(ticket.id ?? ticket.code ?? index),
        ...chip,
      };
    })
    .filter(({ ticket }) => ticket.id != null);
  const tfRowLabel = transferGroupLabel(
    tfEv?.tickets?.[0]?.raw as TicketLike | undefined,
  );
  const tfStep = tf?.step || 1;
  const tfSel = tf?.sel || [];
  const tfSelectedTickets = tfTickets.filter(({ key }) => tfSel.includes(key));
  const tfKind: TransferModalKind = tf?.passKind ?? "ticket";
  const tfCount = tfKind === "ticket" ? Math.max(tfSel.length, tfSelectedTickets.length) : 1;
  const tfCanNext =
    !tfSaving &&
    (tfStep === 1
      ? tfSelectedTickets.length > 0
      : tfStep === 2
        ? Boolean(normalizeEmail(tf?.email))
        : true);
  const doTfPrimary = async (rawEmail?: string) => {
    if (!tf) return;
    if (tfStep === 1 && tfSelectedTickets.length === 0) return;
    if (tfStep === 4) {
      await closeTransferModal();
      return;
    }
    if (tfStep === 3) {
      setTfSaving(true);
      setTfError("");
      try {
        if (tf.passKind && tf.pass?.accessPassUUID) {
          const optimisticPassId = `access-pass-transfer-${tf.pass.accessPassUUID}`;
          const passResponse = await createTicketTransfer({
            accessPassId: tf.pass.accessPassUUID,
            email: tf.email,
          });
          const passCreatedAt = new Date().toISOString();
          const { id: transferId, createdAt } = resolveCreatedTransferMeta(
            passResponse.data,
            { id: optimisticPassId, createdAt: passCreatedAt },
          );
          const seatLines =
            tf.passKind === "season pass" ? [tf.pass.seat].filter(Boolean) : [];
          const passOrderId =
            tf.pass.orderId ||
            routedOrderId ||
            selectedSeasonPackage?.orderId ||
            "";
          const packageOrder = walletOrders.find(
            (order) =>
              String(order.orderId || "") === passOrderId ||
              String(order.id || "") === passOrderId,
          );
          const stubPassEvents = mergeUniquePackageEvents(
            tf.pass.events,
            tf.pass.pass.events,
          );
          const totalPassEvents =
            tf.passKind === "access pass"
              ? tf.pass.eventCount || stubPassEvents.length
              : stubPassEvents.length;
          const remainingCount = Math.max(
            0,
            tf.pass.eventCount - tf.pass.attendedCount,
          );
          const eventCountLine =
            totalPassEvents === 1
              ? "1 event"
              : `${totalPassEvents} events`;
          const entry: Sent = {
            id: transferId,
            to: tf.email,
            from: String(getSession()?.user?.email || email || ""),
            title: tf.pass.name,
            seat: seatLines.join(" · "),
            seatLines,
            schedule:
              tf.passKind === "access pass"
                ? formatAccessPassRemainingLine(remainingCount, totalPassEvents)
                : eventCountLine,
            on: "Just now",
            createdAt,
            status: "pending",
            passKind: tf.passKind,
            accessPassId: tf.pass.accessPassUUID,
            eventCount: totalPassEvents,
            ...(tf.passKind === "access pass" ? { remainingCount } : {}),
          };
          const passOrderSnapshot = buildPassTransferOrderSnapshot(
            packageOrder,
            stubPassEvents,
          );
          const accessPassSnapshot = {
            uuid: tf.pass.accessPassUUID,
            name: tf.pass.name,
            type: tf.passKind === "season pass" ? "package" : "organizer",
            ...(passOrderId ? { orderId: passOrderId } : {}),
            events: stubPassEvents,
            artwork:
              tf.pass.pass.artwork ??
              packageOrder?.package?.image ??
              selectedSeasonPackage?.thumb,
            ...(tf.passKind === "season pass"
              ? {
                  sectionNumber: tf.pass.pass.sectionNumber,
                  rowNumber: tf.pass.pass.rowNumber,
                  seatNumber: tf.pass.pass.seatNumber,
                  generalAdmission: tf.pass.pass.generalAdmission,
                }
              : {}),
          };
          const passStub: PendingSentTransfer = {
            id: transferId,
            status: "pending",
            createdAt,
            fromUserEmail: String(getSession()?.user?.email || email || ""),
            emailAddressToUser: tf.email,
            transferType: "access_pass",
            orderId: passOrderId || undefined,
            accessPassId: tf.pass.accessPassUUID,
            ...(passOrderSnapshot ? { order: passOrderSnapshot } : {}),
            accessPassSnapshot,
            access_pass: accessPassSnapshot,
          };
          setSent((current) => mergeWalletTransferRows([entry], current ?? []));
          let nextOrders = walletOrders;
          let removedTicketIds: Array<number | string> = [];
          if (tf.passKind === "season pass" && packageOrder) {
            const passSnapshot =
              tf.pass.pass ??
              passStub.access_pass ??
              passStub.accessPass ??
              null;
            removedTicketIds = ticketIdsForPassSeat(packageOrder, passSnapshot);
            nextOrders = removeTicketsFromWalletOrders(
              walletOrders,
              removedTicketIds,
            );
          }
          await syncWalletAfterTransferAction({
            sentTransfers: [passStub],
            appendSentTransferStubs: true,
            orders: nextOrders,
            ...(removedTicketIds.length
              ? { removedTicketIds }
              : {}),
          });
        } else {
          const transferWalletOrderId =
            tfEv?.orderId ?? tfEv?.cartId ?? String(tfEv?.orderRecordId ?? "");
          const transferApiOrderId =
            tfEv?.orderRecordId ??
            walletOrders.find(
              (order) =>
                String(order.orderId || "") === transferWalletOrderId ||
                String(order.id || "") === transferWalletOrderId,
            )?.id;
          const transferEventUUID =
            tfEv?.eventUUID ?? tfEv?.event?.uuid ?? undefined;
          const optimisticTransferId = `transfer-${tfSelectedTickets
            .map(({ key }) => key)
            .join("-")}`;
          const ticketResponse = await createTicketTransfer({
            email: tf.email,
            orderId: transferApiOrderId,
            event: tfEv?.event,
            ticketIds: tfSelectedTickets.map(({ ticket }) => ticket.id),
            eventUUID: transferEventUUID,
          });
          const ticketCreatedAt = new Date().toISOString();
          const { id: transferId, createdAt } = resolveCreatedTransferMeta(
            ticketResponse.data,
            { id: optimisticTransferId, createdAt: ticketCreatedAt },
          );
          const selectedTicketPayloads = tfSelectedTickets.map(({ ticket }) => ({
            ...(ticket.raw ?? {}),
            id: ticket.id,
          }));
          const seatLines = groupedWalletSeatLines(selectedTicketPayloads);
          const entry: Sent = {
            id: transferId,
            to: tf.email,
            title: tfEv?.title || "",
            seat: seatLines.join(", "),
            seatLines,
            on: "Just now",
            createdAt,
            status: "pending",
            ticketCount: tfSelectedTickets.length,
          };
          const sentStub: PendingSentTransfer = {
            id: transferId,
            status: "pending",
            createdAt,
            emailAddressToUser: tf.email,
            orderId: transferWalletOrderId,
            eventUUID: transferEventUUID,
            event: tfEv?.event,
            tickets: tfSelectedTickets.map(({ ticket }) => ({
              ...(ticket.raw ?? {}),
              id: ticket.id,
              eventUUID: transferEventUUID,
            })),
          };
          const removedTicketIds = tfSelectedTickets
            .map(({ ticket }) => ticket.id)
            .filter((id): id is number | string => id != null && id !== "");
          const nextOrders = removeTicketsFromWalletOrders(
            walletOrders,
            removedTicketIds,
          );
          setSent((current) => mergeWalletTransferRows([entry], current ?? []));
          await syncWalletAfterTransferAction({
            sentTransfers: [sentStub],
            appendSentTransferStubs: true,
            orders: nextOrders,
            removedTicketIds,
          });
        }

      setTf({ ...tf, step: 4 });
      } catch (err) {
        setTfError(
          tf.passKind
            ? parsePassTransferApiError(err, tf.passKind)
            : parseTicketTransferApiError(err, tfSelectedTickets.length),
        );
      } finally {
        setTfSaving(false);
      }
      return;
    }
    if (tfStep === 2) {
      setTfSaving(true);
      setTfEmailErr(null);
      setTfError("");
      const result = await validateSubmittedEmail(rawEmail ?? tf.email);
      setTfSaving(false);
      if (!result.ok) {
        if (result.error === "required" || result.error === "invalid") {
          setTfEmailErr(result.error);
        } else {
          setTfError(FIELD_COPY.network);
        }
        return;
      }
      if (result.email === normalizeEmail(email)) {
        setTfError(
          tf.passKind
            ? PASS_TRANSFER_DISPLAY_COPY.assigned
            : ticketTransferAssignedCopy(tfSelectedTickets.length),
        );
        return;
      }
      setTf({ ...tf, email: result.email, step: 3 });
      return;
    }
    setTfError("");
    setTfEmailErr(null);
    setTf({ ...tf, step: tfStep + 1 });
  };
  const transferModalType = {
    title: 21,
    stepTitle: 17,
    meta: fluidSize(14),
    metaMuted: fluidSize(13),
    body: fluidSize(14),
    fieldLabel: fluidSize(12),
    fieldValue: fluidSize(15),
    button: fluidSize(15),
    error: fluidSize(13),
    success: 21,
  };
  const transferChipStyle = {
    width: 92,
    height: 87,
    boxSizing: "border-box" as const,
    padding: "16px 10px",
    flexShrink: 0,
    justifyContent: "center",
  };
  const transferChipType = {
    seatLabel: fluidSize(12),
    seatNo: 22,
  };
  const TransferModal = () => (
    <div style={{ ...overlay, zIndex: 85, alignItems: mobile ? "flex-end" : "center", padding: mobile ? 0 : 32 }}>
      <div className={mobile ? "st-sheet-up st-transfer-sheet" : undefined} onClick={(e) => e.stopPropagation()} style={{ ...sheet, maxWidth: mobile ? "100%" : 460, width: "100%", maxHeight: mobile ? "92vh" : "88vh", overflowY: "auto", borderRadius: mobile ? "26px 26px 0 0" : 26, paddingBottom: mobile ? "calc(22px + env(safe-area-inset-bottom))" : 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingBottom: 16, borderBottom: "1px solid rgba(5,27,53,0.08)" }}>
          <h2 style={{ margin: 0, fontSize: transferModalType.title, lineHeight: 1.5, fontWeight: 600, letterSpacing: "-0.02em" }}>Transfer</h2>
          {tfSaving ? null : closeX(() => void closeTransferModal())}
        </div>

        {tfStep === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: transferModalType.stepTitle, lineHeight: 1.5, fontWeight: 600, letterSpacing: "-0.015em" }}>Select tickets to transfer</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontSize: transferModalType.meta, lineHeight: 1.5, fontWeight: 600, color: mobile ? SUB : FAINT }}>{tfRowLabel}</div>
              <div style={{ fontSize: transferModalType.metaMuted, lineHeight: 1.5, fontWeight: 600, color: mobile ? SUB : MUTE }}>{tfTickets.length} {tfTickets.length === 1 ? "ticket" : "tickets"}</div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {tfTickets.map(({ key, seatNo, isGA, ariaLabel }) => {
                const picked = tfSel.includes(key);
                return (
                  <button key={key} type="button" aria-pressed={picked} aria-label={ariaLabel} onClick={() => setTf({ ...tf!, sel: picked ? tfSel.filter((x) => x !== key) : [...tfSel, key] })} style={{ fontFamily: "inherit", ...transferChipStyle, display: "flex", flexDirection: "column", alignItems: "center", gap: isGA ? 0 : 2, background: picked ? ACCENT : FIELD, color: INK, border: `1px solid ${picked ? ACCENT : "rgba(5,27,53,0.10)"}`, borderRadius: 16, cursor: "pointer" }}>
                    {!isGA ? (
                      <span style={{ fontSize: transferChipType.seatLabel, lineHeight: 1.5, fontWeight: 500, color: picked ? "rgba(255,255,255,0.72)" : MUTE }}>Seat</span>
                    ) : null}
                    <span style={{ fontSize: transferChipType.seatNo, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.5 }}>{seatNo}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {tfStep === 2 && (
          <form
            id="season-xfer"
            noValidate
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
            onSubmit={(e) => {
              e.preventDefault();
              doTfPrimary(submittedEmail(new FormData(e.currentTarget)));
            }}
          >
            <div style={{ fontSize: transferModalType.stepTitle, fontWeight: 600, letterSpacing: "-0.015em" }}>Enter the recipient&apos;s email address</div>
            <p style={{ margin: 0, fontSize: transferModalType.body, lineHeight: browseLeading("body"), color: SUB }}>
              {transferRecipientNotifyCopy(tfKind, tfCount)}
            </p>
            <EmailField
              autoFocus
              id="season-xfer-email"
              name="email"
              placeholder="name@email.com"
              value={tf?.email || ""}
              error={tfEmailErr}
              errorMessage={tfError || null}
              disabled={tfSaving}
              onChange={(value) => {
                setTf({ ...tf!, email: value });
                setTfEmailErr(null);
                setTfError("");
              }}
              onBlur={(value) =>
                setTfEmailErr(emailBlurInvalid(value) ? "invalid" : null)
              }
            />
          </form>
        )}
        {tfStep === 3 && tfSaving ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "18px 0 8px" }}>
            <div style={{ fontSize: transferModalType.stepTitle, fontWeight: 600, letterSpacing: "-0.015em", textAlign: "center" }}>
              {transferLoadingTitle(tfKind, tfCount)}
            </div>
            <p style={{ margin: 0, fontSize: transferModalType.body, lineHeight: browseLeading("body"), color: SUB, textAlign: "center" }}>
              Stay on this screen until the transfer finishes.
            </p>
          </div>
        ) : null}
        {tfStep === 3 && !tfSaving ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: transferModalType.stepTitle, fontWeight: 600, letterSpacing: "-0.015em" }}>{transferConfirmTitle(tfKind, tfCount)}</div>
            {tfKind === "ticket" ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {tfSelectedTickets.map(({ key, seatNo, isGA }) => (
                <div key={key} style={{ ...transferChipStyle, display: "flex", flexDirection: "column", alignItems: "center", gap: isGA ? 0 : 2, background: ACCENT, color: INK, borderRadius: 16 }}>
                  {!isGA ? (
                    <span style={{ fontSize: transferChipType.seatLabel, lineHeight: 1.5, fontWeight: 500, color: "rgba(255,255,255,0.72)" }}>Seat</span>
                  ) : null}
                  <span style={{ fontSize: transferChipType.seatNo, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.5 }}>{seatNo}</span>
                </div>
              ))}
            </div>
            ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, background: FIELD, borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ fontSize: transferModalType.fieldValue, fontWeight: 600 }}>{tf?.pass?.name}</div>
              {tfKind === "access pass" ? (
                (tf?.pass?.eventCount ?? 0) > 0 ? (
                  <div style={{ fontSize: transferModalType.fieldLabel, color: MUTE }}>
                    {formatAccessPassRemainingLine(0, tf?.pass?.eventCount ?? 0)}
                  </div>
                ) : null
              ) : tf?.pass?.seat && tf.pass.seat !== "Ticket" ? (
                <div style={{ fontSize: transferModalType.fieldLabel, color: MUTE }}>{tf.pass.seat}</div>
              ) : null}
          </div>
        )}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, background: FIELD, borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ fontSize: transferModalType.fieldLabel, color: MUTE }}>Recipient email address</div>
              <div style={{ fontSize: transferModalType.fieldValue, fontWeight: 600, overflowWrap: "anywhere" }}>{tf?.email}</div>
            </div>
            <p style={{ margin: 0, fontSize: transferModalType.body, lineHeight: browseLeading("body"), color: SUB }}>
              {transferWalletRemovalCopy(tfKind, tfCount)}
            </p>
          </div>
        ) : null}
        {tfError && tfStep !== 2 ? (
          <div role="alert" style={{ fontSize: transferModalType.error, color: DANGER }}>
            {tfError}
          </div>
        ) : null}
        {tfStep === 4 && !tfSaving && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "6px 0 2px" }}>
            <div style={{ width: 78, height: 78, borderRadius: 999, background: GREEN, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" style={{ width: 38, height: 38 }}><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <div style={{ fontSize: transferModalType.success, lineHeight: 1.5, fontWeight: 600, letterSpacing: "-0.02em", textAlign: "center" }}>{transferSuccessTitle(tfKind, tfCount)}</div>
            <p style={{ margin: 0, fontSize: transferModalType.body, lineHeight: browseLeading("body"), color: SUB, textAlign: "center" }}>{transferSuccessBody(tfKind, tfCount)}</p>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {(tfStep === 2 && !tf?.passKind) || (tfStep === 3 && !tfSaving) ? (
            <button type="button" onClick={() => { setTfEmailErr(null); setTfError(""); setTf({ ...tf!, step: tfStep - 1 }); }} style={{ fontFamily: "inherit", flexShrink: 0, display: "flex", alignItems: "center", gap: 8, fontSize: transferModalType.button, lineHeight: 1.5, fontWeight: 600, color: INK, background: "#fff", border: "none", padding: "14px 12px", minHeight: 48, cursor: "pointer" }}><BackArrow />Back</button>
          ) : null}
          {tfStep === 4 && !tfSaving && (
            <Link href={walletSectionHref("listings")} onClick={() => { setListingsSnapshotStale(true); void closeTransferModal(); setListTab("active"); }} style={{ fontFamily: "inherit", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: transferModalType.button, fontWeight: 600, color: INK, background: "#f1f3f8", borderRadius: 999, padding: 14, minHeight: 48, textDecoration: "none", cursor: "pointer" }}>My transfers</Link>
          )}
          <button
            type="button"
            onClick={() => {
              if (tfStep === 2) {
                const form = document.getElementById("season-xfer") as HTMLFormElement | null;
                void doTfPrimary(
                  form ? submittedEmail(new FormData(form)) : tf?.email,
                );
                return;
              }
              void doTfPrimary();
            }}
            disabled={!tfCanNext || tfSaving}
            aria-busy={tfSaving || undefined}
            style={{ fontFamily: "inherit", flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: transferModalType.button, lineHeight: 1.5, fontWeight: 600, color: tfCanNext ? INK : MUTE, background: tfCanNext ? ACCENT : "#d7dbe6", border: "none", borderRadius: 999, padding: 14, minHeight: 48, cursor: "pointer" }}
          >
            <ButtonBusyContents
              loading={tfSaving}
              loadingLabel={tfStep === 2 ? "Checking email…" : "Transferring…"}
              spinnerColor={INK}
              trackColor="rgba(5,27,53,0.2)"
            >
              {tfStep === 3 ? "Transfer" : tfStep === 4 ? "Close" : "Next"}
            </ButtonBusyContents>
          </button>
        </div>
      </div>
    </div>
  );

  const VouchersModal = () => (
    <div style={overlay}>
      <div className={mobileSheetClass} onClick={(e) => e.stopPropagation()} style={{ ...sheet, maxHeight: mobile ? "92vh" : "88vh", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 21, lineHeight: 1.5, fontWeight: 600, letterSpacing: "-0.02em" }}>Your vouchers</h2>
          {closeX(() => setModal(null))}
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          {vouchers.map((v) => (
            <div key={v.code} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: FIELD, border: "1px solid rgba(5,27,53,0.06)", borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ fontSize: fluidSize(16), fontWeight: 600, letterSpacing: "0.04em", fontVariantNumeric: "tabular-nums", color: v.ink }}>{v.code}</div>
              <span style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 7, fontSize: fluidSize(12), fontWeight: 600, color: v.tagInk, background: v.tagBg, borderRadius: 999, padding: "6px 11px" }}>{v.status}<span style={{ width: 7, height: 7, borderRadius: 999, background: v.tagInk }} /></span>
            </div>
          ))}
        </div>
        <button onClick={() => setModal(null)} style={{ fontFamily: "inherit", width: "100%", fontSize: fluidSize(15), fontWeight: 600, color: INK, background: ACCENT, border: "none", borderRadius: 999, padding: 14, minHeight: 48, cursor: "pointer" }}>Close</button>
      </div>
    </div>
  );

  const ConfirmAccept = () => {
    const acceptPopupBtnDisabled: CSSProperties = confirmAcceptSaving
      ? { opacity: 0.55, cursor: "default" }
      : {};
    const acceptEntity = transferKindFromWalletRow(confirmAccept ?? {});

    return (
      <div
        style={{
          ...overlay,
          zIndex: 88,
          alignItems: "center",
          padding: mobile ? 18 : 32,
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            ...sheet,
            maxWidth: mobile ? "100%" : 420,
            width: "100%",
            maxHeight: mobile ? "88vh" : undefined,
            overflowY: mobile ? "auto" : undefined,
            borderRadius: 26,
            padding: 24,
            paddingBottom: 24,
            gap: 16,
            boxShadow: "0 30px 70px -30px rgba(5,27,53,0.6)",
          }}
          aria-busy={confirmAcceptSaving || undefined}
        >
          <h2 style={{ margin: 0, fontSize: 21, lineHeight: 1.5, fontWeight: 600, letterSpacing: "-0.02em" }}>Accept this transfer?</h2>
          <p style={{ margin: 0, fontSize: fluidSize(14), lineHeight: browseLeading("body"), color: SUB }}>
            {transferAcceptConfirmCopy(acceptEntity.kind, acceptEntity.count)}
          </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, background: FIELD, borderRadius: 14, padding: "14px 16px" }}>
            <div style={{ fontSize: fluidSize(14), fontWeight: 600 }}>{confirmAccept?.title}</div>
            {(() => {
              const lines = transferModalDetailLines({
                ...(confirmAccept ?? {}),
                direction: "received",
              });
              return (
                <>
                  {lines.when ? (
                    <div style={{ fontSize: fluidSize(13), color: SUB }}>{lines.when}</div>
                  ) : null}
                  {lines.games ? (
                    <div style={{ fontSize: fluidSize(13), color: SUB }}>{lines.games}</div>
                  ) : null}
                  {lines.remaining ? (
                    <div style={{ fontSize: fluidSize(13), color: SUB }}>{lines.remaining}</div>
                  ) : null}
                  {lines.seats ? (
                    <div style={{ fontSize: fluidSize(13), color: SUB }}>{lines.seats}</div>
                  ) : null}
                  {lines.from ? (
                    <div style={{ fontSize: fluidSize(13), color: SUB }}>{lines.from}</div>
                  ) : null}
                </>
              );
            })()}
        </div>
          {confirmAcceptError ? (
            <div role="alert" style={{ fontSize: fluidSize(13), color: DANGER }}>
              {confirmAcceptError}
            </div>
          ) : null}
        <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              disabled={confirmAcceptSaving}
              onClick={() => {
                if (confirmAcceptSaving) return;
                setConfirmAccept(null);
              }}
              style={{
                fontFamily: "inherit",
                flex: 1,
                fontSize: fluidSize(15),
                fontWeight: 600,
                color: INK,
                background: "#f1f3f8",
                border: "none",
                borderRadius: 999,
                padding: 14,
                minHeight: 48,
                cursor: "pointer",
                ...acceptPopupBtnDisabled,
              }}
            >
              Not now
            </button>
            <button
              type="button"
              disabled={confirmAcceptSaving}
              aria-busy={confirmAcceptSaving || undefined}
              onClick={() => void submitAcceptTransfer()}
              style={{
                fontFamily: "inherit",
                flex: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontSize: fluidSize(15),
                fontWeight: 600,
                color: INK,
                background: ACCENT,
                border: "none",
                borderRadius: 999,
                padding: 14,
                minHeight: 48,
                cursor: "pointer",
                ...acceptPopupBtnDisabled,
              }}
            >
              <ButtonBusyContents
                loading={confirmAcceptSaving}
                loadingLabel="Accepting…"
                spinnerColor={INK}
                trackColor="rgba(5,27,53,0.2)"
              >
                Accept transfer
              </ButtonBusyContents>
            </button>
        </div>
      </div>
    </div>
  );
  };

  const ConfirmCancel = () => {
    const cancelPopupBtnDisabled: CSSProperties = confirmCancelSaving
      ? { opacity: 0.55, cursor: "default" }
      : {};
    const cancelEntity = transferKindFromWalletRow(confirmCancel ?? {});
    const cancelReturnCopy = transferCancelReturnCopy(
      cancelEntity.kind,
      cancelEntity.count,
    );

  return (
      <div
        style={{
          ...overlay,
          zIndex: 88,
          alignItems: "center",
          padding: mobile ? 18 : 32,
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            ...sheet,
            maxWidth: mobile ? "100%" : 420,
            width: "100%",
            maxHeight: mobile ? "88vh" : undefined,
            overflowY: mobile ? "auto" : undefined,
            borderRadius: 26,
            padding: 24,
            paddingBottom: 24,
            gap: 16,
            boxShadow: "0 30px 70px -30px rgba(5,27,53,0.6)",
          }}
          aria-busy={confirmCancelSaving || undefined}
        >
          <h2 style={{ margin: 0, fontSize: 21, lineHeight: 1.5, fontWeight: 600, letterSpacing: "-0.02em" }}>Cancel this transfer?</h2>
          <p style={{ margin: 0, fontSize: fluidSize(14), lineHeight: browseLeading("body"), color: SUB }}>{cancelReturnCopy}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, background: FIELD, borderRadius: 14, padding: "14px 16px" }}>
            <div style={{ fontSize: fluidSize(14), fontWeight: 600 }}>{confirmCancel?.title}</div>
            {(() => {
              const lines = transferModalDetailLines({
                ...(confirmCancel ?? {}),
                direction: "sent",
              });
              return (
                <>
                  {lines.when ? (
                    <div style={{ fontSize: fluidSize(13), color: SUB }}>{lines.when}</div>
                  ) : null}
                  {lines.games ? (
                    <div style={{ fontSize: fluidSize(13), color: SUB }}>{lines.games}</div>
                  ) : null}
                  {lines.remaining ? (
                    <div style={{ fontSize: fluidSize(13), color: SUB }}>{lines.remaining}</div>
                  ) : null}
                  {lines.seats ? (
                    <div style={{ fontSize: fluidSize(13), color: SUB }}>{lines.seats}</div>
                  ) : null}
                  {lines.from ? (
                    <div style={{ fontSize: fluidSize(13), color: SUB }}>{lines.from}</div>
                  ) : null}
                </>
              );
            })()}
          </div>
          {confirmCancelError ? (
            <div role="alert" style={{ fontSize: fluidSize(13), color: DANGER }}>
              {confirmCancelError}
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              disabled={confirmCancelSaving}
              onClick={() => {
                if (confirmCancelSaving) return;
                setConfirmCancel(null);
              }}
              style={{
                fontFamily: "inherit",
                flex: 1,
                fontSize: fluidSize(15),
                fontWeight: 600,
                color: INK,
                background: "#f1f3f8",
                border: "none",
                borderRadius: 999,
                padding: 14,
                minHeight: 48,
                cursor: "pointer",
                ...cancelPopupBtnDisabled,
              }}
            >
              Keep it
            </button>
            <button
              type="button"
              disabled={confirmCancelSaving}
              aria-busy={confirmCancelSaving || undefined}
              onClick={() => void submitCancelTransfer()}
              style={{
                fontFamily: "inherit",
                flex: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontSize: fluidSize(15),
                fontWeight: 600,
                color: "#fff",
                background: DANGER,
                border: "none",
                borderRadius: 999,
                padding: 14,
                minHeight: 48,
                cursor: "pointer",
                ...cancelPopupBtnDisabled,
              }}
            >
              <ButtonBusyContents
                loading={confirmCancelSaving}
                loadingLabel="Cancelling…"
                spinnerColor="#fff"
                trackColor="rgba(255,255,255,0.28)"
              >
                Cancel transfer
              </ButtonBusyContents>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="shopper-page" style={{ width: "100%", maxWidth: "100%", minHeight: "100vh", color: INK, background: "#eef1f8", backgroundImage: "radial-gradient(120% 80% at 50% -10%, #ffffff 0%, #f5f7fc 42%, #e9edf6 100%)", fontFamily: "'Geist', system-ui, -apple-system, sans-serif", WebkitFontSmoothing: "antialiased", ...(showingAccessPass ? { display: "flex", flexDirection: "column", height: "100dvh", maxHeight: "100dvh", overflow: "hidden" } : {}) }}>
      <style>{`${shopperPageTypeCss()}\n.st-noscroll::-webkit-scrollbar{width:0;height:0;display:none}.st-noscroll{-ms-overflow-style:none;scrollbar-width:none}.st-sheet-up{animation:stUp .3s cubic-bezier(.22,.61,.36,1)}@keyframes stUp{from{transform:translateY(100%)}to{transform:translateY(0)}}${EVENT_CSS}`}</style>
      {showHeader ? (
        <div style={showingAccessPass ? { flexShrink: 0 } : undefined}>{Header()}</div>
      ) : null}

      {walletNavPending ? (
        <WalletTicketsBlocksLoading routeDestination />
      ) : showRoutedWallet ? (
        routedWalletPending
          ? RoutedEventShell(DetailLoader(), { showBack: false })
          : routedWalletMissing
            ? RoutedEventMissing()
            : showingAccessPass
              ? AccessPassDetail()
              : showingSeasonPackage
              ? SeasonPackage()
            : showingPackage
              ? Package()
              : EventDetail()
      ) : (
        <>
          {screen === "login" && Login()}
          {screen === "code" && CodeScreen()}
          {displaySection === "events" && screen === "events" && Events()}
          {displaySection === "events" && screen === "event" && (eventDetailPending ? DetailLoader() : EventDetail())}
          {displaySection === "events" && screen === "seasonPackage" && SeasonPackage()}
          {displaySection === "events" && screen === "package" && Package()}
          {displaySection === "listings" && Listings()}
          {displaySection === "resale" && Resale()}
          {displaySection === "giving" && Giving()}
          {displaySection === "profile" && Profile()}
        </>
      )}

      {modal === "details" && DetailsModal()}
      {modal === "qr" && TicketQrModal()}
      {modal === "field" && FieldModal()}
      {modal === "vouchers" && VouchersModal()}
      {tf && TransferModal()}
      {qrPass && AccessPassQrModal()}
      {confirmAccept && ConfirmAccept()}
      {confirmCancel && ConfirmCancel()}

      {toast && (
        <div style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 92, zIndex: 90, display: "flex", alignItems: "center", gap: 9, background: INK, color: "#fff", borderRadius: 999, padding: "12px 18px", fontSize: fluidSize(14), fontWeight: 600, boxShadow: "0 20px 40px -18px rgba(5,27,53,0.8)" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#6fd39a" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><polyline points="20 6 9 17 4 12" /></svg>
          {toast}
        </div>
      )}
    </div>
  );
}
