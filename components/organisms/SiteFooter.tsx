import Link from "next/link";

/**
 * SiteFooter — the shared footer, ported from the Claude Design "Browse
 * Page.dc.html". Dark navy panel with the tagline, Company / Legal / Support
 * link columns, social icons, and copyright. Self-contained (inline styles +
 * clamp for responsiveness) so it renders identically on the light browse
 * page and the dark marketing pages (Our Story, etc.).
 */

const FOOT_COLS: { title: string; links: { label: string; href: string }[] }[] = [
  { title: "Company", links: [
    { label: "Home", href: "/" },
    { label: "Our Story", href: "/our-story" },
    { label: "Browse", href: "/browse" },
    { label: "Sell with us", href: "/sell" },
  ] },
  { title: "Legal", links: [
    { label: "Purchase Policy", href: "/purchase-policy" },
    { label: "Terms & Conditions", href: "/terms-conditions" },
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Disclaimer", href: "/disclaimer" },
    { label: "Cookies Policy", href: "/cookies-policy" },
  ] },
  { title: "Support", links: [
    { label: "Help Center", href: "#" },
  ] },
];

const SOCIALS: { label: string; d: string }[] = [
  { label: "facebook", d: "M22 12a10 10 0 1 0-11.6 9.9v-7h-2.5V12h2.5V9.8c0-2.5 1.5-3.9 3.7-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z" },
  { label: "instagram", d: "M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4 1.3-.1 1.7-.1 4.8-.1zm0 3.2A6.6 6.6 0 1 0 18.6 12 6.6 6.6 0 0 0 12 5.4zm0 10.9A4.3 4.3 0 1 1 16.3 12 4.3 4.3 0 0 1 12 16.3zm6.9-11.1a1.5 1.5 0 1 1-1.5-1.6 1.5 1.5 0 0 1 1.5 1.6z" },
  { label: "x", d: "M17.5 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8zm-1.1 16.1h1.7L7.7 4.8H5.9z" },
  { label: "tiktok", d: "M16.5 3c.3 2.1 1.5 3.4 3.5 3.6v2.6c-1.2.1-2.4-.2-3.5-.9v5.9c0 4.4-4.4 6.9-8 4.8-2.3-1.4-3-4.5-1.7-6.9 1-1.9 3.1-2.9 5.2-2.5v2.7c-.3-.1-.6-.1-.9-.1-1.2 0-2.2 1-2.2 2.2s1 2.2 2.2 2.2 2.2-1 2.2-2.2V3z" },
  { label: "linkedin", d: "M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9.5 9h3.8v1.7h.1a4.2 4.2 0 0 1 3.8-2c4 0 4.8 2.5 4.8 5.8V21h-4v-5.3c0-1.3 0-3-1.9-3s-2.1 1.4-2.1 2.9V21h-4z" },
];

const LOCKUP = "/blocktickets-logo.svg";

export default function SiteFooter() {
  return (
    <footer style={{ background: "#03101f", color: "#b8c6dc", fontFamily: "'Geist', system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "clamp(36px, 5vw, 56px) clamp(20px, 4vw, 32px) 32px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 40, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16, minWidth: 240 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOCKUP} alt="blocktickets" style={{ height: 20, width: "auto", display: "block" }} />
          <div style={{ fontSize: "clamp(30px, 4.4vw, 44px)", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.08, color: "#fff", maxWidth: 420 }}>Build Bigger.<br />Block by Block.</div>
        </div>
        <div style={{ display: "flex", gap: 56, flexWrap: "wrap", fontSize: 14, fontWeight: 500 }}>
          {FOOT_COLS.map((col) => (
            <div key={col.title} style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 130 }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "#7e8fa8" }}>{col.title}</div>
              {col.links.map((l) => (
                l.label === "Help Center" ? (
                  <a key={l.label} href={l.href} style={{ color: "#b8c6dc", textDecoration: "none" }}>{l.label}</a>
                ) : (
                  <Link key={l.label} href={l.href} style={{ color: "#b8c6dc", textDecoration: "none" }}>{l.label}</Link>
                )
              ))}
            </div>
          ))}
        </div>
      </div>
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "0 clamp(20px, 4vw, 32px) 32px" }}>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 22, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "#7e8fa8" }}>Also find us on</div>
            <div style={{ display: "flex", gap: 8 }}>
              {SOCIALS.map((s) => (
                <a key={s.label} href="#" aria-label={s.label} style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", color: "#b8c6dc", flexShrink: 0 }}>
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18, display: "block" }}><path d={s.d} /></svg>
                </a>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#7e8fa8" }}>© 2026 Blocktickets. All rights reserved · All prices shown all-in.</div>
        </div>
      </div>
    </footer>
  );
}
