import type { ReactNode } from "react";

/**
 * Card surfaces (DESIGN-SYSTEM.md §7).
 * - `cardCls` — elevated app card on navy (demo app pages).
 * - `chipBtnCls` — rounded chip button for secondary app actions.
 * Marketing cards use the `.card` CSS class directly.
 */

export const cardCls =
  "relative rounded-2xl border border-white/12 bg-[#0a2747] bg-gradient-to-b from-white/[0.06] via-white/[0.02] to-transparent shadow-[0_20px_50px_-24px_rgba(0,0,0,0.7)]";

export const chipBtnCls =
  "inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-white/[0.1]";

/** Compact chip button variant used inside dense app rows. */
export const chipBtnSmCls =
  "inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-[13px] font-semibold transition-colors hover:bg-white/[0.1]";

export function AppCard({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`${cardCls} ${className}`}>{children}</div>;
}
