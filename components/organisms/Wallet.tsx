"use client";

/**
 * Wallet — the general Blocktickets fan account, ported from the Claude Design
 * "Blocktickets Wallet.dc.html" handoff. Login uses real Strapi OTP
 * (/verifies); ticket content below is still local demo data until wired:
 * Transfers → Profile, plus a full-screen QR viewer, transfer wizard, field
 * edit, and cancel confirm. Navy chrome, brand-green accent, Geist type.
 *
 * Screen/modal subtrees are rendered as inline function calls (not nested
 * <Components/>) so React reconciles them in place — no remount, so bottom
 * sheets animate once and inputs keep focus.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { validateEmail, verifyCode, verifyUser } from "@/lib/api";
import { setLastKnown, setSession, type AuthSession } from "@/lib/auth";
import { emailPatternMatch, isBlockedEmail } from "@/lib/helpers";

const NAVY = "#051b35";
const GREEN = "#a6e773";
const GREEN_HI = "#bced95";
const SUB = "#6e7180";
const MUTE = "#8a93a3";
const FAINT = "#4a5567";
const FIELD = "#f7f8fc";
const LINE = "rgba(5,27,53,0.10)";
const GREEN_INK = "#7fbe4d";
const GREEN_SOFT = "#ecf8dd";
const OKGREEN = "#2f8f4e";
const DANGER = "#c2394a";
const LOCKUP = "/nmstate/blocktickets-lockup-white.svg";
const SEATMAP_THUMB = "/nmstate/seatmap-thumb.svg";

const card: React.CSSProperties = {
  background: "#fff", border: `1px solid ${LINE}`, borderRadius: 20,
  boxShadow: "0 1px 2px rgba(5,27,53,0.05), 0 10px 24px -14px rgba(5,27,53,0.30)",
};
const eyebrow: React.CSSProperties = { fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: MUTE };

type Cat = {
  id: string; past: boolean; today: boolean; title: string; date: string; time: string; doors: string;
  venue: string; city: string; address: string; brand: string; initials: string; kind: string;
  row: string; seats: string[]; total: string; bought: string;
};

const CATALOG: Cat[] = [
  { id: "raptors", past: false, today: true, title: "Ogden Raptors vs. Long Beach Coast", date: "Tonight", time: "6:30 PM", doors: "5:30 PM", venue: "Lindquist Field", city: "Ogden, UT", address: "2330 Lincoln Ave, Ogden, UT 84401", brand: "#0a2747", initials: "OR", kind: "Single game", row: "Sec A · Row F", seats: ["6", "7"], total: "$48.00", bought: "Wed, Jul 22 · 4:12 PM" },
  { id: "neon", past: false, today: false, title: "Neon Vibes — 2026 Summer Series", date: "Fri, Aug 14", time: "8:00 PM", doors: "7:00 PM", venue: "The Wharf Amphitheater", city: "Long Beach, CA", address: "1200 Queensway Dr, Long Beach, CA 90802", brand: "#1f4571", initials: "NV", kind: "General admission", row: "GA Pit", seats: ["1", "2"], total: "$164.00", bought: "Mon, Jun 08 · 9:40 AM" },
  { id: "icedogs", past: false, today: false, title: "Niagara IceDogs vs. Erie Otters", date: "Sat, Oct 03", time: "7:00 PM", doors: "6:00 PM", venue: "Meridian Centre", city: "St. Catharines, ON", address: "1 IceDogs Way, St. Catharines, ON L2R 0E2", brand: "#143458", initials: "NI", kind: "Single game", row: "Sec 109 · Row A", seats: ["11"], total: "$32.00", bought: "Thu, Jul 30 · 1:05 PM" },
  { id: "harvest", past: true, today: false, title: "Harvest Nights Food & Wine", date: "Sat, May 16", time: "5:00 PM", doors: "4:30 PM", venue: "Riverfront Pavilion", city: "Boise, ID", address: "601 W Front St, Boise, ID 83702", brand: "#2e5a8a", initials: "HN", kind: "General admission", row: "General admission", seats: ["1", "2"], total: "$90.00", bought: "Tue, Apr 07 · 6:22 PM" },
];

type EventT = {
  id: string; title: string; when: string; doors: string; venue: string; city: string; address: string;
  brand: string; initials: string; row: string;
  tickets: { kind: string; seat: string; code: string; no: string }[];
  order: { k: string; v: string }[];
};

function buildEvents(): Record<string, EventT> {
  const map: Record<string, EventT> = {};
  CATALOG.forEach((e) => {
    map[e.id] = {
      id: e.id, title: e.title, when: e.today ? "Tonight · " + e.time : e.date + " · " + e.time,
      doors: e.doors, venue: e.venue, city: e.city, address: e.address, brand: e.brand, initials: e.initials, row: e.row,
      tickets: e.seats.map((n, i) => ({ kind: e.kind, seat: e.row + " · Seat " + n, code: "BT-" + e.id.toUpperCase() + "-4407-" + (100 + i), no: n })),
      order: [
        { k: "Order number", v: "BT-" + e.id.toUpperCase() + "-8021" },
        { k: "Purchased", v: e.bought },
        { k: "Total paid", v: e.total },
        { k: "Delivery", v: "Mobile entry" },
      ],
    };
  });
  return map;
}

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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" shape-rendering="crispEdges"><rect width="${S}" height="${S}" fill="#fff"/><g fill="#051b35">${rects}</g></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

type Screen = "login" | "code" | "events" | "event" | "listings" | "profile";
type Tab = "upcoming" | "past";
type Sent = { id: string; to?: string; from?: string; title: string; seat: string; on: string; status: string };
type Scan = { seat: string; code: string; title: string; when: string; venue: string };

export default function Wallet({
  initialScreen = "events",
  returnTo = null,
}: {
  initialScreen?: Screen;
  /** After OTP login, return here (e.g. tickets checkout). */
  returnTo?: string | null;
}) {
  const [vw, setVw] = useState(1440);
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [evId, setEvId] = useState("raptors");
  const [listTab, setListTab] = useState<"sent" | "received">("sent");
  const [scan, setScan] = useState<Scan | null>(null);
  const [modal, setModal] = useState<null | "field">(null);
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
  const isBuyer = email.trim().toLowerCase() === "jordan.reyes@gmail.com";
  const events = useMemo(buildEvents, []);
  const ev = events[evId] || events.raptors;

  const anyModal = !!modal || !!tf || !!confirmCancel || !!scan;
  useEffect(() => {
    document.body.style.overflow = anyModal ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [anyModal]);

  const flashToast = (msg: string) => {
    setToast(msg);
    if (toastT.current) clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(null), 2400);
  };

  const sendLoginCode = async () => {
    const trimmed = email.trim();
    if (!emailPatternMatch(trimmed) || isBlockedEmail(trimmed)) {
      setAuthError("Enter a valid email address.");
      return;
    }
    setAuthBusy(true);
    setAuthError("");
    try {
      const res = await validateEmail({ email: trimmed });
      const data = res.data as { verdict?: string; suggestion?: string };
      if (
        (data.verdict === "Risky" && data.suggestion) ||
        data.verdict === "Invalid"
      ) {
        setAuthError("That email looks invalid. Check it and try again.");
        return;
      }
      await verifyUser({
        data: { phoneNumber: "", email: trimmed },
      });
      setCode("");
      setScreen("code");
    } catch {
      setAuthError("Couldn’t send a code. Check your connection and try again.");
    } finally {
      setAuthBusy(false);
    }
  };

  const submitLoginCode = async (fullCode: string) => {
    if (fullCode.length !== 6 || authBusy) return;
    setAuthBusy(true);
    setAuthError("");
    try {
      const res = await verifyCode({ data: { code: fullCode } });
      if (res.status === 200) {
        setSession(res.data as AuthSession);
        setCode("");
        const next =
          returnTo && returnTo.startsWith("/") ? returnTo : null;
        if (next) {
          setLastKnown(next);
          window.location.assign(next);
          return;
        }
        setScreen("events");
        flashToast("Signed in");
      } else if (res.status === 203) {
        // New user — finish signup on the full login flow.
        const signupFrom =
          returnTo && returnTo.startsWith("/") ? returnTo : "/wallet/";
        window.location.assign(
          `/login/?from=${encodeURIComponent(signupFrom)}`,
        );
      } else {
        setAuthError("That code looks incorrect. Try again.");
        setCode("");
      }
    } catch {
      setAuthError("That code looks incorrect. Try again.");
      setCode("");
    } finally {
      setAuthBusy(false);
    }
  };

  const sentDefault: Sent[] = isBuyer ? [
    { id: "s1", to: "m.ortega@gmail.com", title: "Niagara IceDogs vs. Erie Otters", seat: "Sec 109 · Row A · Seat 11", on: "Jul 31, 2026", status: "pending" },
    { id: "s2", to: "rach.venneri@gmail.com", title: "Harvest Nights Food & Wine", seat: "General admission · Seat 2", on: "May 09, 2026", status: "claimed" },
  ] : [];
  const sentList = (sent ?? sentDefault).filter((t) => t.status !== "cancelled");
  const received: Sent[] = isBuyer ? [
    { id: "r1", from: "dad@reyesfamily.com", title: "Neon Vibes — 2026 Summer Series", seat: "GA Pit · Seat 2", on: "Jun 08, 2026", status: "claimed" },
  ] : [];

  const upcoming = CATALOG.filter((e) => !e.past);
  const past = CATALOG.filter((e) => e.past);

  const bodyPad = mobile ? "18px 16px 96px" : "32px 32px 64px";
  const cardPad = mobile ? 16 : 20;
  const padX = mobile ? 16 : 20;
  const h1Size = mobile ? 28 : 34;

  /* ---- shared bits ---- */
  const greenBtn: React.CSSProperties = { fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: NAVY, background: GREEN, border: "none", borderRadius: 999, padding: "13px 20px", cursor: "pointer" };
  const ghostBtn: React.CSSProperties = { fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: NAVY, background: "#fff", border: "1px solid rgba(5,27,53,0.14)", borderRadius: 999, padding: "13px 20px", cursor: "pointer" };
  const backBtn: React.CSSProperties = { fontFamily: "inherit", alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: NAVY, background: "#fff", border: "1px solid rgba(5,27,53,0.12)", borderRadius: 999, padding: "10px 18px", minHeight: 44, cursor: "pointer" };
  const chip = (on: boolean): React.CSSProperties => ({ fontFamily: "inherit", flexShrink: 0, display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", background: on ? NAVY : "#fff", color: on ? "#fff" : NAVY, border: `1px solid ${on ? NAVY : "rgba(5,27,53,0.12)"}`, borderRadius: 999, padding: mobile ? "11px 15px" : "10px 16px", minHeight: mobile ? 44 : 40, cursor: "pointer" });
  const BackArrow = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>);
  const Emblem = ({ size }: { size: number }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden><path d="M6 4h7a4.5 4.5 0 0 1 1 8.9A4.8 4.8 0 0 1 13.4 21H6V4z" stroke={GREEN} strokeWidth={2.2} strokeLinejoin="round" /><path d="M9.5 8.2h3.2M9.5 12.4h3.6M9.5 16.6h3.4" stroke={GREEN} strokeWidth={2.2} strokeLinecap="round" /></svg>
  );
  const openTransfer = () => { setTf({ step: 1, sel: [], email: "", evId }); setModal(null); setScan(null); };

  /* ---- header + tabbar ---- */
  const navDefs = [
    { id: "events" as Screen, label: "Tickets", on: screen === "events" || screen === "event" },
    { id: "listings" as Screen, label: "Transfers", on: screen === "listings" },
    { id: "profile" as Screen, label: "Profile", on: screen === "profile" },
  ];
  const authed = screen !== "login" && screen !== "code";
  const showHeader = !(mobile && screen === "event");
  const showTabBar = mobile && authed && screen !== "event";

  const Header = () => (
    <header style={{ background: NAVY, position: "sticky", top: 0, zIndex: 20, boxShadow: "0 12px 30px -18px rgba(3,16,31,0.9)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: mobile ? "42px 16px 12px" : "18px 32px", display: "flex", alignItems: "center", gap: 16 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOCKUP} alt="Blocktickets" style={{ height: 22, display: "block", flexShrink: 0 }} />
        {authed && !mobile && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 2 }}>
            {navDefs.map((n) => (
              <button key={n.id} onClick={() => setScreen(n.id)} style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: n.on ? NAVY : "rgba(255,255,255,0.78)", background: n.on ? GREEN : "transparent", border: "none", borderRadius: 999, padding: "9px 16px", cursor: "pointer", whiteSpace: "nowrap" }}>{n.label}</button>
            ))}
          </div>
        )}
      </div>
    </header>
  );

  const TabBar = () => (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40, background: "rgba(255,255,255,0.94)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(5,27,53,0.08)", padding: "8px 10px calc(14px + env(safe-area-inset-bottom))", display: "flex", gap: 4 }}>
      {navDefs.map((n) => (
        <button key={n.id} onClick={() => setScreen(n.id)} style={{ fontFamily: "inherit", flex: 1, minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: n.on ? NAVY : MUTE, background: n.on ? GREEN : "transparent", border: "none", borderRadius: 999, cursor: "pointer" }}>{n.label}</button>
      ))}
    </div>
  );

  /* ---- login ---- */
  const Login = () => (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: mobile ? "32px 18px 56px" : "64px 32px 80px", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ width: 64, height: 64, borderRadius: 999, background: NAVY, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 6 }}><Emblem size={32} /></div>
          <div style={eyebrow}>Sign in</div>
          <h1 style={{ margin: 0, fontSize: h1Size, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.05 }}>Your tickets, in one place</h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: SUB }}>
            Enter the email you bought with and we&apos;ll send a six-digit code. No password to remember.
          </p>
        </div>
        <div style={{ ...card, borderRadius: 24, boxShadow: "0 1px 2px rgba(5,27,53,0.05), 0 20px 46px -22px rgba(5,27,53,0.35)", padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: FAINT }}>Email address</label>
          <input
            value={email}
            onChange={(e) => { setEmail(e.target.value); setAuthError(""); }}
            placeholder="you@email.com"
            autoComplete="email"
            disabled={authBusy}
            style={{ fontFamily: "inherit", width: "100%", boxSizing: "border-box", fontSize: 16, color: NAVY, background: FIELD, border: "1px solid rgba(5,27,53,0.12)", borderRadius: 14, padding: "15px 16px", outline: "none" }}
          />
          {authError && <div style={{ fontSize: 13, color: DANGER }}>{authError}</div>}
          <button
            type="button"
            disabled={authBusy}
            onClick={() => void sendLoginCode()}
            style={{ ...greenBtn, width: "100%", fontSize: 15, padding: 16, opacity: authBusy ? 0.7 : 1 }}
          >
            {authBusy ? "Sending…" : "Send my code"}
          </button>
          <div style={{ fontSize: 12, color: MUTE, textAlign: "center", lineHeight: 1.5 }}>By continuing you agree to the Blocktickets terms and privacy policy.</div>
        </div>
      </div>
    </div>
  );

  /* ---- code ---- */
  const CodeScreen = () => (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: mobile ? "32px 18px 56px" : "64px 32px 80px", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 22 }}>
        <button
          type="button"
          onClick={() => { setScreen("login"); setAuthError(""); setCode(""); }}
          style={backBtn}
        >
          <BackArrow />Back
        </button>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h1 style={{ margin: 0, fontSize: h1Size, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.05 }}>Enter your code</h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: SUB }}>Sent to <strong style={{ fontWeight: 600, color: NAVY }}>{email}</strong></p>
        </div>
        <div style={{ ...card, borderRadius: 24, padding: 22, display: "flex", flexDirection: "column", gap: 18 }}>
          <div onClick={() => codeRef.current?.focus()} style={{ position: "relative", cursor: "text" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ height: mobile ? 54 : 60, border: `1px solid ${code.length === i ? NAVY : "rgba(5,27,53,0.12)"}`, background: code.length === i ? "#fff" : FIELD, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: NAVY }}>{code[i] || ""}</div>
              ))}
            </div>
            <input
              ref={codeRef}
              value={code}
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label="Six-digit code"
              disabled={authBusy}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(v);
                setAuthError("");
                if (v.length === 6) void submitLoginCode(v);
              }}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, border: "none", background: "transparent", fontSize: 16, cursor: "text", outline: "none" }}
            />
          </div>
          {authError && <div style={{ fontSize: 13, color: DANGER, textAlign: "center" }}>{authError}</div>}
          <div style={{ fontSize: 13, color: MUTE, textAlign: "center" }}>
            Didn&apos;t get it?{" "}
            <button
              type="button"
              disabled={authBusy}
              onClick={() => void sendLoginCode()}
              style={{ fontFamily: "inherit", color: NAVY, fontWeight: 600, textDecoration: "none", background: "none", border: "none", padding: 0, cursor: "pointer" }}
            >
              {authBusy ? "Sending…" : "Send a new code"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const SeatIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><path d="M5 11V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v5" /><path d="M4 11h13a2 2 0 0 1 2 2v3H6a2 2 0 0 1-2-2v-3z" /><path d="M6 16v3M17 16v3" /></svg>
  );

  /* ---- My Tickets ---- */
  const tabDefs = [{ id: "upcoming" as const, label: "Upcoming", n: upcoming.length }, { id: "past" as const, label: "Past", n: past.length }];
  const Events = () => (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: bodyPad, display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
        <h1 style={{ margin: 0, fontSize: h1Size, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1, whiteSpace: "nowrap" }}>My tickets</h1>
        {!mobile && <div style={{ fontSize: 13, color: MUTE, whiteSpace: "nowrap" }}>{email}</div>}
      </div>
      {isBuyer ? (
        <>
          <div className="wl-noscroll" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
            {tabDefs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} style={chip(tab === t.id)}>{t.label}<span style={{ fontSize: 12, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: tab === t.id ? "rgba(255,255,255,0.66)" : MUTE }}>{t.n}</span></button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(tab === "upcoming" ? upcoming : past).map((e) => (
              <div key={e.id} onClick={() => { setEvId(e.id); setScreen("event"); }} style={{ ...card, borderRadius: 20, position: "relative", overflow: "hidden", minHeight: mobile ? 112 : 118, boxSizing: "border-box", padding: cardPad, paddingRight: mobile ? 112 : 240, display: "flex", alignItems: "center", cursor: "pointer", opacity: e.past ? 0.72 : 1 }}>
                <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", color: e.today ? NAVY : SUB }}>
                    {e.today
                      ? <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.10em", color: "#fff", background: GREEN, borderRadius: 999, padding: "4px 10px" }}>Today</span>
                      : <span style={{ width: 5, height: 5, flexShrink: 0, borderRadius: 999, background: SUB }} />}
                    {e.today ? `Gates open · ${e.doors}` : `${e.date} · ${e.time}`}
                  </div>
                  <div style={{ fontSize: mobile ? 17 : 19, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</div>
                  {!mobile && <div style={{ fontSize: 13, color: SUB, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.venue} · {e.city}</div>}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: NAVY, border: "1px solid rgba(5,27,53,0.16)", borderRadius: 8, padding: "5px 10px", whiteSpace: "nowrap" }}>{e.row}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: NAVY, border: "1px solid rgba(5,27,53,0.16)", borderRadius: 8, padding: "5px 10px", whiteSpace: "nowrap" }}><SeatIcon />{e.seats.length}</span>
                  </div>
                </div>
                <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: mobile ? 124 : 268, background: e.brand, clipPath: `polygon(${mobile ? "14%" : "17%"} 0, 100% 0, 100% 100%, 0 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: `14px 14px 14px ${mobile ? 24 : 46}px`, boxSizing: "border-box" }}>
                  <span style={{ fontSize: mobile ? 22 : 30, fontWeight: 600, letterSpacing: "0.02em", color: "rgba(255,255,255,0.92)", whiteSpace: "nowrap" }}>{e.initials}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ ...card, borderRadius: 24, padding: mobile ? "34px 20px" : "48px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 999, background: NAVY, display: "flex", alignItems: "center", justifyContent: "center" }}><Emblem size={30} /></div>
          <h2 style={{ margin: 0, fontSize: 21, fontWeight: 600, letterSpacing: "-0.02em" }}>No tickets on this email</h2>
          <p style={{ margin: 0, maxWidth: 420, fontSize: 15, lineHeight: 1.6, color: SUB }}>We couldn&apos;t find any tickets for <strong style={{ fontWeight: 600, color: NAVY }}>{email}</strong>. If you bought with a different address, sign in with that one.</p>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, paddingTop: 4 }}>
            <Link href="/browse" style={{ ...greenBtn, padding: "14px 22px", minHeight: 48, fontSize: 15, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Browse events</Link>
            <Link href="/login" style={{ ...ghostBtn, padding: "14px 22px", minHeight: 48, fontSize: 15, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Try a different email</Link>
          </div>
        </div>
      )}
    </div>
  );

  /* ---- event detail ---- */
  const openScan = (t: { seat: string; code: string }) => setScan({ seat: t.seat, code: t.code, title: ev.title, when: ev.when, venue: ev.venue + " · " + ev.city });
  const YourTickets = () => (
    <div style={{ ...card, borderRadius: 20, overflow: "hidden" }}>
      <div style={{ padding: `14px ${padX}px`, ...eyebrow, borderBottom: "1px solid rgba(5,27,53,0.06)" }}>Your tickets</div>
      {ev.tickets.map((t, i) => (
        <div key={i} style={{ padding: `15px ${padX}px`, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", borderBottom: "1px solid rgba(5,27,53,0.06)" }}>
          <div style={{ width: 62, height: 62, flexShrink: 0, borderRadius: 14, background: "#f1f3f8", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={SEATMAP_THUMB} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div style={{ flex: 1, minWidth: 150, display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ alignSelf: "flex-start", fontSize: 11, fontWeight: 600, color: FAINT, background: GREEN_SOFT, borderRadius: 999, padding: "4px 10px", whiteSpace: "nowrap" }}>{t.kind}</span>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" }}>{t.seat}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <button onClick={() => openScan(t)} style={{ ...greenBtn, fontSize: 13, padding: "11px 18px", minHeight: 44 }}>View QR-Code</button>
            <button onClick={() => openScan(t)} style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: NAVY, background: "#f1f3f8", border: "none", borderRadius: 999, padding: "11px 18px", minHeight: 44, cursor: "pointer" }}>Details</button>
          </div>
        </div>
      ))}
      <div style={{ padding: `14px ${padX}px`, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke={MUTE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, flexShrink: 0, marginTop: 2 }}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><line x1="14" y1="14" x2="21" y2="21" /></svg>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: SUB }}><strong style={{ fontWeight: 600, color: NAVY }}>Your phone is your ticket.</strong> QR codes open on your phone only. Sign in at blocktickets.xyz on the day of the event.</div>
      </div>
    </div>
  );

  const EventDetail = () => (
    <div style={{ maxWidth: 1100, margin: "0 auto", boxSizing: "border-box", padding: mobile ? "96px 16px 104px" : "32px 32px 64px", display: "flex", flexDirection: "column", gap: 16 }}>
      {!mobile && <button onClick={() => setScreen("events")} style={backBtn}><BackArrow />All tickets</button>}
      {mobile && (
        <div style={{ position: "fixed", left: 0, right: 0, top: 0, zIndex: 45, boxSizing: "border-box", background: NAVY, padding: "46px 16px 12px", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setScreen("events")} aria-label="Back" style={{ fontFamily: "inherit", width: 40, height: 40, flexShrink: 0, borderRadius: 999, background: "rgba(255,255,255,0.10)", border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><BackArrow /></button>
          <div style={{ minWidth: 0, fontSize: 15, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</div>
        </div>
      )}

      <div style={{ width: "100%", height: mobile ? 190 : 300, borderRadius: 20, overflow: "hidden", background: ev.brand, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 2px rgba(5,27,53,0.05), 0 20px 46px -22px rgba(5,27,53,0.35)" }}>
        <span style={{ fontSize: mobile ? 44 : 58, fontWeight: 600, letterSpacing: "0.02em", color: "rgba(255,255,255,0.92)" }}>{ev.initials}</span>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 420px", minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ ...card, borderRadius: 24, boxShadow: "0 1px 2px rgba(5,27,53,0.05), 0 20px 46px -22px rgba(5,27,53,0.35)", padding: cardPad, display: "flex", flexDirection: "column", gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: mobile ? 22 : 26, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.15 }}>{ev.title}</h1>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>{ev.when}</div>
              <div style={{ fontSize: 13, color: SUB, whiteSpace: "nowrap" }}>Doors {ev.doors}</div>
            </div>
            <div style={{ fontSize: 13, color: SUB }}>{ev.venue} · {ev.city}</div>
          </div>
          <YourTickets />
        </div>

        {!mobile && (
          <div style={{ flex: "0 1 320px", minWidth: 260, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ ...card, borderRadius: 20, boxShadow: "0 1px 2px rgba(5,27,53,0.05), 0 20px 44px -24px rgba(5,27,53,0.40)", padding: cardPad, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ ...eyebrow, paddingBottom: 4 }}>Manage</div>
              <button onClick={openTransfer} style={{ fontFamily: "inherit", width: "100%", textAlign: "left", fontSize: 14, fontWeight: 600, color: NAVY, background: "#fff", border: "1px solid rgba(5,27,53,0.14)", borderRadius: 12, padding: "13px 16px", cursor: "pointer" }}>Transfer</button>
              <button style={{ fontFamily: "inherit", width: "100%", textAlign: "left", fontSize: 14, fontWeight: 600, color: NAVY, background: "#fff", border: "1px solid rgba(5,27,53,0.14)", borderRadius: 12, padding: "13px 16px", cursor: "pointer" }}>Add to Apple/Google Wallet</button>
            </div>
            <div style={{ ...card, borderRadius: 20, padding: cardPad, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={eyebrow}>Getting there</div>
              <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>{ev.venue}</div>
              <div style={{ fontSize: 13, color: SUB, lineHeight: 1.5 }}>{ev.address}</div>
              <button style={{ fontFamily: "inherit", alignSelf: "flex-start", fontSize: 13, fontWeight: 600, color: NAVY, background: "#f1f3f8", border: "none", borderRadius: 999, padding: "11px 18px", minHeight: 44, cursor: "pointer" }}>Get directions</button>
            </div>
            <div style={{ ...card, borderRadius: 20, overflow: "hidden" }}>
              <div style={{ padding: `14px ${padX}px`, ...eyebrow, borderBottom: "1px solid rgba(5,27,53,0.06)" }}>Order</div>
              {ev.order.map((o) => (
                <div key={o.k} style={{ padding: `12px ${padX}px`, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, borderBottom: "1px solid rgba(5,27,53,0.05)" }}>
                  <div style={{ fontSize: 12, color: MUTE, whiteSpace: "nowrap" }}>{o.k}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{o.v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {mobile && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 41, boxSizing: "border-box", background: "rgba(255,255,255,0.94)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(5,27,53,0.08)", padding: "10px 14px calc(14px + env(safe-area-inset-bottom))", display: "flex", gap: 8 }}>
          <button onClick={openTransfer} style={{ fontFamily: "inherit", flex: 1, minHeight: 48, fontSize: 14, fontWeight: 600, color: NAVY, background: GREEN, border: "none", borderRadius: 999, cursor: "pointer" }}>Transfer</button>
          <button style={{ fontFamily: "inherit", flex: 1, minHeight: 48, fontSize: 14, fontWeight: 600, color: NAVY, background: "#fff", border: "1px solid rgba(5,27,53,0.14)", borderRadius: 999, cursor: "pointer" }}>Add to wallet</button>
        </div>
      )}
    </div>
  );

  /* ---- transfers ---- */
  const listData = listTab === "received" ? received : sentList;
  const Listings = () => (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: bodyPad, display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: h1Size, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1 }}>Transfers</h1>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: SUB }}>A transfer stays pending until the recipient claims it. You can cancel any time before they do.</p>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {[{ id: "sent" as const, label: "Sent", n: sentList.length }, { id: "received" as const, label: "Received", n: received.length }].map((t) => (
          <button key={t.id} onClick={() => setListTab(t.id)} style={chip(listTab === t.id)}>{t.label}<span style={{ fontSize: 12, fontWeight: 500, color: listTab === t.id ? "rgba(255,255,255,0.66)" : MUTE }}>{t.n}</span></button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {listData.length === 0 ? (
          <div style={{ background: "#fff", border: "1px dashed rgba(5,27,53,0.16)", borderRadius: 20, padding: "34px 22px", textAlign: "center", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{listTab === "received" ? "Nothing received yet" : "No transfers sent"}</div>
            <div style={{ fontSize: 13, color: SUB }}>{listTab === "received" ? "Tickets people send you will land here." : "Open a ticket and tap Transfer to send it."}</div>
          </div>
        ) : listData.map((t) => {
          const pending = t.status === "pending";
          return (
            <div key={t.id} style={{ ...card, borderRadius: 20, padding: cardPad, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", color: pending ? "#b5791e" : OKGREEN }}>
                  <span style={{ width: 5, height: 5, flexShrink: 0, borderRadius: 999, background: pending ? "#b5791e" : OKGREEN }} />
                  {pending ? "Pending · awaiting claim" : "Claimed · " + t.on}
                </div>
                <div style={{ fontSize: mobile ? 17 : 19, fontWeight: 600, letterSpacing: "-0.015em" }}>{t.title}</div>
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

  /* ---- profile ---- */
  const profileDefs = [
    { title: "You", rows: [
      { k: "Name", v: isBuyer ? "Jordan Reyes" : "Add your name", action: "Edit", help: "This is the name printed on tickets and will-call lists." },
      { k: "Email", v: email, action: "Edit", help: "Sign-in codes and ticket transfers are sent here." },
      { k: "Phone", v: isBuyer ? "(562) 555-0134" : "Add a phone number", action: "Edit", help: "Used for event-day texts and gate support." },
    ] },
    { title: "Payment", rows: [
      { k: "Card on file", v: isBuyer ? "Visa ···4417 · exp 09/29" : "No card saved", action: "Manage", help: "Charged at checkout and for any add-ons." },
      { k: "Billing address", v: isBuyer ? "88 Ocean Blvd, Long Beach, CA 90802" : "Add an address", action: "Edit", help: "Must match the address on your card statement." },
    ] },
    { title: "Security & preferences", rows: [
      { k: "Sign-in", v: "Passkey + email code", action: "Change", help: "Choose how you verify it is you at sign-in." },
      { k: "Event reminders", v: "Text + email 24h before doors", toggle: true, on: true },
      { k: "Marketing emails", v: "Presales and new on-sales near you", toggle: true, on: false },
    ] },
  ];
  const activity = isBuyer ? [
    { item: "Niagara IceDogs vs. Erie Otters", when: "Jul 30, 2026", kind: "Purchase", amt: "−$32.00", ink: NAVY },
    { item: "Ogden Raptors vs. Long Beach Coast", when: "Jul 22, 2026", kind: "Purchase", amt: "−$48.00", ink: NAVY },
    { item: "Harvest Nights — rain credit", when: "May 18, 2026", kind: "Credit", amt: "+$12.50", ink: OKGREEN },
  ] : [];
  const profileName = pvals["Name"] || (isBuyer ? "Jordan Reyes" : email);
  const profileInitials = ((profileName || "?").trim().split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("") || "?").toUpperCase();
  const Profile = () => (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: bodyPad, display: "flex", flexDirection: "column", gap: 18 }}>
      <h1 style={{ margin: 0, fontSize: h1Size, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1 }}>Profile</h1>
      <div style={{ ...card, borderRadius: 24, boxShadow: "0 1px 2px rgba(5,27,53,0.05), 0 20px 46px -22px rgba(5,27,53,0.35)", padding: cardPad, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: 999, background: NAVY, color: GREEN, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, fontWeight: 600, flexShrink: 0 }}>{profileInitials}</div>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.015em", overflowWrap: "anywhere" }}>{profileName}</div>
          <div style={{ fontSize: 13, color: SUB }}>{isBuyer ? "Member since 2023 · 12 events" : "No orders on this email yet"}</div>
        </div>
        <button onClick={() => setScreen("login")} style={{ fontFamily: "inherit", marginLeft: "auto", flexShrink: 0, fontSize: 13, fontWeight: 600, color: DANGER, background: "#fff", border: "1px solid rgba(194,57,74,0.28)", borderRadius: 999, padding: "10px 16px", minHeight: 40, whiteSpace: "nowrap", cursor: "pointer" }}>Sign out</button>
      </div>

      <div style={{ ...card, borderRadius: 20, overflow: "hidden" }}>
        <div style={{ padding: `14px ${padX}px`, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, borderBottom: "1px solid rgba(5,27,53,0.06)" }}>
          <div style={{ ...eyebrow, whiteSpace: "nowrap" }}>Order history</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: GREEN_INK, background: GREEN_SOFT, borderRadius: 999, padding: "5px 11px", whiteSpace: "nowrap" }}>{isBuyer ? "$12.50 credit" : "No credit"}</div>
        </div>
        {activity.length === 0 ? (
          <div style={{ padding: "30px 22px", textAlign: "center", display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Nothing here yet</div>
            <div style={{ fontSize: 13, color: SUB }}>Orders and refunds will appear here.</div>
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
                  <button onClick={() => setToggles((p) => ({ ...p, [r.k]: !on }))} aria-label={r.k} style={{ flexShrink: 0, width: 50, height: 30, borderRadius: 999, border: "none", padding: 3, boxSizing: "border-box", cursor: "pointer", background: on ? GREEN : "#d3d6e0", display: "flex", justifyContent: on ? "flex-end" : "flex-start" }}>
                    <span style={{ width: 24, height: 24, borderRadius: 999, background: "#fff", boxShadow: "0 2px 5px rgba(5,27,53,0.28)", display: "block" }} />
                  </button>
                ) : (
                  <button onClick={() => { setField({ group: g.title, heading: (r as { action: string }).action + " " + r.k.toLowerCase(), label: r.k, help: (r as { help: string }).help, key: r.k }); setFieldValue(String(val)); setModal("field"); }} style={{ fontFamily: "inherit", flexShrink: 0, fontSize: 13, fontWeight: 600, color: NAVY, background: "#f1f3f8", border: "none", borderRadius: 999, padding: "9px 15px", whiteSpace: "nowrap", cursor: "pointer" }}>{(r as { action: string }).action}</button>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  /* ---- overlays ---- */
  const overlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 95, background: "rgba(3,16,31,0.62)", display: "flex", justifyContent: "center", boxSizing: "border-box" };
  const sheet: React.CSSProperties = { width: "100%", background: "#fff", boxSizing: "border-box", display: "flex", flexDirection: "column", boxShadow: "0 30px 70px -30px rgba(3,16,31,0.7)" };
  const closeX = (onClose: () => void) => (
    <button onClick={onClose} aria-label="Close" style={{ fontFamily: "inherit", flexShrink: 0, width: 34, height: 34, borderRadius: 999, background: "#f1f3f8", border: "none", color: FAINT, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
    </button>
  );

  const ScanView = () => (
    <div style={{ position: "fixed", inset: 0, zIndex: 90, background: "#03101f", overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", padding: mobile ? "44px 18px 40px" : "48px 24px 64px", boxSizing: "border-box" }}>
      <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{scan!.title}</div>
            <div style={{ fontSize: 12, color: "#b8c6dc" }}>{scan!.when}</div>
          </div>
          <button onClick={() => setScan(null)} aria-label="Close" style={{ fontFamily: "inherit", flexShrink: 0, width: 40, height: 40, borderRadius: 999, background: "rgba(255,255,255,0.10)", border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div style={{ width: "100%", background: "#fff", borderRadius: 24, padding: 22, boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: GREEN_INK, background: GREEN_SOFT, borderRadius: 999, padding: "6px 12px" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}><polyline points="20 6 9 17 4 12" /></svg>Verified ticket
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr(scan!.code)} alt="Ticket QR code" style={{ width: mobile ? 212 : 248, height: mobile ? 212 : 248, display: "block" }} />
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" }}>{scan!.seat}</div>
            <div style={{ fontSize: 13, color: SUB }}>{scan!.venue}</div>
          </div>
        </div>
        <button onClick={openTransfer} style={{ ...greenBtn, width: "100%", fontSize: 15, padding: 15, minHeight: 48 }}>Transfer this ticket</button>
      </div>
    </div>
  );

  const FieldModal = () => (
    <div onClick={() => setModal(null)} style={{ ...overlay, alignItems: mobile ? "flex-end" : "center", padding: mobile ? 0 : 32 }}>
      <div className={mobile ? "wl-sheet-up" : undefined} onClick={(e) => e.stopPropagation()} style={{ ...sheet, maxWidth: mobile ? "100%" : 460, borderRadius: mobile ? "26px 26px 0 0" : 26, padding: 22, paddingBottom: mobile ? "calc(22px + env(safe-area-inset-bottom))" : 22, gap: 18 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={eyebrow}>{field?.group}</div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.15 }}>{field?.heading}</h2>
          </div>
          {closeX(() => setModal(null))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: FAINT }}>{field?.label}</label>
          <input value={fieldValue} onChange={(e) => setFieldValue(e.target.value)} style={{ fontFamily: "inherit", width: "100%", boxSizing: "border-box", fontSize: 16, color: NAVY, background: FIELD, border: "1px solid rgba(5,27,53,0.12)", borderRadius: 14, padding: "14px 16px", outline: "none" }} />
          <div style={{ fontSize: 12, lineHeight: 1.5, color: MUTE }}>{field?.help}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setModal(null)} style={{ fontFamily: "inherit", flex: 1, fontSize: 15, fontWeight: 600, color: NAVY, background: "#f1f3f8", border: "none", borderRadius: 999, padding: 14, minHeight: 48, cursor: "pointer" }}>Cancel</button>
          <button onClick={() => { if (field) { setPvals((p) => ({ ...p, [field.key]: fieldValue })); flashToast((field.key || "Profile") + " updated"); } setModal(null); }} style={{ ...greenBtn, flex: 1, fontSize: 15, padding: 14, minHeight: 48 }}>Save</button>
        </div>
      </div>
    </div>
  );

  /* transfer wizard */
  const tfEv = tf ? (events[tf.evId] || ev) : ev;
  const tfSeatNos = (tfEv?.tickets || []).map((t) => t.no);
  const tfStep = tf?.step || 1;
  const tfSel = tf?.sel || [];
  const tfValid = /.+@.+\..+/.test(tf?.email || "");
  const tfCanNext = tfStep === 1 ? tfSel.length > 0 : tfStep === 2 ? tfValid : true;
  const doTfPrimary = () => {
    if (!tf || !tfCanNext) return;
    if (tfStep === 4) { setTf(null); return; }
    if (tfStep === 3) {
      const entry: Sent = { id: "t" + Date.now(), to: tf.email, title: tfEv?.title || "", seat: (tfEv?.row || "") + " · Seat " + tfSel.join(", "), on: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), status: "pending" };
      setSent([entry, ...sentList]);
      setTf({ ...tf, step: 4 });
      return;
    }
    setTf({ ...tf, step: tfStep + 1 });
  };
  const TransferModal = () => (
    <div onClick={() => setTf(null)} style={{ ...overlay, alignItems: mobile ? "flex-end" : "center", padding: mobile ? 0 : 32 }}>
      <div className={mobile ? "wl-sheet-up" : undefined} onClick={(e) => e.stopPropagation()} style={{ ...sheet, maxWidth: mobile ? "100%" : 460, maxHeight: mobile ? "92vh" : "88vh", overflowY: "auto", borderRadius: mobile ? "26px 26px 0 0" : 26, padding: 22, paddingBottom: mobile ? "calc(22px + env(safe-area-inset-bottom))" : 22, gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingBottom: 16, borderBottom: "1px solid rgba(5,27,53,0.08)" }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>Transfer</h2>
          {closeX(() => setTf(null))}
        </div>
        {tfStep === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" }}>Select tickets to transfer</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: FAINT }}>{tfEv?.row}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: MUTE }}>{tfSeatNos.length} {tfSeatNos.length === 1 ? "ticket" : "tickets"}</div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {tfSeatNos.map((no) => {
                const picked = tfSel.includes(no);
                return (
                  <button key={no} onClick={() => setTf({ ...tf!, sel: picked ? tfSel.filter((x) => x !== no) : [...tfSel, no] })} style={{ fontFamily: "inherit", width: 92, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: picked ? GREEN : FIELD, color: NAVY, border: `1px solid ${picked ? GREEN : "rgba(5,27,53,0.10)"}`, borderRadius: 16, padding: "16px 10px", cursor: "pointer" }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: picked ? "rgba(5,27,53,0.62)" : MUTE }}>Seat</span>
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
              <input value={tf?.email || ""} onChange={(e) => setTf({ ...tf!, email: e.target.value })} placeholder="name@email.com" style={{ fontFamily: "inherit", width: "100%", boxSizing: "border-box", fontSize: 16, color: NAVY, background: FIELD, border: "1px solid rgba(5,27,53,0.12)", borderRadius: 14, padding: "14px 16px", outline: "none" }} />
            </div>
          </div>
        )}
        {tfStep === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" }}>You are about to transfer {tfSel.length} {tfSel.length === 1 ? "ticket" : "tickets"}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {tfSel.map((no) => (
                <div key={no} style={{ width: 92, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: GREEN, color: NAVY, borderRadius: 16, padding: "16px 10px" }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(5,27,53,0.62)" }}>Seat</span>
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
              <svg viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" style={{ width: 38, height: 38 }}><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-0.02em", textAlign: "center" }}>{tfSel.length === 1 ? "Your ticket has been transferred" : "Your tickets have been transferred"}</div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: SUB, textAlign: "center" }}>Pending until {tf?.email} claims it. Cancel any time before then — once claimed, the ticket leaves your account.</p>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {(tfStep === 2 || tfStep === 3) && (
            <button onClick={() => setTf({ ...tf!, step: tfStep - 1 })} style={{ fontFamily: "inherit", flexShrink: 0, display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 600, color: NAVY, background: "#fff", border: "none", padding: "14px 12px", minHeight: 48, cursor: "pointer" }}><BackArrow />Back</button>
          )}
          {tfStep === 4 && (
            <button onClick={() => { setTf(null); setScreen("listings"); setListTab("sent"); }} style={{ fontFamily: "inherit", flex: 1, fontSize: 15, fontWeight: 600, color: NAVY, background: "#f1f3f8", border: "none", borderRadius: 999, padding: 14, minHeight: 48, cursor: "pointer" }}>My transfers</button>
          )}
          <button onClick={doTfPrimary} disabled={!tfCanNext} style={{ fontFamily: "inherit", flex: 1, fontSize: 15, fontWeight: 600, color: tfCanNext ? NAVY : MUTE, background: tfCanNext ? GREEN : "#d3d6e0", border: "none", borderRadius: 999, padding: 14, minHeight: 48, cursor: "pointer" }}>{tfStep === 3 ? "Transfer" : tfStep === 4 ? "Close" : "Next"}</button>
        </div>
      </div>
    </div>
  );

  const ConfirmCancel = () => (
    <div onClick={() => setConfirmCancel(null)} style={{ ...overlay, alignItems: "center", padding: mobile ? 18 : 32 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...sheet, maxWidth: 420, borderRadius: 26, padding: 24, gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 21, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.2 }}>Cancel this transfer?</h2>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: SUB }}>The ticket comes back to your wallet and {confirmCancel?.to} loses access to it. You can send it again any time before the event.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, background: FIELD, borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{confirmCancel?.title}</div>
          <div style={{ fontSize: 13, color: SUB }}>{confirmCancel?.seat}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setConfirmCancel(null)} style={{ fontFamily: "inherit", flex: 1, fontSize: 15, fontWeight: 600, color: NAVY, background: "#f1f3f8", border: "none", borderRadius: 999, padding: 14, minHeight: 48, cursor: "pointer" }}>Keep it</button>
          <button onClick={() => { const id = confirmCancel?.id; setSent(sentList.map((x) => (x.id === id ? { ...x, status: "cancelled" } : x))); setConfirmCancel(null); flashToast("Transfer cancelled"); }} style={{ fontFamily: "inherit", flex: 1, fontSize: 15, fontWeight: 600, color: "#fff", background: DANGER, border: "none", borderRadius: 999, padding: 14, minHeight: 48, cursor: "pointer" }}>Cancel transfer</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ width: "100%", maxWidth: "100%", overflowX: "hidden", minHeight: "100vh", color: NAVY, background: FIELD, fontFamily: "'Geist', system-ui, -apple-system, sans-serif", WebkitFontSmoothing: "antialiased" }}>
      <style>{`.wl-noscroll::-webkit-scrollbar{width:0;height:0;display:none}.wl-noscroll{-ms-overflow-style:none;scrollbar-width:none}.wl-sheet-up{animation:wlUp .3s cubic-bezier(.22,.61,.36,1)}@keyframes wlUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
      {showHeader && Header()}

      {screen === "login" && Login()}
      {screen === "code" && CodeScreen()}
      {screen === "events" && Events()}
      {screen === "event" && EventDetail()}
      {screen === "listings" && Listings()}
      {screen === "profile" && Profile()}

      {showTabBar && TabBar()}

      {scan && ScanView()}
      {modal === "field" && FieldModal()}
      {tf && TransferModal()}
      {confirmCancel && ConfirmCancel()}

      {toast && (
        <div style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 92, zIndex: 99, display: "flex", alignItems: "center", gap: 9, background: NAVY, color: "#fff", borderRadius: 999, padding: "12px 18px", fontSize: 14, fontWeight: 600, boxShadow: "0 20px 40px -18px rgba(3,16,31,0.85)" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><polyline points="20 6 9 17 4 12" /></svg>
          {toast}
        </div>
      )}
    </div>
  );
}
