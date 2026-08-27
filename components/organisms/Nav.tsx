"use client";

/**
 * Nav — the shared site nav (app-style), matching the Claude Design browse
 * header: solid navy bar, logo, page links (Home / Our Story / Browse), and —
 * on the "app" variant — a search field + Log in or My wallet.
 *
 * variant="app" (default, browse/app pages): logo + centered search + auth actions.
 * variant="marketing" (home, Our Story): logo + page links only.
 *
 * Pass `search` to wire the field to page state. Provide `search.groups` to turn
 * the field into an autocomplete: Nav renders a dropdown of grouped results
 * (recent searches when empty, Events / Teams / Venues when querying), an empty
 * state, and a "See all results" footer — opening on focus and closing on Escape
 * or an outside click. Ported from "Browse Page.dc.html".
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NavAuthActions from "@/components/molecules/NavAuthActions";

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
.snav-search{display:flex;align-items:center;gap:10px;border-radius:999px;padding:10px 18px;cursor:text;transition:background 160ms ease,border-color 160ms ease}
.snav-res:hover{background:#f1f3f8}
.snav-seeall:hover{background:#f1f3f8}
.snav-ham{display:none}
.snav-msearch{display:none}
@media (max-width:900px){
  .snav-bar{padding:0 20px;min-height:60px}
  .snav-app{display:flex}
  .snav-links{display:none}
  .snav-search-root{display:none}
  .snav-ham{display:inline-flex}
  .snav-msearch{display:block}
}
@media (min-width:901px){ .snav-sheet{display:none} }
`;

export type SearchRow = { title: string; sub: string; meta: string; initials: string; iconBg: string; iconInk: string; href: string };
export type SearchGroup = { title: string; items: SearchRow[] };

type Props = {
  search?: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    /** When provided, the field becomes an autocomplete and Nav renders the dropdown. */
    groups?: SearchGroup[];
    /** href for the "See all results" footer (defaults to closing the dropdown). */
    seeAllHref?: string;
  };
  variant?: "app" | "marketing";
};

export default function Nav({ search, variant = "app" }: Props) {
  const [open, setOpen] = useState(false); // mobile hamburger menu
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false); // desktop dropdown
  const [sheetOpen, setSheetOpen] = useState(false); // mobile full-screen search
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const showSearch = variant === "app";
  const showLogin = variant === "app";
  const showLinks = variant === "marketing";
  const value = search ? search.value : q;
  const placeholder = search?.placeholder || "Search events, teams, venues";
  const onChange = (v: string) => {
    setSearchOpen(true);
    if (search) search.onChange(v); else setQ(v);
  };
  const hasQuery = value.trim().length > 0;
  const groups = search?.groups;
  const autocomplete = !!groups;
  const searchEmpty = autocomplete && hasQuery && groups!.every((g) => g.items.length === 0);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!search && e.key === "Enter") router.push("/browse");
  };

  // Close the autocomplete on Escape or a click outside the search root.
  useEffect(() => {
    if (!autocomplete) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setSearchOpen(false); setSheetOpen(false); } };
    const onDown = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown); };
  }, [autocomplete]);

  const searchBg = searchOpen ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.10)";
  const searchLine = searchOpen ? "rgba(166,231,115,0.65)" : "rgba(158,182,216,0.22)";

  const field = (light?: boolean) => (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      onFocus={() => setSearchOpen(true)}
      placeholder={placeholder}
      style={{ fontFamily: "inherit", fontSize: 14, color: light ? NAVY : "#fff", background: "transparent", border: "none", outline: "none", flex: 1, minWidth: 0 }}
    />
  );
  const searchIcon = (stroke: string) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17, flexShrink: 0 }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
  );

  // Grouped results — shared by the desktop dropdown and the mobile full-screen sheet.
  const resultsInner = autocomplete ? (
    <>
      {groups!.map((g) => g.items.length > 0 && (
        <div key={g.title} style={{ display: "flex", flexDirection: "column", gap: 2, padding: "8px 6px 10px" }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "#8a93a3", padding: "0 10px 6px" }}>{g.title}</div>
          {g.items.map((r, i) => (
            <Link key={`${r.title}-${i}`} href={r.href} onClick={() => { setSearchOpen(false); setSheetOpen(false); }} className="snav-res" style={{ display: "flex", alignItems: "center", gap: 12, borderRadius: 12, padding: "9px 10px", color: NAVY, textDecoration: "none" }}>
              <span style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 10, background: r.iconBg, color: r.iconInk, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600 }}>{r.initials}</span>
              <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
                <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</span>
                <span style={{ fontSize: 12, color: "#6e7180", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.sub}</span>
              </span>
              {r.meta && <span style={{ fontSize: 12, fontWeight: 600, color: "#6e7180", whiteSpace: "nowrap" }}>{r.meta}</span>}
            </Link>
          ))}
        </div>
      ))}

      {searchEmpty && (
        <div style={{ padding: "22px 16px", textAlign: "center", display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Nothing matches “{value}”</div>
          <div style={{ fontSize: 13, color: "#6e7180" }}>Try a team, venue or city name.</div>
        </div>
      )}

      {/* "See all results" footer removed for now — can be re-added later. */}
    </>
  ) : null;

  // Desktop dropdown — absolute panel under the field.
  const resultsPanel = searchOpen && resultsInner ? (
    <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, zIndex: 40, background: "#fff", border: "1px solid rgba(5,27,53,0.10)", borderRadius: 20, boxShadow: "0 30px 60px -24px rgba(3,16,31,0.6)", padding: 8, maxHeight: 460, overflowY: "auto", color: NAVY }}>
      {resultsInner}
    </div>
  ) : null;

  return (
    <>
    <header style={{ background: NAVY, position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
      <style>{SEARCH_CSS}</style>
      <div className={`snav-bar ${variant === "app" ? "snav-app" : "snav-mk"}`}>
        <Link
          href="/"
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
          <div ref={searchRef} className="snav-search-root">
            <div className="snav-search" onClick={() => setSearchOpen(true)} style={{ background: searchBg, border: `1px solid ${searchLine}` }}>
              {searchIcon("rgba(255,255,255,0.65)")}
              {field()}
              {hasQuery && (
                <button onClick={(e) => { e.stopPropagation(); onChange(""); }} aria-label="Clear search" style={{ fontFamily: "inherit", width: 22, height: 22, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 999, background: "rgba(255,255,255,0.14)", border: "none", color: "#fff", cursor: "pointer", padding: 0 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" style={{ width: 12, height: 12 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              )}
            </div>

            {resultsPanel}
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

      {open && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.10)", background: NAVY, padding: "12px 20px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
          {showSearch && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.10)", border: "1px solid rgba(158,182,216,0.22)", borderRadius: 999, padding: "11px 16px", marginBottom: 6 }}>{searchIcon("rgba(255,255,255,0.65)")}{field()}</div>
          )}
          {showLinks && LINKS.map((l) => (
            <Link key={l.label} href={l.href} onClick={() => setOpen(false)} style={{ fontSize: 15, fontWeight: 500, color: "#BCBFCC", textDecoration: "none", padding: "8px 4px" }}>{l.label}</Link>
          ))}
        </div>
      )}
    </header>

    {/* Mobile search trigger — tapping opens the full-screen search view. */}
    {showSearch && (
      <div className="snav-msearch" style={{ background: "#fff", borderBottom: "1px solid rgba(5,27,53,0.10)", padding: "12px 20px" }}>
        <button onClick={() => setSheetOpen(true)} aria-label="Open search" style={{ fontFamily: "inherit", width: "100%", display: "flex", alignItems: "center", gap: 10, background: "#f1f3f8", border: "1px solid rgba(5,27,53,0.10)", borderRadius: 999, padding: "12px 16px", cursor: "text", textAlign: "left" }}>
          {searchIcon("#6e7180")}
          <span style={{ flex: 1, minWidth: 0, fontSize: 15, color: value ? NAVY : "#6e7180", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value || placeholder}</span>
          {hasQuery && (
            <span onClick={(e) => { e.stopPropagation(); onChange(""); }} role="button" aria-label="Clear search" style={{ width: 22, height: 22, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 999, background: "rgba(5,27,53,0.10)", color: "#6e7180" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" style={{ width: 12, height: 12 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </span>
          )}
        </button>
      </div>
    )}

    {/* Full-screen mobile search — a full-bleed white page, not a floating popup. */}
    {showSearch && sheetOpen && (
      <div className="snav-sheet" style={{ position: "fixed", inset: 0, zIndex: 100, background: "#fff", display: "flex", flexDirection: "column" }}>
        <div style={{ background: NAVY, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.14)", border: "1px solid rgba(166,231,115,0.55)", borderRadius: 999, padding: "12px 16px" }}>
            {searchIcon("rgba(255,255,255,0.7)")}
            {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
            <input autoFocus value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} placeholder={placeholder} style={{ fontFamily: "inherit", fontSize: 16, color: "#fff", background: "transparent", border: "none", outline: "none", flex: 1, minWidth: 0 }} />
            {hasQuery && (
              <button onClick={() => onChange("")} aria-label="Clear search" style={{ fontFamily: "inherit", width: 24, height: 24, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 999, background: "rgba(255,255,255,0.16)", border: "none", color: "#fff", cursor: "pointer", padding: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" style={{ width: 13, height: 13 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            )}
          </div>
          <button onClick={() => setSheetOpen(false)} style={{ fontFamily: "inherit", fontSize: 15, fontWeight: 600, color: "#fff", background: "transparent", border: "none", cursor: "pointer", whiteSpace: "nowrap", padding: "6px 4px" }}>Cancel</button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "6px 14px 24px", background: "#fff" }}>
          {resultsInner}
        </div>
      </div>
    )}
    </>
  );
}
