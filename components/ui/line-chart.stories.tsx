import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ArrowDown, ArrowUp } from "@phosphor-icons/react"
import { LineChart } from "./line-chart"
import { Card, CardContent, CardHeader, CardTitle } from "./card"

const meta = {
  title: "Display & content/Line chart",
  id: "molecules-line-chart",
  component: LineChart,
  tags: ["autodocs", "new"],
  args: { data: [] },
  parameters: { docs: { description: { component: "A line chart for trends, with multiple series, dashed comparison lines, dots, sparklines and a custom tooltip. It is Recharts with our tokens: 12px muted tick labels, no axis or tick lines, a faint grid, a dashed cursor on hover and an active dot ringed in the surface colour. Build it from `LineChart.Grid`, `XAxis`, `YAxis`, `Line` and `Tooltip` with `TooltipContent` (the styled tooltip). Lines are smooth and 2px by default. Series colours are `--chart-1` to `--chart-5`." } } },
} satisfies Meta<typeof LineChart>
export default meta
type Story = StoryObj<typeof meta>

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const revenue = months.map((month, i) => ({
  month,
  revenue: [4200, 5600, 4900, 7100, 6200, 8500, 7900, 9300, 8800, 10400, 10000, 11800][i],
  lastYear: [3600, 4300, 4100, 5200, 5000, 6100, 6400, 7000, 6800, 7900, 8200, 8900][i],
}))
const sources = months.map((month, i) => ({
  month,
  organic: [4200, 5100, 4700, 6200, 6800, 7600, 7100, 8800, 9400, 10200, 11300, 12400][i],
  paid: [2100, 2600, 3100, 2800, 3600, 4100, 4500, 4200, 5200, 5600, 6100, 6800][i],
  direct: [1500, 1700, 1600, 2100, 2300, 2500, 2800, 3000, 3200, 3400, 3700, 4100][i],
}))
const dollars = (value: number | string) => `$${(Number(value) / 1000).toFixed(0)}k`
const numbers = (value: number | string) => Number(value).toLocaleString("en-US")
const Dot = ({ color }: { color: string }) => <span aria-hidden className="size-2.5 rounded-full" style={{ background: color }} />
const Legend = ({ items }: { items: [string, string][] }) => (
  <ul className="flex flex-wrap items-center gap-4 text-xs text-h-muted">
    {items.map(([label, color]) => <li key={label} className="flex items-center gap-1.5"><Dot color={color} />{label}</li>)}
  </ul>
)

export const Basic: Story = {
  render: () => (
    <Card className="w-full max-w-2xl">
      <CardHeader><CardTitle>Monthly revenue</CardTitle></CardHeader>
      <CardContent>
        <LineChart data={revenue} height={240}>
          <LineChart.Grid />
          <LineChart.XAxis dataKey="month" />
          <LineChart.YAxis tickFormatter={dollars} />
          <LineChart.Line dataKey="revenue" name="Revenue" stroke="var(--chart-1)" />
          <LineChart.Tooltip content={<LineChart.TooltipContent valueFormatter={(v) => `$${numbers(v)}`} />} />
        </LineChart>
      </CardContent>
    </Card>
  ),
}

export const DashedComparison: Story = {
  parameters: { docs: { description: { story: "A dashed second line compares with a previous period." } } },
  render: () => (
    <Card className="w-full max-w-2xl">
      <CardHeader className="flex-row items-center justify-between gap-4">
        <CardTitle>This year vs last year</CardTitle>
        <Legend items={[["This year", "var(--chart-1)"], ["Last year", "var(--chart-3)"]]} />
      </CardHeader>
      <CardContent>
        <LineChart data={revenue} height={240}>
          <LineChart.Grid />
          <LineChart.XAxis dataKey="month" />
          <LineChart.YAxis tickFormatter={dollars} />
          <LineChart.Line dataKey="lastYear" name="Last year" stroke="var(--chart-3)" strokeDasharray="5 5" />
          <LineChart.Line dataKey="revenue" name="This year" stroke="var(--chart-1)" />
          <LineChart.Tooltip content={<LineChart.TooltipContent valueFormatter={(v) => `$${numbers(v)}`} />} />
        </LineChart>
      </CardContent>
    </Card>
  ),
}

export const MultiLineColors: Story = {
  render: () => (
    <Card className="w-full max-w-2xl">
      <CardHeader className="flex-row items-center justify-between gap-4">
        <CardTitle>Sessions by source</CardTitle>
        <Legend items={[["Organic", "var(--chart-1)"], ["Paid ads", "var(--chart-2)"], ["Direct", "var(--chart-4)"]]} />
      </CardHeader>
      <CardContent>
        <LineChart data={sources} height={240}>
          <LineChart.Grid />
          <LineChart.XAxis dataKey="month" />
          <LineChart.YAxis />
          <LineChart.Line dataKey="organic" name="Organic" stroke="var(--chart-1)" />
          <LineChart.Line dataKey="paid" name="Paid ads" stroke="var(--chart-2)" />
          <LineChart.Line dataKey="direct" name="Direct" stroke="var(--chart-4)" />
          <LineChart.Tooltip content={<LineChart.TooltipContent valueFormatter={numbers} />} />
        </LineChart>
      </CardContent>
    </Card>
  ),
}

export const WithDots: Story = {
  render: () => (
    <Card className="w-full max-w-2xl">
      <CardHeader><CardTitle>Monthly revenue</CardTitle></CardHeader>
      <CardContent>
        <LineChart data={revenue.slice(0, 8)} height={240}>
          <LineChart.Grid />
          <LineChart.XAxis dataKey="month" />
          <LineChart.YAxis tickFormatter={dollars} />
          <LineChart.Line dataKey="revenue" name="Revenue" stroke="var(--chart-2)" dot={{ r: 3, strokeWidth: 0, fill: "var(--chart-2)" }} activeDot={{ r: 5 }} />
          <LineChart.Tooltip content={<LineChart.TooltipContent valueFormatter={(v) => `$${numbers(v)}`} />} />
        </LineChart>
      </CardContent>
    </Card>
  ),
}

export const WithCustomTooltip: Story = {
  parameters: { docs: { description: { story: "`valueFormatter` and `labelFormatter` shape the tooltip, or pass your own renderer as the tooltip `content`." } } },
  render: () => (
    <Card className="w-full max-w-2xl">
      <CardHeader><CardTitle>Monthly revenue</CardTitle></CardHeader>
      <CardContent>
        <LineChart data={revenue} height={240}>
          <LineChart.Grid />
          <LineChart.XAxis dataKey="month" />
          <LineChart.YAxis tickFormatter={dollars} />
          <LineChart.Line dataKey="revenue" name="Revenue" stroke="var(--chart-1)" />
          <LineChart.Tooltip content={<LineChart.TooltipContent labelFormatter={(l) => `${l} 2026`} valueFormatter={(v) => `$${numbers(v)}`} />} />
        </LineChart>
      </CardContent>
    </Card>
  ),
}

export const Sparkline: Story = {
  parameters: { docs: { description: { story: "Drop the grid, axes and tooltip for a sparkline." } } },
  render: () => (
    <LineChart data={revenue} height={56} width={180} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
      <LineChart.Line dataKey="revenue" stroke="var(--chart-1)" strokeWidth={1.5} isAnimationActive={false} activeDot={false} />
    </LineChart>
  ),
}

const kpis = [
  { label: "Revenue", value: "$228,451", delta: "3.3%", up: true, color: "var(--chart-2)", points: [3, 4, 3.4, 5, 4.6, 6, 5.6, 7.2] },
  { label: "Bounce rate", value: "42.3%", delta: "5.9%", up: false, color: "var(--chart-5)", points: [6, 6.5, 5.4, 6.2, 5, 5.6, 4.4, 4.8] },
  { label: "Active users", value: "98K", delta: "10.9%", up: true, color: "var(--chart-1)", points: [2, 2.6, 2.4, 3.4, 3.8, 4.6, 5.2, 6.4] },
]
const Trend = ({ up, delta }: { up: boolean; delta: string }) => (
  <p className={`mt-1 flex items-center gap-1 text-xs ${up ? "text-h-success-soft-foreground" : "text-h-danger-soft-foreground"}`}>
    {up ? <ArrowUp weight="bold" className="size-3" /> : <ArrowDown weight="bold" className="size-3" />}
    {delta} <span className="text-h-muted">vs last 30 days</span>
  </p>
)
export const KpiWithChart: Story = {
  render: () => (
    <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-2">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="gap-3 p-4">
          <p className="text-sm text-h-muted">{kpi.label}</p>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-2xl font-semibold tabular-nums text-h-foreground">{kpi.value}</p>
              <Trend up={kpi.up} delta={kpi.delta} />
            </div>
            <LineChart data={kpi.points.map((v, i) => ({ i, v }))} height={48} width={110} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
              <LineChart.Line dataKey="v" stroke={kpi.color} strokeWidth={1.5} isAnimationActive={false} activeDot={false} />
            </LineChart>
          </div>
        </Card>
      ))}
    </div>
  ),
}

export const StatsWithChart: Story = {
  render: () => (
    <Card className="w-full max-w-2xl">
      <CardContent className="grid gap-6 sm:grid-cols-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="grid gap-2">
            <p className="text-sm text-h-muted">{kpi.label}</p>
            <p className="text-2xl font-semibold tabular-nums text-h-foreground">{kpi.value}</p>
            <LineChart data={kpi.points.map((v, i) => ({ i, v }))} height={44} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
              <LineChart.Line dataKey="v" stroke={kpi.color} strokeWidth={1.5} isAnimationActive={false} activeDot={false} />
            </LineChart>
            <Trend up={kpi.up} delta={kpi.delta} />
          </div>
        ))}
      </CardContent>
    </Card>
  ),
}

export const TrafficSource: Story = {
  render: () => (
    <Card className="w-full max-w-2xl">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Traffic sources</CardTitle>
          <p className="mt-3 text-2xl font-semibold tabular-nums text-h-foreground">231,856</p>
          <p className="text-xs text-h-muted">Sessions</p>
        </div>
        <Legend items={[["Organic", "var(--chart-1)"], ["Paid ads", "var(--chart-2)"]]} />
      </CardHeader>
      <CardContent>
        <LineChart data={sources} height={240}>
          <LineChart.Grid />
          <LineChart.XAxis dataKey="month" />
          <LineChart.YAxis />
          <LineChart.Line dataKey="organic" name="Organic" stroke="var(--chart-1)" />
          <LineChart.Line dataKey="paid" name="Paid ads" stroke="var(--chart-2)" />
          <LineChart.Tooltip content={<LineChart.TooltipContent valueFormatter={numbers} />} />
        </LineChart>
      </CardContent>
    </Card>
  ),
}

export const Portfolio: Story = {
  render: () => {
    const value = revenue.map((r, i) => ({ month: r.month, value: 52000 + i * 1800 + [0, 900, -600, 1800, 600, 2600, 1200, 3100, 1800, 3600, 2200, 4200][i] }))
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Portfolio value</CardTitle>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-h-foreground">$78,420</p>
          <Trend up delta="12.4%" />
        </CardHeader>
        <CardContent>
          <LineChart data={value} height={200}>
            <LineChart.Grid />
            <LineChart.XAxis dataKey="month" />
            <LineChart.YAxis domain={["dataMin - 2000", "dataMax + 2000"]} tickFormatter={dollars} />
            <LineChart.Line dataKey="value" name="Value" stroke="var(--chart-2)" />
            <LineChart.Tooltip content={<LineChart.TooltipContent valueFormatter={(v) => `$${numbers(v)}`} />} />
          </LineChart>
        </CardContent>
      </Card>
    )
  },
}
