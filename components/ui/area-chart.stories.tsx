import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ArrowDown, ArrowUp } from "@phosphor-icons/react"
import { AreaChart, AreaGradient } from "./area-chart"
import { Card, CardContent, CardHeader, CardTitle } from "./card"

const meta = {
  title: "Display & content/Area chart",
  id: "molecules-area-chart",
  component: AreaChart,
  tags: ["autodocs", "new"],
  args: { data: [] },
  parameters: { docs: { description: { component: "An area chart for trends, with gradient fills, stacked series and sparkline variants. It is Recharts with our tokens: 12px muted tick labels, no axis or tick lines, a faint grid, a dashed cursor and an active dot ringed in the surface colour. Build it from the parts: `AreaChart.Grid`, `XAxis`, `YAxis`, `Area`, `Tooltip` and `TooltipContent` (the styled tooltip). Series colours are `--chart-1` to `--chart-5`." } } },
} satisfies Meta<typeof AreaChart>
export default meta
type Story = StoryObj<typeof meta>

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const revenue = months.map((month, i) => ({ month, revenue: [4200, 5600, 4900, 7100, 6200, 8500, 7900, 9300, 8800, 10400, 10000, 11800][i] }))
const traffic = months.map((month, i) => ({
  month,
  organic: [4200, 5100, 4700, 6200, 6800, 7600, 7100, 8800, 9400, 10200, 11300, 12400][i],
  paid: [2100, 2600, 3100, 2800, 3600, 4100, 4500, 4200, 5200, 5600, 6100, 6800][i],
}))
const dollars = (value: number | string) => `$${(Number(value) / 1000).toFixed(0)}k`
const thousands = (value: number | string) => Number(value).toLocaleString("en-US")

const Dot = ({ color }: { color: string }) => <span aria-hidden className="size-2.5 rounded-full" style={{ background: color }} />

export const Basic: Story = {
  render: () => (
    <Card className="w-full max-w-2xl">
      <CardHeader><CardTitle>Monthly revenue</CardTitle></CardHeader>
      <CardContent>
        <AreaChart data={revenue} height={240}>
          <defs><AreaGradient id="rev" color="var(--chart-1)" /></defs>
          <AreaChart.Grid />
          <AreaChart.XAxis dataKey="month" />
          <AreaChart.YAxis tickFormatter={dollars} />
          <AreaChart.Area type="monotone" dataKey="revenue" name="Revenue" stroke="var(--chart-1)" strokeWidth={2} fill="url(#rev)" />
          <AreaChart.Tooltip content={<AreaChart.TooltipContent valueFormatter={(v) => `$${thousands(v)}`} />} />
        </AreaChart>
      </CardContent>
    </Card>
  ),
}

export const CustomTooltip: Story = {
  parameters: { docs: { description: { story: "`AreaChart.TooltipContent` takes a `valueFormatter` and a `labelFormatter`, or write your own renderer and pass it as the tooltip `content`." } } },
  render: () => (
    <Card className="w-full max-w-2xl">
      <CardHeader><CardTitle>Monthly revenue</CardTitle></CardHeader>
      <CardContent>
        <AreaChart data={revenue} height={240}>
          <defs><AreaGradient id="rev2" color="var(--chart-1)" /></defs>
          <AreaChart.Grid />
          <AreaChart.XAxis dataKey="month" />
          <AreaChart.YAxis tickFormatter={dollars} />
          <AreaChart.Area type="monotone" dataKey="revenue" name="Revenue" stroke="var(--chart-1)" strokeWidth={2} fill="url(#rev2)" />
          <AreaChart.Tooltip content={<AreaChart.TooltipContent labelFormatter={(l) => `${l} 2026`} valueFormatter={(v) => `$${thousands(v)}`} />} />
        </AreaChart>
      </CardContent>
    </Card>
  ),
}

const kpis = [
  { label: "Total revenue", value: "$228,451", delta: "3.3%", note: "last 30d", up: true, color: "var(--chart-2)", points: [3, 4, 3.4, 5, 4.6, 6, 5.6, 7.2] },
  { label: "Bounce rate", value: "42.3%", delta: "5.9%", note: "vs last 7d", up: false, color: "var(--chart-5)", points: [6, 6.5, 5.4, 6.2, 5, 5.6, 4.4, 4.8] },
  { label: "Active users", value: "98K", delta: "10.9%", note: "this month", up: true, color: "var(--chart-1)", points: [2, 2.6, 2.4, 3.4, 3.8, 4.6, 5.2, 6.4] },
]
export const KpiWithAreaChart: Story = {
  render: () => (
    <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-2">
      {kpis.map((kpi, index) => (
        <Card key={kpi.label} className="gap-3 p-4">
          <p className="text-sm text-h-muted">{kpi.label}</p>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-2xl font-semibold tabular-nums text-h-foreground">{kpi.value}</p>
              <p className={`mt-1 flex items-center gap-1 text-xs ${kpi.up ? "text-h-success-soft-foreground" : "text-h-danger-soft-foreground"}`}>
                {kpi.up ? <ArrowUp weight="bold" className="size-3" /> : <ArrowDown weight="bold" className="size-3" />}
                {kpi.delta} <span className="text-h-muted">{kpi.note}</span>
              </p>
            </div>
            <AreaChart data={kpi.points.map((v, i) => ({ i, v }))} height={56} width={120} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs><AreaGradient id={`kpi-${index}`} color={kpi.color} opacity={0.3} /></defs>
              <AreaChart.Area type="monotone" dataKey="v" stroke={kpi.color} strokeWidth={1.5} fill={`url(#kpi-${index})`} dot={false} activeDot={false} isAnimationActive={false} />
            </AreaChart>
          </div>
        </Card>
      ))}
    </div>
  ),
}

export const MultiArea: Story = {
  render: () => (
    <Card className="w-full max-w-2xl">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Traffic sources</CardTitle>
          <p className="mt-3 text-2xl font-semibold tabular-nums text-h-foreground">231,856</p>
          <p className="text-xs text-h-muted">Sessions</p>
        </div>
        <ul className="flex items-center gap-4 text-xs text-h-muted">
          <li className="flex items-center gap-1.5"><Dot color="var(--chart-1)" />Organic</li>
          <li className="flex items-center gap-1.5"><Dot color="var(--chart-2)" />Paid ads</li>
        </ul>
      </CardHeader>
      <CardContent>
        <AreaChart data={traffic} height={240}>
          <defs>
            <AreaGradient id="org" color="var(--chart-1)" opacity={0.3} />
            <AreaGradient id="paid" color="var(--chart-2)" opacity={0.3} />
          </defs>
          <AreaChart.Grid />
          <AreaChart.XAxis dataKey="month" />
          <AreaChart.YAxis tickFormatter={(v) => `${Number(v) / 1000}k`} />
          <AreaChart.Area type="monotone" dataKey="organic" name="Organic" stroke="var(--chart-1)" strokeWidth={2} fill="url(#org)" />
          <AreaChart.Area type="monotone" dataKey="paid" name="Paid ads" stroke="var(--chart-2)" strokeWidth={2} fill="url(#paid)" />
          <AreaChart.Tooltip content={<AreaChart.TooltipContent valueFormatter={thousands} />} />
        </AreaChart>
      </CardContent>
    </Card>
  ),
}

export const Sparkline: Story = {
  parameters: { docs: { description: { story: "Drop the grid, axes and tooltip for a sparkline: only the area, in a small box." } } },
  render: () => (
    <AreaChart data={revenue} height={64} width={200} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
      <defs><AreaGradient id="spark" color="var(--chart-1)" opacity={0.3} /></defs>
      <AreaChart.Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" strokeWidth={1.5} fill="url(#spark)" dot={false} activeDot={false} isAnimationActive={false} />
    </AreaChart>
  ),
}

export const Stacked: Story = {
  parameters: { docs: { description: { story: "Give the areas the same `stackId` to stack them: the total is the top edge." } } },
  render: () => (
    <Card className="w-full max-w-2xl">
      <CardHeader><CardTitle>Sessions by source</CardTitle></CardHeader>
      <CardContent>
        <AreaChart data={traffic} height={240}>
          <defs>
            <AreaGradient id="s-org" color="var(--chart-1)" opacity={0.4} />
            <AreaGradient id="s-paid" color="var(--chart-2)" opacity={0.4} />
          </defs>
          <AreaChart.Grid />
          <AreaChart.XAxis dataKey="month" />
          <AreaChart.YAxis tickFormatter={(v) => `${Number(v) / 1000}k`} />
          <AreaChart.Area type="monotone" stackId="sessions" dataKey="organic" name="Organic" stroke="var(--chart-1)" strokeWidth={2} fill="url(#s-org)" />
          <AreaChart.Area type="monotone" stackId="sessions" dataKey="paid" name="Paid ads" stroke="var(--chart-2)" strokeWidth={2} fill="url(#s-paid)" />
          <AreaChart.Tooltip content={<AreaChart.TooltipContent valueFormatter={thousands} />} />
        </AreaChart>
      </CardContent>
    </Card>
  ),
}
