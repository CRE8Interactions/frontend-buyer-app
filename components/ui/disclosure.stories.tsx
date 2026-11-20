import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { Disclosure, DisclosureBody, DisclosureContent, DisclosureGroup, DisclosureIndicator, DisclosureTrigger } from "./disclosure"

const meta = {
  title: "Layout & foundations/Disclosure",
  id: "molecules-disclosure",
  component: Disclosure,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "Shows or hides a panel from a trigger, with a caret that turns over. Lighter than the accordion: use it for one 'show more' area. A group opens one at a time, or several with `allowsMultipleExpanded`." } } },
} satisfies Meta<typeof Disclosure>
export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  render: () => (
    <Disclosure className="w-80">
      <DisclosureTrigger className="flex w-full items-center rounded-2xl bg-h-default px-4 py-3 text-sm font-medium">
        Refund policy<DisclosureIndicator />
      </DisclosureTrigger>
      <DisclosureContent>
        <DisclosureBody className="text-sm text-h-muted">Tickets are refundable up to 48 hours before the event. After that they can be resold on the official marketplace.</DisclosureBody>
      </DisclosureContent>
    </Disclosure>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: /refund policy/i })
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(trigger)
    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "true"))
  },
}
export const OpenByDefault: Story = {
  render: () => (
    <Disclosure defaultExpanded className="w-80">
      <DisclosureTrigger className="flex w-full items-center rounded-2xl bg-h-default px-4 py-3 text-sm font-medium">Doors and timings<DisclosureIndicator /></DisclosureTrigger>
      <DisclosureContent><DisclosureBody className="text-sm text-h-muted">Doors open at 19:00 and the show starts at 20:00.</DisclosureBody></DisclosureContent>
    </Disclosure>
  ),
}
function GroupDemo({ multiple }: { multiple?: boolean }) {
  const items = [
    ["tickets", "Can I transfer my tickets?", "Yes. Open the ticket in your wallet and tap Transfer."],
    ["refunds", "What if the event is postponed?", "Tickets stay valid for the new date, or you can ask for a refund."],
    ["access", "Is the venue accessible?", "Step-free entry is at Gate 3, with companion seats on request."],
  ]
  return (
    <DisclosureGroup allowsMultipleExpanded={multiple} defaultExpandedKeys={["tickets"]} className="max-w-md">
      {items.map(([id, q, a]) => (
        <Disclosure key={id} id={id} className="border-b border-h-separator last:border-b-0">
          <DisclosureTrigger className="flex w-full items-center px-2 py-3 text-sm font-medium">{q}<DisclosureIndicator className="text-h-muted" /></DisclosureTrigger>
          <DisclosureContent><DisclosureBody className="px-2 pb-3 text-sm text-h-muted">{a}</DisclosureBody></DisclosureContent>
        </Disclosure>
      ))}
    </DisclosureGroup>
  )
}
export const Group: Story = { parameters: { docs: { description: { story: "Opening one closes the others." } } }, render: () => <GroupDemo /> }
export const GroupMultiple: Story = { parameters: { docs: { description: { story: "`allowsMultipleExpanded` lets several stay open." } } }, render: () => <GroupDemo multiple /> }
function ControlledDemo() {
  const [open, setOpen] = React.useState(false)
  return (
    <div className="flex flex-col items-start gap-3">
      <Disclosure expanded={open} onExpandedChange={setOpen} className="w-80">
        <DisclosureTrigger className="flex w-full items-center rounded-2xl bg-h-default px-4 py-3 text-sm font-medium">Order details<DisclosureIndicator /></DisclosureTrigger>
        <DisclosureContent><DisclosureBody className="text-sm text-h-muted">2 × General admission, Section 112.</DisclosureBody></DisclosureContent>
      </Disclosure>
      <button type="button" className="text-sm text-h-link underline-offset-4 hover:underline" onClick={() => setOpen((o) => !o)}>{open ? "Collapse" : "Expand"} from outside</button>
    </div>
  )
}
export const Controlled: Story = { render: () => <ControlledDemo /> }
