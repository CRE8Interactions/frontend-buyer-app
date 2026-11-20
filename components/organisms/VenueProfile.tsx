"use client";

/**
 * VenueProfile — the venue page, ported from the Claude Design
 * "Venue Profile.dc.html". Navy header, sticky venue identity aside
 * (photo, name, location, description, follow/share), and a main column
 * of month-grouped upcoming event rows. Light theme, brand green CTAs.
 */

import { useEffect, useMemo, useState } from "react";

const NAVY = "var(--paper)";
const GREEN = "var(--green)";
const LOCKUP = "/nmstate/blocktickets-lockup-white.svg";

type Raw = { mon: string; day: string; dow: string; time: string; sport: string; title: string; host: string; p: number; status: string };

const RAW: Raw[] = [
  { mon: "Sep", day: "05", dow: "Sat", time: "7:00 PM", sport: "Football", title: "NM State vs. Mercyhurst", host: "New Mexico State Athletics", p: 22, status: "On sale" },
  { mon: "Sep", day: "26", dow: "Sat", time: "7:00 PM", sport: "Football", title: "NM State vs. New Mexico", host: "New Mexico State Athletics", p: 38, status: "Few left" },
  { mon: "Oct", day: "01", dow: "Thu", time: "7:00 PM", sport: "Football", title: "NM State vs. Western Kentucky", host: "New Mexico State Athletics", p: 24, status: "On sale" },
  { mon: "Oct", day: "17", dow: "Sat", time: "2:00 PM", sport: "Football", title: "NM State vs. Liberty", host: "New Mexico State Athletics", p: 28, status: "Presale" },
  { mon: "Nov", day: "07", dow: "Sat", time: "6:00 PM", sport: "Football", title: "NM State vs. Sam Houston", host: "New Mexico State Athletics", p: 26, status: "On sale" },
  { mon: "Nov", day: "21", dow: "Sat", time: "1:00 PM", sport: "Concert", title: "Aggie Fest — Live on the Field", host: "NMSU Student Activities", p: 35, status: "On sale" },
];

const MONTH_NAMES: Record<string, string> = { Sep: "September 2026", Oct: "October 2026", Nov: "November 2026" };
const MONTH_ORDER = ["Sep", "Oct", "Nov"];

/** Route to the real seated / GA event page (demo snapshots are keyed by shortcode). */
const hrefFor = (sport: string) =>
  sport === "Concert" ? `/e/nm-state/KpIeUYbz` : `/e/nm-state/W50prW0I/tickets`;

const tagFor = (st: string) =>
  st === "Few left" ? { tagBg: "#fbf1de", tagInk: "#b5791e" }
  : st === "Presale" ? { tagBg: "#f1f3f8", tagInk: "#4a5567" }
  : { tagBg: "#e6f4eb", tagInk: "#2f8f4e" };

export type VenueProfileProps = {
  venueName?: string;
  city?: string;
  capacity?: string;
  description?: string;
  photoSrc?: string;
};

export default function VenueProfile({
  venueName = "Aggie Memorial Stadium",
  city = "Las Cruces, NM",
  capacity = "30,343",
  description = "Outdoor football stadium on the campus of New Mexico State University, home of Aggie football since 1978.",
  photoSrc = "/cases/nmstate.jpg",
}: VenueProfileProps) {
  const [vw, setVw] = useState(1440);

  useEffect(() => {
    setVw(window.innerWidth);
    const onR = () => setVw(window.innerWidth);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  const mobile = vw < 900;
  const narrow = !mobile && vw < 1160;
  const stacked = mobile || narrow;

  const groups = useMemo(() => {
    const chrono = RAW.slice().sort(
      (a, b) => MONTH_ORDER.indexOf(a.mon) - MONTH_ORDER.indexOf(b.mon) || Number(a.day) - Number(b.day)
    );
    const keys: string[] = [];
    chrono.forEach((e) => { if (!keys.includes(e.mon)) keys.push(e.mon); });
    return keys.map((m) => ({
      title: MONTH_NAMES[m],
      rows: chrono.filter((e) => e.mon === m),
    }));
  }, []);

  const searchPill = (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 auto", maxWidth: 460, background: "rgba(255,255,255,0.10)", border: "1px solid rgba(158,182,216,0.22)", borderRadius: 999, padding: "10px 18px", color: "rgba(255,255,255,0.65)" }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17, flexShrink: 0 }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
      <span style={{ fontSize: 14, whiteSpace: "nowrap" }}>Search events, teams, venues</span>
    </div>
  );

  return (
    <div style={{ background: "#f7f8fc", color: NAVY, minHeight: "100vh", fontFamily: "'Geist', system-ui, -apple-system, sans-serif", WebkitFontSmoothing: "antialiased" }}>
      <style>{`.vp-row{transition:box-shadow 150ms ease,border-color 150ms ease}.vp-row:hover{box-shadow:0 8px 30px color-mix(in srgb, var(--paper) 9%, transparent);border-color:color-mix(in srgb, var(--paper) 20%, transparent)}`}</style>

      <header style={{ background: NAVY, position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1320, margin: "0 auto", padding: mobile ? "12px 20px" : "16px 32px", display: "flex", alignItems: "center", gap: 16 }}>
          <a href="/browse" aria-label="Back to browse" style={{ width: 40, height: 40, borderRadius: 999, background: "rgba(255,255,255,0.12)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, textDecoration: "none" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 19, height: 19 }}><polyline points="15 18 9 12 15 6" /></svg>
          </a>
          <a href="/browse" style={{ display: "flex", alignItems: "center", flexShrink: 0, textDecoration: "none" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOCKUP} alt="blocktickets" style={{ height: 19, width: "auto" }} />
          </a>
          {!mobile && searchPill}
          <a href="/wallet" style={{ fontFamily: "inherit", marginLeft: "auto", fontSize: 14, fontWeight: 600, color: NAVY, background: GREEN, border: "none", borderRadius: 999, padding: "11px 22px", cursor: "pointer", whiteSpace: "nowrap", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>My wallet</a>
        </div>
      </header>

      <div style={{ maxWidth: 1320, margin: "0 auto", padding: mobile ? "20px 20px 0" : "32px 32px 0", display: "grid", gridTemplateColumns: mobile ? "1fr" : narrow ? "300px minmax(0, 1fr)" : "344px minmax(0, 1fr)", gap: mobile ? 20 : 28, alignItems: "start" }}>

        {!mobile && (
          <aside style={{ background: "#fff", border: "1px solid color-mix(in srgb, var(--paper) 10%, transparent)", borderRadius: 24, boxShadow: "0 8px 30px color-mix(in srgb, var(--paper) 8%, transparent)", padding: 24, position: "sticky", top: 84, zIndex: 5, display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
              <div style={{ position: "relative", width: 116, height: 116, borderRadius: 24, overflow: "hidden", background: "#f1f3f8", border: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)", flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoSrc} alt={venueName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center", textAlign: "center", minWidth: 0 }}>
                <h1 style={{ margin: 0, fontSize: 32, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.08 }}>{venueName}</h1>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6e7180", whiteSpace: "nowrap" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13, flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                  {city}
                </div>
              </div>
            </div>

            <p style={{ margin: 0, paddingTop: 16, borderTop: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)", fontSize: 13, lineHeight: 1.6, color: "#6e7180" }}>{description}</p>

            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
              <button style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: NAVY, background: GREEN, border: "none", borderRadius: 999, padding: "13px 22px", cursor: "pointer", whiteSpace: "nowrap" }}>Follow venue</button>
              <button aria-label="Directions" style={{ fontFamily: "inherit", width: 44, height: 44, borderRadius: 999, background: "#fff", border: "1px solid color-mix(in srgb, var(--paper) 14%, transparent)", color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>
              </button>
              <button aria-label="Share" style={{ fontFamily: "inherit", width: 44, height: 44, borderRadius: 999, background: "#fff", border: "1px solid color-mix(in srgb, var(--paper) 14%, transparent)", color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
              </button>
            </div>
          </aside>
        )}

        <main style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          {mobile && (
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ position: "relative", width: 64, height: 64, borderRadius: 16, overflow: "hidden", background: "#f1f3f8", border: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)", flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoSrc} alt={venueName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                <h1 style={{ margin: 0, fontSize: 21, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.15 }}>{venueName}</h1>
                <div style={{ fontSize: 13, color: "#6e7180" }}>{city} · {capacity} capacity</div>
              </div>
            </div>
          )}

          <h2 style={{ margin: 0, fontSize: mobile ? 20 : 26, fontWeight: 600, letterSpacing: "-0.025em" }}>Upcoming events</h2>

          {groups.map((g) => (
            <div key={g.title} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 2px 8px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#7fbe4d", whiteSpace: "nowrap" }}>{g.title}</div>
                <div style={{ flex: 1, height: 1, background: "color-mix(in srgb, var(--paper) 10%, transparent)" }} />
              </div>
              {g.rows.map((e, i) => {
                const soon = e.status === "Presale";
                const tag = tagFor(e.status);
                const dateW = stacked ? 64 : 76;
                return (
                  <a key={`${e.title}-${i}`} href={hrefFor(e.sport)} className="vp-row" style={{ background: "#fff", border: "1px solid color-mix(in srgb, var(--paper) 10%, transparent)", borderRadius: 18, boxShadow: "0 1px 2px color-mix(in srgb, var(--paper) 5%, transparent)", padding: mobile ? 14 : "16px 20px", display: "grid", gridTemplateColumns: stacked ? "64px minmax(0, 1fr)" : "76px minmax(0, 1fr) auto", gap: mobile ? 14 : 20, alignItems: "center", cursor: "pointer", color: NAVY, textDecoration: "none" }}>
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
                      <div style={{ fontSize: 13, color: "#6e7180", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.host}</div>
                    </div>
                    <div style={{ gridColumn: stacked ? "1 / -1" : "auto", display: "flex", alignItems: "center", gap: 16, justifyContent: stacked ? "space-between" : "flex-end", paddingTop: stacked ? 12 : 0, borderTop: stacked ? "1px solid color-mix(in srgb, var(--paper) 8%, transparent)" : "none" }}>
                      <div style={{ display: "flex", gap: 5, flexDirection: stacked ? "row" : "column", alignItems: stacked ? "baseline" : "flex-end", whiteSpace: "nowrap" }}>
                        <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "#8a93a3" }}>From</span>
                        <span style={{ fontSize: 17, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.015em" }}>${e.p}</span>
                      </div>
                      <span style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: NAVY, background: soon ? "#fff" : GREEN, border: `1px solid ${soon ? "color-mix(in srgb, var(--paper) 14%, transparent)" : GREEN}`, borderRadius: 999, padding: "12px 22px", minHeight: 44, display: "inline-flex", alignItems: "center", cursor: "pointer", whiteSpace: "nowrap" }}>{soon ? "Remind me" : "Get tickets"}</span>
                    </div>
                  </a>
                );
              })}
            </div>
          ))}

          <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 32px" }}>
            <button style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: NAVY, background: "#fff", border: "1px solid color-mix(in srgb, var(--paper) 14%, transparent)", borderRadius: 999, padding: "13px 28px", cursor: "pointer" }}>See full schedule</button>
          </div>
        </main>
      </div>
    </div>
  );
}
