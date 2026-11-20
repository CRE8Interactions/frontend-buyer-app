import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { RadioGroup, RadioGroupItem } from "./radio-group"

const meta = {
  title: "Forms & inputs/Radio group",
  id: "atoms-radio-group",
  component: RadioGroup,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "Choose one option. Type hierarchy: the group heading is 16px semibold, option labels 14px medium, descriptions 13px muted under the label, and an optional note (a price) at the end. Options sit 12px apart. `layout=\"card\"` turns each option into a selectable card. Vertical or horizontal, primary or secondary fill, disabled and invalid states." } } },
} satisfies Meta<typeof RadioGroup>
export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  render: () => (
    <RadioGroup defaultValue="ga" label="Ticket type">
      <RadioGroupItem value="ga" label="General admission" />
      <RadioGroupItem value="vip" label="VIP" />
      <RadioGroupItem value="back" label="Backstage" />
    </RadioGroup>
  ),
}
export const WithDescription: Story = {
  render: () => (
    <RadioGroup defaultValue="mobile" label="Delivery" description="How should we send your tickets?">
      <RadioGroupItem value="mobile" label="Mobile ticket" description="Delivered instantly to your wallet." />
      <RadioGroupItem value="print" label="Print at home" description="PDF sent by email." />
    </RadioGroup>
  ),
}
export const Horizontal: Story = {
  render: () => (
    <RadioGroup orientation="horizontal" defaultValue="1" label="Quantity">
      {["1", "2", "3", "4"].map((q) => <RadioGroupItem key={q} value={q} label={q} />)}
    </RadioGroup>
  ),
}
export const Variants: Story = {
  render: () => (
    <div className="grid gap-8 rounded-2xl bg-h-surface p-6">
      {(["primary", "secondary"] as const).map((v) => (
        <RadioGroup key={v} variant={v} defaultValue="a" label={v}>
          <RadioGroupItem value="a" label="Selected" />
          <RadioGroupItem value="b" label="Not selected" />
        </RadioGroup>
      ))}
    </div>
  ),
}
export const Disabled: Story = {
  render: () => (
    <RadioGroup defaultValue="a" disabled label="Payment (locked)">
      <RadioGroupItem value="a" label="Card" />
      <RadioGroupItem value="b" label="Bank transfer" />
    </RadioGroup>
  ),
}
export const DisabledItem: Story = {
  render: () => (
    <RadioGroup defaultValue="a" label="Seating">
      <RadioGroupItem value="a" label="Standing" />
      <RadioGroupItem value="b" label="Seated (sold out)" disabled />
    </RadioGroup>
  ),
}
export const Invalid: Story = {
  render: () => (
    <RadioGroup isInvalid errorMessage="Choose a delivery method." label="Delivery">
      <RadioGroupItem value="a" label="Mobile ticket" isInvalid />
      <RadioGroupItem value="b" label="Print at home" isInvalid />
    </RadioGroup>
  ),
}
export const Controlled: Story = {
  render: function Render() {
    const [v, setV] = React.useState("vip")
    return (
      <div className="grid gap-3">
        <RadioGroup value={v} onValueChange={setV} label="Ticket type">
          <RadioGroupItem value="ga" label="General admission" />
          <RadioGroupItem value="vip" label="VIP" />
        </RadioGroup>
        <p className="text-xs text-h-muted">Selected: {v}</p>
      </div>
    )
  },
}

export const WithPrices: Story = {
  parameters: { docs: { description: { story: "`meta` puts a note at the end of an option, such as a price, in tabular numbers so amounts line up." } } },
  render: () => (
    <RadioGroup defaultValue="ga" label="Ticket type" className="w-80">
      <RadioGroupItem value="ga" label="General admission" description="Standing, floor access" meta="$45.00" />
      <RadioGroupItem value="vip" label="VIP lounge" description="Seated, lounge and early entry" meta="$140.00" />
      <RadioGroupItem value="back" label="Backstage" description="Sold out" meta="$420.00" disabled />
    </RadioGroup>
  ),
}
export const CardLayout: Story = {
  parameters: { docs: { description: { story: "Each option is a card and the whole card is the click target. The chosen card takes the soft accent fill and a 2px accent outline. Use it when options need explaining and the choice is the point of the screen." } } },
  render: () => (
    <RadioGroup layout="card" defaultValue="vip" label="Choose your tickets" description="You can change this until checkout." className="w-96">
      <RadioGroupItem value="ga" label="General admission" description="Standing, floor access. Doors at 19:00." meta="$45.00" />
      <RadioGroupItem value="vip" label="VIP lounge" description="Seated, lounge access and early entry." meta="$140.00" />
      <RadioGroupItem value="back" label="Backstage" description="Sold out for this event." meta="$420.00" disabled />
    </RadioGroup>
  ),
}
export const CardLayoutOnSurface: Story = {
  parameters: { docs: { description: { story: "On a card or panel, the secondary variant gives the options a stronger fill and no outline." } } },
  render: () => (
    <div className="w-[26rem] rounded-3xl bg-h-surface p-5">
      <RadioGroup layout="card" variant="secondary" defaultValue="mobile" label="Delivery">
        <RadioGroupItem value="mobile" label="Mobile ticket" description="Delivered instantly to your wallet." meta="Free" />
        <RadioGroupItem value="print" label="Print at home" description="PDF sent by email." meta="Free" />
        <RadioGroupItem value="post" label="Post" description="Arrives in 3 to 5 days." meta="$4.00" />
      </RadioGroup>
    </div>
  ),
}
export const CardLayoutInvalid: Story = {
  render: () => (
    <RadioGroup layout="card" isInvalid errorMessage="Choose a delivery method to continue." label="Delivery" className="w-96">
      <RadioGroupItem value="a" label="Mobile ticket" description="Delivered instantly to your wallet." isInvalid />
      <RadioGroupItem value="b" label="Print at home" description="PDF sent by email." isInvalid />
    </RadioGroup>
  ),
}
