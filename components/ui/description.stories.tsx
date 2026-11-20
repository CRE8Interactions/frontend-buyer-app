import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Description } from "./description"
import { Label } from "./label"
import { Input } from "./input"

const meta = {
  title: "Forms & inputs/Description",
  id: "atoms-description",
  component: Description,
  tags: ["autodocs"],
  args: { children: "We send your tickets to this address." },
  parameters: { docs: { description: { component: "the reference Description: 12px muted helper text. Place it under a field; hide it when the field is invalid and the error shows." } } },
} satisfies Meta<typeof Description>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const BelowField: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-1">
      <Label htmlFor="d">Email</Label>
      <Input id="d" placeholder="you@club.com" />
      <Description>We send your tickets to this address.</Description>
    </div>
  ),
}
