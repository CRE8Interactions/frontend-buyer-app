"use client";

/**
 * Wallet navigation. Desktop: a sticky left rail whose highlight slides to the section you pick, each
 * row carrying a live count, with the next event pinned underneath as a one-tap shortcut to its
 * code. Phone: a floating dock with the same sliding highlight. One component, one source of items.
 */

import { motion, useReducedMotion } from "framer-motion";
import { ArrowsOutSimple, CaretRight, type Icon } from "@phosphor-icons/react";
import { Status } from "@/components/ui/status";
import { cn } from "@/lib/utils";
import type { WalletEvent } from "@/lib/walletDemo";

export type NavItem = { id: string; label: string; icon: Icon; count?: number; /** things waiting on you (shown as a number on the phone dock); leave out when there is nothing to do */ badge?: number; hint?: string };

const SPRING = { type: "spring", duration: 0.38, bounce: 0.14 } as const;

export default function WalletNav({
  items, active, onChange, next, onGate,
}: {
  items: NavItem[]; active: string; onChange: (id: string) => void; next?: WalletEvent; onGate: () => void;
}) {
  const reduce = useReducedMotion();
  const spring = reduce ? { duration: 0 } : SPRING;
  const tonight = next?.inDays === 0;

  return (
    <>
      {/* Rail (wide screens) */}
      <aside className="sticky top-[104px] hidden w-[240px] shrink-0 self-start lg:flex lg:flex-col lg:gap-6" aria-label="Wallet sections">
        <nav className="flex flex-col gap-1">
          {items.map((it) => {
            const on = it.id === active;
            return (
              <button
                key={it.id}
                type="button"
                aria-current={on ? "page" : undefined}
                onClick={() => onChange(it.id)}
                className={cn(
                  "group relative flex h-12 items-center gap-3 rounded-full px-4 text-left text-[15px] font-medium outline-none transition-[color,transform] duration-150 ease-[var(--e-out)] active:scale-[0.98]",
                  "focus-visible:ring-2 focus-visible:ring-[var(--h-focus)]",
                  on ? "text-foreground" : "text-ink2 hover:text-foreground",
                )}
              >
                {on && (
                  <motion.span layoutId="wallet-nav-pill" transition={spring} aria-hidden className="absolute inset-0 rounded-full bg-card ring-1 ring-border" />
                )}
                <it.icon weight={on ? "bold" : "regular"} className={cn("relative size-[22px] shrink-0 transition-[transform,color] duration-200 ease-[var(--e-out)] group-hover:scale-110", on && "text-green-deep")} />
                <span className="relative flex-1">{it.label}</span>
                {it.count != null && it.count > 0 && (
                  <span className={cn("relative min-w-6 rounded-full px-2 py-0.5 text-center text-[13px] tabular-nums transition-colors", on ? "bg-secondary text-foreground" : "text-mute")}>{it.count}</span>
                )}
              </button>
            );
          })}
        </nav>

        {next && (
          <button
            type="button"
            onClick={onGate}
            className="group relative flex flex-col gap-3 overflow-hidden rounded-[24px] bg-feature p-5 text-left text-white outline-none transition-transform duration-200 ease-[var(--e-out)] hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[var(--h-focus)] active:scale-[0.98]"
          >
            <span className="flex items-center justify-between">
              <Status color={tonight ? "success" : "neutral"} pulse={tonight} className="text-white/80">{tonight ? "Tonight" : `In ${next.inDays} days`}</Status>
              <ArrowsOutSimple weight="bold" className="size-4 text-white/60 transition-transform duration-200 ease-[var(--e-out)] group-hover:scale-125 group-hover:text-white" />
            </span>
            <span className="text-[17px] font-semibold leading-snug tracking-[-0.01em]">{next.title}</span>
            <span className="flex items-center justify-between text-[13px] text-white/70">
              {tonight ? `Doors ${next.doors}` : next.date}
              <span className="flex items-center gap-1 font-medium text-white">Open code <CaretRight weight="bold" className="size-3.5 transition-transform duration-200 ease-[var(--e-out)] group-hover:translate-x-0.5" /></span>
            </span>
          </button>
        )}
      </aside>

      {/* Dock (phones and tablets) */}
      <nav
        aria-label="Wallet sections"
        className="fixed inset-x-4 bottom-[calc(12px+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-[460px] items-center gap-1 rounded-full bg-popover/80 p-1.5 shadow-h-surface ring-1 ring-border backdrop-blur-xl lg:hidden"
      >
        {items.map((it) => {
          const on = it.id === active;
          return (
            <button
              key={it.id}
              type="button"
              aria-current={on ? "page" : undefined}
              aria-label={it.badge ? `${it.label}, ${it.badge} waiting` : undefined}
              onClick={() => onChange(it.id)}
              className={cn(
                "relative flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[13px] font-medium outline-none transition-[color,transform] duration-150 ease-[var(--e-out)] active:scale-[0.96]",
                "focus-visible:ring-2 focus-visible:ring-[var(--h-focus)]",
                on ? "text-foreground" : "text-ink2",
              )}
            >
              {on && <motion.span layoutId="wallet-dock-pill" transition={spring} aria-hidden className="absolute inset-0 rounded-full bg-secondary" />}
              <span className="relative">
                <it.icon weight={on ? "bold" : "regular"} className={cn("size-[22px] transition-colors", on && "text-green-deep")} />
                {it.badge != null && it.badge > 0 && (
                  <span aria-hidden className="absolute -right-3 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[12px] font-semibold leading-none tabular-nums text-primary-foreground ring-2 ring-background">{it.badge > 9 ? "9+" : it.badge}</span>
                )}
              </span>
              <span className="relative leading-none">{it.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
