"use client";

import { useState } from "react";

/* Partner quotes as one big stage. One quote at a time in large type; its key phrase gets a marker sweep and the
   words rise in one by one. The four portraits below are the controls: the active one carries a ring that fills
   over 7s, and when it completes the next quote plays. Hovering or pressing pauses it. All four quotes share one
   grid cell, so the stage never changes height. Under prefers-reduced-motion nothing auto-plays or animates. */
type Quote = { name: string; img: string; role: string; pre: string; hl: string; post: string };

/* split the whole quote into words (keeping punctuation attached) and flag the words that overlap the key phrase */
function tokens(q: Quote) {
  const text = q.pre + q.hl + q.post;
  const from = q.pre.length, to = from + q.hl.length;
  return [...text.matchAll(/\S+/g)].map((m, i) => ({ w: m[0], i, hl: m.index! < to && m.index! + m[0].length > from }));
}

export default function Quotes({ items }: { items: Quote[] }) {
  const [i, setI] = useState(0);
  const [run, setRun] = useState(0); // restarts the ring when the same quote is picked again
  const [paused, setPaused] = useState(false);
  const go = (n: number) => { setI(n); setRun((r) => r + 1); };

  return (
    <div className="qs" onPointerEnter={(e) => { if (e.pointerType === "mouse") setPaused(true); }} onPointerLeave={() => setPaused(false)} onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerCancel={() => setPaused(false)}>
      <span className="qs-mark" aria-hidden="true">“</span>
      <div className="qs-stage">
        {items.map((q, k) => {
          // group consecutive highlighted words so the marker runs through them in one piece
          const groups: { hl: boolean; ws: ReturnType<typeof tokens> }[] = [];
          tokens(q).forEach((t) => {
            const last = groups[groups.length - 1];
            if (last && last.hl === t.hl) last.ws.push(t); else groups.push({ hl: t.hl, ws: [t] });
          });
          return (
            <figure key={q.name} className={`qs-q${k === i ? " on" : ""}`} aria-hidden={k === i ? undefined : true}>
              <blockquote>
                <span className="qs-t">
                  {groups.map((g, gi) => {
                    const inner = g.ws.map((t, x) => (
                      <span key={t.i}>
                        <span className="qw" style={{ ["--i" as string]: t.i }}>{t.w}</span>
                        {x < g.ws.length - 1 ? " " : ""}
                      </span>
                    ));
                    return (
                      <span key={gi}>
                        {g.hl ? <mark className="qs-mk">{inner}</mark> : inner}
                        {gi < groups.length - 1 ? " " : ""}
                      </span>
                    );
                  })}
                </span>
              </blockquote>
              <figcaption>
                <span className="qs-n">{q.name}</span>
                <span className="qs-r">{q.role}</span>
              </figcaption>
            </figure>
          );
        })}
      </div>
      <div className="qs-faces" role="group" aria-label="Choose a partner quote">
        {items.map((q, k) => (
          <button key={q.name} type="button" className={`qs-f${k === i ? " on" : ""}`} aria-pressed={k === i} aria-label={`${q.name}, ${q.role}`} onClick={() => go(k)}>
            {k === i && <i key={run} className="qs-ring" data-paused={paused} onAnimationEnd={() => go((i + 1) % items.length)} />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={q.img} alt="" loading="lazy" decoding="async" />
          </button>
        ))}
      </div>
    </div>
  );
}
