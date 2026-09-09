"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import RouteLoader from "@/components/molecules/RouteLoader";
import { ShopperFluidTypeStyles } from "@/components/templates/ShopperFluidType";
import { shopperShellVars } from "@/lib/branding";
import { CHECKOUT_HOLD_SECONDS, formatHoldClock } from "@/lib/checkoutBranding";

const NAVY = "#051b35";

export default function BrandedCheckoutShell({
  accent,
  remainingSeconds,
  holdPaused = false,
  onBack,
  onExpire,
  children,
  loading = false,
  loaderBranding,
}: {
  accent: string;
  remainingSeconds?: number | null;
  holdPaused?: boolean;
  onBack: () => void;
  onExpire?: () => void;
  children: ReactNode;
  loading?: boolean;
  loaderBranding?: {
    primaryColor?: string | null;
    logoSrc?: string | null;
    name?: string | null;
  } | null;
}) {
  const [left, setLeft] = useState(remainingSeconds ?? 0);
  const expiredNotified = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    expiredNotified.current = false;
    setLeft(remainingSeconds ?? 0);
  }, [remainingSeconds]);

  useEffect(() => {
    if (remainingSeconds == null || remainingSeconds > 0 || holdPaused) return;
    if (expiredNotified.current) return;
    expiredNotified.current = true;
    onExpireRef.current?.();
  }, [remainingSeconds, holdPaused]);

  useEffect(() => {
    if (remainingSeconds == null || remainingSeconds <= 0 || holdPaused) return;

    const id = window.setInterval(() => {
      setLeft((seconds) => {
        const next = Math.max(0, seconds - 1);
        if (next === 0 && !expiredNotified.current) {
          expiredNotified.current = true;
          onExpireRef.current?.();
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [remainingSeconds, holdPaused]);

  const hold =
    remainingSeconds == null
      ? null
      : formatHoldClock(
          remainingSeconds > 0 && left === 0 && !expiredNotified.current
            ? Math.min(remainingSeconds, CHECKOUT_HOLD_SECONDS)
            : Math.min(left, CHECKOUT_HOLD_SECONDS),
        );

  return (
    <div
      className="shopper-page min-h-screen overflow-y-auto bg-[#f7f8fc]"
      style={{ color: NAVY, ...shopperShellVars(accent) }}
    >
      <ShopperFluidTypeStyles />
      <header
        className="relative sticky top-0 z-[2] flex min-w-0 items-center gap-2 px-3.5 py-3.5 text-white md:gap-4 md:px-6"
        style={{ background: accent }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="relative z-[1] inline-flex shrink-0 items-center gap-2 rounded-full border border-white/22 bg-white/12 px-3 py-2.5 text-[14px] font-medium text-white md:px-[18px]"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span className="hidden sm:inline">Back</span>
        </button>
        <div className="hidden flex-1 md:block" aria-hidden />
        {hold ? (
          <span className="pointer-events-none absolute left-1/2 top-1/2 inline-flex max-w-[calc(100%-11.5rem)] -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 truncate rounded-full border border-white/22 bg-white/14 px-2.5 py-2 text-[12px] font-medium tabular-nums text-white md:static md:max-w-none md:translate-x-0 md:translate-y-0 md:px-3.5 md:text-[13px]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5 shrink-0"
              aria-hidden
            >
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 7 12 12 16 14" />
            </svg>
            Seats held {hold}
          </span>
        ) : null}
        <div className="relative z-[1] ml-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[11px] text-white/80 md:ml-0 md:gap-2 md:text-[13px]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4"
            aria-hidden
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Secure checkout
        </div>
      </header>
      {loading ? <RouteLoader branding={loaderBranding} /> : children}
    </div>
  );
}
