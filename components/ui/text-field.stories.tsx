import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { EnvelopeSimple } from "@phosphor-icons/react"
import { expect, userEvent, within } from "storybook/test"
import type * as React from "react"
import { TextField as TextFieldComponent, type TextFieldProps } from "./text-field"

/* TextField takes a union of props (single line or multiline). Storybook needs one object type, so it sees both branches as optional. */
type AnyTextFieldProps = Omit<Extract<TextFieldProps, { multiline?: false }>, "multiline"> & { multiline?: boolean }
const TextField = TextFieldComponent as React.ComponentType<AnyTextFieldProps>

const meta = {
  title: "Forms & inputs/Text field",
  id: "molecules-text-field",
  component: TextField,
  tags: ["autodocs"],
  decorators: [(Story) => <div className="w-72"><Story /></div>],
  parameters: { docs: { description: { component: "A label, an input and its help text as one component, wired for assistive tech: the label points at the input, the description is announced with it, and an error replaces the description while the field is invalid. Add `multiline` for a textarea." } } },
} satisfies Meta<typeof TextField>
export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  args: { label: "Email address", placeholder: "name@email.com", description: "We'll never share this with anyone else", type: "email" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText("Email address")
    await expect(input).toHaveAccessibleDescription("We'll never share this with anyone else")
    await userEvent.type(input, "marta@mail.com")
    await expect(input).toHaveValue("marta@mail.com")
  },
}
export const WithIcon: Story = { args: { label: "Email address", prefix: <EnvelopeSimple weight="bold" />, placeholder: "name@email.com" } }
export const Required: Story = { args: { label: "Full name", isRequired: true, placeholder: "Marta Silva" } }
export const Invalid: Story = {
  parameters: { docs: { description: { story: "While invalid, the error replaces the description and the field is marked invalid for assistive tech." } } },
  args: { label: "Email address", defaultValue: "marta@", isInvalid: true, description: "We'll never share this with anyone else", errorMessage: "Enter a full email address." },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByLabelText("Email address")
    await expect(input).toHaveAccessibleDescription("Enter a full email address.")
  },
}
export const Disabled: Story = { args: { label: "Promo code", isDisabled: true, defaultValue: "SPRING2" } }
export const Multiline: Story = { args: { multiline: true, label: "Message to the organiser", description: "Visible to the organiser only.", placeholder: "Door times, accessibility needs..." } }
export const Variants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <TextField label="Primary" variant="primary" placeholder="Soft fill" />
      <div className="rounded-3xl bg-h-surface p-4"><TextField label="Secondary (on a card)" variant="secondary" placeholder="Stronger fill" /></div>
      <TextField label="Tertiary" variant="tertiary" placeholder="Outline" />
      <TextField label="Underlined" variant="underlined" placeholder="Bottom line" />
    </div>
  ),
}
export const FullWidth: Story = { decorators: [(Story) => <div className="w-[28rem]"><Story /></div>], args: { label: "Event name", fullWidth: true, placeholder: "Summer Fest 2026" } }
