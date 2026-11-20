import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Button } from "./button"
import { Sheet, SheetContent, SheetDescription, SheetBody, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "./sheet"

const meta = { title: "Overlays/Sheet", id: "molecules-sheet", component: Sheet, tags: ["autodocs"], parameters: { docs: { description: { component: "A panel from any edge on the overlay fill with the overlay shadow, 16px corners on the inside edge, 24rem wide (96vw at most) on the sides. Header 20px side padding, `SheetBody` scrolls the middle, the footer stacks full-width buttons on phones and right-aligns them from `sm`. The close button is the 24px close button." } } } } satisfies Meta<typeof Sheet>
export default meta
type Story = StoryObj<typeof meta>

const make = (side: "top" | "right" | "bottom" | "left"): Story => ({
  render: () => (
    <Sheet>
      <SheetTrigger asChild><Button variant="outline">Open {side}</Button></SheetTrigger>
      <SheetContent side={side}>
        <SheetHeader><SheetTitle>Order #48210</SheetTitle><SheetDescription>Raptors vs Celtics · Section 112</SheetDescription></SheetHeader>
        <SheetBody><p className="text-sm text-h-muted">2 tickets, delivered to your wallet. Resend them if they did not arrive.</p></SheetBody>
        <SheetFooter><Button>Resend tickets</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  ),
})
export const Right = make("right")
export const Left = make("left")
export const Bottom = make("bottom")
export const Top = make("top")
