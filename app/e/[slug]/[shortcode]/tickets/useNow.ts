"use client";

import { useEffect, useState } from "react";

/** the current time, from the first moment the page is in the browser (null on the server, so the two renders agree). It only ticks while `active`: the clock
    lives inside the small parts that show it, and stops while the seat map is open, so a tick never re-renders the map. */
export function useNow(active = true) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [active]);
  return now;
}
