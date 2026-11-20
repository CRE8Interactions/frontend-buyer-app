import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"
import { ColorField } from "./color-field"
import { ColorSwatch } from "./color-swatch"

const meta = {
  title: "Select & pickers/Color field",
  id: "atoms-color-field",
  component: ColorField,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "A text field for a colour: hex, or one channel (red, green, blue, hue, saturation, brightness, lightness, alpha). Built on our Input, so it has the same fills, sizes and states. The text is read when you leave the field or press Enter; Escape puts the current colour back." } } },
} satisfies Meta<typeof ColorField>
export default meta
type Story = StoryObj<typeof meta>

export const Hex: Story = {
  args: { defaultValue: "#0485F7", description: "Six or eight hex digits." },
  render: (args) => <div className="w-56"><ColorField {...args} errorMessage="That is not a colour." /></div>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText("Hex")
    await expect(input).toHaveValue("#0485F7")
    await userEvent.clear(input)
    await userEvent.type(input, "f43f5e{Enter}")
    await expect(input).toHaveValue("#F43F5E")
    await userEvent.clear(input)
    await userEvent.type(input, "nope{Enter}")
    await expect(input).toHaveAttribute("aria-invalid", "true")
    await userEvent.keyboard("{Escape}")
    await expect(input).toHaveValue("#F43F5E")
  },
}
export const WithSwatch: Story = {
  render: () => <div className="w-56"><ColorField defaultValue="#10B981" prefix={<ColorSwatch color="#10B981" size="xs" shape="square" />} /></div>,
}
export const Channels: Story = {
  render: () => (
    <div className="grid w-72 grid-cols-3 gap-2">
      {(["red", "green", "blue", "hue", "saturation", "brightness"] as const).map((c) => <ColorField key={c} channel={c} defaultValue="#F43F5E" />)}
    </div>
  ),
}
export const Variants: Story = {
  render: () => (
    <div className="flex w-56 flex-col gap-3">
      <ColorField defaultValue="#8B5CF6" variant="primary" label="Primary" />
      <div className="rounded-3xl bg-h-surface p-3"><ColorField defaultValue="#8B5CF6" variant="secondary" label="Secondary (on a card)" /></div>
      <ColorField defaultValue="#8B5CF6" variant="tertiary" label="Tertiary" />
    </div>
  ),
}
export const Disabled: Story = { render: () => <div className="w-56"><ColorField defaultValue="#8B5CF6" disabled /></div> }
