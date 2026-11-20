import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Ticket, Users, Copy, Trash, PencilSimple } from "@phosphor-icons/react"
import { expect, userEvent, within } from "storybook/test"
import { ListBox, ListBoxItem, ListBoxSection, ListBoxSeparator } from "./list-box"

const meta = {
  title: "Select & pickers/List box",
  id: "molecules-list-box",
  component: ListBox,
  tags: ["autodocs"],
  decorators: [(Story) => <div className="w-72 rounded-3xl bg-h-surface p-1"><Story /></div>],
  parameters: { docs: { description: { component: "An always-visible list you choose from: one row, several, or none (a plain list of actions). Rows have 16px corners and can have an icon, a description and a keyboard hint; a selected row shows a check at its end. Tab enters the list, the arrow keys move, Space or Enter chooses." } } },
} satisfies Meta<typeof ListBox>
export default meta
type Story = StoryObj<typeof meta>

export const Single: Story = {
  render: () => (
    <ListBox aria-label="Ticket type" defaultValue={["ga"]}>
      <ListBoxItem value="ga">General admission</ListBoxItem>
      <ListBoxItem value="vip">VIP</ListBoxItem>
      <ListBoxItem value="backstage" disabled>Backstage (sold out)</ListBoxItem>
    </ListBox>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const vip = canvas.getByRole("option", { name: "VIP" })
    await userEvent.click(vip)
    await expect(vip).toHaveAttribute("aria-selected", "true")
    await expect(canvas.getByRole("option", { name: "General admission" })).toHaveAttribute("aria-selected", "false")
  },
}
export const Multiple: Story = {
  render: () => (
    <ListBox aria-label="Add-ons" selectionMode="multiple" defaultValue={["parking"]}>
      <ListBoxItem value="parking">Parking pass</ListBoxItem>
      <ListBoxItem value="merch">Merch bundle</ListBoxItem>
      <ListBoxItem value="meal">Meal voucher</ListBoxItem>
    </ListBox>
  ),
}
export const WithDescriptions: Story = {
  render: () => (
    <ListBox aria-label="Ticket type" defaultValue={["vip"]}>
      <ListBoxItem value="ga" icon={<Ticket weight="bold" />} description="Standard entry for one person">General admission</ListBoxItem>
      <ListBoxItem value="vip" icon={<Ticket weight="bold" />} description="Lounge access and early entry">VIP</ListBoxItem>
    </ListBox>
  ),
}
export const WithSections: Story = {
  render: () => (
    <ListBox aria-label="Sections" selectionMode="multiple">
      <ListBoxSection header="Floor">
        <ListBoxItem value="a">Section A</ListBoxItem>
        <ListBoxItem value="b">Section B</ListBoxItem>
      </ListBoxSection>
      <ListBoxSeparator />
      <ListBoxSection header="Balcony">
        <ListBoxItem value="c">Section C</ListBoxItem>
        <ListBoxItem value="d">Section D</ListBoxItem>
      </ListBoxSection>
    </ListBox>
  ),
}
export const ActionsWithShortcuts: Story = {
  parameters: { docs: { description: { story: "With selection off the list is a set of actions. Shortcuts use the Kbd component: one key per symbol, named keys announced by name." } } },
  render: () => (
    <ListBox aria-label="Actions" selectionMode="none">
      <ListBoxItem icon={<PencilSimple weight="bold" />} description="Make changes" shortcut="⌘E">Edit order</ListBoxItem>
      <ListBoxItem icon={<Copy weight="bold" />} description="Make a duplicate" shortcut="⌘D">Duplicate</ListBoxItem>
      <ListBoxSeparator />
      <ListBoxItem variant="danger" icon={<Trash weight="bold" />} description="Refund and remove" shortcut="⌘⇧⌫">Cancel order</ListBoxItem>
    </ListBox>
  ),
}
function ControlledDemo() {
  const [v, setV] = React.useState<string[]>(["a"])
  return (
    <div className="flex flex-col gap-2">
      <ListBox aria-label="Seats" value={v} onChange={setV}>
        <ListBoxItem value="a" icon={<Users weight="bold" />}>Two seats together</ListBoxItem>
        <ListBoxItem value="b" icon={<Users weight="bold" />}>Four seats together</ListBoxItem>
      </ListBox>
      <p className="px-3 pb-2 text-sm text-h-muted">Selected: <span className="font-medium text-h-foreground">{v[0]}</span></p>
    </div>
  )
}
export const Controlled: Story = { render: () => <ControlledDemo /> }
