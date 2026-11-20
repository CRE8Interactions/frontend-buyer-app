import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Checkbox } from "./checkbox"
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "./field"
import { Input } from "./input"

const meta = {
  title: "Forms & inputs/Field",
  id: "molecules-field",
  component: Field,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "Label, control, description and error laid out vertically, horizontally or responsively. Vertical fields have a 4px gap between label, control and description; groups have 16px between fields; description 12px muted, error 12px red; an invalid field turns only its label and message red." } } },
} satisfies Meta<typeof Field>
export default meta
type Story = StoryObj<typeof meta>

export const Vertical: Story = {
  render: () => (
    <Field className="max-w-sm">
      <FieldLabel htmlFor="email">Email</FieldLabel>
      <Input id="email" placeholder="fan@example.com" />
      <FieldDescription>We send your tickets here.</FieldDescription>
    </Field>
  ),
}
export const Horizontal: Story = {
  render: () => (
    <Field orientation="horizontal" className="max-w-sm">
      <Checkbox id="news" defaultChecked />
      <FieldContent>
        <FieldLabel htmlFor="news">Presale alerts</FieldLabel>
        <FieldDescription>Hear first when your favorite artists announce dates.</FieldDescription>
      </FieldContent>
    </Field>
  ),
}
export const Invalid: Story = {
  render: () => (
    <Field data-invalid="true" className="max-w-sm">
      <FieldLabel htmlFor="promo">Promo code</FieldLabel>
      <Input id="promo" aria-invalid defaultValue="SUMMER25" />
      <FieldError errors={[{ message: "This code expired on 30 June." }]} />
    </Field>
  ),
}
export const Grouped: Story = {
  render: () => (
    <FieldSet className="max-w-md">
      <FieldLegend>Billing details</FieldLegend>
      <FieldGroup>
        <Field><FieldLabel htmlFor="n">Full name</FieldLabel><Input id="n" defaultValue="Alex Rivera" /></Field>
        <Field><FieldLabel htmlFor="c">City</FieldLabel><Input id="c" placeholder="Lisbon" /><FieldDescription>Used for tax on your order.</FieldDescription></Field>
        <Field orientation="horizontal"><Checkbox id="s" /><FieldLabel htmlFor="s">Save for next time</FieldLabel></Field>
      </FieldGroup>
    </FieldSet>
  ),
}
