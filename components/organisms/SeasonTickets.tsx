"use client";

/**
 * SeasonTickets — NM State season-ticket-holder portal, ported from the
 * Claude Design "My Tickets.dc.html" handoff. A self-contained, dummy-data
 * flow (no backend): login → code → My Tickets → event detail → flex package
 * → transfers → giving → profile, plus transfer wizard / details / field-edit
 * / vouchers / cancel modals. Crimson NM State brand, Geist type.
 *
 * Team-specific wedge/banner art isn't in the repo, so rows fall back to the
 * designed initials-on-brand-color wedge (exactly the design's own fallback).
 */

import { useEffect, useMemo, useRef, useState } from "react";

/* ---- brand tokens ---- */
const CRIMSON = "#8c0b42";
const CRIMSON_HI = "#a3134f";
const INK = "var(--paper)";
const SUB = "#6e7180";
const MUTE = "#8a93a3";
const FAINT = "#4a5567";
const FIELD = "#f7f8fc";
const LINE = "color-mix(in srgb, var(--paper) 10%, transparent)";
const GREEN = "#2f8f4e";
const GREEN_BG = "#e7f5ec";
const DANGER = "#c2394a";
const SOFT = "#f7e9ef";
const LOGO = "/nmstate/nmstate-logo-nowordmark.png";
const SEATMAP_THUMB = "/nmstate/seatmap-thumb.svg";

const card: React.CSSProperties = {
  background: "#fff",
  border: `1px solid ${LINE}`,
  borderRadius: 20,
  boxShadow: "0 1px 2px color-mix(in srgb, var(--paper) 5%, transparent), 0 10px 24px -14px color-mix(in srgb, var(--paper) 34%, transparent)",
};
const eyebrow: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: MUTE,
};

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

/** Wide matchup banner that cover-fits, falling back to a brand gradient + "NMSU vs X" text. */
function MatchupHero({ src, brand, oppBrand, text, textSize, radius }: { src?: string; brand: string; oppBrand: string; text: string; textSize: number; radius?: number }) {
  const [err, setErr] = useState(false);
  if (src && !err) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={text} onError={() => setErr(true)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: radius }} />
    );
  }
  return (
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(120deg, ${brand} 0%, ${oppBrand} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: radius }}>
      <span style={{ fontSize: textSize, fontWeight: 700, letterSpacing: "0.04em", color: "rgba(255,255,255,0.92)" }}>{text}</span>
    </div>
  );
}

type EventT = {
  title: string; when: string; doors: string; venue: string; city: string; address: string;
  id: string; brand: string; initials: string; blurb: string; rec: string; opp: string;
  teams: { name: string; role: string; rec: string; initials: string; brand: string; logo?: string }[];
  tickets: { seat: string; holder: string; code: string }[];
};

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

type Screen = "login" | "code" | "events" | "event" | "package" | "listings" | "giving" | "profile";
type Sent = { id: string; to?: string; from?: string; title: string; seat: string; on: string; status: string };

export default function SeasonTickets({ initialScreen = "events" }: { initialScreen?: Screen }) {
  const [vw, setVw] = useState(1440);
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [tab, setTab] = useState<"upcoming" | "flex">("upcoming");
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
  const [confirmCancel, setConfirmCancel] = useState<Sent | null>(null);
  const [sent, setSent] = useState<Sent[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement | null>(null);
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setVw(window.innerWidth);
    const onR = () => setVw(window.innerWidth);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  const mobile = vw < 900;
  const isHolder = email.trim().toLowerCase() === "harrison.cogan@gmail.com";
  const events = useMemo(buildEvents, []);
  const ev = events[evId];

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
  const pill = (label: string, onClick: () => void, on: boolean): React.CSSProperties => ({
    fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: on ? "#fff" : "#b8c6dc",
    background: on ? "rgba(255,255,255,0.12)" : "transparent", border: "none", borderRadius: 999,
    padding: "9px 14px", cursor: "pointer", whiteSpace: "nowrap",
  });
  const chip = (on: boolean): React.CSSProperties => ({
    fontFamily: "inherit", flexShrink: 0, display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600,
    whiteSpace: "nowrap", background: on ? CRIMSON : "#fff", color: on ? "#fff" : INK,
    border: `1px solid ${on ? CRIMSON : "color-mix(in srgb, var(--paper) 12%, transparent)"}`, borderRadius: 999,
    padding: mobile ? "13px 16px" : "10px 16px", minHeight: mobile ? 46 : undefined, cursor: "pointer",
  });
  const crimsonBtn: React.CSSProperties = { fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: "#fff", background: CRIMSON, border: "none", borderRadius: 999, padding: "13px 20px", cursor: "pointer" };
  const ghostBtn: React.CSSProperties = { fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: INK, background: "#fff", border: "1px solid color-mix(in srgb, var(--paper) 14%, transparent)", borderRadius: 999, padding: "13px 20px", cursor: "pointer" };
  const backBtn: React.CSSProperties = { fontFamily: "inherit", alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: INK, background: "#fff", border: "1px solid color-mix(in srgb, var(--paper) 12%, transparent)", borderRadius: 999, padding: "9px 16px 9px 12px", cursor: "pointer" };
  const BackArrow = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>);


  /* ---------- header ---------- */
  const navDefs = [
    { id: "events" as Screen, label: "Tickets", on: screen === "events" || screen === "event" || screen === "package" },
    { id: "listings" as Screen, label: "Transfers", on: screen === "listings" },
    { id: "giving" as Screen, label: "Giving", on: screen === "giving" },
    { id: "profile" as Screen, label: "Profile", on: screen === "profile" },
  ];
  const authed = screen !== "login" && screen !== "code";
  const showHeader = !(mobile && screen === "event");

  const Header = () => (
    <header style={{ background: `linear-gradient(180deg, ${CRIMSON_HI} 0%, ${CRIMSON} 100%)`, position: "sticky", top: 0, zIndex: 20, boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset, 0 12px 30px -12px color-mix(in srgb, var(--paper) 55%, transparent)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: mobile ? "42px 16px 12px" : "18px 32px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, flexShrink: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: 999, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 7, boxSizing: "border-box", boxShadow: "0 6px 16px -8px rgba(0,0,0,0.6)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="New Mexico State" style={{ maxWidth: "100%", maxHeight: "100%" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", color: "#fff", whiteSpace: "nowrap" }}>NM State Athletics</div>
            {!mobile && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.62)", whiteSpace: "nowrap" }}>
                Season tickets<span style={{ width: 3, height: 3, borderRadius: 999, background: "rgba(255,255,255,0.5)" }} />Blocktickets
              </div>
            )}
          </div>
        </div>
        {authed && !mobile && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 2 }}>
            {navDefs.map((n) => (
              <button key={n.id} onClick={() => setScreen(n.id)} style={pill(n.label, () => {}, n.on)}>{n.label}</button>
            ))}
          </div>
        )}
      </div>
    </header>
  );

  const TabBar = () => (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40, background: "rgba(255,255,255,0.94)", backdropFilter: "blur(12px)", borderTop: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)", boxShadow: "0 -12px 30px -18px color-mix(in srgb, var(--paper) 55%, transparent)", padding: "8px 10px 14px", display: "flex", gap: 4 }}>
      {navDefs.map((n) => (
        <button key={n.id} onClick={() => setScreen(n.id)} style={{ fontFamily: "inherit", flex: 1, minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: n.on ? "#fff" : SUB, background: n.on ? CRIMSON : "transparent", border: "none", borderRadius: 999, cursor: "pointer" }}>{n.label}</button>
      ))}
    </div>
  );

  /* ---------- login ---------- */
  const Login = () => (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: mobile ? "32px 18px 56px" : "64px 32px 80px", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ width: 76, height: 76, borderRadius: 999, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 13, boxSizing: "border-box", marginBottom: 6, boxShadow: "0 1px 2px color-mix(in srgb, var(--paper) 5%, transparent), 0 10px 24px -14px color-mix(in srgb, var(--paper) 34%, transparent)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="New Mexico State Athletics" style={{ maxWidth: "100%", maxHeight: "100%", display: "block" }} />
          </div>
          <div style={eyebrow}>NM State Athletics · Season ticket account</div>
          <h1 style={{ margin: 0, fontSize: h1Size, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.05 }}>Welcome Aggie Nation!</h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: SUB }}>Sign in to the email on your NM State season ticket account and we&apos;ll send a six-digit code. No password to remember.</p>
        </div>
        <div style={{ ...card, borderRadius: 24, boxShadow: "0 1px 2px color-mix(in srgb, var(--paper) 5%, transparent), 0 20px 46px -22px color-mix(in srgb, var(--paper) 45%, transparent)", padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: FAINT }}>Email address</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" style={{ fontFamily: "inherit", width: "100%", boxSizing: "border-box", fontSize: 16, color: INK, background: FIELD, border: "1px solid color-mix(in srgb, var(--paper) 12%, transparent)", borderRadius: 14, padding: "15px 16px", outline: "none" }} />
          <button onClick={() => { setScreen("code"); setCode(""); }} style={{ fontFamily: "inherit", width: "100%", fontSize: 15, fontWeight: 600, color: "#fff", background: CRIMSON, border: "none", borderRadius: 999, padding: 16, cursor: "pointer", boxShadow: "0 12px 26px -12px color-mix(in srgb, var(--paper) 85%, transparent)" }}>Send my code</button>
          <div style={{ fontSize: 12, lineHeight: 1.5, color: MUTE, textAlign: "center" }}>By continuing you agree to the Blocktickets terms and privacy policy.</div>
        </div>
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
                <div key={i} style={{ height: mobile ? 54 : 60, border: `1px solid ${code.length === i ? INK : "color-mix(in srgb, var(--paper) 12%, transparent)"}`, background: code.length === i ? "#fff" : FIELD, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: INK }}>{code[i] || ""}</div>
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

  /* ---------- My Tickets (events list) ---------- */
  const tabDefs = [{ id: "upcoming" as const, label: "Upcoming", n: 6 }, { id: "flex" as const, label: "Flex packs", n: 1 }];
  const Events = () => (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: bodyPad, display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
        <h1 style={{ margin: 0, fontSize: h1Size, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1 }}>My tickets</h1>
        {!mobile && <div style={{ fontSize: 13, color: MUTE, whiteSpace: "nowrap" }}>{email}</div>}
      </div>

      {isHolder ? (
        <>
          <div className="st-noscroll" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
            {tabDefs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} style={chip(tab === t.id)}>
                {t.label}<span style={{ fontSize: 12, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: tab === t.id ? "rgba(255,255,255,0.72)" : MUTE }}>{t.n}</span>
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {tab === "upcoming"
              ? SCHEDULE.map((g) => {
                  const today = g.id === "mercyhurst";
                  return (
                    <div key={g.id} onClick={() => { setEvId(g.id); setScreen("event"); }} style={{ ...card, borderRadius: 20, position: "relative", overflow: "hidden", minHeight: mobile ? 124 : undefined, boxSizing: "border-box", padding: cardPad, paddingRight: mobile ? 112 : 240, display: "flex", alignItems: "center", gap: mobile ? 14 : 18, cursor: "pointer" }}>
                      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: today ? CRIMSON : SUB }}>
                          {today
                            ? <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.10em", color: "#fff", background: CRIMSON, borderRadius: 999, padding: "4px 10px" }}>Today</span>
                            : <span style={{ width: 5, height: 5, borderRadius: 999, background: SUB }} />}
                          {today ? "Gates open · " + g.time : g.date + " · " + g.time}
                        </div>
                        <div style={{ fontSize: mobile ? 15 : 17, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis" }}>New Mexico State vs. {g.opp}</div>
                        {!mobile && <div style={{ fontSize: 13, color: SUB, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Aggie Memorial Stadium · Las Cruces, NM</div>}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: INK, border: "1px solid color-mix(in srgb, var(--paper) 16%, transparent)", borderRadius: 8, padding: "5px 10px", whiteSpace: "nowrap" }}>Season Tickets</span>
                          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: INK, border: "1px solid color-mix(in srgb, var(--paper) 16%, transparent)", borderRadius: 8, padding: "5px 10px", whiteSpace: "nowrap" }}>
                            <SeatIcon />2
                          </span>
                        </div>
                      </div>
                      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: mobile ? 124 : 268, background: g.brand, clipPath: `polygon(${mobile ? "14%" : "17%"} 0, 100% 0, 100% 100%, 0 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: `14px 14px 14px ${mobile ? 24 : 46}px`, boxSizing: "border-box", overflow: "hidden" }}>
                        <TeamPanelArt src={BANNER[g.id]} initials={g.initials} fontSize={mobile ? 14 : 17} />
                      </div>
                    </div>
                  );
                })
              : (
                <div onClick={() => setScreen("package")} style={{ ...card, borderRadius: 20, position: "relative", overflow: "hidden", minHeight: mobile ? 124 : undefined, boxSizing: "border-box", padding: cardPad, paddingRight: mobile ? 112 : 240, display: "flex", alignItems: "center", gap: mobile ? 14 : 18, cursor: "pointer" }}>
                  <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: "#b5791e" }}><span style={{ width: 5, height: 5, borderRadius: 999, background: "#b5791e" }} />2 of 4 credits left</div>
                    <div style={{ fontSize: mobile ? 15 : 17, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.2 }}>Aggie Pick-4 Flex Pack</div>
                    {!mobile && <div style={{ fontSize: 13, color: SUB }}>Redeem any four home games</div>}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: INK, border: "1px solid color-mix(in srgb, var(--paper) 16%, transparent)", borderRadius: 8, padding: "5px 10px" }}>Flex pack</span>
                    </div>
                  </div>
                  <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: mobile ? 124 : 268, background: CRIMSON, clipPath: `polygon(${mobile ? "14%" : "17%"} 0, 100% 0, 100% 100%, 0 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: `14px 14px 14px ${mobile ? 24 : 46}px`, boxSizing: "border-box" }}>
                    <span style={{ position: "relative", fontSize: mobile ? 14 : 17, fontWeight: 600, letterSpacing: "0.06em", color: "rgba(255,255,255,0.94)", whiteSpace: "nowrap" }}>PICK-4</span>
                  </div>
                </div>
              )}
          </div>
        </>
      ) : (
        <div style={{ ...card, borderRadius: 24, padding: mobile ? "34px 20px" : "48px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 999, background: CRIMSON, display: "flex", alignItems: "center", justifyContent: "center", padding: 11, boxSizing: "border-box" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="" style={{ maxWidth: "100%", maxHeight: "100%", display: "block" }} />
          </div>
          <h2 style={{ margin: 0, fontSize: 21, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.2 }}>No NM State tickets on this email</h2>
          <p style={{ margin: 0, maxWidth: 420, fontSize: 15, lineHeight: 1.6, color: SUB }}>We couldn&apos;t find season tickets, single-game tickets, or vouchers for <strong style={{ fontWeight: 600, color: INK }}>{email}</strong>. If you bought with a different address, sign in with that one.</p>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, paddingTop: 4 }}>
            <button style={{ ...crimsonBtn, padding: "14px 22px", minHeight: 48, fontSize: 15 }}>Browse NM State tickets</button>
            <button onClick={() => setScreen("login")} style={{ ...ghostBtn, padding: "14px 22px", minHeight: 48, fontSize: 15 }}>Try a different email</button>
          </div>
        </div>
      )}
    </div>
  );

  const SeatIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><path d="M5 11V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v5" /><path d="M4 11h13a2 2 0 0 1 2 2v3H6a2 2 0 0 1-2-2v-3z" /><path d="M6 16v3M17 16v3" /></svg>
  );

  /* ---------- event detail ---------- */
  const ticketRows = ev.tickets.map((t) => {
    const parts = t.seat.split("·").map((p) => p.trim().split(" ").pop());
    return { ...t, sec: parts[0], row: parts[1], seatNo: parts[2] };
  });
  const orderRows = [
    { k: "Order number", v: "1473-802122-9407" },
    { k: "Purchased", v: "Thu, Jul 30 · 8:52 AM" },
    { k: "Total paid", v: "$84.00" },
    { k: "Delivery", v: "Mobile entry" },
  ];
  const openTransfer = () => { setTf({ step: 1, sel: [], email: "", evId }); setModal(null); };

  const MobileEvent = () => (
    <div style={{ boxSizing: "border-box", padding: "calc(env(safe-area-inset-top) + 74px) 12px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* dark top bar */}
      <div style={{ position: "fixed", left: 0, right: 0, top: 0, zIndex: 45, boxSizing: "border-box", background: "#14161c", padding: "calc(env(safe-area-inset-top) + 12px) 16px 12px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => setScreen("events")} aria-label="Close" style={{ fontFamily: "inherit", flexShrink: 0, width: 36, height: 36, borderRadius: 999, background: "transparent", border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", letterSpacing: "-0.015em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.66)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.when} · {ev.venue}</div>
        </div>
      </div>

      {/* ticket carousel */}
      <div className="st-noscroll" style={{ display: "flex", gap: 14, overflowX: "auto", scrollSnapType: "x mandatory", scrollbarWidth: "none", msOverflowStyle: "none", margin: "0 -12px", padding: "2px 12px 6px" } as React.CSSProperties}>
        {ticketRows.map((t, i) => (
          <div key={i} style={{ flex: "0 0 94%", scrollSnapAlign: "center", overflow: "hidden", borderRadius: 20, background: "#fff", boxShadow: "0 1px 2px color-mix(in srgb, var(--paper) 6%, transparent), 0 18px 38px -22px color-mix(in srgb, var(--paper) 55%, transparent)", display: "flex", flexDirection: "column" }}>
            {/* card header — matchup */}
            <div style={{ position: "relative", height: 210, overflow: "hidden", background: `linear-gradient(120deg, ${ev.brand} 0%, #1b1e26 55%, ${ev.teams[1].brand} 100%)` }}>
              <MatchupHero src={MATCHUP[ev.id]} brand={CRIMSON} oppBrand={ev.teams[1].brand} text={`NMSU vs ${ev.initials}`} textSize={mobile ? 20 : 26} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(6,8,14,0.05) 30%, rgba(6,8,14,0.86) 100%)" }} />
              <div style={{ position: "absolute", left: 16, top: 16, fontSize: 10, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "#fff", background: "rgba(10,12,18,0.55)", backdropFilter: "blur(6px)", borderRadius: 999, padding: "6px 11px" }}>Season Tickets</div>
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.title}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.74)" }}>{ev.when} · {ev.venue}</div>
              </div>
            </div>

            {/* seat strip */}
            <div style={{ display: "flex", alignItems: "stretch", borderBottom: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)" }}>
              <div style={{ width: 5, background: CRIMSON }} />
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
                <button onClick={() => { setDetail(t); setModal("details"); }} style={{ fontFamily: "inherit", minHeight: 44, fontSize: 14, fontWeight: 600, color: CRIMSON, background: "#fff", border: "1px solid rgba(140,11,66,0.28)", borderRadius: 12, cursor: "pointer" }}>View QR-Code</button>
                <button onClick={() => { setDetail(t); setModal("details"); }} style={{ fontFamily: "inherit", minHeight: 44, fontSize: 14, fontWeight: 600, color: INK, background: "#fff", border: "1px solid color-mix(in srgb, var(--paper) 14%, transparent)", borderRadius: 12, cursor: "pointer" }}>Ticket details</button>
              </div>
            </div>

            {/* verified footer */}
            <div style={{ borderTop: "1px dashed color-mix(in srgb, var(--paper) 16%, transparent)", padding: "11px 18px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={CRIMSON} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><path d="M12 3l7 3v5c0 4.4-2.9 8.3-7 10-4.1-1.7-7-5.6-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: CRIMSON }}>Verified Ticket</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* dots */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
        {ticketRows.map((_, i) => (
          <div key={i} style={{ width: 7, height: 7, borderRadius: 999, background: i === 0 ? CRIMSON : "color-mix(in srgb, var(--paper) 22%, transparent)" }} />
        ))}
      </div>

      {/* transfer action — flows under the card, no dead space */}
      <div style={{ display: "flex", gap: 10, padding: "0 4px" }}>
        <button onClick={openTransfer} style={{ fontFamily: "inherit", flex: "1 1 0", minWidth: 0, minHeight: 50, fontSize: 15, fontWeight: 600, color: INK, background: "#fff", border: "1px solid color-mix(in srgb, var(--paper) 14%, transparent)", borderRadius: 14, padding: "12px 6px", cursor: "pointer", whiteSpace: "nowrap" }}>Transfer</button>
      </div>
    </div>
  );

  const EventDetail = () => (mobile ? MobileEvent() : DesktopEvent());

  const DesktopEvent = () => (
    <div style={{ maxWidth: 1100, margin: "0 auto", boxSizing: "border-box", padding: mobile ? "24px 16px 128px" : "40px 32px 96px", display: "flex", flexDirection: "column", gap: 18 }}>
      <button onClick={() => setScreen("events")} style={backBtn}><BackArrow />All tickets</button>
      <div style={{ overflow: "hidden", borderRadius: 20, ...card, boxShadow: "0 1px 2px color-mix(in srgb, var(--paper) 5%, transparent), 0 14px 30px -18px color-mix(in srgb, var(--paper) 40%, transparent)" }}>
        <div style={{ position: "relative", width: "100%", aspectRatio: mobile ? "2.1 / 1" : "3.4 / 1" }}>
          <MatchupHero src={MATCHUP[ev.id]} brand={CRIMSON} oppBrand={ev.brand} text={`NMSU vs ${ev.initials}`} textSize={mobile ? 24 : 40} />
        </div>
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
            <div style={{ height: 1, background: "color-mix(in srgb, var(--paper) 8%, transparent)" }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {ev.teams.map((tm) => (
                <div key={tm.role} style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 14, background: FIELD, border: "1px solid color-mix(in srgb, var(--paper) 7%, transparent)", borderRadius: 16, padding: "12px 16px 12px 12px" }}>
                  <LogoTile logo={tm.logo} brand={tm.brand} initials={tm.initials} size={56} big />

                  <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ ...eyebrow, letterSpacing: "0.10em" }}>{tm.role}</div>
                    <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.2 }}>{tm.name}</div>
                    <div style={{ fontSize: 12, color: SUB, fontVariantNumeric: "tabular-nums" }}>{tm.rec}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ height: 1, background: "color-mix(in srgb, var(--paper) 8%, transparent)" }} />
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: FAINT }}>{ev.blurb}</p>
          </div>

          <div style={{ ...card, borderRadius: 20, overflow: "hidden" }}>
            {ticketRows.map((t, i) => (
              <div key={i} style={{ padding: cardPad, display: "flex", alignItems: "center", gap: 16, borderBottom: "1px solid color-mix(in srgb, var(--paper) 7%, transparent)", flexWrap: "wrap" }}>
                <div style={{ width: 72, height: 72, borderRadius: 14, background: FIELD, border: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)", flexShrink: 0, overflow: "hidden" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={SEATMAP_THUMB} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ flex: 1, minWidth: 150, display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ alignSelf: "flex-start", fontSize: 11, fontWeight: 600, color: CRIMSON, background: SOFT, borderRadius: 999, padding: "4px 10px" }}>Season Tickets</span>
                  <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" }}>{t.seat}</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button style={{ ...ghostBtn, fontSize: 13, padding: "11px 18px" }}>Print PDF</button>
                  <button onClick={() => { setDetail(t); setModal("details"); }} style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: INK, background: "#f1f3f8", border: "none", borderRadius: 999, padding: "11px 18px", cursor: "pointer" }}>Details</button>
                </div>
              </div>
            ))}
            <div style={{ padding: `14px ${padX}px`, background: "#fbfcfe", display: "flex", alignItems: "center", gap: 12 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={CRIMSON} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, flexShrink: 0 }}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><line x1="14" y1="14" x2="21" y2="14" /><line x1="14" y1="18" x2="18" y2="18" /><line x1="18" y1="21" x2="21" y2="21" /></svg>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: FAINT }}><strong style={{ fontWeight: 600, color: INK }}>Your phone is your ticket.</strong> QR codes open on your phone only. Add each seat to Apple/Google Wallet on game day.</div>
            </div>
          </div>
        </div>

        <aside style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 12, position: mobile ? "static" : "sticky", top: 96 }}>
          <div style={{ ...card, borderRadius: 20, padding: cardPad, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ ...eyebrow, paddingBottom: 4 }}>Manage</div>
            <button onClick={openTransfer} style={{ fontFamily: "inherit", width: "100%", textAlign: "left", fontSize: 14, fontWeight: 600, color: INK, background: "#fff", border: "1px solid color-mix(in srgb, var(--paper) 14%, transparent)", borderRadius: 12, padding: "13px 16px", cursor: "pointer" }}>Transfer</button>
            <button style={{ fontFamily: "inherit", width: "100%", textAlign: "left", fontSize: 14, fontWeight: 600, color: INK, background: "#fff", border: "1px solid color-mix(in srgb, var(--paper) 14%, transparent)", borderRadius: 12, padding: "13px 16px", cursor: "pointer" }}>Print all</button>
          </div>
          <div style={{ ...card, borderRadius: 20, padding: cardPad, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={eyebrow}>Getting there</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{ev.venue}</div>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: SUB }}>{ev.address}</div>
            <button style={{ ...crimsonBtn, alignSelf: "flex-start", marginTop: 6, display: "flex", alignItems: "center", gap: 7, fontSize: 13, padding: "11px 18px" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>Get directions
            </button>
          </div>
          <div style={{ ...card, borderRadius: 20, padding: cardPad, display: "flex", flexDirection: "column" }}>
            <div style={{ ...eyebrow, paddingBottom: 10 }}>Order</div>
            {orderRows.map((o) => (
              <div key={o.k} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, padding: "9px 0", borderTop: "1px solid color-mix(in srgb, var(--paper) 7%, transparent)" }}>
                <div style={{ fontSize: 13, color: MUTE }}>{o.k}</div>
                <div style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{o.v}</div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );

  /* ---------- flex package ---------- */
  const vouchers = ["765148", "482913", "239487", "579623", "864205", "302478", "918204", "156839", "473526", "324589"].map((c, i) => {
    const used = i >= 8;
    return { code: c, status: used ? "Redeemed" : "Active", ink: used ? "#a3aab8" : INK, tagInk: used ? "#2f6bd6" : GREEN, tagBg: used ? "#e8f0fd" : GREEN_BG };
  });
  const Package = () => (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: bodyPad, display: "flex", flexDirection: "column", gap: 16 }}>
      <button onClick={() => setScreen("events")} style={backBtn}><BackArrow />All tickets</button>
      <div style={{ ...card, borderRadius: 24, boxShadow: "0 1px 2px color-mix(in srgb, var(--paper) 5%, transparent), 0 20px 46px -22px color-mix(in srgb, var(--paper) 45%, transparent)", padding: cardPad, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={eyebrow}>FLEX PACKAGE · 2026</div>
          <h1 style={{ margin: 0, fontSize: mobile ? 22 : 28, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.12 }}>Aggie Pick-4 Flex Pack</h1>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 10 }}>
          {[{ k: "Home games", v: "6" }, { k: "Status", v: "Active" }, { k: "Credits left", v: "2 of 4" }].map((s) => (
            <div key={s.k} style={{ background: FIELD, borderRadius: 14, padding: "13px 15px", display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: MUTE }}>{s.k}</div>
              <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, background: SOFT, borderRadius: 16, padding: "14px 16px" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke={CRIMSON} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17, flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: CRIMSON }}>Redeem a voucher for a ticket at the Box Office for any available game.</div>
      </div>
      <div style={{ ...card, borderRadius: 20, overflow: "hidden" }}>
        <div style={{ padding: `15px ${padX}px`, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, borderBottom: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)" }}>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>Vouchers</div>
          <div style={{ fontSize: 13, color: SUB, fontVariantNumeric: "tabular-nums" }}>8 active · 2 redeemed</div>
        </div>
        {vouchers.map((v) => (
          <div key={v.code} style={{ padding: `14px ${padX}px`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottom: "1px solid color-mix(in srgb, var(--paper) 5%, transparent)" }}>
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
          <div style={{ background: "#fff", border: "1px dashed color-mix(in srgb, var(--paper) 16%, transparent)", borderRadius: 20, padding: "34px 22px", textAlign: "center", display: "flex", flexDirection: "column", gap: 5 }}>
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
      <div style={{ ...card, borderRadius: 24, boxShadow: "0 1px 2px color-mix(in srgb, var(--paper) 5%, transparent), 0 20px 46px -22px color-mix(in srgb, var(--paper) 45%, transparent)", padding: cardPad, display: "flex", flexDirection: "column", gap: 16 }}>
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
            <div style={{ height: 8, borderRadius: 999, background: "#edeff7", overflow: "hidden" }}><div style={{ width: "64%", height: "100%", background: CRIMSON }} /></div>
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button style={crimsonBtn}>Make a gift</button>
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
          <div key={i} style={{ padding: `15px ${padX}px`, display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid color-mix(in srgb, var(--paper) 6%, transparent)" }}>
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
      <div style={{ ...card, borderRadius: 24, boxShadow: "0 1px 2px color-mix(in srgb, var(--paper) 5%, transparent), 0 20px 46px -22px color-mix(in srgb, var(--paper) 45%, transparent)", padding: cardPad, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: 999, background: CRIMSON, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, fontWeight: 600, flexShrink: 0 }}>{isHolder ? "HC" : (email[0] || "?").toUpperCase()}</div>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.015em" }}>{isHolder ? "Harrison Cogan" : email}</div>
          <div style={{ fontSize: 13, color: SUB }}>{isHolder ? "Account 4407086 · member since 2024" : "No season ticket account linked to this email"}</div>
        </div>
        <button onClick={() => setScreen("login")} style={{ fontFamily: "inherit", marginLeft: "auto", flexShrink: 0, fontSize: 13, fontWeight: 600, color: DANGER, background: "#fff", border: "1px solid rgba(194,57,74,0.28)", borderRadius: 999, padding: "10px 16px", minHeight: 40, whiteSpace: "nowrap", cursor: "pointer" }}>Sign out</button>
      </div>

      <div style={{ ...card, borderRadius: 20, overflow: "hidden" }}>
        <div style={{ padding: `14px ${padX}px`, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, borderBottom: "1px solid color-mix(in srgb, var(--paper) 6%, transparent)" }}>
          <div style={{ ...eyebrow, whiteSpace: "nowrap" }}>Account activity</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: GREEN, background: GREEN_BG, borderRadius: 999, padding: "5px 11px", whiteSpace: "nowrap" }}>{isHolder ? "$25.00 credit" : "No credit"}</div>
        </div>
        {activity.length === 0 ? (
          <div style={{ padding: "30px 22px", textAlign: "center", display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Nothing here yet</div>
            <div style={{ fontSize: 13, color: SUB }}>Purchases, gifts, and credits will appear here.</div>
          </div>
        ) : activity.map((a, i) => (
          <div key={i} style={{ padding: `14px ${padX}px`, display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid color-mix(in srgb, var(--paper) 6%, transparent)" }}>
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
          <div style={{ padding: `14px ${padX}px`, ...eyebrow, borderBottom: "1px solid color-mix(in srgb, var(--paper) 6%, transparent)" }}>{g.title}</div>
          {g.rows.map((r) => {
            const val = pvals[r.k] != null ? pvals[r.k] : r.v;
            const isToggle = "toggle" in r && r.toggle;
            const on = toggles[r.k] != null ? toggles[r.k] : ("on" in r ? !!r.on : false);
            return (
              <div key={r.k} style={{ padding: `14px ${padX}px`, display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid color-mix(in srgb, var(--paper) 6%, transparent)" }}>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ fontSize: 12, color: MUTE }}>{r.k}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>{isToggle ? r.v : val}</div>
                </div>
                {isToggle ? (
                  <button onClick={() => setToggles((p) => ({ ...p, [r.k]: !on }))} aria-label={r.k} style={{ flexShrink: 0, width: 50, height: 30, borderRadius: 999, border: "none", padding: 3, boxSizing: "border-box", cursor: "pointer", background: on ? CRIMSON : "#d7dbe6", display: "flex", justifyContent: on ? "flex-end" : "flex-start" }}>
                    <span style={{ width: 24, height: 24, borderRadius: 999, background: "#fff", boxShadow: "0 2px 5px color-mix(in srgb, var(--paper) 28%, transparent)", display: "block" }} />
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
  const overlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 80, background: "color-mix(in srgb, var(--paper) 55%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", padding: mobile ? 18 : 32, boxSizing: "border-box" };
  const sheet: React.CSSProperties = { width: "100%", maxWidth: 460, background: "#fff", borderRadius: 26, padding: 22, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 18, boxShadow: "0 30px 70px -30px color-mix(in srgb, var(--paper) 60%, transparent)" };
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
            <div key={d.k} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, padding: "13px 0", borderBottom: "1px solid color-mix(in srgb, var(--paper) 7%, transparent)" }}>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: FAINT }}>{field?.label}</label>
          <input value={fieldValue} onChange={(e) => setFieldValue(e.target.value)} style={{ fontFamily: "inherit", width: "100%", boxSizing: "border-box", fontSize: 16, color: INK, background: FIELD, border: "1px solid color-mix(in srgb, var(--paper) 12%, transparent)", borderRadius: 14, padding: "14px 16px", outline: "none" }} />
          <div style={{ fontSize: 12, lineHeight: 1.5, color: MUTE }}>{field?.help}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setModal(null)} style={{ fontFamily: "inherit", flex: 1, fontSize: 15, fontWeight: 600, color: INK, background: "#f1f3f8", border: "none", borderRadius: 999, padding: 14, minHeight: 48, cursor: "pointer" }}>Cancel</button>
          <button onClick={() => { if (field) { setPvals((p) => ({ ...p, [field.key]: fieldValue })); flashToast(field.key + " updated"); } setModal(null); }} style={{ fontFamily: "inherit", flex: 1, fontSize: 15, fontWeight: 600, color: "#fff", background: CRIMSON, border: "none", borderRadius: 999, padding: 14, minHeight: 48, cursor: "pointer" }}>Save</button>
        </div>
      </div>
    </div>
  );

  /* transfer wizard */
  const tfEv = tf ? (events[tf.evId] || ev) : ev;
  const tfSeatNos = (tfEv?.tickets || []).map((t) => (t.seat.match(/Seat (\d+)/) || [])[1] || "1");
  const tfRowLabel = tfEv?.tickets?.[0] ? tfEv.tickets[0].seat.split(" · ").slice(0, 2).join(" · ") : "";
  const tfStep = tf?.step || 1;
  const tfSel = tf?.sel || [];
  const tfValidEmail = /.+@.+\..+/.test(tf?.email || "");
  const tfCanNext = tfStep === 1 ? tfSel.length > 0 : tfStep === 2 ? tfValidEmail : true;
  const doTfPrimary = () => {
    if (!tf || !tfCanNext) return;
    if (tfStep === 4) { setTf(null); return; }
    if (tfStep === 3) {
      const entry: Sent = { id: "t" + Date.now(), to: tf.email, title: tfEv?.title || "", seat: tfRowLabel + " · Seat " + tfSel.join(", "), on: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), status: "pending" };
      setSent([entry, ...sentList]);
      setTf({ ...tf, step: 4 });
      return;
    }
    setTf({ ...tf, step: tfStep + 1 });
  };
  const TransferModal = () => (
    <div onClick={() => setTf(null)} style={{ ...overlay, zIndex: 85, alignItems: mobile ? "flex-end" : "center", padding: mobile ? 0 : 32 }}>
      <div className={mobile ? "st-sheet-up" : undefined} onClick={(e) => e.stopPropagation()} style={{ ...sheet, maxWidth: mobile ? "100%" : 460, width: "100%", maxHeight: mobile ? "92vh" : "88vh", overflowY: "auto", borderRadius: mobile ? "26px 26px 0 0" : 26, paddingBottom: mobile ? "calc(22px + env(safe-area-inset-bottom))" : 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingBottom: 16, borderBottom: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)" }}>
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
                  <button key={no} onClick={() => setTf({ ...tf!, sel: picked ? tfSel.filter((x) => x !== no) : [...tfSel, no] })} style={{ fontFamily: "inherit", width: 92, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: picked ? CRIMSON : FIELD, color: picked ? "#fff" : INK, border: `1px solid ${picked ? CRIMSON : "color-mix(in srgb, var(--paper) 10%, transparent)"}`, borderRadius: 16, padding: "16px 10px", cursor: "pointer" }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: picked ? "rgba(255,255,255,0.72)" : MUTE }}>Seat</span>
                    <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>{no}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {tfStep === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" }}>Enter the recipient&apos;s email address</div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: SUB }}>They&apos;ll get an email saying you sent them a ticket. It stays in your account until they claim it.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ ...eyebrow, letterSpacing: "0.1em" }}>Email address</label>
              <input value={tf?.email || ""} onChange={(e) => setTf({ ...tf!, email: e.target.value })} placeholder="name@email.com" style={{ fontFamily: "inherit", width: "100%", boxSizing: "border-box", fontSize: 16, color: INK, background: FIELD, border: "1px solid color-mix(in srgb, var(--paper) 12%, transparent)", borderRadius: 14, padding: "14px 16px", outline: "none" }} />
            </div>
          </div>
        )}
        {tfStep === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" }}>You are about to transfer {tfSel.length} {tfSel.length === 1 ? "ticket" : "tickets"}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {tfSel.map((no) => (
                <div key={no} style={{ width: 92, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: CRIMSON, color: "#fff", borderRadius: 16, padding: "16px 10px" }}>
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
            <button onClick={() => setTf({ ...tf!, step: tfStep - 1 })} style={{ fontFamily: "inherit", flexShrink: 0, display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 600, color: INK, background: "#fff", border: "none", padding: "14px 12px", minHeight: 48, cursor: "pointer" }}><BackArrow />Back</button>
          )}
          {tfStep === 4 && (
            <button onClick={() => { setTf(null); setScreen("listings"); setListTab("active"); }} style={{ fontFamily: "inherit", flex: 1, fontSize: 15, fontWeight: 600, color: INK, background: "#f1f3f8", border: "none", borderRadius: 999, padding: 14, minHeight: 48, cursor: "pointer" }}>My transfers</button>
          )}
          <button onClick={doTfPrimary} disabled={!tfCanNext} style={{ fontFamily: "inherit", flex: 1, fontSize: 15, fontWeight: 600, color: "#fff", background: tfCanNext ? CRIMSON : "#d7dbe6", border: "none", borderRadius: 999, padding: 14, minHeight: 48, cursor: tfCanNext ? "pointer" : "not-allowed" }}>{tfStep === 3 ? "Transfer" : tfStep === 4 ? "Close" : "Next"}</button>
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
            <div key={v.code} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: FIELD, border: "1px solid color-mix(in srgb, var(--paper) 6%, transparent)", borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "0.04em", fontVariantNumeric: "tabular-nums", color: v.ink }}>{v.code}</div>
              <span style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: v.tagInk, background: v.tagBg, borderRadius: 999, padding: "6px 11px" }}>{v.status}<span style={{ width: 7, height: 7, borderRadius: 999, background: v.tagInk }} /></span>
            </div>
          ))}
        </div>
        <button onClick={() => setModal(null)} style={{ fontFamily: "inherit", width: "100%", fontSize: 15, fontWeight: 600, color: "#fff", background: CRIMSON, border: "none", borderRadius: 999, padding: 14, minHeight: 48, cursor: "pointer" }}>Close</button>
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

      {screen === "login" && Login()}
      {screen === "code" && CodeScreen()}
      {screen === "events" && Events()}
      {screen === "event" && EventDetail()}
      {screen === "package" && Package()}
      {screen === "listings" && Listings()}
      {screen === "giving" && Giving()}
      {screen === "profile" && Profile()}

      {mobile && authed && screen !== "event" && TabBar()}

      {modal === "details" && DetailsModal()}
      {modal === "field" && FieldModal()}
      {modal === "vouchers" && VouchersModal()}
      {tf && TransferModal()}
      {confirmCancel && ConfirmCancel()}

      {toast && (
        <div style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 92, zIndex: 90, display: "flex", alignItems: "center", gap: 9, background: INK, color: "#fff", borderRadius: 999, padding: "12px 18px", fontSize: 14, fontWeight: 600, boxShadow: "0 20px 40px -18px color-mix(in srgb, var(--paper) 80%, transparent)" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#6fd39a" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><polyline points="20 6 9 17 4 12" /></svg>
          {toast}
        </div>
      )}
    </div>
  );
}
