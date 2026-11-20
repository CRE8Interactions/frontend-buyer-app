import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarShortcut, MenubarSub, MenubarSubContent, MenubarSubTrigger, MenubarTrigger } from "./menubar"

const meta = {
  title: "Navigation & menus/Menubar",
  id: "molecules-menubar",
  component: Menubar,
  tags: ["autodocs"],
  parameters: { docs: { story: { inline: false, iframeHeight: 420 }, description: { component: "Horizontal bar of menus for dense organizer tools. A floating surface pill with pill triggers; menus are the dropdown popover with the dropdown option rows." } } },
} satisfies Meta<typeof Menubar>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: function Render() {
    const [value, setValue] = React.useState("event")
    return (
      <Menubar value={value} onValueChange={setValue}>
        <MenubarMenu value="event">
          <MenubarTrigger>Event</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>New event <MenubarShortcut>N</MenubarShortcut></MenubarItem>
            <MenubarItem>Duplicate</MenubarItem>
            <MenubarSub>
              <MenubarSubTrigger>Export</MenubarSubTrigger>
              <MenubarSubContent><MenubarItem>Guest list (CSV)</MenubarItem><MenubarItem>Sales report (PDF)</MenubarItem></MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem variant="destructive">Cancel event</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu value="view">
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarContent>
            <MenubarCheckboxItem checked>Seat map</MenubarCheckboxItem>
            <MenubarCheckboxItem>Sold out sections</MenubarCheckboxItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu value="help"><MenubarTrigger>Help</MenubarTrigger><MenubarContent><MenubarItem disabled>Contact support</MenubarItem></MenubarContent></MenubarMenu>
      </Menubar>
    )
  },
}
