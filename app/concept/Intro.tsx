"use client";

import { useEffect } from "react";

/* Controller for the loader that app/concept/layout.tsx puts first in the HTML. It lifts the cover once the hero
   video is actually playing AND the animation has been visible for at least BEAT ms (so it never flashes). A repeat visit
   in the same session with the video already buffered skips it. MAX caps a bad connection; with no video
   (reduced motion, error) it leaves after a short beat. Renders nothing. */
const BEAT = 1500;
const MAX = 9000;

export default function Intro() {
  useEffect(() => {
    const el = document.getElementById("n-intro");
    if (!el || el.dataset.s !== "on") return;
    const v = document.querySelector<HTMLVideoElement>(".n-video");
    const noVideo = !v || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try { seen = sessionStorage.getItem("concept-intro") === "1"; sessionStorage.setItem("concept-intro", "1"); } catch {}

    let closed = false, videoOk = false, timer = 0;
    const shownAt = () => (el.dataset.lottie ? ((window as unknown as { __ntShown?: number }).__ntShown ?? performance.now()) : 0);
    const close = () => {
      if (closed) return;
      closed = true; clearTimeout(timer); clearTimeout(maxT); mo.disconnect();
      el.dataset.s = "out";
      window.setTimeout(() => { el.dataset.s = "off"; }, 700);
    };
    const check = () => {
      if (closed || !videoOk) return;
      const at = shownAt();
      if (!at) return; // wait until the animation is actually on screen
      clearTimeout(timer);
      timer = window.setTimeout(close, Math.max(0, BEAT - (performance.now() - at)));
    };
    const mo = new MutationObserver(check);
    mo.observe(el, { attributes: true, attributeFilter: ["data-lottie"] });
    const maxT = window.setTimeout(close, MAX);

    const ready = () => { if (videoOk) return; videoOk = true; check(); };
    // "ready" means the video is actually playing frames (not just able to play), so the cover never lifts on a
    // frozen first frame. requestVideoFrameCallback fires when a frame is really presented.
    const isPlaying = () => !!v && !v.paused && v.currentTime > 0.05 && v.readyState >= 3;
    const tick = () => { if (isPlaying()) ready(); else if (!closed && !videoOk) v?.requestVideoFrameCallback?.(tick); };
    if (noVideo) { videoOk = true; timer = window.setTimeout(close, 700); }
    else if (v) {
      if (isPlaying() && seen) close(); // repeat visit, already running
      else {
        v.addEventListener("playing", tick);
        v.addEventListener("timeupdate", tick);
        v.addEventListener("error", ready, { once: true });
        v.play?.().catch(() => ready()); // autoplay refused (e.g. low-power mode): nothing to wait for
        tick();
      }
    }
    return () => { clearTimeout(timer); clearTimeout(maxT); mo.disconnect(); v?.removeEventListener("playing", tick); v?.removeEventListener("timeupdate", tick); v?.removeEventListener("error", ready); };
  }, []);
  return null;
}
