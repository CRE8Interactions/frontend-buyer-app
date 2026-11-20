import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Spinner } from "./spinner"
import { Button } from "./button"

const meta = {
  title: "Feedback/Spinner",
  id: "atoms-spinner",
  component: Spinner,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "the reference spinner: sm 16, md 24, lg 32, xl 40, spins at 0.75s linear. Colours current, accent, danger, success, warning. Default here is sm so old usages keep 16px." } } },
} satisfies Meta<typeof Spinner>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      {(["sm", "md", "lg", "xl"] as const).map((s) => <Spinner key={s} size={s} />)}
    </div>
  ),
}
export const Colors: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      {(["current", "accent", "danger", "success", "warning"] as const).map((c) => <Spinner key={c} size="lg" color={c} />)}
    </div>
  ),
}
export const InButton: Story = {
  render: () => (
    <div className="flex gap-3">
      <Button pending>Holding your seats</Button>
      <Button variant="secondary" disabled><Spinner /> Processing payment</Button>
    </div>
  ),
}
