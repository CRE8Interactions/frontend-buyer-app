import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Surface } from "./surface"

const meta = {
  title: "Layout & foundations/Surface",
  id: "atoms-surface",
  component: Surface,
  tags: ["autodocs"],
  argTypes: { variant: { control: "select", options: ["transparent", "default", "secondary", "tertiary"] } },
  parameters: { docs: { description: { component: "the reference Surface: a container with a background and a matching foreground." } } },
} satisfies Meta<typeof Surface>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = { args: { className: "w-64 rounded-[24px] p-4", children: "Order #BT-2041" } }
export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4 rounded-[24px] bg-h-background p-6">
      {(["transparent", "default", "secondary", "tertiary"] as const).map((v) => (
        <Surface key={v} variant={v} className="w-40 rounded-[24px] p-4 text-sm shadow-h-surface">
          <p className="font-medium">{v}</p><p className="opacity-70">2 tickets, Lisbon</p>
        </Surface>
      ))}
    </div>
  ),
}
