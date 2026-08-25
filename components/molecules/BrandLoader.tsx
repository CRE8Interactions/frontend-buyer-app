/**
 * BrandLoader — the full-screen launch loader from Claude Design "Loaders.dc.html".
 *
 * Shopper org/event routes use the "tenant" variant. Home, browse, and Our
 * Story use the "blocktickets" spinner.
 *
 * Keyframes (bt-stack / bt-bar / bt-rise / bt-spin / bt-breathe) live in
 * app/globals.css so the motion runs on first paint (works in server
 * components — no "use client" needed).
 */

import { LOADER_MESSAGE } from "@/lib/loaderMessages";

const NAVY = "#051b35";
const GREEN = "#a6e773";
const GREEN_D = "#7fbe4d";
const LOCKUP = "/blocktickets-logo.svg";
const DEFAULT_ACCENT = "#051b35";
const DEFAULT_LOGO = "/blocktickets-emblem-navy.svg";

/**
 * A load can hand off between the boot splash, the route loader, and a page's
 * own loader. Each is a separate element, so anchoring every animation to the
 * document clock keeps the motion running instead of restarting on each swap.
 * Entrances (`loop: false`) land already finished so they never replay.
 */
function motionPhase<T extends { style: CSSStyleDeclaration }>(
  durationMs: number,
  options: { loop?: boolean; staggerMs?: number } = {},
) {
  return (el: T | null) => {
    if (!el || typeof performance === "undefined") return;
    const elapsed = performance.now();
    const offset =
      options.loop === false
        ? -Math.min(elapsed, durationMs)
        : (options.staggerMs || 0) - (elapsed % durationMs);
    el.style.animationDelay = `${Math.round(offset)}ms`;
  };
}

type Props = {
  variant?: "blocktickets" | "tenant";
  /** Tenant background/accent colour (tenant variant). */
  accent?: string;
  /** Tenant mark shown inside the ring (tenant variant). */
  logoSrc?: string;
  /** Tenant name shown under the mark (tenant variant). */
  name?: string;
  /** Sub-line message under the loader. */
  message?: string;
  /** Show the "powered by Blocktickets" lockup (tenant variant). */
  poweredBy?: boolean;
  /** Fill a parent (e.g. seat-map modal) instead of covering the viewport. */
  embedded?: boolean;
};

export default function BrandLoader({
  variant = "tenant",
  accent = DEFAULT_ACCENT,
  logoSrc = DEFAULT_LOGO,
  name,
  message = LOADER_MESSAGE,
  poweredBy = false,
  embedded = false,
}: Props) {
  const tenant = variant === "tenant";
  const onLight = embedded;
  const bg = onLight ? "transparent" : tenant ? accent : NAVY;
  const glow = tenant
    ? "radial-gradient(120% 90% at 50% 10%, rgba(255,255,255,0.14), rgba(0,0,0,0) 62%)"
    : "radial-gradient(120% 90% at 50% 8%, rgba(127,190,77,0.16), rgba(5,27,53,0) 62%)";
  const barGrad = tenant
    ? "linear-gradient(90deg, rgba(255,255,255,0) 0%, #ffffff 50%, rgba(255,255,255,0) 100%)"
    : "linear-gradient(90deg, rgba(166,231,115,0) 0%, #a6e773 50%, rgba(166,231,115,0) 100%)";
  const ringTrack = onLight ? "rgba(5,27,53,0.12)" : "rgba(255,255,255,0.18)";
  const ring = onLight ? accent : "#ffffff";
  const titleColor = onLight ? NAVY : "#fff";
  const msgColor = onLight ? "rgba(5,27,53,0.45)" : "rgba(255,255,255,0.62)";

  return (
    <div
      role="status"
      aria-label="Loading"
      aria-busy="true"
      style={{ position: embedded ? "absolute" : "fixed", inset: 0, zIndex: embedded ? 1 : 60, background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: tenant ? 26 : 30, overflow: "hidden", fontFamily: "'Geist', system-ui, -apple-system, sans-serif" }}
      data-bt-tenant-loader={tenant ? "" : undefined}
      data-bt-platform-loader={tenant ? undefined : ""}
      data-bt-embedded-loader={embedded ? "" : undefined}
      suppressHydrationWarning
    >
      {onLight ? null : (
        <div style={{ position: "absolute", inset: 0, background: glow, pointerEvents: "none" }} />
      )}

      {tenant ? (
        <>
          <div style={{ position: "relative", width: 132, height: 132, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg ref={motionPhase(1500)} viewBox="0 0 120 120" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", animation: "bt-spin 1.5s linear infinite" }}>
              <circle cx="60" cy="60" r="55" fill="none" stroke={ringTrack} strokeWidth="3" />
              <circle cx="60" cy="60" r="55" fill="none" stroke={ring} strokeWidth="3" strokeLinecap="round" strokeDasharray="86 260" />
            </svg>
            <div style={{ width: 96, height: 96, borderRadius: 999, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, boxSizing: "border-box", boxShadow: "0 8px 30px rgba(0,0,0,0.18)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img ref={motionPhase(1800)} src={logoSrc} alt={name || ""} style={{ maxWidth: "100%", maxHeight: "100%", animation: "bt-breathe 1.8s ease-in-out infinite" }} />
            </div>
          </div>
          <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            {name && <div ref={motionPhase(500, { loop: false })} style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em", color: titleColor, animation: "bt-rise 500ms ease-out both" }}>{name}</div>}
            <div style={{ fontSize: 12, fontWeight: 500, color: msgColor }}>{message}</div>
          </div>
          {poweredBy && (
            <div style={{ position: "absolute", bottom: 24, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOCKUP} alt="Blocktickets" style={{ width: 96, opacity: 0.5 }} />
            </div>
          )}
        </>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={motionPhase(500, { loop: false })} src={LOCKUP} alt="Blocktickets" style={{ position: "relative", width: 196, animation: "bt-rise 500ms ease-out both" }} />
          <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: 7, height: 34 }}>
            {[GREEN, GREEN, GREEN, GREEN_D, GREEN_D].map((c, i) => (
              <span key={i} ref={motionPhase(1500, { staggerMs: i * 120 })} style={{ width: 12, height: 12, borderRadius: 3, background: c, animation: "bt-stack 1.5s ease-in-out infinite", animationDelay: `${i * 120}ms` }} />
            ))}
          </div>
          <div style={{ position: "absolute", bottom: 28, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.02em", color: "rgba(255,255,255,0.55)" }}>{message}</div>
            <div style={{ width: 148, height: 3, borderRadius: 999, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
              <div ref={motionPhase(1350)} style={{ width: "100%", height: "100%", background: barGrad, animation: "bt-bar 1.35s linear infinite" }} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
