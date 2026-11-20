import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

/* A quantity in a known range (e.g. tickets sold of capacity). Same layout as ProgressBar,
   role="meter", never indeterminate. */
type MeterColor = "default" | "accent" | "success" | "warning" | "danger"
type MeterSize = "sm" | "md" | "lg"

const meterVariants = cva(
  [
    "grid w-full grid-cols-[1fr_auto] gap-1 [grid-template-areas:'label_output'_'track_track']",
    "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
  ].join(" "),
  {
    variants: {
      size: {
        sm: "[&_[data-slot=meter-track]]:h-1 [&_[data-slot=meter-track]]:rounded-[2px] [&_[data-slot=meter-fill]]:rounded-[2px]",
        md: "[&_[data-slot=meter-track]]:h-2 [&_[data-slot=meter-track]]:rounded-[4px] [&_[data-slot=meter-fill]]:rounded-[4px]",
        lg: "[&_[data-slot=meter-track]]:h-3 [&_[data-slot=meter-track]]:rounded-[6px] [&_[data-slot=meter-fill]]:rounded-[6px]",
      },
      color: {
        default: "[&_[data-slot=meter-fill]]:bg-h-default-foreground",
        accent: "[&_[data-slot=meter-fill]]:bg-h-accent",
        success: "[&_[data-slot=meter-fill]]:bg-h-success",
        warning: "[&_[data-slot=meter-fill]]:bg-h-warning",
        danger: "[&_[data-slot=meter-fill]]:bg-h-danger",
      },
    },
    defaultVariants: { size: "md", color: "accent" },
  }
)

const meterLabel = "w-fit text-sm font-medium [grid-area:label]"
const meterOutput = "text-sm font-medium tabular-nums [grid-area:output]"
const meterTrack = "relative overflow-hidden bg-h-default [grid-area:track]"
const meterFill = "absolute start-0 top-0 h-full transition-[width] duration-300 ease-[var(--e-out)] motion-reduce:transition-none"

function Meter({
  className,
  value,
  minValue = 0,
  maxValue = 100,
  color = "accent",
  size = "md",
  label,
  showValueLabel = false,
  valueLabel,
  isDisabled,
  ...props
}: Omit<React.ComponentProps<"div">, "color"> & {
  value: number
  minValue?: number
  maxValue?: number
  color?: MeterColor
  size?: MeterSize
  label?: React.ReactNode
  showValueLabel?: boolean
  valueLabel?: React.ReactNode
  isDisabled?: boolean
}) {
  const pct = Math.max(0, Math.min(100, ((value - minValue) / (maxValue - minValue)) * 100))
  return (
    <div
      data-slot="meter"
      role="meter"
      aria-valuenow={value}
      aria-valuemin={minValue}
      aria-valuemax={maxValue}
      aria-disabled={isDisabled || undefined}
      className={cn(meterVariants({ size, color }), className)}
      {...props}
    >
      {label != null && <span data-slot="label" className={meterLabel}>{label}</span>}
      {showValueLabel && (
        <span data-slot="meter-output" className={meterOutput}>
          {valueLabel ?? `${Math.round(pct)}%`}
        </span>
      )}
      <div data-slot="meter-track" className={meterTrack}>
        <div
          data-slot="meter-fill"
          className={meterFill}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export { Meter }
