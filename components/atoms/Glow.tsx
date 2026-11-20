/**
 * Glow: ambient blurred orb behind section content, one per section, alternating sides.
 * Brand v0.1 keeps the field neutral, so the default is a soft ink wash; green is reserved for the statement and
 * the final CTA, and blue (the seat accent) is a rare second accent. `blue` is kept so old call sites still work.
 */

const COLORS = {
  neutral: "var(--ink-rgb)",
  blue: "var(--ink-rgb)",
  green: "var(--green-rgb)",
} as const;

export default function Glow({
  color = "neutral",
  opacity = 0.06,
  blur = 150,
  className = "",
}: {
  color?: keyof typeof COLORS;
  opacity?: number;
  blur?: number;
  /** Position + size classes, e.g. "-left-40 top-1/2 h-[440px] w-[440px]". */
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute rounded-full ${className}`}
      style={{ background: `rgb(${COLORS[color]} / ${Math.min(opacity, 0.1) * (color === "green" ? 1 : 0.6)})`, filter: `blur(${blur}px)` }}
    />
  );
}
