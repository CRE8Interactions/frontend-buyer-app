import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { CurrencyInput } from "./currency-input"
import { Label } from "./label"
import { Description } from "./description"

const meta = {
  title: "Forms & inputs/Currency input",
  id: "molecules-currency-input",
  component: CurrencyInput,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "Money field for prices, fees and payouts. The sign is a prefix and the ISO code a suffix. Digits are right-aligned in tabular figures, shown raw while you type and grouped to the right decimals when you leave the field. `value` is a plain number." } } },
} satisfies Meta<typeof CurrencyInput>
export default meta
type Story = StoryObj<typeof meta>

const Demo = ({ currency, locale, decimals = 2, label, defaultValue }: { currency: string; locale?: string; decimals?: number; label: string; defaultValue?: number }) => {
  const [v, setV] = React.useState<number | null>(defaultValue ?? null)
  return (
    <div className="flex w-72 flex-col gap-1">
      <Label htmlFor={label}>{label}</Label>
      <CurrencyInput id={label} currency={currency} locale={locale} decimals={decimals} value={v} onValueChange={setV} placeholder="0.00" />
      <Description>Value: {v == null ? "none" : v}</Description>
    </div>
  )
}

export const Default: Story = { render: () => <Demo currency="USD" label="Ticket price" defaultValue={142} /> }
export const Euro: Story = { render: () => <Demo currency="EUR" locale="de-DE" label="Ticket price" defaultValue={89.5} /> }
export const NoDecimals: Story = { render: () => <Demo currency="JPY" locale="ja-JP" decimals={0} label="Ticket price" defaultValue={8800} /> }
export const Sizes: Story = {
  render: () => (
    <div className="grid w-72 gap-3">
      {(["sm", "md", "lg"] as const).map((s) => <CurrencyInput key={s} size={s} defaultValue={1240} aria-label={s} />)}
    </div>
  ),
}
export const Invalid: Story = { render: () => <div className="w-72"><CurrencyInput isInvalid defaultValue={-5} min={0} aria-label="Price" /></div> }
