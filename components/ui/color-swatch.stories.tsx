import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ColorSwatch } from "./color-swatch"

const meta = {
  title: "Select & pickers/Color swatch",
  id: "atoms-color-swatch",
  component: ColorSwatch,
  tags: ["autodocs"],
  args: { color: "#3B82F6" },
  argTypes: { size: { control: "select", options: ["xs", "sm", "md", "lg", "xl"] }, shape: { control: "inline-radio", options: ["circle", "square"] } },
  parameters: { docs: { description: { component: "A chip of one colour: a team colour, a brand colour, a seat-map zone. A checkered pattern under it shows transparency, and a faint inset ring keeps pale colours visible. It is an image for assistive tech: give it a `label` that names the colour." } } },
} satisfies Meta<typeof ColorSwatch>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = { args: { label: "Harbour blue" } }
export const Shapes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <ColorSwatch color="#F43F5E" shape="circle" label="Rose circle" />
      <ColorSwatch color="#F43F5E" shape="square" label="Rose square" />
    </div>
  ),
}
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      {(["xs", "sm", "md", "lg", "xl"] as const).map((s) => <ColorSwatch key={s} color="#8B5CF6" size={s} label={`Violet ${s}`} />)}
    </div>
  ),
}
export const Transparency: Story = {
  parameters: { docs: { description: { story: "Semi-transparent and transparent colours show the checkered pattern behind them." } } },
  render: () => (
    <div className="flex items-center gap-4">
      <ColorSwatch color="rgb(59 130 246 / 1)" label="Opaque blue" />
      <ColorSwatch color="rgb(59 130 246 / 0.5)" label="Half blue" />
      <ColorSwatch color="rgb(59 130 246 / 0.15)" label="Faint blue" />
      <ColorSwatch color="transparent" label="Transparent" />
    </div>
  ),
}
export const PaleColours: Story = {
  parameters: { docs: { description: { story: "A white swatch on a white page still has an edge, thanks to the inset ring." } } },
  render: () => (
    <div className="flex items-center gap-4 rounded-3xl bg-white p-4">
      <ColorSwatch color="#FFFFFF" label="White" />
      <ColorSwatch color="#F4F4F5" label="Off white" />
      <ColorSwatch color="#FEF08A" label="Pale yellow" />
    </div>
  ),
}
