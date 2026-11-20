import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { NumberField } from "./number-field"
import { Button } from "./button"

const meta = {
  title: "Forms & inputs/Number field",
  id: "atoms-number-field",
  component: NumberField,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary", "tertiary"] },
    fullWidth: { control: "boolean" },
    disabled: { control: "boolean" },
    isInvalid: { control: "boolean" },
  },
  parameters: { docs: { description: { component: "Stepper field copied from the reference NumberField: minus and plus cells on either side of a number input, one 36px field. Use it for ticket quantities where typing a number is also fine. Compact (120px) so two or three digits fit. Press and hold a stepper to repeat, faster after a second. For a pill stepper see Button group, Quantity." } } },
} satisfies Meta<typeof NumberField>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = { args: { label: "Tickets", defaultValue: 2, min: 1, max: 8 } }
export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-start gap-6">
      <NumberField label="Primary" defaultValue={2} min={0} />
      <NumberField label="Secondary" variant="secondary" defaultValue={2} min={0} />
      <NumberField label="Tertiary" variant="tertiary" defaultValue={2} min={0} />
    </div>
  ),
}
export const WithDescription: Story = {
  render: () => <NumberField label="Tickets" description="Maximum 8 per order." defaultValue={2} min={1} max={8} />,
}
export const Invalid: Story = {
  render: () => <NumberField label="Tickets" defaultValue={12} max={8} isInvalid />,
}
export const Disabled: Story = {
  render: () => <NumberField label="Tickets" defaultValue={2} disabled />,
}
export const FullWidth: Story = {
  render: () => <div className="w-80"><NumberField label="Tickets" defaultValue={2} fullWidth /></div>,
}
const Controlled = () => {
  const [n, setN] = React.useState(2)
  return (
    <div className="grid gap-2">
      <NumberField label="Tickets" value={n} onValueChange={setN} min={1} max={8} />
      <p className="text-sm text-h-muted">{n} x $142 = ${n * 142}</p>
    </div>
  )
}
export const ControlledTotal: Story = { render: () => <Controlled /> }

const Picker = () => {
  const [n, setN] = React.useState(2)
  const quick = [1, 2, 3, 4, 5, 6]
  const price = 142
  return (
    <div className="grid w-80 gap-4 rounded-3xl bg-h-surface p-5 shadow-h-surface">
      <div>
        <p className="text-sm font-medium text-h-foreground">How many tickets?</p>
        <p className="text-xs text-h-muted">Section 112, row F. Up to 20 per order.</p>
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Quick pick">
        {quick.map((q) => (
          <Button key={q} size="icon-sm" variant={n === q ? "primary" : "tertiary"} role="radio" aria-checked={n === q} aria-label={`${q} tickets`} onClick={() => setN(q)}>
            {q}
          </Button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-4">
        <NumberField aria-label="Custom amount" value={n} onValueChange={setN} min={1} max={20} />
        <p className="text-right text-sm tabular-nums text-h-muted">
          {n} x ${price}<br /><span className="text-base font-medium text-h-foreground">${n * price}</span>
        </p>
      </div>
    </div>
  )
}
export const TicketPicker: Story = {
  parameters: { docs: { description: { story: "Quick-pick buttons for the common counts plus the stepper for anything else. Both stay in sync, and the total updates." } } },
  render: () => <Picker />,
}

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-start gap-6">
      <NumberField label="Small" size="sm" defaultValue={2} min={0} />
      <NumberField label="Medium" size="md" defaultValue={2} min={0} />
      <NumberField label="Large" size="lg" defaultValue={2} min={0} />
    </div>
  ),
}
