import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import * as React from "react"
import { Button } from "./button"
import { Skeleton, SkeletonReveal } from "./skeleton"

const meta = {
  title: "Feedback/Skeleton",
  id: "atoms-skeleton",
  component: Skeleton,
  tags: ["autodocs"],
    parameters: { docs: { description: { component: "One style: the transitions.dev pulse (fades to 50% and back over 1s, ease-in-out, on repeat; no motion under reduced motion)." } } },
} satisfies Meta<typeof Skeleton>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = { args: { className: "h-4 w-48" } }
export const EventCard: Story = {
  render: () => (
    <div className="w-72 space-y-3 rounded-[24px] bg-h-surface p-4 shadow-h-surface">
      <Skeleton className="h-36 w-full rounded-[16px]" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex items-center gap-2"><Skeleton className="size-8 rounded-full" /><Skeleton className="h-3 w-24" /></div>
    </div>
  ),
}
function RevealDemo() {
  const [loading, setLoading] = React.useState(true)
  React.useEffect(() => {
    if (!loading) return
    const t = setTimeout(() => setLoading(false), 1600)
    return () => clearTimeout(t)
  }, [loading])
  return (
    <div className="flex w-80 flex-col gap-4">
      <SkeletonReveal
        loading={loading}
        skeleton={
          <div className="flex items-center gap-3 rounded-[16px] p-3">
            <Skeleton className="size-12 shrink-0 rounded-full" />
            <div className="grid flex-1 gap-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
          </div>
        }
      >
        <div className="flex items-center gap-3 rounded-[16px] p-3">
          <div className="grid size-12 shrink-0 place-items-center rounded-full bg-h-accent-soft text-base font-semibold text-h-accent-soft-foreground">HL</div>
          <div className="grid flex-1"><span className="text-base font-medium text-h-foreground">Harbour Lights Festival</span><span className="text-sm text-h-muted">Sat 14 Jun · Pier 9</span></div>
        </div>
      </SkeletonReveal>
      <Button variant="secondary" onClick={() => setLoading(true)}>Replay</Button>
    </div>
  )
}
export const Reveal: Story = {
  parameters: { docs: { description: { story: "Skeleton loader and reveal (transitions.dev): the skeleton and the content share one slot, so nothing shifts. When loading ends they cross-fade with a 2px cross-blur over 400ms." } } },
  render: () => <RevealDemo />,
}
