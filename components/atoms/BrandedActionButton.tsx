"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Ring } from "@/components/atoms/spinners";

type Tone = "primary" | "secondary";

export type ButtonBusyContentsProps = {
  loading?: boolean;
  /** Shown beside the spinner while loading. Omit for spinner only. */
  loadingLabel?: ReactNode;
  children?: ReactNode;
  spinnerColor?: string;
  trackColor?: string;
};

/** In-flight chrome: spinner always; label only when `loadingLabel` is set. */
export function ButtonBusyContents({
  loading = false,
  loadingLabel,
  children,
  spinnerColor,
  trackColor,
}: ButtonBusyContentsProps) {
  if (!loading) return <>{children}</>;
  return (
    <>
      <Ring
        size={18}
        color={spinnerColor}
        trackColor={trackColor}
        strokeWidth={2.5}
      />
      {loadingLabel !== undefined ? loadingLabel : null}
    </>
  );
}

export type BrandedActionButtonProps = {
  primaryColor?: string;
  textColor?: string;
  tone?: Tone;
  loading?: boolean;
  /** Shown beside the spinner while loading. Omit for spinner only. */
  loadingLabel?: ReactNode;
  children: ReactNode;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

/**
 * Org-branded CTA. While loading: compact spinner, optional copy,
 * disabled + aria-busy.
 */
export default function BrandedActionButton({
  primaryColor = "#051b35",
  textColor = "#ffffff",
  tone = "primary",
  loading = false,
  loadingLabel,
  disabled,
  children,
  className = "",
  type = "button",
  style,
  ...rest
}: BrandedActionButtonProps) {
  const isPrimary = tone === "primary";
  const busy = Boolean(loading);
  const isDisabled = Boolean(disabled || busy);
  const spinnerColor = isPrimary ? textColor : "#051b35";
  const spinnerTrack = isPrimary
    ? "rgba(255,255,255,0.35)"
    : "rgba(5,27,53,0.2)";

  const base =
    "inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-5 py-3 text-[15px] font-semibold transition-opacity disabled:cursor-default disabled:opacity-55";

  const secondaryCls =
    "border border-[rgba(5,27,53,0.16)] bg-white text-[#051b35] hover:bg-[rgba(5,27,53,0.04)]";

  return (
    <button
      type={type}
      {...rest}
      className={`${base} ${isPrimary ? "" : secondaryCls} ${className}`.trim()}
      style={
        isPrimary
          ? { background: primaryColor, color: textColor, ...style }
          : style
      }
      disabled={isDisabled}
      aria-busy={busy || undefined}
    >
      <ButtonBusyContents
        loading={busy}
        loadingLabel={loadingLabel}
        spinnerColor={spinnerColor}
        trackColor={spinnerTrack}
      >
        {children}
      </ButtonBusyContents>
    </button>
  );
}
