"use client";

import { useEffect, useRef, useState } from "react";

/* How we build. On wide screens a large staircase stays pinned beside the three statements and gains one brick as
   each statement reaches the middle of the screen; the statement in the middle is the one in full ink. On small
   screens each statement carries its own small staircase instead. Without JS (or before it runs) every brick and
   every statement is fully shown; the dimmed and hidden states only exist once "is-js" is set. Bricks move with
   CSS transitions, so scrolling back and forth retargets them instead of restarting. */
type Step = { k: string; t: string; d: string };

export default function Build({ steps }: { steps: Step[] }) {
  const [on, setOn] = useState(0);
  const [js, setJs] = useState(false);
  const rows = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    setJs(true);
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) setOn(rows.current.indexOf(e.target as HTMLLIElement)); });
    }, { rootMargin: "-46% 0px -46% 0px" });
    rows.current.forEach((r) => r && io.observe(r));
    return () => io.disconnect();
  }, []);

  return (
    <div className={`os-build${js ? " is-js" : ""}`}>
      <div className="os-build-art" aria-hidden="true">
        <div className="os-big">
          {steps.map((s, i) => (
            <i key={s.k} className={`os-bk os-bigbk${i <= on ? " is-in" : ""}`} style={{ ["--s" as string]: i }}><b>{s.k}</b></i>
          ))}
        </div>
      </div>
      <ol className="os-ways">
        {steps.map((s, i) => (
          <li key={s.k} ref={(el) => { rows.current[i] = el; }} className={`os-way${i === on ? " is-on" : ""}`}>
            <div className="os-run" aria-hidden="true">{steps.slice(0, i + 1).map((b) => <i key={b.k} className="os-bk" />)}</div>
            <h3>{s.t}</h3>
            <p>{s.d}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
