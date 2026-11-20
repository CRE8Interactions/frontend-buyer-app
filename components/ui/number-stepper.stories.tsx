import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Minus, Plus, Ticket } from "@phosphor-icons/react"
import { Label } from "./label"
import {
  NumberStepper,
  NumberStepperDecrementButton,
  NumberStepperGroup,
  NumberStepperIncrementButton,
  NumberStepperValue,
} from "./number-stepper"

const meta = {
  title: "Forms & inputs/Number stepper",
  id: "molecules-number-stepper",
  component: NumberStepper,
  tags: ["autodocs", "new"],
  parameters: { docs: { description: { component: "A round minus button, the value and a round plus button, for small counts such as tickets or guests. The value is a spinbutton: ArrowUp and ArrowDown step, PageUp and PageDown step by ten, Home and End jump to the bounds. Digits spin on a reel when the value changes. Press and hold a button to repeat. A button disables itself at its bound. Sizes follow the shared control heights." } } },
} satisfies Meta<typeof NumberStepper>
export default meta
type Story = StoryObj<typeof meta>

const parts = (
  <NumberStepperGroup>
    <NumberStepperDecrementButton />
    <NumberStepperValue />
    <NumberStepperIncrementButton />
  </NumberStepperGroup>
)

export const Default: Story = { render: () => <NumberStepper defaultValue={2} minValue={0} maxValue={10} aria-label="Tickets">{parts}</NumberStepper> }

export const WithLabel: Story = {
  render: () => (
    <div className="flex flex-col gap-1">
      <Label id="stepper-tickets">Tickets</Label>
      <NumberStepper defaultValue={2} minValue={1} maxValue={8} aria-labelledby="stepper-tickets">{parts}</NumberStepper>
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-6">
      {(["sm", "md", "lg"] as const).map((s) => (
        <NumberStepper key={s} size={s} defaultValue={3} minValue={0} maxValue={20} aria-label={`Tickets ${s}`}>{parts}</NumberStepper>
      ))}
    </div>
  ),
}

export const MinAndMax: Story = {
  parameters: { docs: { description: { story: "Between 1 and 4. The buttons disable at the ends." } } },
  render: () => <NumberStepper defaultValue={1} minValue={1} maxValue={4} aria-label="Seats">{parts}</NumberStepper>,
}

export const WithStep: Story = {
  parameters: { docs: { description: { story: "Steps of 0.5 stay exact: no 0.30000000000000004." } } },
  render: () => <NumberStepper defaultValue={1} step={0.5} minValue={0} maxValue={5} aria-label="Hours">{parts}</NumberStepper>,
}

export const FormatOptions: Story = {
  parameters: { docs: { description: { story: "Any Intl number format: currency, percent, units." } } },
  render: () => (
    <div className="flex flex-wrap items-center gap-6">
      <NumberStepper defaultValue={25} step={5} minValue={0} formatOptions={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }} aria-label="Donation">{parts}</NumberStepper>
      <NumberStepper defaultValue={20} step={5} minValue={0} maxValue={100} formatOptions={{ style: "percent" }} aria-label="Discount" locale="en-US">
        <NumberStepperGroup>
          <NumberStepperDecrementButton />
          <NumberStepperValue format={{ style: "unit", unit: "percent" }} />
          <NumberStepperIncrementButton />
        </NumberStepperGroup>
      </NumberStepper>
    </div>
  ),
}

export const Controlled: Story = {
  render: () => {
    const [n, setN] = React.useState(2)
    return (
      <div className="flex flex-col gap-3">
        <NumberStepper value={n} onChange={setN} minValue={0} maxValue={10} aria-label="Tickets">{parts}</NumberStepper>
        <p className="text-sm text-h-muted">Total ${n * 89}.00</p>
      </div>
    )
  },
}

export const CustomIconsAndValue: Story = {
  parameters: { docs: { description: { story: "Pass children to replace the icons, and a function to the value to write your own label." } } },
  render: () => (
    <NumberStepper defaultValue={2} minValue={0} maxValue={10} aria-label="Tickets">
      <NumberStepperGroup>
        <NumberStepperDecrementButton><Minus weight="bold" /></NumberStepperDecrementButton>
        <NumberStepperValue className="min-w-24 gap-1.5">
          {({ value }) => <><Ticket weight="bold" className="size-4 text-h-muted" />{value} {value === 1 ? "ticket" : "tickets"}</>}
        </NumberStepperValue>
        <NumberStepperIncrementButton><Plus weight="bold" /></NumberStepperIncrementButton>
      </NumberStepperGroup>
    </NumberStepper>
  ),
}

export const Disabled: Story = { render: () => <NumberStepper isDisabled defaultValue={2} aria-label="Tickets">{parts}</NumberStepper> }

export const ReversedLayout: Story = {
  render: () => (
    <NumberStepper defaultValue={2} minValue={0} maxValue={10} aria-label="Tickets">
      <NumberStepperGroup>
        <NumberStepperIncrementButton />
        <NumberStepperValue />
        <NumberStepperDecrementButton />
      </NumberStepperGroup>
    </NumberStepper>
  ),
}

export const GuestPicker: Story = {
  render: () => {
    const rows = [["Adults", "Ages 13 or above", 2], ["Children", "Ages 2 to 12", 0], ["Infants", "Under 2", 0]] as const
    return (
      <div className="flex w-80 flex-col gap-4 rounded-[24px] bg-card p-4">
        {rows.map(([label, hint, start]) => (
          <div key={label} className="flex items-center justify-between gap-4">
            <div className="flex flex-col"><span className="text-sm font-medium text-h-foreground">{label}</span><span className="text-xs text-h-muted">{hint}</span></div>
            <NumberStepper defaultValue={start} minValue={0} maxValue={9} size="sm" aria-label={label}>{parts}</NumberStepper>
          </div>
        ))}
      </div>
    )
  },
}
