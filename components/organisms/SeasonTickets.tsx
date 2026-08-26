"use client";

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

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import Spinner from "@/components/atoms/Spinner";
import WalletChrome from "@/components/organisms/WalletChrome";
import { BLOCKTICKETS_GREEN, BLOCKTICKETS_NAVY } from "@/lib/branding";
import EmailField from "@/components/molecules/EmailField";
import {
  emailBlurInvalid,
  emailSubmitInvalid,
  normalizeEmail,
  submittedEmail,
} from "@/lib/fieldValidation";
import { getMyEvents } from "@/lib/api";
import { getSession } from "@/lib/auth";
import {
  buildOrderEventDetails,
  buildFlexPackSummaries,
  buildSeasonPackageEventDetails,
  buildSeasonPackageSummaries,
  summarizeEventDetails,
  formatCartOrderTotal,
  walletEventScheduleLine,
  walletEventTicketsPath,
  walletFlexPackPath,
  walletRouteFromPath,
  type AttractionCard,
  type CartEventDetail,
  type CartEventSummary,
  type FlexPackSummary,
  type SeasonPackageSummary,
} from "@/lib/cartEvents";
import { unwrapList, type OrderLike } from "@/lib/wallet";
import {
  WALLET_NAV,
  walletSectionFromPath,
  walletSectionHref,
} from "@/lib/walletNav";

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
const SEATMAP_THUMB = "/nmstate/seatmap-thumb.svg";

const card: React.CSSProperties = {
  background: "#fff",
  border: `1px solid ${LINE}`,
  borderRadius: 20,
  boxShadow: "0 1px 2px rgba(5,27,53,0.05), 0 10px 24px -14px rgba(5,27,53,0.34)",
};
const eyebrow: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: MUTE,
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
        fontSize: 12,
        fontWeight: 600,
        color: today ? INK : SUB,
      }}
    >
      {today ? (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
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
        <span style={{ fontSize: big ? 13 : 11, fontWeight: 600, letterSpacing: "0.04em", color: "rgba(255,255,255,0.94)", textAlign: "center", padding: 4, lineHeight: 1.1 }}>{initials}</span>
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
const CARD_MESH_BG = "#252930";

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

function resolveImageSrc(src: string) {
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  const path = src.startsWith("/") ? src : `/${src}`;
  if (typeof window !== "undefined") return `${window.location.origin}${path}`;
  return path;
}

/** Sample jersey/card background from logo border pixels (server-side, CORS-safe). */
async function sampleMeshColor(src: string, fallback: string): Promise<string> {
  if (!src) return fallback;
  try {
    const absolute = resolveImageSrc(src);
    const res = await fetch(
      `/api/dominant-color/?src=${encodeURIComponent(absolute)}&mode=mesh`,
    );
    if (!res.ok) return fallback;
    const data = (await res.json()) as { color?: string };
    return data.color || fallback;
  } catch {
    return fallback;
  }
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
  const [meshBg, setMeshBg] = useState(CARD_MESH_BG);

  useEffect(() => {
    if (!side.logo) return;
    let cancelled = false;
    sampleMeshColor(side.logo, CARD_MESH_BG).then((color) => {
      if (!cancelled) setMeshBg(color);
    });
    return () => {
      cancelled = true;
    };
  }, [side.logo]);

  const panelBg = side.logo ? meshBg : side.brand;

  return (
    <div
      aria-hidden={panel === "right"}
      style={{
        position: "absolute",
        inset: 0,
        zIndex,
        clipPath,
        backgroundColor: panelBg,
        overflow: "hidden",
        filter: dropShadow ? "drop-shadow(3px 0 8px rgba(0,0,0,0.35))" : undefined,
      }}
    >
      {side.logo ? (
        <>
          <div aria-hidden style={{ position: "absolute", inset: 0, ...meshPanelStyle(meshBg) }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={side.logo}
            alt={side.name}
            style={{
              position: "absolute",
              top: "56%",
              left: panel === "right" ? "77%" : "23%",
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
              fontSize: logoSize > 72 ? 20 : 15,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: "rgba(255,255,255,0.94)",
              textAlign: "center",
              lineHeight: 1.15,
              textShadow: "0 2px 10px rgba(0,0,0,0.35)",
            }}
          >
            {side.initials}
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
          fontSize: 14,
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
  title: string; when: string; doors: string; venue: string; city: string; address: string;
  id: string; brand: string; initials: string; blurb: string; rec: string; opp: string;
  teams: { name: string; role: string; rec: string; initials: string; brand: string; logo?: string }[];
  tickets: { seat: string; holder: string; code: string }[];
  attractions?: AttractionCard[];
  heroImage?: string;
  posterSrc?: string;
  ticketLabel?: string;
  isCart?: boolean;
  orderId?: string;
  purchasedAt?: string;
  cartId?: string;
  cartTotal?: number;
};

function detailToEventT(d: CartEventDetail, isCart = false): EventT {
  return {
    id: d.key,
    title: d.title,
    when: d.when,
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
    isCart,
    orderId: d.orderId,
    purchasedAt: d.purchasedAt,
    cartId: d.cartId,
    cartTotal: d.cartTotal,
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

/* deterministic faux-QR as an inline SVG data URI */
function qr(seed: string): string {
  const N = 25, Q = 2, S = N + Q * 2;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  let r = h >>> 0;
  const rnd = () => { r = (Math.imul(r, 1103515245) + 12345) >>> 0; return r / 4294967296; };
  const g: boolean[][] = [];
  for (let y = 0; y < N; y++) { g.push([]); for (let x = 0; x < N; x++) g[y].push(rnd() > 0.5); }
  const finder = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
      const edge = x === 0 || y === 0 || x === 6 || y === 6;
      const core = x > 1 && x < 5 && y > 1 && y < 5;
      g[oy + y][ox + x] = edge || core;
    }
    for (let y = -1; y < 8; y++) for (let x = -1; x < 8; x++) {
      const yy = oy + y, xx = ox + x;
      if (yy < 0 || xx < 0 || yy >= N || xx >= N) continue;
      if (x === -1 || y === -1 || x === 7 || y === 7) g[yy][xx] = false;
    }
  };
  finder(0, 0); finder(N - 7, 0); finder(0, N - 7);
  for (let i = 8; i < N - 8; i++) { g[6][i] = i % 2 === 0; g[i][6] = i % 2 === 0; }
  let rects = "";
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g[y][x]) rects += `<rect x="${x + Q}" y="${y + Q}" width="1" height="1"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" shape-rendering="crispEdges"><rect width="${S}" height="${S}" fill="#fff"/><g fill="#3d0420">${rects}</g></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

type Screen = "login" | "code" | "events" | "event" | "seasonPackage" | "package" | "listings" | "giving" | "profile";
type Sent = { id: string; to?: string; from?: string; title: string; seat: string; on: string; status: string };

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
    eventUUID?: string | string[];
    flexPackUUID?: string | string[];
  }>();
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();
  const route = walletRouteFromPath(pathname, params);
  const routedEventUUID = eventUUID || route.eventUUID;
  const routedFlexPackUUID = flexPackUUID || route.flexPackUUID;
  const section = walletSectionFromPath(pathname);
  const resolvedInitialScreen =
    initialScreen !== "events"
      ? initialScreen
      : searchParams?.has("login")
        ? "login"
        : section;
  const [vw, setVw] = useState(1440);
  const [screen, setScreen] = useState<Screen>(resolvedInitialScreen);
  const [tab, setTab] = useState<"upcoming" | "season" | "flex">("upcoming");
  const [email, setEmail] = useState("harrison.cogan@gmail.com");
  const [code, setCode] = useState("");
  const [evId, setEvId] = useState("lobos");
  const [listTab, setListTab] = useState<"active" | "received">("active");
  const [modal, setModal] = useState<null | "details" | "field" | "vouchers">(null);
  const [detail, setDetail] = useState<{ seat?: string; holder?: string; code?: string } | null>(null);
  const [field, setField] = useState<{ group: string; heading: string; label: string; help: string; key: string } | null>(null);
  const [fieldValue, setFieldValue] = useState("");
  const [pvals, setPvals] = useState<Record<string, string>>({});
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [tf, setTf] = useState<null | { step: number; sel: string[]; email: string; evId: string }>(null);
  const [tfEmailErr, setTfEmailErr] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState<Sent | null>(null);
  const [sent, setSent] = useState<Sent[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<CartEventSummary[]>([]);
  const [seasonPackages, setSeasonPackages] = useState<SeasonPackageSummary[]>([]);
  const [seasonPackageKey, setSeasonPackageKey] = useState<string | null>(null);
  const [flexPacks, setFlexPacks] = useState<FlexPackSummary[]>([]);
  const [flexPackKey, setFlexPackKey] = useState<string | null>(null);
  const [eventDetails, setEventDetails] = useState<Record<string, CartEventDetail>>({});
  const [eventsChecked, setEventsChecked] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const codeRef = useRef<HTMLInputElement | null>(null);
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSection = useRef(section);

  useEffect(() => {
    setVw(window.innerWidth);
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

  // One wallet instance serves every section route, so a nav click only changes
  // the URL — the screen follows it here.
  useEffect(() => {
    if (lastSection.current === section) return;
    lastSection.current = section;
    if (screen === "login" || screen === "code") return;
    setScreen(section);
  }, [screen, section]);

  useEffect(() => {
    let cancelled = false;

    const loadUpcomingEvents = async () => {
      const session = getSession();
      if (!session?.jwt) {
        if (!cancelled) {
          setUpcomingEvents([]);
          setSeasonPackages([]);
          setFlexPacks([]);
          setEventDetails({});
          setEventsLoading(false);
          setEventsChecked(true);
        }
        return;
      }

      setEventsLoading(true);
      try {
        const res = await getMyEvents();
        if (cancelled) return;
        const orders = unwrapList<OrderLike>(res.data);
        const holderEmail = String(session.user?.email || email);
        const details = buildOrderEventDetails(orders, holderEmail);
        const packageDetails = buildSeasonPackageEventDetails(orders, holderEmail);
        setEventDetails({ ...details, ...packageDetails });
        setUpcomingEvents(summarizeEventDetails(details));
        setSeasonPackages(buildSeasonPackageSummaries(orders));
        setFlexPacks(buildFlexPackSummaries(orders));
      } catch {
        if (!cancelled) {
          setUpcomingEvents([]);
          setSeasonPackages([]);
          setFlexPacks([]);
          setEventDetails({});
        }
      } finally {
        if (!cancelled) {
          setEventsLoading(false);
          setEventsChecked(true);
        }
      }
    };

    void loadUpcomingEvents();
    return () => {
      cancelled = true;
    };
  }, []);

  const mobile = vw < 900;
  const isHolder = email.trim().toLowerCase() === "harrison.cogan@gmail.com";
  const events = useMemo(buildEvents, []);
  const showRoutedWallet = Boolean(routedEventUUID || routedFlexPackUUID);
  const routedDetail = useMemo(
    () =>
      routedEventUUID
        ? Object.values(eventDetails).find((d) => d.eventUUID === routedEventUUID) || null
        : null,
    [routedEventUUID, eventDetails],
  );
  const routedFlexPack = useMemo(
    () =>
      routedFlexPackUUID
        ? flexPacks.find(
            (row) =>
              row.flexPackUUID === routedFlexPackUUID || row.key === routedFlexPackUUID,
          ) || null
        : null,
    [routedFlexPackUUID, flexPacks],
  );
  const routedWalletPending =
    showRoutedWallet &&
    !routedDetail &&
    !routedFlexPack &&
    (eventsLoading || !eventsChecked);
  const routedWalletMissing =
    showRoutedWallet && !routedDetail && !routedFlexPack && !routedWalletPending;
  const showingEventDetail =
    showRoutedWallet
      ? Boolean(routedDetail && !routedWalletPending && !routedWalletMissing)
      : screen === "event";
  const showingPackage =
    showRoutedWallet
      ? Boolean(routedFlexPack && !routedDetail && !routedWalletPending && !routedWalletMissing)
      : screen === "package";
  const orderEventKey = routedDetail
    ? routedDetail.key
    : evId.startsWith("order:")
      ? evId.slice(6)
      : null;
  const activeEvId = orderEventKey ? `order:${orderEventKey}` : evId;
  const ev =
    (orderEventKey && eventDetails[orderEventKey]
      ? detailToEventT(eventDetails[orderEventKey])
      : events[evId]) || events.lobos;
  const ticketBadge = ev.ticketLabel || "Season Tickets";
  const attractionCards: AttractionCard[] = ev.attractions?.length
    ? ev.attractions
    : ev.teams.map((t) => ({
        name: t.name,
        role: t.role,
        logo: t.logo,
        brand: t.brand,
        initials: t.initials,
      }));
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

  const anyModal = !!modal || !!tf || !!confirmCancel;
  useEffect(() => {
    document.body.style.overflow = anyModal ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [anyModal]);

  const flashToast = (msg: string) => {
    setToast(msg);
    if (toastT.current) clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(null), 2400);
  };

  const sentDefault: Sent[] = isHolder
    ? [{ id: "d2", to: "d.salas@gmail.com", title: "New Mexico State vs. Mercyhurst", seat: "Sec G · Row 25 · Seat 23", on: "Jul 30, 2026", status: "claimed" }]
    : [];
  const sentList = (sent ?? sentDefault).filter((t) => t.status !== "cancelled");
  const received: Sent[] = isHolder
    ? [{ id: "r1", from: "aggieclub@nmsu.edu", title: "New Mexico State vs. Liberty", seat: "Sec G · Row 25 · Seat 24", on: "Jul 18, 2026", status: "claimed" }]
    : [];

  const padX = mobile ? 18 : 22;
  const cardPad = mobile ? "14px 16px" : "16px 20px";
  const bodyPad = mobile ? "22px 18px 104px" : "40px 32px 96px";
  const h1Size = mobile ? 32 : 42;

  /* ---------- small building blocks ---------- */
  const chip = (on: boolean): React.CSSProperties => ({
    fontFamily: "inherit", flexShrink: 0, display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600,
    whiteSpace: "nowrap", background: on ? INK : "#fff", color: on ? "#fff" : INK,
    border: `1px solid ${on ? INK : "rgba(5,27,53,0.12)"}`, borderRadius: 999,
    padding: mobile ? "13px 16px" : "10px 16px", minHeight: mobile ? 46 : undefined, cursor: "pointer",
  });
  const accentBtn: React.CSSProperties = { fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: INK, background: ACCENT, border: "none", borderRadius: 999, padding: "13px 20px", cursor: "pointer" };
  const ghostBtn: React.CSSProperties = { fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: INK, background: "#fff", border: "1px solid rgba(5,27,53,0.14)", borderRadius: 999, padding: "13px 20px", cursor: "pointer" };
  const backBtn: React.CSSProperties = { fontFamily: "inherit", alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: INK, background: "#fff", border: "1px solid rgba(5,27,53,0.12)", borderRadius: 999, padding: "9px 16px 9px 12px", cursor: "pointer" };
  const BackArrow = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>);


  /* ---------- header ---------- */
  const onTickets =
    screen === "events" ||
    screen === "event" ||
    screen === "package" ||
    screen === "seasonPackage" ||
    showRoutedWallet;
  const navDefs = WALLET_NAV.map((item) => ({
    ...item,
    on: item.id === "events" ? onTickets : screen === item.id,
  }));
  const authed = screen !== "login" && screen !== "code";
  const showHeader = !(mobile && showingEventDetail);
  const showTabBar = mobile && authed && !showingEventDetail && screen !== "seasonPackage";

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
          <h1 style={{ margin: 0, fontSize: h1Size, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.05 }}>Welcome Aggie Nation!</h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: SUB }}>Sign in to the email on your NM State season ticket account and we&apos;ll send a six-digit code. No password to remember.</p>
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
          <label style={{ fontSize: 12, fontWeight: 600, color: FAINT }}>Email address</label>
          <input name="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" style={{ fontFamily: "inherit", width: "100%", boxSizing: "border-box", fontSize: 16, color: INK, background: FIELD, border: "1px solid rgba(5,27,53,0.12)", borderRadius: 14, padding: "15px 16px", outline: "none" }} />
          <button type="submit" style={{ fontFamily: "inherit", width: "100%", fontSize: 15, fontWeight: 600, color: INK, background: ACCENT, border: "none", borderRadius: 999, padding: 16, cursor: "pointer" }}>Send my code</button>
          <div style={{ fontSize: 12, lineHeight: 1.5, color: MUTE, textAlign: "center" }}>By continuing you agree to the Blocktickets terms and privacy policy.</div>
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
          <h1 style={{ margin: 0, fontSize: h1Size, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.05 }}>Enter your code</h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: SUB }}>Sent to <strong style={{ fontWeight: 600, color: INK }}>{email}</strong></p>
        </div>
        <div style={{ ...card, borderRadius: 24, padding: 22, display: "flex", flexDirection: "column", gap: 18 }}>
          <div onClick={() => codeRef.current?.focus()} style={{ position: "relative", cursor: "text" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ height: mobile ? 54 : 60, border: `1px solid ${code.length === i ? INK : "rgba(5,27,53,0.12)"}`, background: code.length === i ? "#fff" : FIELD, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: INK }}>{code[i] || ""}</div>
              ))}
            </div>
            <input ref={codeRef} value={code} inputMode="numeric" autoComplete="one-time-code" aria-label="Six-digit code"
              onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 6); setCode(v); if (v.length === 6) setTimeout(() => { setScreen("events"); setCode(""); }, 260); }}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, border: "none", background: "transparent", fontSize: 16, letterSpacing: "1em", cursor: "text", outline: "none" }} />
          </div>
          <div style={{ fontSize: 13, color: MUTE, textAlign: "center" }}>Didn&apos;t get it? <a href="#" style={{ color: INK, fontWeight: 600 }}>Send a new code</a></div>
        </div>
      </div>
    </div>
  );

  const SeatIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><path d="M5 11V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v5" /><path d="M4 11h13a2 2 0 0 1 2 2v3H6a2 2 0 0 1-2-2v-3z" /><path d="M6 16v3M17 16v3" /></svg>
  );

  /* ---------- My Tickets (events list) ---------- */
  const showDemoSchedule =
    eventsChecked &&
    isHolder &&
    upcomingEvents.length === 0 &&
    seasonPackages.length === 0 &&
    flexPacks.length === 0 &&
    !eventsLoading;
  const upcomingCount =
    !eventsChecked || eventsLoading ? 0 : upcomingEvents.length;
  const seasonCount =
    !eventsChecked || eventsLoading
      ? 0
      : seasonPackages.length + (showDemoSchedule ? 1 : 0);
  const tabDefs = [
    { id: "upcoming" as const, label: "Upcoming", n: upcomingCount },
    { id: "season" as const, label: "Season tickets", n: seasonCount },
    { id: "flex" as const, label: "Flex packs", n: flexPacks.length + (showDemoSchedule ? 1 : 0) },
  ];
  const selectedSeasonPackage =
    seasonPackages.find((pkg) => pkg.key === seasonPackageKey) ?? null;
  const seasonPackageGames = seasonPackageKey
    ? summarizeEventDetails(
        Object.fromEntries(
          Object.entries(eventDetails).filter(([key]) =>
            key.startsWith(`${seasonPackageKey}:`),
          ),
        ),
      )
    : [];

  const TicketsLoader = () => (
    <div
      style={{
        ...card,
        borderRadius: 20,
        padding: mobile ? "44px 20px" : "56px 32px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        minHeight: mobile ? 180 : 220,
      }}
      role="status"
      aria-busy="true"
      aria-label="Loading tickets"
    >
      <Spinner size={48} variant="assemble" label="Loading tickets" />
      <div style={{ fontSize: 15, fontWeight: 600, color: INK }}>Loading your tickets…</div>
      <div style={{ fontSize: 13, color: SUB }}>Loading your wallet events.</div>
    </div>
  );

  const RoutedEventShell = (children: React.ReactNode) => (
    <div style={{ maxWidth: 1100, margin: "0 auto", boxSizing: "border-box", padding: mobile ? "24px 16px 128px" : "40px 32px 96px", display: "flex", flexDirection: "column", gap: 18 }}>
      <Link href={walletSectionHref("events")} style={{ ...backBtn, textDecoration: "none" }}><BackArrow />All tickets</Link>
      {children}
    </div>
  );

  const RoutedEventMissing = () =>
    RoutedEventShell(
      <div style={{ ...card, borderRadius: 20, padding: mobile ? "28px 20px" : "40px 32px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: mobile ? 20 : 24, fontWeight: 600, letterSpacing: "-0.02em" }}>
          {flexPackUUID && !eventUUID
            ? "We couldn't find that flex pack"
            : "We couldn't find those tickets"}
        </div>
        <div style={{ fontSize: 14, color: SUB }}>
          {flexPackUUID && !eventUUID
            ? "This flex pack isn't in your wallet, or your session expired. Head back to see everything you own."
            : "This event isn't in your wallet, or your session expired. Head back to see everything you own."}
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

  const SeasonPackageRow = ({ row }: { row: SeasonPackageSummary }) => (
    <div
      key={row.key}
      role="button"
      tabIndex={0}
      onClick={() => openSeasonPackage(row.key)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openSeasonPackage(row.key);
        }
      }}
      style={{
        ...card,
        borderRadius: 20,
        position: "relative",
        overflow: "hidden",
        minHeight: mobile ? 124 : undefined,
        boxSizing: "border-box",
        padding: cardPad,
        paddingRight: mobile ? 112 : 240,
        display: "flex",
        alignItems: "center",
        gap: mobile ? 14 : 18,
        cursor: "pointer",
      }}
    >
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: SUB }}>
          {row.eventCount} {row.eventCount === 1 ? "game" : "games"}
        </div>
        <div style={{ fontSize: mobile ? 15 : 17, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis" }}>
          {row.name}
        </div>
        {!mobile && row.venueLine ? (
          <div style={{ fontSize: 13, color: SUB, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {row.venueLine}
          </div>
        ) : null}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: INK, border: "1px solid rgba(5,27,53,0.16)", borderRadius: 8, padding: "5px 10px", whiteSpace: "nowrap" }}>
            Season tickets
          </span>
          {row.ticketCount > 0 ? (
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: INK, border: "1px solid rgba(5,27,53,0.16)", borderRadius: 8, padding: "5px 10px", whiteSpace: "nowrap" }}>
              <SeatIcon />
              {row.ticketCount} {row.ticketCount === 1 ? "ticket" : "tickets"}
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
          <span style={{ position: "relative", fontSize: mobile ? 14 : 17, fontWeight: 600, letterSpacing: "0.06em", color: "rgba(255,255,255,0.94)", whiteSpace: "nowrap" }}>
            SEASON
          </span>
        ) : null}
      </div>
    </div>
  );

  const FlexPackRow = ({ row }: { row: FlexPackSummary }) => {
    const href = walletFlexPackPath(row.flexPackUUID);
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
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: SUB }}>
          {row.remainingCount} of {row.voucherCount} {row.voucherCount === 1 ? "voucher" : "vouchers"} left
        </div>
        <div style={{ fontSize: mobile ? 15 : 17, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis" }}>
          {row.name}
        </div>
        {!mobile && row.venueLine ? (
          <div style={{ fontSize: 13, color: SUB, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {row.venueLine}
          </div>
        ) : null}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: INK, border: "1px solid rgba(5,27,53,0.16)", borderRadius: 8, padding: "5px 10px", whiteSpace: "nowrap" }}>
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
          <span style={{ position: "relative", fontSize: mobile ? 14 : 17, fontWeight: 600, letterSpacing: "0.06em", color: "rgba(255,255,255,0.94)", whiteSpace: "nowrap" }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: SUB }}>6 games</div>
        <div style={{ fontSize: mobile ? 15 : 17, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.2 }}>NMS Football Season Seats</div>
        {!mobile && <div style={{ fontSize: 13, color: SUB }}>Aggie Memorial Stadium · Las Cruces, NM</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: INK, border: "1px solid rgba(5,27,53,0.16)", borderRadius: 8, padding: "5px 10px", whiteSpace: "nowrap" }}>Season tickets</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: INK, border: "1px solid rgba(5,27,53,0.16)", borderRadius: 8, padding: "5px 10px", whiteSpace: "nowrap" }}>
            <SeatIcon />2
          </span>
        </div>
      </div>
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: mobile ? 124 : 268, background: CRIMSON, clipPath: `polygon(${mobile ? "14%" : "17%"} 0, 100% 0, 100% 100%, 0 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: `14px 14px 14px ${mobile ? 24 : 46}px`, boxSizing: "border-box" }}>
        <span style={{ position: "relative", fontSize: mobile ? 14 : 17, fontWeight: 600, letterSpacing: "0.06em", color: "rgba(255,255,255,0.94)", whiteSpace: "nowrap" }}>SEASON</span>
      </div>
    </div>
  );

  const openOrderEvent = (key: string) => {
    setEvId(`order:${key}`);
    setScreen("event");
  };

  const UpcomingEventRow = ({ row }: { row: CartEventSummary }) => {
    const href = walletEventTicketsPath(row.eventUUID);
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
        <EventScheduleMeta
          today={row.today}
          scheduleLine={walletEventScheduleLine(row)}
        />
        <div style={{ fontSize: mobile ? 15 : 17, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis" }}>
          {row.name}
        </div>
        {!mobile && row.venueLine ? (
          <div style={{ fontSize: 13, color: SUB, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {row.venueLine}
          </div>
        ) : null}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: INK, border: "1px solid rgba(5,27,53,0.16)", borderRadius: 8, padding: "5px 10px", whiteSpace: "nowrap" }}>
            <SeatIcon />
            {row.ticketCount} {row.ticketCount === 1 ? "ticket" : "tickets"}
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
          <span style={{ position: "relative", fontSize: mobile ? 14 : 17, fontWeight: 600, letterSpacing: "0.06em", color: "rgba(255,255,255,0.94)", whiteSpace: "nowrap" }}>
            EVENT
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

  const Events = () => (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: bodyPad, display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
        <h1 style={{ margin: 0, fontSize: h1Size, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1 }}>My tickets</h1>
        {!mobile && <div style={{ fontSize: 13, color: MUTE, whiteSpace: "nowrap" }}>{email}</div>}
      </div>

      {!eventsChecked || eventsLoading ? (
        <TicketsLoader />
      ) : isHolder || upcomingEvents.length > 0 || seasonPackages.length > 0 || flexPacks.length > 0 ? (
        <>
          <div className="st-noscroll" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
            {tabDefs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} style={chip(tab === t.id)}>
                {t.label}<span style={{ fontSize: 12, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: tab === t.id ? "rgba(255,255,255,0.72)" : MUTE }}>{t.n}</span>
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {tab === "upcoming" ? (
              <>
                {upcomingEvents.map((row) => (
                  <UpcomingEventRow key={row.key} row={row} />
                ))}
                {upcomingEvents.length === 0 ? (
                  <div style={{ ...card, borderRadius: 20, padding: "28px 22px", textAlign: "center" }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>No tickets yet</div>
                    <div style={{ marginTop: 6, fontSize: 13, color: SUB }}>Your purchased tickets will show up here after checkout.</div>
                  </div>
                ) : null}
              </>
            ) : tab === "season" ? (
              <>
                {seasonPackages.map((row) => (
                  <SeasonPackageRow key={row.key} row={row} />
                ))}
                {showDemoSchedule ? <DemoSeasonPackageRow /> : null}
                {seasonPackages.length === 0 && !showDemoSchedule ? (
                  <div style={{ ...card, borderRadius: 20, padding: "28px 22px", textAlign: "center" }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>No season tickets yet</div>
                    <div style={{ marginTop: 6, fontSize: 13, color: SUB }}>Season packages you buy will show up here.</div>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                {flexPacks.map((row) => (
                  <FlexPackRow key={row.key} row={row} />
                ))}
                {showDemoSchedule ? (
                <div onClick={() => openFlexPack(null)} style={{ ...card, borderRadius: 20, position: "relative", overflow: "hidden", minHeight: mobile ? 124 : undefined, boxSizing: "border-box", padding: cardPad, paddingRight: mobile ? 112 : 240, display: "flex", alignItems: "center", gap: mobile ? 14 : 18, cursor: "pointer" }}>
                  <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: "#b5791e" }}><span style={{ width: 5, height: 5, borderRadius: 999, background: "#b5791e" }} />2 of 4 credits left</div>
                    <div style={{ fontSize: mobile ? 15 : 17, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.2 }}>Aggie Pick-4 Flex Pack</div>
                    {!mobile && <div style={{ fontSize: 13, color: SUB }}>Redeem any four home games</div>}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: INK, border: "1px solid rgba(5,27,53,0.16)", borderRadius: 8, padding: "5px 10px" }}>Flex pack</span>
                    </div>
                  </div>
                  <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: mobile ? 124 : 268, background: CRIMSON, clipPath: `polygon(${mobile ? "14%" : "17%"} 0, 100% 0, 100% 100%, 0 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: `14px 14px 14px ${mobile ? 24 : 46}px`, boxSizing: "border-box" }}>
                    <span style={{ position: "relative", fontSize: mobile ? 14 : 17, fontWeight: 600, letterSpacing: "0.06em", color: "rgba(255,255,255,0.94)", whiteSpace: "nowrap" }}>PICK-4</span>
                  </div>
                </div>
                ) : null}
                {flexPacks.length === 0 && !showDemoSchedule ? (
                <div style={{ ...card, borderRadius: 20, padding: "28px 22px", textAlign: "center" }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>No flex packs yet</div>
                  <div style={{ marginTop: 6, fontSize: 13, color: SUB }}>Flex pack vouchers you buy will show up here.</div>
                </div>
                ) : null}
              </>
              )}
          </div>
        </>
      ) : (
        <div style={{ ...card, borderRadius: 24, padding: mobile ? "34px 20px" : "48px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 999, background: INK, display: "flex", alignItems: "center", justifyContent: "center", padding: 11, boxSizing: "border-box" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="" style={{ maxWidth: "100%", maxHeight: "100%", display: "block" }} />
          </div>
          <h2 style={{ margin: 0, fontSize: 21, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.2 }}>No NM State tickets on this email</h2>
          <p style={{ margin: 0, maxWidth: 420, fontSize: 15, lineHeight: 1.6, color: SUB }}>We couldn&apos;t find season tickets, single-game tickets, or vouchers for <strong style={{ fontWeight: 600, color: INK }}>{email}</strong>. If you bought with a different address, sign in with that one.</p>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, paddingTop: 4 }}>
            <button style={{ ...accentBtn, padding: "14px 22px", minHeight: 48, fontSize: 15 }}>Browse NM State tickets</button>
            <button onClick={() => setScreen("login")} style={{ ...ghostBtn, padding: "14px 22px", minHeight: 48, fontSize: 15 }}>Try a different email</button>
          </div>
        </div>
      )}
    </div>
  );

  /* ---------- event detail ---------- */
  const ticketRows = ev.tickets.map((t) => {
    const parts = t.seat.split("·").map((p) => p.trim());
    if (parts.length >= 3) {
      return {
        ...t,
        sec: parts[0].replace(/^Sec\s*/i, ""),
        row: parts[1].replace(/^Row\s*/i, ""),
        seatNo: parts[2].replace(/^Seat\s*/i, ""),
      };
    }
    return { ...t, sec: parts[0] || "GA", row: "—", seatNo: "—" };
  });
  const orderRows = ev.isCart
    ? [
        { k: "Cart", v: ev.cartId || "—" },
        { k: "Status", v: "In cart" },
        { k: "Total", v: formatCartOrderTotal(ev.cartTotal) },
        { k: "Delivery", v: "Mobile entry" },
      ]
    : [
        { k: "Order number", v: ev.orderId || "—" },
        { k: "Purchased", v: ev.purchasedAt || "—" },
        { k: "Total paid", v: formatCartOrderTotal(ev.cartTotal) },
        { k: "Delivery", v: "Mobile entry" },
      ];
  const openTransfer = () => { setTf({ step: 1, sel: [], email: "", evId: activeEvId }); setModal(null); };

  /* When the event screen owns the URL, leaving it has to pop back to tickets. */
  const EventBackControl = (
    style: React.CSSProperties,
    children: React.ReactNode,
    label?: string,
    preferSeasonPackage = true,
  ) =>
    eventUUID || flexPackUUID || routedEventUUID || routedFlexPackUUID ? (
      <Link href={walletSectionHref("events")} aria-label={label} style={{ textDecoration: "none", ...style }}>
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
    aspectRatio = mobile ? "2.1 / 1" : "3.4 / 1",
    logoSize = mobile ? 88 : 120,
    compactTextSize = mobile ? 20 : 26,
    fullTextSize = mobile ? 24 : 40,
  }: {
    aspectRatio?: string;
    logoSize?: number;
    compactTextSize?: number;
    fullTextSize?: number;
  }) => (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio,
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
    const multi = attractionCards.length >= 2;
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: mobile || !multi ? "1fr" : "1fr 1fr",
          gap: 10,
        }}
      >
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
              <div style={{ ...eyebrow, letterSpacing: "0.10em" }}>{tm.role}</div>
              <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.2 }}>
                {tm.name}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const MobileEvent = () => (
    <div style={{ boxSizing: "border-box", padding: "calc(env(safe-area-inset-top) + 74px) 12px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* dark top bar */}
      <div style={{ position: "fixed", left: 0, right: 0, top: 0, zIndex: 45, boxSizing: "border-box", background: "#14161c", padding: "calc(env(safe-area-inset-top) + 12px) 16px 12px", display: "flex", alignItems: "center", gap: 12 }}>
        {EventBackControl(
          { fontFamily: "inherit", flexShrink: 0, width: 36, height: 36, borderRadius: 999, background: "transparent", border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
          "Close",
        )}
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", letterSpacing: "-0.015em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.66)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.when} · {ev.venue}</div>
        </div>
      </div>

      {/* ticket carousel */}
      <div className="st-noscroll" style={{ display: "flex", gap: 14, overflowX: "auto", scrollSnapType: "x mandatory", scrollbarWidth: "none", msOverflowStyle: "none", margin: "0 -12px", padding: "2px 12px 6px" } as React.CSSProperties}>
        {ticketRows.map((t, i) => (
          <div key={i} style={{ flex: "0 0 94%", scrollSnapAlign: "center", overflow: "hidden", borderRadius: 20, background: "#fff", boxShadow: "0 1px 2px rgba(5,27,53,0.06), 0 18px 38px -22px rgba(5,27,53,0.55)", display: "flex", flexDirection: "column" }}>
            {/* card header — matchup */}
            <div style={{ position: "relative", height: 210, overflow: "hidden", background: "#06203c" }}>
              {renderEventHero({ radius: 0, logoSize: 72, compactTextSize: 20, fullTextSize: 20 })}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(6,8,14,0.05) 30%, rgba(6,8,14,0.86) 100%)" }} />
              <div style={{ position: "absolute", left: 16, top: 16, fontSize: 10, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "#fff", background: "rgba(10,12,18,0.55)", backdropFilter: "blur(6px)", borderRadius: 999, padding: "6px 11px" }}>{ticketBadge}</div>
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.title}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.74)" }}>{ev.when} · {ev.venue}</div>
              </div>
            </div>

            {/* seat strip */}
            <div style={{ display: "flex", alignItems: "stretch", borderBottom: "1px solid rgba(5,27,53,0.08)" }}>
              <div style={{ width: 5, background: ACCENT }} />
              <div style={{ flex: 1, minWidth: 0, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                  {[["Sec", t.sec], ["Row", t.row], ["Seat", t.seatNo]].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: MUTE }}>{k}</span>
                      <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.025em", fontVariantNumeric: "tabular-nums" }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 13, color: SUB }}>Enter at Gate 3 · Aggie Memorial</div>
              </div>
            </div>

            {/* actions */}
            <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
              <button onClick={() => { setDetail(t); setModal("details"); }} style={{ fontFamily: "inherit", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 50, fontSize: 15, fontWeight: 600, color: "#fff", background: "#14161c", border: "none", borderRadius: 12, cursor: "pointer" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><rect x="2" y="6" width="20" height="13" rx="3" /><path d="M2 11h20" /></svg>
                Add to Apple Wallet
              </button>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button onClick={() => { setDetail(t); setModal("details"); }} style={{ fontFamily: "inherit", minHeight: 44, fontSize: 14, fontWeight: 600, color: INK, background: "#fff", border: `1px solid ${ACCENT}`, borderRadius: 12, cursor: "pointer" }}>View QR-Code</button>
                <button onClick={() => { setDetail(t); setModal("details"); }} style={{ fontFamily: "inherit", minHeight: 44, fontSize: 14, fontWeight: 600, color: INK, background: "#fff", border: "1px solid rgba(5,27,53,0.14)", borderRadius: 12, cursor: "pointer" }}>Ticket details</button>
              </div>
            </div>

            {/* verified footer */}
            <div style={{ borderTop: "1px dashed rgba(5,27,53,0.16)", padding: "11px 18px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><path d="M12 3l7 3v5c0 4.4-2.9 8.3-7 10-4.1-1.7-7-5.6-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: INK }}>Verified Ticket</span>
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

      {/* transfer action — flows under the card, no dead space */}
      <div style={{ display: "flex", gap: 10, padding: "0 4px" }}>
        <button onClick={openTransfer} style={{ fontFamily: "inherit", flex: "1 1 0", minWidth: 0, minHeight: 50, fontSize: 15, fontWeight: 600, color: INK, background: "#fff", border: "1px solid rgba(5,27,53,0.14)", borderRadius: 14, padding: "12px 6px", cursor: "pointer", whiteSpace: "nowrap" }}>Transfer</button>
      </div>
    </div>
  );

  const EventDetail = () => (mobile ? MobileEvent() : DesktopEvent());

  const DesktopEvent = () => (
    <div style={{ maxWidth: 1100, margin: "0 auto", boxSizing: "border-box", padding: mobile ? "24px 16px 128px" : "40px 32px 96px", display: "flex", flexDirection: "column", gap: 18 }}>
      {EventBackControl(backBtn, <><BackArrow />All tickets</>)}
      <div style={{ overflow: "hidden", borderRadius: 20, ...card, boxShadow: "0 1px 2px rgba(5,27,53,0.05), 0 14px 30px -18px rgba(5,27,53,0.40)" }}>
        <EventHeroBanner />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 320px", gap: mobile ? 16 : 40, alignItems: "start" }}>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ ...card, borderRadius: 20, padding: cardPad, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <h1 style={{ margin: 0, fontSize: mobile ? 22 : 30, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.1 }}>{ev.title}</h1>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 20px", fontSize: 14, color: SUB }}>
                <span style={{ fontWeight: 600, color: INK }}>{ev.when}</span><span>Doors {ev.doors}</span>
              </div>
            </div>
            <div style={{ height: 1, background: "rgba(5,27,53,0.08)" }} />
            <AttractionCards />
            {ev.blurb ? (
              <>
                <div style={{ height: 1, background: "rgba(5,27,53,0.08)" }} />
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: FAINT }}>{ev.blurb}</p>
              </>
            ) : null}
          </div>

          <div style={{ ...card, borderRadius: 20, overflow: "hidden" }}>
            {ticketRows.map((t, i) => (
              <div key={i} style={{ padding: cardPad, display: "flex", alignItems: "center", gap: 16, borderBottom: "1px solid rgba(5,27,53,0.07)", flexWrap: "wrap" }}>
                <div style={{ width: 72, height: 72, borderRadius: 14, background: FIELD, border: "1px solid rgba(5,27,53,0.08)", flexShrink: 0, overflow: "hidden" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={SEATMAP_THUMB} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ flex: 1, minWidth: 150, display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ alignSelf: "flex-start", fontSize: 11, fontWeight: 600, color: INK, background: SOFT, borderRadius: 999, padding: "4px 10px" }}>{ticketBadge}</span>
                  <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" }}>{t.seat}</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button style={{ ...ghostBtn, fontSize: 13, padding: "11px 18px" }}>Print PDF</button>
                  <button onClick={() => { setDetail(t); setModal("details"); }} style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: INK, background: "#f1f3f8", border: "none", borderRadius: 999, padding: "11px 18px", cursor: "pointer" }}>Details</button>
                </div>
              </div>
            ))}
            <div style={{ padding: `14px ${padX}px`, background: "#fbfcfe", display: "flex", alignItems: "center", gap: 12 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, flexShrink: 0 }}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><line x1="14" y1="14" x2="21" y2="14" /><line x1="14" y1="18" x2="18" y2="18" /><line x1="18" y1="21" x2="21" y2="21" /></svg>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: FAINT }}><strong style={{ fontWeight: 600, color: INK }}>Your phone is your ticket.</strong> QR codes open on your phone only. Add each seat to Apple/Google Wallet on game day.</div>
            </div>
          </div>
        </div>

        <aside style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 12, position: mobile ? "static" : "sticky", top: 96 }}>
          <div style={{ ...card, borderRadius: 20, padding: cardPad, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ ...eyebrow, paddingBottom: 4 }}>Manage</div>
            <button onClick={openTransfer} style={{ fontFamily: "inherit", width: "100%", textAlign: "left", fontSize: 14, fontWeight: 600, color: INK, background: "#fff", border: "1px solid rgba(5,27,53,0.14)", borderRadius: 12, padding: "13px 16px", cursor: "pointer" }}>Transfer</button>
            <button style={{ fontFamily: "inherit", width: "100%", textAlign: "left", fontSize: 14, fontWeight: 600, color: INK, background: "#fff", border: "1px solid rgba(5,27,53,0.14)", borderRadius: 12, padding: "13px 16px", cursor: "pointer" }}>Print all</button>
          </div>
          <div style={{ ...card, borderRadius: 20, padding: cardPad, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={eyebrow}>Getting there</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{ev.venue}</div>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: SUB }}>{ev.address}</div>
            <button style={{ ...accentBtn, alignSelf: "flex-start", marginTop: 6, display: "flex", alignItems: "center", gap: 7, fontSize: 13, padding: "11px 18px" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>Get directions
            </button>
          </div>
          <div style={{ ...card, borderRadius: 20, padding: cardPad, display: "flex", flexDirection: "column" }}>
            <div style={{ ...eyebrow, paddingBottom: 10 }}>Order</div>
            {orderRows.map((o) => (
              <div key={o.k} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, padding: "9px 0", borderTop: "1px solid rgba(5,27,53,0.07)" }}>
                <div style={{ fontSize: 13, color: MUTE }}>{o.k}</div>
                <div style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{o.v}</div>
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
                    ? `Gates open · ${g.doors}`
                    : `${g.date} · ${g.time}`
                }
              />
              <div style={{ fontSize: mobile ? 15 : 17, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis" }}>New Mexico State vs. {g.opp}</div>
              {!mobile && <div style={{ fontSize: 13, color: SUB, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Aggie Memorial Stadium · Las Cruces, NM</div>}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: INK, border: "1px solid rgba(5,27,53,0.16)", borderRadius: 8, padding: "5px 10px", whiteSpace: "nowrap" }}>Season Tickets</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: INK, border: "1px solid rgba(5,27,53,0.16)", borderRadius: 8, padding: "5px 10px", whiteSpace: "nowrap" }}>
                  <SeatIcon />2
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
    const eventCount = isDemo
      ? 6
      : selectedSeasonPackage?.eventCount ?? seasonPackageGames.length;
    return (
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: bodyPad, display: "flex", flexDirection: "column", gap: 16 }}>
        <button
          onClick={() => {
            setTab("season");
            setScreen("events");
          }}
          style={backBtn}
        >
          <BackArrow />All tickets
        </button>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={eyebrow}>Season tickets</div>
          <h1 style={{ margin: 0, fontSize: mobile ? 22 : 28, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.12 }}>{title}</h1>
          <div style={{ fontSize: 13, color: SUB }}>
            {eventCount} {eventCount === 1 ? "game" : "games"}
            {selectedSeasonPackage?.venueLine ? ` · ${selectedSeasonPackage.venueLine}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {isDemo ? (
            <DemoScheduleRows />
          ) : seasonPackageGames.length > 0 ? (
            seasonPackageGames.map((row) => (
              <UpcomingEventRow key={row.key} row={row} />
            ))
          ) : (
            <div style={{ ...card, borderRadius: 20, padding: "28px 22px", textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>No upcoming games</div>
              <div style={{ marginTop: 6, fontSize: 13, color: SUB }}>Games in this package will show up here when they are available.</div>
            </div>
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
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: bodyPad, display: "flex", flexDirection: "column", gap: 16 }}>
      {EventBackControl(backBtn, <><BackArrow />All tickets</>, undefined, false)}
      <div style={{ ...card, borderRadius: 24, boxShadow: "0 1px 2px rgba(5,27,53,0.05), 0 20px 46px -22px rgba(5,27,53,0.45)", padding: cardPad, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={eyebrow}>FLEX PACKAGE</div>
          <h1 style={{ margin: 0, fontSize: mobile ? 22 : 28, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.12 }}>{selectedFlexPack?.name || "Aggie Pick-4 Flex Pack"}</h1>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 10 }}>
          {[{ k: "Vouchers", v: String(vouchers.length) }, { k: "Status", v: flexRemaining > 0 ? "Active" : "Redeemed" }, { k: "Credits left", v: `${flexRemaining} of ${vouchers.length}` }].map((s) => (
            <div key={s.k} style={{ background: FIELD, borderRadius: 14, padding: "13px 15px", display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: MUTE }}>{s.k}</div>
              <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, background: SOFT, borderRadius: 16, padding: "14px 16px" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17, flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: INK }}>Redeem a voucher for a ticket at the Box Office for any available game.</div>
      </div>
      <div style={{ ...card, borderRadius: 20, overflow: "hidden" }}>
        <div style={{ padding: `15px ${padX}px`, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, borderBottom: "1px solid rgba(5,27,53,0.08)" }}>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>Vouchers</div>
          <div style={{ fontSize: 13, color: SUB, fontVariantNumeric: "tabular-nums" }}>{flexRemaining} active · {vouchers.length - flexRemaining} redeemed</div>
        </div>
        {vouchers.map((v) => (
          <div key={v.code} style={{ padding: `14px ${padX}px`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottom: "1px solid rgba(5,27,53,0.05)" }}>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "0.05em", fontVariantNumeric: "tabular-nums", color: v.ink }}>{v.code}</div>
            <span style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: v.tagInk, background: v.tagBg, borderRadius: 999, padding: "6px 11px" }}>{v.status}<span style={{ width: 7, height: 7, borderRadius: 999, background: v.tagInk }} /></span>
          </div>
        ))}
      </div>
    </div>
  );

  /* ---------- transfers (listings) ---------- */
  const listData = listTab === "received" ? received : sentList;
  const Listings = () => (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: bodyPad, display: "flex", flexDirection: "column", gap: 18 }}>
      <h1 style={{ margin: 0, fontSize: h1Size, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1 }}>Transfers</h1>
      <div style={{ display: "flex", gap: 6 }}>
        {[{ id: "active" as const, label: "Sent", n: sentList.length }, { id: "received" as const, label: "Received", n: received.length }].map((t) => (
          <button key={t.id} onClick={() => setListTab(t.id)} style={chip(listTab === t.id)}>
            {t.label}<span style={{ fontSize: 12, fontWeight: 500, color: listTab === t.id ? "rgba(255,255,255,0.72)" : MUTE }}>{t.n}</span>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {listData.length === 0 ? (
          <div style={{ background: "#fff", border: "1px dashed rgba(5,27,53,0.16)", borderRadius: 20, padding: "34px 22px", textAlign: "center", display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{listTab === "received" ? "Nothing received yet" : "No transfers sent"}</div>
            <div style={{ fontSize: 13, color: SUB }}>{listTab === "received" ? "Tickets people send you will land here." : "Open a ticket and tap Transfer to send a seat."}</div>
          </div>
        ) : listData.map((t) => {
          const pending = t.status === "pending";
          return (
            <div key={t.id} style={{ ...card, borderRadius: 20, padding: cardPad, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", color: pending ? "#c07a12" : GREEN }}>
                  <span style={{ width: 5, height: 5, flexShrink: 0, borderRadius: 999, background: pending ? "#c07a12" : GREEN }} />
                  {pending ? "Pending · awaiting claim" : "Claimed · " + t.on}
                </div>
                <div style={{ fontSize: mobile ? 15 : 17, fontWeight: 600, letterSpacing: "-0.015em" }}>{t.title}</div>
                <div style={{ fontSize: 13, color: SUB }}>{t.seat}</div>
                <div style={{ fontSize: 13, color: SUB }}>{listTab === "received" ? "From " + t.from : "To " + t.to + " · sent " + t.on}</div>
              </div>
              {listTab !== "received" && pending && (
                <button onClick={() => setConfirmCancel(t)} style={{ fontFamily: "inherit", flexShrink: 0, fontSize: 13, fontWeight: 600, color: DANGER, background: "#fff", border: "1px solid rgba(194,57,74,0.28)", borderRadius: 999, padding: "10px 16px", minHeight: 42, whiteSpace: "nowrap", cursor: "pointer" }}>Cancel transfer</button>
              )}
            </div>
          );
        })}
      </div>
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
      <h1 style={{ margin: 0, fontSize: h1Size, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1 }}>Giving</h1>
      <div style={{ ...card, borderRadius: 24, boxShadow: "0 1px 2px rgba(5,27,53,0.05), 0 20px 46px -22px rgba(5,27,53,0.45)", padding: cardPad, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 10 }}>
          {givingStats.map((s) => (
            <div key={s.k} style={{ background: FIELD, borderRadius: 14, padding: "13px 15px", display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: MUTE }}>{s.k}</div>
              <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>{s.v}</div>
            </div>
          ))}
        </div>
        {isHolder && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>$1,400 to Crimson level</div>
              <div style={{ fontSize: 12, color: MUTE }}>unlocks earlier seat selection</div>
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
            <div style={{ fontSize: 15, fontWeight: 600 }}>No gifts yet</div>
            <div style={{ fontSize: 13, color: SUB }}>Aggie Club gifts you make will show up here.</div>
          </div>
        ) : gifts.map((g, i) => (
          <div key={i} style={{ padding: `15px ${padX}px`, display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid rgba(5,27,53,0.06)" }}>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{g.fund}</div>
              <div style={{ fontSize: 12, color: SUB }}>{g.date} · {g.who}</div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{g.amt}</div>
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
      <h1 style={{ margin: 0, fontSize: h1Size, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1 }}>Profile</h1>
      <div style={{ ...card, borderRadius: 24, boxShadow: "0 1px 2px rgba(5,27,53,0.05), 0 20px 46px -22px rgba(5,27,53,0.45)", padding: cardPad, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: 999, background: ACCENT, color: INK, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, fontWeight: 600, flexShrink: 0 }}>{isHolder ? "HC" : (email[0] || "?").toUpperCase()}</div>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.015em" }}>{isHolder ? "Harrison Cogan" : email}</div>
          <div style={{ fontSize: 13, color: SUB }}>{isHolder ? "Account 4407086 · member since 2024" : "No season ticket account linked to this email"}</div>
        </div>
        <button onClick={() => setScreen("login")} style={{ fontFamily: "inherit", marginLeft: "auto", flexShrink: 0, fontSize: 13, fontWeight: 600, color: DANGER, background: "#fff", border: "1px solid rgba(194,57,74,0.28)", borderRadius: 999, padding: "10px 16px", minHeight: 40, whiteSpace: "nowrap", cursor: "pointer" }}>Sign out</button>
      </div>

      <div style={{ ...card, borderRadius: 20, overflow: "hidden" }}>
        <div style={{ padding: `14px ${padX}px`, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, borderBottom: "1px solid rgba(5,27,53,0.06)" }}>
          <div style={{ ...eyebrow, whiteSpace: "nowrap" }}>Account activity</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: GREEN, background: GREEN_BG, borderRadius: 999, padding: "5px 11px", whiteSpace: "nowrap" }}>{isHolder ? "$25.00 credit" : "No credit"}</div>
        </div>
        {activity.length === 0 ? (
          <div style={{ padding: "30px 22px", textAlign: "center", display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Nothing here yet</div>
            <div style={{ fontSize: 13, color: SUB }}>Purchases, gifts, and credits will appear here.</div>
          </div>
        ) : activity.map((a, i) => (
          <div key={i} style={{ padding: `14px ${padX}px`, display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid rgba(5,27,53,0.06)" }}>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.item}</div>
              <div style={{ fontSize: 12, color: SUB }}>{a.when} · {a.kind}</div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: a.ink }}>{a.amt}</div>
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
                  <div style={{ fontSize: 12, color: MUTE }}>{r.k}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>{isToggle ? r.v : val}</div>
                </div>
                {isToggle ? (
                  <button onClick={() => setToggles((p) => ({ ...p, [r.k]: !on }))} aria-label={r.k} style={{ flexShrink: 0, width: 50, height: 30, borderRadius: 999, border: "none", padding: 3, boxSizing: "border-box", cursor: "pointer", background: on ? ACCENT : "#d7dbe6", display: "flex", justifyContent: on ? "flex-end" : "flex-start" }}>
                    <span style={{ width: 24, height: 24, borderRadius: 999, background: "#fff", boxShadow: "0 2px 5px rgba(5,27,53,0.28)", display: "block" }} />
                  </button>
                ) : (
                  <button onClick={() => { setField({ group: g.title, heading: (r as { action: string }).action + " " + r.k.toLowerCase(), label: r.k, help: (r as { help: string }).help, key: r.k }); setFieldValue(String(val)); setModal("field"); }} style={{ fontFamily: "inherit", flexShrink: 0, fontSize: 13, fontWeight: 600, color: INK, background: "#f1f3f8", border: "none", borderRadius: 999, padding: "9px 15px", whiteSpace: "nowrap", cursor: "pointer" }}>{(r as { action: string }).action}</button>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  /* ---------- modals ---------- */
  const overlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 80, background: "rgba(5,27,53,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: mobile ? 18 : 32, boxSizing: "border-box" };
  const sheet: React.CSSProperties = { width: "100%", maxWidth: 460, background: "#fff", borderRadius: 26, padding: 22, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 18, boxShadow: "0 30px 70px -30px rgba(5,27,53,0.6)" };
  const closeX = (onClose: () => void) => (
    <button onClick={onClose} aria-label="Close" style={{ fontFamily: "inherit", flexShrink: 0, width: 34, height: 34, borderRadius: 999, background: "#f1f3f8", border: "none", color: FAINT, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
    </button>
  );

  const detailRows = [
    { k: "Ticket", v: detail?.seat || "" },
    { k: "Holder", v: detail?.holder || email },
    { k: "Barcode", v: detail?.code || "—" },
    { k: "Order", v: "1473-802122-9407" },
    { k: "Purchased", v: "Thu, Jul 30 · 8:52 AM" },
    { k: "Delivery", v: "Mobile entry" },
  ];

  const DetailsModal = () => (
    <div onClick={() => setModal(null)} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...sheet, maxHeight: "88vh", overflowY: "auto", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>Ticket details</h2>
          {closeX(() => setModal(null))}
        </div>
        {mobile && detail?.code && (
          <div style={{ alignSelf: "center", width: 180, height: 180, borderRadius: 14, overflow: "hidden", border: `1px solid ${LINE}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr(detail.code)} alt="Ticket QR" style={{ width: "100%", height: "100%", display: "block" }} />
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {detailRows.map((d) => (
            <div key={d.k} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, padding: "13px 0", borderBottom: "1px solid rgba(5,27,53,0.07)" }}>
              <div style={{ fontSize: 13, color: MUTE, flexShrink: 0 }}>{d.k}</div>
              <div style={{ fontSize: 14, fontWeight: 600, textAlign: "right", fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere" }}>{d.v}</div>
            </div>
          ))}
        </div>
        <button onClick={() => setModal(null)} style={{ fontFamily: "inherit", width: "100%", fontSize: 15, fontWeight: 600, color: INK, background: "#f1f3f8", border: "none", borderRadius: 999, padding: 15, cursor: "pointer" }}>Done</button>
      </div>
    </div>
  );

  const FieldModal = () => (
    <div onClick={() => setModal(null)} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={sheet}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={eyebrow}>{field?.group}</div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.15 }}>{field?.heading}</h2>
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
          <label style={{ fontSize: 12, fontWeight: 600, color: FAINT }}>{field?.label}</label>
          <input name="fieldValue" value={fieldValue} onChange={(e) => setFieldValue(e.target.value)} style={{ fontFamily: "inherit", width: "100%", boxSizing: "border-box", fontSize: 16, color: INK, background: FIELD, border: "1px solid rgba(5,27,53,0.12)", borderRadius: 14, padding: "14px 16px", outline: "none" }} />
          <div style={{ fontSize: 12, lineHeight: 1.5, color: MUTE }}>{field?.help}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setModal(null)} style={{ fontFamily: "inherit", flex: 1, fontSize: 15, fontWeight: 600, color: INK, background: "#f1f3f8", border: "none", borderRadius: 999, padding: 14, minHeight: 48, cursor: "pointer" }}>Cancel</button>
          <button type="submit" style={{ fontFamily: "inherit", flex: 1, fontSize: 15, fontWeight: 600, color: INK, background: ACCENT, border: "none", borderRadius: 999, padding: 14, minHeight: 48, cursor: "pointer" }}>Save</button>
        </div>
        </form>
      </div>
    </div>
  );

  /* transfer wizard */
  const tfEv = tf ? (events[tf.evId] || ev) : ev;
  const tfSeatNos = (tfEv?.tickets || []).map((t) => (t.seat.match(/Seat (\d+)/) || [])[1] || "1");
  const tfRowLabel = tfEv?.tickets?.[0] ? tfEv.tickets[0].seat.split(" · ").slice(0, 2).join(" · ") : "";
  const tfStep = tf?.step || 1;
  const tfSel = tf?.sel || [];
  const tfCanNext = tfStep === 1 ? tfSel.length > 0 : true;
  const doTfPrimary = (rawEmail?: string) => {
    if (!tf) return;
    if (tfStep === 1 && tfSel.length === 0) return;
    if (tfStep === 4) { setTf(null); return; }
    if (tfStep === 3) {
      const entry: Sent = { id: "t" + Date.now(), to: tf.email, title: tfEv?.title || "", seat: tfRowLabel + " · Seat " + tfSel.join(", "), on: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), status: "pending" };
      setSent([entry, ...sentList]);
      setTf({ ...tf, step: 4 });
      return;
    }
    if (tfStep === 2) {
      const next = normalizeEmail(rawEmail ?? tf.email);
      if (emailSubmitInvalid(next)) {
        setTfEmailErr(true);
        return;
      }
      setTfEmailErr(false);
      setTf({ ...tf, email: next, step: 3 });
      return;
    }
    setTf({ ...tf, step: tfStep + 1 });
  };
  const TransferModal = () => (
    <div onClick={() => setTf(null)} style={{ ...overlay, zIndex: 85, alignItems: mobile ? "flex-end" : "center", padding: mobile ? 0 : 32 }}>
      <div className={mobile ? "st-sheet-up" : undefined} onClick={(e) => e.stopPropagation()} style={{ ...sheet, maxWidth: mobile ? "100%" : 460, width: "100%", maxHeight: mobile ? "92vh" : "88vh", overflowY: "auto", borderRadius: mobile ? "26px 26px 0 0" : 26, paddingBottom: mobile ? "calc(22px + env(safe-area-inset-bottom))" : 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingBottom: 16, borderBottom: "1px solid rgba(5,27,53,0.08)" }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>Transfer</h2>
          {closeX(() => setTf(null))}
        </div>

        {tfStep === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" }}>Select tickets to transfer</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: FAINT }}>{tfRowLabel}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: MUTE }}>{tfSeatNos.length} {tfSeatNos.length === 1 ? "ticket" : "tickets"}</div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {tfSeatNos.map((no) => {
                const picked = tfSel.includes(no);
                return (
                  <button key={no} onClick={() => setTf({ ...tf!, sel: picked ? tfSel.filter((x) => x !== no) : [...tfSel, no] })} style={{ fontFamily: "inherit", width: 92, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: picked ? ACCENT : FIELD, color: INK, border: `1px solid ${picked ? ACCENT : "rgba(5,27,53,0.10)"}`, borderRadius: 16, padding: "16px 10px", cursor: "pointer" }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: picked ? "rgba(255,255,255,0.72)" : MUTE }}>Seat</span>
                    <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>{no}</span>
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
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" }}>Enter the recipient&apos;s email address</div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: SUB }}>They&apos;ll get an email saying you sent them a ticket. It stays in your account until they claim it.</p>
            <EmailField
              id="season-xfer-email"
              name="email"
              placeholder="name@email.com"
              value={tf?.email || ""}
              invalid={tfEmailErr}
              onChange={(value) => {
                setTf({ ...tf!, email: value });
                setTfEmailErr(false);
              }}
              onBlur={(value) => setTfEmailErr(emailBlurInvalid(value))}
            />
          </form>
        )}
        {tfStep === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" }}>You are about to transfer {tfSel.length} {tfSel.length === 1 ? "ticket" : "tickets"}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {tfSel.map((no) => (
                <div key={no} style={{ width: 92, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: ACCENT, color: INK, borderRadius: 16, padding: "16px 10px" }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.72)" }}>Seat</span>
                  <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>{no}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, background: FIELD, borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, color: MUTE }}>Recipient email address</div>
              <div style={{ fontSize: 15, fontWeight: 600, overflowWrap: "anywhere" }}>{tf?.email}</div>
            </div>
          </div>
        )}
        {tfStep === 4 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "6px 0 2px" }}>
            <div style={{ width: 78, height: 78, borderRadius: 999, background: GREEN, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" style={{ width: 38, height: 38 }}><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-0.02em", textAlign: "center" }}>{tfSel.length === 1 ? "Your ticket has been transferred" : "Your tickets have been transferred"}</div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: SUB, textAlign: "center" }}>Pending until {tf?.email} claims it. Cancel any time before then — once claimed, the ticket leaves your account.</p>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {(tfStep === 2 || tfStep === 3) && (
            <button type="button" onClick={() => setTf({ ...tf!, step: tfStep - 1 })} style={{ fontFamily: "inherit", flexShrink: 0, display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 600, color: INK, background: "#fff", border: "none", padding: "14px 12px", minHeight: 48, cursor: "pointer" }}><BackArrow />Back</button>
          )}
          {tfStep === 4 && (
            <Link href={walletSectionHref("listings")} onClick={() => { setTf(null); setListTab("active"); }} style={{ fontFamily: "inherit", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 600, color: INK, background: "#f1f3f8", borderRadius: 999, padding: 14, minHeight: 48, textDecoration: "none", cursor: "pointer" }}>My transfers</Link>
          )}
          <button
            type={tfStep === 2 ? "submit" : "button"}
            form={tfStep === 2 ? "season-xfer" : undefined}
            onClick={tfStep === 2 ? undefined : () => doTfPrimary()}
            disabled={!tfCanNext}
            style={{ fontFamily: "inherit", flex: 1, fontSize: 15, fontWeight: 600, color: tfCanNext ? INK : MUTE, background: tfCanNext ? ACCENT : "#d7dbe6", border: "none", borderRadius: 999, padding: 14, minHeight: 48, cursor: "pointer" }}
          >
            {tfStep === 3 ? "Transfer" : tfStep === 4 ? "Close" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );

  const VouchersModal = () => (
    <div onClick={() => setModal(null)} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...sheet, maxHeight: "88vh", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>Your vouchers</h2>
          {closeX(() => setModal(null))}
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          {vouchers.map((v) => (
            <div key={v.code} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: FIELD, border: "1px solid rgba(5,27,53,0.06)", borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "0.04em", fontVariantNumeric: "tabular-nums", color: v.ink }}>{v.code}</div>
              <span style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: v.tagInk, background: v.tagBg, borderRadius: 999, padding: "6px 11px" }}>{v.status}<span style={{ width: 7, height: 7, borderRadius: 999, background: v.tagInk }} /></span>
            </div>
          ))}
        </div>
        <button onClick={() => setModal(null)} style={{ fontFamily: "inherit", width: "100%", fontSize: 15, fontWeight: 600, color: INK, background: ACCENT, border: "none", borderRadius: 999, padding: 14, minHeight: 48, cursor: "pointer" }}>Close</button>
      </div>
    </div>
  );

  const ConfirmCancel = () => (
    <div onClick={() => setConfirmCancel(null)} style={{ ...overlay, zIndex: 88 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...sheet, maxWidth: 420, borderRadius: 26, padding: 24, gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 21, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.2 }}>Cancel this transfer?</h2>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: SUB }}>The seat comes back to your wallet and {confirmCancel?.to} loses access to it. You can send it again any time before kickoff.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, background: FIELD, borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{confirmCancel?.title}</div>
          <div style={{ fontSize: 13, color: SUB }}>{confirmCancel?.seat}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setConfirmCancel(null)} style={{ fontFamily: "inherit", flex: 1, fontSize: 15, fontWeight: 600, color: INK, background: "#f1f3f8", border: "none", borderRadius: 999, padding: 14, minHeight: 48, cursor: "pointer" }}>Keep it</button>
          <button onClick={() => { const id = confirmCancel?.id; setSent(sentList.map((x) => (x.id === id ? { ...x, status: "cancelled" } : x))); setConfirmCancel(null); flashToast("Transfer cancelled"); }} style={{ fontFamily: "inherit", flex: 1, fontSize: 15, fontWeight: 600, color: "#fff", background: DANGER, border: "none", borderRadius: 999, padding: 14, minHeight: 48, cursor: "pointer" }}>Cancel transfer</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ width: "100%", maxWidth: "100%", overflowX: "clip", minHeight: "100vh", color: INK, background: "#eef1f8", backgroundImage: "radial-gradient(120% 80% at 50% -10%, #ffffff 0%, #f5f7fc 42%, #e9edf6 100%)", backgroundAttachment: "fixed", fontFamily: "'Geist', system-ui, -apple-system, sans-serif", WebkitFontSmoothing: "antialiased" }}>
      <style>{`.st-noscroll::-webkit-scrollbar{width:0;height:0;display:none}.st-noscroll{-ms-overflow-style:none;scrollbar-width:none}.st-sheet-up{animation:stUp .3s cubic-bezier(.22,.61,.36,1)}@keyframes stUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
      {showHeader && Header()}

      {showRoutedWallet ? (
        routedWalletPending
          ? RoutedEventShell(TicketsLoader())
          : routedWalletMissing
            ? RoutedEventMissing()
            : showingPackage
              ? Package()
              : EventDetail()
      ) : (
        <>
          {screen === "login" && Login()}
          {screen === "code" && CodeScreen()}
          {screen === "events" && Events()}
          {screen === "event" && EventDetail()}
          {screen === "seasonPackage" && SeasonPackage()}
          {screen === "package" && Package()}
          {screen === "listings" && Listings()}
          {screen === "giving" && Giving()}
          {screen === "profile" && Profile()}
        </>
      )}

      {modal === "details" && DetailsModal()}
      {modal === "field" && FieldModal()}
      {modal === "vouchers" && VouchersModal()}
      {tf && TransferModal()}
      {confirmCancel && ConfirmCancel()}

      {toast && (
        <div style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 92, zIndex: 90, display: "flex", alignItems: "center", gap: 9, background: INK, color: "#fff", borderRadius: 999, padding: "12px 18px", fontSize: 14, fontWeight: 600, boxShadow: "0 20px 40px -18px rgba(5,27,53,0.8)" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#6fd39a" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><polyline points="20 6 9 17 4 12" /></svg>
          {toast}
        </div>
      )}
    </div>
  );
}
