"use client";

import { useEffect } from "react";

/**
 * Keeps the screen on while the component is mounted, so a pass held up at a gate does not dim or lock mid-scan.
 * The browser drops the lock whenever the tab is hidden, so it is asked for again when the person comes back.
 * Where the Screen Wake Lock API is missing (older Safari, some in-app browsers) or the request is refused (low
 * battery), nothing happens and the screen behaves as usual.
 */
export function useWakeLock(active = true) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let stopped = false;
    const request = async () => {
      try {
        const next = await navigator.wakeLock.request("screen");
        if (stopped) { void next.release(); return; }
        lock = next;
      } catch {
        /* refused: the screen just behaves as usual */
      }
    };
    const onVisible = () => { if (document.visibilityState === "visible") void request(); };
    void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, [active]);
}
