import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Textarea } from "./textarea"
import { Label } from "./label"
import { Description } from "./description"
import { FieldError } from "./field-error"

const meta = {
  title: "Forms & inputs/Textarea",
  id: "atoms-textarea",
  component: Textarea,
  tags: ["autodocs"],
  args: { placeholder: "Tell us about your event" },
  argTypes: {
    variant: { control: "inline-radio", options: ["primary", "secondary", "tertiary"] },
    fullWidth: { control: "boolean" },
    disabled: { control: "boolean" },
    isInvalid: { control: "boolean" },
  },
  parameters: { docs: { description: { component: "the reference TextArea: same field styling as Input, min-height 38px, grows with content." } } },
} satisfies Meta<typeof Textarea>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = { render: (args) => <div className="w-80"><Textarea {...args} /></div> }

export const Variants: Story = {
  render: () => (
    <div className="grid w-80 gap-4">
      <Textarea variant="primary" placeholder="Primary" />
      <Textarea variant="secondary" placeholder="Secondary (on a card)" />
    </div>
  ),
}

export const WithLabelAndDescription: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-1">
      <Label htmlFor="ta">Message to the organiser</Label>
      <Textarea id="ta" rows={4} placeholder="Door times, accessibility needs..." />
      <Description>Visible to the organiser only.</Description>
    </div>
  ),
}

export const Invalid: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-1" data-invalid="true">
      <Label htmlFor="tai">Message</Label>
      <Textarea id="tai" isInvalid defaultValue="Hi" />
      <FieldError>Message must be at least 10 characters.</FieldError>
    </div>
  ),
}

export const Disabled: Story = { render: () => <div className="w-80"><Textarea disabled defaultValue="Ticket notes are locked." /></div> }
export const ReadOnly: Story = { render: () => <div className="w-80"><Textarea readOnly defaultValue="Order confirmed. Doors open at 19:00." /></div> }
export const FullWidth: Story = { render: () => <div className="w-[480px] max-w-full"><Textarea fullWidth rows={3} placeholder="Full width" /></div> }
export const Rows: Story = { render: () => <div className="w-80"><Textarea rows={6} placeholder="Six rows" /></div> }
export const Sizes: Story = {
  render: () => (
    <div className="grid w-80 gap-3">
      <Textarea size="sm" placeholder="Small" rows={1} />
      <Textarea size="md" placeholder="Medium" rows={2} />
      <Textarea size="lg" placeholder="Large" rows={2} />
    </div>
  ),
}
