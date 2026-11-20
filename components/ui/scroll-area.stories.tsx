import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ScrollArea, ScrollBar } from "./scroll-area"

const meta = {
  title: "Layout & foundations/Scroll area",
  id: "molecules-scroll-area",
  component: ScrollArea,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "Custom thin scrollbar over a fixed-size region. Give the root an explicit height or width." } } },
} satisfies Meta<typeof ScrollArea>
export default meta
type Story = StoryObj<typeof meta>

const sections = ["101", "104", "108", "112", "116", "120", "205", "210", "215", "220", "301", "310", "320"]
export const Vertical: Story = {
  render: () => (
    <ScrollArea className="h-56 w-64 rounded-3xl border">
      <div className="p-4">
        <p className="mb-3 text-sm font-semibold">Sections</p>
        {sections.map((s) => <div key={s} className="border-b py-2 text-sm last:border-0">Section {s}</div>)}
      </div>
    </ScrollArea>
  ),
}
export const Horizontal: Story = {
  render: () => (
    <ScrollArea className="w-96 rounded-3xl border whitespace-nowrap">
      <div className="flex gap-3 p-4">
        {["Raptors vs Celtics", "Taylor Swift", "Blue Jays vs Yankees", "Drake", "Leafs vs Bruins", "Coldplay"].map((e) => (
          <div key={e} className="shrink-0 rounded-2xl bg-muted px-4 py-6 text-sm font-medium">{e}</div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  ),
}
