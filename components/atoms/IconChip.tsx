import type { ReactNode } from "react";

/**
 * IconChip — square icon holder on a faint white wash. Icons stay Steel/Space,
 * never green (DESIGN-SYSTEM.md §9).
 */
export default function IconChip({
  tone = "steel",
  className = "",
  children,
}: {
  tone?: "steel" | "space";
  className?: string;
  children: ReactNode;
}) {
  const color = tone === "steel" ? "text-[#BCBFCC]" : "text-[#9DA2B3]";
  return (
    <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.06] ${color} ${className}`}>
      {children}
    </span>
  );
}
