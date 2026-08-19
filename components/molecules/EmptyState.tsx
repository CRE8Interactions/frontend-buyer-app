import type { ReactNode } from "react";

/** EmptyState — dashed placeholder row with an icon chip and guidance copy. */
export default function EmptyState({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-[#9DA2B3]">{icon}</span>
      <p className="text-[14px] text-[#9DA2B3]">{children}</p>
    </div>
  );
}
