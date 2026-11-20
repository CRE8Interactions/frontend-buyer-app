"use client";

import { useEffect, useState } from "react";

/* The rotating word in the "One platform" headline. All pills share one grid cell, so the headline never
   reflows while the word changes; the old pill slides up and fades, the next rises in. The full sentence is
   in the heading's aria-label, so this is decoration for assistive tech. Stays on the first word under
   prefers-reduced-motion. */
export default function Rotator({ items }: { items: { t: string; d: string }[] }) {
  const [i, setI] = useState(0);
  const [prev, setPrev] = useState(-1);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((cur) => { setPrev(cur); return (cur + 1) % items.length; }), 2600);
    return () => clearInterval(id);
  }, [items.length]);

  return (
    <span className="ns-rot" aria-hidden="true">
      {items.map((a, k) => (
        <span key={a.t} className={`ns-chip${k === i ? " on" : ""}${k === prev ? " out" : ""}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={a.d} /></svg>
          {a.t}
        </span>
      ))}
    </span>
  );
}
