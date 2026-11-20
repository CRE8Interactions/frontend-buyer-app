import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { CalendarBlank } from "@phosphor-icons/react"
import { Marker, MarkerContent, MarkerIcon } from "./marker"

const meta = {
  title: "Display & content/Marker",
  id: "atoms-marker",
  component: Marker,
  tags: ["autodocs"],
  argTypes: { variant: { control: "select", options: ["default", "separator", "border"] } },
  args: { variant: "separator", children: <MarkerContent>Today, 14 June</MarkerContent> },
  parameters: { docs: { description: { component: "Inline label that divides a feed, such as a date or a status line in a conversation." } } },
} satisfies Meta<typeof Marker>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
export const Variants: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-6">
      <Marker><MarkerContent>Doors open at 19:00</MarkerContent></Marker>
      <Marker variant="separator"><MarkerContent>Yesterday</MarkerContent></Marker>
      <Marker variant="border"><MarkerContent>Section 104 sold out</MarkerContent></Marker>
    </div>
  ),
}
export const WithIcon: Story = {
  render: () => (
    <div className="max-w-md">
      <Marker variant="separator">
        <MarkerIcon><CalendarBlank weight="bold" /></MarkerIcon>
        <MarkerContent>Event moved to Saturday, 21 June</MarkerContent>
      </Marker>
    </div>
  ),
}
