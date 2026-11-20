import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

/* The reference component: 36 viewBox, r=16, stroke 4, round caps, rotated -90deg.
   Indeterminate uses the global keyframes `h-progress-circle-spin` (rotate 0 -> 360deg). */
type CircleColor = "default" | "accent" | "success" | "warning" | "danger"
type CircleSize = "sm" | "md" | "lg"

const CENTER = 18
const R = CENTER - 2
const CIRC = 2 * Math.PI * R

const progressCircleVariants = cva(
  [
    "inline-flex items-center justify-center",
    "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "[&_[data-slot=progress-circle-track]_circle:first-child]:stroke-h-default",
    "[&_[data-slot=progress-circle-track]_circle:last-child]:transition-[stroke-dashoffset] [&_[data-slot=progress-circle-track]_circle:last-child]:duration-300 [&_[data-slot=progress-circle-track]_circle:last-child]:ease-[var(--e-out)] motion-reduce:[&_[data-slot=progress-circle-track]_circle:last-child]:transition-none",
  ].join(" "),
  {
    variants: {
      size: {
        sm: "[&_[data-slot=progress-circle-track]]:size-5",
        md: "[&_[data-slot=progress-circle-track]]:size-7",
        lg: "[&_[data-slot=progress-circle-track]]:size-9",
      },
      color: {
        default: "[&_[data-slot=progress-circle-track]_circle:last-child]:stroke-h-default-foreground",
        accent: "[&_[data-slot=progress-circle-track]_circle:last-child]:stroke-h-accent",
        success: "[&_[data-slot=progress-circle-track]_circle:last-child]:stroke-h-success",
        warning: "[&_[data-slot=progress-circle-track]_circle:last-child]:stroke-h-warning",
        danger: "[&_[data-slot=progress-circle-track]_circle:last-child]:stroke-h-danger",
      },
      indeterminate: {
        true: "[&_[data-slot=progress-circle-track]]:animate-[h-progress-circle-spin_1s_linear_infinite] motion-reduce:[&_[data-slot=progress-circle-track]]:animate-none",
        false: "",
      },
    },
    defaultVariants: { size: "md", color: "accent", indeterminate: false },
  }
)

function ProgressCircle({
  className,
  value,
  color = "accent",
  size = "md",
  isDisabled,
  ...props
}: Omit<React.ComponentProps<"div">, "color"> & {
  /** 0-100. Omit for indeterminate. */
  value?: number
  color?: CircleColor
  size?: CircleSize
  isDisabled?: boolean
}) {
  const indeterminate = value == null
  const pct = Math.max(0, Math.min(100, value ?? 0))
  return (
    <div
      data-slot="progress-circle"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : pct}
      aria-disabled={isDisabled || undefined}
      className={cn(progressCircleVariants({ size, color, indeterminate }), className)}
      {...props}
    >
      <svg
        data-slot="progress-circle-track"
        fill="none"
        viewBox={`0 0 ${CENTER * 2} ${CENTER * 2}`}
      >
        <circle cx={CENTER} cy={CENTER} r={R} strokeWidth={4} />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={R}
          strokeWidth={4}
          strokeDasharray={CIRC}
          strokeDashoffset={indeterminate ? CIRC * 0.75 : CIRC - (pct / 100) * CIRC}
          strokeLinecap="round"
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
        />
      </svg>
    </div>
  )
}

export { ProgressCircle }
