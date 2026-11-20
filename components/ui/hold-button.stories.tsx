import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Trash, CreditCard } from "@phosphor-icons/react"
import { HoldButton } from "./hold-button"

const meta = {
  title: "Actions/Hold button",
  component: HoldButton,
  tags: ["autodocs"],
  args: { children: "Hold to delete", onHoldComplete: () => alert("Confirmed") },
  parameters: { docs: { description: { component: "Press and hold: an overlay sweeps across over 2s. Release early and it snaps back in 200ms with no action; hold to the end and it confirms. Works with mouse, touch and the keyboard (hold Enter or Space). Use it for destructive or irreversible actions, so a stray tap or a slip can never fire them." } } },
} satisfies Meta<typeof HoldButton>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = { render: (a) => <HoldButton {...a}><Trash weight="bold" /> Hold to delete</HoldButton> }
export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <HoldButton variant="danger-soft" onHoldComplete={() => {}}>Hold to delete</HoldButton>
      <HoldButton variant="danger" onHoldComplete={() => {}}>Hold to cancel order</HoldButton>
      <HoldButton variant="primary" onHoldComplete={() => {}}><CreditCard weight="bold" /> Hold to pay</HoldButton>
      <HoldButton variant="secondary" onHoldComplete={() => {}}>Hold to archive</HoldButton>
      <HoldButton variant="outline" onHoldComplete={() => {}}>Hold to reset</HoldButton>
    </div>
  ),
}
export const Sweeps: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {(["right", "left", "down", "up"] as const).map((s) => <HoldButton key={s} sweep={s} duration={1200} onHoldComplete={() => {}}>Hold ({s})</HoldButton>)}
    </div>
  ),
}

/* `onHoldProgress` reports how far the hold has got (0 to 1) every frame, so something else on the page can follow it: here a bar. */
export const WithProgress: Story = {
  render: () => {
    const [p, setP] = React.useState(0)
    return (
      <div className="flex w-72 flex-col gap-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10"><div className="h-full origin-left rounded-full bg-primary" style={{ width: `${p * 100}%` }} /></div>
        <HoldButton variant="primary" duration={1400} onHoldProgress={setP} onHoldComplete={() => {}}>Hold to send</HoldButton>
      </div>
    )
  },
}

/* The primary hold fills with a deeper shade of its own green (not the navy it used to), and the fill reaches 1px past the edge so no hairline of the button shows around it. Hold to see it. */
export const PrimaryFill: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <HoldButton variant="primary" size="lg" duration={1400} onHoldComplete={() => {}}><CreditCard weight="bold" /> Hold to pay</HoldButton>
      <div className="rounded-[24px] bg-card p-4"><HoldButton variant="primary" size="lg" duration={1400} holdLabel="Keep holding…" onHoldComplete={() => {}}>Hold to send ticket</HoldButton></div>
    </div>
  ),
}
