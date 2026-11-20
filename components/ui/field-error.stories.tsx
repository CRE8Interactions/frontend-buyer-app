import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { FieldError, ErrorMessage } from "./field-error"
import { Label } from "./label"
import { Input } from "./input"

const meta = {
  title: "Forms & inputs/Field error",
  id: "atoms-fielderror",
  component: FieldError,
  tags: ["autodocs"],
  args: { children: "Enter a valid email address.", isVisible: true },
  parameters: { docs: { description: { component: "the reference FieldError: 12px danger text, px-1, collapsed (height 0, transparent) until visible; opacity 150ms and height 350ms transitions. ErrorMessage is the always-visible variant." } } },
} satisfies Meta<typeof FieldError>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const UnderInput: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-1" data-invalid="true">
      <Label htmlFor="fe">Email</Label>
      <Input id="fe" defaultValue="alex@" isInvalid />
      <FieldError>Enter a valid email address.</FieldError>
    </div>
  ),
}
export const Hidden: Story = { args: { isVisible: false } }
export const AlwaysVisibleMessage: Story = {
  render: () => <ErrorMessage>Payment declined. Try another card.</ErrorMessage>,
}
