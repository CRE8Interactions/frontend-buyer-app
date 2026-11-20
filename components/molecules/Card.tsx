import type { ReactNode } from "react";

/**
 * Card surfaces (DESIGN-SYSTEM.md §7).
 * - `cardCls` — the brand card (24px, no border, no shadow); the shadcn Card in components/ui does the same.
 * - `chipBtnCls` — rounded chip button for secondary app actions.
 * Marketing cards use the `.card` CSS class directly.
 */

export const cardCls =
  "relative rounded-xl bg-card text-card-foreground";

export const chipBtnCls =
  "inline-flex items-center gap-2 rounded-full bg-foreground/[0.06] px-5 py-2.5 text-[14px] font-semibold text-foreground transition-colors hover:bg-foreground/[0.1]";

/** Compact chip button variant used inside dense app rows. */
export const chipBtnSmCls =
  "inline-flex items-center gap-2 rounded-full bg-foreground/[0.06] px-4 py-2 text-[13px] font-semibold transition-colors hover:bg-foreground/[0.1]";

export function AppCard({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`${cardCls} ${className}`}>{children}</div>;
}
