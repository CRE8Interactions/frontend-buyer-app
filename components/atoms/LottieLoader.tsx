"use client";

import { useEffect, useRef } from "react";
import type { AnimationItem } from "lottie-web";

/* Blocktickets loader (Lottie, 7s loop, vector only, 566 x 707).
   lottie-web is imported on demand so it never lands in the main bundle, and the JSON is
   fetched from /public so it streams while the loader is already on screen.
   Under reduced motion it stops on the fully drawn last frame. */
const SRC = "/animations/blocktickets-loader.json";
const RATIO = 707 / 566;

export default function LottieLoader({ size = 260, label = "Loading", className = "" }: { size?: number; label?: string; className?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let anim: AnimationItem | undefined;
    let cancelled = false;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // the JSON and the player download in parallel (the page preloads the JSON with a matching fetch)
    Promise.all([import("lottie-web"), fetch(SRC, { credentials: "same-origin" }).then((r) => r.json())]).then(([{ default: lottie }, data]) => {
      if (cancelled || !host.current) return;
      anim = lottie.loadAnimation({
        container: host.current,
        renderer: "svg",
        loop: !reduce,
        autoplay: !reduce,
        animationData: data,
        rendererSettings: { preserveAspectRatio: "xMidYMid meet" },
      });
      if (reduce) anim.goToAndStop(279, true);
    }).catch(() => {});
    return () => {
      cancelled = true;
      anim?.destroy();
    };
  }, []);

  return (
    <div
      ref={host}
      role="img"
      aria-label={label}
      className={className}
      style={{ width: size, height: Math.round(size * RATIO), maxWidth: "100%" }}
    />
  );
}
