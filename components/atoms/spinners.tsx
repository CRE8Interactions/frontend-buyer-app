"use client";

// Blocktickets loading spinners — React components
// Usage: import { EmblemAssemble, SquareSpin, Ring, BlockPulse, Dots, Bar, ShimmerSkeleton } from '@/components/atoms/spinners';
// Every component accepts `size` (px) and `color` (defaults to brand green #A6E773).
// Keyframes live in app/globals.css so motion works on first paint.

import type { CSSProperties } from "react";

const GREEN = "#A6E773";
const LINE = "rgba(158,182,216,0.14)";
const SURFACE_2 = "rgba(158,182,216,0.10)";

/** Center of the diamond rect in the rotated group's local space. */
const DIAMOND_CX = 119.18 + 47.67 / 2;
const DIAMOND_CY = 23.84 + 47.67 / 2;

/** The full emblem builds piece by piece — splash screens and full-page waits. */
export function EmblemAssemble({
  size = 38,
  color = GREEN,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size * (190.69 / 174.69)}
      viewBox="0 0 174.69 190.69"
      fill={color}
      className="bt-sp-breath"
      style={{ overflow: "visible" }}
      role="status"
      aria-label="Loading"
    >
      <polygon
        className="bt-sp-emA"
        points="47.67 47.67 47.67 0 0 0 0 95.35 95.35 95.35 95.35 47.67 47.67 47.67"
      />
      <polygon
        className="bt-sp-emB"
        points="95.35 95.35 95.35 143.02 0 143.02 0 190.69 95.35 190.69 143.02 143.02 143.02 95.35 95.35 95.35"
      />
      <g transform="translate(39.37 157.14) rotate(-65)">
        <rect
          className="bt-sp-emC"
          x="119.18"
          y="23.84"
          width="47.67"
          height="47.67"
        />
      </g>
    </svg>
  );
}

/** Blocks hold steady while the diamond turns in quarter steps — everyday waits. */
export function SquareSpin({
  size = 38,
  color = GREEN,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size * (190.69 / 174.69)}
      viewBox="0 0 174.69 190.69"
      fill={color}
      style={{ overflow: "visible" }}
      role="status"
      aria-label="Loading"
    >
      <polygon points="47.67 47.67 47.67 0 0 0 0 95.35 95.35 95.35 95.35 47.67 47.67 47.67" />
      <polygon points="95.35 95.35 95.35 143.02 0 143.02 0 190.69 95.35 190.69 143.02 143.02 143.02 95.35 95.35 95.35" />
      <g transform="translate(39.37 157.14) rotate(-65)">
        {/* SMIL keeps the quarter-turn reliable across browsers where CSS SVG transforms stall */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            values={`0 ${DIAMOND_CX} ${DIAMOND_CY};90 ${DIAMOND_CX} ${DIAMOND_CY};90 ${DIAMOND_CX} ${DIAMOND_CY};180 ${DIAMOND_CX} ${DIAMOND_CY};180 ${DIAMOND_CX} ${DIAMOND_CY};270 ${DIAMOND_CX} ${DIAMOND_CY};270 ${DIAMOND_CX} ${DIAMOND_CY};360 ${DIAMOND_CX} ${DIAMOND_CY};360 ${DIAMOND_CX} ${DIAMOND_CY}`}
            keyTimes="0;0.2;0.25;0.45;0.5;0.7;0.75;0.95;1"
            dur="2.4s"
            repeatCount="indefinite"
            calcMode="linear"
          />
          <rect x="119.18" y="23.84" width="47.67" height="47.67" />
        </g>
      </g>
    </svg>
  );
}

/** In buttons and inline actions. 0.8s linear. */
export function Ring({
  size = 28,
  color = GREEN,
  trackColor = LINE,
  strokeWidth = 2.5,
}: {
  size?: number;
  color?: string;
  trackColor?: string;
  strokeWidth?: number;
}) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="bt-sp-ring"
      style={{
        display: "inline-block",
        flexShrink: 0,
        boxSizing: "border-box",
        width: size,
        height: size,
        verticalAlign: "middle",
        borderRadius: "50%",
        border: `${strokeWidth}px solid ${trackColor}`,
        borderTopColor: color,
      }}
    />
  );
}

/** Four squares echoing the emblem — full-surface waits. */
export function BlockPulse({
  size = 10,
  gap = 4,
  color = GREEN,
}: {
  size?: number;
  gap?: number;
  color?: string;
}) {
  const sq = (delay: number): CSSProperties => ({
    background: color,
    borderRadius: 2,
    animationDelay: `${delay}s`,
  });
  return (
    <div
      role="status"
      aria-label="Loading"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(2, ${size}px)`,
        gridTemplateRows: `repeat(2, ${size}px)`,
        gap,
      }}
    >
      <i className="bt-sp-bp" style={sq(0)} />
      <i className="bt-sp-bp" style={sq(0.15)} />
      <i className="bt-sp-bp" style={sq(0.45)} />
      <i className="bt-sp-bp" style={sq(0.3)} />
    </div>
  );
}

/** Three bouncing dots — AI thinking and chat surfaces. */
export function Dots({
  size = 7,
  gap = 5,
  color = GREEN,
}: {
  size?: number;
  gap?: number;
  color?: string;
}) {
  const dot = (delay: number): CSSProperties => ({
    width: size,
    height: size,
    borderRadius: "50%",
    background: color,
    animationDelay: `${delay}s`,
  });
  return (
    <div role="status" aria-label="Loading" style={{ display: "flex", gap }}>
      <i className="bt-sp-bn" style={dot(0)} />
      <i className="bt-sp-bn" style={dot(0.15)} />
      <i className="bt-sp-bn" style={dot(0.3)} />
    </div>
  );
}

/** Indeterminate progress bar — page-level loads. */
export function Bar({
  width = 160,
  height = 4,
  color = GREEN,
  trackColor = SURFACE_2,
}: {
  width?: number;
  height?: number;
  color?: string;
  trackColor?: string;
}) {
  return (
    <div
      role="progressbar"
      aria-label="Loading"
      style={{
        width,
        height,
        background: trackColor,
        borderRadius: height,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        className="bt-sp-sl"
        style={{
          position: "absolute",
          inset: 0,
          width: "40%",
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        }}
      />
    </div>
  );
}

/** Content placeholder lines. Pass `lines` or wrap your own shapes with `<ShimmerSkeleton.Line />`. */
export function ShimmerSkeleton({
  lines = 3,
  baseColor = SURFACE_2,
  glowColor = "rgba(158,182,216,0.18)",
}: {
  lines?: number;
  baseColor?: string;
  glowColor?: string;
}) {
  const widths = ["40%", "100%", "82%", "95%", "70%"];
  return (
    <div
      role="status"
      aria-label="Loading content"
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <ShimmerLine
          key={i}
          height={i === 0 ? 16 : 12}
          width={widths[i % widths.length]}
          baseColor={baseColor}
          glowColor={glowColor}
        />
      ))}
    </div>
  );
}

export function ShimmerLine({
  width = "100%",
  height = 12,
  baseColor = SURFACE_2,
  glowColor = "rgba(158,182,216,0.18)",
}: {
  width?: number | string;
  height?: number;
  baseColor?: string;
  glowColor?: string;
}) {
  return (
    <div
      className="bt-sp-sh"
      style={{
        height,
        width,
        borderRadius: 6,
        background: `linear-gradient(90deg, ${baseColor} 25%, ${glowColor} 50%, ${baseColor} 75%)`,
        backgroundSize: "200% 100%",
      }}
    />
  );
}

ShimmerSkeleton.Line = ShimmerLine;
