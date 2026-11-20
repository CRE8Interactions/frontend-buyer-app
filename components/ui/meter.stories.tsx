import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Meter } from "./meter"

const colors = ["default", "accent", "success", "warning", "danger"] as const
const meta = {
  title: "Feedback/Meter",
  id: "atoms-meter",
  component: Meter,
  tags: ["autodocs"],
  args: { value: 60, className: "w-72" },
  argTypes: { color: { control: "select", options: colors }, size: { control: "select", options: ["sm", "md", "lg"] } },
  parameters: { docs: { description: { component: "the reference Meter: a quantity within a known range, e.g. venue capacity." } } },
} satisfies Meta<typeof Meter>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
export const WithLabel: Story = { args: { label: "Venue capacity", showValueLabel: true, value: 420, maxValue: 500, valueLabel: "420 / 500" } }
export const Sizes: Story = { render: () => <div className="flex w-72 flex-col gap-4">{(["sm", "md", "lg"] as const).map((s) => <Meter key={s} size={s} value={50} label={s} showValueLabel />)}</div> }
export const Colors: Story = { render: () => <div className="flex w-72 flex-col gap-4">{colors.map((c) => <Meter key={c} color={c} value={65} label={c} showValueLabel />)}</div> }
export const Disabled: Story = { args: { isDisabled: true, label: "Scans", showValueLabel: true } }
