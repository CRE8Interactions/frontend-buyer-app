/**
 * BrandLoader — the full-screen launch loader from Claude Design "Loaders.dc.html".
 *
 * Two variants:
 *  - "blocktickets" (default): navy screen, white lockup, five stacking blocks
 *    and an indeterminate progress bar. Used as the global route/app-launch
 *    loader (app/loading.tsx).
 *  - "tenant": inherits a client's accent colour + mark so branded pages never
 *    flash our navy. A spinning ring wraps the tenant logo, with an optional
 *    "powered by Blocktickets" lockup.
 *
 * Keyframes (bt-stack / bt-bar / bt-rise / bt-spin / bt-breathe) live in
 * app/globals.css so the motion runs on first paint (works in server
 * components — no "use client" needed).
 */

import LoaderQuip from "@/components/atoms/LoaderQuip";
import LottieLoader from "@/components/atoms/LottieLoader";

const LOCKUP = "/blocktickets-logo.svg";

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
};

export default function BrandLoader({
  variant = "blocktickets",
  accent = "#8c0b42",
  logoSrc = "/nmstate/nmstate-logo-nowordmark.png",
  name,
  message = "Loading your tickets",
  poweredBy = true,
}: Props) {
  const tenant = variant === "tenant";
  const bg = tenant ? accent : "var(--bl-bg)";
  const glow = tenant
    ? "radial-gradient(120% 90% at 50% 10%, rgba(255,255,255,0.14), rgba(0,0,0,0) 62%)"
    : "none";
  const barGrad = tenant
    ? "linear-gradient(90deg, rgba(255,255,255,0) 0%, #ffffff 50%, rgba(255,255,255,0) 100%)"
    : "linear-gradient(90deg, rgba(166,231,115,0) 0%, var(--green) 50%, rgba(166,231,115,0) 100%)";

  return (
    <div
      className={tenant ? undefined : "bt-loader"}
      role="status"
      aria-label="Loading"
      aria-busy="true"
      style={{ position: "fixed", inset: 0, zIndex: 60, background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: tenant ? 26 : 30, overflow: "hidden", fontFamily: "'Geist', system-ui, -apple-system, sans-serif" }}
    >
      <div style={{ position: "absolute", inset: 0, background: glow, pointerEvents: "none" }} />

      {tenant ? (
        <>
          <div style={{ position: "relative", width: 132, height: 132, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 120 120" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", animation: "bt-spin 1.5s linear infinite" }}>
              <circle cx="60" cy="60" r="55" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="3" />
              <circle cx="60" cy="60" r="55" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeDasharray="86 260" />
            </svg>
            <div style={{ width: 96, height: 96, borderRadius: 999, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, boxSizing: "border-box", boxShadow: "0 8px 30px rgba(0,0,0,0.18)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoSrc} alt={name || ""} style={{ maxWidth: "100%", maxHeight: "100%", animation: "bt-breathe 1.8s ease-in-out infinite" }} />
            </div>
          </div>
          <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            {name && <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em", color: "#fff", animation: "bt-rise 500ms ease-out both" }}>{name}</div>}
            <div style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.62)" }}>{message}</div>
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
          <div style={{ position: "relative", animation: "bt-rise 500ms ease-out both" }}>
            <LottieLoader size={132} label={message} />
          </div>
          {/* hierarchy: what is happening (the one strong line), then the changing quip as quiet support */}
          <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: -30 }}>
            <p style={{ margin: 0, fontSize: 19, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.2, color: "var(--bl-fg)", animation: "bt-rise 500ms 80ms ease-out both" }}>{message}</p>
            <LoaderQuip style={{ position: "relative", fontSize: 14, fontWeight: 450, lineHeight: 1.45, color: "var(--bl-mute)", maxWidth: "32ch", padding: "0 24px" }} />
          </div>
        </>
      )}
    </div>
  );
}
