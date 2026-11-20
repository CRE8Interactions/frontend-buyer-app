import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Heart } from "@phosphor-icons/react"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { ColorSwatchPicker, ColorSwatchPickerIndicator, ColorSwatchPickerItem, ColorSwatchPickerSwatch } from "./color-swatch-picker"

const meta = {
  title: "Select & pickers/Color swatch picker",
  id: "molecules-color-swatch-picker",
  component: ColorSwatchPicker,
  tags: ["autodocs"],
  argTypes: {
    size: { control: "select", options: ["xs", "sm", "md", "lg", "xl"] },
    variant: { control: "inline-radio", options: ["circle", "square"] },
    layout: { control: "inline-radio", options: ["grid", "stack"] },
  },
  parameters: { docs: { description: { component: "Pick one colour from a set: a team colour for a ticket, a brand colour for an event page. It is a radio group, so arrow keys move the selection and a screen reader announces each colour. The chosen swatch shrinks inside a ring of its own colour and shows a check." } } },
} satisfies Meta<typeof ColorSwatchPicker>
export default meta
type Story = StoryObj<typeof meta>

const colors = ["#F43F5E", "#D946EF", "#8B5CF6", "#3B82F6", "#06B6D4", "#10B981", "#84CC16"]
const names: Record<string, string> = { "#F43F5E": "Rose", "#D946EF": "Fuchsia", "#8B5CF6": "Violet", "#3B82F6": "Blue", "#06B6D4": "Cyan", "#10B981": "Emerald", "#84CC16": "Lime" }
const items = (disabled: string[] = []) =>
  colors.map((c) => <ColorSwatchPickerItem key={c} color={c} label={names[c]} disabled={disabled.includes(c)} />)

export const Basic: Story = {
  render: (args) => <ColorSwatchPicker {...args} aria-label="Team colour">{items()}</ColorSwatchPicker>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const group = canvas.getByRole("radiogroup", { name: "Team colour" })
    await expect(group).toBeInTheDocument()
    const blue = canvas.getByRole("radio", { name: "Blue" })
    await userEvent.click(blue)
    await expect(blue).toBeChecked()
    // arrow keys move the selection to the next colour
    await userEvent.keyboard("{ArrowRight}")
    await waitFor(() => expect(canvas.getByRole("radio", { name: "Cyan" })).toBeChecked())
    await expect(blue).not.toBeChecked()
  },
}
export const Variants: Story = {
  parameters: { docs: { description: { story: "Circle (default) and square swatches." } } },
  render: () => (
    <div className="flex flex-col gap-4">
      {(["circle", "square"] as const).map((v) => (
        <ColorSwatchPicker key={v} variant={v} defaultValue="#8B5CF6" aria-label={`${v} swatches`}>{items()}</ColorSwatchPicker>
      ))}
    </div>
  ),
}
export const Sizes: Story = {
  parameters: { docs: { description: { story: "xs 16, sm 24, md 32 (default), lg 36 and xl 40 pixels." } } },
  render: () => (
    <div className="flex flex-col gap-4">
      {(["xs", "sm", "md", "lg", "xl"] as const).map((s) => (
        <ColorSwatchPicker key={s} size={s} defaultValue="#3B82F6" aria-label={`${s} swatches`}>{items()}</ColorSwatchPicker>
      ))}
    </div>
  ),
}
export const SquareSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(["xs", "sm", "md", "lg", "xl"] as const).map((s) => (
        <ColorSwatchPicker key={s} size={s} variant="square" defaultValue="#10B981" aria-label={`${s} square swatches`}>{items()}</ColorSwatchPicker>
      ))}
    </div>
  ),
}
export const Disabled: Story = {
  parameters: { docs: { description: { story: "A disabled swatch is dimmed and skipped by the arrow keys. Use it for colours that are sold out or locked for this event." } } },
  render: () => <ColorSwatchPicker defaultValue="#3B82F6" aria-label="Colour">{items(["#D946EF", "#06B6D4"])}</ColorSwatchPicker>,
}
export const StackLayout: Story = {
  parameters: { docs: { description: { story: "A column of swatches, for a narrow side panel." } } },
  render: () => <ColorSwatchPicker layout="stack" defaultValue="#F43F5E" aria-label="Colour">{items()}</ColorSwatchPicker>,
}
export const DefaultValue: Story = {
  render: () => <ColorSwatchPicker defaultValue="#10B981" aria-label="Colour">{items()}</ColorSwatchPicker>,
}

function ControlledDemo() {
  const [color, setColor] = React.useState("#8B5CF6")
  return (
    <div className="flex flex-col gap-3">
      <ColorSwatchPicker value={color} onChange={setColor} aria-label="Accent colour">{items()}</ColorSwatchPicker>
      <p className="text-sm text-h-muted">Selected: <span className="font-medium text-h-foreground">{names[color.toUpperCase()] ?? color}</span> <span className="tabular-nums">({color.toUpperCase()})</span></p>
    </div>
  )
}
export const Controlled: Story = {
  parameters: { docs: { description: { story: "Hold the colour in state to show it elsewhere, for example in a ticket preview." } } },
  render: () => <ControlledDemo />,
}
export const CustomIndicator: Story = {
  parameters: { docs: { description: { story: "Any icon in the indicator replaces the check." } } },
  render: () => (
    <ColorSwatchPicker defaultValue="#F43F5E" aria-label="Favourite colour">
      {colors.map((c) => (
        <ColorSwatchPickerItem key={c} color={c} label={names[c]}>
          <ColorSwatchPickerSwatch />
          <ColorSwatchPickerIndicator><Heart weight="fill" /></ColorSwatchPickerIndicator>
        </ColorSwatchPickerItem>
      ))}
    </ColorSwatchPicker>
  ),
}
export const PaleColours: Story = {
  parameters: { docs: { description: { story: "On pale colours the check turns black so it stays readable." } } },
  render: () => (
    <ColorSwatchPicker defaultValue="#FEF08A" aria-label="Pale colours" size="lg">
      {["#FFFFFF", "#F4F4F5", "#FEF08A", "#BBF7D0", "#BFDBFE"].map((c) => <ColorSwatchPickerItem key={c} color={c} />)}
    </ColorSwatchPicker>
  ),
}
