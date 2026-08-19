"use client";

/**
 * SeasonPurchase — NM State season-ticket purchase flow, ported from the
 * Claude Design "Season Tickets Purchase.dc.html". Self-contained dummy-data
 * flow: package overview (hero + 6-game list + sticky price bar) → full-screen
 * seat map (zones, legend, zoom, selection panel with per-seat detail carousel)
 * → confirmation. Crimson NM State brand, Geist type.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import BrandedActionButton from "@/components/atoms/BrandedActionButton";
import { goBack } from "@/lib/inAppBack";

const CRIMSON = "#8c0b42";
const CRIMSON_HI = "#a3134f";
const NAVY = "#051b35";
const SUB = "#6e7180";
const MUTE = "#8a93a3";
const FAINT = "#4a5567";
const FIELD = "#f7f8fc";
const SOFT = "#f7e8ee";
const LOGO = "/nmstate/nmstate-logo-nowordmark.png";
const LOCKUP = "/nmstate/blocktickets-lockup-white.svg";
const SEATMAP = "/nmstate/seatmap-dummy.svg";

type Zone = { label: string; price: string; x: string; y: string; bg: string; sec: string; row: string; zone: string; tier: string; unit: number };
const ZONES: Zone[] = [
  { label: "A–B", price: "$200.00", x: "50%", y: "22%", bg: CRIMSON, sec: "A", row: "I", zone: "Sections A–B", tier: "Premium chairback", unit: 200 },
  { label: "C–I", price: "$165.00", x: "20%", y: "52%", bg: NAVY, sec: "F", row: "4", zone: "Sections C–I", tier: "Reserved sideline", unit: 165 },
  { label: "J–L", price: "$120.00", x: "80%", y: "52%", bg: NAVY, sec: "K", row: "9", zone: "Sections J–L", tier: "Reserved corner", unit: 120 },
  { label: "M–N & GA", price: "$78.00", x: "50%", y: "84%", bg: FAINT, sec: "M", row: "2", zone: "Sections M–N", tier: "General admission", unit: 78 },
];

const GAMES = [
  { mon: "Sep", day: "05", title: "NM State Football vs. Mercyhurst", sub: "Sep 5, 7:00 PM · Aggie Memorial Stadium" },
  { mon: "Sep", day: "26", title: "NM State Football vs. New Mexico", sub: "Sep 26, 1:30 PM · Aggie Memorial Stadium" },
  { mon: "Oct", day: "01", title: "NM State Football vs. Western Kentucky", sub: "Oct 1, 6:00 PM · Aggie Memorial Stadium" },
  { mon: "Oct", day: "28", title: "NM State Football vs. Jax State", sub: "Oct 28, 6:00 PM · Aggie Memorial Stadium" },
  { mon: "Nov", day: "07", title: "NM State Football vs. Liberty", sub: "Nov 7, 3:00 PM · Aggie Memorial Stadium" },
  { mon: "Nov", day: "21", title: "NM State Football vs. Delaware", sub: "Nov 21, 1:00 PM · Aggie Memorial Stadium" },
];

const money = (n: number) => "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const cardCss: React.CSSProperties = {
  background: "#fff", border: "1px solid rgba(5,27,53,0.10)", borderRadius: 18,
  boxShadow: "0 1px 2px rgba(5,27,53,0.05), 0 10px 24px -14px rgba(5,27,53,0.30)",
};

type Pick = { sec: string; row: string; seat: string; zone: string; tier: string; unit: number; price: string; label: string };

export default function SeasonPurchase() {
  const [vw, setVw] = useState(1440);
  const [screen, setScreen] = useState<"package" | "checkout" | "done">("package");
  const [mapOpen, setMapOpen] = useState(false);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [zoom, setZoom] = useState(100);
  const [legend, setLegend] = useState(false);
  const [detail, setDetail] = useState<number | null>(null);
  const [media, setMedia] = useState(0);
  // Brief processing waits with an inline spinner (seat hold + payment).
  const [holding, setHolding] = useState(false);
  const [paying, setPaying] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const payTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (holdTimer.current) clearTimeout(holdTimer.current); if (payTimer.current) clearTimeout(payTimer.current); }, []);
  const startHold = () => {
    if (holding || !picks.length) return;
    setHolding(true);
    holdTimer.current = setTimeout(() => { setHolding(false); setMapOpen(false); setScreen("checkout"); }, 800);
  };
  const startPay = () => {
    if (paying) return;
    setPaying(true);
    payTimer.current = setTimeout(() => { setPaying(false); setScreen("done"); }, 1100);
  };
  const email = "jordan.reyes@gmail.com";

  useEffect(() => {
    setVw(window.innerWidth);
    const onR = () => setVw(window.innerWidth);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);
  useEffect(() => {
    document.body.style.overflow = mapOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mapOpen]);

  const heroRef = useRef<HTMLDivElement | null>(null);
  const [heroH, setHeroH] = useState(0);
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const update = () => setHeroH(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [screen, vw]);

  const mobile = vw < 900;
  const total = picks.reduce((t, p) => t + p.unit, 0);

  const addSeat = (z: Zone) => setPicks((list) => [...list, {
    sec: z.sec, row: z.row, seat: String(21 + list.length), zone: z.zone, tier: z.tier, unit: z.unit,
    price: money(z.unit), label: "Sec " + z.sec + " · Row " + z.row + " · Seat " + (21 + list.length),
  }]);

  const onBack = () => goBack("/nm-state/");

  /* ---- package overview ---- */
  const Package = () => (
    <>
      <div ref={heroRef} style={{ position: "sticky", top: 0, zIndex: 20, overflow: "hidden", background: `linear-gradient(115deg, #6d0733 0%, ${CRIMSON} 52%, ${CRIMSON_HI} 100%)`, color: "#fff" }}>
        <div style={{ position: "absolute", top: -70, right: -40, width: 320, height: 320, borderRadius: 999, background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "relative", maxWidth: 1180, margin: "0 auto", padding: mobile ? "16px 18px 20px" : "22px 32px 26px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={onBack} aria-label="Back" style={{ fontFamily: "inherit", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, color: "#fff", background: "rgba(255,255,255,0.14)", border: "none", borderRadius: 999, cursor: "pointer" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
            </button>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(255,255,255,0.75)" }}>Season package · 2026 season</div>
          </div>
          <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ width: 104, height: 104, flexShrink: 0, borderRadius: 22, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 14, boxSizing: "border-box", boxShadow: "0 12px 24px -12px rgba(0,0,0,0.5)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO} alt="NM State Athletics" style={{ maxWidth: "100%", maxHeight: "100%", display: "block" }} />
            </div>
            <div style={{ flex: "1 1 300px", minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              <h1 style={{ margin: 0, fontSize: mobile ? 30 : 46, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.06 }}>NMS Football Season Seats — Level A</h1>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {["Aggie Memorial Stadium", "Same seat, 6 games", "Transfer any game"].map((t) => (
                  <span key={t} style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: "rgba(255,255,255,0.14)", borderRadius: 999, padding: "7px 12px", whiteSpace: "nowrap" }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: mobile ? "20px 18px 120px" : "28px 32px 120px", boxSizing: "border-box", display: "grid", gridTemplateColumns: mobile ? "minmax(0, 1fr)" : "minmax(0, 1fr) 360px", gap: 32 }}>
          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 26 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: MUTE }}>{GAMES.length} Games Included</div>
                <div style={{ fontSize: 13, color: MUTE }}>Sep 5 – Nov 21</div>
              </div>
              <div style={{ borderTop: "1px solid rgba(5,27,53,0.10)" }}>
                {GAMES.map((g) => (
                  <div key={g.title} style={{ display: "flex", alignItems: "center", gap: 16, padding: "13px 0", borderBottom: "1px solid rgba(5,27,53,0.08)" }}>
                    <div style={{ width: 46, flexShrink: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: MUTE }}>{g.mon}</div>
                      <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{g.day}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis" }}>{g.title}</div>
                      <div style={{ fontSize: 13, color: SUB, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {!mobile && (
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, background: FIELD, borderRadius: 22, padding: 22, boxSizing: "border-box", position: "sticky", top: heroH + 16, maxHeight: `calc(100vh - ${heroH + 40}px)`, overflowY: "auto", boxShadow: "0 18px 40px -26px rgba(5,27,53,0.45)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 13, color: MUTE }}>Season tickets</span>
                <span style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>From $78</span>
                <span style={{ fontSize: 13, color: MUTE }}>Taxes and fees included</span>
              </div>
              <button onClick={() => setMapOpen(true)} style={{ fontFamily: "inherit", width: "100%", fontSize: 16, fontWeight: 600, color: "#fff", background: CRIMSON, border: "none", borderRadius: 999, padding: 16, minHeight: 52, cursor: "pointer" }}>Choose your seats</button>
              <div style={{ fontSize: 13, color: SUB }}>Delivered to your wallet. Transfer any single game you can&apos;t make.</div>
            </div>
          </div>
          )}
        </div>
      </div>

      {mobile && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(10px)", borderTop: "1px solid rgba(5,27,53,0.10)", boxShadow: "0 -12px 30px -24px rgba(5,27,53,0.6)", padding: "12px 16px calc(14px + env(safe-area-inset-bottom))", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>From $78</span>
            <span style={{ fontSize: 12, color: MUTE }}>Taxes &amp; fees included</span>
          </div>
          <button onClick={() => setMapOpen(true)} style={{ fontFamily: "inherit", flexShrink: 0, fontSize: 15, fontWeight: 600, color: "#fff", background: CRIMSON, border: "none", borderRadius: 999, padding: "14px 22px", minHeight: 48, cursor: "pointer" }}>Choose your seats</button>
        </div>
      )}
    </>
  );

  /* ---- standard checkout ---- */
  const zip = "88003";
  const fieldBox: React.CSSProperties = { border: "1px solid rgba(5,27,53,0.16)", boxShadow: "0 1px 2px rgba(5,27,53,0.06)", borderRadius: 10, padding: "13px 14px", fontSize: 15, color: MUTE, background: "#fff" };
  const Checkout = () => (
    <div style={{ minHeight: "100vh", background: FIELD, display: "flex", flexDirection: "column" }}>
      <header style={{ background: CRIMSON, color: "#fff", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16, position: "sticky", top: 0, zIndex: 2 }}>
        <button onClick={() => { setScreen("package"); setMapOpen(true); }} style={{ fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500, color: "#fff", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: 999, padding: "10px 18px", cursor: "pointer" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          Back
        </button>
        <div style={{ flex: 1 }} />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.22)", color: "#fff", fontSize: 13, fontWeight: 500, padding: "8px 14px", borderRadius: 999, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 16 14" /></svg>
          Seats held 9:58
        </span>
        {!mobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "rgba(255,255,255,0.82)" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            Secure checkout
          </div>
        )}
      </header>

      <div style={{ maxWidth: 1140, margin: "0 auto", padding: mobile ? "14px 14px 132px" : "24px 20px 120px", display: "grid", gridTemplateColumns: mobile ? "minmax(0, 1fr)" : "minmax(0, 1fr) 372px", gap: 20, alignItems: "start", boxSizing: "border-box", width: "100%" }}>
        {/* order summary */}
        <div style={{ gridColumn: mobile ? "1" : "2", gridRow: "1", position: mobile ? "static" : "sticky", top: 84, display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <div style={{ ...cardCss, padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: 12, background: "#f1f3f8", border: "1px solid rgba(5,27,53,0.08)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 8, boxSizing: "border-box" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={LOGO} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em" }}>NMS Football Season Seats — Level A</div>
                <div style={{ fontSize: 13, color: SUB }}>2026 Season · 6 home games</div>
                <div style={{ fontSize: 13, color: SUB }}>Aggie Memorial Stadium</div>
              </div>
            </div>
            <div style={{ height: 1, background: "rgba(5,27,53,0.08)" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {picks.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Sec {p.sec} · Row {p.row} · Seat {p.seat}</div>
                    <div style={{ fontSize: 12, color: SUB }}>{p.zone} · all 6 games</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{p.price}</div>
                </div>
              ))}
            </div>
            <div style={{ height: 1, background: "rgba(5,27,53,0.08)" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: FAINT }}><span>Subtotal</span><span style={{ fontVariantNumeric: "tabular-nums", color: NAVY }}>{money(total)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: FAINT }}><span>Taxes &amp; fees</span><span style={{ fontVariantNumeric: "tabular-nums", color: NAVY }}>Included</span></div>
            </div>
            <div style={{ height: 1, background: "rgba(5,27,53,0.08)" }} />
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Total due</span>
              <span style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>{money(total)}</span>
            </div>
          </div>
        </div>

        {/* payment */}
        <div style={{ gridColumn: "1", gridRow: mobile ? "2" : "1", display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <div style={{ ...cardCss, padding: 22, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.03em" }}>Payment</div>
              <div style={{ fontSize: 14, color: SUB }}>Complete your purchase to lock in your season seats.</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTE }}>Express checkout</div>
              <div style={{ display: "grid", gridTemplateColumns: mobile ? "minmax(0, 1fr)" : "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                <button style={{ fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 48, background: NAVY, color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 17, height: 17 }}><path d="M16.4 12.9c0-2 1.6-3 1.7-3.1-0.9-1.4-2.4-1.6-2.9-1.6-1.3-0.1-2.4 0.7-3 0.7-0.6 0-1.6-0.7-2.6-0.7-1.4 0-2.6 0.8-3.3 2-1.4 2.4-0.4 6 1 8 0.7 1 1.5 2.1 2.6 2 1-0.1 1.4-0.7 2.6-0.7 1.2 0 1.5 0.6 2.6 0.6 1.1 0 1.8-1 2.5-2 0.8-1.1 1.1-2.2 1.1-2.3-0.1 0-2.3-0.9-2.3-2.9zM14.6 6.4c0.6-0.7 1-1.7 0.9-2.7-0.9 0-2 0.6-2.6 1.3-0.6 0.6-1 1.6-0.9 2.6 1 0.1 2-0.5 2.6-1.2z" /></svg>
                  Pay
                </button>
                <button style={{ fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 48, background: "#fff", color: NAVY, border: "1px solid #d3d6e0", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}><rect x="2" y="5" width="20" height="14" rx="3" /><path d="M7 15h5" /></svg>
                  Link
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "4px 0" }}>
                <div style={{ flex: 1, height: 1, background: "rgba(5,27,53,0.10)" }} />
                <span style={{ fontSize: 12, color: MUTE }}>Or pay another way</span>
                <div style={{ flex: 1, height: 1, background: "rgba(5,27,53,0.10)" }} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: FAINT }}>Card number</label>
                <div style={{ ...fieldBox, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <span>1234 1234 1234 1234</span>
                  <span style={{ display: "flex", gap: 4, flexShrink: 0 }}>{["#1a1f71", "#eb001b", "#006fcf", "#4a5567"].map((c, i) => <span key={i} style={{ width: 26, height: 17, borderRadius: 3, background: c }} />)}</span>
                </div>
              </div>
              {[{ l: "Expiration", v: "MM / YY" }, { l: "Security code", v: "CVC" }].map((f) => (
                <div key={f.l} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: FAINT }}>{f.l}</label>
                  <div style={fieldBox}>{f.v}</div>
                </div>
              ))}
              <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: FAINT }}>Name on card</label>
                <div style={fieldBox}>Full name</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: FAINT }}>Country</label>
                <div style={{ ...fieldBox, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ color: NAVY }}>United States</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke={MUTE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15, flexShrink: 0 }}><polyline points="6 9 12 15 18 9" /></svg>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: FAINT }}>ZIP code</label>
                <div style={fieldBox}>{zip}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
              <div style={{ fontSize: 12, color: MUTE, maxWidth: 380 }}>By paying you agree to the Blocktickets Purchase Policy and Terms &amp; Conditions. All prices are all-in.</div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: MUTE, whiteSpace: "nowrap" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                Payments secured by Stripe
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 3, background: "rgba(255,255,255,0.94)", backdropFilter: "blur(10px)", borderTop: "1px solid rgba(5,27,53,0.10)", boxShadow: "0 -12px 30px -24px rgba(5,27,53,0.6)" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", padding: mobile ? "12px 14px 16px" : "14px 20px", display: "flex", flexDirection: mobile ? "column" : "row", alignItems: mobile ? "stretch" : "center", justifyContent: "flex-end", gap: 12, boxSizing: "border-box" }}>
          <BrandedActionButton
            primaryColor={CRIMSON}
            loading={paying}
            loadingLabel="Processing…"
            onClick={startPay}
            className="text-[17px]"
            style={{ width: mobile ? "100%" : 340, padding: "16px 34px" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            Pay {money(total)}
          </BrandedActionButton>
        </div>
      </div>
    </div>
  );

  /* ---- done ---- */
  const Done = () => (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: mobile ? "48px 18px 64px" : "72px 32px 96px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
      <div style={{ width: 78, height: 78, borderRadius: 999, background: CRIMSON, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" style={{ width: 38, height: 38 }}><polyline points="20 6 9 17 4 12" /></svg>
      </div>
      <h1 style={{ margin: 0, fontSize: mobile ? 24 : 30, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.2, paddingBottom: 4 }}>You&apos;re in for the season</h1>
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: SUB }}>{picks.length} {picks.length === 1 ? "seat" : "seats"} for all six home games — now in your wallet. Confirmation sent to <strong style={{ fontWeight: 600, color: NAVY }}>{email}</strong>.</p>
      <div style={{ width: "100%", background: "#fff", border: "1px solid rgba(5,27,53,0.10)", borderRadius: 20, padding: 18, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
        {picks.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{p.label}</div>
            <div style={{ fontSize: 13, color: SUB }}>All 6 games</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
        <Link href="/my-tickets" style={{ fontFamily: "inherit", fontSize: 15, fontWeight: 600, color: "#fff", background: CRIMSON, border: "none", borderRadius: 999, padding: "14px 22px", minHeight: 48, whiteSpace: "nowrap", cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Open my wallet</Link>
        <button onClick={() => { setScreen("package"); setPicks([]); setDetail(null); setMapOpen(false); }} style={{ fontFamily: "inherit", fontSize: 15, fontWeight: 600, color: NAVY, background: "#fff", border: "1px solid rgba(5,27,53,0.14)", borderRadius: 999, padding: "14px 22px", minHeight: 48, whiteSpace: "nowrap", cursor: "pointer" }}>Back to the package</button>
      </div>
    </div>
  );

  /* ---- seat-map modal ---- */
  const legendItems = [
    { label: "Unavailable", color: "#dfe3ee" },
    { label: "Available", color: CRIMSON },
    { label: "Your selection", color: NAVY },
    { label: "Accessibility", color: "#a6e773" },
  ];
  const MapModal = () => (
    <div style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(5,27,53,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 14, boxSizing: "border-box" }}>
      <div style={{ width: "100%", height: "100%", background: "#fff", borderRadius: 20, boxShadow: "0 40px 90px -30px rgba(5,27,53,0.6)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: mobile ? "16px 18px" : "22px 28px" }}>
          <div style={{ fontSize: mobile ? 20 : 24, fontWeight: 600, letterSpacing: "-0.02em" }}>Select your seats</div>
          <button onClick={() => setMapOpen(false)} aria-label="Close seat map" style={{ fontFamily: "inherit", width: 44, height: 44, borderRadius: 999, border: "1px solid #d3d6e0", background: "#fff", color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: mobile ? "flex" : "grid", flexDirection: mobile ? "column" : undefined, gridTemplateColumns: !mobile && picks.length ? "minmax(0, 1fr) 380px" : "minmax(0, 1fr)", gap: 0, padding: mobile ? "0 12px 12px" : "0 20px 20px", boxSizing: "border-box" }}>
          {/* map */}
          <div style={{ position: "relative", minWidth: 0, minHeight: mobile ? 320 : 0, flex: mobile ? "1 1 auto" : undefined, background: FIELD, border: "1px solid rgba(5,27,53,0.08)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, padding: "16px 16px 84px", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ position: "relative", width: "100%", maxWidth: 620, aspectRatio: "62 / 42", maxHeight: "100%", transform: `scale(${zoom / 100})`, transition: "transform 220ms cubic-bezier(0.2,0.8,0.2,1)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={SEATMAP} alt="Aggie Memorial Stadium map" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                {ZONES.map((z) => (
                  <button key={z.label} onClick={() => addSeat(z)} style={{ fontFamily: "inherit", position: "absolute", left: z.x, top: z.y, transform: "translate(-50%, -50%)", display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, color: "#fff", background: z.bg, border: "2px solid #fff", borderRadius: 999, padding: "8px 14px", whiteSpace: "nowrap", cursor: "pointer", boxShadow: "0 6px 18px -8px rgba(5,27,53,0.6)" }}>
                    {z.label}<span style={{ fontWeight: 500, opacity: 0.85 }}>{z.price}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ position: "absolute", left: 16, bottom: 16, background: "#fff", border: "1px solid #d3d6e0", borderRadius: 14, overflow: "hidden", minWidth: 200 }}>
              <button onClick={() => setLegend((v) => !v)} style={{ fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%", fontSize: 15, fontWeight: 500, color: NAVY, background: "#fff", border: "none", padding: "13px 18px", cursor: "pointer" }}>
                Legend
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, color: SUB, transform: legend ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 180ms ease" }}><polyline points="6 9 12 15 18 9" /></svg>
              </button>
              {legend && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "4px 18px 16px" }}>
                  {legendItems.map((g) => (
                    <div key={g.label} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: FAINT }}>
                      <span style={{ width: 12, height: 12, borderRadius: 999, flexShrink: 0, background: g.color, border: "1px solid rgba(5,27,53,0.12)" }} />{g.label}
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

          {/* selection panel */}
          {picks.length > 0 && (
            <div style={{ width: mobile ? "auto" : 380, display: "flex", flexDirection: "column", padding: mobile ? "16px 0 0" : "0 0 0 24px", boxSizing: "border-box", minHeight: 0 }}>
              {detail !== null ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 16 }}>
                    <button onClick={() => setDetail(null)} aria-label="Back to selection" style={{ fontFamily: "inherit", width: 40, height: 40, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", border: "1px solid #d3d6e0", borderRadius: 12, color: NAVY, cursor: "pointer" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><polyline points="15 18 9 12 15 6" /></svg>
                    </button>
                    <div style={{ flex: 1, textAlign: "center", fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>Ticket details</div>
                    <div style={{ width: 40, flexShrink: 0 }} />
                  </div>
                  <div className="sp-noscroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ position: "relative", height: 220, borderRadius: 14, background: FIELD, border: "1px solid rgba(5,27,53,0.08)", overflow: "hidden", flexShrink: 0 }}>
                      {media === 0 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={SEATMAP} alt="Seat location" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: "#e7eaf2", color: SUB }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28 }}><path d="M3 20V9l9-5 9 5v11" /><path d="M3 20h18" /><path d="M7 20v-6h4v6" /><path d="M14 20v-6h3v6" /></svg>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>Seat-view photo</div>
                        </div>
                      )}
                      <div style={{ position: "absolute", left: 0, right: 0, bottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", background: "rgba(5,27,53,0.82)", color: "#fff", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "5px 12px", borderRadius: 999 }}>{media === 0 ? "Seat location" : "Seat view"}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ width: 6, height: 6, borderRadius: 999, background: media === 0 ? CRIMSON : "rgba(5,27,53,0.22)" }} />
                          <span style={{ width: 6, height: 6, borderRadius: 999, background: media === 1 ? CRIMSON : "rgba(5,27,53,0.22)" }} />
                        </span>
                      </div>
                      <button onClick={() => setMedia((m) => (m === 0 ? 1 : 0))} aria-label="Previous view" style={{ fontFamily: "inherit", position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 38, height: 38, borderRadius: 999, background: "#fff", border: "1px solid rgba(5,27,53,0.10)", color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 6px 18px -8px rgba(5,27,53,0.4)" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><polyline points="15 18 9 12 15 6" /></svg>
                      </button>
                      <button onClick={() => setMedia((m) => (m === 0 ? 1 : 0))} aria-label="Next view" style={{ fontFamily: "inherit", position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 38, height: 38, borderRadius: 999, background: "#fff", border: "1px solid rgba(5,27,53,0.10)", color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 6px 18px -8px rgba(5,27,53,0.4)" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><polyline points="9 18 15 12 9 6" /></svg>
                      </button>
                    </div>

                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>Sec {picks[detail].sec} · Row {picks[detail].row} · Seat {picks[detail].seat}</div>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 7, flexShrink: 0, background: SOFT, color: CRIMSON, fontSize: 13, fontWeight: 600, padding: "5px 11px", borderRadius: 999, whiteSpace: "nowrap" }}>
                        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 13, height: 13 }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                        {picks[detail].tier}
                      </span>
                    </div>
                    <div style={{ height: 1, background: "rgba(5,27,53,0.08)" }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTE }}>About this ticket</div>
                      <div style={{ fontSize: 14, color: FAINT, lineHeight: 1.6 }}>{picks[detail].tier} seating in {picks[detail].zone}, with covered concourse access. Entry through Gate 3, closest to the north lot.</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, background: FIELD, border: "1px solid rgba(5,27,53,0.08)", borderRadius: 14, padding: 16 }}>
                      {[
                        ["Mobile tickets.", "Delivered to your account and scanned at the gate."],
                        ["Buyer protection.", "Every listing is verified inventory, safe from bots and scalpers."],
                        ["Prices are all-in.", "Taxes and fees included. No surprises at checkout."],
                      ].map(([b, t]) => (
                        <div key={b} style={{ display: "flex", gap: 12 }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke={CRIMSON} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg>
                          <div style={{ fontSize: 13, color: FAINT }}><span style={{ fontWeight: 600, color: NAVY }}>{b}</span> {t}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", textAlign: "center", paddingBottom: 16 }}>Your selection</div>
                  <div className="sp-noscroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column", gap: 12, padding: 10, margin: -10 }}>
                    {picks.map((p, idx) => (
                      <div key={idx} style={{ position: "relative", border: "1px solid rgba(5,27,53,0.10)", borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                          <div style={{ display: "flex", gap: 22 }}>
                            {[["Sec", p.sec], ["Row", p.row], ["Seat", p.seat]].map(([k, v]) => (
                              <div key={k} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTE }}>{k}</span>
                                <span style={{ fontSize: 17, fontWeight: 600 }}>{v}</span>
                              </div>
                            ))}
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 17, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{p.price}</div>
                            <div style={{ fontSize: 12, color: SUB }}>All 6 games · incl. fees</div>
                          </div>
                        </div>
                        <div style={{ height: 1, background: "rgba(5,27,53,0.08)" }} />
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: SOFT, color: CRIMSON, fontSize: 13, fontWeight: 600, padding: "4px 11px", borderRadius: 999, whiteSpace: "nowrap" }}>
                            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 13, height: 13 }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                            {p.zone}
                          </span>
                          <button onClick={() => { setMedia(0); setDetail(idx); }} style={{ fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 500, color: FAINT, background: "#f1f3f8", border: "none", borderRadius: 999, padding: "6px 12px", cursor: "pointer" }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                            Details
                          </button>
                        </div>
                        <button onClick={() => { setPicks((list) => list.filter((_, k) => k !== idx)); setDetail(null); }} aria-label="Remove seat" style={{ fontFamily: "inherit", position: "absolute", top: -8, right: -8, width: 28, height: 28, borderRadius: 999, border: "1px solid rgba(5,27,53,0.10)", background: "#fff", color: FAINT, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 12px -6px rgba(5,27,53,0.5)" }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <div style={{ borderTop: "1px solid rgba(5,27,53,0.08)", marginTop: 16, paddingTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 16, fontWeight: 600 }}>Subtotal</span>
                    <span style={{ fontSize: 14, color: SUB }}>{picks.length === 1 ? "1 season seat" : picks.length + " season seats"} · 6 games</span>
                  </div>
                  <span style={{ fontSize: 26, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.025em" }}>{money(total)}</span>
                </div>
                <BrandedActionButton
                  primaryColor={CRIMSON}
                  loading={holding}
                  loadingLabel="Holding seats…"
                  disabled={!picks.length}
                  onClick={startHold}
                  className="w-full text-[17px]"
                  style={{ padding: 16 }}
                >
                  Checkout
                </BrandedActionButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ width: "100%", maxWidth: "100%", height: "100dvh", overflowY: "auto", overflowX: "hidden", color: NAVY, background: FIELD, fontFamily: "'Geist', system-ui, -apple-system, sans-serif", WebkitFontSmoothing: "antialiased" }}>
      <style>{`.sp-noscroll::-webkit-scrollbar{width:0;height:0;display:none}.sp-noscroll{-ms-overflow-style:none;scrollbar-width:none}`}</style>
      {screen === "package" && Package()}
      {screen === "checkout" && Checkout()}
      {screen === "done" && Done()}
      {mapOpen && MapModal()}

      {!mapOpen && screen !== "checkout" && !(mobile && screen === "package") && (
        <div style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 20, zIndex: 30, display: "flex", alignItems: "center", gap: 14, background: NAVY, borderRadius: 999, padding: "12px 20px", boxShadow: "0 20px 40px -18px rgba(5,27,53,0.7)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOCKUP} alt="Blocktickets" style={{ height: 17, display: "block", flexShrink: 0 }} />
          <span style={{ width: 1, height: 18, background: "rgba(255,255,255,0.2)", display: "block" }} />
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.82)", whiteSpace: "nowrap" }}>Official ticketing marketplace for New Mexico State venues</span>
        </div>
      )}
    </div>
  );
}
