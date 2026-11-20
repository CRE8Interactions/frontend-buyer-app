"use client";

import { preload } from "react-dom";
import { useEffect, useRef } from "react";
import Button from "@/components/atoms/Button";
import { stableVh } from "../concept/viewport";
import { ArrowRight, HandPointing } from "@phosphor-icons/react";

/* The story is one pinned stage: the opening puck-drop photo gives way to an overhead arena.
   Each passage of text carries its own state of the arena (data-s on the stage):
   it splits into two worlds with a gap, a bridge lands in the gap, a ripple of listening runs out from the
   rink, the sections fill in one after another, a second ring grows around the first, and then one picture for each
   belief. Words in the text that name a part of the picture (enterprise, budget, the gap) light that part when they
   are hovered, focused or tapped. The states are CSS transitions switched by an IntersectionObserver, so they behave
   the same with a thumb as with a trackpad and can be interrupted at any point. */

type Side = "e" | "b" | "g";
const CX = 320, CY = 240, SX = 1.22;
const rad = (d: number) => (d * Math.PI) / 180;
const P = (r: number, deg: number): [number, number] => [CX + r * SX * Math.cos(rad(deg)), CY + r * Math.sin(rad(deg))];
const sideOf = (k: number): Side => ([3, 4, 5, 6].includes(k) ? "e" : [8, 9, 0, 1].includes(k) ? "b" : "g");
const FANS = new Set(["0:7", "3:4", "3:10", "5:6", "7:9", "8:3", "9:12"]);
const HERO = new Set(["1:3", "5:8", "8:10"]);
const ORIGIN = P(123, 18); // the middle of the section the wave starts from

const sectors = (["in", "out"] as const).flatMap((ring) =>
  Array.from({ length: 10 }, (_, k) => {
    const [ri, ro, rows] = ring === "in" ? [96, 150, [4, 5, 6]] : [160, 212, [5, 6, 7]];
    const a0 = k * 36 + 2.5, a1 = k * 36 + 33.5;
    const pts: [number, number][] = [];
    for (let a = a0; a <= a1 + 0.01; a += 3) pts.push(P(ro, a));
    for (let a = a1; a >= a0 - 0.01; a -= 3) pts.push(P(ri, a));
    const d = "M" + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" L") + "Z";
    const i = ring === "in" ? k : 10 + k;
    const dots: { cx: number; cy: number; id: string; d: number; d3: number; dr: number }[] = [];
    let n = 0;
    rows.forEach((cols, r) => {
      const rr = ri + (ro - ri) * (0.2 + r * 0.3);
      for (let c = 0; c < cols; c++) {
        const a = a0 + 5 + ((a1 - a0 - 10) * (c + 0.5)) / cols;
        const [cx, cy] = P(rr, a);
        dots.push({ cx, cy, id: `${i}:${n++}`, d: Math.round(Math.hypot(cx - CX, cy - CY) * 3.2), d3: Math.round(Math.hypot(cx - ORIGIN[0], cy - ORIGIN[1]) * 2.6), dr: Math.round((260 - Math.hypot(cx - CX, cy - CY)) * 3.4) });
      }
    });
    return { i, k, ring, side: sideOf(k), d, dots };
  }),
);

const fanDots = sectors.flatMap((x) => x.dots).filter((d) => FANS.has(d.id));

const Hl = ({ k, children }: { k: Side; children: React.ReactNode }) => <span className="os-hl" data-hl={k} tabIndex={0}>{children}</span>;

// Time is a normalized scroll position. The camera starts on the puck, with the rink as a big window on the photograph, and
// pulls back until the whole arena is in frame and the photograph has faded into the ice.
const STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SHOT_DURATION = 1000;
const SHOT_START = 0.88;
const STEP_BAND_INSET = 46;

function openingAnimations(stage: HTMLElement) {
  const svg = stage.querySelector<SVGSVGElement>(".os-arena");
  const world = stage.querySelector(".os-world");
  const img = stage.querySelector(".os-hero-img");
  const rps = stage.querySelector(".os-rps");
  const caption = stage.querySelector(".os-photo-cap");
  const seats = stage.querySelector(".os-seats");
  const scrim = stage.querySelector(".os-scrim");
  if (!svg || !world || !img || !rps || !caption || !seats || !scrim || !world.animate) return [];

  /* how far in the camera starts: the rink (184 units wide) becomes a window about 60% of the screen wide, or the full panel on a phone */
  const box = svg.getBoundingClientRect();
  if (!box.width || !box.height) return [];
  /* the arena is drawn at the largest size that fits its box (the box can be wider than the picture on a short panel) */
  const unit = Math.min(box.width / 640, box.height / 480);
  const w = unit * 640;
  const rinkPx = unit * 184;
  const target = window.innerWidth >= 960 ? Math.min(window.innerWidth * 0.56, w * 0.94) : w * 0.96;
  /* and the window must fit the panel's height too (a wide, short panel on a tablet) */
  const panelH = stage.querySelector(".os-stage-in")?.getBoundingClientRect().height ?? 0;
  const fit = panelH ? Math.min(target, panelH * 0.84 * (184 / 108)) : target;
  const zoom = Math.max(1.6, Math.min(6, fit / rinkPx));

  const timing: KeyframeAnimationOptions = { duration: SHOT_DURATION, fill: "both" };
  const fade = (to: number) => [{ opacity: 1 }, { opacity: 0, offset: to }, { opacity: 0 }];
  const tracks = [
    world.animate([
      { transform: `scale(${zoom.toFixed(3)})`, offset: 0, easing: "cubic-bezier(.5,0,.15,1)" },
      { transform: "scale(1)", offset: 0.86 },
      { transform: "scale(1)", offset: 1 },
    ], timing),
    img.animate([{ opacity: 1 }, { opacity: 1, offset: 0.3 }, { opacity: 0, offset: 0.74 }, { opacity: 0 }], timing),
    rps.animate(fade(0.2), timing),
    caption.animate(fade(0.18), timing),
    seats.animate([{ opacity: 0.4 }, { opacity: 0.4, offset: 0.2 }, { opacity: 1, offset: 0.8 }, { opacity: 1 }], timing),
    scrim.animate([{ opacity: 1 }, { opacity: 1, offset: 0.25 }, { opacity: 0, offset: 0.7 }, { opacity: 0 }], timing),
  ];
  tracks.forEach((track) => {
    track.pause();
    track.currentTime = 0;
  });
  return tracks;
}

export default function Story() {
  preload("/our-story-hero.jpg", { as: "image", fetchPriority: "high" });
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current, st = stage.current;
    if (!el || !st) return;
    const steps = Array.from(el.querySelectorAll<HTMLElement>(".os-step"));
    const nextStep = steps[1];
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let tracks = openingAnimations(st);
    let frame = 0;
    let nextStepTop = 0;
    /* the step that counts as current is the one crossing a thin band: mid-screen on desktop, in the text area under the pinned arena on a phone */
    const phone = window.matchMedia("(max-width:959px)").matches;
    const bandTop = phone ? 58 : STEP_BAND_INSET, bandBottom = phone ? 41 : STEP_BAND_INSET;
    const shotEnd = 1 - bandBottom / 100;
    let viewport = 0;
    let lastProgress = -1;
    const prog = Array.from(el.querySelectorAll<HTMLElement>(".os-prog i"));

    let current = 0;
    const set = (i: number) => {
      /* the one-shot flourishes of a state (blocks lifting in, a wave, a drawn ring) only play going forward: scrolling back simply
         runs the state's transitions in reverse */
      st.dataset.dir = i < current ? "b" : "f";
      current = i;
      if (steps[i].dataset.st) st.dataset.s = steps[i].dataset.st;
      st.dataset.sc = steps[i].dataset.sc || "arena";
      steps.forEach((s, k) => s.classList.toggle("on", k === i));
      prog.forEach((p, k) => p.classList.toggle("on", k <= i));
    };

    const paintOpening = () => {
      frame = 0;
      const distance = nextStepTop - window.scrollY;
      /* the camera pull-back ends as the second passage reaches the middle of the screen; the two worlds then drift apart on the same
         scroll, 0 to 1, so the move reads as a continuation of the arena instead of a separate animation */
      st.style.setProperty("--sp", Math.max(0, Math.min(1, (viewport * shotEnd - distance) / (viewport * 0.44))).toFixed(3));
      if (distance >= viewport * SHOT_START && st.dataset.sc !== "photo") set(0);
      let progress = 1;
      if (st.dataset.sc === "photo") {
        // End where the next passage enters the observer's center band.
        /* the pull-back starts with the first pixel of scroll and ends when the next passage reaches the band */
        const travel = Math.max(1, nextStepTop - viewport * shotEnd);
        progress = reduceMotion.matches ? 0 : Math.max(0, Math.min(1, (nextStepTop - distance) / travel));
      }
      if (progress === lastProgress) return;
      lastProgress = progress;
      st.toggleAttribute("data-match-cut", progress > 0);
      tracks.forEach((track) => { track.currentTime = progress * SHOT_DURATION; });
    };
    const scheduleOpening = () => {
      if (!frame) frame = window.requestAnimationFrame(paintOpening);
    };
    let zoomWidth = 0;
    const measureOpening = () => {
      viewport = stableVh();
      nextStepTop = nextStep.getBoundingClientRect().top + window.scrollY;
      const box = st.querySelector(".os-arena")?.getBoundingClientRect();
      const w = box ? Math.min(box.width / 640, box.height / 480) * 640 : 0;
      if (w && (!tracks.length || Math.abs(w - zoomWidth) > 1)) {
        /* the starting zoom depends on the arena's size: build when it is first measured, and again when the screen changes */
        tracks.forEach((track) => track.cancel());
        tracks = openingAnimations(st);
        zoomWidth = w;
        lastProgress = -1;
      }
      scheduleOpening();
    };
    const openingResize = new ResizeObserver(measureOpening);
    {
      measureOpening();
      openingResize.observe(steps[0]);
      openingResize.observe(st);
      const arenaEl = st.querySelector(".os-arena");
      if (arenaEl) openingResize.observe(arenaEl);
      window.addEventListener("scroll", scheduleOpening, { passive: true });
      window.addEventListener("resize", measureOpening);
      reduceMotion.addEventListener("change", scheduleOpening);
    }


    set(0);
    st.classList.add("ready", "intro");
    el.classList.add("intro");
    const introDone = window.setTimeout(() => { st.classList.remove("intro"); el.classList.remove("intro"); }, 2600);
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) set(steps.indexOf(e.target as HTMLElement)); });
      window.cancelAnimationFrame(frame);
      paintOpening();
    }, { rootMargin: `-${bandTop}% 0px -${bandBottom}% 0px` });
    steps.forEach((s) => io.observe(s));

    /* words that name a part of the picture light that part: hover, focus, or a tap that lets go after a moment */
    let t = 0;
    const on = (e: Event) => { const h = (e.target as HTMLElement).closest<HTMLElement>(".os-hl"); if (h) { clearTimeout(t); st.dataset.hl = h.dataset.hl; } };
    const off = (e: Event) => { if ((e.target as HTMLElement).closest(".os-hl")) { clearTimeout(t); delete st.dataset.hl; } };
    const tap = (e: Event) => { const h = (e.target as HTMLElement).closest<HTMLElement>(".os-hl"); if (h) { st.dataset.hl = h.dataset.hl; clearTimeout(t); t = window.setTimeout(() => delete st.dataset.hl, 1800); } };
    el.addEventListener("pointerover", on); el.addEventListener("pointerout", off); el.addEventListener("focusin", on); el.addEventListener("focusout", off); el.addEventListener("click", tap);
    return () => {
      io.disconnect();
      openingResize.disconnect();
      window.removeEventListener("scroll", scheduleOpening);
      window.removeEventListener("resize", measureOpening);
      reduceMotion.removeEventListener("change", scheduleOpening);
      window.cancelAnimationFrame(frame);
      tracks.forEach((track) => track.cancel());
      st.removeAttribute("data-match-cut");
      el.removeEventListener("pointerover", on);
      el.removeEventListener("pointerout", off);
      el.removeEventListener("focusin", on);
      el.removeEventListener("focusout", off);
      el.removeEventListener("click", tap);
      clearTimeout(t);
      clearTimeout(introDone);
    };
  }, []);

  return (
    <section ref={root} className="os-story">
      <div className="os-sheet-dark">
        <div className="os-stage" ref={stage} data-s="1" data-sc="photo">
          <div className="os-prog" aria-hidden="true">{STEPS.map((k) => <i key={k} />)}</div>
          <div className="os-stage-in">
            <svg viewBox="0 0 640 480" className="os-arena" role="img" aria-label="A round arena seen from above, built from two rings of seating sections around a rink. It changes as the story is read.">
              <defs>
                <clipPath id="os-rinkclip"><rect x="228" y="186" width="184" height="108" rx="34" /></clipPath>
                <radialGradient id="os-ga" cx=".3" cy=".3" r=".8"><stop offset="0" stopColor="#fff" /><stop offset=".55" stopColor="#9db8ff" /><stop offset="1" stopColor="#7ea0f5" /></radialGradient>
                <radialGradient id="os-gb" cx=".3" cy=".3" r=".8"><stop offset="0" stopColor="#fff" /><stop offset=".55" stopColor="#a4e8c1" /><stop offset="1" stopColor="#6fd1a0" /></radialGradient>
                <radialGradient id="os-gc" cx=".3" cy=".3" r=".8"><stop offset="0" stopColor="#fff" /><stop offset=".55" stopColor="#d6a8ff" /><stop offset="1" stopColor="#a86bf0" /></radialGradient>
                <mask id="os-em" maskUnits="userSpaceOnUse" x="296" y="214" width="48" height="52" style={{ maskType: "alpha" }}>
                  <image href="/blocktickets-emblem-navy.svg" x="296" y="214" width="48" height="52" />
                </mask>
              </defs>
              <g className="os-world">
              <g clipPath="url(#os-rinkclip)">
                <g className="os-hero-img">
                  <image href="/our-story-hero.jpg" x="214.4" y="166" width="200" height="133.33" preserveAspectRatio="none" />
                </g>
              </g>
              <g className="os-rink">
                <rect className="os-field" x="228" y="186" width="184" height="108" rx="34" />
                <line x1="320" y1="186" x2="320" y2="294" /><line x1="256" y1="186" x2="256" y2="294" /><line x1="384" y1="186" x2="384" y2="294" />
                <circle cx="320" cy="240" r="30" />
                <rect className="os-emblem" x="296" y="214" width="48" height="52" mask="url(#os-em)" />
              </g>
              <g className="os-voices">
                {[[520, 76, "a"], [120, 76, "b"], [120, 404, "c"], [520, 404, "a"]].map(([x, y, g], i) => (
                  <g key={i} className="os-voice" style={{ ["--v" as string]: i }}>
                    <line className="os-vl" x1={x} y1={y} x2="320" y2="240" />
                    {[0, 1, 2].map((w) => <circle key={w} className="os-vw" cx={x} cy={y} r="22" style={{ ["--w" as string]: w }} />)}
                    <circle cx={x} cy={y} r="22" fill={`url(#os-g${g})`} />
                  </g>
                ))}
              </g>
              <g className="os-listen">
                <circle className="os-hear" cx="320" cy="240" r="40" />
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => <rect key={k} className="os-bar2" x={278 + k * 10} y="228" width="5" height="24" rx="2.5" style={{ ["--k" as string]: k, ["--h" as string]: [0.5, 0.9, 0.6, 1.5, 1, 1.4, 0.7, 1.1, 0.5][k] }} />)}
              </g>
              <g className="os-seats">
                {sectors.map((s) => (
                  <g key={s.i} className={`os-b${s.ring === "out" ? " os-o" : ""}`} data-k={s.side} data-i={s.i} data-p={s.ring === "in" && [0, 1, 3, 5, 6, 8].includes(s.k) ? "1" : undefined} style={{ ["--bi" as string]: s.k }}>
                    <path d={s.d} />
                    {s.dots.map((d) => (
                      <circle key={d.id} className="os-dot" cx={d.cx.toFixed(1)} cy={d.cy.toFixed(1)} r={s.ring === "out" ? 3.8 : 4.2} data-y={FANS.has(d.id) ? "1" : undefined} data-h={HERO.has(d.id) ? "1" : undefined} style={{ ["--d" as string]: d.d, ["--d3" as string]: d.d3, ["--dr" as string]: d.dr }} />
                    ))}
                  </g>
                ))}
              </g>
              <g className="os-pins">
                {Array.from({ length: 10 }, (_, k) => {
                  const [x, y] = P(157, k * 36 + 18);
                  return <circle key={k} className="os-pin" cx={x.toFixed(1)} cy={y.toFixed(1)} r="5.4" fill={`url(#os-g${["a", "b", "c"][k % 3]})`} style={{ ["--bi" as string]: k }} />;
                })}
              </g>
              <ellipse className="os-own" cx="320" cy="240" rx="290" ry="226" />
              <g className="os-gls">
                {fanDots.map((d, i) => (
                  <g key={d.id} transform={`translate(${d.cx.toFixed(1)} ${(d.cy - 16).toFixed(1)})`}>
                    <g className="gl" style={{ ["--i" as string]: i }}>
                      <path transform="scale(1.3)" d="M-10 -7.5h20a1 1 0 0 1 1 1v3.7a2.8 2.8 0 0 0 0 5.6v3.7a1 1 0 0 1-1 1h-20a1 1 0 0 1-1-1v-3.7a2.8 2.8 0 0 0 0-5.6v-3.7a1 1 0 0 1 1-1z" />
                      <path className="gl-p" transform="scale(1.3)" d="M3.5 -4.5v9" />
                    </g>
                  </g>
                ))}
              </g>
              <circle className="os-ppk" cx="606" cy="400" r="5" />
              <g className="os-fx">
                <g transform="translate(320 14)"><g className="os-fx-t">
                  <rect x="-72" y="-12" width="144" height="24" rx="12" />
                  <circle cx="-58" cy="0" r="3.6" className="os-fx-i" /><path className="os-fx-i" d="M-54.4 0H-43M-47 0v3M-50.6 0v2.2" />
                  <text x="-36" y="0.5">Your organization</text>
                </g></g>
                <g transform="translate(320 466)"><g className="os-fx-t">
                  <rect x="-46" y="-12" width="92" height="24" rx="12" />
                  <circle cx="-32" cy="0" r="3.2" className="os-fx-g" />
                  <text x="-22" y="0.5">Your fans</text>
                </g></g>
                <g transform="translate(574 452)"><g className="os-fx-t os-fx-p">
                  <rect x="-54" y="-12" width="108" height="24" rx="12" />
                  <circle cx="-40" cy="0" r="3.2" />
                  <text x="-30" y="0.5">The platform</text>
                </g></g>
                <g transform="translate(553 376)"><g className="os-fx-l">
                  <circle r="11.5" />
                  <rect x="-4.2" y="-0.8" width="8.4" height="6.4" rx="1.3" />
                  <path d="M-2.6 -1v-2.2a2.6 2.6 0 0 1 5.2 0V-1" />
                </g></g>
              </g>
              <g className="os-pr">
                <ellipse className="os-pr-ring" cx="320" cy="240" rx="262" ry="214" />
                <circle className="os-pr-tg" cx="320" cy="240" r="48" />
                <circle className="os-pr-tg" cx="320" cy="240" r="72" style={{ ["--r" as string]: 1 }} />
                {[[105, 117], [582, 240], [320, 454]].map(([x, y], i) => (
                  <line key={i} className="os-pr-ln" x1="320" y1="240" x2={x} y2={y} pathLength="1" style={{ ["--i" as string]: i }} />
                ))}
                <g className="os-pr-person">
                  <circle cx="320" cy="240" r="27" fill="url(#os-gb)" stroke="var(--dark)" strokeWidth="3" />
                  <circle cx="338.5" cy="258.5" r="6" fill="var(--green)" stroke="var(--dark)" strokeWidth="2.5" />
                </g>
                <g transform="translate(320 286)"><g className="os-pr-chip" style={{ ["--i" as string]: 0 }}>
                  <rect x="-52" y="-11" width="104" height="22" rx="11" /><text y="0.5" textAnchor="middle" className="os-pr-b">A real person</text>
                </g></g>
                <g transform="translate(105 117)"><g className="os-pr-chip" style={{ ["--i" as string]: 1 }}>
                  <rect x="-46" y="-12" width="92" height="24" rx="12" /><circle cx="-32" cy="0" r="3" /><text x="-23" y="0.5">Your venue</text>
                </g></g>
                <g transform="translate(578 240)"><g className="os-pr-chip" style={{ ["--i" as string]: 2 }}>
                  <rect x="-50" y="-12" width="100" height="24" rx="12" /><circle cx="-36" cy="0" r="3" /><text x="-27" y="0.5">Your season</text>
                </g></g>
                <g transform="translate(320 454)"><g className="os-pr-chip" style={{ ["--i" as string]: 3 }}>
                  <rect x="-46" y="-12" width="92" height="24" rx="12" /><circle cx="-32" cy="0" r="3" /><text x="-23" y="0.5">Your goals</text>
                </g></g>
                <g className="os-pr-no">
                  <text x="22" y="428">Not a chatbot</text>
                  <text x="22" y="450">Not a ticket queue</text>
                </g>
              </g>
              <text className="os-photo-cap" x="320" y="303.5" textAnchor="middle"><tspan className="os-cap-a">Niagara IceDogs</tspan><tspan className="os-cap-b" dx="3">Ceremonial puck drop</tspan></text>
              <g className="os-rps">
                <circle className="os-puck-ring" cx="320" cy="240" r="6.5" />
                <circle className="os-puck-ring" cx="320" cy="240" r="6.5" />
              </g>
              </g>
            </svg>
            <div className="os-scrim" aria-hidden="true" />
            <span className="os-tag t-e">Enterprise</span>
            <span className="os-tag t-b">Budget</span>
          </div>
        </div>

        <div className="os-steps">
          <article className="os-step os-opening" data-st="1" data-sc="photo">
            <h1 className="os-h1"><span>Sports organizations deserved</span>{" "}<span><em className="os-mark">a better option</em><i className="os-stop" aria-hidden="true" /></span></h1>
            <p className="os-lede">We started blocktickets for teams caught between expensive enterprise platforms and budget tools they’d outgrown.</p>
            <div className="os-actions">
              <Button href="/sell" size="lg"><span className="os-bt-l">Schedule a discovery call</span><span className="os-bt-s">Book a call</span> <ArrowRight weight="bold" aria-hidden /></Button>
              <Button href="#team" size="lg" variant="glass" data-variant="glass">Meet the team</Button>
            </div>
          </article>

          <article className="os-step" id="why" data-st="2" data-sc="arena" data-chapter="The gap">
            <h2 className="os-h2">The legacy platforms <em className="os-mark">weren’t built</em> for modern sports organizations.</h2>
            <p className="os-lede">Growing organizations were forced to choose between <Hl k="e">enterprise software they couldn’t justify</Hl> and <Hl k="b">budget systems that couldn’t keep up</Hl>.</p>
            <p className="os-sub">The <Hl k="g">gap</Hl> between those two worlds kept getting bigger.</p>
            <p className="os-hint"><HandPointing weight="bold" aria-hidden />Hover or tap the highlighted words</p>
          </article>

          <article className="os-step" data-st="3" data-sc="arena" data-chapter="Our platform">
            <h2 className="os-h2">So we built blocktickets.</h2>
            <p className="os-lede">A platform designed specifically for sports organizations.</p>
            <p className="os-sub">Enterprise capabilities, transparent pricing, and hands-on support in one place.</p>
          </article>

          <article className="os-step" id="build" data-st="3b" data-sc="arena" data-chapter="Built together">
            <h2 className="os-h2">Built block by block, with our partners.</h2>
            <p className="os-lede">Since day one, blocktickets has been built alongside the organizations that use it.</p>
            <p className="os-sub">Every improvement comes from understanding their challenges, listening to their feedback, and helping them grow.</p>
          </article>

          <article className="os-step" data-st="4" data-sc="arena" data-chapter="We listen">
            <h2 className="os-h2">We listen first.</h2>
            <p className="os-lede">Every partnership starts with understanding how an organization operates and where they want to go.</p>
          </article>

          <article className="os-step" data-st="5" data-sc="arena" data-chapter="Our purpose">
            <h2 className="os-h2">We build with purpose.</h2>
            <p className="os-lede">We focus on solving real challenges, not chasing trends or adding features for the sake of it.</p>
          </article>

          <article className="os-step" data-st="6" data-sc="arena" data-chapter="Growing together">
            <h2 className="os-h2">We grow together.</h2>
            <p className="os-lede">As our partners evolve, so does the platform.</p>
            <p className="os-sub">Improvements built for one organization often benefit others.</p>
          </article>

          <article className="os-step" data-st="7" data-sc="arena" data-chapter="Your data">
            <h2 className="os-h2">Your fans, <em className="os-mark">your data.</em></h2>
            <p className="os-lede">Every ticket purchase, attendance record, and fan interaction belongs to your organization.</p>
            <p className="os-sub">Not the platform.</p>
          </article>

          <article className="os-step" data-st="8" data-sc="arena" data-chapter="Support">
            <h2 className="os-h2">A partner, <em className="os-mark">not a help desk.</em></h2>
            <p className="os-lede">When you need support, you talk to someone who knows your venue, your season, and your goals.</p>
          </article>

          <article className="os-step" data-st="9" data-sc="arena" data-chapter="Shared success">
            <h2 className="os-h2">Success should be <em className="os-mark">shared.</em></h2>
            <p className="os-lede">When one organization solves a problem, everyone on the platform benefits from the improvement.</p>
          </article>
        </div>
      </div>
    </section>
  );
}
