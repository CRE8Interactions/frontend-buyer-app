import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { TicketPass } from "./TicketPass"

const meta = {
  title: "Tickets/Ticket pass",
  id: "organisms-ticket-pass",
  component: TicketPass,
  tags: ["autodocs"],
  args: { code: "BT-RAPTORS-4407-100", row: "Sec A · Row F", seat: "6", label: "Your ticket", count: 1, wallet: "apple" },
  argTypes: { wallet: { control: "select", options: ["apple", "google"] } },
  decorators: [(Story) => <div className="mx-auto max-w-[360px]"><Story /></div>],
  parameters: {
    docs: {
      description: {
        component:
          "The ticket as the buyer sees it on the ticket page and in the text-delivery email. A square QR on a white plate leads, with its code under it (it may only break at its dashes); the browse tile's cutout (9px notches) and perforation (a row of small round holes) separate it from the stub; the stub has SEC, ROW and SEAT in capitals (first and last at the edges, the middle one centred), an accessible-seating pill when the ticket has it, and the wallet badge for the device. Tap the QR to enlarge it. This replaces the old dialog \"Ticket stub\" (barcode, no cutout).",
      },
    },
  },
} satisfies Meta<typeof TicketPass>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Accessible: Story = {
  parameters: { docs: { description: { story: "A ticket with accessible seating gets a neutral pill under the seat columns, not a tile and not next to the event type." } } },
  args: { accessible: true },
}
export const LongSection: Story = {
  parameters: { docs: { description: { story: "A section name longer than six characters takes a row of its own, and a long row or seat wraps to two lines at most." } } },
  args: { row: "Sec Club Level Lounge Suite 214B · Row Standing Room Only", seat: "1" },
}
export const GeneralAdmission: Story = {
  parameters: { docs: { description: { story: "No section and row: the stub shows one ENTRY value." } } },
  args: { row: "General admission, standing floor", seat: "1", code: "BT-NEON-4407-100" },
}
export const MoreThanOne: Story = {
  name: "More than one ticket",
  parameters: { docs: { description: { story: "With more than one ticket in the order, tapping the wallet badge opens a sheet to add just this ticket or all of them." } } },
  args: { count: 8, label: "Ticket 1 of 8" },
}
export const Ended: Story = {
  parameters: { docs: { description: { story: "The event is over: the code is greyed, blurred and struck through so it cannot be scanned, and the wallet badge goes." } } },
  args: { ended: true },
}
export const Google: Story = { args: { wallet: "google" } }
