import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Heart, BellRinging, TextB } from "@phosphor-icons/react"
import { Toggle } from "./toggle"

const meta = {
  title: "Actions/Toggle",
  id: "atoms-toggle",
  component: Toggle,
  tags: ["autodocs"],
  args: { children: "Wheelchair accessible", "aria-label": "Accessible seating only" },
  argTypes: {
    variant: { control: "inline-radio", options: ["default", "ghost"] },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    disabled: { control: "boolean" },
  },
  parameters: { docs: { description: { component: "the reference ToggleButton: same metrics as Button; selected uses accent-soft fill and accent-soft text. Variants default and ghost, sizes sm, md, lg, iconOnly." } } },
} satisfies Meta<typeof Toggle>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Toggle aria-label="Save event"><Heart weight="bold" /> Save</Toggle>
      <Toggle variant="ghost" aria-label="Save event"><Heart weight="bold" /> Save</Toggle>
    </div>
  ),
}
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      {(["sm", "md", "lg"] as const).map((s) => <Toggle key={s} size={s} variant="ghost" aria-label="Alerts"><BellRinging weight="bold" /></Toggle>)}
    </div>
  ),
}
export const States: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Toggle variant="ghost" defaultPressed aria-label="Pressed"><BellRinging weight="bold" /> Price alerts on</Toggle>
      <Toggle variant="ghost" disabled aria-label="Disabled"><TextB weight="bold" /> Disabled</Toggle>
      <Toggle variant="ghost" aria-invalid="true" aria-label="Invalid">Invalid</Toggle>
    </div>
  ),
}
