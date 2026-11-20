"use client"

import * as React from "react"
import { CartesianGrid, XAxis, YAxis } from "recharts"
import { cn } from "@/lib/utils"

/* Parts shared by the Recharts-based charts (area, bar): the base theming for Recharts' own class names, axis and grid
   defaults, and the styled tooltip. 12px muted tick labels, no axis or tick lines, a faint grid at 15%. */
const chartTheme = [
  "[&_.recharts-cartesian-axis-tick-value]:[fill:var(--h-muted)] [&_.recharts-cartesian-axis-tick-value]:[font-size:12px]",
  "[&_.recharts-cartesian-axis-line]:[stroke:transparent] [&_.recharts-cartesian-axis-tick-line]:[stroke:transparent]",
  "[&_.recharts-cartesian-grid_line]:[stroke:color-mix(in_oklab,var(--h-muted)_15%,transparent)]",
  "[&_.recharts-surface]:overflow-visible",
].join(" ")

function ChartGrid(props: React.ComponentProps<typeof CartesianGrid>) {
  return <CartesianGrid vertical={false} {...props} />
}
function ChartXAxis(props: React.ComponentProps<typeof XAxis>) {
  return <XAxis axisLine={false} tickLine={false} tickMargin={10} {...props} />
}
/* Number ticks get thousands separators, and the axis sizes itself to its labels so a category name never wraps. */
const groupDigits = (value: unknown) => (typeof value === "number" ? value.toLocaleString("en-US") : String(value))
function ChartYAxis(props: React.ComponentProps<typeof YAxis>) {
  return <YAxis axisLine={false} tickLine={false} tickMargin={8} width="auto" tickFormatter={groupDigits} {...props} />
}

type TooltipContentProps = {
  active?: boolean
  payload?: { name?: string | number; dataKey?: string | number; value?: number | string; color?: string; stroke?: string }[]
  label?: string | number
  /** Format each value, for example as currency. */
  valueFormatter?: (value: number | string) => React.ReactNode
  /** Format the heading (the x value). */
  labelFormatter?: (label: string | number) => React.ReactNode
  hideLabel?: boolean
  className?: string
}

/** The styled tooltip: the x value as a heading, then one row per series with its colour dot, name and value. Pass it as the
 *  `content` of `AreaChart.Tooltip`. */
function ChartTooltipCard({ active, payload, label, valueFormatter, labelFormatter, hideLabel, className }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  return (
    <div data-slot="area-chart-tooltip" className={cn("min-w-32 rounded-[12px] glass glass-float px-3 py-2 text-xs text-h-overlay-foreground", className)}>
      {!hideLabel && label !== undefined && <p className="mb-1 font-medium text-h-foreground">{labelFormatter ? labelFormatter(label) : label}</p>}
      <ul className="grid gap-1">
        {payload.map((item, index) => (
          <li key={`${item.dataKey}-${index}`} className="flex items-center gap-2">
            <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: item.color ?? item.stroke }} />
            <span className="text-h-muted">{item.name ?? item.dataKey}</span>
            <span className="ml-auto pl-4 font-medium text-h-foreground tabular-nums">{valueFormatter && item.value !== undefined ? valueFormatter(item.value) : item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export { chartTheme, ChartGrid, ChartXAxis, ChartYAxis, ChartTooltipCard }
export type { TooltipContentProps as ChartTooltipCardProps }
