"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Reveal from "./Reveal";
import { stableVh } from "./viewport";

/* Scroll showcase for the AI engine. From 960px up the stage is pinned while the steps on the
   left advance with scroll and the artwork on the right swaps; below that each step is a card
   with its own artwork. The active step only changes state, all motion is CSS. */
export default function Engine({ items, panels }: {
  items: { k: string; t: string; d: string }[];
  panels: ReactNode[];
}) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const mq = window.matchMedia("(min-width: 960px)");
    let raf = 0;
    const update = () => {
      raf = 0;
      if (!mq.matches) { setActive(0); return; }
      const r = el.getBoundingClientRect();
      const span = r.height - stableVh();
      const p = span > 0 ? Math.min(0.9999, Math.max(0, (-r.top + 96) / span)) : 0;
      setActive(Math.floor(p * items.length));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [items.length]);

  /* The artwork only starts playing once it is on screen: each inline card (below 960px) and
     the pinned stage (from 960px) get a `seen` class the first time they are in view. */
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const targets = [...el.querySelectorAll<HTMLElement>(".en-inline, .en-stage")];
    if (!("IntersectionObserver" in window)) { targets.forEach((t) => t.classList.add("seen")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("seen"); io.unobserve(e.target); } });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  return (
    <div className="en" ref={track} style={{ ["--n" as string]: items.length }}>
      <div className="en-sticky">
        <ol className="en-list">
          {items.map((it, i) => (
            <Reveal as="li" key={it.k} className="en-li">
              <div className={`en-it${i === active ? " on" : ""}${i < active ? " done" : ""}`}>
                <p className="n-k">{it.k}</p>
                <h3>{it.t}</h3>
                <div className="en-body"><p>{it.d}</p></div>
                <div className="en-inline">{panels[i]}</div>
              </div>
            </Reveal>
          ))}
        </ol>
        <div className="en-stage" aria-hidden="true">
          {panels.map((p, i) => <div key={i} className={`en-p${i === active ? " on" : ""}`}>{p}</div>)}
        </div>
      </div>
    </div>
  );
}
