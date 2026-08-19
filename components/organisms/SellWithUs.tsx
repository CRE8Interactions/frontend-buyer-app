"use client";

/**
 * SellWithUs — partner lead form, ported from the Claude Design
 * "Sell With Us.dc.html". Navy header, a form card (organization, volume,
 * contact) with selectable chips, then a "Got it" confirmation. Navy footer.
 */

import { useEffect, useState } from "react";
import Link from "next/link";

const NAVY = "#051b35";
const GREEN = "#a6e773";
const SUB = "#6e7180";
const MUTE = "#8a93a3";
const FAINT = "#4a5567";
const LOCKUP = "/nmstate/blocktickets-lockup-white.svg";

const input: React.CSSProperties = { fontFamily: "inherit", width: "100%", boxSizing: "border-box", fontSize: 15, color: NAVY, background: "#fff", border: "1px solid #d3d6e0", borderRadius: 12, padding: "13px 15px", minHeight: 48, outline: "none" };
const labelSpan: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: FAINT };
const groupLabel: React.CSSProperties = { fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTE };

export default function SellWithUs() {
  const [vw, setVw] = useState(1100);
  const [screen, setScreen] = useState<"form" | "done">("form");
  const [org, setOrg] = useState("");
  const [city, setCity] = useState("");
  const [kind, setKind] = useState("Venue");
  const [events, setEvents] = useState("25–75");
  const [tickets, setTickets] = useState("50k–250k");
  const [provider, setProvider] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setVw(window.innerWidth);
    const onR = () => setVw(window.innerWidth);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  const narrow = vw < 820;
  const twoCol = narrow ? "minmax(0, 1fr)" : "repeat(2, minmax(0, 1fr))";
  const cardPad = narrow ? "20px 18px" : "28px 32px";
  const h1Size = narrow ? 30 : 40;
  const firstName = name.trim().split(" ")[0] || "there";

  const Chips = ({ options, value, onPick, wide }: { options: string[]; value: string; onPick: (v: string) => void; wide?: boolean }) => (
    <div style={{ display: "flex", gap: wide ? 8 : 6, flexWrap: "wrap" }}>
      {options.map((label) => {
        const on = label === value;
        return (
          <button key={label} onClick={() => onPick(label)} style={{ fontFamily: "inherit", fontSize: 14, fontWeight: on ? 600 : 500, color: on ? NAVY : FAINT, background: on ? "#eef7e4" : "#fff", border: `1px solid ${on ? "#7fbe4d" : "#d3d6e0"}`, borderRadius: 999, padding: wide ? "11px 18px" : "11px 16px", minHeight: 44, cursor: "pointer" }}>{label}</button>
        );
      })}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f7f8fc", color: NAVY, fontFamily: "'Geist', system-ui, -apple-system, sans-serif", WebkitFontSmoothing: "antialiased" }}>
      <header style={{ background: NAVY, position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: narrow ? "14px 16px" : "18px 32px", display: "flex", alignItems: "center", gap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOCKUP} alt="Blocktickets" style={{ height: 20, width: "auto", display: "block" }} />
          <Link href="/browse" style={{ marginLeft: "auto", fontSize: 14, fontWeight: 600, color: "#fff", textDecoration: "none" }}>Browse events</Link>
        </div>
      </header>

      <main style={{ flex: 1, width: "100%", maxWidth: 1100, margin: "0 auto", boxSizing: "border-box", padding: narrow ? "22px 16px 40px" : "40px 32px 60px", display: "flex", flexDirection: "column", gap: 28 }}>
        {screen === "form" ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 620 }}>
              <div style={groupLabel}>Sell with us</div>
              <h1 style={{ margin: 0, fontSize: h1Size, fontWeight: 600, letterSpacing: "-0.035em", lineHeight: 1.05 }}>Put your box office on blocktickets</h1>
              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: SUB }}>Tell us about your venue or team and we&apos;ll come back within one business day to schedule a discovery call.</p>
            </div>

            <div style={{ background: "#fff", border: "1px solid rgba(5,27,53,0.10)", borderRadius: 24, boxShadow: "0 1px 2px rgba(5,27,53,0.05), 0 20px 46px -26px rgba(5,27,53,0.30)", padding: cardPad, display: "flex", flexDirection: "column", gap: 22 }}>
              {/* organization */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={groupLabel}>Your organization</div>
                <div style={{ display: "grid", gridTemplateColumns: twoCol, gap: 12 }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    <span style={labelSpan}>Organization name</span>
                    <input value={org} onChange={(e) => setOrg(e.target.value)} placeholder="Aggie Memorial Stadium" style={input} />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    <span style={labelSpan}>City</span>
                    <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Las Cruces, NM" style={input} />
                  </label>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <span style={labelSpan}>What are you?</span>
                  <Chips options={["Venue", "Team", "Promoter", "Festival", "University"]} value={kind} onPick={setKind} wide />
                </div>
              </div>

              {/* volume */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 20, borderTop: "1px solid rgba(5,27,53,0.08)" }}>
                <div style={groupLabel}>Your volume</div>
                <div style={{ display: "grid", gridTemplateColumns: twoCol, gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    <span style={labelSpan}>Events a year</span>
                    <Chips options={["1–10", "11–25", "25–75", "75+"]} value={events} onPick={setEvents} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    <span style={labelSpan}>Tickets a year</span>
                    <Chips options={["Under 50k", "50k–250k", "250k–1M", "1M+"]} value={tickets} onPick={setTickets} />
                  </div>
                </div>
                <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <span style={labelSpan}>Current ticketing provider <span style={{ fontWeight: 400, color: MUTE }}>· optional</span></span>
                  <input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Paciolan, Ticketmaster, in-house…" style={input} />
                </label>
              </div>

              {/* contact */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 20, borderTop: "1px solid rgba(5,27,53,0.08)" }}>
                <div style={groupLabel}>How we reach you</div>
                <div style={{ display: "grid", gridTemplateColumns: twoCol, gap: 12 }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    <span style={labelSpan}>Your name</span>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Rivera" style={input} />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    <span style={labelSpan}>Work email</span>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@venue.com" style={input} />
                  </label>
                </div>
                <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <span style={labelSpan}>Anything we should know? <span style={{ fontWeight: 400, color: MUTE }}>· optional</span></span>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Contract end date, season on-sale timing, what is not working today…" style={{ ...input, minHeight: undefined, lineHeight: 1.5, resize: "vertical" }} />
                </label>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", paddingTop: 4 }}>
                <button onClick={() => setScreen("done")} style={{ fontFamily: "inherit", fontSize: 16, fontWeight: 600, color: NAVY, background: GREEN, border: "none", borderRadius: 999, padding: "16px 30px", minHeight: 52, cursor: "pointer" }}>Send it over</button>
                <span style={{ fontSize: 13, color: MUTE }}>We reply within one business day.</span>
              </div>
            </div>
          </>
        ) : (
          <div style={{ background: "#fff", border: "1px solid rgba(5,27,53,0.10)", borderRadius: 24, boxShadow: "0 1px 2px rgba(5,27,53,0.05), 0 20px 46px -26px rgba(5,27,53,0.30)", padding: cardPad, display: "flex", flexDirection: "column", gap: 16, maxWidth: 620 }}>
            <div style={{ width: 52, height: 52, borderRadius: 999, background: GREEN, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h1 style={{ margin: 0, fontSize: h1Size, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.1 }}>Got it, {firstName}</h1>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: SUB }}>We&apos;ll email {email || "your inbox"} within one business day with pricing for {org || "your venue"}.</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/browse" style={{ fontFamily: "inherit", fontSize: 15, fontWeight: 600, color: NAVY, background: GREEN, border: "none", borderRadius: 999, padding: "13px 22px", minHeight: 48, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Browse events</Link>
              <button onClick={() => { setScreen("form"); setOrg(""); setCity(""); setName(""); setEmail(""); setNotes(""); setProvider(""); }} style={{ fontFamily: "inherit", fontSize: 15, fontWeight: 600, color: NAVY, background: "#fff", border: "1px solid rgba(5,27,53,0.14)", borderRadius: 999, padding: "13px 22px", minHeight: 48, cursor: "pointer" }}>Submit another</button>
            </div>
          </div>
        )}
      </main>

      <footer style={{ background: "#03101f", color: "#b8c6dc", marginTop: 40 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: narrow ? "24px 16px" : "28px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOCKUP} alt="blocktickets" style={{ height: 18, width: "auto", display: "block" }} />
          <div style={{ fontSize: 12, color: "#7e8fa8" }}>© 2026 Blocktickets. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
