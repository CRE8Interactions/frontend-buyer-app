"use client"

import * as React from "react"
import { Line, LineChart as RechartsLineChart, ResponsiveContainer, Tooltip } from "recharts"
import { cn } from "@/lib/utils"
import { ChartGrid, ChartTooltipCard, ChartXAxis, ChartYAxis, chartTheme } from "./chart-shared"

/* A line chart on Recharts, themed with our tokens and built like the area and bar charts: a ResponsiveContainer plus the
   Recharts LineChart, with the parts (Grid, XAxis, YAxis, Line, Tooltip, TooltipContent) on the root. A dashed vertical cursor
   on hover and an active dot ringed with the surface colour. Lines are smooth, 2px and dotless by default; add `dot` for
   markers or `strokeDasharray` for a dashed comparison line. Series colours come from --chart-1 to --chart-5. */
const theming = [
  chartTheme,
  "[&_.recharts-tooltip-cursor]:[stroke:var(--h-muted)] [&_.recharts-tooltip-cursor]:[stroke-dasharray:4_4]",
  "[&_.recharts-active-dot_circle]:[stroke:var(--h-surface)] [&_.recharts-active-dot_circle]:[stroke-width:2px]",
].join(" ")

type LineChartProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** One object per x position, with a field for each series. */
  data: Record<string, number | string>[]
  height?: number
  width?: number | `${number}%`
  margin?: { top?: number; right?: number; bottom?: number; left?: number }
  children?: React.ReactNode
}

function LineChart({ data, height = 300, width = "100%", margin = { top: 8, right: 8, bottom: 0, left: 0 }, className, style, children, ...props }: LineChartProps) {
  return (
    <div data-slot="line-chart" className={cn("line-chart text-xs", theming, className)} style={{ width, height, ...style }} {...props}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height }}>
        <RechartsLineChart data={data} margin={margin}>
          {children}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  )
}

/** One line: smooth, 2px, no dots. */
function LineSeries(props: React.ComponentProps<typeof Line>) {
  return <Line type="monotone" strokeWidth={2} dot={false} {...props} />
}

const LineChartRoot = Object.assign(LineChart, {
  Line: LineSeries,
  Grid: ChartGrid,
  XAxis: ChartXAxis,
  YAxis: ChartYAxis,
  Tooltip,
  TooltipContent: ChartTooltipCard,
})

export { LineChartRoot as LineChart }
export type { LineChartProps }
