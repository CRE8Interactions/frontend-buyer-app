import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ColorArea } from "./color-area"
import { ColorSwatch } from "./color-swatch"

const meta = {
  title: "Select & pickers/Color area",
  id: "atoms-color-area",
  component: ColorArea,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "A square for choosing saturation (across) and brightness (up) at one hue. Drag anywhere, or use the arrow keys on the focused thumb (Page Up and Down move by 10). The thumb grows while you drag." } } },
} satisfies Meta<typeof ColorArea>
export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = { args: { defaultValue: "#0485F7" } }
export const WithDots: Story = { args: { defaultValue: "#F43F5E", showDots: true } }
export const Disabled: Story = { args: { defaultValue: "#8B5CF6", disabled: true } }

function WithPreview() {
  const [color, setColor] = React.useState("#10B981")
  return (
    <div className="flex items-center gap-4">
      <ColorArea value={color} onChange={setColor} />
      <div className="flex flex-col items-start gap-2">
        <ColorSwatch color={color} size="xl" label={`Chosen colour ${color}`} />
        <span className="text-sm tabular-nums text-h-muted">{color}</span>
      </div>
    </div>
  )
}
export const Controlled: Story = { render: () => <WithPreview /> }
