import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { AspectRatio } from "./aspect-ratio"

const meta = {
  title: "Layout & foundations/Aspect ratio",
  id: "atoms-aspect-ratio",
  component: AspectRatio,
  tags: ["autodocs"],
  argTypes: { ratio: { control: { type: "number", min: 0.5, max: 3, step: 0.01 } } },
  args: { ratio: 16 / 9 },
  parameters: { docs: { description: { component: "Locks a box to a ratio so event posters and venue photos never jump while loading." } } },
} satisfies Meta<typeof AspectRatio>
export default meta
type Story = StoryObj<typeof meta>

const Poster = ({ label }: { label: string }) => (
  <div className="flex size-full items-end rounded-3xl bg-[#0B2540] p-5 text-white">
    <div><p className="text-sm text-white/70">Sat 14 Jun, 20:00</p><p className="text-xl font-semibold">{label}</p></div>
  </div>
)

export const Playground: Story = {
  render: (args) => <div className="w-96"><AspectRatio {...args}><Poster label="Harbour Lights Festival" /></AspectRatio></div>,
}
export const Ratios: Story = {
  render: () => (
    <div className="flex flex-wrap items-end gap-6">
      {([["1 / 1", 1], ["4 / 5", 4 / 5], ["16 / 9", 16 / 9], ["21 / 9", 21 / 9]] as const).map(([name, r]) => (
        <div key={name} className="w-48"><AspectRatio ratio={r}><Poster label={name} /></AspectRatio></div>
      ))}
    </div>
  ),
}
