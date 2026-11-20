"use client";

/**
 * BrowseHome — the browse / discovery page, ported from the Claude Design
 * "Blocktickets Home.dc.html". Navy header, featured hero carousel,
 * Teams & venues rail, Events grid, navy footer. Light theme, brand green CTAs.
 */

import { useEffect, useMemo, useState } from "react";
import Nav, { type SearchGroup } from "@/components/organisms/Nav";
import SiteFooter from "@/components/organisms/SiteFooter";

const NAVY = "var(--paper)";
const GREEN = "var(--green)";
const NMLOGO = "/nmstate/nmstate-logo-nowordmark.png";

type Kind = "seated" | "ga";
type Ev = { when: string; title: string; venue: string; city: string; p: number; status: string; kind: Kind; slug: string; href?: string };

const ALL: Ev[] = [
  { when: "Fri Oct 9 · 8:00 PM", title: "Generic Event", venue: "The Fillmore Denver", city: "Denver, CO", p: 13, status: "On sale", kind: "seated", slug: "concert", href: "/concert" },
  { when: "Sat Oct 10 · 8:00 PM", title: "Generic GA Event", venue: "The Fillmore Denver", city: "Denver, CO", p: 10, status: "On sale", kind: "ga", slug: "concert", href: "/concert?type=ga" },
  { when: "Fri Aug 14 · 6:30 PM", title: "Ogden Raptors vs. Long Beach Coast", venue: "Lindquist Field", city: "Ogden, UT", p: 18, status: "On sale", kind: "seated", slug: "ogden-raptors" },
  { when: "Sat Aug 29 · 6:00 PM", title: "NM State Aggies vs. UTEP Miners", venue: "Aggie Memorial Stadium", city: "Las Cruces, NM", p: 28, status: "Few left", kind: "seated", slug: "nm-state" },
  { when: "Thu Sep 3 · 7:00 PM", title: "NM State Soccer vs. Grand Canyon", venue: "NMSU Soccer Field", city: "Las Cruces, NM", p: 12, status: "On sale", kind: "ga", slug: "nm-state" },
  { when: "Sat Sep 5 · 7:00 PM", title: "Niagara IceDogs vs. Barrie Colts", venue: "Meridian Centre", city: "St. Catharines, ON", p: 24, status: "On sale", kind: "seated", slug: "niagara-icedogs" },
  { when: "Sun Sep 13 · 8:00 PM", title: "Desert Sessions — Live at the Pan Am", venue: "Pan American Center", city: "Las Cruces, NM", p: 45, status: "Resale only", kind: "ga", slug: "nm-state" },
  { when: "Fri Sep 18 · 9:00 PM", title: "Late Set: Southwest Comedy Showcase", venue: "Rio Grande Theatre", city: "Las Cruces, NM", p: 22, status: "On sale", kind: "ga", slug: "nm-state" },
  { when: "Sat Oct 3 · 2:00 PM", title: "NM State Aggies vs. Liberty Flames", venue: "Aggie Memorial Stadium", city: "Las Cruces, NM", p: 32, status: "Presale", kind: "seated", slug: "nm-state" },
  { when: "Sun Oct 11 · 5:00 PM", title: "NM State Volleyball vs. Tarleton State", venue: "Pan American Center", city: "Las Cruces, NM", p: 10, status: "On sale", kind: "ga", slug: "nm-state" },
];

const FEATURED = [
  { tag: "Football", title: "Aggies vs. UTEP — Battle of I-10", when: "Sat Aug 29 · 6:00 PM", venue: "Aggie Memorial Stadium, Las Cruces", price: "$28", note: "Student tickets from $9", img: "/cases/nmstate.jpg", kind: "seated" as Kind, slug: "nm-state" },
  { tag: "Music", title: "Desert Sessions at the Pan Am", when: "Sun Sep 13 · 8:00 PM", venue: "Pan American Center, Las Cruces", price: "$45", note: "Resale open · verified tickets", img: "", kind: "ga" as Kind, slug: "nm-state" },
  { tag: "Hockey", title: "IceDogs home opener vs. Barrie", when: "Sat Sep 5 · 7:00 PM", venue: "Meridian Centre, St. Catharines", price: "$24", note: "Season packs available", img: "/cases/icedogs.jpg", kind: "seated" as Kind, slug: "niagara-icedogs" },
];

/** Route to the real seated / GA event page (demo snapshots are keyed by shortcode). */
const hrefFor = (kind: Kind, slug: string) =>
  kind === "seated" ? `/e/${slug}/W50prW0I/tickets` : `/e/${slug}/KpIeUYbz`;

const VENUES = [
  { name: "NM State Athletics", count: 38, isTeam: true },
  { name: "Aggie Memorial Stadium", count: 7 },
  { name: "Pan American Center", count: 14 },
  { name: "NMSU Soccer Field", count: 9 },
  { name: "Meridian Centre", count: 12 },
  { name: "Lindquist Field", count: 6 },
  { name: "Rio Grande Theatre", count: 5 },
  { name: "Presley Askew Field", count: 8 },
];

/** Teams & venues surfaced in the nav search autocomplete. */
const SEARCH_TEAMS = [
  { name: "NM State Aggies", sub: "Las Cruces, NM · 38 upcoming events", href: "/nm-state" },
  { name: "Ogden Raptors", sub: "Ogden, UT · 21 upcoming events", href: "/browse" },
  { name: "Niagara IceDogs", sub: "St. Catharines, ON · 17 upcoming events", href: "/browse" },
];
const SEARCH_VENUES = [
  { name: "Aggie Memorial Stadium", sub: "Las Cruces, NM", href: "/browse" },
  { name: "Pan American Center", sub: "Las Cruces, NM", href: "/browse" },
  { name: "Meridian Centre", sub: "St. Catharines, ON", href: "/browse" },
  { name: "Rio Grande Theatre", sub: "Las Cruces, NM", href: "/browse" },
  { name: "Lindquist Field", sub: "Ogden, UT", href: "/browse" },
];
const RECENT_SEARCHES = ["NM State Aggies", "Pan American Center", "IceDogs"];
const initials2 = (t: string) =>
  t.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

const GRADIENT = "linear-gradient(135deg, #0a2747 0%, var(--paper) 60%, #071a30 100%)";

function imageFor(text: string): string | null {
  const t = text.toLowerCase();
  if (t.includes("raptor") || t.includes("long beach")) return "/cases/raptors.jpg";
  if (t.includes("nm state") || t.includes("aggie")) return "/cases/nmstate.jpg";
  if (t.includes("icedogs") || t.includes("niagara")) return "/cases/icedogs.jpg";
  if (t.includes("buccaneer")) return "/cases/buccaneers.jpg";
  return null;
}

const monogram = (name: string) =>
  name.split(" ").filter((w) => w[0] && /[A-Za-z]/.test(w[0])).slice(0, 3).map((w) => w[0].toUpperCase()).join("");

const tagFor = (st: string) =>
  st === "Few left" ? { tagBg: "#fbf1de", tagInk: "#b5791e" }
  : st === "Resale only" ? { tagBg: "rgba(255,255,255,0.92)", tagInk: "#6e7180" }
  : st === "Presale" ? { tagBg: "rgba(255,255,255,0.92)", tagInk: "#4a5567" }
  : { tagBg: "#e6f4eb", tagInk: "#2f8f4e" };

export default function BrowseHome() {
  const [query, setQuery] = useState("");
  const [feat, setFeat] = useState(0);
  const [vw, setVw] = useState(1440);

  useEffect(() => {
    setVw(window.innerWidth);
    const onR = () => setVw(window.innerWidth);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  const mobile = vw < 900;
  const narrow = !mobile && vw < 1160;

  const events = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL.filter((e) => !q || `${e.title} ${e.venue} ${e.city}`.toLowerCase().includes(q));
  }, [query]);

  // Grouped autocomplete results for the nav search (design "Browse Page.dc.html").
  const searchGroups = useMemo<SearchGroup[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [
        {
          title: "Recent searches",
          items: RECENT_SEARCHES.map((r) => ({
            title: r, sub: "Search again", meta: "",
            initials: initials2(r), iconBg: "#f1f3f8", iconInk: "#6e7180", href: "/browse",
          })),
        },
      ];
    }
    const match = (s: string) => s.toLowerCase().includes(q);
    const evHits = ALL.filter((e) => match(`${e.title} ${e.venue} ${e.city}`)).slice(0, 4).map((e) => ({
      title: e.title, sub: `${e.when} · ${e.venue}`, meta: `from $${e.p}`,
      initials: initials2(e.title), iconBg: "#eef1f6", iconInk: NAVY, href: e.href || hrefFor(e.kind, e.slug),
    }));
    const tmHits = SEARCH_TEAMS.filter((t) => match(`${t.name} ${t.sub}`)).slice(0, 3).map((t) => ({
      title: t.name, sub: t.sub, meta: "Team",
      initials: initials2(t.name), iconBg: GREEN, iconInk: NAVY, href: t.href,
    }));
    const vnHits = SEARCH_VENUES.filter((v) => match(`${v.name} ${v.sub}`)).slice(0, 3).map((v) => ({
      title: v.name, sub: v.sub, meta: "Venue",
      initials: initials2(v.name), iconBg: NAVY, iconInk: GREEN, href: v.href,
    }));
    const groups: SearchGroup[] = [];
    if (evHits.length) groups.push({ title: "Events", items: evHits });
    if (tmHits.length) groups.push({ title: "Teams", items: tmHits });
    if (vnHits.length) groups.push({ title: "Venues", items: vnHits });
    return groups;
  }, [query]);

  const hero = FEATURED[feat % FEATURED.length];
  const cardCols = mobile ? "1fr" : narrow ? "repeat(3, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))";
  const h2 = mobile ? 22 : 28;
  const avSize = mobile ? 92 : 116;

  return (
    <div style={{ background: "#f7f8fc", color: NAVY, minHeight: "100vh", overflowX: "hidden", fontFamily: "'Geist', system-ui, -apple-system, sans-serif", WebkitFontSmoothing: "antialiased" }}>
      <style>{`.bh-ev,.bh-av{transition:box-shadow 160ms ease,transform 160ms ease}.bh-ev:hover{box-shadow:0 8px 30px color-mix(in srgb, var(--paper) 10%, transparent);transform:translateY(-2px);border-color:color-mix(in srgb, var(--paper) 22%, transparent)}.bh-av:hover{box-shadow:0 12px 28px -8px color-mix(in srgb, var(--paper) 30%, transparent);transform:scale(1.04)}`}</style>

      <Nav search={{ value: query, onChange: setQuery, groups: searchGroups, seeAllHref: "/browse" }} />

      {/* hero */}
      <section style={{ maxWidth: 1320, margin: "0 auto", padding: mobile ? "16px 20px 0" : "28px 32px 0" }}>
        <div style={{ position: "relative", width: "100%", height: mobile ? 400 : narrow ? 380 : 440, borderRadius: mobile ? 20 : 28, overflow: "hidden", background: NAVY }}>
          <div style={{ position: "absolute", inset: 0, background: hero.img ? undefined : GRADIENT }}>
            {hero.img && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hero.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
          </div>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(3,16,31,0.94) 0%, rgba(3,16,31,0.72) 46%, rgba(3,16,31,0.15) 100%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: mobile ? 14 : 18, padding: mobile ? 24 : 44, color: "#f4f7fc", pointerEvents: "none" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, alignSelf: "flex-start", background: "rgba(166,231,115,0.14)", border: "1px solid rgba(166,231,115,0.4)", color: GREEN, borderRadius: 999, padding: "6px 13px", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: GREEN }} />
              Featured · {hero.tag}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 640 }}>
              <div style={{ fontSize: mobile ? 32 : narrow ? 40 : 50, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.03 }}>{hero.title}</div>
              <div style={{ fontSize: mobile ? 14 : 16, color: "#cdd9ea" }}>{hero.when} · {hero.venue}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", pointerEvents: "auto" }}>
              <a href={hrefFor(hero.kind, hero.slug)} style={{ fontFamily: "inherit", fontSize: 15, fontWeight: 600, color: NAVY, background: GREEN, border: "none", borderRadius: 999, padding: "14px 26px", cursor: "pointer", textDecoration: "none" }}>Get tickets · from {hero.price}</a>
              <span style={{ fontSize: 13, color: "#b8c6dc" }}>{hero.note}</span>
            </div>
          </div>
          <div style={{ position: "absolute", bottom: mobile ? 24 : 44, right: mobile ? 24 : 44, display: "flex", alignItems: "center", gap: 7 }}>
            {FEATURED.map((_, i) => (
              <button key={i} onClick={() => setFeat(i)} aria-label="Featured event" style={{ fontFamily: "inherit", width: i === feat ? 22 : 7, height: 7, borderRadius: 999, border: "none", padding: 0, cursor: "pointer", background: i === feat ? GREEN : "rgba(255,255,255,0.45)", transition: "width 160ms ease" }} />
            ))}
          </div>
        </div>
      </section>

      {/* teams & venues */}
      <section style={{ maxWidth: 1320, margin: "0 auto", padding: mobile ? "24px 20px 0" : "40px 32px 0" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: h2, fontWeight: 600, letterSpacing: "-0.025em" }}>Teams &amp; venues</h2>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#7fbe4d", cursor: "pointer" }}>See all</span>
        </div>
        <div style={{ display: "flex", gap: mobile ? 14 : 20, overflowX: "auto", padding: "8px 0 12px" }}>
          {VENUES.map((v) => (
            <a key={v.name} href={v.isTeam ? "/nm-state" : "/venue/aggie-memorial-stadium"} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: mobile ? 104 : 132, flex: "0 0 auto", cursor: "pointer", color: NAVY, textDecoration: "none" }}>
              {v.isTeam ? (
                <div className="bh-av" style={{ width: avSize, height: avSize, borderRadius: 999, overflow: "hidden", background: "#fff", boxShadow: "0 1px 2px color-mix(in srgb, var(--paper) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", padding: 14, boxSizing: "border-box" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={NMLOGO} alt={v.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                </div>
              ) : (
                <div className="bh-av" style={{ width: avSize, height: avSize, borderRadius: 999, overflow: "hidden", background: GRADIENT, boxShadow: "0 1px 2px color-mix(in srgb, var(--paper) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.92)", fontSize: avSize * 0.24, fontWeight: 600, letterSpacing: "0.02em" }}>
                  {monogram(v.name)}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, textAlign: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{v.name}</div>
                <div style={{ fontSize: 12, color: "#6e7180" }}>{v.count} events</div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* events */}
      <section style={{ maxWidth: 1320, margin: "0 auto", padding: mobile ? "32px 20px 0" : "48px 32px 0" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: h2, fontWeight: 600, letterSpacing: "-0.025em" }}>Events</h2>
          <span style={{ fontSize: 13, color: "#6e7180" }}>{events.length} {events.length === 1 ? "event" : "events"} near Las Cruces, NM</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: cardCols, gap: 16 }}>
          {events.map((e, i) => {
            const soon = e.status === "Presale";
            const tag = tagFor(e.status);
            const img = imageFor(e.title);
            return (
              <a key={`${e.title}-${i}`} href={e.href || hrefFor(e.kind, e.slug)} className="bh-ev" style={{ background: "#fff", border: "1px solid color-mix(in srgb, var(--paper) 10%, transparent)", borderRadius: 20, overflow: "hidden", boxShadow: "0 1px 2px color-mix(in srgb, var(--paper) 5%, transparent)", display: "flex", flexDirection: "column", cursor: "pointer", color: NAVY, textDecoration: "none" }}>
                <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 3", background: img ? "#f1f3f8" : GRADIENT }}>
                  {img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                  <div style={{ position: "absolute", top: 12, left: 12, fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: tag.tagInk, background: tag.tagBg, borderRadius: 999, padding: "5px 10px" }}>{e.status}</div>
                </div>
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#7fbe4d" }}>{e.when}</div>
                    <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.25 }}>{e.title}</div>
                    <div style={{ fontSize: 13, color: "#6e7180", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.venue} · {e.city}</div>
                  </div>
                  <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 12, borderTop: "1px solid color-mix(in srgb, var(--paper) 8%, transparent)" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "#8a93a3" }}>From</span>
                      <span style={{ fontSize: 16, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.015em" }}>${e.p}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: NAVY, background: soon ? "#fff" : "#ecf8dd", border: `1px solid ${soon ? "color-mix(in srgb, var(--paper) 14%, transparent)" : "#ecf8dd"}`, borderRadius: 999, padding: "10px 18px", whiteSpace: "nowrap" }}>{soon ? "Remind me" : "Get tickets"}</span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        {events.length === 0 && (
          <div style={{ background: "#fff", border: "1px dashed color-mix(in srgb, var(--paper) 18%, transparent)", borderRadius: 20, padding: "44px 24px", textAlign: "center", display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" }}>No events match “{query}”</div>
            <div style={{ fontSize: 14, color: "#6e7180" }}>Try a team, venue or city name.</div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "center", padding: "24px 0 8px" }}>
          <button style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: NAVY, background: "#fff", border: "1px solid color-mix(in srgb, var(--paper) 14%, transparent)", borderRadius: 999, padding: "13px 28px", cursor: "pointer" }}>Load more events</button>
        </div>
      </section>

      <div style={{ marginTop: 32 }}>
        <SiteFooter />
      </div>
    </div>
  );
}
