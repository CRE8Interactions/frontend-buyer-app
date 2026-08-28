"use client";

/**
 * Policies — legal pages, ported from the Claude Design "Policies.dc.html".
 * Navy header, a sticky left tab rail (Purchase Policy / Terms / Privacy /
 * Disclaimer / Cookies) that switches the document in place, and a content
 * card that renders typed blocks (h2 / h3 / p / li). Content lives in
 * lib/policies-data.ts. Wired into the /purchase-policy, /terms-conditions,
 * /privacy-policy, /disclaimer and /cookies-policy routes (footer Legal links).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { policies, type PolicyBlock } from "@/lib/policies-data";

const NAVY = "#051b35";
const SUB = "#6e7180";
const MUTE = "#8a93a3";
const FAINT = "#4a5567";
const LOCKUP = "/nmstate/blocktickets-lockup-white.svg";

const blockStyle = (type: PolicyBlock["type"]): React.CSSProperties => {
  switch (type) {
    case "h2": return { fontSize: 21, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.3, color: NAVY, margin: "26px 0 8px" };
    case "h3": return { fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.4, color: NAVY, margin: "18px 0 4px" };
    case "li": return { fontSize: 15, fontWeight: 400, lineHeight: 1.7, color: FAINT, margin: "0 0 10px", paddingLeft: 22, position: "relative" };
    default: return { fontSize: 15, fontWeight: 400, lineHeight: 1.7, color: FAINT, margin: "0 0 12px" };
  }
};

export default function Policies({ initial = "purchase" }: { initial?: string }) {
  const [vw, setVw] = useState(1280);
  const [slug, setSlug] = useState(initial);

  useEffect(() => {
    setVw(window.innerWidth);
    const onR = () => setVw(window.innerWidth);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  const narrow = vw < 900;
  const doc = policies.find((d) => d.slug === slug) || policies[0];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f7f8fc", color: NAVY, fontFamily: "'Geist', system-ui, -apple-system, sans-serif", WebkitFontSmoothing: "antialiased" }}>
      <style>{`.pol-nav::-webkit-scrollbar{height:0}`}</style>

      <header style={{ background: NAVY, position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: narrow ? "14px 16px" : "18px 32px", display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/" aria-label="Blocktickets home" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOCKUP} alt="Blocktickets" style={{ height: 20, width: "auto", display: "block" }} />
          </Link>
          <Link href="/browse" style={{ marginLeft: "auto", fontSize: 14, fontWeight: 600, color: "#fff", textDecoration: "none" }}>Browse events</Link>
        </div>
      </header>

      <div style={{ flex: 1, width: "100%", maxWidth: 1180, margin: "0 auto", boxSizing: "border-box", padding: narrow ? "20px 16px 40px" : "36px 32px 60px", display: "grid", gridTemplateColumns: narrow ? "minmax(0, 1fr)" : "220px minmax(0, 1fr)", gap: 40, alignItems: "start" }}>
        <nav className="pol-nav" style={{ position: narrow ? "static" : "sticky", top: 92, display: "flex", flexDirection: narrow ? "row" : "column", gap: 6, overflowX: narrow ? "auto" : "visible", paddingBottom: 4 }}>
          {policies.map((d) => {
            const on = d.slug === slug;
            return (
              <button key={d.slug} onClick={() => { setSlug(d.slug); window.scrollTo(0, 0); }} style={{ fontFamily: "inherit", textAlign: "left", fontSize: 15, fontWeight: on ? 600 : 500, color: on ? NAVY : SUB, background: on ? "#eef1f6" : "transparent", border: "none", borderRadius: 12, padding: "12px 16px", minHeight: 44, whiteSpace: "nowrap", cursor: "pointer" }}>{d.title}</button>
            );
          })}
        </nav>

        <article style={{ background: "#fff", border: "1px solid rgba(5,27,53,0.10)", borderRadius: 24, boxShadow: "0 1px 2px rgba(5,27,53,0.05), 0 20px 46px -26px rgba(5,27,53,0.30)", padding: narrow ? "22px 18px" : "36px 44px", minWidth: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: 20, borderBottom: "1px solid rgba(5,27,53,0.08)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: MUTE }}>Legal</div>
            <h1 style={{ margin: 0, fontSize: narrow ? 30 : 38, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.1 }}>{doc.title}</h1>
            <div style={{ fontSize: 14, color: SUB }}>Last updated {doc.updated}</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 8 }}>
            {doc.blocks.map((b, i) => (
              <div key={i} style={blockStyle(b.type)}>
                {b.type === "li" && <span style={{ position: "absolute", left: 6, top: 11, width: 5, height: 5, borderRadius: 999, background: "#a9b0bd" }} />}
                {b.text}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid rgba(5,27,53,0.08)", fontSize: 14, color: SUB }}>
            Questions? Email <a href="mailto:help@blocktickets.xyz" style={{ fontWeight: 600, color: NAVY }}>help@blocktickets.xyz</a>
          </div>
        </article>
      </div>

      <footer style={{ background: "#03101f", color: "#b8c6dc", marginTop: 40 }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: narrow ? "24px 16px" : "28px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOCKUP} alt="blocktickets" style={{ height: 18, width: "auto", display: "block" }} />
          <div style={{ fontSize: 12, color: "#7e8fa8" }}>© 2026 Blocktickets. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
