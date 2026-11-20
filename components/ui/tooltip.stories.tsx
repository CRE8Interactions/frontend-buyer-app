import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Button } from "./button"
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip"

const meta = { title: "Overlays/Tooltip", id: "molecules-tooltip", component: Tooltip, tags: ["autodocs"] } satisfies Meta<typeof Tooltip>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div className="p-16">
      <Tooltip defaultOpen><TooltipTrigger asChild><Button variant="outline">Hover or focus</Button></TooltipTrigger><TooltipContent>Add to wallet</TooltipContent></Tooltip>
    </div>
  ),
}
