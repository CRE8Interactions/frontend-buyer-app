"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { focusFirstField } from "@/lib/autoFocus";

/** Modal — app-surface dialog with title bar and backdrop-close. */
export default function Modal({
  title,
  onClose,
  children,
  variant = "dark",
  busy = false,
  sheet = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  variant?: "dark" | "light";
  /** When true, backdrop and close cannot dismiss (in-flight action). */
  busy?: boolean;
  /** Slide up from the bottom edge (mobile drawers). */
  sheet?: boolean;
}) {
  const titleId = useId();
  const light = variant === "light";
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    focusFirstField(dialogRef.current);
  }, []);

  const requestClose = () => {
    if (busy) return;
    onClose();
  };

  const shellCls = sheet
    ? "flex min-h-full items-end justify-center p-0"
    : "flex min-h-full justify-center p-4 sm:p-6";

  const dialogCls = sheet
    ? light
      ? "m-0 w-full max-w-none overflow-y-auto rounded-t-[26px] rounded-b-none border border-b-0 border-[rgba(5,27,53,0.10)] bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-[#051b35] shadow-[0_-20px_60px_-20px_rgba(5,27,53,0.5)] max-h-[92vh]"
      : "m-0 w-full max-w-none overflow-y-auto rounded-t-[26px] rounded-b-none border border-b-0 border-white/15 bg-[#0a2747] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-white shadow-[0_-20px_60px_-20px_rgba(5,27,53,0.5)] max-h-[92vh]"
    : light
      ? "m-auto w-full max-w-[560px] rounded-2xl border border-[rgba(5,27,53,0.10)] bg-white p-6 text-[#051b35] shadow-2xl shadow-black/20 sm:p-8"
      : "m-auto w-full max-w-[560px] rounded-2xl border border-white/15 bg-[#0a2747] p-6 text-white shadow-2xl shadow-black/60 sm:p-8";

  const headerCls = sheet
    ? `-mx-6 flex items-start justify-between gap-4 border-b px-6 pb-4 ${
        light ? "border-[rgba(5,27,53,0.10)]" : "border-white/10"
      }`
    : `-mx-6 flex items-center justify-between gap-4 border-b px-6 pb-4 sm:-mx-8 sm:px-8 ${
        light ? "border-[rgba(5,27,53,0.10)]" : "border-white/10"
      }`;

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto bg-black/70 backdrop-blur-sm"
      onClick={requestClose}
    >
      <div className={shellCls}>
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-busy={busy || undefined}
          className={dialogCls}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={headerCls}>
            <h2
              id={titleId}
              className="text-[24px] font-semibold tracking-[-0.01em]"
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={requestClose}
              aria-label="Close"
              disabled={busy}
              className={
                light
                  ? "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(5,27,53,0.16)] text-[#051b35] transition-colors hover:bg-[rgba(5,27,53,0.06)] disabled:cursor-default disabled:opacity-40"
                  : "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/[0.1] disabled:cursor-default disabled:opacity-40"
              }
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
