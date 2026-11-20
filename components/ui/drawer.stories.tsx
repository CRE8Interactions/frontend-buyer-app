import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Button } from "./button"
import { Drawer, DrawerClose, DrawerContent, DrawerBody, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "./drawer"

const meta = {
  title: "Overlays/Drawer",
  id: "molecules-drawer",
  component: Drawer,
  tags: ["autodocs"],
  parameters: { docs: { story: { inline: false, iframeHeight: 420 }, description: { component: "Swipeable panel (vaul) that slides from any edge. Bottom on mobile checkout, side on desktop. Overlay fill, 24px padding, 16px corners on the open edge (side drawers are square), 85vh at most, sides 320px (384px from sm, 85vw at most). An iOS-style grabber (36 x 5px pill) on the bottom drawer." } } },
} satisfies Meta<typeof Drawer>
export default meta
type Story = StoryObj<typeof meta>

const body = (
  <>
    <DrawerHeader>
      <DrawerTitle>Your order</DrawerTitle>
      <DrawerDescription>2 x General admission, Summer Fest 2026</DrawerDescription>
    </DrawerHeader>
    <DrawerBody>Total <span className="font-semibold text-h-foreground">$178.00</span> including fees. Your tickets are sent to your phone as soon as you pay.</DrawerBody>
    <DrawerFooter>
      <Button>Pay now</Button>
      <DrawerClose asChild><Button variant="tertiary">Keep browsing</Button></DrawerClose>
    </DrawerFooter>
  </>
)

export const Bottom: Story = {
  render: () => (
    <Drawer open>
      <DrawerTrigger asChild><Button variant="outline">Open order</Button></DrawerTrigger>
      <DrawerContent>{body}</DrawerContent>
    </Drawer>
  ),
}
export const Right: Story = {
  render: () => (
    <Drawer open direction="right">
      <DrawerTrigger asChild><Button variant="outline">Open order</Button></DrawerTrigger>
      <DrawerContent>{body}</DrawerContent>
    </Drawer>
  ),
}
export const Trigger: Story = {
  render: () => (
    <Drawer direction="left">
      <DrawerTrigger asChild><Button>Filters</Button></DrawerTrigger>
      <DrawerContent>{body}</DrawerContent>
    </Drawer>
  ),
}
