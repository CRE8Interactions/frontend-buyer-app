"use client";

import { EmblemAssemble, Ring, SquareSpin } from "@/components/atoms/spinners";

/** Loading spinner — branded Blocktickets animation for page loads; ring for compact UI. */
export default function Spinner({
  className = "",
  size = 20,
  label = "Loading",
  variant = "auto",
  color,
  trackColor,
}: {
  className?: string;
  size?: number;
  label?: string;
  /** `branded` uses the emblem spin; `assemble` builds the emblem; `compact` forces the ring; `auto` picks by size. */
  variant?: "auto" | "branded" | "assemble" | "compact";
  /** Ring color (compact / small sizes). */
  color?: string;
  trackColor?: string;
}) {
  const useAssemble = variant === "assemble";
  const useBranded =
    useAssemble ||
    variant === "branded" ||
    (variant === "auto" && size >= 40);

  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-flex items-center justify-center ${className}`}
    >
      {useAssemble ? (
        <EmblemAssemble size={size} />
      ) : useBranded ? (
        <SquareSpin size={size} />
      ) : (
        <Ring size={size} color={color} trackColor={trackColor} />
      )}
    </span>
  );
}
