import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Progress } from "./progress"

const colors = ["default", "accent", "success", "warning", "danger"] as const
const meta = {
  title: "Feedback/Progress",
  id: "atoms-progress",
  component: Progress,
  tags: ["autodocs"],
  args: { value: 60, className: "w-72" },
  argTypes: { color: { control: "select", options: colors }, size: { control: "select", options: ["sm", "md", "lg"] }, value: { control: { type: "range", min: 0, max: 100 } } },
  parameters: { docs: { description: { component: "the reference ProgressBar. Indeterminate (no value) needs global `h-progress-bar-indeterminate` keyframes." } } },
} satisfies Meta<typeof Progress>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
export const WithLabel: Story = { args: { label: "Tickets sold", showValueLabel: true, value: 72 } }
export const CustomValueLabel: Story = { args: { label: "Capacity", showValueLabel: true, valueLabel: "360 / 500", value: 72 } }
export const Sizes: Story = { render: () => <div className="flex w-72 flex-col gap-4">{(["sm", "md", "lg"] as const).map((s) => <Progress key={s} size={s} value={50} label={s} showValueLabel />)}</div> }
export const Colors: Story = { render: () => <div className="flex w-72 flex-col gap-4">{colors.map((c) => <Progress key={c} color={c} value={65} label={c} showValueLabel />)}</div> }
export const Indeterminate: Story = { args: { value: undefined, label: "Processing payment" } }
export const Disabled: Story = { args: { "aria-disabled": true, label: "Payout", showValueLabel: true } }
