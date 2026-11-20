import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle } from "./navigation-menu"

const meta = {
  title: "Navigation & menus/Navigation menu",
  id: "molecules-navigation-menu",
  component: NavigationMenu,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "Top navigation with flyout panels. Triggers open on hover or keyboard." }, story: { inline: false, iframeHeight: 420 } } },
} satisfies Meta<typeof NavigationMenu>
export default meta
type Story = StoryObj<typeof meta>

const events = [["Sports", "Raptors, Blue Jays, Maple Leafs"], ["Concerts", "Arena tours and club nights"], ["Theatre", "Broadway and touring shows"]]
export const Default: Story = {
  render: () => (
    <NavigationMenu defaultValue="events">
      <NavigationMenuList>
        <NavigationMenuItem value="events">
          <NavigationMenuTrigger>Events</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-80 gap-1">
              {events.map(([t, d]) => (
                <li key={t}><NavigationMenuLink href="#"><span className="font-medium">{t}</span><span className="text-muted-foreground">{d}</span></NavigationMenuLink></li>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem value="sell">
          <NavigationMenuTrigger>Sell tickets</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-72 gap-1">
              <li><NavigationMenuLink href="#"><span className="font-medium">List a ticket</span><span className="text-muted-foreground">Set your price in under a minute</span></NavigationMenuLink></li>
              <li><NavigationMenuLink href="#"><span className="font-medium">My listings</span></NavigationMenuLink></li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem><NavigationMenuLink href="#" className={navigationMenuTriggerStyle()}>Help</NavigationMenuLink></NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),
}
export const NoViewport: Story = {
  render: () => (
    <NavigationMenu viewport={false} defaultValue="events">
      <NavigationMenuList>
        <NavigationMenuItem value="events">
          <NavigationMenuTrigger>Events</NavigationMenuTrigger>
          <NavigationMenuContent><ul className="grid w-64 gap-1">{events.map(([t]) => <li key={t}><NavigationMenuLink href="#">{t}</NavigationMenuLink></li>)}</ul></NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem><NavigationMenuLink href="#" className={navigationMenuTriggerStyle()}>Help</NavigationMenuLink></NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),
}
export const Closed: Story = {
  render: () => (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem><NavigationMenuLink href="#" className={navigationMenuTriggerStyle()} data-active>Events</NavigationMenuLink></NavigationMenuItem>
        <NavigationMenuItem><NavigationMenuLink href="#" className={navigationMenuTriggerStyle()}>Venues</NavigationMenuLink></NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),
}
