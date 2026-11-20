"use client";

/**
 * PremiumTicketing — data-driven port of the Claude Design canvas
 * "NM State Ticketing.dc.html". Light theme, configurable accent. Renders the
 * full ticketing experience (filterable listings, seat-map modal, selection +
 * detail panel, checkout, success, event-info modal) from a `TicketingData`
 * prop, so any event can use it. See NM_STATE_DATA for the reference content.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Ring } from "@/components/atoms/spinners";

const NAVY = "var(--paper)";

export type TicketingListing = { zone: string; tier: string; sec: string; row: string; min: number; max: number; price: string };

export type TicketingData = {
  accent: string;
  accentDark: string;
  accentSoft: string; // pale accent bg for badges
  eventName: string;
  whenLong: string; // "Sat, Sep 26, 2026 6:00 PM · Doors 5:00 PM"
  whenShort: string; // "Sat, Sep 26, 2026 · Doors 5:00 PM"
  whenPlain: string; // "Sat, Sep 26, 2026 6:00 PM"
  doorsLine: string; // "Sat, Sep 26, 2026 6:00 PM · Doors 5:00 PM" (success)
  venueName: string;
  venueLine: string; // "Aggie Memorial Stadium, Las Cruces, NM"
  venueAddress: string;
  venueCityState: string; // "Las Cruces, NM"
  mapsQuery: string;
  logoSrc: string;
  /** Tenant mark shown top-left on branded events (GA header). Falls back to the Blocktickets lockup. */
  brandLogoSrc?: string;
  orgLabel: string;
  providerLabel: string;
  aboutText: string;
  homeLabel: string;
  awayLabel: string;
  awayShort: string;
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
};

export type GATier = {
  name: string;
  sub: string;
  price: string; // "$10.08" or "Free"
  unit: number; // numeric price for totals
  note: string;
  state: "live" | "scheduled" | "soldout";
  onSaleAt?: string;
};

const LEGEND = [
  { label: "Unavailable", color: "#dfe3ee" },
  { label: "Available", color: "var(--acc)" },
  { label: "Premium", color: NAVY },
  { label: "Accessibility", color: "var(--green)" },
];
const money = (n: number) => "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const SEATMAP = "/nmstate/seatmap-dummy.svg";
const THUMB = "/nmstate/seatmap-thumb.svg";

const DEFAULT_GA_TIERS: GATier[] = [
  { name: "Standard admission", sub: "General admission · unreserved seating", price: "$10.08", unit: 10.08, note: "Ticket limit: 100 per order", state: "live" },
  { name: "Sideline reserved", sub: "Chairback seating, west sideline · rows A–F", price: "$18.00", unit: 18, note: "On sale Fri, Aug 1 at 10:00 AM MT", state: "scheduled", onSaleAt: "Friday, Aug 1 at 10:00 AM MT" },
  { name: "Aggie student", sub: "Valid NMSU student ID required at the gate", price: "Free", unit: 0, note: "All 800 student tickets claimed", state: "soldout" },
];

type Pick = { sec: string; row: string; seat: string; zone: string; tier: string; unit: number; price: string };

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
  <svg viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: s, height: s }} aria-hidden>
    <path d="M4 9V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4z" />
  </svg>
);

export default function PremiumTicketing({ data: d }: { data: TicketingData }) {
  const ACC = d.accent;
  const ACC_DK = d.accentDark;
  const ACC_SOFT = d.accentSoft;
  const LOGO = d.logoSrc;
  const isGa = d.eventType === "ga";
  const POSTER = d.posterSrc || LOGO;
  const GA_TIERS: GATier[] = d.gaTiers && d.gaTiers.length ? d.gaTiers : DEFAULT_GA_TIERS;
  // Nav is crimson for reserved, white for GA.
  const navBg = isGa ? "#ffffff" : ACC;
  const navInk = isGa ? NAVY : "#fff";
  const navLine = isGa ? "color-mix(in srgb, var(--paper) 10%, transparent)" : "rgba(255,255,255,0.16)";
  const navFieldBg = isGa ? "#f1f3f8" : "rgba(255,255,255,0.12)";
  const navFieldLine = isGa ? "color-mix(in srgb, var(--paper) 10%, transparent)" : "rgba(255,255,255,0.22)";
  const navFieldInk = isGa ? "#6e7180" : "rgba(255,255,255,0.75)";
  const navBtnBg = isGa ? ACC : "#fff";
  const navBtnInk = isGa ? "#fff" : ACC;

  const [mounted, setMounted] = useState(false);
  const [vw, setVw] = useState(1440);
  const [want, setWant] = useState(2);
  const [zoneFilter, setZoneFilter] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [unlockZone, setUnlockZone] = useState<string | null>(null);
  const [unlockInput, setUnlockInput] = useState("");
  const [unlockError, setUnlockError] = useState(false);
  const [qtyMenu, setQtyMenu] = useState(false);
  const [ada, setAda] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pinned, setPinned] = useState(false);
  const [map, setMap] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [legendOpen, setLegendOpen] = useState(false);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [detail, setDetail] = useState<number | null>(null);
  const [media, setMedia] = useState(0);
  const [screen, setScreen] = useState<"checkout" | "success" | null>(null);
  const [info, setInfo] = useState(false);
  const [sel, setSel] = useState<number | null>(null);
  const [panelQty, setPanelQty] = useState(2);
  // GA mode state
  const [gaQty, setGaQty] = useState(1);
  const [notifyIdx, setNotifyIdx] = useState<number | null>(null);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifySms, setNotifySms] = useState(false);
  const [notifySent, setNotifySent] = useState(false);
  const [notified, setNotified] = useState<Record<number, boolean>>({});
  const [gaSheet, setGaSheet] = useState(false);
  const sticky = useRef<HTMLDivElement | null>(null);
  const loadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setVw(window.innerWidth);
    const onResize = () => setVw(window.innerWidth);
    const onScroll = () => {
      const el = sticky.current;
      if (!el) return;
      const p = el.getBoundingClientRect().top <= (window.innerWidth < 900 ? 73 : 93);
      setPinned((cur) => (cur !== p ? p : cur));
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 700);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      clearTimeout(t);
    };
  }, []);

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

  // Lock background scroll while any overlay (map / drawer / checkout / success / info) is open.
  useEffect(() => {
    const overlayOpen = map || info || screen !== null || sel !== null;
    if (!overlayOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [map, info, screen, sel]);

  const mobile = vw < 900;
  const narrow = mobile || vw < 1120;
  const wide = !narrow;

  const reload = (nextWant: number) => {
    if (loadTimer.current) clearTimeout(loadTimer.current);
    setWant(nextWant);
    setSel(null);
    setLoading(true);
    loadTimer.current = setTimeout(() => setLoading(false), 650);
  };

  const lockedMap = useMemo(() => {
    const m: Record<string, string> = {};
    (d.lockedZones || []).forEach((z) => { m[z.zone] = z.code.trim().toUpperCase(); });
    return m;
  }, [d.lockedZones]);
  const isLocked = (zone: string) => !!lockedMap[zone] && !unlocked.includes(zone);
  const rows = useMemo(() => d.listings.filter((l) => want >= l.min && want <= l.max && (!zoneFilter || l.zone === zoneFilter) && !(!!lockedMap[l.zone] && !unlocked.includes(l.zone))).map((l) => ({ ...l, range: `${l.min} – ${l.max} Tickets` })), [want, d.listings, zoneFilter, lockedMap, unlocked]);
  const zoneChips = useMemo(() => {
    const seen: string[] = [];
    d.listings.forEach((l) => { if (!seen.includes(l.zone)) seen.push(l.zone); });
    return seen;
  }, [d.listings]);
  const ZONES = useMemo(() => {
    // derive 4 map zones from the distinct listing zones (fallback to listings)
    const seen = new Map<string, TicketingListing>();
    d.listings.forEach((l) => { if (!seen.has(l.zone)) seen.set(l.zone, l); });
    const arr = Array.from(seen.values()).slice(0, 4);
    const pos = [{ x: "50%", y: "22%", bg: ACC }, { x: "20%", y: "52%", bg: NAVY }, { x: "80%", y: "52%", bg: NAVY }, { x: "50%", y: "84%", bg: "#4a5567" }];
    return arr.map((l, i) => ({ label: l.zone.replace(/Sections?\s*/i, ""), price: l.price, ...pos[i % 4], sec: l.sec, row: l.row, zone: l.zone, tier: l.tier, unit: parseFloat(l.price.replace(/[^0-9.]/g, "")) || 0 }));
  }, [d.listings, ACC]);

  const selRow = (sel === null ? rows[0] : rows[sel]) || rows[0] || d.listings[0];
  const unit = selRow ? parseFloat(selRow.price.replace(/[^0-9.]/g, "")) : 0;
  const panelOpen = sel !== null && !map;

  const pickTotal = picks.reduce((t, p) => t + p.unit, 0);
  const gaLiveUnit = (GA_TIERS.find((t) => t.state === "live") || GA_TIERS[0])?.unit ?? 10.08;
  const gaAvail = GA_TIERS.filter((t) => t.state !== "soldout");
  const gaFromNum = gaAvail.length ? Math.min(...gaAvail.map((t) => t.unit)) : gaLiveUnit;
  const coFirst: Partial<Pick> = picks[0] || (selRow as Partial<Pick> | undefined) || {};
  const coQty = isGa ? gaQty : picks.length > 0 ? picks.length : panelQty;
  const coTotalNum = isGa ? gaLiveUnit * gaQty : picks.length > 0 ? pickTotal : unit * panelQty;
  const coSubtotal = money(coTotalNum / 1.27);
  const coFee = money(coTotalNum * 0.16);
  const coProc = money(coTotalNum - coTotalNum / 1.27 - coTotalNum * 0.16);
  const coTotal = money(coTotalNum);
  const coUnit = money(coTotalNum / 1.27 / Math.max(1, coQty));
  const coOrderId = "04571";
  const coHold = "9:47";
  const coQtyLabel = coQty === 1 ? "1 ticket" : `${coQty} tickets`;
  const coSeatLine = isGa ? "Standard admission" : `Sec ${coFirst.sec || ""} · Row ${coFirst.row || ""}`;
  const coSeatSub = isGa ? "General admission · unreserved seating" : `${coQtyLabel} · seats are together`;
  const coTierLabel = isGa ? "Standard admission" : coFirst.tier || coFirst.zone || "";

  const addPick = (z: (typeof ZONES)[number]) => setPicks((list) => [...list, { sec: z.sec, row: z.row, seat: String(21 + list.length), zone: z.zone, tier: z.tier, unit: z.unit, price: "$" + z.unit.toFixed(2) }]);
  const flip = () => setMedia((m) => (m === 0 ? 1 : 0));
  // Enter checkout from a clean state — close the drawer/map so nothing renders behind the overlay.
  const enterCheckout = () => {
    setSel(null);
    setMap(false);
    setDetail(null);
    setScreen("checkout");
  };

  // Brief processing waits with an inline spinner (seat hold + payment).
  const [holding, setHolding] = useState(false);
  const [paying, setPaying] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const payTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (holdTimer.current) clearTimeout(holdTimer.current); if (payTimer.current) clearTimeout(payTimer.current); }, []);
  const startHold = () => {
    if (holding) return;
    setHolding(true);
    holdTimer.current = setTimeout(() => { setHolding(false); enterCheckout(); }, 800);
  };
  const startPay = () => {
    if (paying) return;
    setPaying(true);
    payTimer.current = setTimeout(() => { setPaying(false); setScreen("success"); }, 1100);
  };
  // Brief "Holding seats…" spinner before dropping into checkout from a GA tier.
  const startGaCheckout = () => {
    if (holding) return;
    setHolding(true);
    holdTimer.current = setTimeout(() => { setHolding(false); setGaSheet(false); setScreen("checkout"); }, 700);
  };
  const btnRing = <Ring size={18} color="#fff" trackColor="rgba(255,255,255,0.35)" strokeWidth={2.5} />;
  const holdKids = holding ? (<>{btnRing}Holding seats…</>) : "Checkout";

  const card: React.CSSProperties = { background: "#fff", border: "1px solid color-mix(in srgb, var(--paper) 10%, transparent)", boxShadow: "0 1px 2px color-mix(in srgb, var(--paper) 5%, transparent)" };
  const pill = (bg: string, color: string): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 7, background: bg, color, fontSize: 13, fontWeight: 600, padding: "4px 12px", borderRadius: 999, whiteSpace: "nowrap" });
  const primaryBtn: React.CSSProperties = { fontFamily: "inherit", fontWeight: 600, color: "#fff", background: ACC, border: "none", borderRadius: 999, cursor: "pointer" };
  /* the loading placeholder is the shared pulse (t-skel-pulse in globals.css), not a sweep */
  const shimmer: React.CSSProperties = { background: "#eef0f6", animation: "t-skel-pulse var(--pulse-dur) ease-in-out var(--pulse-count)" };
  const thumbSize = mobile ? 72 : 96;

  const findOnMapBtn = (h: number, radius: number) => (
    <button className="nmt-map-btn" onClick={() => setMap(true)} style={{ fontFamily: "inherit", position: "relative", width: "100%", height: h, borderRadius: radius, border: "1px solid color-mix(in srgb, var(--paper) 10%, transparent)", background: "#edeff7", cursor: "pointer", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, ...card }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={SEATMAP} alt="Seat map" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 10, background: "#fff", borderRadius: 999, padding: "12px 22px", fontSize: 15, fontWeight: 600, color: NAVY, boxShadow: "0 6px 20px -6px color-mix(in srgb, var(--paper) 35%, transparent)", whiteSpace: "nowrap" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        Find on map
      </span>
    </button>
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
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>{r.t}</div>
            <div style={{ fontSize: 14, color: "#6e7180" }}>{r.d}</div>
          </div>
        </div>
      ))}
    </div>
  );

  // Compact trust rows shown inside the ticket-details panel (bold label + copy).
  const trustRows = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, background: "#f7f8fc", border: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)", borderRadius: 14, padding: 18 }}>
      {[
        { t: "Mobile tickets.", d: " Delivered to your account and scanned at the gate.", icon: <><rect x="5" y="2" width="14" height="20" rx="3" /><line x1="10" y1="18.5" x2="14" y2="18.5" /></> },
        { t: "Buyer protection.", d: " Every listing is verified inventory, safe from bots and scalpers.", icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></> },
        { t: "Prices are all-in.", d: " Taxes and fees included. No surprises at checkout.", icon: <><path d="M20.59 13.41 13.4 20.6a2 2 0 0 1-2.82 0L3 13V4a1 1 0 0 1 1-1h9l7.59 7.59a2 2 0 0 1 0 2.82Z" /><circle cx="7.5" cy="7.5" r="1.2" /></> },
      ].map((r) => (
        <div key={r.t} style={{ display: "flex", gap: 12 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }}>{r.icon}</svg>
          <div style={{ fontSize: 14, color: "#4a5567", lineHeight: 1.5 }}><span style={{ fontWeight: 600, color: NAVY }}>{r.t}</span>{r.d}</div>
        </div>
      ))}
    </div>
  );

  // GA tier cards — rendered inline on desktop, inside the mobile bottom sheet.
  const gaTierCards = (
    <>
      {GA_TIERS.map((t, i) => {
        const live = t.state === "live";
        const soldout = t.state === "soldout";
        const done = !!notified[i];
        const s = t.state === "live"
          ? { label: "On sale", dot: "#7fbe4d", pillBg: "rgba(166,231,115,0.22)", pillInk: "#3f6b1f" }
          : t.state === "scheduled"
            ? { label: "Scheduled", dot: "#c9962e", pillBg: "rgba(201,150,46,0.16)", pillInk: "#8a6410" }
            : { label: "Sold out", dot: "#a9b0bd", pillBg: "#eef0f6", pillInk: "#6e7180" };
        const stepBtn: React.CSSProperties = { fontFamily: "inherit", width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", border: "none", borderRadius: 999, color: NAVY, cursor: "pointer" };
        return (
          <div key={t.name} style={{ border: live ? `1.5px solid ${ACC}` : "1px solid color-mix(in srgb, var(--paper) 10%, transparent)", background: soldout ? "#f7f8fc" : "#fff", borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.015em", color: soldout ? "#6e7180" : NAVY }}>{t.name}</div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: s.pillBg, color: s.pillInk, fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", padding: "5px 11px", borderRadius: 999 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: s.dot }} />{s.label}
                  </span>
                </div>
                <div style={{ fontSize: 14, color: "#6e7180" }}>{t.sub}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: mobile ? 22 : 26, fontWeight: 600, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", color: soldout ? "#6e7180" : NAVY }}>{t.price}</div>
                <div style={{ fontSize: 13, color: "#6e7180" }}>Incl. taxes and fees</div>
              </div>
            </div>
            <div style={{ height: 1, background: "color-mix(in srgb, var(--paper) 8%, transparent)" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ fontSize: 13, color: "#6e7180" }}>{t.note}</div>
              {live ? (
                <div style={{ display: "flex", alignItems: "center", gap: 14, ...(mobile ? { width: "100%" } : {}) }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #d3d6e0", borderRadius: 999, padding: 5, flexShrink: 0 }}>
                    <button onClick={() => setGaQty((q) => Math.max(1, q - 1))} aria-label="Remove a ticket" style={stepBtn}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </button>
                    <span style={{ minWidth: 30, textAlign: "center", fontSize: 17, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{gaQty}</span>
                    <button onClick={() => setGaQty((q) => Math.min(100, q + 1))} aria-label="Add a ticket" style={stepBtn}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </button>
                  </div>
                  <button className="nmt-primary" onClick={startGaCheckout} disabled={holding} style={{ ...primaryBtn, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9, fontSize: 16, padding: "15px 28px", ...(mobile ? { flex: 1 } : {}) }}>{holding ? <>{btnRing}Holding seats…</> : `Checkout ${coTotal}`}</button>
                </div>
              ) : (
                <button onClick={() => { setNotifyIdx(i); setNotifySent(false); }} style={{ fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 9, fontSize: 15, fontWeight: 600, color: done ? "#3f6b1f" : NAVY, background: done ? "rgba(166,231,115,0.16)" : "#fff", border: `1px solid ${done ? "rgba(127,190,77,0.45)" : "#d3d6e0"}`, borderRadius: 999, padding: "13px 22px", cursor: "pointer" }}>
                  {done && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><polyline points="20 6 9 17 4 12" /></svg>}
                  {done ? (soldout ? "On the waitlist" : "Reminder set") : soldout ? "Join waitlist" : "Remind me"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </>
  );

  return (
    <div data-theme="light" style={{ position: "relative", display: "flex", flexDirection: "column", background: "#f7f8fc", color: NAVY, width: "100%", minHeight: "100vh", fontFamily: "'Geist', system-ui, -apple-system, sans-serif", WebkitFontSmoothing: "antialiased", ["--acc" as string]: ACC }}>
      <style>{`
        @media (prefers-reduced-motion: reduce) { [style*="t-skel-pulse"] { animation: none !important } }
        .nmt-primary { transition: transform 180ms cubic-bezier(0.2,0.8,0.2,1), background 180ms; }
        .nmt-primary:hover { transform: translateY(-1px); }
        .nmt-primary:active { transform: translateY(1px); background: ${ACC_DK}; }
        .nmt-listing { transition: transform 180ms cubic-bezier(0.2,0.8,0.2,1), box-shadow 180ms, border-color 180ms; }
        .nmt-listing:hover { transform: translateY(-2px); border-color: ${ACC}; box-shadow: 0 10px 30px -12px color-mix(in srgb, var(--paper) 20%, transparent); }
        .nmt-map-btn { transition: box-shadow 180ms, border-color 180ms; }
        .nmt-map-btn:hover { border-color: ${ACC}; box-shadow: 0 10px 34px -10px color-mix(in srgb, var(--paper) 25%, transparent); }
        .nmt-chip { transition: border-color 140ms; }
        .nmt-chip:hover { border-color: ${NAVY}; }
        .nmt-filter { background: #fff; border: 1px solid #d3d6e0; color: ${NAVY}; transition: background 140ms ease, border-color 140ms ease, color 140ms ease; }
        .nmt-filter .nmt-star { color: ${ACC}; display: inline-flex; }
        .nmt-filter:hover { border-color: ${NAVY}; background: #f1f3f8; }
        .nmt-filter.active { background: ${ACC}; border-color: ${ACC}; color: #fff; }
        .nmt-filter.active .nmt-star { color: #fff; }
      `}</style>

      {!screen && (
        <>
      {/* HEADER (desktop) */}
      {!mobile && (
        <header style={{ background: navBg, borderBottom: `1px solid ${navLine}`, color: navInk, position: "sticky", top: 0, zIndex: 12 }}>
          <div style={{ maxWidth: 1320, margin: "0 auto", padding: "14px 32px", display: "flex", alignItems: "center", gap: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0, flex: "1 1 auto" }}>
              {isGa ? (
                <a href="/" aria-label={d.brandLogoSrc ? `${d.orgLabel} home` : "Blocktickets home"} style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.brandLogoSrc || "/blocktickets-logo-navy.svg"} alt={d.brandLogoSrc ? d.orgLabel : "Blocktickets"} style={{ height: d.brandLogoSrc ? 46 : 26, width: "auto", display: "block", objectFit: "contain" }} />
                </a>
              ) : (
                <>
                  <div style={{ width: 64, height: 64, borderRadius: 14, background: "#fff", border: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 9, boxSizing: "border-box" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={LOGO} alt={d.homeLabel} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                    <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.015em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.eventName}</div>
                    <div style={{ fontSize: 14, color: "rgba(255,255,255,0.72)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.whenLong} at <span style={{ color: "#fff", fontWeight: 500 }}>{d.venueLine}</span></div>
                    <button onClick={() => setInfo(true)} style={{ fontFamily: "inherit", alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.82)", background: "transparent", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                      Event information
                    </button>
                  </div>
                </>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, background: navFieldBg, border: `1px solid ${navFieldLine}`, borderRadius: 999, padding: "12px 20px", width: 300, color: navFieldInk }}>
              <span style={{ fontSize: 14, whiteSpace: "nowrap", flex: 1 }}>Search for events</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            </div>
            <a href="/login" className="nmt-primary" style={{ fontFamily: "inherit", fontSize: 15, fontWeight: 600, color: navBtnInk, background: navBtnBg, border: "none", borderRadius: 999, padding: "13px 30px", whiteSpace: "nowrap", flexShrink: 0, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Login</a>
          </div>
        </header>
      )}

      {/* HEADER (mobile) */}
      {mobile && (
        <header style={{ background: navBg, color: navInk, borderBottom: `1px solid ${navLine}`, position: "sticky", top: 0, zIndex: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <button aria-label="Back" onClick={() => window.history.back()} style={{ fontFamily: "inherit", width: 44, height: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: navFieldBg, border: `1px solid ${navFieldLine}`, borderRadius: 999, color: navInk, cursor: "pointer" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          {isGa ? (
            <a href="/" aria-label={d.brandLogoSrc ? `${d.orgLabel} home` : "Blocktickets home"} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.brandLogoSrc || "/blocktickets-logo-navy.svg"} alt={d.brandLogoSrc ? d.orgLabel : "Blocktickets"} style={{ height: d.brandLogoSrc ? 34 : 20, width: "auto", objectFit: "contain" }} />
            </a>
          ) : (
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.eventName}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.whenShort}</div>
            </div>
          )}
          <button onClick={() => setInfo(true)} aria-label="Event information" style={{ fontFamily: "inherit", width: 44, height: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", color: navInk, cursor: "pointer" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
          </button>
        </header>
      )}

      {/* MAIN (reserved / seatmap flow) */}
      {!isGa && (
      <main style={{ flex: 1, width: "100%", maxWidth: 1320, margin: "0 auto", padding: mobile ? "12px 12px 96px" : narrow ? "16px 20px 120px" : "20px 32px 120px", boxSizing: "border-box", display: "grid", gridTemplateColumns: narrow ? "minmax(0, 1fr)" : "minmax(0, 1fr) 340px", gap: 28, alignItems: "start" }}>
        <section style={{ ...card, borderRadius: mobile ? 16 : 20, padding: mobile ? "16px 16px 20px" : narrow ? "14px 22px 26px" : "16px 32px 32px" }}>
          {narrow && <div style={{ marginBottom: 16 }}>{findOnMapBtn(150, 14)}</div>}

          <div ref={sticky} style={{ position: "sticky", top: mobile ? 72 : 92, zIndex: 5, background: "#fff", margin: mobile ? "16px -16px 0" : narrow ? "0 -22px 0" : "0 -32px 0", padding: mobile ? "4px 16px 10px" : narrow ? "14px 22px 12px" : "16px 32px 12px", borderRadius: `${mobile ? 16 : 20}px ${mobile ? 16 : 20}px 0 0`, boxShadow: pinned ? "0 12px 24px -18px color-mix(in srgb, var(--paper) 55%, transparent)" : "none", transition: "box-shadow 180ms ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <button onClick={() => setQtyMenu((v) => !v)} style={{ fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "space-between", gap: 8, minWidth: 132, boxSizing: "border-box", fontSize: 15, fontWeight: 600, color: "#fff", background: ACC, border: `1px solid ${ACC}`, borderRadius: 999, padding: "12px 20px", whiteSpace: "nowrap", cursor: "pointer" }}>
                  {want === 1 ? "1 ticket" : `${want} tickets`}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15, opacity: 0.8, transform: qtyMenu ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 180ms ease" }}><polyline points="6 9 12 15 18 9" /></svg>
                </button>
                {qtyMenu && (
                  <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 30, minWidth: 150, background: "#fff", border: "1px solid color-mix(in srgb, var(--paper) 10%, transparent)", borderRadius: 14, boxShadow: "0 20px 44px -18px color-mix(in srgb, var(--paper) 45%, transparent)", padding: 6, display: "flex", flexDirection: "column" }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <button key={n} onClick={() => { setQtyMenu(false); reload(n); }} style={{ fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%", textAlign: "left", fontSize: 15, fontWeight: n === want ? 600 : 500, color: n === want ? ACC : NAVY, background: n === want ? ACC_SOFT : "transparent", border: "none", borderRadius: 10, padding: "11px 14px", cursor: "pointer", whiteSpace: "nowrap" }}>
                        {n === 1 ? "1 ticket" : `${n} tickets`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, overflowX: "auto", padding: "2px 0 4px 2px", scrollbarWidth: "none", maskImage: "linear-gradient(90deg, #000 0, #000 calc(100% - 28px), transparent 100%)", WebkitMaskImage: "linear-gradient(90deg, #000 0, #000 calc(100% - 28px), transparent 100%)" }}>
                {[null, ...zoneChips].map((z) => {
                  const active = zoneFilter === z;
                  const locked = z !== null && isLocked(z);
                  const label = z === null ? "All" : z.replace(/Sections?\s*/i, "");
                  return (
                    <button key={z ?? "all"} onClick={() => { if (locked) { setUnlockZone(z); setUnlockInput(""); setUnlockError(false); } else { setZoneFilter(z); } }} className={`nmt-filter${active ? " active" : ""}`} style={{ fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 9, fontSize: 15, fontWeight: active ? 600 : 500, borderRadius: 999, padding: "12px 20px", whiteSpace: "nowrap", flexShrink: 0, cursor: "pointer" }}>
                      <span className="nmt-star">{locked ? <LockIcon s={15} /> : <Star s={17} filled={active} />}</span>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginTop: 22 }}>
              {loading ? <div style={{ height: 20, width: 96, borderRadius: 999, ...shimmer }} /> : <div style={{ fontSize: 16, fontWeight: 500, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{rows.length} Listings</div>}
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#6e7180" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 21, height: 21 }}><circle cx="16" cy="4" r="1" /><path d="m18 19 1-7-6 1" /><path d="m5 8 3-3 5.5 3-2.36 3.5" /><path d="M4.24 14.5a5 5 0 0 0 6.88 6" /><path d="M13.76 17.5a5 5 0 0 0-6.88-6" /></svg>
                  <button onClick={() => setAda((v) => !v)} aria-label="Accessible seating only" style={{ width: 48, height: 28, borderRadius: 999, border: "none", padding: 3, cursor: "pointer", boxSizing: "border-box", display: "flex", alignItems: "center", transition: "background 180ms ease", background: ada ? ACC : "#d3d6e0" }}>
                    <span style={{ display: "block", width: 22, height: 22, borderRadius: 999, background: "#fff", boxShadow: "0 1px 3px color-mix(in srgb, var(--paper) 30%, transparent)", transition: "transform 180ms cubic-bezier(0.2,0.8,0.2,1)", transform: ada ? "translateX(20px)" : "translateX(0)" }} />
                  </button>
                </div>
                <button style={{ fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 9, fontSize: 15, fontWeight: 500, color: NAVY, background: "transparent", border: "none", padding: 0, whiteSpace: "nowrap", cursor: "pointer" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><path d="M11 5h10" /><path d="M11 9h7" /><path d="M11 13h4" /><path d="M3 17l3 3 3-3" /><path d="M6 4v16" /></svg>
                  Sort by price
                </button>
              </div>
            </div>
            <div style={{ height: 1, background: "color-mix(in srgb, var(--paper) 8%, transparent)", margin: mobile ? "16px -16px 0" : narrow ? "18px -22px 0" : "20px -32px 0" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 18 }}>
            {loading &&
              [1, 2, 3, 4].map((s) => (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 18, border: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)", borderRadius: 16, padding: "16px 20px" }}>
                  <div style={{ width: thumbSize, height: thumbSize, borderRadius: 12, flexShrink: 0, ...shimmer }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
                    <div style={{ height: 20, width: 130, borderRadius: 999, ...shimmer }} />
                    <div style={{ height: 18, width: 180, borderRadius: 6, ...shimmer }} />
                    <div style={{ height: 14, width: 110, borderRadius: 6, ...shimmer }} />
                  </div>
                  <div style={{ height: 22, width: 96, borderRadius: 6, flexShrink: 0, ...shimmer }} />
                </div>
              ))}

            {!loading && rows.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, padding: "56px 24px" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={{ width: 34, height: 34 }}><path d="M4 9V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4z" /><line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" /></svg>
                <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.015em" }}>No listings for {want === 1 ? "1 ticket" : `${want} tickets`}</div>
                <div style={{ fontSize: 15, color: "#6e7180", maxWidth: 380 }}>Nothing currently on sale fits this group size. Try a smaller quantity, or check back later.</div>
                <button className="nmt-primary" onClick={() => reload(1)} style={{ ...primaryBtn, marginTop: 6, fontSize: 15, padding: "13px 26px" }}>Reset to 1 ticket</button>
              </div>
            )}

            {!loading &&
              rows.map((l, idx) => (
                <div key={`${l.sec}-${l.row}-${idx}`} className="nmt-listing" onClick={() => { setSel(idx); setPanelQty(want); setMedia(0); }} style={{ display: "flex", alignItems: "center", gap: 18, background: "#fff", border: "1px solid color-mix(in srgb, var(--paper) 10%, transparent)", borderRadius: 16, padding: "16px 20px", cursor: "pointer" }}>
                  <div style={{ width: thumbSize, height: thumbSize, borderRadius: 12, background: "#f1f3f8", border: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)", flexShrink: 0, overflow: "hidden" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={SEATMAP} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                    <span style={{ alignSelf: "flex-start", ...pill(ACC_SOFT, ACC) }}><Star s={14} /> {l.zone}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0, fontSize: 18, fontWeight: 600, letterSpacing: "-0.015em" }}>
                      <span style={{ color: "#6e7180", flexShrink: 0 }}><TicketIcon s={18} /></span>
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Sec {l.sec} · Row {l.row}</span>
                    </div>
                    <div style={{ fontSize: 15, color: "#6e7180" }}>{l.range}</div>
                    {mobile && (
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 2 }}>
                        <span style={{ fontSize: 17, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.015em", whiteSpace: "nowrap" }}>{l.price} each</span>
                        <span style={{ fontSize: 13, color: "#6e7180", whiteSpace: "nowrap" }}>Incl. fees</span>
                      </div>
                    )}
                  </div>
                  {!mobile && (
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 20, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.015em", whiteSpace: "nowrap" }}>{l.price} each</div>
                      <div style={{ fontSize: 13, color: "#6e7180", marginTop: 2, whiteSpace: "nowrap" }}>Incl. Taxes &amp; Fees</div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </section>

        {wide && (
          <aside style={{ display: "flex", flexDirection: "column", gap: 20, position: "sticky", top: 118 }}>
            {findOnMapBtn(260, 20)}
            {trustCard}
          </aside>
        )}
      </main>
      )}

      {/* MAIN (GA / general-admission flow) */}
      {isGa && (
        <main style={{ flex: 1, width: "100%", maxWidth: 1320, margin: "0 auto", padding: mobile ? "14px 14px 96px" : "24px 32px 120px", boxSizing: "border-box", display: "grid", gridTemplateColumns: narrow ? "minmax(0, 1fr)" : "minmax(300px, 360px) minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
          {/* left: poster + info — pinned while the right column scrolls (desktop). */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0, ...(narrow ? {} : { position: "sticky", top: 92, alignSelf: "start" }) }}>
            <div style={{ ...card, borderRadius: 20, padding: 16 }}>
              <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", borderRadius: 14, overflow: "hidden", background: "#f1f3f8", border: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={POSTER} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
            </div>
            <div style={{ ...card, borderRadius: 20, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { t: "Mobile tickets.", d: " Securely stored in your account.", icon: <><rect x="5" y="2" width="14" height="20" rx="3" /><line x1="10" y1="18.5" x2="14" y2="18.5" /></> },
                { t: "Buyer protection.", d: " Safe from bots and scalpers.", icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></> },
                { t: "Prices are all-in.", d: " Taxes and fees included.", icon: <><path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0l-7.2-7.2a2 2 0 0 1-.6-1.4V4a1 1 0 0 1 1-1h8a2 2 0 0 1 1.4.6l7.4 7.4a2 2 0 0 1 0 2.8z" /><line x1="7.5" y1="7.5" x2="7.51" y2="7.5" /></> },
              ].map((r) => (
                <div key={r.t} style={{ display: "flex", gap: 12 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, flexShrink: 0, marginTop: 2 }}>{r.icon}</svg>
                  <div style={{ fontSize: 14, color: "#4a5567" }}><span style={{ fontWeight: 600, color: NAVY }}>{r.t}</span>{r.d}</div>
                </div>
              ))}
            </div>
          </div>

          {/* right: title + tiers + about + who + venue */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            <div style={{ ...card, borderRadius: 20, padding: mobile ? 18 : 24, display: "flex", flexDirection: "column", gap: 12 }}>
              <h1 style={{ margin: 0, fontSize: mobile ? 30 : 42, fontWeight: 600, letterSpacing: "-0.035em", lineHeight: 1.08 }}>{d.eventName}</h1>
              <span style={{ alignSelf: "flex-start", fontSize: 17, fontWeight: 600, color: ACC }}>{d.venueLine}</span>
              <div style={{ fontSize: 16, color: "#4a5567" }}>{d.whenLong}</div>
            </div>

            {!mobile && (
              <div style={{ ...card, borderRadius: 20, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.025em" }}>Get tickets</div>
                {gaTierCards}
              </div>
            )}

            <div style={{ ...card, borderRadius: 20, padding: mobile ? 18 : 24, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a93a3" }}>About this event</div>
              <div style={{ fontSize: 15, lineHeight: 1.6, color: "#4a5567" }}>{d.aboutText}</div>
            </div>

            <div style={{ ...card, borderRadius: 20, padding: mobile ? 18 : 24, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a93a3" }}>Who&rsquo;s playing</div>
              <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 999, background: "#f1f3f8", border: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", padding: 6, boxSizing: "border-box" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={LOGO} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>{d.homeLabel}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 999, background: NAVY, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600 }}>{d.awayShort}</div>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>{d.awayLabel}</div>
                </div>
              </div>
            </div>

            <div style={{ ...card, borderRadius: 20, padding: mobile ? 18 : 24, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a93a3" }}>Venue</div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ width: 148, height: 100, borderRadius: 12, overflow: "hidden", background: "#f1f3f8", border: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)", flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.venuePhotoSrc || POSTER} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.02em" }}>{d.venueName}</div>
                  <div style={{ fontSize: 14, color: "#6e7180" }}>{d.venueAddress}</div>
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(d.mapsQuery)}`} target="_blank" rel="noopener noreferrer" style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 9, fontSize: 14, fontWeight: 600, color: NAVY, textDecoration: "none", background: "#fff", border: "1px solid #d3d6e0", borderRadius: 999, padding: "11px 18px" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                    Directions
                  </a>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* STICKY BUY BAR (GA, mobile) */}
      {isGa && mobile && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40, background: "#fff", borderTop: "1px solid color-mix(in srgb, var(--paper) 10%, transparent)", boxShadow: "0 -8px 24px -12px color-mix(in srgb, var(--paper) 25%, transparent)", padding: "12px 16px calc(12px + env(safe-area-inset-bottom))", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0, flexShrink: 0 }}>
            <div style={{ fontSize: 12, color: "#6e7180" }}>From</div>
            <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{money(gaFromNum)}</div>
          </div>
          <button className="nmt-primary" onClick={() => setGaSheet(true)} style={{ ...primaryBtn, marginLeft: "auto", flex: 1, maxWidth: 280, fontSize: 16, padding: "16px 24px" }}>Buy tickets</button>
        </div>
      )}

      {/* GA TIER SHEET (mobile) */}
      {isGa && gaSheet && (
        <div onClick={() => setGaSheet(false)} style={{ position: "fixed", inset: 0, zIndex: 55, background: "color-mix(in srgb, var(--paper) 55%, transparent)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, maxHeight: "88vh", background: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, boxShadow: "0 -20px 60px -20px color-mix(in srgb, var(--paper) 50%, transparent)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, flexShrink: 0 }}>
              <div style={{ width: 40, height: 5, borderRadius: 999, background: "color-mix(in srgb, var(--paper) 14%, transparent)" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 20px 16px", borderBottom: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)", flexShrink: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.025em" }}>Get tickets</div>
              <button onClick={() => setGaSheet(false)} aria-label="Close" style={{ fontFamily: "inherit", width: 40, height: 40, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", border: "1px solid #d3d6e0", borderRadius: 999, color: NAVY, cursor: "pointer" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
              {gaTierCards}
            </div>
          </div>
        </div>
      )}

      {/* NOTIFY / WAITLIST MODAL (GA) */}
      {isGa && notifyIdx !== null && GA_TIERS[notifyIdx] && (() => {
        const t = GA_TIERS[notifyIdx];
        const soldout = t.state === "soldout";
        const title = soldout ? "Join the waitlist" : "Get notified when tickets go on sale";
        const body = soldout
          ? `${t.name} is sold out. If tickets are released back to inventory, waitlist members are contacted in order — one purchase window each, 30 minutes to complete.`
          : `${t.name} goes on sale ${t.onSaleAt || "soon"}. We will send a reminder one hour before, and a second the moment inventory opens.`;
        const confirm = soldout
          ? `You are on the waitlist for ${t.name}. We will email ${notifyEmail || "your account address"} if tickets are released.`
          : `Reminder set. We will email ${notifyEmail || "your account address"} before ${t.name} goes on sale.`;
        return (
          <div onClick={() => setNotifyIdx(null)} style={{ position: "fixed", inset: 0, zIndex: 60, background: "color-mix(in srgb, var(--paper) 45%, transparent)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, boxSizing: "border-box" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, background: "#fff", borderRadius: 20, boxShadow: "0 40px 90px -30px color-mix(in srgb, var(--paper) 60%, transparent)", padding: 26, display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                  <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-0.025em" }}>{title}</div>
                  <div style={{ fontSize: 14, color: "#4a5567" }}>{body}</div>
                </div>
                <button onClick={() => setNotifyIdx(null)} aria-label="Close" style={{ fontFamily: "inherit", width: 40, height: 40, flexShrink: 0, borderRadius: 999, border: "1px solid #d3d6e0", background: "#fff", color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
              {!notifySent ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 13, fontWeight: 600, color: "#4a5567" }}>
                    Email address
                    <input type="email" value={notifyEmail} onChange={(e) => setNotifyEmail(e.target.value)} placeholder="you@example.com" style={{ fontFamily: "inherit", fontSize: 15, color: NAVY, background: "#fff", border: "1px solid #d3d6e0", borderRadius: 12, padding: "14px 16px", outline: "none" }} />
                  </label>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#4a5567", cursor: "pointer" }}>
                    <input type="checkbox" checked={notifySms} onChange={() => setNotifySms((v) => !v)} style={{ width: 18, height: 18, margin: "1px 0 0", accentColor: ACC }} />
                    <span>Also text me at the number on my account</span>
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end" }}>
                    <button onClick={() => setNotifyIdx(null)} style={{ fontFamily: "inherit", fontSize: 15, fontWeight: 600, color: NAVY, background: "#fff", border: "1px solid #d3d6e0", borderRadius: 999, padding: "13px 22px", cursor: "pointer" }}>Cancel</button>
                    <button className="nmt-primary" onClick={() => { setNotifySent(true); setNotified((m) => ({ ...m, [notifyIdx]: true })); }} style={{ ...primaryBtn, fontSize: 15, padding: "14px 24px" }}>{soldout ? "Join waitlist" : "Set reminder"}</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(166,231,115,0.16)", border: "1px solid rgba(127,190,77,0.35)", borderRadius: 14, padding: "14px 16px" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#3f6b1f" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, flexShrink: 0 }}><polyline points="20 6 9 17 4 12" /></svg>
                    <div style={{ fontSize: 14, color: "#3f6b1f" }}>{confirm}</div>
                  </div>
                  <button className="nmt-primary" onClick={() => setNotifyIdx(null)} style={{ ...primaryBtn, alignSelf: "flex-end", fontSize: 15, padding: "14px 24px" }}>Done</button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* provider pill */}
      <div style={{ position: "fixed", bottom: 20, left: 0, right: 0, zIndex: 14, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: NAVY, border: "1px solid rgba(158,182,216,0.14)", borderRadius: 999, padding: "10px 20px", boxShadow: "0 24px 60px -12px color-mix(in srgb, var(--paper) 45%, transparent)", maxWidth: "calc(100% - 32px)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/nmstate/blocktickets-lockup-white.svg" alt="blocktickets" style={{ height: 15, width: "auto", flexShrink: 0 }} />
          <span style={{ width: 1, height: 14, background: "rgba(158,182,216,0.3)", flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: "#b8c6dc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.providerLabel}</span>
        </div>
      </div>

      {/* SEAT MAP MODAL */}
      {map && (
        <div style={{ position: "fixed", inset: 0, zIndex: 40, background: "color-mix(in srgb, var(--paper) 50%, transparent)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 14, boxSizing: "border-box" }}>
          <div style={{ width: "100%", height: "100%", background: "#fff", borderRadius: 20, boxShadow: "0 40px 90px -30px color-mix(in srgb, var(--paper) 60%, transparent)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "22px 28px" }}>
              <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em" }}>Select your seats</div>
              <button onClick={() => setMap(false)} aria-label="Close seat map" style={{ fontFamily: "inherit", width: 44, height: 44, borderRadius: 999, border: "1px solid #d3d6e0", background: "#fff", color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: picks.length ? "minmax(0, 1fr) 380px" : "minmax(0, 1fr)", gap: 0, padding: "0 20px 20px", boxSizing: "border-box" }}>
              <div style={{ position: "relative", minWidth: 0, background: "#f1f3f8", border: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, padding: "16px 16px 84px", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ position: "relative", width: "100%", maxWidth: 620, aspectRatio: "62 / 42", maxHeight: "100%", transform: `scale(${zoom / 100})`, transition: "transform 220ms cubic-bezier(0.2,0.8,0.2,1)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={SEATMAP} alt="Seat map" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    {ZONES.map((z) => (
                      <button key={z.label} onClick={() => addPick(z)} style={{ fontFamily: "inherit", position: "absolute", left: z.x, top: z.y, transform: "translate(-50%, -50%)", display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, color: "#fff", background: z.bg, border: "2px solid #fff", borderRadius: 999, padding: "8px 14px", whiteSpace: "nowrap", cursor: "pointer", boxShadow: "0 6px 18px -8px color-mix(in srgb, var(--paper) 60%, transparent)" }}>
                        {z.label}
                        <span style={{ fontWeight: 500, opacity: 0.85 }}>{z.price}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ position: "absolute", left: 16, bottom: 16, background: "#fff", border: "1px solid #d3d6e0", borderRadius: 14, overflow: "hidden", minWidth: 200 }}>
                  <button onClick={() => setLegendOpen((v) => !v)} style={{ fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%", fontSize: 15, fontWeight: 500, color: NAVY, background: "#fff", border: "none", padding: "13px 18px", cursor: "pointer" }}>
                    Legend
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, color: "#6e7180", transform: legendOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 180ms ease" }}><polyline points="6 9 12 15 18 9" /></svg>
                  </button>
                  {legendOpen && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "4px 18px 16px" }}>
                      {LEGEND.map((g) => (
                        <div key={g.label} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#4a5567" }}>
                          <span style={{ width: 12, height: 12, borderRadius: 999, flexShrink: 0, background: g.color === "var(--acc)" ? ACC : g.color, border: "1px solid color-mix(in srgb, var(--paper) 12%, transparent)" }} />
                          {g.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ position: "absolute", right: 16, bottom: 16, display: "flex", alignItems: "center", gap: 4, background: "#fff", border: "1px solid #d3d6e0", borderRadius: 12, padding: 6 }}>
                  <button onClick={() => setZoom((z) => Math.max(55, z - 15))} aria-label="Zoom out" style={{ fontFamily: "inherit", width: 36, height: 36, border: "none", background: "transparent", color: NAVY, fontSize: 20, lineHeight: 1, borderRadius: 8, cursor: "pointer" }}>−</button>
                  <span style={{ minWidth: 56, textAlign: "center", fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{zoom}%</span>
                  <button onClick={() => setZoom((z) => Math.min(200, z + 15))} aria-label="Zoom in" style={{ fontFamily: "inherit", width: 36, height: 36, border: "none", background: "transparent", color: NAVY, fontSize: 20, lineHeight: 1, borderRadius: 8, cursor: "pointer" }}>+</button>
                </div>
              </div>

              {picks.length > 0 && (
                <div style={{ width: 380, display: "flex", flexDirection: "column", paddingLeft: 24, boxSizing: "border-box", minHeight: 0 }}>
                  {detail === null ? (
                    <>
                      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", textAlign: "center", paddingBottom: 16 }}>Your selection</div>
                      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column", gap: 12, padding: 10, margin: -10 }}>
                        {picks.map((p, idx) => (
                          <div key={idx} style={{ position: "relative", border: "1px solid color-mix(in srgb, var(--paper) 10%, transparent)", borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                              <div style={{ display: "flex", gap: 22 }}>
                                {(["Sec", "Row", "Seat"] as const).map((lbl, k) => (
                                  <div key={lbl} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a93a3" }}>{lbl}</span>
                                    <span style={{ fontSize: 17, fontWeight: 600 }}>{k === 0 ? p.sec : k === 1 ? p.row : p.seat}</span>
                                  </div>
                                ))}
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 17, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{p.price}</div>
                                <div style={{ fontSize: 12, color: "#6e7180" }}>Incl. Taxes &amp; Fees</div>
                              </div>
                            </div>
                            <div style={{ height: 1, background: "color-mix(in srgb, var(--paper) 8%, transparent)" }} />
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                              <span style={pill(ACC_SOFT, ACC)}><Star s={13} /> {p.zone}</span>
                              <button onClick={() => setDetail(idx)} style={{ fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 500, color: "#4a5567", background: "#f1f3f8", border: "none", borderRadius: 999, padding: "6px 12px", cursor: "pointer" }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                                Details
                              </button>
                            </div>
                            <button onClick={() => setPicks((s) => s.filter((_, k) => k !== idx))} aria-label="Remove seat" style={{ fontFamily: "inherit", position: "absolute", top: -8, right: -8, width: 28, height: 28, borderRadius: 999, border: "1px solid color-mix(in srgb, var(--paper) 10%, transparent)", background: "#fff", color: "#4a5567", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 12px -6px color-mix(in srgb, var(--paper) 50%, transparent)" }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                      <div style={{ paddingTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span style={{ fontSize: 16, fontWeight: 600 }}>Subtotal</span>
                            <span style={{ fontSize: 14, color: "#6e7180" }}>{picks.length === 1 ? "1 Ticket" : `${picks.length} Tickets`}</span>
                          </div>
                          <span style={{ fontSize: 26, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.025em" }}>{money(pickTotal)}</span>
                        </div>
                        <button className="nmt-primary" onClick={startHold} disabled={holding} style={{ ...primaryBtn, width: "100%", fontSize: 17, padding: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>{holdKids}</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 16 }}>
                        <button onClick={() => setDetail(null)} aria-label="Back to selection" style={{ fontFamily: "inherit", width: 40, height: 40, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", border: "1px solid #d3d6e0", borderRadius: 12, color: NAVY, cursor: "pointer" }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><polyline points="15 18 9 12 15 6" /></svg>
                        </button>
                        <div style={{ flex: 1, textAlign: "center", fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>Ticket details</div>
                        <div style={{ width: 40, flexShrink: 0 }} />
                      </div>
                      {picks[detail] && (
                        <>
                        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
                          <div style={{ position: "relative", height: 180, borderRadius: 14, background: "#f1f3f8", border: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)", overflow: "hidden", flexShrink: 0 }}>
                            {media === 0 ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={SEATMAP} alt="Seat location" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 14, boxSizing: "border-box" }} />
                            ) : (
                              <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: "#e7eaf2", color: "#6e7180" }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28 }}><path d="M3 20V9l9-5 9 5v11" /><path d="M3 20h18" /><path d="M7 20v-6h4v6" /><path d="M14 20v-6h3v6" /></svg>
                                <div style={{ fontSize: 13, fontWeight: 500 }}>Seat-view photo</div>
                              </div>
                            )}
                            <div style={{ position: "absolute", left: 0, right: 0, bottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                              <span style={{ display: "inline-flex", alignItems: "center", background: "color-mix(in srgb, var(--paper) 82%, transparent)", color: "#fff", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "5px 12px", borderRadius: 999 }}>{media === 0 ? "Seat location" : "Seat view"}</span>
                              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <span style={{ width: 6, height: 6, borderRadius: 999, background: media === 0 ? ACC : "color-mix(in srgb, var(--paper) 22%, transparent)" }} />
                                <span style={{ width: 6, height: 6, borderRadius: 999, background: media === 1 ? ACC : "color-mix(in srgb, var(--paper) 22%, transparent)" }} />
                              </span>
                            </div>
                            <button onClick={flip} aria-label="Previous view" style={{ fontFamily: "inherit", position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 38, height: 38, borderRadius: 999, background: "#fff", border: "1px solid color-mix(in srgb, var(--paper) 10%, transparent)", color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 6px 18px -8px color-mix(in srgb, var(--paper) 40%, transparent)" }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><polyline points="15 18 9 12 15 6" /></svg>
                            </button>
                            <button onClick={flip} aria-label="Next view" style={{ fontFamily: "inherit", position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 38, height: 38, borderRadius: 999, background: "#fff", border: "1px solid color-mix(in srgb, var(--paper) 10%, transparent)", color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 6px 18px -8px color-mix(in srgb, var(--paper) 40%, transparent)" }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><polyline points="9 18 15 12 9 6" /></svg>
                            </button>
                          </div>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                            <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>Sec {picks[detail].sec} · Row {picks[detail].row} · Seat {picks[detail].seat}</div>
                            <span style={pill(ACC_SOFT, ACC)}><Star s={13} /> {picks[detail].tier || picks[detail].zone}</span>
                          </div>
                          <div style={{ height: 1, background: "color-mix(in srgb, var(--paper) 8%, transparent)" }} />
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a93a3" }}>About this ticket</div>
                            <div style={{ fontSize: 14, color: "#4a5567", lineHeight: 1.6 }}>{picks[detail].tier || picks[detail].zone} seating in {picks[detail].zone}, with covered concourse access.</div>
                          </div>
                          {trustRows}
                        </div>
                        <div style={{ flexShrink: 0, borderTop: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)", paddingTop: 16, marginTop: 4, display: "flex", flexDirection: "column", gap: 14 }}>
                          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <span style={{ fontSize: 16, fontWeight: 600 }}>Subtotal</span>
                              <span style={{ fontSize: 14, color: "#6e7180" }}>1 Ticket</span>
                            </div>
                            <span style={{ fontSize: 26, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.025em" }}>{picks[detail].price}</span>
                          </div>
                          <button className="nmt-primary" onClick={startHold} disabled={holding} style={{ ...primaryBtn, width: "100%", fontSize: 17, padding: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>{holdKids}</button>
                        </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TICKET DETAIL DRAWER */}
      {panelOpen && selRow && (
        <>
          <div onClick={() => setSel(null)} style={{ position: "fixed", inset: 0, zIndex: 20, background: "color-mix(in srgb, var(--paper) 42%, transparent)", backdropFilter: "blur(3px)" }} />
          <div style={{ position: "fixed", zIndex: 21, display: "flex", flexDirection: "column", background: "#fff", overflow: "hidden", boxShadow: "-30px 0 80px -20px color-mix(in srgb, var(--paper) 45%, transparent)", top: mobile ? "auto" : 0, right: 0, bottom: 0, left: "auto", width: mobile ? "100%" : 480, height: mobile ? "86vh" : "auto", maxWidth: "100%", borderRadius: mobile ? "24px 24px 0 0" : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)", flexShrink: 0 }}>
              <button onClick={() => setSel(null)} aria-label="Back" style={{ fontFamily: "inherit", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", border: "1px solid #d3d6e0", borderRadius: 12, color: NAVY, cursor: "pointer", flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <div style={{ flex: 1, textAlign: "center", fontSize: 18, fontWeight: 600, letterSpacing: "-0.015em" }}>Ticket details</div>
              <div style={{ width: 44, flexShrink: 0 }} />
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              <div style={{ position: "relative", borderRadius: 16, background: "#f1f3f8", border: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)", overflow: "hidden", height: 220 }}>
                {media === 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={SEATMAP} alt="Seat location" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 14, boxSizing: "border-box" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, background: "#e7eaf2", color: "#6e7180" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 30, height: 30 }}><path d="M3 20V9l9-5 9 5v11" /><path d="M3 20h18" /><path d="M7 20v-6h4v6" /><path d="M14 20v-6h3v6" /></svg>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>View from Sec {selRow.sec}</div>
                    <div style={{ fontSize: 13 }}>Seat-view photo</div>
                  </div>
                )}
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "color-mix(in srgb, var(--paper) 82%, transparent)", color: "#fff", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", padding: "6px 14px", borderRadius: 999 }}>{media === 0 ? "Seat location" : "Seat view"}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: media === 0 ? ACC : "color-mix(in srgb, var(--paper) 22%, transparent)" }} />
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: media === 1 ? ACC : "color-mix(in srgb, var(--paper) 22%, transparent)" }} />
                  </span>
                </div>
                <button onClick={flip} aria-label="Previous view" style={{ fontFamily: "inherit", position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: 999, background: "#fff", border: "1px solid color-mix(in srgb, var(--paper) 10%, transparent)", color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 6px 18px -8px color-mix(in srgb, var(--paper) 40%, transparent)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                <button onClick={flip} aria-label="Next view" style={{ fontFamily: "inherit", position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: 999, background: "#fff", border: "1px solid color-mix(in srgb, var(--paper) 10%, transparent)", color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 6px 18px -8px color-mix(in srgb, var(--paper) 40%, transparent)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "18px 0 16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>Sec {selRow.sec} · Row {selRow.row}</div>
                  <div style={{ fontSize: 14, color: "#6e7180" }}>{(selRow as TicketingListing & { range?: string }).range} available</div>
                </div>
                <span style={pill(ACC_SOFT, ACC)}><Star s={14} /> {selRow.tier || selRow.zone}</span>
              </div>
              <div style={{ height: 1, background: "color-mix(in srgb, var(--paper) 8%, transparent)" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "18px 0" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 22, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>{selRow.price} ea</span>
                  <span style={{ fontSize: 14, color: "#6e7180" }}>incl. fees</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #d3d6e0", borderRadius: 999, padding: "5px 8px" }}>
                  <button onClick={() => setPanelQty((q) => Math.max(1, q - 1))} aria-label="Fewer tickets" style={{ fontFamily: "inherit", width: 36, height: 36, borderRadius: 999, border: "none", background: "#f1f3f8", color: NAVY, fontSize: 20, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                  <span style={{ minWidth: 74, textAlign: "center", fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{panelQty === 1 ? "1 Ticket" : `${panelQty} Tickets`}</span>
                  <button onClick={() => setPanelQty((q) => Math.min(8, q + 1))} aria-label="More tickets" style={{ fontFamily: "inherit", width: 36, height: 36, borderRadius: 999, border: "none", background: "#f1f3f8", color: NAVY, fontSize: 20, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a93a3" }}>About this ticket</div>
                <div style={{ fontSize: 14, color: "#4a5567", lineHeight: 1.6 }}>{selRow.tier || selRow.zone} seating in {selRow.zone} with covered concourse access.</div>
              </div>
              {trustRows}
            </div>
            <div style={{ flexShrink: 0, borderTop: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)", padding: "18px 20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>Subtotal</span>
                  <span style={{ fontSize: 14, color: "#6e7180" }}>{panelQty === 1 ? "1 Ticket" : `${panelQty} Tickets`}</span>
                </div>
                <span style={{ fontSize: 28, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.025em" }}>{money(unit * panelQty)}</span>
              </div>
              <button className="nmt-primary" onClick={startHold} disabled={holding} style={{ ...primaryBtn, width: "100%", fontSize: 17, padding: 17, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>{holdKids}</button>
            </div>
          </div>
        </>
      )}
        </>
      )}

      {/* CHECKOUT */}
      {mounted && screen === "checkout" && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 2147483000, background: "#f7f8fc", overflowY: "auto", overscrollBehavior: "contain", fontFamily: "'Geist', system-ui, -apple-system, sans-serif", color: NAVY }}>
          <header style={{ background: ACC, color: "#fff", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16, position: "sticky", top: 0, zIndex: 2 }}>
            <button onClick={() => setScreen(null)} style={{ fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500, color: "#fff", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: 999, padding: "10px 18px", cursor: "pointer" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
              Back
            </button>
            <div style={{ flex: 1 }} />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.22)", color: "#fff", fontSize: 13, fontWeight: 500, padding: "8px 14px", borderRadius: 999, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 16 14" /></svg>
              Seats held {coHold}
            </span>
            {!mobile && (
              <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "rgba(255,255,255,0.82)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                Secure checkout
              </div>
            )}
          </header>

          <div style={{ maxWidth: 1140, margin: "0 auto", padding: mobile ? "14px 14px 24px" : "24px 20px 28px", display: "grid", gridTemplateColumns: narrow ? "minmax(0, 1fr)" : "minmax(0, 1fr) 372px", gap: 20, alignItems: "start", boxSizing: "border-box" }}>
            {/* Order summary */}
            <div style={{ gridColumn: narrow ? "1" : "2", gridRow: "1", position: narrow ? "static" : "sticky", top: 84, display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
              <div style={{ ...card, borderRadius: 18, padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 12, background: "#f1f3f8", border: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 8, boxSizing: "border-box" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={LOGO} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em" }}>{d.eventName}</div>
                    <div style={{ fontSize: 13, color: "#6e7180" }}>{d.whenPlain}</div>
                    <div style={{ fontSize: 13, color: "#6e7180" }}>{d.venueName}</div>
                  </div>
                </div>
                <div style={{ height: 1, background: "color-mix(in srgb, var(--paper) 8%, transparent)" }} />
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ width: 84, height: 84, borderRadius: 12, overflow: "hidden", background: "#f1f3f8", border: "1px solid color-mix(in srgb, var(--paper) 10%, transparent)", flexShrink: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={THUMB} alt="Seat location" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, flex: 1 }}>
                    <span style={{ alignSelf: "flex-start", ...pill(ACC_SOFT, ACC) }}><Star s={12} /> {coTierLabel}</span>
                    <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em" }}>{coSeatLine}</div>
                    <div style={{ fontSize: 13, color: "#6e7180" }}>{coSeatSub}</div>
                  </div>
                </div>
                <div style={{ height: 1, background: "color-mix(in srgb, var(--paper) 8%, transparent)" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#4a5567" }}><span>{coQtyLabel} at {coUnit}</span><span style={{ fontVariantNumeric: "tabular-nums", color: NAVY }}>{coSubtotal}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#4a5567" }}><span>Service fee</span><span style={{ fontVariantNumeric: "tabular-nums", color: NAVY }}>{coFee}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#4a5567" }}><span>Processing fee</span><span style={{ fontVariantNumeric: "tabular-nums", color: NAVY }}>{coProc}</span></div>
                </div>
                <div style={{ height: 1, background: "color-mix(in srgb, var(--paper) 8%, transparent)" }} />
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>Total due</span>
                  <span style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>{coTotal}</span>
                </div>
              </div>
            </div>

            {/* Payment */}
            <div style={{ gridColumn: "1", gridRow: narrow ? "2" : "1", display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
              <div style={{ ...card, borderRadius: 18, padding: 22, display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.03em" }}>Payment</div>
                  <div style={{ fontSize: 14, color: "#6e7180" }}>Complete your purchase to lock in these seats.</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a93a3" }}>Express checkout</div>
                  <div style={{ display: "grid", gridTemplateColumns: mobile ? "minmax(0, 1fr)" : "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                    <button className="nmt-primary" style={{ fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 48, background: NAVY, color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 17, height: 17 }}><path d="M16.4 12.9c0-2 1.6-3 1.7-3.1-0.9-1.4-2.4-1.6-2.9-1.6-1.3-0.1-2.4 0.7-3 0.7-0.6 0-1.6-0.7-2.6-0.7-1.4 0-2.6 0.8-3.3 2-1.4 2.4-0.4 6 1 8 0.7 1 1.5 2.1 2.6 2 1-0.1 1.4-0.7 2.6-0.7 1.2 0 1.5 0.6 2.6 0.6 1.1 0 1.8-1 2.5-2 0.8-1.1 1.1-2.2 1.1-2.3-0.1 0-2.3-0.9-2.3-2.9zM14.6 6.4c0.6-0.7 1-1.7 0.9-2.7-0.9 0-2 0.6-2.6 1.3-0.6 0.6-1 1.6-0.9 2.6 1 0.1 2-0.5 2.6-1.2z" /></svg>
                      Pay
                    </button>
                    <button className="nmt-chip" style={{ fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 48, background: "#fff", color: NAVY, border: "1px solid #d3d6e0", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}><rect x="2" y="5" width="20" height="14" rx="3" /><path d="M7 15h5" /></svg>
                      Link
                    </button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "4px 0" }}>
                    <div style={{ flex: 1, height: 1, background: "color-mix(in srgb, var(--paper) 10%, transparent)" }} />
                    <span style={{ fontSize: 12, color: "#8a93a3" }}>Or pay another way</span>
                    <div style={{ flex: 1, height: 1, background: "color-mix(in srgb, var(--paper) 10%, transparent)" }} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                  {[
                    { on: true, label: "Card", d: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></> },
                    { on: false, label: "US bank", d: <><line x1="3" y1="21" x2="21" y2="21" /><path d="M4 21V10h16v11" /><polygon points="12 3 22 9 2 9 12 3" /></> },
                    { on: false, label: "Klarna", d: <><path d="M12 2v20" /><path d="M17 6.5c0-2-2.2-3-5-3s-5 1-5 3.2C7 11 17 9 17 13.8c0 2.3-2.2 3.7-5 3.7s-5-1.2-5-3" /></> },
                  ].map((m) => (
                    <div key={m.label} style={{ border: m.on ? `1.5px solid ${ACC}` : "1px solid color-mix(in srgb, var(--paper) 12%, transparent)", background: m.on ? ACC_SOFT : "#fff", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8, color: m.on ? ACC : "#4a5567", cursor: "pointer" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 19, height: 19 }}>{m.d}</svg>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{m.label}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 500, color: "#4a5567" }}>Card number</label>
                    <div style={{ border: "1px solid color-mix(in srgb, var(--paper) 16%, transparent)", boxShadow: "0 1px 2px color-mix(in srgb, var(--paper) 6%, transparent)", borderRadius: 10, padding: "13px 14px", fontSize: 15, color: "#8a93a3", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <span>1234 1234 1234 1234</span>
                      <span style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        {["#1a1f71", "#eb001b", "#006fcf", "#4a5567"].map((c, i) => <span key={i} style={{ width: 26, height: 17, borderRadius: 3, background: c }} />)}
                      </span>
                    </div>
                  </div>
                  {[{ l: "Expiration", v: "MM / YY" }, { l: "Security code", v: "CVC" }].map((f) => (
                    <div key={f.l} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ fontSize: 13, fontWeight: 500, color: "#4a5567" }}>{f.l}</label>
                      <div style={{ border: "1px solid color-mix(in srgb, var(--paper) 16%, transparent)", boxShadow: "0 1px 2px color-mix(in srgb, var(--paper) 6%, transparent)", borderRadius: 10, padding: "13px 14px", fontSize: 15, color: "#8a93a3", background: "#fff" }}>{f.v}</div>
                    </div>
                  ))}
                  <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 500, color: "#4a5567" }}>Name on card</label>
                    <div style={{ border: "1px solid color-mix(in srgb, var(--paper) 16%, transparent)", boxShadow: "0 1px 2px color-mix(in srgb, var(--paper) 6%, transparent)", borderRadius: 10, padding: "13px 14px", fontSize: 15, color: "#8a93a3", background: "#fff" }}>Full name</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 500, color: "#4a5567" }}>Country</label>
                    <div style={{ border: "1px solid color-mix(in srgb, var(--paper) 16%, transparent)", boxShadow: "0 1px 2px color-mix(in srgb, var(--paper) 6%, transparent)", borderRadius: 10, padding: "13px 14px", fontSize: 15, color: "#8a93a3", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <span style={{ color: NAVY }}>United States</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#8a93a3" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15, flexShrink: 0 }}><polyline points="6 9 12 15 18 9" /></svg>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 500, color: "#4a5567" }}>ZIP code</label>
                    <div style={{ border: "1px solid color-mix(in srgb, var(--paper) 16%, transparent)", boxShadow: "0 1px 2px color-mix(in srgb, var(--paper) 6%, transparent)", borderRadius: 10, padding: "13px 14px", fontSize: 15, color: "#8a93a3", background: "#fff" }}>{d.venueAddress.match(/\d{5}/)?.[0] || "88003"}</div>
                  </div>
                </div>
                <div style={{ height: 1, background: "color-mix(in srgb, var(--paper) 8%, transparent)" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8a93a3" }}>Promo code</label>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{ flex: 1, border: "1px solid color-mix(in srgb, var(--paper) 16%, transparent)", boxShadow: "0 1px 2px color-mix(in srgb, var(--paper) 6%, transparent)", borderRadius: 999, padding: "13px 18px", fontSize: 15, color: "#8a93a3", background: "#fff" }}>Enter promo code</div>
                      <button className="nmt-chip" style={{ fontFamily: "inherit", fontSize: 15, fontWeight: 600, color: NAVY, background: "#fff", border: "1px solid #d3d6e0", borderRadius: 999, padding: "13px 24px", cursor: "pointer" }}>Apply</button>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                    <span style={{ width: 19, height: 19, borderRadius: 5, border: `1.5px solid ${ACC}`, background: ACC, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                    <div style={{ fontSize: 13, color: "#4a5567" }}>Save my info for one-click checkout with Link at {d.homeLabel} venues.</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 12, color: "#8a93a3", maxWidth: 380 }}>By paying you agree to the Blocktickets Purchase Policy and Terms &amp; Conditions. All prices are all-in.</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "#8a93a3", whiteSpace: "nowrap" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    Payments secured by Stripe
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ position: "sticky", left: 0, right: 0, bottom: 0, zIndex: 3, background: "rgba(255,255,255,0.94)", backdropFilter: "blur(10px)", borderTop: "1px solid color-mix(in srgb, var(--paper) 10%, transparent)", boxShadow: "0 -12px 30px -24px color-mix(in srgb, var(--paper) 60%, transparent)" }}>
            <div style={{ maxWidth: 1140, margin: "0 auto", padding: mobile ? "12px 14px 16px" : "14px 20px", display: "flex", flexDirection: mobile ? "column" : "row", alignItems: mobile ? "stretch" : "center", justifyContent: "flex-end", gap: 12, boxSizing: "border-box" }}>
              <button className="nmt-primary" onClick={startPay} disabled={paying} aria-busy={paying} style={{ ...primaryBtn, width: mobile ? "100%" : 340, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 17, padding: "16px 34px", opacity: paying ? 0.9 : 1 }}>
                {paying ? btnRing : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>}
                {paying ? "Processing…" : `Pay ${coTotal}`}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* SUCCESS / ORDER CONFIRMATION */}
      {mounted && screen === "success" && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 2147483001, background: "#f7f8fc", overflowY: "auto", overscrollBehavior: "contain", fontFamily: "'Geist', system-ui, -apple-system, sans-serif", color: NAVY }}>
          <header style={{ background: ACC, color: "#fff", padding: "12px 20px", display: "flex", alignItems: "center", gap: 14, position: "sticky", top: 0, zIndex: 2 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: "#fff", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 7, boxSizing: "border-box" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.orgLabel}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.78)", fontVariantNumeric: "tabular-nums" }}>Order NMSU-{coOrderId} · confirmed</div>
            </div>
          </header>

          <div style={{ maxWidth: 1140, margin: "0 auto", padding: mobile ? "14px 14px 40px" : "24px 20px 40px", display: "grid", gridTemplateColumns: narrow ? "minmax(0, 1fr)" : "minmax(0, 1fr) 372px", gap: 20, alignItems: "start", boxSizing: "border-box" }}>
            <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ width: 38, height: 38, borderRadius: 999, background: "var(--green)", color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}><polyline points="20 6 9 17 4 12" /></svg>
              </span>
              <div style={{ fontSize: mobile ? 26 : 30, fontWeight: 600, letterSpacing: "-0.03em" }}>Order confirmation</div>
            </div>

            <div style={{ gridColumn: narrow ? "1" : "2", gridRow: "2", position: narrow ? "static" : "sticky", top: 88, display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
              <div style={{ ...card, borderRadius: 18, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em" }}>Order summary</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 14, color: "#4a5567" }}><span>{coQtyLabel} at {coUnit}</span><span style={{ fontVariantNumeric: "tabular-nums", color: NAVY }}>{coSubtotal}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 14, color: "#4a5567" }}><span>Service fee</span><span style={{ fontVariantNumeric: "tabular-nums", color: NAVY }}>{coFee}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 14, color: "#4a5567" }}><span>Processing fee</span><span style={{ fontVariantNumeric: "tabular-nums", color: NAVY }}>{coProc}</span></div>
                </div>
                <div style={{ height: 1, background: "color-mix(in srgb, var(--paper) 8%, transparent)" }} />
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>Total paid</span>
                  <span style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>{coTotal}</span>
                </div>
                <div style={{ height: 1, background: "color-mix(in srgb, var(--paper) 8%, transparent)" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 14, color: "#4a5567" }}><span>Payment method</span><span style={{ color: NAVY, fontVariantNumeric: "tabular-nums" }}>Card ···· 4471</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 14, color: "#4a5567" }}><span>Order</span><span style={{ color: NAVY, fontVariantNumeric: "tabular-nums" }}>NMSU-{coOrderId}</span></div>
                </div>
                <button className="nmt-chip" style={{ fontFamily: "inherit", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, fontSize: 15, fontWeight: 600, color: NAVY, background: "#fff", border: "1px solid #d3d6e0", borderRadius: 999, padding: 14, cursor: "pointer" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  Download receipt
                </button>
              </div>
            </div>

            <div style={{ gridColumn: "1", gridRow: narrow ? "3" : "2", display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
              <div style={{ ...card, borderRadius: 18, padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ width: 92, height: 92, borderRadius: 14, overflow: "hidden", background: "#f1f3f8", border: "1px solid color-mix(in srgb, var(--paper) 10%, transparent)", flexShrink: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={THUMB} alt="Seat location" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, minWidth: 0, flex: 1 }}>
                    <span style={{ alignSelf: "flex-start", ...pill(ACC_SOFT, ACC) }}><Star s={13} /> {coTierLabel}</span>
                    <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.025em" }}>{coSeatLine}</div>
                    <div style={{ fontSize: 14, color: "#6e7180" }}>{coSeatSub}</div>
                  </div>
                </div>
                <div style={{ height: 1, background: "color-mix(in srgb, var(--paper) 8%, transparent)" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.02em" }}>{d.eventName}</div>
                  <div style={{ fontSize: 14, color: "#6e7180" }}>{d.doorsLine}</div>
                  <div style={{ fontSize: 14, color: "#6e7180" }}>{d.venueLine}</div>
                </div>
                <button className="nmt-primary" onClick={() => setScreen(null)} style={{ ...primaryBtn, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, fontSize: 16, padding: "16px 26px" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}><path d="M20 12V8H6a2 2 0 0 1 0-4h12v4" /><path d="M4 6v12a2 2 0 0 0 2 2h14v-4" /><path d="M18 12a2 2 0 0 0 0 4h4v-4z" /></svg>
                  Go to my wallet
                </button>
              </div>

              <div style={{ ...card, borderRadius: 18, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a93a3" }}>Know before you go</div>
                {[
                  { icon: <><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 16 14" /></>, t: "Gates open 5:00 PM.", d: " Kickoff is 6:00 PM MT at gate 4, north plaza." },
                  { icon: <><rect x="1" y="3" width="15" height="13" rx="2" /><path d="M16 8h4l3 3v5h-7z" /><circle cx="5.5" cy="19" r="2" /><circle cx="18.5" cy="19" r="2" /></>, t: "Parking.", d: " Lot 100 opens three hours before kickoff, $15 at the gate." },
                  { icon: <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></>, t: "Clear bag policy.", d: " Bags larger than 12 by 6 by 12 inches are not permitted." },
                ].map((r) => (
                  <div key={r.t} style={{ display: "flex", gap: 13 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, flexShrink: 0, marginTop: 2 }}>{r.icon}</svg>
                    <div style={{ fontSize: 14, color: "#4a5567" }}><span style={{ fontWeight: 600, color: NAVY }}>{r.t}</span>{r.d}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* EVENT INFO MODAL */}
      {unlockZone !== null && (
        <div onClick={() => setUnlockZone(null)} style={{ position: "fixed", inset: 0, zIndex: 70, background: "color-mix(in srgb, var(--paper) 55%, transparent)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, boxSizing: "border-box" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 400, background: "#fff", borderRadius: 24, boxShadow: "0 40px 90px -30px color-mix(in srgb, var(--paper) 60%, transparent)", padding: 26, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: ACC_SOFT, color: ACC, display: "flex", alignItems: "center", justifyContent: "center" }}><LockIcon s={22} /></div>
                <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>{unlockZone} is locked</div>
                <div style={{ fontSize: 14, color: "#6e7180", lineHeight: 1.5 }}>Enter your access code to unlock these seats.</div>
              </div>
              <button onClick={() => setUnlockZone(null)} aria-label="Close" style={{ fontFamily: "inherit", flexShrink: 0, width: 36, height: 36, borderRadius: 999, background: "#f1f3f8", border: "none", color: "#4a5567", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <input
              value={unlockInput}
              onChange={(e) => { setUnlockInput(e.target.value); setUnlockError(false); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const z = unlockZone;
                  if (z && unlockInput.trim().toUpperCase() === lockedMap[z]) { setUnlocked((u) => [...u, z]); setZoneFilter(z); setUnlockZone(null); }
                  else setUnlockError(true);
                }
              }}
              autoFocus
              placeholder="Access code"
              style={{ fontFamily: "inherit", width: "100%", boxSizing: "border-box", fontSize: 16, letterSpacing: "0.06em", color: NAVY, background: "#fff", border: `1px solid ${unlockError ? "#c2394a" : "#d3d6e0"}`, borderRadius: 12, padding: "14px 16px", outline: "none" }}
            />
            {unlockError && <div style={{ fontSize: 13, color: "#c2394a" }}>That code didn&apos;t match. Check with the event for the right one.</div>}
            <button
              onClick={() => {
                const z = unlockZone;
                if (z && unlockInput.trim().toUpperCase() === lockedMap[z]) { setUnlocked((u) => [...u, z]); setZoneFilter(z); setUnlockZone(null); }
                else setUnlockError(true);
              }}
              className="nmt-primary"
              style={{ ...primaryBtn, width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9, fontSize: 16, padding: "15px 24px" }}
            >
              <LockIcon s={16} /> Unlock seats
            </button>
          </div>
        </div>
      )}

      {info && (
        <div onClick={() => setInfo(false)} style={{ position: "fixed", inset: 0, zIndex: 60, background: "color-mix(in srgb, var(--paper) 55%, transparent)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, boxSizing: "border-box" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, maxHeight: "100%", overflow: "hidden", background: "#fff", borderRadius: 24, boxShadow: "0 40px 90px -30px color-mix(in srgb, var(--paper) 60%, transparent)", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "22px 26px", borderBottom: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)", flexShrink: 0 }}>
              <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.03em" }}>Event information</div>
              <button onClick={() => setInfo(false)} aria-label="Close" style={{ fontFamily: "inherit", width: 40, height: 40, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", border: "1px solid #d3d6e0", borderRadius: 999, color: NAVY, cursor: "pointer" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 26, display: "flex", flexDirection: "column", gap: 22 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
              <div style={{ width: 132, height: 132, borderRadius: 22, background: "#f1f3f8", border: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18, boxSizing: "border-box" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={LOGO} alt={d.homeLabel} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.025em" }}>{d.eventName}</div>
              <div style={{ fontSize: 15, color: "#6e7180" }}>{d.doorsLine}</div>
            </div>
            <div style={{ background: "#f7f8fc", border: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)", borderRadius: 16, padding: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a93a3" }}>Venue</div>
                <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" }}>{d.venueName}</div>
                <div style={{ fontSize: 14, color: "#6e7180" }}>{d.venueAddress}</div>
              </div>
              <a href={`https://maps.google.com/?q=${encodeURIComponent(d.mapsQuery)}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 9, fontSize: 14, fontWeight: 600, color: NAVY, textDecoration: "none", background: "#fff", border: "1px solid #d3d6e0", borderRadius: 999, padding: "11px 18px", whiteSpace: "nowrap" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                Open in maps
              </a>
            </div>
            <div style={{ background: "#f7f8fc", border: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)", borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a93a3" }}>Who&rsquo;s playing</div>
              <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 999, background: "#fff", border: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", padding: 6, boxSizing: "border-box" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={LOGO} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>{d.homeLabel}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 999, background: NAVY, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600 }}>{d.awayShort}</div>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>{d.awayLabel}</div>
                </div>
              </div>
              <div style={{ height: 1, background: "color-mix(in srgb, var(--paper) 8%, transparent)" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a93a3" }}>About this event</div>
                <div style={{ fontSize: 14, color: "#4a5567", lineHeight: 1.65 }}>{d.aboutText}</div>
              </div>
            </div>
            </div>
          </div>
        </div>
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
