"use client";

import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react";
import { focusFirstField } from "@/lib/autoFocus";

/** Modal — app-surface dialog with title bar; dismiss via the close control by default. */
export default function Modal({
  title,
  onClose,
  children,
  variant = "dark",
  busy = false,
  sheet,
  closeOnBackdrop = false,
  hideClose = false,
  hideHeader = false,
  className,
  style,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  variant?: "dark" | "light";
  /** When true, the close control cannot dismiss (in-flight action). */
  busy?: boolean;
  /** Bottom sheet layout. Omit or set false to center on every viewport. */
  sheet?: boolean;
  /** When true, a click on the dimmed backdrop also dismisses. */
  closeOnBackdrop?: boolean;
  /** Hide the top-right Close control when the body already has dismiss actions. */
  hideClose?: boolean;
  /** Skip the title bar. The body supplies the heading; `title` stays the accessible name. */
  hideHeader?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const titleId = useId();
  const light = variant === "light";
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const forceSheet = sheet === true;

  useEffect(() => {
    focusFirstField(dialogRef.current);
  }, []);

  const requestClose = () => {
    if (busy) return;
    onClose();
  };

  const shellCls = forceSheet
    ? "flex min-h-full items-end justify-center p-0"
    : "flex min-h-full items-center justify-center p-4 sm:p-6";

  const sheetDialogCls = light
    ? "m-0 w-full max-w-none overflow-y-auto rounded-t-[26px] rounded-b-none border border-b-0 border-[rgba(5,27,53,0.10)] bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-[#051b35] shadow-[0_-20px_60px_-20px_rgba(5,27,53,0.5)] max-h-[92vh]"
    : "m-0 w-full max-w-none overflow-y-auto rounded-t-[26px] rounded-b-none border border-b-0 border-white/15 bg-[#0a2747] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-white shadow-[0_-20px_60px_-20px_rgba(5,27,53,0.5)] max-h-[92vh]";

  const centeredDialogCls = light
    ? "m-auto w-full max-w-[560px] rounded-2xl border border-[rgba(5,27,53,0.10)] bg-white p-6 text-[#051b35] shadow-2xl shadow-black/20 sm:p-8"
    : "m-auto w-full max-w-[560px] rounded-2xl border border-white/15 bg-[#0a2747] p-6 text-white shadow-2xl shadow-black/60 sm:p-8";

  const dialogCls = forceSheet ? sheetDialogCls : centeredDialogCls;

  const sheetHeaderCls = `-mx-6 flex items-start justify-between gap-4 border-b px-6 pb-4 ${
    light ? "border-[rgba(5,27,53,0.10)]" : "border-white/10"
  }`;

  const centeredHeaderCls = `-mx-6 flex items-center justify-between gap-4 border-b px-6 pb-4 sm:-mx-8 sm:px-8 ${
    light ? "border-[rgba(5,27,53,0.10)]" : "border-white/10"
  }`;

  const headerCls = forceSheet ? sheetHeaderCls : centeredHeaderCls;

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto bg-black/70 backdrop-blur-sm"
      onClick={closeOnBackdrop ? requestClose : undefined}
    >
      <div className={shellCls}>
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={hideHeader ? undefined : titleId}
          aria-label={hideHeader ? title : undefined}
          aria-busy={busy || undefined}
          className={className ? `${dialogCls} ${className}` : dialogCls}
          style={style}
          onClick={(e) => e.stopPropagation()}
        >
          {hideHeader ? null : (
          <div className={headerCls}>
            <h2
              id={titleId}
              className="text-[24px] font-semibold tracking-[-0.01em]"
            >
              {title}
            </h2>
            {hideClose ? null : (
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
            )}
          </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
