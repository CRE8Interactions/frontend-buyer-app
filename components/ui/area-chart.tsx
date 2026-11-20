"use client"

import * as React from "react"
import { Area, AreaChart as RechartsAreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { cn } from "@/lib/utils"
import { ChartGrid, ChartTooltipCard, ChartXAxis, ChartYAxis, chartTheme } from "./chart-shared"

/* An area chart on Recharts, themed with our tokens. The root is a ResponsiveContainer plus the Recharts AreaChart; the parts
   (Grid, XAxis, YAxis, Area, Tooltip, TooltipContent) hang off it with dot notation. Theming targets Recharts' own class
   names: 12px muted tick labels, no axis or tick lines, a faint grid at 15%, a dashed cursor and an active dot ringed with the
   surface colour. Series colours come from --chart-1 to --chart-5. */
const theming = [
  chartTheme,
  "[&_.recharts-tooltip-cursor]:[stroke:var(--h-muted)] [&_.recharts-tooltip-cursor]:[stroke-dasharray:4_4]",
  "[&_.recharts-active-dot_circle]:[stroke:var(--h-surface)] [&_.recharts-active-dot_circle]:[stroke-width:2px]",
].join(" ")

type AreaChartProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** One object per x position, with a field for each series. */
  data: Record<string, number | string>[]
  /** Chart height in pixels (default 300). */
  height?: number
  /** Chart width in pixels or a percentage (default "100%"). */
  width?: number | `${number}%`
  margin?: { top?: number; right?: number; bottom?: number; left?: number }
  /** Stack the areas on top of each other instead of overlapping them. */
  children?: React.ReactNode
}

function AreaChart({ data, height = 300, width = "100%", margin = { top: 8, right: 8, bottom: 0, left: 0 }, className, style, children, ...props }: AreaChartProps) {
  return (
    <div data-slot="area-chart" className={cn("area-chart text-xs", theming, className)} style={{ width, height, ...style }} {...props}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height }}>
        <RechartsAreaChart data={data} margin={margin}>
          {children}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  )
}

type SeriesGradientProps = { id: string; color: string; opacity?: number }
/** A vertical fade from the series colour to transparent. Put it inside `<defs>` and reference it with `fill="url(#id)"`. */
function AreaGradient({ id, color, opacity = 0.35 }: SeriesGradientProps) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={opacity} />
      <stop offset="100%" stopColor={color} stopOpacity={0} />
    </linearGradient>
  )
}

const AreaChartRoot = Object.assign(AreaChart, {
  Area,
  Grid: ChartGrid,
  XAxis: ChartXAxis,
  YAxis: ChartYAxis,
  Tooltip,
  TooltipContent: ChartTooltipCard,
  Gradient: AreaGradient,
})

export { AreaChartRoot as AreaChart, AreaGradient, ChartTooltipCard as AreaChartTooltipContent }
export type { AreaChartProps }
