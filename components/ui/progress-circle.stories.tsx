import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ProgressCircle } from "./progress-circle"

const colors = ["default", "accent", "success", "warning", "danger"] as const
const meta = {
  title: "Feedback/Progress Circle",
  id: "atoms-progress-circle",
  component: ProgressCircle,
  tags: ["autodocs"],
  args: { value: 65 },
  argTypes: { color: { control: "select", options: colors }, size: { control: "select", options: ["sm", "md", "lg"] } },
  parameters: { docs: { description: { component: "the reference ProgressCircle. Indeterminate needs global `h-progress-circle-spin` keyframes." } } },
} satisfies Meta<typeof ProgressCircle>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
export const Sizes: Story = { render: () => <div className="flex items-center gap-4">{(["sm", "md", "lg"] as const).map((s) => <ProgressCircle key={s} size={s} value={65} aria-label={s} />)}</div> }
export const Colors: Story = { render: () => <div className="flex items-center gap-4">{colors.map((c) => <ProgressCircle key={c} color={c} value={65} aria-label={c} />)}</div> }
export const Indeterminate: Story = { args: { value: undefined, "aria-label": "Loading" } }
export const Disabled: Story = { args: { isDisabled: true } }
