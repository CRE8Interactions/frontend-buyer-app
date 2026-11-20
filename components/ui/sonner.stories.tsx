import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import * as React from "react"
import { toast } from "sonner"
import { Toaster } from "./sonner"
import { Button } from "./button"

const meta = {
  title: "Feedback/Toast (Sonner)",
  id: "molecules-sonner",
  component: Toaster,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "Toast notifications. Render one Toaster at the app root and call toast() anywhere." }, story: { inline: false, iframeHeight: 420 } } },
} satisfies Meta<typeof Toaster>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Toaster />
      <Button variant="outline" onClick={() => toast("Event saved to your list")}>Default</Button>
      <Button variant="outline" onClick={() => toast.success("Order confirmed: 2 tickets, Section 112")}>Success</Button>
      <Button variant="outline" onClick={() => toast.error("Payment declined. Try another card.")}>Error</Button>
      <Button variant="outline" onClick={() => toast("Seats held for 5:00", { description: "Row F, seats 7 and 8", action: { label: "Undo", onClick: () => {} } })}>With action</Button>
      <Button variant="outline" onClick={() => toast.warning("Only 3 tickets left")}>Warning</Button>
      <Button variant="outline" onClick={() => toast.info("Doors open at 6:30 PM")}>Info</Button>
      <Button variant="outline" onClick={() => toast.promise(new Promise((r) => setTimeout(r, 2000)), { loading: "Transferring tickets", success: "Tickets sent to Maya", error: "Transfer failed" })}>Loading</Button>
    </div>
  ),
}
function ShowingDemo() {
  React.useEffect(() => {
    const t = setTimeout(() => {
      toast.success("Order confirmed: 2 tickets, Section 112", { duration: Infinity })
      toast.error("Payment declined. Try another card.", { duration: Infinity })
    }, 300)
    return () => { clearTimeout(t); toast.dismiss() }
  }, [])
  return <Toaster />
}
export const Showing: Story = { render: () => <ShowingDemo /> }
