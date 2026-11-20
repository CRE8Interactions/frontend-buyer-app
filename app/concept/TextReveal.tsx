"use client";

import { Fragment, useEffect, useRef } from "react";
import { docTop, stableVh } from "./viewport";

/* Scroll text reveal: the section is a tall track with one sticky screen. The first paragraph (with the pill)
   fills it, its words light up in order as you scroll, then it lifts away and the second paragraph rises in and
   lights up the same way, one paragraph per viewport. Word state follows the reading-text-reveal component: a
   smoothed value chases the scroll (12% per frame), the first floor(progress * words) words get the `on` class,
   and CSS fades each from 0.4 to 1 over 0.3s. Under prefers-reduced-motion everything is shown, unpinned. */
const cl = (x: number) => Math.min(1, Math.max(0, x));

export default function TextReveal({ pill, paras, accent }: { pill: string; paras: string[]; accent?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current, st = stage.current;
    if (!el || !st) return;
    const blks = [st.querySelector<HTMLElement>(".tr-b0"), st.querySelector<HTMLElement>(".tr-b1")];
    const go = st.querySelector<HTMLElement>(".tr-go");
    const ws = [0, 1].map((i) => Array.from(st.querySelectorAll<HTMLElement>(`.tr-b${i} .tr-c`)));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { ws.flat().forEach((w) => w.classList.add("on")); return; }
    const target = [0, 0], cur = [0, 0], shown = [0, 0];
    let vT = 0, vC = 0, vh = 0, goT = 0; // hand-over between the paragraphs: target and eased value
    const memo: Record<string, string> = {};
    const put = (k: string, node: HTMLElement | null, prop: "transform" | "opacity", v: string) => { if (node && memo[k] !== v) { memo[k] = v; node.style[prop] = v; } };
    let top = 0, height = 0, raf = 0;
    const measure = () => { top = docTop(el); height = el.offsetHeight; onScroll(); };
    const paint = (e: number, n: number) => {
      if (n === shown[e]) return;
      const lo = Math.min(n, shown[e]), hi = Math.max(n, shown[e]);
      for (let i = lo; i < hi; i++) ws[e][i].classList.toggle("on", n > shown[e]);
      shown[e] = n;
    };
    const frame = () => {
      raf = 0;
      let busy = false;
      vC += (vT - vC) * 0.14;
      if (Math.abs(vT - vC) < 0.0005) vC = vT; else busy = true;
      const v = vC * vC * (3 - 2 * vC);
      put("t0", blks[0], "transform", `translate3d(0,${(-0.4 * v * vh).toFixed(1)}px,0)`);
      put("o0", blks[0], "opacity", cl(1 - 2 * v).toFixed(3)); // the first paragraph is fully gone by the halfway point of the swap
      put("t1", blks[1], "transform", `translate3d(0,${((1 - v) * 0.24 * vh).toFixed(1)}px,0)`);
      put("o1", blks[1], "opacity", cl(2 * v - 1).toFixed(3)); // and only then does the second one start to appear, so they never overlap
      put("go", go, "opacity", goT.toFixed(3));
      for (let e = 0; e < 2; e++) {
        cur[e] += (target[e] - cur[e]) * 0.12;
        if (Math.abs(target[e] - cur[e]) > 0.001) { busy = true; paint(e, Math.floor(cur[e] * ws[e].length)); }
        else { cur[e] = target[e]; paint(e, Math.floor(target[e] * ws[e].length)); }
      }
      if (busy) raf = requestAnimationFrame(frame);
    };
    function onScroll() {
      vh = stableVh();
      const span = height - vh;
      const x = span > 0 ? cl((window.scrollY - top) / span) : 0;
      target[0] = cl((x - 0.04) / 0.36);
      target[1] = cl((x - 0.62) / 0.3);
      vT = cl((x - 0.46) / 0.16); // eased in frame(), so the swap glides instead of tracking every scroll tick
      const gone = cl((vh - (top + height - window.scrollY)) / (0.2 * vh));
      goT = cl(8 * target[0]) * (1 - gone);
      if (!raf) raf = requestAnimationFrame(frame);
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(document.body);
    document.fonts?.ready.then(measure);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", measure); if (raf) cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className="tr" ref={root}>
      <div className="tr-stick" ref={stage}>
      {paras.map((text, pi) => {
        const words = text.split(" ");
        // words of the accent phrase (if it is in this paragraph) are green instead of ink
        const at = accent ? text.indexOf(accent) : -1;
        const g0 = at < 0 ? -1 : text.slice(0, at).split(" ").length - 1;
        const g1 = at < 0 ? -1 : g0 + accent!.split(" ").length;
        return (
          <div key={pi} className={`tr-blk tr-b${pi}`}>
            <div className="tr-in">
              {pi === 0 && <span className="tr-pill">{pill}</span>}
              <p className="tr-t" aria-label={text}>
                {words.map((w, wi) => (
                  <Fragment key={wi}>
                    {wi === g0 && wi > 0 && <br className="tr-br" aria-hidden="true" />}
                    <span className={wi >= g0 && wi < g1 ? "tr-c tr-g" : "tr-c"} aria-hidden="true">{w}</span>
                    {" "}
                  </Fragment>
                ))}
              </p>
            </div>
          </div>
        );
      })}
      <span className="tr-go" aria-hidden="true"><svg viewBox="0 0 24 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 3 9 8 9-8" /></svg></span>
      </div>
    </div>
  );
}
