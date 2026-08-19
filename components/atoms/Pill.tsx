import type { ReactNode } from "react";

/**
 * Pill — small rounded-full status/label badge.
 * `accent` (green) counts against the green budget: actives, live states,
 * ticket counts. `neutral` is the quiet informational chip.
 */

const VARIANTS = {
  accent: "bg-[#a6e773]/15 text-[#a6e773]",
  success: "bg-[#4caf50]/15 text-[#86e29b]",
  warning: "bg-[#fe9a00]/15 text-[#ffc266]",
  neutral: "border border-white/12 text-[#BCBFCC]",
} as const;

const SIZES = {
  sm: "px-2.5 py-0.5 text-[11px]",
  md: "px-3 py-1 text-[12px]",
} as const;

export default function Pill({
  variant = "accent",
  size = "md",
  className = "",
  children,
}: {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${VARIANTS[variant]} ${SIZES[size]} ${className}`}>
      {children}
    </span>
  );
}
