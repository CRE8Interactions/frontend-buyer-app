"use client";

import type { ReactNode } from "react";

/**
 * FilterChip — selectable filter pill. Active state is the green
 * "you are acting here" treatment; rest state stays quiet.
 */
export default function FilterChip({
  active = false,
  onClick,
  icon,
  className = "",
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[13.5px] font-semibold transition-colors ${active
          ? "border-transparent bg-[#a6e773] text-[#051B35]"
          : "border-white/15 bg-white/[0.04] text-[#BCBFCC] hover:bg-white/[0.1] hover:text-white"
        } ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}
