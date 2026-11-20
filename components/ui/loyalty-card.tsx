"use client";

import * as React from "react";
import { HoloCard, type HoloCardProps } from "@/components/ui/holo-card";

/* LoyaltyCard: a membership card. A HoloCard (the thin-film hologram, see holo-card.tsx) with the one face every club uses: the club and the member's
   status top left and right, their points large in the middle, and who it belongs to, since when and their number along the bottom. The colours
   come from the theme (lib/cardTheme.ts): a tier name, or a colour the backend sends. Text inherits the theme's ink, so it reads on a pale card and a dark one. */
export type LoyaltyCardProps = {
  club: string;
  /** the member's status, in the backend's word ("Gold"); usually the theme's own label */
  status: string;
  points: number;
  /** the member's name */
  name: string;
  /** the year they joined */
  since: string | number;
  /** their number, as printed */
  memberId: string;
} & Omit<HoloCardProps, "children">;

function LoyaltyCard({ club, status, points, name, since, memberId, ...card }: LoyaltyCardProps) {
  return (
    <HoloCard aria-label={`${club} membership card, ${status}, ${points.toLocaleString()} points`} {...card}>
      <div className="flex h-full flex-col justify-between p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="text-[15px] font-semibold tracking-[-0.02em]">{club}</div>
          <div className="text-[12px] font-medium uppercase tracking-[.12em] opacity-60">{status}</div>
        </div>
        <div>
          <div className="text-[clamp(34px,4vw,44px)] font-semibold leading-none tabular-nums tracking-[-0.04em]">{points.toLocaleString()}</div>
          <div className="mt-1 text-[13px] opacity-60">points</div>
        </div>
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-[.12em] opacity-50">Member</div>
            <div className="truncate text-[15px] font-semibold tracking-[-0.01em]">{name}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[11px] font-medium uppercase tracking-[.12em] opacity-50">Since {since}</div>
            <div className="text-[15px] font-semibold tabular-nums tracking-[.04em]">{memberId}</div>
          </div>
        </div>
      </div>
    </HoloCard>
  );
}

export { LoyaltyCard };
