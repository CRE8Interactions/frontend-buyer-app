"use client";

/**
 * Nav — the shared site nav (app-style), matching the Claude Design browse
 * header: solid navy bar, logo, page links (Home / Our Story / Browse), and —
 * on the "app" variant — a search field + Log in or My wallet.
 *
 * variant="app" (default, browse/app pages): logo + centered search + auth actions.
 * variant="marketing" (home, Our Story): logo + page links only.
 */

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NavAuthActions from "@/components/molecules/NavAuthActions";
import {
  ShopperSearchField,
  ShopperSearchMobile,
  ShopperSearchProvider,
} from "@/components/molecules/ShopperSearchBar";
import { blockticketsNavLogoHref } from "@/lib/navLogo";

const NAVY = "#051b35";
const GREEN = "#a6e773";
const LOCKUP = "/blocktickets-logo.svg";

const LINKS = [
  { label: "Home", href: "/" },
  { label: "Our Story", href: "/our-story/" },
  { label: "Browse", href: "/browse/" },
];

const SEARCH_CSS = `
.snav-bar{max-width:1320px;margin:0 auto;padding:0 32px;min-height:68px;box-sizing:border-box;align-items:center;gap:20px}
.snav-mk{display:flex}
.snav-app{display:grid;grid-template-columns:1fr minmax(0,560px) 1fr}
.snav-app > .snav-search-root{width:100%}
.snav-search-root{position:relative}
.snav-links{display:flex;align-items:center;gap:26px}
.snav-right{margin-left:auto;display:flex;align-items:center;gap:12px}
.snav-ham{display:none}
@media (max-width:900px){
  .snav-bar{padding:0 20px;min-height:60px}
  .snav-app{display:flex}
  .snav-links{display:none}
  .snav-search-root{display:none}
  .snav-ham{display:inline-flex}
}
`;

type Props = {
  variant?: "app" | "marketing";
};

export default function Nav({ variant = "app" }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const showSearch = variant === "app";
  const showLogin = variant === "app";
  const showLinks = variant === "marketing";

  const bar = (
    <header style={{ background: NAVY, position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
      <style>{SEARCH_CSS}</style>
      <div className={`snav-bar ${variant === "app" ? "snav-app" : "snav-mk"}`}>
        <Link
          href={blockticketsNavLogoHref(pathname)}
          aria-label="Blocktickets home"
          style={{ display: "flex", alignItems: "center", flexShrink: 0 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOCKUP} alt="Blocktickets" style={{ height: 20, width: "auto", display: "block" }} />
        </Link>

        {showLinks && (
          <nav className="snav-links">
            {LINKS.map((l) => (
              <Link key={l.label} href={l.href} style={{ fontSize: 14, fontWeight: 500, color: "#9DA2B3", textDecoration: "none", whiteSpace: "nowrap" }}>{l.label}</Link>
            ))}
          </nav>
        )}

        {showSearch && (
          <div className="snav-search-root">
            <ShopperSearchField variant="nav" />
          </div>
        )}

        <div className="snav-right">
          {showLogin && (
            <NavAuthActions
              buttonStyle={{ fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: NAVY, background: GREEN, border: "none", borderRadius: 999, padding: "11px 22px", cursor: "pointer", whiteSpace: "nowrap", textDecoration: "none", display: "inline-flex", alignItems: "center", flexShrink: 0 }}
            />
          )}
          {showLinks && (
            <button className="snav-ham" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu" style={{ fontFamily: "inherit", width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.10)", border: "none", color: "#fff", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">{open ? <path d="M6 6l12 12M18 6 6 18" /> : <><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" /></>}</svg>
            </button>
          )}
        </div>
      </div>

      {open && showLinks && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.10)", background: NAVY, padding: "12px 20px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
          {LINKS.map((l) => (
            <Link key={l.label} href={l.href} onClick={() => setOpen(false)} style={{ fontSize: 15, fontWeight: 500, color: "#BCBFCC", textDecoration: "none", padding: "8px 4px" }}>{l.label}</Link>
          ))}
        </div>
      )}
    </header>
  );

  if (!showSearch) return bar;

  return (
    <ShopperSearchProvider>
      {bar}
      <ShopperSearchMobile />
    </ShopperSearchProvider>
  );
}
