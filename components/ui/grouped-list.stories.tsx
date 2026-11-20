import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { GroupedList, GroupedListItem } from "./grouped-list"

const meta = {
  title: "Display & content/Grouped list",
  id: "molecules-grouped-list",
  component: GroupedList,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "The one list. A grouped block in the iOS style: a faint fill (5% of the text colour, so it reads on a card, a dialog, a drawer and a sheet, in light and dark), 16px corners, rows 12px / 16px, hairlines inset 16px between rows, the label muted on the left and the value medium on the right with tabular figures. **Use it for every list of facts** (order lines, details, settings) **and every list of choices** (go to a ticket). The alert dialog's details panel is this same block. For rows that carry media, a title and a description, use `Item` and put the rows inside this block's fill.",
      },
    },
  },
} satisfies Meta<typeof GroupedList>
export default meta
type Story = StoryObj<typeof meta>

export const Facts: Story = {
  parameters: { docs: { description: { story: "A list of facts: plain rows, label and value." } } },
  render: () => (
    <GroupedList className="max-w-sm">
      <GroupedListItem label="Tickets x2">$178.00</GroupedListItem>
      <GroupedListItem label="Service fee">$12.40</GroupedListItem>
      <GroupedListItem label="Parking pass">$20.00</GroupedListItem>
      <GroupedListItem label="Total">$210.40</GroupedListItem>
    </GroupedList>
  ),
}

export const Choices: Story = {
  parameters: { docs: { description: { story: "A list of choices: each row is a button, and `selected` puts a check at the end of the chosen row (false keeps the space so the values line up). Used for \"Go to a ticket\" on the ticket page." } } },
  render: () => {
    const [active, setActive] = useState(1)
    return (
      <GroupedList className="max-w-sm">
        {[6, 7, 8].map((seat, i) => (
          <GroupedListItem key={seat} label={`Ticket ${i + 1}`} selected={i === active} onClick={() => setActive(i)}>
            {`Sec A · Row F · Seat ${seat}`}
          </GroupedListItem>
        ))}
      </GroupedList>
    )
  },
}

export const AsLinks: Story = {
  parameters: { docs: { description: { story: "A row can be a link with `asChild`." } } },
  render: () => (
    <GroupedList className="max-w-sm">
      <GroupedListItem asChild label="Order"><a href="#order">BT-RAPTORS-8021</a></GroupedListItem>
      <GroupedListItem asChild label="Receipt"><a href="#receipt">Download</a></GroupedListItem>
    </GroupedList>
  ),
}

export const OnSurfaces: Story = {
  name: "On a card, a dialog and a sheet",
  parameters: { docs: { description: { story: "The fill is a tint of the text colour, so the block works on the page, on a card and on an overlay without a variant." } } },
  render: () => (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-[24px] bg-h-surface p-4"><GroupedList><GroupedListItem label="Seat">F 6</GroupedListItem><GroupedListItem label="Doors">5:30 PM</GroupedListItem></GroupedList></div>
      <div className="rounded-[24px] bg-h-overlay p-4 shadow-h-overlay"><GroupedList><GroupedListItem label="Seat">F 6</GroupedListItem><GroupedListItem label="Doors">5:30 PM</GroupedListItem></GroupedList></div>
    </div>
  ),
}
