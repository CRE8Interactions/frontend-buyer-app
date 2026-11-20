"use client";

import { useEffect, useState } from "react";
import StageSkeleton from "@/components/molecules/StageSkeleton";

/**
 * PageGate: keeps the page's skeleton on top until the page underneath is really finished.
 * It is rendered by the page itself (so it is in the first HTML and covers the page from the first paint) and lifts only when all of these hold:
 *  - the fonts have loaded,
 *  - every image near the top of the page has loaded (or failed, so one broken image cannot hold it),
 *  - nothing on the page still says aria-busy (its own client fetches),
 *  - the page has stopped changing for 350ms (client data has landed and rendered),
 * with a floor of 400ms so a fast page does not flicker, and a 7s ceiling so a stuck request never leaves the skeleton up for good
 * (a CSS timer in globals.css also hides it at 8s if scripts never run). It then fades out over 300ms.
 */
export default function PageGate({ variant = "stage", label = "Loading" }: { variant?: "stage" | "browse" | "search" | "season"; label?: string }) {
  const [phase, setPhase] = useState<"on" | "fading" | "off">("on");

  useEffect(() => {
    const start = performance.now();
    let last = start;
    let fade: ReturnType<typeof setTimeout> | undefined;
    const mo = new MutationObserver((muts) => {
      if (muts.some((m) => !(m.target instanceof Element ? m.target : m.target.parentElement)?.closest(".bt-sk"))) last = performance.now();
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });

    const ready = () => {
      const imgs = Array.from(document.images).every((i) => {
        if (i.closest(".bt-sk")) return true;
        const r = i.getBoundingClientRect();
        const near = r.bottom > 0 && r.top < window.innerHeight * 1.2;
        return !near || i.complete;
      });
      const fonts = !document.fonts || document.fonts.status !== "loading";
      const busy = !!document.querySelector('[aria-busy="true"]:not(.bt-sk)');
      return imgs && fonts && !busy;
    };
    const tick = setInterval(() => {
      const now = performance.now();
      const settled = ready() && now - last > 350 && now - start > 400;
      if (settled || now - start > 7000) {
        clearInterval(tick);
        mo.disconnect();
        setPhase("fading");
        fade = setTimeout(() => setPhase("off"), 320);
      }
    }, 100);
    return () => { clearInterval(tick); mo.disconnect(); if (fade) clearTimeout(fade); };
  }, []);

  if (phase === "off") return null;
  return <StageSkeleton variant={variant} label={label} gate done={phase === "fading"} />;
}
