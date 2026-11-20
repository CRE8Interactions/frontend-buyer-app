import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { CalendarBlank, CaretUpDown, ChartBar, Gear, House, Ticket, Users } from "@phosphor-icons/react"
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarProvider, SidebarTrigger } from "./sidebar"
import { Avatar, AvatarFallback } from "./avatar"

const meta = {
  title: "Navigation & menus/Sidebar",
  id: "organisms-sidebar",
  component: Sidebar,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "App navigation rail. Collapses to icons with collapsible=icon. Needs a SidebarProvider and a sized parent." } } },
} satisfies Meta<typeof Sidebar>
export default meta
type Story = StoryObj<typeof meta>

function Demo({ defaultOpen = true, collapsible = "icon" as const }) {
  return (
    <div className="h-[480px] overflow-hidden rounded-3xl border [transform:translateZ(0)]">
      <SidebarProvider defaultOpen={defaultOpen} className="h-full min-h-0">
        <Sidebar collapsible={collapsible} className="h-full!">
          <SidebarHeader>
            <SidebarMenu><SidebarMenuItem><SidebarMenuButton size="lg"><Ticket weight="bold" /><span className="font-semibold">Blocktickets</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Organizer</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem><SidebarMenuButton tooltip="Overview"><House weight="bold" /><span>Overview</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive tooltip="Events"><CalendarBlank weight="bold" /><span>Events</span></SidebarMenuButton>
                  <SidebarMenuBadge>12</SidebarMenuBadge>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem><SidebarMenuSubButton href="#" isActive><span>Upcoming</span></SidebarMenuSubButton></SidebarMenuSubItem>
                    <SidebarMenuSubItem><SidebarMenuSubButton href="#"><span>Past events</span></SidebarMenuSubButton></SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton tooltip="Orders"><Ticket weight="bold" /><span>Orders</span></SidebarMenuButton></SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Insights</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem><SidebarMenuButton tooltip="Sales"><ChartBar weight="bold" /><span>Sales</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton tooltip="Fans"><Users weight="bold" /><span>Fans</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton tooltip="Settings"><Gear weight="bold" /><span>Settings</span></SidebarMenuButton></SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu><SidebarMenuItem>
              <SidebarMenuButton size="lg" tooltip="Maya Chen">
                <Avatar className="size-8"><AvatarFallback>MC</AvatarFallback></Avatar>
                <span className="grid flex-1 text-left text-sm leading-tight"><span className="truncate font-medium">Maya Chen</span><span className="truncate text-xs">maya@raptors.example</span></span>
                <CaretUpDown weight="bold" />
              </SidebarMenuButton>
            </SidebarMenuItem></SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="p-4"><SidebarTrigger /><p className="mt-4 text-sm text-muted-foreground">Scotiabank Arena, 12 upcoming events</p></SidebarInset>
      </SidebarProvider>
    </div>
  )
}
export const Expanded: Story = { render: () => <Demo /> }
export const IconCollapsed: Story = { render: () => <Demo defaultOpen={false} /> }
