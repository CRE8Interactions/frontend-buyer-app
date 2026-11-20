"use client"

import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Progress as ProgressPrimitive } from "radix-ui"

/* Indeterminate uses the global keyframes `h-progress-bar-indeterminate` (0% translateX(-100%) -> 100% translateX(350%)). */
type BarColor = "default" | "accent" | "success" | "warning" | "danger"
type BarSize = "sm" | "md" | "lg"

const progressVariants = cva(
  [
    "grid w-full grid-cols-[1fr_auto] gap-1 [grid-template-areas:'label_output'_'track_track']",
    "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
  ].join(" "),
  {
    variants: {
      size: {
        sm: "[&_[data-slot=progress-track]]:h-1 [&_[data-slot=progress-track]]:rounded-[2px] [&_[data-slot=progress-fill]]:rounded-[2px]",
        md: "[&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:rounded-[4px] [&_[data-slot=progress-fill]]:rounded-[4px]",
        lg: "[&_[data-slot=progress-track]]:h-3 [&_[data-slot=progress-track]]:rounded-[6px] [&_[data-slot=progress-fill]]:rounded-[6px]",
      },
      color: {
        default: "[&_[data-slot=progress-fill]]:bg-h-default-foreground",
        accent: "[&_[data-slot=progress-fill]]:bg-h-accent",
        success: "[&_[data-slot=progress-fill]]:bg-h-success",
        warning: "[&_[data-slot=progress-fill]]:bg-h-warning",
        danger: "[&_[data-slot=progress-fill]]:bg-h-danger",
      },
    },
    defaultVariants: { size: "md", color: "accent" },
  }
)

const progressLabel = "w-fit text-sm font-medium [grid-area:label]"
const progressOutput = "text-sm font-medium tabular-nums [grid-area:output]"
const progressTrack = "relative overflow-hidden bg-h-default [grid-area:track]"
const progressFill = "absolute start-0 top-0 h-full"
const progressFillIndeterminate = "w-2/5 animate-[h-progress-bar-indeterminate_1.5s_cubic-bezier(0.65,0,0.35,1)_infinite] motion-reduce:animate-none"
const progressFillDeterminate = "transition-[width] duration-300 ease-[var(--e-out)] motion-reduce:transition-none"

function Progress({
  className,
  value,
  color = "accent",
  size = "md",
  label,
  showValueLabel = false,
  valueLabel,
  children,
  ...props
}: Omit<React.ComponentProps<typeof ProgressPrimitive.Root>, "color"> & {
  color?: BarColor
  size?: BarSize
  label?: React.ReactNode
  /** Show the percentage (or `valueLabel`) at the top right. */
  showValueLabel?: boolean
  valueLabel?: React.ReactNode
}) {
  const indeterminate = value == null
  const pct = Math.max(0, Math.min(100, value ?? 0))
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      className={cn(progressVariants({ size, color }), className)}
      {...props}
    >
      {label != null && <span data-slot="label" className={progressLabel}>{label}</span>}
      {showValueLabel && (
        <span data-slot="progress-output" className={progressOutput}>
          {indeterminate ? null : (valueLabel ?? `${Math.round(pct)}%`)}
        </span>
      )}
      <div data-slot="progress-track" className={progressTrack}>
        <ProgressPrimitive.Indicator
          data-slot="progress-fill"
          className={cn(progressFill, indeterminate ? progressFillIndeterminate : progressFillDeterminate)}
          style={indeterminate ? undefined : { width: `${pct}%` }}
        />
      </div>
      {children}
    </ProgressPrimitive.Root>
  )
}

export { Progress }
export type { BarColor, BarSize }
