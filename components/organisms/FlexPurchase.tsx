"use client";

/**
 * FlexPurchase — NM State flex-pack purchase flow, ported from the Claude
 * Design "Flex Pack Purchase.dc.html". Self-contained dummy-data flow:
 * buy (hero + how-it-works + sticky purchase card) → standard checkout →
 * confirmation with the issued voucher codes. Crimson NM State brand.
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
const LOGO = "/nmstate/nmstate-logo-nowordmark.png";
const LOCKUP = "/nmstate/blocktickets-lockup-white.svg";

const VOUCHER_COUNT = 10;
const UNIT = 20;
const TOTAL = VOUCHER_COUNT * UNIT;
const money = (n: number) => "$" + n.toFixed(2);

const cardCss: React.CSSProperties = {
  background: "#fff", border: "1px solid rgba(5,27,53,0.10)", borderRadius: 18,
  boxShadow: "0 1px 2px rgba(5,27,53,0.05), 0 10px 24px -14px rgba(5,27,53,0.30)",
};

const STEPS = [
  { n: "1", title: "Buy the vouchers", body: "Pick how many you want. They land in your wallet right away." },
  { n: "2", title: "Redeem when you know", body: "Choose a game any time before kickoff and pick your seat then." },
  { n: "3", title: "Share what you skip", body: "Transfer a voucher to a friend if you cannot make a game." },
];
const DESCRIPTION = "Ten vouchers for the 2026 Aggie football season. Great for fans who travel, split games with friends, or want the flexibility to decide week to week. Vouchers never expire during the season and can be redeemed right up to kickoff.";
const VOUCHERS = Array.from({ length: VOUCHER_COUNT }, (_, i) => "AGGIE-FLEX-" + String(4820 + i * 7));

export default function FlexPurchase() {
  const [vw, setVw] = useState(1440);
  const [screen, setScreen] = useState<"buy" | "checkout" | "done">("buy");
  // Brief payment-processing spinner on the checkout page.
  const [paying, setPaying] = useState(false);
  const payTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (payTimer.current) clearTimeout(payTimer.current); }, []);
  const startPay = () => {
    if (paying) return;
    setPaying(true);
    payTimer.current = setTimeout(() => { setPaying(false); setScreen("done"); }, 1100);
  };

  useEffect(() => {
    setVw(window.innerWidth);
    const onR = () => setVw(window.innerWidth);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

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
  const onBack = () => goBack("/nm-state/");
  const fieldBox: React.CSSProperties = { border: "1px solid rgba(5,27,53,0.16)", boxShadow: "0 1px 2px rgba(5,27,53,0.06)", borderRadius: 10, padding: "13px 14px", fontSize: 15, color: MUTE, background: "#fff" };

  /* ---- buy ---- */
  const Buy = () => (
    <>
      <div ref={heroRef} style={{ flexShrink: 0, position: "sticky", top: 0, zIndex: 20, overflow: "hidden", background: `linear-gradient(115deg, #6d0733 0%, ${CRIMSON} 52%, ${CRIMSON_HI} 100%)`, color: "#fff" }}>
        <div style={{ position: "absolute", top: -70, right: -40, width: 300, height: 300, borderRadius: 999, background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "relative", maxWidth: 1180, margin: "0 auto", padding: mobile ? "16px 18px 20px" : "22px 32px 26px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={onBack} aria-label="Back" style={{ fontFamily: "inherit", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, color: "#fff", background: "rgba(255,255,255,0.14)", border: "none", borderRadius: 999, cursor: "pointer" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
            </button>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(255,255,255,0.75)" }}>Flex pack · 2026 season</div>
          </div>
          <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ width: 96, height: 96, flexShrink: 0, borderRadius: 22, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 14, boxSizing: "border-box", boxShadow: "0 12px 24px -12px rgba(0,0,0,0.5)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO} alt="NM State Athletics" style={{ maxWidth: "100%", maxHeight: "100%", display: "block" }} />
            </div>
            <div style={{ flex: "1 1 300px", minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              <h1 style={{ margin: 0, fontSize: mobile ? 30 : 42, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.06 }}>Aggie Football Flex Pack</h1>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {["Aggie Memorial Stadium", "Any home game", "Redeem any time"].map((t) => (
                  <span key={t} style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: "rgba(255,255,255,0.14)", borderRadius: 999, padding: "7px 12px", whiteSpace: "nowrap" }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: mobile ? "20px 18px 120px" : "28px 32px 120px", boxSizing: "border-box", display: "grid", gridTemplateColumns: mobile ? "minmax(0, 1fr)" : "minmax(0, 1fr) 360px", gap: 32 }}>
          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: MUTE }}>How the flex pack works</div>
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "minmax(0, 1fr)" : "repeat(3, minmax(0, 1fr))", gap: 10 }}>
              {STEPS.map((st) => (
                <div key={st.n} style={{ background: FIELD, borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 999, background: CRIMSON, color: "#fff", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{st.n}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{st.title}</div>
                  <div style={{ fontSize: 13, color: SUB, lineHeight: 1.55 }}>{st.body}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 12, borderTop: "1px solid rgba(5,27,53,0.08)" }}>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: MUTE }}>More info</div>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: FAINT }}>{DESCRIPTION}</p>
            </div>
          </div>

          {!mobile && (
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, background: FIELD, borderRadius: 22, padding: 22, boxSizing: "border-box", position: "sticky", top: heroH + 16, maxHeight: `calc(100vh - ${heroH + 40}px)`, overflowY: "auto", boxShadow: "0 18px 40px -26px rgba(5,27,53,0.45)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 13, color: MUTE }}>Flex pack · {VOUCHER_COUNT} vouchers</span>
                <span style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{money(TOTAL)}</span>
                <span style={{ fontSize: 13, color: MUTE }}>Taxes and fees included</span>
              </div>
              <button onClick={() => setScreen("checkout")} style={{ fontFamily: "inherit", width: "100%", fontSize: 16, fontWeight: 600, color: "#fff", background: CRIMSON, border: "none", borderRadius: 999, padding: 16, minHeight: 52, cursor: "pointer" }}>Get {VOUCHER_COUNT} vouchers</button>
              <div style={{ fontSize: 13, color: SUB }}>One voucher, one ticket to any home game. Pick your seat when you redeem.</div>
            </div>
          </div>
          )}
        </div>
      </div>

      {mobile && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(10px)", borderTop: "1px solid rgba(5,27,53,0.10)", boxShadow: "0 -12px 30px -24px rgba(5,27,53,0.6)", padding: "12px 16px calc(14px + env(safe-area-inset-bottom))", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{money(TOTAL)}</span>
            <span style={{ fontSize: 12, color: MUTE }}>Taxes &amp; fees included</span>
          </div>
          <button onClick={() => setScreen("checkout")} style={{ fontFamily: "inherit", flexShrink: 0, fontSize: 15, fontWeight: 600, color: "#fff", background: CRIMSON, border: "none", borderRadius: 999, padding: "14px 22px", minHeight: 48, cursor: "pointer" }}>Get {VOUCHER_COUNT} vouchers</button>
        </div>
      )}
    </>
  );

  /* ---- standard checkout ---- */
  const Checkout = () => (
    <div style={{ minHeight: "100vh", background: FIELD, display: "flex", flexDirection: "column" }}>
      <header style={{ background: CRIMSON, color: "#fff", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16, position: "sticky", top: 0, zIndex: 2 }}>
        <button onClick={() => setScreen("buy")} style={{ fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500, color: "#fff", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: 999, padding: "10px 18px", cursor: "pointer" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          Back
        </button>
        <div style={{ flex: 1 }} />
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
                <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em" }}>Aggie Football Flex Pack</div>
                <div style={{ fontSize: 13, color: SUB }}>2026 Season · any home game</div>
                <div style={{ fontSize: 13, color: SUB }}>Aggie Memorial Stadium</div>
              </div>
            </div>
            <div style={{ height: 1, background: "rgba(5,27,53,0.08)" }} />
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{VOUCHER_COUNT} flex vouchers</div>
                <div style={{ fontSize: 12, color: SUB }}>{money(UNIT)} each · redeem any home game</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{money(TOTAL)}</div>
            </div>
            <div style={{ height: 1, background: "rgba(5,27,53,0.08)" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: FAINT }}><span>Subtotal</span><span style={{ fontVariantNumeric: "tabular-nums", color: NAVY }}>{money(TOTAL)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: FAINT }}><span>Taxes &amp; fees</span><span style={{ fontVariantNumeric: "tabular-nums", color: NAVY }}>Included</span></div>
            </div>
            <div style={{ height: 1, background: "rgba(5,27,53,0.08)" }} />
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Total due</span>
              <span style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>{money(TOTAL)}</span>
            </div>
          </div>
        </div>

        {/* payment */}
        <div style={{ gridColumn: "1", gridRow: mobile ? "2" : "1", display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <div style={{ ...cardCss, padding: 22, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.03em" }}>Payment</div>
              <div style={{ fontSize: 14, color: SUB }}>Complete your purchase and the vouchers land in your wallet.</div>
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
                <div style={fieldBox}>88003</div>
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
            Pay {money(TOTAL)}
          </BrandedActionButton>
        </div>
      </div>
    </div>
  );

  /* ---- done ---- */
  const Done = () => (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ maxWidth: 620, margin: "0 auto", padding: mobile ? "40px 18px 120px" : "56px 32px 140px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center", boxSizing: "border-box" }}>
        <div style={{ width: 74, height: 74, borderRadius: 999, background: CRIMSON, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" style={{ width: 36, height: 36 }}><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        <h1 style={{ margin: 0, fontSize: mobile ? 25 : 32, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.2 }}>{VOUCHER_COUNT} vouchers, ready to use</h1>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: SUB }}>Redeem any voucher for any 2026 home game. They&apos;re in your wallet now — confirmation sent to <strong style={{ fontWeight: 600, color: NAVY }}>jordan.reyes@gmail.com</strong>.</p>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 8 }}>
          <Link href="/my-tickets" style={{ fontFamily: "inherit", fontSize: 15, fontWeight: 600, color: "#fff", background: CRIMSON, border: "none", borderRadius: 999, padding: "14px 22px", minHeight: 48, whiteSpace: "nowrap", cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Open my wallet</Link>
          <button onClick={() => setScreen("buy")} style={{ fontFamily: "inherit", fontSize: 15, fontWeight: 600, color: NAVY, background: "#fff", border: "1px solid rgba(5,27,53,0.14)", borderRadius: 999, padding: "14px 22px", minHeight: 48, whiteSpace: "nowrap", cursor: "pointer" }}>Back to flex packs</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ height: "100dvh", overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column", background: "#fff", color: NAVY, fontFamily: "'Geist', system-ui, -apple-system, sans-serif", WebkitFontSmoothing: "antialiased" }}>
      {screen === "buy" && Buy()}
      {screen === "checkout" && Checkout()}
      {screen === "done" && Done()}

      {screen !== "checkout" && !(mobile && screen === "buy") && (
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
