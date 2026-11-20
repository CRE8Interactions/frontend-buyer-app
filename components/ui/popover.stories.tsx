import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "./popover"
import { Button } from "./button"
import { Input } from "./input"
import { Label } from "./label"

const meta = {
  title: "Overlays/Popover",
  id: "molecules-popover",
  component: Popover,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "Floating panel anchored to a trigger. Use for small forms and details, not for confirmation. 24px corners on the overlay fill with the overlay shadow, 16px padding, opens from the trigger with a 150ms scale-and-fade from 90% and closes in 100ms." }, story: { inline: false, iframeHeight: 420 } } },
} satisfies Meta<typeof Popover>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Popover defaultOpen>
      <PopoverTrigger asChild><Button variant="outline">Section 112 details</Button></PopoverTrigger>
      <PopoverContent align="start">
        <PopoverHeader>
          <PopoverTitle>Section 112, Row F</PopoverTitle>
          <PopoverDescription>Lower bowl, center court. 14 seats left from $142 each.</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  ),
}
export const WithForm: Story = {
  render: () => (
    <Popover defaultOpen>
      <PopoverTrigger asChild><Button>Set price alert</Button></PopoverTrigger>
      <PopoverContent align="start" className="grid gap-3">
        <PopoverHeader><PopoverTitle>Price alert</PopoverTitle><PopoverDescription>We email you when tickets drop below your price.</PopoverDescription></PopoverHeader>
        <div className="grid gap-2"><Label htmlFor="max">Max price per ticket</Label><Input id="max" defaultValue="$120" /></div>
        <Button size="sm">Save alert</Button>
      </PopoverContent>
    </Popover>
  ),
}
export const Closed: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild><Button variant="secondary">Open seat info</Button></PopoverTrigger>
      <PopoverContent align="start"><PopoverTitle>Aisle seat</PopoverTitle><PopoverDescription>Easier access, no one beside you on the left.</PopoverDescription></PopoverContent>
    </Popover>
  ),
}
