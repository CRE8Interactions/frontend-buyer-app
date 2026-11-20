import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { SegmentRing, type Segment } from "./segment-ring"

const meta = {
  title: "Display & content/Segment ring",
  id: "atoms-segment-ring",
  component: SegmentRing,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "How much of something is left, as one ring with an arc for each item: a game, a credit, a seat. Faint arcs are used, grey arcs are still to come, blue arcs were sent on, and the next one is the single green mark, because green is for the thing to do next. What you put inside sits in the middle, usually the number left. The arcs fade in one after another; reduced motion shows them at once. Give it a `label` when nothing beside it says the same thing.",
      },
    },
  },
  args: {
    segments: ["used", "used", "left", "sent", "left"] as Segment[],
    size: 124,
  },
  argTypes: { size: { control: { type: "range", min: 24, max: 200, step: 4 } } },
  render: (args) => (
    <SegmentRing {...args}>
      <span className="text-[44px] font-semibold leading-none tracking-[-0.05em] tabular-nums">{args.segments.filter((s) => s === "left").length}</span>
    </SegmentRing>
  ),
} satisfies Meta<typeof SegmentRing>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

const count = (s: Segment[]) => s.filter((x) => x === "left").length

/** The three states side by side, then the ring with nothing left. */
export const States: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-8">
      {([
        ["Season so far", ["used", "used", "left", "sent", "left"]],
        ["Nothing used yet", ["left", "left", "left", "left"]],
        ["All attended", ["used", "used", "used"]],
        ["One credit", ["left"]],
      ] as [string, Segment[]][]).map(([name, segments]) => (
        <div key={name} className="flex flex-col items-center gap-2">
          <SegmentRing segments={segments} size={96} label={name}>
            <span className="text-[34px] font-semibold leading-none tracking-[-0.04em] tabular-nums">{count(segments)}</span>
          </SegmentRing>
          <span className="text-[13px] text-muted-foreground">{name}</span>
        </div>
      ))}
    </div>
  ),
}

/** From a badge in a list row to the headline of a page. */
export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-8">
      {[28, 44, 72, 124].map((size) => (
        <SegmentRing key={size} segments={["used", "left", "left", "sent"]} size={size}>
          <span className="font-semibold leading-none tabular-nums" style={{ fontSize: size * 0.36 }}>2</span>
        </SegmentRing>
      ))}
    </div>
  ),
}

/** A long season: the arcs shrink and the gaps with them. */
export const ManyItems: Story = {
  args: { segments: ["used", "used", "used", "used", "used", "used", "left", "left", "left", "left", "sent", "left"] as Segment[], size: 140 },
}
