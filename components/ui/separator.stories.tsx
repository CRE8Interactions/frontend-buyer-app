import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Separator } from "./separator"

const meta = {
  title: "Layout & foundations/Separator",
  id: "atoms-separator",
  component: Separator,
  tags: ["autodocs"],
  argTypes: { orientation: { control: "select", options: ["horizontal", "vertical"] }, variant: { control: "select", options: ["default", "secondary", "tertiary"] } },
} satisfies Meta<typeof Separator>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = { render: (a) => <div className="w-72"><Separator {...a} /></div> }
export const Horizontal: Story = {
  render: () => (
    <div className="w-72 space-y-3 text-sm">
      <div><h4 className="font-medium">Neon Harbour Live</h4><p className="text-muted-foreground">Sat 14 Mar, Lisbon</p></div>
      <Separator />
      <p>Doors 19:00</p>
    </div>
  ),
}
export const Vertical: Story = {
  render: () => <div className="flex h-5 items-center gap-3 text-sm"><span>Tickets</span><Separator orientation="vertical" /><span>Orders</span><Separator orientation="vertical" /><span>Payouts</span></div>,
}
export const Variants: Story = {
  render: () => <div className="w-72 space-y-4">{(["default", "secondary", "tertiary"] as const).map((v) => <div key={v}><p className="mb-1 text-xs">{v}</p><Separator variant={v} /></div>)}</div>,
}
