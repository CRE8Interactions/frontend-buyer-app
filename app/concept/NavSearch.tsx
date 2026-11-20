"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { ArrowRight, Bell, Buildings, CalendarBlank, MagnifyingGlass, Users, X } from "@phosphor-icons/react";
import Button from "@/components/atoms/Button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SUGGESTIONS, complete, didYouMean, loadLiveIndex, moreAt, priceFor, searchHits, type Hit, type HitKind } from "./search-index";

/* The top bar for ticket buyers, and the search inside it.
   At rest the bar is a small floating pill: the logo, a search trigger, the light/dark switch and Log in. Opening the search grows that same pill into a command palette
   (one shared layout animation, a spring), and Esc folds it back. In the palette the results narrow on every keystroke, arrow keys walk them with one highlight that slides
   between rows, and the right-hand "quick look" shows what the highlighted row is, with what you would do next: buy, be reminded, see what else is on there, open the team or
   venue page. Opening is by click, ⌘K or "/", closing by Esc or a click outside. */

/* overdamped on purpose (damping above 2 x sqrt(stiffness x mass)): the shell settles without overshooting */
const SPRING = { type: "spring" as const, stiffness: 420, damping: 44, mass: 0.9 };
/* how long the shell takes to travel back into the pill (the spring settles inside this) */
const HOLD = 0.42;
const KINDS: { v: "All" | HitKind; label: string }[] = [{ v: "All", label: "All" }, { v: "Team", label: "Teams" }, { v: "Venue", label: "Venues" }, { v: "Event", label: "Events" }];
const KIND_ICON = { Team: Users, Venue: Buildings, Event: CalendarBlank } as const;
const ANY = "__any";
const RECENT_KEY = "bt-recent-searches";

function Marked({ text, q }: { text: string; q: string }) {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return <>{text}</>;
  const escape = (w: string) => w.replace(/[.*+?^$()|[\]\\{}]/g, "\\$&");
  const re = new RegExp("(" + words.map(escape).join("|") + ")", "ig");
  return <>{text.split(re).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>))}</>;
}

/* a line in a quick look: a smaller event row you can open straight from the preview */
function Mini({ h, onGo }: { h: Hit; onGo: () => void }) {
  return (
    <a className="sp-mini" href={h.href} onClick={onGo}>
      <span className="sp-mini-d"><b>{h.day}</b><i>{h.mon}</i></span>
      <span className="sp-mini-t"><strong>{h.title}</strong><small>{h.time} · {h.venue}</small></span>
      {h.price != null && <span className="sp-mini-p">${h.price}</span>}
    </a>
  );
}

function QuickLook({ hit, reduce, onGo }: { hit: Hit; reduce: boolean; onGo: () => void }) {
  /* the ticket leans toward the pointer on a spring (decorative, so left out for reduced motion) */
  const px = useMotionValue(0), py = useMotionValue(0);
  const rx = useSpring(useTransform(py, [-1, 1], [4, -4]), { stiffness: 160, damping: 16 });
  const ry = useSpring(useTransform(px, [-1, 1], [-5, 5]), { stiffness: 160, damping: 16 });
  const lean = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set(((e.clientX - r.left) / r.width) * 2 - 1); py.set(((e.clientY - r.top) / r.height) * 2 - 1);
  };
  const rest = () => { px.set(0); py.set(0); };
  const ac = hit.accent ?? "#17324d";
  /* live events carry no price, so the one being looked at asks for its lowest open offer */
  const [asked, setAsked] = useState<{ id: string; p?: number }>();
  useEffect(() => { let ok = true; if (hit.kind === "Event" && !hit.price) priceFor(hit).then((p) => { if (ok) setAsked({ id: hit.id, p }); }); return () => { ok = false; }; }, [hit]);
  const price = hit.price || (asked?.id === hit.id ? asked.p : undefined);

  if (hit.kind === "Event") {
    const more = moreAt(hit);
    const soon = hit.status === "Presale";
    return (
      <div className="sp-ql">
        {/* the same ticket as the schedule tiles on a team page: the team's colour as the poster with the opponent's crest set on it, the title over a dark fade, a row of punched holes, then the price and the button */}
        <motion.div className="sp-tk" style={{ rotateX: reduce ? 0 : rx, rotateY: reduce ? 0 : ry, ["--ac" as string]: ac }} onPointerMove={lean} onPointerLeave={rest}>
          <div className="sp-tl">
            <div className="sp-tl-img">
              {hit.art
                // eslint-disable-next-line @next/next/no-img-element
                ? <span className="sp-tl-art" aria-hidden><img src={hit.art} alt="" /></span>
                : <b className="sp-tl-big" aria-hidden>{hit.day}</b>}
              <span className="sp-tl-s">{hit.tag}{hit.status ? ` · ${hit.status}` : ""}</span>
              <span className="sp-tl-dt">{hit.mon} {hit.day}</span>
              <div className="sp-tl-t">
                <h4>{hit.title}</h4>
                <p>{hit.time} · <a href={hit.venueHref} onClick={onGo}>{hit.venue}</a></p>
              </div>
            </div>
            <div className="sp-tl-b">
              {price ? <span className="sp-tk-pr"><small>From</small><b>${price}</b></span> : <span />}
              {soon
                ? <Button href={hit.href} size="md" variant="glass"><Bell weight="bold" aria-hidden />Remind me</Button>
                : <Button href={hit.href} size="md">Get tickets<ArrowRight weight="bold" aria-hidden /></Button>}
            </div>
          </div>
        </motion.div>
        {more.length > 0 && (
          <div className="sp-ql-g">
            <h5>Also at {hit.venue}</h5>
            {more.map((m) => <Mini key={m.id} h={m} onGo={onGo} />)}
          </div>
        )}
      </div>
    );
  }

  const Ic = KIND_ICON[hit.kind];
  return (
    <div className="sp-ql">
      <div className="sp-card" style={{ ["--ac" as string]: ac }}>
        <span className="sp-card-ic" data-photo={hit.kind === "Venue" ? "1" : undefined} aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {hit.logo ? <img src={hit.logo} alt="" /> : <Ic weight="bold" />}
        </span>
        <span className="sp-card-t"><h4>{hit.title}</h4><p>{hit.count} events on sale</p></span>
      </div>
      {hit.events && hit.events.length > 0 && (
        <div className="sp-ql-g">
          <h5>{hit.kind === "Team" ? "Next up" : "Coming up"}</h5>
          {hit.events.map((m) => <Mini key={m.id} h={m} onGo={onGo} />)}
        </div>
      )}
      <div className="sp-ql-a">
        <Button href={hit.href} size="md">{hit.kind === "Team" ? "Open team page" : "Open venue page"}<ArrowRight weight="bold" aria-hidden /></Button>
        {hit.extra && <Button href={hit.extra.href} size="md" variant="secondary">{hit.extra.label}</Button>}
      </div>
    </div>
  );
}

export default function NavSearch({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  const reduce = !!useReducedMotion();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"All" | HitKind>("All");
  const [active, setActive] = useState(0);
  /* rows scrolling under a still pointer fire pointermove with the same coordinates; only a real move may take the highlight */
  const lastPt = useRef<[number, number] | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [word, setWord] = useState(0);
  const [fresh, setFresh] = useState(false);
  /* the filter tabs are there from the first frame and ride the morph with the panel; they remount once it lands so the sliding pill never measures itself mid-scale and glides in from the wrong place */
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!open) { setSettled(false); return; }
    const t = setTimeout(() => setSettled(true), reduce ? 0 : 420);
    return () => clearTimeout(t);
  }, [open, reduce]);
  const dialog = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const rows = useRef<(HTMLAnchorElement | null)[]>([]);

  /* the live events, teams and venues are fetched the first time the palette opens; until they land (or if they never do) the demo data answers */
  const [ver, setVer] = useState(0);
  /* ask for the live data as soon as the page is idle (and again when the trigger is touched), so it has landed before the palette opens and the first list is already the real one */
  useEffect(() => {
    const go = () => { loadLiveIndex().then((ok) => { if (ok) setVer((v) => v + 1); }); };
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) { const id = w.requestIdleCallback(go); return () => w.cancelIdleCallback?.(id); }
    const t = setTimeout(go, 600);
    return () => clearTimeout(t);
  }, []);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!open) return; setBusy(true); loadLiveIndex().then((ok) => { if (ok) setVer((v) => v + 1); }).finally(() => setBusy(false)); }, [open]);
  const [sport, setSport] = useState("");
  /* the sport chips count what the current search found, not everything on sale, and a sport with nothing in this search is not offered */
  const sports = useMemo(() => {
    const c = new Map<string, number>();
    searchHits(q).events.forEach((e) => e.tag && c.set(e.tag, (c.get(e.tag) ?? 0) + 1));
    return [...c].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n);
  }, [q, ver]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (sport && !sports.some((s) => s.name === sport)) setSport(""); }, [sports, sport]);
  const groups = useMemo(() => searchHits(q, sport), [q, sport, ver]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = useMemo(() => ({
    Team: kind === "All" || kind === "Team" ? groups.teams : [],
    Venue: kind === "All" || kind === "Venue" ? groups.venues : [],
    Event: kind === "All" || kind === "Event" ? groups.events : [],
  }), [groups, kind]);
  const flat = useMemo(() => [...shown.Team, ...shown.Venue, ...shown.Event], [shown]);
  const hit = flat[Math.min(active, flat.length - 1)];
  const typed = q.trim().length > 0;
  /* the rest of what is being typed, shown as ghost text (Tab or → takes it), and a nearby spelling when nothing matches */
  const ghost = useMemo(() => (open && typed ? complete(q) : ""), [open, typed, q, ver]); // eslint-disable-line react-hooks/exhaustive-deps
  const dym = useMemo(() => (open && typed && flat.length === 0 ? didYouMean(q) : ""), [open, typed, q, flat.length, ver]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = useCallback(() => { setOpen(false); requestAnimationFrame(() => trigger.current?.focus()); }, []);
  const remember = useCallback(() => {
    const t = q.trim();
    if (!t) return;
    const next = [t, ...recent.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, 4);
    setRecent(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* storage blocked: recents just last for this visit */ }
  }, [q, recent]);
  const go = useCallback(() => { remember(); setOpen(false); }, [remember]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try { const r = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); if (Array.isArray(r)) setRecent(r.filter((x) => typeof x === "string").slice(0, 4)); } catch { /* none stored */ }
    });
    return () => cancelAnimationFrame(id);
  }, []);

  /* ⌘K or Ctrl+K toggles it, "/" opens it unless someone is typing */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((v) => !v); return; }
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (e.key === "/" && !typing && !open) { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  /* the page behind does not scroll while the palette is up, and the field takes focus */
  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    /* the page behind holds still while the palette is up (see .sp-layer rules): moving layers under a blurred, morphing panel repaint it every frame */
    document.documentElement.dataset.spOpen = "1";
    /* the on-screen keyboard shrinks the visual viewport but not the layout one (dvh), so the panel follows the visual viewport and its bottom never hides behind the keyboard */
    const vv = window.visualViewport;
    const fit = () => { if (vv) document.documentElement.style.setProperty("--sp-vv", `${Math.round(vv.height)}px`); };
    fit(); vv?.addEventListener("resize", fit);
    const id = requestAnimationFrame(() => input.current?.focus());
    return () => { vv?.removeEventListener("resize", fit); document.documentElement.style.removeProperty("--sp-vv"); document.documentElement.style.overflow = prev; delete document.documentElement.dataset.spOpen; cancelAnimationFrame(id); };
  }, [open]);

  useEffect(() => { rows.current[active]?.scrollIntoView({ block: "nearest" }); }, [active]);

  /* the rows cascade in only when the palette opens, not on every keystroke */
  useEffect(() => {
    if (!open) { setFresh(false); return; }
    setFresh(true);
    const t = setTimeout(() => setFresh(false), 700);
    return () => clearTimeout(t);
  }, [open]);

  /* the trigger's hint rotates through things worth typing, only while the palette is shut */
  useEffect(() => {
    if (open || reduce) return;
    const t = setInterval(() => setWord((w) => (w + 1) % SUGGESTIONS.length), 2600);
    return () => clearInterval(t);
  }, [open, reduce]);

  /* the dialog keeps focus inside it: Tab and Shift+Tab walk its controls and wrap, and Esc closes from wherever focus is */
  const onDialogKeys = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.defaultPrevented) return;
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key !== "Tab") return;
    const f = Array.from(dialog.current?.querySelectorAll<HTMLElement>("input,button:not([disabled]),a[href],[tabindex]:not([tabindex='-1'])") ?? []).filter((el) => el.tabIndex >= 0 && el.offsetParent !== null && el.getAttribute("role") !== "option");
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  const onKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const end = e.currentTarget.selectionStart === q.length && e.currentTarget.selectionEnd === q.length;
    if (ghost && end && ((e.key === "Tab" && !e.shiftKey) || e.key === "ArrowRight")) { e.preventDefault(); setQ(ghost); setActive(0); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (flat.length ? (i + 1) % flat.length : 0)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (hit) { remember(); window.location.href = hit.href; } else if (typed) window.location.href = `/search?query=${encodeURIComponent(q.trim())}`; }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
  };
  const count = (v: "All" | HitKind) => (v === "All" ? groups.teams.length + groups.venues.length + groups.events.length : v === "Team" ? groups.teams.length : v === "Venue" ? groups.venues.length : groups.events.length);

  let idx = -1;
  const sections: { label: string; kind: HitKind; items: Hit[] }[] = [
    { label: "Teams", kind: "Team", items: shown.Team },
    { label: "Venues", kind: "Venue", items: shown.Venue },
    { label: typed ? "Events" : "Coming up", kind: "Event", items: shown.Event },
  ];

  return (
    <LayoutGroup id="nav-search">
      {/* the resting bar: one small floating pill */}
      <div className="un-pill" data-open={open ? "1" : "0"} onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty("--sx", `${e.clientX - r.left}px`); e.currentTarget.style.setProperty("--sy", `${e.clientY - r.top}px`); }}>
        {!open && <motion.span layoutId="sp-shell" className="sp-shell" style={{ borderRadius: 999 }} transition={reduce ? { duration: 0 } : SPRING} />}
        {left}
        <button ref={trigger} type="button" className="sp-trigger" onClick={() => setOpen(true)} onPointerEnter={() => { loadLiveIndex(); }} onFocus={() => { loadLiveIndex(); }} onKeyDown={(e) => { if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey && e.key !== " ") { e.preventDefault(); setQ(e.key); setActive(0); setOpen(true); } }} aria-haspopup="dialog" aria-expanded={open} aria-label="Search events, teams and venues" tabIndex={open ? -1 : 0}>
          <MagnifyingGlass weight="bold" aria-hidden />
          <span className="sp-ph">
            Search
            <span className="sp-ph-w">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={word} initial={reduce ? false : { opacity: 0, y: 8, filter: "blur(3px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={reduce ? undefined : { opacity: 0, y: -8, filter: "blur(3px)" }} transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}>
                  {SUGGESTIONS[word]}
                </motion.span>
              </AnimatePresence>
            </span>
          </span>
          <KbdGroup aria-hidden><Kbd keys={["⌘"]} className="bg-h-foreground/10" /><Kbd keys={["K"]} className="bg-h-foreground/10" /></KbdGroup>
        </button>
        {right}
      </div>

      <AnimatePresence>
        {open && (
          <div className="sp-layer" key="layer">
            <motion.div className="sp-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.3, ease: [0.23, 1, 0.32, 1] } }} transition={{ duration: reduce ? 0 : 0.45, ease: [0.4, 0, 0.2, 1] }} onClick={close} aria-hidden />
            {/* holds the layer mounted until the shell has travelled back into the pill; without it the layer unmounts with the scrim and cuts the return short */}
            <motion.span aria-hidden hidden exit={{ opacity: 0, transition: { duration: reduce ? 0 : HOLD } }} />
            <div ref={dialog} className="sp-pos" role="dialog" aria-modal="true" aria-label="Search events, teams and venues" onKeyDown={onDialogKeys}>
              <motion.div layoutId="sp-shell" className="sp-panel" style={{ borderRadius: 28 }} transition={reduce ? { duration: 0 } : SPRING}>
                <motion.div className="sp-in" initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.07, ease: [0.23, 1, 0.32, 1] } }}>
                  <div className="sp-top">
                    <MagnifyingGlass weight="bold" aria-hidden />
                    <span className="sp-field">
                    <span className="sp-ghost" aria-hidden><i>{q}</i>{ghost ? ghost.slice(q.length) : ""}</span>
                    <input
                      ref={input} value={q} onChange={(e) => { setQ(e.target.value); setActive(0); }} onKeyDown={onKeys}
                      type="text" role="combobox" aria-expanded="true" aria-controls="sp-list" aria-activedescendant={hit ? `sp-r-${active}` : undefined} aria-autocomplete="both"
                      autoComplete="off" autoCorrect="off" spellCheck={false} placeholder="Search events, teams, venues" aria-label="Search events, teams and venues"
                    />
                    </span>
                    {ghost && <span className="sp-accept" aria-hidden><Kbd keys={["Tab"]} /></span>}
                    {typed && <button type="button" className="sp-clear" onClick={() => { setQ(""); setActive(0); input.current?.focus(); }} aria-label="Clear search"><X weight="bold" aria-hidden /></button>}
                    <button type="button" className="sp-esc" onClick={close} aria-label="Close search"><Kbd keys={["Esc"]} /><X className="sp-esc-x" weight="bold" aria-hidden /></button>
                  </div>

                  <div className="sp-chips" data-settled={settled || undefined}>
                    {<>
                    {/* the library's Tabs (soft, neutral): one pill slides between the choices instead of each chip toggling on its own. A kind with nothing in this search stays put but dims, so the row never reflows while you type. */}
                    <Tabs value={kind} onValueChange={(v) => { setKind(v as "All" | HitKind); setActive(0); }} className="sp-seg" key={settled ? "s" : "m"}>
                      <TabsList size="sm" tone="accent" aria-label="Show">
                        {KINDS.map((k) => (
                          <TabsTrigger key={k.v} value={k.v} disabled={k.v !== "All" && count(k.v) === 0 && kind !== k.v} aria-label={`${k.label}, ${count(k.v)}`}>
                            {k.label}<span className="tabular-nums opacity-60" aria-hidden>{count(k.v)}</span>
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                    {/* sport joins the row with a short fade and slide, and leaves the same way, so the row does not jump when it appears */}
                    <AnimatePresence initial={false} mode="popLayout">
                      {sports.length > 1 && (kind === "All" || kind === "Event") && (
                        <motion.div key="sport" className="sp-seg-wrap" initial={reduce ? false : { opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={reduce ? { opacity: 0 } : { opacity: 0, x: -8 }} transition={{ duration: reduce ? 0 : 0.18, ease: [0.23, 1, 0.32, 1] }}>
                          <span className="sp-sep" aria-hidden />
                          <Tabs value={sport || ANY} onValueChange={(v) => { setSport(v === ANY ? "" : v); setActive(0); }} className="sp-seg" key={settled ? "s" : "m"}>
                            <TabsList size="sm" tone="accent" aria-label="Narrow events by sport">
                              <TabsTrigger value={ANY} aria-label={`Any sport, ${searchHits(q).events.length} events`}>Any</TabsTrigger>
                              {sports.map((s2) => <TabsTrigger key={s2.name} value={s2.name} aria-label={`${s2.name}, ${s2.n} events`}>{s2.name}<span className="tabular-nums opacity-60" aria-hidden>{s2.n}</span></TabsTrigger>)}
                            </TabsList>
                          </Tabs>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {!typed && recent.length > 0 && (
                      <span className="sp-recent">
                        <span>Recent</span>
                        {recent.map((r) => <button key={r} type="button" onClick={() => { setQ(r); setActive(0); input.current?.focus(); }}>{r}</button>)}
                      </span>
                    )}
                    </>}
                  </div>

                  <span className="tm-sr sp-live" role="status">{flat.length} {flat.length === 1 ? "result" : "results"}{ghost ? `. Suggestion: ${ghost}. Press Tab to accept.` : ""}{dym ? ` Did you mean ${dym}?` : ""}</span>
                  <div className="sp-body">
                    <div className="sp-list" id="sp-list" role="listbox" aria-label="Results" aria-busy={busy} data-fresh={fresh ? "1" : "0"}>
                      <div className="sp-list-in">
                      {flat.length === 0 ? (
                        <div className="sp-none">
                          <MagnifyingGlass weight="bold" aria-hidden />
                          <strong>Nothing matches “{q.trim()}”</strong>
                          {dym && <button type="button" className="sp-dym" onClick={() => { setQ(dym); setActive(0); input.current?.focus(); }}>Did you mean <b>{dym}</b>?</button>}
                          <span>Try one of these, or look through every event.</span>
                          <span className="sp-try">{SUGGESTIONS.slice(0, 4).map((s) => <button key={s} type="button" onClick={() => { setQ(s); setKind("All"); setActive(0); input.current?.focus(); }}>{s}</button>)}</span>
                          <a href={`/search?query=${encodeURIComponent(q.trim())}`} onClick={close}>Search all events for “{q.trim()}”</a>
                        </div>
                      ) : sections.filter((s) => s.items.length).map((s) => {
                        const Ic = KIND_ICON[s.kind];
                        return (
                          <div key={s.label} className="sp-g" role="group" aria-labelledby={`sp-gl-${s.kind}`}>
                            <div className="sp-gh" id={`sp-gl-${s.kind}`}><Ic weight="bold" aria-hidden />{s.label}</div>
                            {s.items.map((h) => {
                              const i = ++idx;
                              const on = i === active;
                              return (
                                <a key={h.id} ref={(el) => { rows.current[i] = el; }} id={`sp-r-${i}`} role="option" aria-selected={on} href={h.href} className="sp-row" data-on={on ? "1" : "0"}
                                  style={{ ["--i" as string]: Math.min(i, 9) }} onPointerMove={(e) => { const l = lastPt.current; lastPt.current = [e.clientX, e.clientY]; if (!on && (!l || l[0] !== e.clientX || l[1] !== e.clientY)) setActive(i); }} onClick={go}>
                                  {on && <span className="sp-hi" />}
                                  <span className="sp-ic" data-photo={h.kind === "Venue" && h.logo ? "1" : undefined} aria-hidden>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    {h.logo ? <img src={h.logo} alt="" /> : h.kind === "Event" ? <span className="sp-dt"><b>{h.day}</b><i>{h.mon}</i></span> : <Buildings weight="bold" />}
                                  </span>
                                  <span className="sp-t"><strong><Marked text={h.title} q={q} /></strong><small>{h.meta}</small></span>
                                  {h.kind === "Event" && h.price != null && <span className="sp-p">${h.price}</span>}
                                  <span className="sp-go" aria-hidden><Kbd keys={["↵"]} /></span>
                                </a>
                              );
                            })}
                          </div>
                        );
                      })}
                      </div>
                    </div>

                    <div className="sp-pre" aria-label="Quick look">
                      {!hit && (
                        <div className="sp-tips">
                          <strong>Search by</strong>
                          <ul>
                            <li><b>Team or venue</b>“buccaneers”, “RecPlex”</li>
                            <li><b>Date</b>“this weekend”, “friday”, “nov 20”</li>
                            <li><b>Place</b>“West Des Moines”</li>
                            <li><b>Sport</b>pick a chip above</li>
                          </ul>
                        </div>
                      )}
                      <AnimatePresence mode="popLayout" initial={false}>
                        {hit && (
                          <motion.div key={hit.id} className="sp-pre-in" initial={reduce ? false : { opacity: 0, y: 8, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={reduce ? undefined : { opacity: 0, filter: "blur(4px)" }} transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}>
                            <QuickLook hit={hit} reduce={reduce} onGo={go} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="sp-foot">
                    <span><KbdGroup><Kbd keys={["↑"]} /><Kbd keys={["↓"]} /></KbdGroup>Navigate</span>
                    <span><Kbd keys={["↵"]} />Open</span>
                    <span><Kbd keys={["Esc"]} />Close</span>
                    {typed && <a href={`/search?query=${encodeURIComponent(q.trim())}`} onClick={go}>All results for “{q.trim()}”<ArrowRight weight="bold" aria-hidden /></a>}
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
}
