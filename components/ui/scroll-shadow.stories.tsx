import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ScrollShadow } from "./scroll-shadow"

const meta = {
  title: "Layout & foundations/Scroll shadow",
  id: "atoms-scroll-shadow",
  component: ScrollShadow,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "A scrolling area that fades at an edge while there is more to see that way. Use it on long lists in cards and popovers, and on rows of chips that overflow. The fade is 40px by default and follows the scroll position." } } },
} satisfies Meta<typeof ScrollShadow>
export default meta
type Story = StoryObj<typeof meta>

const events = ["Harbour Lights Festival", "Saturday Night Derby", "Spring Gala", "City Marathon Expo", "Indie Rooftop Sessions", "Winter Classic", "Jazz in the Park", "Comedy Night", "Food Truck Friday", "Charity Gala", "Open Air Cinema", "Rooftop Brunch"]
export const Vertical: Story = {
  render: () => (
    <ScrollShadow className="h-56 w-72 rounded-3xl bg-h-surface p-4" aria-label="Upcoming events" tabIndex={0}>
      <ul className="flex flex-col gap-3 text-sm">{events.map((e) => <li key={e}>{e}</li>)}</ul>
    </ScrollShadow>
  ),
}
export const Horizontal: Story = {
  render: () => (
    <ScrollShadow orientation="horizontal" hideScrollBar className="w-72" aria-label="Categories" tabIndex={0}>
      <div className="flex gap-2 pb-1">{["Music", "Sports", "Theatre", "Comedy", "Festivals", "Family", "Food", "Nightlife", "Charity"].map((c) => <span key={c} className="shrink-0 rounded-full bg-h-default px-3 py-1.5 text-sm">{c}</span>)}</div>
    </ScrollShadow>
  ),
}
export const SizeAndOffset: Story = {
  parameters: { docs: { description: { story: "`size` is the length of the fade, `offset` the distance scrolled before it starts. Here a short fade that begins after 24px." } } },
  render: () => (
    <ScrollShadow size={16} offset={24} className="h-40 w-72 rounded-3xl bg-h-surface p-4" aria-label="Events" tabIndex={0}>
      <ul className="flex flex-col gap-3 text-sm">{events.map((e) => <li key={e}>{e}</li>)}</ul>
    </ScrollShadow>
  ),
}
export const Disabled: Story = {
  render: () => (
    <ScrollShadow isEnabled={false} className="h-40 w-72 rounded-3xl bg-h-surface p-4" aria-label="Events" tabIndex={0}>
      <ul className="flex flex-col gap-3 text-sm">{events.map((e) => <li key={e}>{e}</li>)}</ul>
    </ScrollShadow>
  ),
}
