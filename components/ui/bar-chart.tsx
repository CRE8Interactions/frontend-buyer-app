"use client"

import * as React from "react"
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, Tooltip } from "recharts"
import { cn } from "@/lib/utils"
import { ChartGrid, ChartTooltipCard, ChartXAxis, ChartYAxis, chartTheme } from "./chart-shared"

/* A bar chart on Recharts, themed with our tokens, built the same way as the area chart: a ResponsiveContainer plus the Recharts
   BarChart, with the parts (Grid, XAxis, YAxis, Bar, Tooltip, TooltipContent) on the root. The hovered bar gets a subtle filled
   rectangle behind it. `layout="vertical"` draws horizontal bars (put the category on the YAxis and the numbers on the XAxis);
   the same `stackId` stacks bars and different ones sit side by side. */
const theming = chartTheme

type BarChartProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** One object per category, with a field for each series. */
  data: Record<string, number | string>[]
  height?: number
  width?: number | `${number}%`
  /** "horizontal" draws upright bars (default); "vertical" draws horizontal bars. */
  layout?: "horizontal" | "vertical"
  margin?: { top?: number; right?: number; bottom?: number; left?: number }
  children?: React.ReactNode
}

function BarChart({ data, height = 300, width = "100%", layout = "horizontal", margin = { top: 8, right: 8, bottom: 0, left: 0 }, className, style, children, ...props }: BarChartProps) {
  return (
    <div data-slot="bar-chart" className={cn("bar-chart text-xs", theming, className)} style={{ width, height, ...style }} {...props}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height }}>
        <RechartsBarChart data={data} layout={layout} margin={margin}>
          {children}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** The tooltip, with a faint filled rectangle behind the hovered bar as its cursor. */
function BarTooltip(props: React.ComponentProps<typeof Tooltip>) {
  return <Tooltip cursor={{ fill: "color-mix(in oklab, var(--h-muted) 12%, transparent)", stroke: "none" }} {...props} />
}

/** A series of bars: 6px rounded corners on the outer end and a 40px cap on the bar thickness by default. */
function BarSeries(props: React.ComponentProps<typeof Bar>) {
  return <Bar radius={[6, 6, 0, 0]} maxBarSize={40} {...props} />
}

const BarChartRoot = Object.assign(BarChart, {
  Bar: BarSeries,
  Grid: ChartGrid,
  XAxis: ChartXAxis,
  YAxis: ChartYAxis,
  Tooltip: BarTooltip,
  TooltipContent: ChartTooltipCard,
})

export { BarChartRoot as BarChart }
export type { BarChartProps }
