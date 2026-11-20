import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Status } from "./status"

const meta = {
  title: "Display & content/Status",
  id: "atoms-status",
  component: Status,
  tags: ["autodocs"],
  argTypes: {
    color: { control: "select", options: ["success", "warning", "danger", "info", "purple", "neutral"] },
    size: { control: "select", options: ["sm", "md"] },
    pulse: { control: "boolean" },
  },
  args: { color: "success", size: "sm", children: "On sale" },
  parameters: {
    docs: {
      description: {
        component:
          "A small glowing dot and a label for availability and state that should read as text, not as a pill. The dot takes the status colour and the text keeps the colour of its surroundings, so it sits equally well on a card and over a photo. Use a Badge when the status needs a filled shape.",
      },
    },
  },
} satisfies Meta<typeof Status>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
export const Colors: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <Status color="success">On sale</Status>
      <Status color="warning">Few left</Status>
      <Status color="info">Resale only</Status>
      <Status color="purple">Presale</Status>
      <Status color="danger">Sold out</Status>
      <Status color="neutral">Ended</Status>
    </div>
  ),
}
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <Status size="sm">Small, 13px</Status>
      <Status size="md">Medium, 14px</Status>
    </div>
  ),
}
export const Pulse: Story = {
  parameters: { docs: { description: { story: "`pulse` breathes the glow for something live, such as tickets on sale right now. It is off when the person prefers reduced motion." } } },
  render: () => <Status pulse>On sale now</Status>,
}
export const PulseRules: Story = {
  name: "Pulse: when to use it",
  parameters: { docs: { description: { story: "**Pulse means happening now.** Use it only for a live state that changes by itself while the person watches: an event that is on tonight, a payout that is processing, a bank that is verifying. Colour carries the meaning (success green for live, info blue for in progress), the pulse only says it is current. Rules: one pulse in view at a time; never on a finished or fixed state (Sold out, Ended, Paid, On sale in a list); never on a row repeated in a list unless it is the one that is live; never for loading (that is the Skeleton); never as decoration. The dot keeps its label, so the state is never only a colour or a motion, and the pulse is off with reduced motion." } } },
  render: () => (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="grid gap-3 rounded-[24px] bg-h-surface p-4">
        <p className="text-sm font-semibold">Use</p>
        <Status color="success" pulse>Tonight</Status>
        <Status color="info" pulse>Verifying bank</Status>
        <Status color="info" pulse>Payout processing</Status>
      </div>
      <div className="grid gap-3 rounded-[24px] bg-h-surface p-4">
        <p className="text-sm font-semibold">Do not use</p>
        <Status color="danger">Sold out</Status>
        <Status color="neutral">Ended</Status>
        <Status color="success">Paid</Status>
        <Status color="neutral">Friday, Mar 14</Status>
      </div>
    </div>
  ),
}
export const OnAPhoto: Story = {
  parameters: { docs: { description: { story: "The text inherits its colour, so on a dark surface or image it simply takes the surface's text colour." } } },
  render: () => (
    <div className="flex h-32 w-72 items-end rounded-[20px] bg-foreground p-4 text-background">
      <Status color="warning">Few left</Status>
    </div>
  ),
}
