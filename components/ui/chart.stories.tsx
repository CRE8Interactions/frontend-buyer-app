import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "./chart"

const config = {
  general: { label: "General admission", color: "var(--chart-1)" },
  vip: { label: "VIP", color: "var(--chart-2)" },
} satisfies ChartConfig

const meta = {
  title: "Display & content/Chart",
  id: "molecules-chart",
  component: ChartContainer,
  tags: ["autodocs"],
  args: { config, children: <div /> },
  parameters: { docs: { description: { component: "Recharts wrapper that wires series colours, tooltip and legend to design tokens (--chart-1 to --chart-5)." } } },
} satisfies Meta<typeof ChartContainer>
export default meta
type Story = StoryObj<typeof meta>

const sales = [
  { month: "Jan", general: 420, vip: 80 }, { month: "Feb", general: 510, vip: 96 },
  { month: "Mar", general: 680, vip: 130 }, { month: "Apr", general: 590, vip: 110 },
  { month: "May", general: 820, vip: 160 }, { month: "Jun", general: 960, vip: 210 },
]
export const Bars: Story = {
  render: () => (
    <ChartContainer config={config} className="h-72 w-full max-w-xl">
      <BarChart data={sales}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar isAnimationActive={false} dataKey="general" fill="var(--color-general)" radius={6} />
        <Bar isAnimationActive={false} dataKey="vip" fill="var(--color-vip)" radius={6} />
      </BarChart>
    </ChartContainer>
  ),
}
export const Lines: Story = {
  render: () => (
    <ChartContainer config={config} className="h-72 w-full max-w-xl">
      <LineChart data={sales}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={36} />
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line isAnimationActive={false} dataKey="general" type="monotone" stroke="var(--color-general)" strokeWidth={2} dot={false} />
        <Line isAnimationActive={false} dataKey="vip" type="monotone" stroke="var(--color-vip)" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartContainer>
  ),
}
export const StackedBars: Story = {
  render: () => (
    <ChartContainer config={config} className="h-72 w-full max-w-xl">
      <BarChart data={sales}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar isAnimationActive={false} dataKey="general" stackId="a" fill="var(--color-general)" />
        <Bar isAnimationActive={false} dataKey="vip" stackId="a" fill="var(--color-vip)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartContainer>
  ),
}
