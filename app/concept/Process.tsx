"use client";

import { useEffect, useRef } from "react";
import { docTop, stableVh } from "./viewport";

/* Onboarding as a scroll-driven timeline. A tall track holds one pinned stage; scrolling pans a wide "world" sideways
   while a puck rides the centre of the line, the line fills behind it, giant numerals drift at half speed and a
   field of specks at 1.4x. Each milestone ignites (class `on`, plain CSS transitions) when the puck gets to it.
   Where scroll-linked animations exist the pan itself is native CSS (see styles.ts); otherwise this component writes
   the same transforms. Under prefers-reduced-motion the stage becomes a normal swipeable row, all milestones lit. */
const THRESH = [0.16, 0.5, 0.84]; // pan progress (0 to 1) at which each milestone lights, a little before the puck arrives

const ITEMS = [
  { label: "Events", icon: "M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" },
  { label: "Seat maps", icon: "M4 6h4v4H4zM10 6h4v4h-4zM16 6h4v4h-4zM4 13h4v4H4zM10 13h4v4h-4zM16 13h4v4h-4z" },
  { label: "Fan data", icon: "M16 20v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M10 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM20 20v-1a3 3 0 0 0-2-2.8M15.5 5.2a3 3 0 0 1 0 5.6" },
  { label: "Pricing", icon: "M20 12l-8 8-9-9V4h7l10 8ZM7.5 8.5h.01" },
];

const Icon = ({ d, w = 2 }: { d: string; w?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

function Setup() {
  return (
    <div className="tl-mv">
      <div className="tl-col tl-from">
        <em>Your setup</em>
        {ITEMS.map((it, k) => <span key={it.label} className="tl-it" style={{ ["--k" as string]: k }}><Icon d={it.icon} />{it.label}</span>)}
      </div>
      <svg className="tl-ar" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      <div className="tl-col tl-to">
        <em>blocktickets</em>
        {ITEMS.map((it, k) => <span key={it.label} className="tl-it" style={{ ["--k" as string]: k }}><Icon d={it.icon} />{it.label}</span>)}
      </div>
    </div>
  );
}

function Call() {
  return (
    <div className="tl-call">
      <span className="tl-ring" />
      <span className="tl-ring" />
      <span className="tl-bub">Welcome aboard</span>
      <div className="tl-av">
        <i className="a0" /><i className="a1" /><i className="a2" /><i className="more">+2</i>
        <span className="tl-ph"><Icon d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" w={2.2} /></span>
      </div>
      <span className="tl-gl">Your onboarding team</span>
    </div>
  );
}

/* ten sections of a small arena, built in turns: even visits are yours (green), odd ones ours (blue) */
const BLOCKS: { x: number; y: number; w: number; h: number; o: "y" | "t" }[] = [
  { x: 40, y: 18, w: 36, h: 22, o: "y" }, { x: 82, y: 18, w: 36, h: 22, o: "t" }, { x: 124, y: 18, w: 36, h: 22, o: "y" },
  { x: 154, y: 44, w: 34, h: 27, o: "t" }, { x: 154, y: 79, w: 34, h: 27, o: "y" },
  { x: 124, y: 110, w: 36, h: 22, o: "t" }, { x: 82, y: 110, w: 36, h: 22, o: "y" }, { x: 40, y: 110, w: 36, h: 22, o: "t" },
  { x: 12, y: 79, w: 34, h: 27, o: "y" }, { x: 12, y: 44, w: 34, h: 27, o: "t" },
];
const POINTER = "M4 3l15 7-6.2 2.2L10 19 4 3Z";

function Live() {
  return (
    <div className="tl-co">
      <svg className="map" viewBox="0 0 200 150" aria-hidden="true">
        <rect className="tl-rk" x="58" y="50" width="84" height="50" rx="25" />
        {BLOCKS.map((b, i) => (
          <rect key={i} className={`bk ${b.o}`} x={b.x} y={b.y} width={b.w} height={b.h} rx="5" style={{ ["--t" as string]: `${(0.32 * i + 0.3).toFixed(2)}s` }} />
        ))}
      </svg>
      <span className="tl-cu y"><svg viewBox="0 0 24 24" fill="currentColor" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round"><path d={POINTER} /></svg><em>Your team</em></span>
      <span className="tl-cu t"><svg viewBox="0 0 24 24" fill="currentColor" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round"><path d={POINTER} /></svg><em>blocktickets</em></span>
      <div className="tl-fin">
        <span className="tl-pill"><i />On sale</span>
      </div>
    </div>
  );
}

const SCENES = [Setup, Call, Live];
const cl = (x: number) => Math.min(1, Math.max(0, x));

export default function Process({ steps }: { steps: { k: string; t: string; d: string }[] }) {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const ms = Array.from(el.querySelectorAll<HTMLElement>(".tl-ms"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("nat");
      ms.forEach((m) => m.classList.add("on"));
      return;
    }
    const mq = window.matchMedia("(max-width: 759px)");
    /* phones: stacked vertical timeline, each step lights once as it reaches the middle of the screen (no scroll listener) */
    const phone = () => {
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -30% 0px", threshold: 0.15 });
      ms.forEach((m) => io.observe(m));
      return () => io.disconnect();
    };
    const desk = () => {
      /* the native pan runs on the page scroll timeline with absolute pixel offsets (--a, --b, set in measure), so it does not depend on the live viewport height that the mobile toolbar keeps changing */
      const native = typeof CSS !== "undefined" && CSS.supports("animation-timeline: scroll()");
      const world = el.querySelector<HTMLElement>(".tl-world");
      const slow = el.querySelector<HTMLElement>(".tl-slow");
      const fg = el.querySelector<HTMLElement>(".tl-fg");
      const fill = el.querySelector<HTMLElement>(".tl-fill");
      const stick = el.querySelector<HTMLElement>(".tl-stick");
      const memo: Record<string, string> = {};
      const put = (k: string, node: HTMLElement | null, v: string, prop: "transform" = "transform") => { if (node && memo[k] !== v) { memo[k] = v; node.style[prop] = v; } };
      let top = 0, height = 0, vh = 0, D = 0, raf = 0;
      const measure = () => {
        top = docTop(el); height = el.offsetHeight; vh = stableVh();
        D = ms.length && stick ? ms[ms.length - 1].offsetLeft - stick.clientWidth / 2 : 0;
        if (native) { el.style.setProperty("--a", `${top}px`); el.style.setProperty("--b", `${top + 0.88 * Math.max(1, height - vh)}px`); }
        update();
      };
      function update() {
        raf = 0;
        const span = height - vh;
        const x = span > 0 ? cl((window.scrollY - top) / span) : 0;
        const pp = cl(x / 0.88); // the pan finishes at 88% of the pinned stretch, the rest is a hold on the last milestone
        if (!native) {
          const f = (k: number) => `translate3d(${(-pp * D * k).toFixed(1)}px,0,0)`;
          put("w", world, f(1)); put("s", slow, f(0.5)); put("g", fg, f(1.4));
          put("f", fill, `scaleX(${pp.toFixed(4)})`);
        }
        ms.forEach((m, i) => {
          const lit = m.classList.contains("on");
          if (!lit && pp >= THRESH[i]) m.classList.add("on");
          else if (lit && pp < THRESH[i] - 0.06) m.classList.remove("on");
        });
      }
      const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(document.body);
      document.fonts?.ready.then(measure);
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", measure);
      return () => { ro.disconnect(); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", measure); if (raf) cancelAnimationFrame(raf); };
    };
    let stop = mq.matches ? phone() : desk();
    const swap = () => {
      stop();
      ms.forEach((m) => m.classList.remove("on"));
      el.querySelectorAll<HTMLElement>(".tl-world,.tl-slow,.tl-fg,.tl-fill").forEach((n) => { n.style.transform = ""; });
      stop = mq.matches ? phone() : desk();
    };
    mq.addEventListener("change", swap);
    return () => { stop(); mq.removeEventListener("change", swap); };
  }, []);

  return (
    <div className="tl" ref={track}>
      <div className="tl-stick">
        <div className="tl-slow" aria-hidden="true">
          {[1, 2, 3].map((m) => <span key={m} className="tl-num" style={{ ["--m" as string]: m }}>{`0${m}`}</span>)}
        </div>
        <div className="tl-world">
          <i className="tl-line" aria-hidden="true" />
          <i className="tl-fill" aria-hidden="true" />
          <div className="tl-in">
            <b>How onboarding works</b>
            <span>From your first export to your first on-sale, with our team beside you.</span>
          </div>
          <div className="tl-hint" aria-hidden="true">
            Keep scrolling
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </div>
          {steps.map((s, i) => {
            const Scene = SCENES[i];
            return (
              <div key={s.t} className="tl-ms" style={{ ["--m" as string]: i + 1 }}>
                <i className="tl-node" aria-hidden="true" />
                <div className="tl-vis" aria-hidden="true">{Scene && <Scene />}</div>
                <div className="tl-txt">
                  <span className="tl-no">{String(i + 1).padStart(2, "0")} · {s.k}</span>
                  <b className="tl-h">{s.t}</b>
                  <span className="tl-d">{s.d}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="tl-fg" aria-hidden="true" />
        <div className="tl-puck" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/blocktickets-emblem-navy.svg" alt="" />
        </div>
      </div>
    </div>
  );
}
