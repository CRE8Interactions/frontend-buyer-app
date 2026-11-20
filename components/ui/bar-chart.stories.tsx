import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ArrowDown, ArrowUp } from "@phosphor-icons/react"
import { BarChart } from "./bar-chart"
import { Card, CardContent, CardHeader, CardTitle } from "./card"

const meta = {
  title: "Display & content/Bar chart",
  id: "molecules-bar-chart",
  component: BarChart,
  tags: ["autodocs", "new"],
  args: { data: [] },
  parameters: { docs: { description: { component: "A bar chart for comparing categories, with grouped, stacked and horizontal layouts. It is Recharts with our tokens: 12px muted tick labels, no axis or tick lines, a faint grid and a subtle filled rectangle behind the hovered bar. Build it from `BarChart.Grid`, `XAxis`, `YAxis`, `Bar`, `Tooltip` and `TooltipContent` (the styled tooltip). Bars have 6px outer corners; use `layout=\"vertical\"` for horizontal bars. Series colours are `--chart-1` to `--chart-5`." } } },
} satisfies Meta<typeof BarChart>
export default meta
type Story = StoryObj<typeof meta>

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const sales = months.map((month, i) => ({ month, tickets: [420, 510, 680, 590, 820, 960, 880, 1040, 990, 1180, 1120, 1320][i] }))
const tiers = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((month, i) => ({
  month,
  general: [420, 510, 680, 590, 820, 960][i],
  vip: [80, 96, 130, 110, 160, 210][i],
  resale: [60, 72, 90, 84, 120, 150][i],
}))
const venues = [
  { venue: "Riverside Arena", sold: 4820 },
  { venue: "Old Town Theatre", sold: 3640 },
  { venue: "Harbour Hall", sold: 2910 },
  { venue: "Park Stage", sold: 2150 },
  { venue: "Studio 9", sold: 1280 },
]
const numbers = (value: number | string) => Number(value).toLocaleString("en-US")
const Dot = ({ color }: { color: string }) => <span aria-hidden className="size-2.5 rounded-full" style={{ background: color }} />

export const Basic: Story = {
  render: () => (
    <Card className="w-full max-w-2xl">
      <CardHeader><CardTitle>Tickets sold per month</CardTitle></CardHeader>
      <CardContent>
        <BarChart data={sales} height={240}>
          <BarChart.Grid />
          <BarChart.XAxis dataKey="month" />
          <BarChart.YAxis />
          <BarChart.Bar dataKey="tickets" name="Tickets" fill="var(--chart-1)" />
          <BarChart.Tooltip content={<BarChart.TooltipContent valueFormatter={numbers} />} />
        </BarChart>
      </CardContent>
    </Card>
  ),
}

export const Comparison: Story = {
  parameters: { docs: { description: { story: "Two series side by side per category, to compare this year with last." } } },
  render: () => {
    const data = months.slice(0, 6).map((month, i) => ({ month, thisYear: sales[i].tickets, lastYear: [380, 440, 610, 560, 700, 820][i] }))
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex-row items-center justify-between gap-4">
          <CardTitle>This year vs last year</CardTitle>
          <ul className="flex items-center gap-4 text-xs text-h-muted">
            <li className="flex items-center gap-1.5"><Dot color="var(--chart-1)" />This year</li>
            <li className="flex items-center gap-1.5"><Dot color="var(--chart-3)" />Last year</li>
          </ul>
        </CardHeader>
        <CardContent>
          <BarChart data={data} height={240}>
            <BarChart.Grid />
            <BarChart.XAxis dataKey="month" />
            <BarChart.YAxis />
            <BarChart.Bar dataKey="lastYear" name="Last year" fill="var(--chart-3)" />
            <BarChart.Bar dataKey="thisYear" name="This year" fill="var(--chart-1)" />
            <BarChart.Tooltip content={<BarChart.TooltipContent valueFormatter={numbers} />} />
          </BarChart>
        </CardContent>
      </Card>
    )
  },
}

export const CustomTooltip: Story = {
  parameters: { docs: { description: { story: "`valueFormatter` and `labelFormatter` shape the tooltip, or pass your own renderer as the tooltip `content`." } } },
  render: () => (
    <Card className="w-full max-w-2xl">
      <CardHeader><CardTitle>Tickets sold per month</CardTitle></CardHeader>
      <CardContent>
        <BarChart data={sales} height={240}>
          <BarChart.Grid />
          <BarChart.XAxis dataKey="month" />
          <BarChart.YAxis />
          <BarChart.Bar dataKey="tickets" name="Tickets" fill="var(--chart-2)" />
          <BarChart.Tooltip content={<BarChart.TooltipContent labelFormatter={(l) => `${l} 2026`} valueFormatter={(v) => `${numbers(v)} tickets`} />} />
        </BarChart>
      </CardContent>
    </Card>
  ),
}

export const Grouped: Story = {
  render: () => (
    <Card className="w-full max-w-2xl">
      <CardHeader className="flex-row items-center justify-between gap-4">
        <CardTitle>Tickets by tier</CardTitle>
        <ul className="flex items-center gap-4 text-xs text-h-muted">
          <li className="flex items-center gap-1.5"><Dot color="var(--chart-1)" />General</li>
          <li className="flex items-center gap-1.5"><Dot color="var(--chart-2)" />VIP</li>
          <li className="flex items-center gap-1.5"><Dot color="var(--chart-4)" />Resale</li>
        </ul>
      </CardHeader>
      <CardContent>
        <BarChart data={tiers} height={240}>
          <BarChart.Grid />
          <BarChart.XAxis dataKey="month" />
          <BarChart.YAxis />
          <BarChart.Bar dataKey="general" name="General" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
          <BarChart.Bar dataKey="vip" name="VIP" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
          <BarChart.Bar dataKey="resale" name="Resale" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
          <BarChart.Tooltip content={<BarChart.TooltipContent valueFormatter={numbers} />} />
        </BarChart>
      </CardContent>
    </Card>
  ),
}

export const Horizontal: Story = {
  parameters: { docs: { description: { story: "`layout=\"vertical\"` draws horizontal bars: the category goes on the YAxis, the numbers on the XAxis." } } },
  render: () => (
    <Card className="w-full max-w-2xl">
      <CardHeader><CardTitle>Tickets sold by venue</CardTitle></CardHeader>
      <CardContent>
        <BarChart data={venues} layout="vertical" height={240} margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
          <BarChart.Grid horizontal={false} vertical />
          <BarChart.XAxis type="number" tickFormatter={numbers} />
          <BarChart.YAxis type="category" dataKey="venue" />
          <BarChart.Bar dataKey="sold" name="Sold" fill="var(--chart-1)" radius={[0, 6, 6, 0]} />
          <BarChart.Tooltip content={<BarChart.TooltipContent valueFormatter={numbers} />} />
        </BarChart>
      </CardContent>
    </Card>
  ),
}

export const HorizontalStacked: Story = {
  render: () => {
    const data = venues.map((v, i) => ({ venue: v.venue, general: Math.round(v.sold * 0.7), vip: Math.round(v.sold * (0.2 - i * 0.01)), resale: Math.round(v.sold * (0.1 + i * 0.01)) }))
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader><CardTitle>Tickets by venue and tier</CardTitle></CardHeader>
        <CardContent>
          <BarChart data={data} layout="vertical" height={240} margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
            <BarChart.Grid horizontal={false} vertical />
            <BarChart.XAxis type="number" tickFormatter={numbers} />
            <BarChart.YAxis type="category" dataKey="venue" />
            <BarChart.Bar dataKey="general" name="General" stackId="t" fill="var(--chart-1)" radius={0} />
            <BarChart.Bar dataKey="vip" name="VIP" stackId="t" fill="var(--chart-2)" radius={0} />
            <BarChart.Bar dataKey="resale" name="Resale" stackId="t" fill="var(--chart-4)" radius={[0, 6, 6, 0]} />
            <BarChart.Tooltip content={<BarChart.TooltipContent valueFormatter={numbers} />} />
          </BarChart>
        </CardContent>
      </Card>
    )
  },
}

const kpis = [
  { label: "Tickets sold", value: "12,480", delta: "8.2%", up: true, color: "var(--chart-1)", bars: [3, 4, 3.5, 5, 4.5, 6, 7] },
  { label: "Refunds", value: "312", delta: "2.1%", up: false, color: "var(--chart-5)", bars: [5, 4, 5.5, 4.2, 4.8, 3.6, 3.2] },
]
export const KpiWithBarChart: Story = {
  render: () => (
    <div className="grid w-full max-w-xl gap-3 sm:grid-cols-2">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="gap-3 p-4">
          <p className="text-sm text-h-muted">{kpi.label}</p>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-2xl font-semibold tabular-nums text-h-foreground">{kpi.value}</p>
              <p className={`mt-1 flex items-center gap-1 text-xs ${kpi.up ? "text-h-success-soft-foreground" : "text-h-danger-soft-foreground"}`}>
                {kpi.up ? <ArrowUp weight="bold" className="size-3" /> : <ArrowDown weight="bold" className="size-3" />}
                {kpi.delta} <span className="text-h-muted">vs last week</span>
              </p>
            </div>
            <BarChart data={kpi.bars.map((v, i) => ({ i, v }))} height={48} width={88} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <BarChart.Bar dataKey="v" fill={kpi.color} radius={[3, 3, 0, 0]} maxBarSize={8} isAnimationActive={false} />
            </BarChart>
          </div>
        </Card>
      ))}
    </div>
  ),
}

export const Stacked: Story = {
  render: () => (
    <Card className="w-full max-w-2xl">
      <CardHeader><CardTitle>Tickets by tier</CardTitle></CardHeader>
      <CardContent>
        <BarChart data={tiers} height={240}>
          <BarChart.Grid />
          <BarChart.XAxis dataKey="month" />
          <BarChart.YAxis />
          <BarChart.Bar dataKey="general" name="General" stackId="t" fill="var(--chart-1)" radius={0} />
          <BarChart.Bar dataKey="vip" name="VIP" stackId="t" fill="var(--chart-2)" radius={0} />
          <BarChart.Bar dataKey="resale" name="Resale" stackId="t" fill="var(--chart-4)" radius={[6, 6, 0, 0]} />
          <BarChart.Tooltip content={<BarChart.TooltipContent valueFormatter={numbers} />} />
        </BarChart>
      </CardContent>
    </Card>
  ),
}
