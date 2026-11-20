import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { PhoneInput } from "./phone-input"
import { Label } from "./label"
import { Description } from "./description"

const meta = {
  title: "Forms & inputs/Phone input",
  id: "molecules-phone-input",
  component: PhoneInput,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "Mobile number field built on Input. A flag and caret open the country list, and the number is formatted as you type for that country. `value` is the E.164 string (+12123123123) or undefined. Typing a leading + picks the country from the code." } } },
} satisfies Meta<typeof PhoneInput>
export default meta
type Story = StoryObj<typeof meta>

const Demo = ({ label = "Mobile number", ...rest }: { label?: string } & Partial<React.ComponentProps<typeof PhoneInput>>) => {
  const [v, setV] = React.useState<string | undefined>(rest.defaultValue)
  return (
    <div className="flex w-72 flex-col gap-1">
      <Label htmlFor="phone-demo">{label}</Label>
      <PhoneInput id="phone-demo" {...rest} defaultValue={undefined} value={v} onValueChange={setV} />
      <Description>Value: {v ?? "none"}</Description>
    </div>
  )
}

export const Default: Story = { render: () => <Demo /> }
export const Filled: Story = { render: () => <Demo defaultValue="+12123123123" /> }
export const UnitedKingdom: Story = { render: () => <Demo defaultCountry="GB" defaultValue="+447400123456" /> }
export const Sizes: Story = {
  render: () => (
    <div className="grid w-72 gap-3">
      {(["sm", "md", "lg"] as const).map((s) => <PhoneInput key={s} size={s} defaultValue="+12123123123" aria-label={s} />)}
    </div>
  ),
}
export const Invalid: Story = { render: () => <div className="w-72"><PhoneInput isInvalid defaultValue="+1212" aria-label="Mobile number" /></div> }
export const Disabled: Story = { render: () => <div className="w-72"><PhoneInput disabled defaultValue="+12123123123" aria-label="Mobile number" /></div> }
