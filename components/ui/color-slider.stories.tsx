import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ColorSlider } from "./color-slider"

const meta = {
  title: "Select & pickers/Color slider",
  id: "atoms-color-slider",
  component: ColorSlider,
  tags: ["autodocs"],
  argTypes: { channel: { control: "select", options: ["hue", "saturation", "brightness", "red", "green", "blue", "alpha"] } },
  parameters: { docs: { description: { component: "A bar for one colour channel. The track shows the channel's own gradient (the hue slider is the rainbow at the current saturation and brightness; alpha fades from clear over a checkered pattern), and the thumb is filled with the colour at that point. Drag, or use the arrow keys on the focused thumb." } } },
} satisfies Meta<typeof ColorSlider>
export default meta
type Story = StoryObj<typeof meta>

export const Hue: Story = { args: { channel: "hue", defaultValue: "#0485F7", showOutput: true } }
export const AllChannels: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-4">
      {(["hue", "saturation", "brightness", "red", "green", "blue", "alpha"] as const).map((c) => (
        <ColorSlider key={c} channel={c} defaultValue="#F43F5E" showOutput />
      ))}
    </div>
  ),
}
export const WithoutLabel: Story = { args: { channel: "hue", defaultValue: "#8B5CF6", label: false }, render: (args) => <div className="w-72"><ColorSlider {...args} /></div> }
export const Disabled: Story = { args: { channel: "hue", defaultValue: "#8B5CF6", disabled: true, showOutput: true }, render: (args) => <div className="w-72"><ColorSlider {...args} /></div> }
