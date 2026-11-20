"use client";

import { useEffect, useState } from "react";

/* Twenty short lines for the waiting visitor. One is picked at random on arrival; if the wait runs on, the next one (in a shuffled order, never the same twice in a row) fades in every few seconds.
   Under reduced motion it keeps the first line still. The lines are decoration, so assistive tech skips them: the loader's own label ("Loading") is what it announces. */
export const LOADER_QUIPS = [
  "Warming up the ice…",
  "Finding you a seat with legroom…",
  "Asking the mascot nicely…",
  "Untangling the nacho line…",
  "Counting every last seat…",
  "Waiting for the Zamboni to finish…",
  "Stretching before the big game…",
  "Tearing the perforations very gently…",
  "Checking it isn’t too late to tailgate…",
  "Polishing the scoreboard…",
  "Teaching the turnstile your name…",
  "Pretending to be a very fast server…",
  "Sneaking past the queue, legally…",
  "Locating the good seats. And the others…",
  "Inflating the foam fingers…",
  "Doing the wave, one person at a time…",
  "Almost there. Probably. Yes.",
  "Hunting for a ticket that isn’t lost…",
  "Fetching the halftime show…",
  "Practising our victory dance…",
] as const;

const EVERY = 3600;

function shuffled(n: number) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export default function LoaderQuip({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  const [i, setI] = useState<number | null>(null);

  useEffect(() => {
    const order = shuffled(LOADER_QUIPS.length);
    let at = 0;
    setI(order[0]);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => { at = (at + 1) % order.length; setI(order[at]); }, EVERY);
    return () => clearInterval(t);
  }, []);

  /* the line's height is held from the first paint, so nothing jumps when the text arrives */
  return (
    <p aria-hidden="true" className={className} style={{ minHeight: "1.5em", margin: 0, textAlign: "center", ...style }}>
      {i !== null && <span key={i} style={{ display: "inline-block", animation: "bt-rise 500ms ease-out both" }}>{LOADER_QUIPS[i]}</span>}
    </p>
  );
}
