"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { stableVh } from "./viewport";
import Button from "@/components/atoms/Button";
import ThemeButton from "./ThemeButton";
import NavSearch from "./NavSearch";
import AccountMenu, { type DemoAccount } from "./AccountMenu";

/* Scroll-linked glass: the fill and blur ease in over the first 140px of scroll
   (--bg), and the text and logo turn dark a little later (--fg), so the nav never
   flips. Also --sp, the page scroll progress (0 to 1), which fills the thin green line along the
   bottom edge of the small-screen island. On small screens the whole bar is one floating island: it
   shows which chapter of the page you are in, and the menu button grows the island itself into the
   menu (the bar's own pill stretches down and rounds off) over a blurred page. On wider screens the same chapter row hangs off
   the centre link pill (one joined shape) and opens the same jump list as a dropdown. */
/* Light/dark switch. With no choice stored the page follows the device; once someone taps the
   switch the choice is kept (localStorage) and set on <html data-nt="light|dark"). */
function toggleTheme() {
  const scope = document.querySelector(".n");
  const dark = scope ? getComputedStyle(scope).colorScheme === "dark" : false;
  const next = dark ? "light" : "dark";
  document.documentElement.dataset.nt = next;
  window.dispatchEvent(new Event("concept-theme"));
  try { localStorage.setItem("concept-theme", next); } catch { /* storage blocked: the choice just lasts for this visit */ }
}

/* whether the page is dark right now: the stored choice, else the device. Watches the switch (data-nt on <html>) and the device setting. */
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
function useDark() {
  const [dark, setDark] = useState(false);
  useIsoLayoutEffect(() => { // before first paint, so a dark-mode visitor never sees the switch on "light" for a moment
    const read = () => { const scope = document.querySelector(".n"); setDark(scope ? getComputedStyle(scope).colorScheme === "dark" : false); };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-nt"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", read);
    return () => { mo.disconnect(); mq.removeEventListener("change", read); };
  }, []);
  return dark;
}

/* smooth jumps, unless the visitor asked for less motion */
const jumpBehavior = (): ScrollBehavior => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");
/* "Skip to content": moves focus to the page's main region (or its first heading) */
function skipToContent(e: React.MouseEvent) {
  e.preventDefault();
  const t = document.querySelector<HTMLElement>("main, [role=main], #main, h1");
  if (!t) return;
  if (!t.hasAttribute("tabindex")) t.setAttribute("tabindex", "-1");
  t.focus({ preventScroll: false });
}
const SKIP = <a href="#main" className="n-skip" onClick={skipToContent}>Skip to content</a>;

const LINKS = [
  { href: "/#features", label: "Platform" },
  { href: "/#results", label: "Results" },
  { href: "/our-story", label: "Our Story" },
  { href: "/sell", label: "Sell with us" },
];
const ARROW = "M5 12h14M13 6l6 6-6 6";

/* `user` is the bar for the people who buy tickets (Browse, team pages, venues, packs): the same glass pills and scroll behaviour as the business bar,
   with a search for everything in the middle and Log in in place of the links, the menu and Book a call. */
export default function Nav({ variant = "business", login = true, search = true, account, sticky = true }: { variant?: "business" | "user"; login?: boolean; search?: boolean; account?: DemoAccount; sticky?: boolean }) {
  const user = variant === "user";
  const dark = useDark();
  const path = usePathname();

  const ref = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<"" | "menu" | "jump">("");
  const open = mode !== "";
  const setOpen = (v: boolean) => setMode(v ? "menu" : "");
  const [chapter, setChapter] = useState(-1);
  const [names, setNames] = useState<string[]>([]);
  const [pane, setPane] = useState<"menu" | "jump">("menu"); // stays on the last pane so the sheet can animate shut with its content
  const chapters = useRef<HTMLElement[]>([]);
  useEffect(() => { if (mode) setPane(mode); }, [mode]);

  // the small-screen menu closes on Escape, on a tap outside it and on resize to the wide layout
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onDown = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onResize = () => { if (window.innerWidth >= 760) setMode((m) => (m === "menu" ? "" : m)); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("resize", onResize);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onDown); window.removeEventListener("resize", onResize); };
  }, [open]);

  /* An open menu is a small modal: focus moves into it, Tab stays inside the header, the page behind does not scroll (on phones), and on close
     focus goes back to what opened it. */
  useEffect(() => {
    if (!open || user) return;
    const prev = document.activeElement as HTMLElement | null;
    const small = window.innerWidth < 760;
    const html = document.documentElement;
    const before = html.style.overflow;
    if (small) html.style.overflow = "hidden";
    /* the pane swaps in a frame after the menu opens, so try again a moment later if the first focus did not land */
    const toFirst = () => {
      const sheet = ref.current?.querySelector("#n-sheet");
      if (sheet && sheet.contains(document.activeElement)) return;
      ref.current?.querySelector<HTMLElement>(mode === "jump" ? ".n-pane-jump .n-jump" : ".n-pane-menu .n-big")?.focus();
    };
    const id = requestAnimationFrame(toFirst);
    const t2 = window.setTimeout(toFirst, 120);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !ref.current) return;
      const all = Array.from(ref.current.querySelectorAll<HTMLElement>("a[href],button:not([disabled]),[tabindex]:not([tabindex='-1'])")).filter((n) => !n.closest("[inert]") && n.offsetParent !== null && getComputedStyle(n).visibility !== "hidden");
      if (!all.length) return;
      const first = all[0], last = all[all.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(id); window.clearTimeout(t2); document.removeEventListener("keydown", onKey); html.style.overflow = before;
      const a = document.activeElement;
      if (prev && (!a || a === document.body || ref.current?.querySelector("#n-sheet")?.contains(a))) prev.focus();
    };
  }, [open, mode, user]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const secs = user ? [] : Array.from(document.querySelectorAll<HTMLElement>("[data-chapter]"));
    chapters.current = secs;
    setNames(secs.map((s) => s.dataset.chapter || ""));
    let raf = 0, last = -1;
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    const memo: Record<string, string> = {};
    const put = (k: string, v: string) => { if (memo[k] !== v) { memo[k] = v; el.style.setProperty(k, v); } };
    // section tops in document space, measured once and again when the page height changes, so a scroll frame
    // reads no layout at all (it used to measure every chapter section on every frame)
    let tops: number[] = [];
    const measure = () => { tops = secs.map((s) => s.getBoundingClientRect().top + window.scrollY); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    /* what is under the bar? Walk up from the first thing at the middle of the bar until something has a background; a picture or a background image counts
       as dark. A page can say it outright with data-nav-surface="dark" or "light" on the element. */
    let restFg = 0, lastSample = 0;
    const cv = document.createElement("canvas"); cv.width = cv.height = 1;
    const cx = cv.getContext("2d", { willReadFrequently: true });
    const luminance = (css: string): number | null => {
      if (!cx || !css || css === "transparent") return null;
      cx.clearRect(0, 0, 1, 1); cx.fillStyle = "rgb(1,2,3)"; const before = cx.fillStyle; cx.fillStyle = css;
      if (cx.fillStyle === before && css.replace(/\s/g, "") !== "rgb(1,2,3)") return null;
      cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      if (d[3] < 128) return null;
      return (0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2]) / 255;
    };
    const surfaceIsLight = (): boolean => {
      const stack = document.elementsFromPoint(Math.round(window.innerWidth / 2), 36);
      for (const node of stack) {
        if (el.contains(node) || node.classList.contains("n-scrim") || node.classList.contains("n-fade")) continue;
        let cur: Element | null = node;
        while (cur && cur !== document.documentElement) {
          const tone = (cur as HTMLElement).dataset?.navSurface;
          if (tone === "dark") return false;
          if (tone === "light") return true;
          if (/^(IMG|VIDEO|CANVAS|PICTURE)$/.test(cur.tagName)) return false;
          const cs = getComputedStyle(cur);
          if (cs.backgroundImage !== "none") return false;
          const l = luminance(cs.backgroundColor);
          if (l !== null) return l > 0.55;
          cur = cur.parentElement;
        }
      }
      const root = luminance(getComputedStyle(document.body).backgroundColor) ?? luminance(getComputedStyle(document.documentElement).backgroundColor);
      return (root ?? 0) > 0.55;
    };
    const apply = () => {
      raf = 0;
      const y = window.scrollY;
      let p = clamp(y / 140);
      if (reduce) p = p > 0.2 ? 1 : 0;
      const ease = p * p * (3 - 2 * p); // smoothstep
      put("--bg", clamp(ease * 1.5).toFixed(3));
      /* at rest the bar sits on whatever the page has under it: light ink on a dark surface, dark ink on a light one. Sampled near the top only
         (past that the bar has its own glass), at most every 150ms, and again when the theme changes. */
      if (y < 160) {
        const now = performance.now();
        if (now - lastSample > 150) {
          lastSample = now;
          // a sampling error must never freeze the bar in its scrolled look: keep the last good reading and carry on
          try { restFg = surfaceIsLight() ? 1 : 0; } catch { /* keep restFg */ }
        }
      }
      put("--fg", Math.max(restFg, clamp((ease - 0.35) / 0.45)).toFixed(3));
      const vh = stableVh();
      const max = document.documentElement.scrollHeight - vh;
      put("--sp", (max > 0 ? clamp(y / max) : 0).toFixed(3));
      // the chapter is the last tagged section whose top has passed 40% of the screen
      let idx = -1;
      const line = vh * 0.4;
      tops.forEach((tp, i) => { if (tp - y < line) idx = i; });
      if (idx !== last) { last = idx; setChapter(idx); }
      // the chapter row only drops in once the first tagged section is on its way into view (not over the hero)
      const near = tops.length > 0 && tops[0] - y < vh * 0.38;
      const v = near ? "1" : "0";
      if (el.dataset.chap !== v) el.dataset.chap = v;
    };
    // the last frame of a scroll can land inside the 150ms sampling throttle, leaving the rest reading from a few pixels earlier:
    // once scrolling stops, sample again so the bar settles in the right state at the top
    let idle = 0;
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
      window.clearTimeout(idle);
      idle = window.setTimeout(() => { lastSample = 0; if (!raf) raf = requestAnimationFrame(apply); }, 180);
    };
    const theme = new MutationObserver(() => { lastSample = 0; onScroll(); });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-nt"] });
    const onTheme = () => { lastSample = 0; if (raf) { cancelAnimationFrame(raf); raf = 0; } apply(); };
    window.addEventListener("concept-theme", onTheme);
    const settle = window.setTimeout(() => { lastSample = 0; onScroll(); }, 350);
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("concept-theme", onTheme); window.clearTimeout(settle); window.clearTimeout(idle); theme.disconnect(); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); ro.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [user]);

  const barNodes = (
    <>
        <a href="/" className="n-glass n-logo" aria-label="blocktickets home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/blocktickets-logo-navy.svg" alt="blocktickets" />
        </a>
        <nav className="n-glass n-links" aria-label="Primary">
          {LINKS.map((l) => <a key={l.href} href={l.href} aria-current={l.href === path ? "page" : undefined}>{l.label}</a>)}
        </nav>
        <div className="n-nav-r">
          <div className="n-theme-seg"><ThemeButton dark={dark} className="n-glass n-theme" /></div>
          <Button href="/sell" size="md" className="n-nav-cta">Book a call</Button>
          <button type="button" className="n-glass n-menu" aria-expanded={mode === "menu"} aria-controls="n-sheet" aria-label={mode === "menu" ? "Close menu" : "Open menu"} onClick={() => setMode((m) => (m === "menu" ? "" : "menu"))}>
            <span aria-hidden="true"><i /><i /></span>
          </button>
        </div>
    </>
  );

  /* the bar for ticket buyers: no links, no menu. The logo, a search that opens a palette, the light/dark switch and Log in.
     It shares the scroll-linked glass of the business bar (--bg and --fg are set on this header by the same effect). */
  if (user) {
    const logo = (
      <a href="/browse" className="un-logo" aria-label="blocktickets home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/blocktickets-logo-navy.svg" alt="blocktickets" />
      </a>
    );
    const right = (
            <div className="un-r">
              <ThemeButton dark={dark} className="un-theme" />
              <AccountMenu login={login} demo={account} />
            </div>
    );
    return (
      <header ref={ref} className="un" data-static={sticky ? undefined : ""}>
        {SKIP}
        <i className="n-fade" aria-hidden="true" />
        {search ? <NavSearch left={logo} right={right} /> : <div className="un-pill" style={{ gap: 14 }}>{logo}{right}</div>}
      </header>
    );
  }

  return (
    <>
      <div className="n-scrim" data-open={open ? "1" : "0"} aria-hidden="true" />
      <header ref={ref} className="n-nav" data-open={open ? "1" : "0"} data-mode={mode} data-pane={pane} data-chap="0">
        {SKIP}
        <i className="n-fade" aria-hidden="true" />
        {barNodes}
        {!user && <i className="n-prog" aria-hidden="true" />}
        {!user && <button type="button" className="n-chap" aria-expanded={mode === "jump"} aria-controls="n-sheet" aria-label="Jump to a section" tabIndex={chapter < 0 ? -1 : 0} onClick={() => setMode((m) => (m === "jump" ? "" : "jump"))}>
          <i />
          <span key={chapter} className="n-chap-t">{names[chapter] || ""}</span>
          <em>{chapter >= 0 ? `${chapter + 1}/${names.length}` : ""}</em>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>}
        {!user && <div id="n-sheet" className="n-sheet" inert={!open}>
          <div className="n-sheet-in">
            <nav aria-label="Sections" className="n-sheet-pad n-pane-jump">
              {names.map((n, i) => (
                <button type="button" key={`${i}-${n}`} className={`n-jump${i === chapter ? " is-on" : ""}`} style={{ ["--i" as string]: i }} onClick={() => { setMode(""); chapters.current[i]?.scrollIntoView({ behavior: jumpBehavior(), block: "start" }); }}>
                  <small>{String(i + 1).padStart(2, "0")}</small>
                  <span>{n}</span>
                  <i />
                </button>
              ))}
              <button type="button" className="n-jump n-jump-top" style={{ ["--i" as string]: names.length }} onClick={() => { setMode(""); window.scrollTo({ top: 0, behavior: jumpBehavior() }); }}>
                <span>Back to top</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" /></svg>
              </button>
            </nav>
            <nav aria-label="Menu" className="n-sheet-pad n-pane-menu">
              {LINKS.map((l, i) => (
                <a key={l.href} href={l.href} aria-current={l.href === path ? "page" : undefined} className="n-big" style={{ ["--i" as string]: i }} onClick={() => setOpen(false)}>
                  <small>0{i + 1}</small>
                  <span>{l.label}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ARROW} /></svg>
                </a>
              ))}
              <Button href="/sell" size="md" className="n-sheet-cta" style={{ ["--i" as string]: 4 }} onClick={() => setOpen(false)}>Book a call <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ARROW} /></svg></Button>
              <button type="button" className="n-sheet-th" style={{ ["--i" as string]: 5 }} onClick={toggleTheme}>
                <span>Appearance</span>
                <span className="n-sheet-pill"><svg className="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></svg><svg className="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg></span>
              </button>
            </nav>
          </div>
        </div>}
      </header>
    </>
  );
}
