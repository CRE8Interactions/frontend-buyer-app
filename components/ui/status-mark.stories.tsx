import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Button } from "./button"
import { StatusMark } from "./status-mark"

const meta = {
  title: "Display & content/Status mark",
  id: "atoms-status-mark",
  component: StatusMark,
  tags: ["autodocs"],
  argTypes: {
    tone: { control: "select", options: ["success", "info", "warning", "danger"] },
    size: { control: { type: "range", min: 24, max: 160, step: 4 } },
  },
  args: { tone: "success", size: 96 },
  parameters: {
    docs: {
      description: {
        component:
          "The animated mark that confirms an outcome: a soft disc, a ripple, and an icon drawn in one stroke. A check for success (the one on the sell and transfer confirmations), an i for info, a ! for warning, a cross for danger. It plays once and reduced motion shows the finished mark. For small inline state use Status or a Badge.",
      },
    },
  },
} satisfies Meta<typeof StatusMark>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

/** Bumping the key remounts the marks so they play again. */
function Replayable({ children }: { children: (k: number) => React.ReactNode }) {
  const [k, setK] = React.useState(0)
  return (
    <div className="flex flex-col items-start gap-6">
      <div key={k} className="flex flex-wrap items-center gap-10">{children(k)}</div>
      <Button size="sm" variant="secondary" onClick={() => setK((n) => n + 1)}>Replay</Button>
    </div>
  )
}

export const Tones: Story = {
  render: () => (
    <Replayable>{() => (["success", "info", "warning", "danger"] as const).map((t) => (
      <div key={t} className="flex flex-col items-center gap-3"><StatusMark tone={t} /><span className="text-sm capitalize text-muted-foreground">{t}</span></div>
    ))}</Replayable>
  ),
}

export const Sizes: Story = {
  render: () => (
    <Replayable>{() => [32, 48, 72, 96, 144].map((s) => (
      <div key={s} className="flex items-end gap-3">{(["success", "info", "warning", "danger"] as const).map((t) => <StatusMark key={t} tone={t} size={s} />)}</div>
    ))}</Replayable>
  ),
}

export const WithMessage: Story = {
  render: () => (
    <div className="grid gap-6 sm:grid-cols-2">
      {([["success", "Ticket sent", "Alex will get it by email in a moment."], ["info", "Transfer pending", "We’ll tell you once they accept."], ["warning", "Almost sold out", "Only a few seats are left at this price."], ["danger", "Payment failed", "Your card was declined. Try another."]] as const).map(([t, h, p]) => (
        <div key={t} className="flex flex-col items-center gap-4 rounded-[28px] bg-secondary/70 p-8 text-center">
          <StatusMark tone={t} label="" />
          <div><p className="text-lg font-semibold">{h}</p><p className="text-sm text-muted-foreground">{p}</p></div>
        </div>
      ))}
    </div>
  ),
}
