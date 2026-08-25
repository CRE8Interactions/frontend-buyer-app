"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Ring } from "@/components/atoms/spinners";

type Tone = "primary" | "secondary";

export type BrandedActionButtonProps = {
  primaryColor?: string;
  textColor?: string;
  tone?: Tone;
  loading?: boolean;
  /** Shown in place of the label while loading; falls back to the label. */
  loadingLabel?: ReactNode;
  children: ReactNode;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

/**
 * Org-branded CTA. While loading: compact spinner beside the label,
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
      {busy ? (
        <Ring
          size={18}
          color={isPrimary ? textColor : "#051b35"}
          trackColor={
            isPrimary ? "rgba(255,255,255,0.35)" : "rgba(5,27,53,0.2)"
          }
          strokeWidth={2.5}
        />
      ) : null}
      {busy && loadingLabel !== undefined ? loadingLabel : children}
    </button>
  );
}
