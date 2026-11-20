import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Checkbox, CheckboxGroup } from "./checkbox"

const meta = {
  title: "Forms & inputs/Checkbox",
  id: "atoms-checkbox",
  component: Checkbox,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "Click the box or its label, or use Space while focused. On selection, the fill grows in and the checkmark draws over it. Reduced motion shows the selected state immediately." } } },
} satisfies Meta<typeof Checkbox>
export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = { args: { label: "Accept the terms of sale" } }
export const WithDescription: Story = {
  args: { label: "Add ticket protection", description: "Refund if you cannot attend. Adds 6% to your order." },
}
export const Disabled: Story = { args: { label: "Sold out add-on", disabled: true } }
export const DisabledChecked: Story = { args: { label: "Included in your ticket", disabled: true, defaultChecked: true } }
export const Invalid: Story = { args: { label: "I agree to the venue rules", isInvalid: true, description: "You must accept to continue." } }
export const InvalidSelected: Story = { args: { label: "I agree to the venue rules", isInvalid: true, defaultChecked: true } }
export const Indeterminate: Story = { args: { label: "Select all tickets", checked: "indeterminate" } }
export const Variants: Story = {
  render: () => (
    <div className="grid gap-4 rounded-2xl bg-h-surface p-6">
      <Checkbox variant="primary" label="Primary" defaultChecked />
      <Checkbox variant="primary" label="Primary unchecked" />
      <Checkbox variant="secondary" label="Secondary" defaultChecked />
      <Checkbox variant="secondary" label="Secondary unchecked" />
    </div>
  ),
}
export const Controlled: Story = {
  render: function Render() {
    const [on, setOn] = React.useState(true)
    return (
      <div className="grid gap-2">
        <Checkbox label="Email me my tickets" checked={on} onCheckedChange={(c) => setOn(c === true)} />
        <p className="text-xs text-h-muted">Selected: {String(on)}</p>
      </div>
    )
  },
}
export const IndeterminateParent: Story = {
  render: function Render() {
    const items = ["General admission", "VIP", "Backstage"]
    const [sel, setSel] = React.useState<string[]>(["VIP"])
    const all = sel.length === items.length
    return (
      <div className="grid gap-3">
        <Checkbox
          label="All tickets"
          checked={all ? true : sel.length ? "indeterminate" : false}
          onCheckedChange={(c) => setSel(c === true ? items : [])}
        />
        <CheckboxGroup value={sel} onValueChange={setSel} className="ps-7 [&>*]:mt-4">
          {items.map((i) => <Checkbox key={i} value={i} label={i} />)}
        </CheckboxGroup>
      </div>
    )
  },
}
export const Group: Story = {
  render: () => (
    <CheckboxGroup defaultValue={["email"]} label="Notify me by" description="Pick at least one channel.">
      <Checkbox value="email" label="Email" />
      <Checkbox value="sms" label="SMS" />
      <Checkbox value="push" label="Push notification" description="Only for events you follow." />
    </CheckboxGroup>
  ),
}
export const GroupInvalid: Story = {
  render: () => (
    <CheckboxGroup isInvalid errorMessage="Select at least one channel." label="Notify me by">
      <Checkbox value="email" label="Email" />
      <Checkbox value="sms" label="SMS" />
    </CheckboxGroup>
  ),
}
