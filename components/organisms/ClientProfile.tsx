"use client";

/**
 * ClientProfile — team / athletics-program storefront, ported from the Claude
 * Design "Client Profile.dc.html". Light theme, NM State crimson. Sticky
 * identity card (logo, sport filters, Follow) + tabbed content:
 * Upcoming events (grouped by month), Season tickets, Flex packages.
 */

import { useEffect, useMemo, useState } from "react";
import BrandLoader from "@/components/molecules/BrandLoader";

const ACC = "#8c0b42";
const NAVY = "var(--paper)";
const LOGO = "/nmstate/nmstate-logo-nowordmark.png";

type RawEvent = { mon: string; day: string; dow: string; time: string; sport: string; title: string; venue: string; city: string; p: number; status: string };

const RAW: RawEvent[] = [
  { mon: "Sep", day: "05", dow: "Sat", time: "7:00 PM", sport: "Football", title: "Aggies vs. Mercyhurst", venue: "Aggie Memorial Stadium", city: "Las Cruces, NM", p: 22, status: "On sale" },
  { mon: "Sep", day: "26", dow: "Sat", time: "7:00 PM", sport: "Football", title: "Aggies vs. New Mexico", venue: "Aggie Memorial Stadium", city: "Las Cruces, NM", p: 38, status: "Few left" },
  { mon: "Oct", day: "01", dow: "Thu", time: "7:00 PM", sport: "Football", title: "Aggies vs. Western Kentucky", venue: "Aggie Memorial Stadium", city: "Las Cruces, NM", p: 24, status: "On sale" },
  { mon: "Sep", day: "03", dow: "Thu", time: "7:00 PM", sport: "Soccer", title: "Soccer vs. Grand Canyon", venue: "NMSU Soccer Field", city: "Las Cruces, NM", p: 12, status: "On sale" },
  { mon: "Sep", day: "14", dow: "Mon", time: "6:00 PM", sport: "Soccer", title: "Soccer vs. Seattle U", venue: "NMSU Soccer Field", city: "Las Cruces, NM", p: 12, status: "On sale" },
  { mon: "Nov", day: "12", dow: "Thu", time: "7:00 PM", sport: "Basketball", title: "Men's Basketball vs. UTEP", venue: "Pan American Center", city: "Las Cruces, NM", p: 20, status: "Presale" },
  { mon: "Nov", day: "21", dow: "Sat", time: "5:00 PM", sport: "Volleyball", title: "Volleyball vs. Tarleton State", venue: "Pan American Center", city: "Las Cruces, NM", p: 10, status: "On sale" },
  { mon: "Apr", day: "10", dow: "Fri", time: "6:00 PM", sport: "Baseball", title: "Baseball vs. Grand Canyon", venue: "Presley Askew Field", city: "Las Cruces, NM", p: 9, status: "On sale" },
];

const MONTH_NAMES: Record<string, string> = { Sep: "September 2026", Oct: "October 2026", Nov: "November 2026", Apr: "April 2027" };
const MONTH_ORDER = ["Sep", "Oct", "Nov", "Apr"];

const PACKAGES = [
  { kicker: "Football", title: "Aggie Football Season Seats — Level A", range: "Sep 5 → Nov 7 · 6 home games", note: "Sideline seats with playoff priority.", price: "$200.00" },
  { kicker: "All sports", title: "Aggie All-Access Pass", range: "Sep 2026 → May 2027 · 42 events", note: "Every home event across all five sports and four venues.", price: "$450.00" },
  { kicker: "Basketball", title: "Men's Basketball Season Seats — Level B", range: "Nov 12 → Mar 3 · 16 home games", note: "Lower bowl at the Pan American Center.", price: "$150.00" },
];

const FLEX = [
  { count: 3, price: "$66.00", each: "$22.00" },
  { count: 5, price: "$99.00", each: "$19.80" },
  { count: 10, price: "$185.00", each: "$18.50" },
];

const tagFor = (st: string) =>
  st === "Few left" ? { tagBg: "#fbf1de", tagInk: "#b5791e" }
  : st === "Presale" ? { tagBg: "#f1f3f8", tagInk: "#4a5567" }
  : { tagBg: "#e6f4eb", tagInk: "#2f8f4e" };

export default function ClientProfile({ orgName = "New Mexico State Athletics", logoSrc = LOGO }: { orgName?: string; logoSrc?: string } = {}) {
  const [tab, setTab] = useState<"events" | "packages" | "flex">("events");
  const [sport, setSport] = useState("All sports");
  const [vw, setVw] = useState(1440);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setVw(window.innerWidth);
    const onR = () => setVw(window.innerWidth);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  // Branded entry loader so the crimson tenant page never flashes our navy — held
  // for a beat so it reads as a hand-off, not a glitch.
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1100);
    return () => clearTimeout(t);
  }, []);

  const mobile = vw < 900;
  const narrow = !mobile && vw < 1160;

  const { groups, sportFilters, sports } = useMemo(() => {
    const filtered = sport === "All sports" ? RAW : RAW.filter((e) => e.sport === sport);
    const chrono = filtered.slice().sort((a, b) => MONTH_ORDER.indexOf(a.mon) - MONTH_ORDER.indexOf(b.mon) || Number(a.day) - Number(b.day));
    const monthKeys: string[] = [];
    chrono.forEach((e) => { if (!monthKeys.includes(e.mon)) monthKeys.push(e.mon); });
    const groups = monthKeys.map((m) => {
      const rows = chrono.filter((e) => e.mon === m);
      return { title: MONTH_NAMES[m], meta: rows.length === 1 ? "1 event" : `${rows.length} events`, rows };
    });
    const sports = ["All sports"];
    RAW.forEach((e) => { if (!sports.includes(e.sport)) sports.push(e.sport); });
    const sportFilters = sports.map((label) => ({
      label,
      n: label === "All sports" ? RAW.length : RAW.filter((e) => e.sport === label).length,
      on: label === sport,
    }));
    return { groups, sportFilters, sports };
  }, [sport]);

  const tabs = [
    { key: "events" as const, label: "Upcoming events" },
    { key: "packages" as const, label: "Season tickets" },
    { key: "flex" as const, label: "Flex packages" },
  ];

  const card: React.CSSProperties = { background: "#fff", border: "1px solid color-mix(in srgb, var(--paper) 10%, transparent)", borderRadius: 18, boxShadow: "0 1px 2px color-mix(in srgb, var(--paper) 5%, transparent)" };

  const rowCols = mobile || narrow ? "64px minmax(0, 1fr)" : "76px minmax(0, 1fr) auto";
  const dateW = mobile || narrow ? 64 : 76;
  const ctaSpan = mobile || narrow ? "1 / -1" : "auto";

  if (loading) return <BrandLoader variant="tenant" accent={ACC} logoSrc={logoSrc} name="NM State Athletics" message="Loading Aggie tickets" />;

  return (
    <div style={{ background: "#f7f8fc", color: NAVY, minHeight: "100vh", fontFamily: "'Geist', system-ui, -apple-system, sans-serif", WebkitFontSmoothing: "antialiased" }}>
      <style>{`.cp-a{transition:background 140ms}.cp-row{transition:box-shadow 150ms ease}.cp-row:hover{box-shadow:0 8px 30px color-mix(in srgb, var(--paper) 9%, transparent)}`}</style>

      <header style={{ background: ACC, position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1320, margin: "0 auto", padding: mobile ? "12px 20px" : "16px 32px", display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => window.history.back()} aria-label="Back to browse" style={{ fontFamily: "inherit", width: 40, height: 40, borderRadius: 999, background: "rgba(255,255,255,0.14)", color: "#fff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 19, height: 19 }}><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <a href="/login" style={{ fontFamily: "inherit", marginLeft: "auto", fontSize: 14, fontWeight: 600, color: ACC, background: "#fff", border: "none", borderRadius: 999, padding: "11px 22px", cursor: "pointer", whiteSpace: "nowrap", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Log in</a>
        </div>
      </header>

      <div style={{ maxWidth: 1320, margin: "0 auto", padding: mobile ? "20px 20px 40px" : "32px 32px 48px", display: "grid", gridTemplateColumns: mobile ? "1fr" : narrow ? "300px minmax(0, 1fr)" : "344px minmax(0, 1fr)", gap: mobile ? 20 : 28, alignItems: "start" }}>
        {/* identity aside (desktop) */}
        {!mobile && (
          <aside style={{ ...card, borderRadius: 24, boxShadow: "0 8px 30px color-mix(in srgb, var(--paper) 8%, transparent)", padding: 24, display: "flex", flexDirection: "column", gap: 18, position: "sticky", top: 84, zIndex: 5 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
              <div style={{ width: 116, height: 116, borderRadius: 999, background: "#fff", border: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)", boxShadow: "0 8px 30px color-mix(in srgb, var(--paper) 10%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", padding: 14, boxSizing: "border-box", flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoSrc} alt={orgName} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center", textAlign: "center", minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: ACC, whiteSpace: "nowrap" }}>
                  <span style={{ width: 5, height: 5, borderRadius: 999, background: ACC }} />
                  Athletics program
                </div>
                <h1 style={{ margin: 0, fontSize: 32, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.08 }}>{orgName}</h1>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6e7180" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13, flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                  Las Cruces, NM
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)" }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "#8a93a3", paddingTop: 14 }}>Sport</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {sportFilters.map((f) => (
                  <button key={f.label} className="cp-a" onClick={() => setSport(f.label)} style={{ fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, textAlign: "left", fontSize: 14, fontWeight: 500, whiteSpace: "nowrap", background: f.on ? "#fbecf1" : "transparent", color: f.on ? ACC : NAVY, border: "none", borderRadius: 10, padding: "9px 10px", cursor: "pointer" }}>
                    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{f.label}</span>
                    <span style={{ flexShrink: 0, fontSize: 12, color: "#8a93a3", fontVariantNumeric: "tabular-nums" }}>{f.n}</span>
                  </button>
                ))}
              </div>
            </div>

            <p style={{ margin: 0, paddingTop: 16, borderTop: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)", fontSize: 13, lineHeight: 1.6, color: "#6e7180" }}>Every Aggie home ticket in one place — football, basketball, soccer, volleyball and baseball, across all four campus venues.</p>

            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
              <a href="https://nmstatesports.com" target="_blank" rel="noopener noreferrer" aria-label="Visit website" style={{ width: 44, height: 44, borderRadius: 999, background: "#fff", border: "1px solid color-mix(in srgb, var(--paper) 14%, transparent)", color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
              </a>
              <button aria-label="Share" style={{ fontFamily: "inherit", width: 44, height: 44, borderRadius: 999, background: "#fff", border: "1px solid color-mix(in srgb, var(--paper) 14%, transparent)", color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
              </button>
            </div>
          </aside>
        )}

        {/* main */}
        <main style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {/* mobile identity strip */}
          {mobile && (
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 64, height: 64, borderRadius: 999, background: "#fff", border: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)", boxShadow: "0 8px 30px color-mix(in srgb, var(--paper) 10%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", padding: 9, boxSizing: "border-box", flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoSrc} alt={orgName} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: ACC }}>Athletics program</div>
                <h1 style={{ margin: 0, fontSize: 21, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.1 }}>{orgName}</h1>
              </div>
            </div>
          )}

          {/* tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#edeff7", borderRadius: 999, padding: 5, alignSelf: mobile ? "stretch" : "flex-start", width: mobile ? "100%" : "auto", boxSizing: "border-box" }}>
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{ fontFamily: "inherit", flex: mobile ? "1 1 0" : "0 0 auto", fontSize: mobile ? 11 : 14, fontWeight: 600, whiteSpace: "nowrap", border: "none", borderRadius: 999, padding: `11px ${mobile ? 6 : 20}px`, cursor: "pointer", background: t.key === tab ? ACC : "transparent", color: t.key === tab ? "#fff" : "#4a5567" }}>{t.label}</button>
            ))}
          </div>

          {/* EVENTS */}
          {tab === "events" && (
            <>
              {mobile && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto", margin: "0 -20px", padding: "0 20px" }}>
                  {sportFilters.map((f) => (
                    <button key={f.label} onClick={() => setSport(f.label)} style={{ fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", height: 34, borderRadius: 8, padding: "0 12px", cursor: "pointer", background: f.on ? "#fbecf1" : "#fff", color: f.on ? ACC : "#4a5567", border: `1px solid ${f.on ? ACC : "color-mix(in srgb, var(--paper) 12%, transparent)"}` }}>
                      {f.label}
                      <span style={{ fontSize: 11, fontWeight: 600, color: f.on ? "rgba(140,11,66,0.6)" : "#8a93a3", fontVariantNumeric: "tabular-nums" }}>{f.n}</span>
                    </button>
                  ))}
                </div>
              )}

              {groups.map((g) => (
                <div key={g.title} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 2px 8px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: ACC, whiteSpace: "nowrap" }}>{g.title}</div>
                    <div style={{ fontSize: 12, color: "#8a93a3", whiteSpace: "nowrap" }}>{g.meta}</div>
                    <div style={{ flex: 1, height: 1, background: "color-mix(in srgb, var(--paper) 10%, transparent)" }} />
                  </div>
                  {g.rows.map((e, i) => {
                    const soon = e.status === "Presale";
                    const tag = tagFor(e.status);
                    // Soccer/volleyball are GA; the rest route to the reserved-seat ticketing page.
                    const evHref = e.sport === "Soccer" || e.sport === "Volleyball" ? "/e/nm-state/KpIeUYbz" : "/e/nm-state/W50prW0I/tickets";
                    return (
                      <article key={`${e.title}-${i}`} className="cp-row" style={{ ...card, padding: mobile ? 14 : "16px 20px", display: "grid", gridTemplateColumns: rowCols, gap: mobile ? 14 : 20, alignItems: "center", cursor: "pointer" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, width: dateW, height: dateW, borderRadius: 14, background: "#f1f3f8", border: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)", flexShrink: 0 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6e7180" }}>{e.mon}</div>
                          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{e.day}</div>
                          <div style={{ fontSize: 10, color: "#8a93a3" }}>{e.dow}</div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 12, color: "#6e7180" }}>{e.sport} · {e.time}</span>
                            {e.status !== "On sale" && (
                              <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: tag.tagInk, background: tag.tagBg, borderRadius: 999, padding: "4px 9px" }}>{e.status}</span>
                            )}
                          </div>
                          <div style={{ fontSize: mobile ? 16 : 17, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.25 }}>{e.title}</div>
                          <div style={{ fontSize: 13, color: "#6e7180", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.venue}</div>
                        </div>
                        <div style={{ gridColumn: ctaSpan, display: "flex", alignItems: "center", gap: mobile ? 12 : 18, justifyContent: mobile || narrow ? "space-between" : "flex-end", paddingTop: mobile || narrow ? 12 : 0, borderTop: mobile || narrow ? "1px solid color-mix(in srgb, var(--paper) 8%, transparent)" : "none" }}>
                          <div style={{ display: "flex", gap: 5, flexDirection: mobile || narrow ? "row" : "column", alignItems: mobile || narrow ? "baseline" : "flex-end", whiteSpace: "nowrap" }}>
                            <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "#8a93a3" }}>From</span>
                            <span style={{ fontSize: 17, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.015em" }}>${e.p}</span>
                          </div>
                          {soon ? (
                            <button style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: NAVY, background: "#fff", border: "1px solid color-mix(in srgb, var(--paper) 14%, transparent)", borderRadius: 999, padding: "12px 22px", minHeight: 44, cursor: "pointer", whiteSpace: "nowrap" }}>Remind me</button>
                          ) : (
                            <a href={evHref} style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: "#fff", background: ACC, border: `1px solid ${ACC}`, borderRadius: 999, padding: "12px 22px", minHeight: 44, cursor: "pointer", whiteSpace: "nowrap", textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}>Get tickets</a>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ))}
            </>
          )}

          {/* PACKAGES */}
          {tab === "packages" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {PACKAGES.map((p) => (
                <article key={p.title} style={{ ...card, padding: mobile ? 14 : "16px 20px", display: "grid", gridTemplateColumns: mobile ? "1fr" : "minmax(0, 1fr) auto", gap: mobile ? 14 : 20, alignItems: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: ACC }}>{p.kicker}</div>
                    <div style={{ fontSize: mobile ? 16 : 17, fontWeight: 600, letterSpacing: "-0.015em" }}>{p.title}</div>
                    <div style={{ fontSize: 13, color: "#6e7180" }}>{p.range}</div>
                    <div style={{ fontSize: 13, color: "#4a5567" }}>{p.note}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: mobile ? 12 : 18, justifyContent: mobile ? "space-between" : "flex-end" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 1, alignItems: mobile ? "baseline" : "flex-end" }}>
                      <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "#8a93a3" }}>From</span>
                      <span style={{ fontSize: 17, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.015em" }}>{p.price}</span>
                    </div>
                    <a href="/season-tickets" style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: "#fff", background: ACC, border: `1px solid ${ACC}`, borderRadius: 999, padding: "12px 22px", cursor: "pointer", whiteSpace: "nowrap", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Select</a>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* FLEX */}
          {tab === "flex" && (
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : narrow ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))", gap: 14 }}>
              {FLEX.map((f) => (
                <a key={f.count} href="/flex-pack" style={{ ...card, borderRadius: 20, padding: 20, display: "flex", flexDirection: "column", gap: 14, textDecoration: "none", color: NAVY, cursor: "pointer" }}>
                  <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>{f.count} vouchers</div>
                  <div style={{ height: 1, background: "color-mix(in srgb, var(--paper) 8%, transparent)" }} />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ fontSize: 20, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>{f.price}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: ACC, background: "#fbecf1", borderRadius: 999, padding: "7px 14px", whiteSpace: "nowrap" }}>{f.each} each</span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
