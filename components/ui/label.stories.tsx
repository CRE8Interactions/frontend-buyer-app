import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Label } from "./label"
import { Input } from "./input"

const meta = {
  title: "Forms & inputs/Label",
  id: "atoms-label",
  component: Label,
  tags: ["autodocs"],
  args: { children: "Email" },
  parameters: { docs: { description: { component: "the reference Label: 14px, medium weight, foreground. Required adds a danger asterisk; disabled drops to 50% opacity; invalid turns danger." } } },
} satisfies Meta<typeof Label>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Required: Story = { args: { isRequired: true } }
export const Disabled: Story = { args: { isDisabled: true } }
export const Invalid: Story = { args: { isInvalid: true } }
export const WithInput: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-1">
      <Label htmlFor="n" isRequired>Full name</Label>
      <Input id="n" placeholder="Alex Rivera" />
    </div>
  ),
}

export const WithInfo: Story = {
  parameters: { docs: { description: { story: "An info button after the label explains what a field means or why it costs what it does. Hover or focus it to read the tooltip. Keep the text to one or two sentences; anything longer belongs in the field description." } } },
  render: () => (
    <div className="flex w-72 flex-col gap-1">
      <Label htmlFor="fee" info="Added to every ticket and paid by the buyer. It covers payment processing and support.">Service fee</Label>
      <Input id="fee" defaultValue="12%" />
    </div>
  ),
}
export const RequiredWithInfo: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-1">
      <Label htmlFor="d" isRequired info="Doors usually open 30 to 90 minutes before the show.">Doors open</Label>
      <Input id="d" defaultValue="18:30" />
    </div>
  ),
}
