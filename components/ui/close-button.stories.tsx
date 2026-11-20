import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { CloseButton } from "./close-button"

const meta = {
  title: "Actions/Close button",
  id: "atoms-close-button",
  component: CloseButton,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "the reference CloseButton: 24px, 12px radius, default surface, muted Phosphor X, hover default-hover, press scale 0.93. On hover the fill and the icon colour fade in and out." } } },
} satisfies Meta<typeof CloseButton>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
export const Disabled: Story = { args: { disabled: true } }
export const InCard: Story = {
  render: () => (
    <div className="flex w-80 items-start justify-between rounded-3xl bg-h-surface p-4 text-h-surface-foreground">
      <div><p className="text-sm font-medium">Order confirmed</p><p className="text-sm text-h-muted">2 tickets, Friday 7 Nov</p></div>
      <CloseButton />
    </div>
  ),
}
