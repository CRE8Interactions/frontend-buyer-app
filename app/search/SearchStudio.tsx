"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Buildings, MagnifyingGlass, Users, X } from "@phosphor-icons/react";
import { ThinkingOrb } from "thinking-orbs";
import { Kbd } from "@/components/ui/kbd";
import { SUGGESTIONS, complete, didYouMean, loadLiveIndex, priceFor, searchHits, type Hit, type HitKind } from "../concept/search-index";

const KINDS: { v: "All" | HitKind; label: string }[] = [{ v: "All", label: "Everything" }, { v: "Event", label: "Events" }, { v: "Team", label: "Teams" }, { v: "Venue", label: "Venues" }];
const WHEN = ["today", "tomorrow", "this weekend", "next week"];
const PAGE = 30;
/* the site's own light/dark choice: the data-nt attribute when the visitor has set one, otherwise the system's; the orb is told it explicitly because it cannot see data-nt */
function useSiteDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const read = () => { const nt = document.documentElement.dataset.nt; setDark(nt ? nt === "dark" : mq.matches); };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-nt"] });
    mq.addEventListener("change", read);
    return () => { mo.disconnect(); mq.removeEventListener("change", read); };
  }, []);
  return dark;
}

/* The lowest price is not in the live events, so a strip asks for it when it scrolls into view. */
function useLazyPrice(hit: Hit) {
  const ref = useRef<HTMLElement>(null);
  const [asked, setAsked] = useState<number>();
  useEffect(() => {
    if (hit.price || !ref.current) return;
    let live = true;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); priceFor(hit).then((p) => { if (live) setAsked(p); }); } }, { rootMargin: "240px" });
    io.observe(ref.current);
    return () => { live = false; io.disconnect(); };
  }, [hit]);
  return { ref, price: hit.price || asked };
}

function Strip({ hit }: { hit: Hit }) {
  const { ref, price } = useLazyPrice(hit);
  const dow = hit.meta.split(",")[0];
  const soon = hit.status === "Presale";
  return (
    <li>
      <article ref={ref} className="sr-st" style={{ ["--ac" as string]: hit.accent ?? "var(--green)" }}>
        <span className="sr-st-d" aria-hidden><i>{dow}</i><b>{hit.day}</b></span>
        <span className="sr-st-pic" aria-hidden>
          {hit.art
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={hit.art} alt="" decoding="async" />
            : <em>{(hit.tag ?? "").slice(0, 2)}</em>}
        </span>
        <div className="sr-st-m">
          <p className="sr-st-e">{hit.tag}<i aria-hidden />{soon ? "Presale" : hit.status === "Resale only" ? "Resale only" : "On sale"}</p>
          <h3><a href={hit.href}>{hit.title}</a></h3>
          <p className="sr-st-v">{hit.time} · {hit.venue}</p>
        </div>
        <span className="sr-st-s">
          {price ? <span className="sr-st-pr"><small>From</small><b>${price}</b></span> : <span />}
          <span className="sr-st-go" aria-hidden>{soon ? "Remind me" : "Get tickets"}<ArrowRight weight="bold" /></span>
        </span>
      </article>
    </li>
  );
}

function Mark({ text, q }: { text: string; q: string }) {
  const words = q.trim().split(/\s+/).filter((w) => w.length > 1).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!words.length) return <>{text}</>;
  return <>{text.split(new RegExp(`(${words.join("|")})`, "ig")).map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : p))}</>;
}

/* one choice in a filter row: a pill, filled solid when it is the chosen one */
function Opt({ on, onClick, children, n }: { on: boolean; onClick: () => void; children: React.ReactNode; n?: number }) {
  return (
    <button type="button" className="sr-opt" data-on={on ? "1" : "0"} aria-pressed={on} onClick={onClick}>
      <span>{children}</span>{n != null && <span className="sr-opt-n" aria-hidden>{n}</span>}
    </button>
  );
}

export default function SearchStudio({ initial }: { initial: string }) {
  const [q, setQ] = useState(initial);
  const [kind, setKind] = useState<"All" | HitKind>("All");
  const [sport, setSport] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [ver, setVer] = useState(0);
  const [ready, setReady] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const dark = useSiteDark();

  useEffect(() => { loadLiveIndex().then((ok) => { if (ok) setVer((v) => v + 1); }).finally(() => setReady(true)); }, []);

  /* the address follows what is typed, so the page can be shared at any moment */
  useEffect(() => {
    const t = setTimeout(() => {
      const url = q.trim() ? `/search/?query=${encodeURIComponent(q.trim())}` : "/search/";
      if (location.pathname + location.search !== url) window.history.replaceState(null, "", url);
      document.title = q.trim() ? `“${q.trim()}” — Search — Blocktickets` : "Search — Blocktickets";
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const typed = q.trim().length > 0;
  const base = useMemo(() => searchHits(q, "", 500), [q, ver]); // eslint-disable-line react-hooks/exhaustive-deps
  const groups = useMemo(() => searchHits(q, sport, typed ? 500 : 30), [q, sport, typed, ver]); // eslint-disable-line react-hooks/exhaustive-deps
  const sports = useMemo(() => {
    const c = new Map<string, number>();
    base.events.forEach((e) => e.tag && c.set(e.tag, (c.get(e.tag) ?? 0) + 1));
    return [...c].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n);
  }, [base]);
  useEffect(() => { if (sport && !sports.some((s) => s.name === sport)) setSport(""); }, [sports, sport]);
  useEffect(() => setShown(PAGE), [q, sport, kind]);

  const teams = kind === "All" || kind === "Team" ? groups.teams : [];
  const venues = kind === "All" || kind === "Venue" ? groups.venues : [];
  const events = kind === "All" || kind === "Event" ? groups.events : [];
  const total = groups.teams.length + groups.venues.length + groups.events.length;
  const count = (v: "All" | HitKind) => (v === "All" ? total : v === "Team" ? groups.teams.length : v === "Venue" ? groups.venues.length : groups.events.length);
  const none = typed && teams.length + venues.length + events.length === 0;
  const loading = !ready && !total;

  const ghost = useMemo(() => (typed ? complete(q) : ""), [typed, q, ver]); // eslint-disable-line react-hooks/exhaustive-deps
  const dym = useMemo(() => (none ? didYouMean(q) : ""), [none, q, ver]); // eslint-disable-line react-hooks/exhaustive-deps
  const onKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const end = e.currentTarget.selectionStart === q.length && e.currentTarget.selectionEnd === q.length;
    if (ghost && end && ((e.key === "Tab" && !e.shiftKey) || e.key === "ArrowRight")) { e.preventDefault(); setQ(ghost); }
  };

  /* a "when" choice is just its date word in the query: choosing one swaps the old one out */
  const when = WHEN.find((w) => q.toLowerCase().includes(w)) ?? "";
  const pickWhen = (w: string) => setQ((cur) => {
    const cleared = WHEN.reduce((s, x) => s.replace(new RegExp(x, "i"), ""), cur).replace(/\s+/g, " ").trim();
    return `${cleared} ${w}`.trim();
  });
  const filtered = kind !== "All" || sport !== "" || when !== "";
  const clearFilters = () => { setKind("All"); setSport(""); if (when) pickWhen(""); };
  const showSport = sports.length > 1 && (kind === "All" || kind === "Event");

  /* why nothing showed: the Show/Sport filters hiding matches, a date word leaving none, or genuinely nothing */
  const baseTotal = base.teams.length + base.venues.length + base.events.length;
  const hiddenByFilters = none && (kind !== "All" || sport !== "") && baseTotal > 0;
  const noWhenQ = WHEN.reduce((t, x) => t.replace(new RegExp(x, "i"), ""), q).replace(/\s+/g, " ").trim();
  const relaxed = useMemo(() => (none && when ? searchHits(noWhenQ, "", 500) : null), [none, when, noWhenQ, ver]); // eslint-disable-line react-hooks/exhaustive-deps
  const relaxedN = relaxed ? relaxed.teams.length + relaxed.venues.length + relaxed.events.length : 0;
  const popular = useMemo(() => searchHits("", "", 0).teams.slice(0, 4), [ver]); // eslint-disable-line react-hooks/exhaustive-deps

  /* events fall under their month, in date order */
  const months = useMemo(() => {
    const out: { key: number; label: string; items: Hit[] }[] = [];
    events.slice(0, shown).forEach((h) => {
      const key = h.ymd ? Math.floor(h.ymd / 100) : 0;
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(h); else out.push({ key, label: h.mon ?? "", items: [h] });
    });
    return out;
  }, [events, shown]);

  const spot = (e: React.PointerEvent<HTMLElement>) => {
    const st = (e.target as HTMLElement).closest<HTMLElement>(".sr-st");
    if (!st) return;
    const r = st.getBoundingClientRect();
    st.style.setProperty("--px", `${e.clientX - r.left}px`); st.style.setProperty("--py", `${e.clientY - r.top}px`);
  };

  const parts = [
    groups.events.length ? `${groups.events.length} ${groups.events.length === 1 ? "event" : "events"}` : "",
    groups.teams.length ? `${groups.teams.length} ${groups.teams.length === 1 ? "team" : "teams"}` : "",
    groups.venues.length ? `${groups.venues.length} ${groups.venues.length === 1 ? "venue" : "venues"}` : "",
  ].filter(Boolean);

  return (
    <div className="n-wrap sr-page">
      <header className="sr-head" data-empty={none ? "1" : "0"}>
        {/* nothing found: the "working" orb on its own (particles on tilted orbits; stock grayscale), drawn larger in CSS. Decorative, so hidden from assistive tech; the headline carries the meaning. */}
        {none && <div className="sro" aria-hidden><ThinkingOrb state="working" size={64} speed={0.5} theme={dark ? "dark" : "light"} /></div>}
        <h1>{!typed ? "Find your next game" : none ? <>No results for <span>“{q.trim()}”</span></> : <>Results for <span>“{q.trim()}”</span></>}</h1>
        <p className="sr-sub" role="status" aria-live="polite">
          {loading ? <span className="sr-busy"><ThinkingOrb state="searching" size={20} theme={dark ? "dark" : "light"} />Searching…</span> : !typed ? "Everything on sale, soonest first." : none ? "Nothing matched that search." : <><b>{total}</b> {total === 1 ? "result" : "results"}{parts.length > 1 ? <> · {parts.join(" · ")}</> : null}</>}
          {ghost ? <span className="tm-sr">. Suggestion: {ghost}. Press Tab to accept.</span> : null}
        </p>
      </header>

      <form className="sr-top" role="search" onSubmit={(e) => e.preventDefault()}>
        <MagnifyingGlass weight="bold" aria-hidden />
        <span className="sr-field">
          <span className="sr-ghost" aria-hidden><i>{q}</i>{ghost ? ghost.slice(q.length) : ""}</span>
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeys} type="search" name="query" autoComplete="off" autoCorrect="off" spellCheck={false} placeholder="Search events, teams, venues" aria-label="Search events, teams and venues" aria-autocomplete="both" autoFocus={!initial} />
        </span>
        {ghost && <span className="sr-accept" aria-hidden><Kbd keys={["Tab"]} /></span>}
        {typed && <button type="button" className="sr-clear" onClick={() => { setQ(""); input.current?.focus(); }} aria-label="Clear search"><X weight="bold" aria-hidden /></button>}
      </form>

      {/* filters: labelled rows in two aligned columns (what it narrows, then the choices); the chosen pill is brand green. Not shown when there is nothing to narrow. */}
      {!none && (
        <div className="sr-filters" role="group" aria-label="Filters">
          <div className="sr-row" role="group" aria-label="Show">
            <span className="sr-gl">Show</span>
            <div className="sr-opts">
              {KINDS.filter((k) => k.v === "All" || count(k.v) > 0 || kind === k.v).map((k) => <Opt key={k.v} on={kind === k.v} n={count(k.v)} onClick={() => setKind(k.v)}>{k.label}</Opt>)}
            </div>
          </div>
          {showSport && (
            <div className="sr-row" role="group" aria-label="Narrow events by sport">
              <span className="sr-gl">Sport</span>
              <div className="sr-opts">
                <Opt on={sport === ""} onClick={() => setSport("")}>Any sport</Opt>
                {sports.map((s) => <Opt key={s.name} on={sport === s.name} n={s.n} onClick={() => setSport(s.name)}>{s.name}</Opt>)}
              </div>
            </div>
          )}
          <div className="sr-row" role="group" aria-label="When">
            <span className="sr-gl">When</span>
            <div className="sr-opts">
              <Opt on={when === ""} onClick={() => pickWhen("")}>Any time</Opt>
              {WHEN.map((w) => <Opt key={w} on={when === w} onClick={() => pickWhen(w)}>{w[0].toUpperCase() + w.slice(1)}</Opt>)}
            </div>
          </div>
        </div>
      )}
      {!none && filtered && <div className="sr-clearrow"><button type="button" className="sr-reset" onClick={clearFilters}>Clear filters</button></div>}

      <div className="sr-res">
        {loading && <ul className="sr-list" aria-hidden>{Array.from({ length: 6 }, (_, i) => <li key={i}><div className="sr-skel" /></li>)}</ul>}

        {none && (
          <section className="sr-none" aria-label="No results">
            <div className="sr-none-t">
              <p>
                {hiddenByFilters ? `The search found ${baseTotal} ${baseTotal === 1 ? "match" : "matches"}, but the Show or Sport choice leaves none of them in view.`
                  : when && relaxedN > 0 ? `There ${relaxedN === 1 ? "is 1 match" : `are ${relaxedN} matches`} on other dates.`
                  : "We could not find an event, team or venue by that name. Check the spelling, or try something broader."}
              </p>
              <div className="sr-acts">
                {hiddenByFilters && <button type="button" className="sr-dym" onClick={clearFilters}>Clear filters</button>}
                {!hiddenByFilters && when && relaxedN > 0 && <button type="button" className="sr-dym" onClick={() => pickWhen("")}>Show any date ({relaxedN})</button>}
                {!hiddenByFilters && !(when && relaxedN > 0) && dym && <button type="button" className="sr-dym" onClick={() => setQ(dym)}>Did you mean <b>{dym}</b>?</button>}
                <a className="sr-ghostbtn" href="/browse">Browse all events<ArrowRight weight="bold" aria-hidden /></a>
              </div>
              {!hiddenByFilters && (
                <div className="sr-sugg">
                  <span className="sr-gl">Try</span>
                  <div className="sr-opts">
                    {SUGGESTIONS.map((x) => <button key={x} type="button" className="sr-opt" data-on="0" onClick={() => setQ(x)}>{x}</button>)}
                  </div>
                </div>
              )}
              {!hiddenByFilters && popular.length > 0 && (
                <div className="sr-sugg">
                  <span className="sr-gl">Teams</span>
                  <div className="sr-opts">
                    {popular.map((t) => <a key={t.id} className="sr-opt" data-on="0" href={t.href}>{t.title}</a>)}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {teams.length + venues.length > 0 && (
          <section className="sr-orgs" aria-label="Teams and venues">
            <ul>
              {[...teams, ...venues].map((h) => (
                <li key={h.id}>
                  <a className="sr-org" href={h.href}>
                    <span className="sr-org-ic">{/* eslint-disable-next-line @next/next/no-img-element */}{h.logo ? <img src={h.logo} alt="" /> : h.kind === "Team" ? <Users weight="bold" aria-hidden /> : <Buildings weight="bold" aria-hidden />}</span>
                    <span className="sr-org-t"><strong><Mark text={h.title} q={q} /></strong><small>{h.kind} · {h.count} events</small></span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {months.map((m) => (
          <section key={m.key} className="sr-mo" aria-label={m.label}>
            <h2><span>{m.label}</span><small>{m.items.length} {m.items.length === 1 ? "event" : "events"}</small></h2>
            <ul className="sr-list" onPointerMove={spot}>{m.items.map((h) => <Strip key={h.id} hit={h} />)}</ul>
          </section>
        ))}
        {events.length > shown && <div className="sr-more"><button type="button" className="sr-morebtn" onClick={() => setShown((n) => n + PAGE)}>Show {Math.min(PAGE, events.length - shown)} more</button></div>}
      </div>
    </div>
  );
}
