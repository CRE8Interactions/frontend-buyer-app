/**
 * Glow — ambient blurred orb behind section content. One per section,
 * alternating sides. Blue for most sections; green reserved for the
 * statement + final CTA (DESIGN-SYSTEM.md §4).
 */

const COLORS = { blue: "56, 116, 224", green: "166, 231, 115" } as const;

export default function Glow({
  color = "blue",
  opacity = 0.12,
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
      style={{ background: `rgba(${COLORS[color]}, ${opacity})`, filter: `blur(${blur}px)` }}
    />
  );
}
