import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { PullLoadMore } from "./PullLoadMore"

const TOTAL = 19

function Demo({ step, noun }: { step: number; noun?: string }) {
  const [shown, setShown] = useState(11)
  return (
    <div className="mx-auto max-w-[520px] px-4 py-6">
      <ul className="grid gap-2">
        {Array.from({ length: shown }, (_, i) => (
          <li key={i} className="flex h-16 items-center rounded-2xl bg-secondary px-4 text-[14px] text-ink2">Item {i + 1}</li>
        ))}
      </ul>
      <PullLoadMore remaining={TOTAL - shown} step={step} noun={noun} onMore={() => setShown((n) => Math.min(TOTAL, n + step))} />
      {shown >= TOTAL && <p className="mt-4 text-center text-[13px] text-mute">That's everything.</p>}
    </div>
  )
}

const meta = {
  title: "Page sections/Pull to load more",
  id: "organisms-pull-load-more",
  component: PullLoadMore,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: "Replaces a \"Show more\" button on any list that grows (wallet today; browse, team and venue pages next). Scroll to the end of the list, then keep scrolling (wheel or trackpad) or pull up (touch): a ring fills one to one with the pull, stiffens past the line like a rubber band, and springs back with a small overshoot if you let go early. Crossing the line swells and tints the ring; releasing (touch) or reaching it (wheel) loads the next batch and pops the ring into a spinner. A keyboard user tabs to a hidden \"Load more\" button. It listens on the window and never blocks scrolling. Props: `remaining`, `step`, `onMore`, optional `noun` (\"events\"). Reduced motion keeps only the ring fill." } },
  },
} satisfies Meta<typeof PullLoadMore>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { args: { remaining: 8, step: 8, onMore: () => {} }, render: () => <Demo step={8} /> }
export const WithNoun: Story = {
  name: "With a noun",
  args: { remaining: 8, step: 4, onMore: () => {} },
  render: () => <Demo step={4} noun="events" />,
}
export const Mobile: Story = {
  args: { remaining: 8, step: 8, onMore: () => {} },
  globals: { viewport: { value: "mobile1", isRotated: false } },
  render: () => <Demo step={8} />,
}
