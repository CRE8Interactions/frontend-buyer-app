import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { CopyField } from "./copy-field"
import { Label } from "./label"

const meta = {
  title: "Actions/Copy field",
  id: "molecules-copy-field",
  component: CopyField,
  tags: ["autodocs"],
  args: { value: "ORD-2026-0614-48213" },
  parameters: { docs: { description: { component: "Read-only value with a copy button for order IDs, ticket links and API keys. The button turns into a green check for 1.6 seconds and announces \"Copied\"." } } },
} satisfies Meta<typeof CopyField>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <div className="flex w-80 flex-col gap-1"><Label htmlFor="cf1">Order ID</Label><CopyField id="cf1" {...args} /></div>
  ),
}
export const TicketLink: Story = {
  render: () => <div className="w-96"><CopyField aria-label="Ticket link" value="https://blocktickets.com/e/harbour-lights-2026" /></div>,
}
export const Masked: Story = {
  parameters: { docs: { description: { story: "Secrets are masked. Copy still copies the real value." } } },
  render: () => <div className="w-80"><CopyField aria-label="API key" masked value="bt_live_9f3a7c1e5d2b" /></div>,
}
export const Variants: Story = {
  render: () => (
    <div className="grid w-80 gap-3">
      <CopyField aria-label="primary" value="ORD-48213" />
      <CopyField aria-label="tertiary" variant="tertiary" value="ORD-48213" />
      <CopyField aria-label="underlined" variant="underlined" value="ORD-48213" />
    </div>
  ),
}
