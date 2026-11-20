import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Calendar, ChartBar, Gear, SquaresFour, Rows, Ticket, Users } from "@phosphor-icons/react"
import { Badge } from "./badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs"

const meta = {
  title: "Navigation & menus/Tabs",
  id: "molecules-tabs",
  component: Tabs,
  tags: ["autodocs", "updated"],
  parameters: { docs: { description: { component: "Tabs switch views in place. The default is the neutral pill on a quiet track; soft with tone=accent tints the pill with the accent; bar has a filled bar with a green pill; outline outlines every tab, line has a baseline with a green underline. All share the control height ladder (sm, md, lg), can run full width or scroll when they overflow, and the active mark glides between tabs. Inactive tabs in soft and line show a faint pill on hover. The active pill glides between tabs." } } },
} satisfies Meta<typeof Tabs>
export default meta
type Story = StoryObj<typeof meta>

const panels = (
  <>
    <TabsContent value="overview" className="pt-3 text-sm">Overview content</TabsContent>
    <TabsContent value="pricing" className="pt-3 text-sm">Pricing content</TabsContent>
    <TabsContent value="venues" className="pt-3 text-sm">Venues content</TabsContent>
  </>
)
export const Default: Story = {
  render: () => (
    <Tabs defaultValue="overview">
      <TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="pricing">Pricing</TabsTrigger><TabsTrigger value="venues">Venues</TabsTrigger></TabsList>
      {panels}
    </Tabs>
  ),
}
export const Bar: Story = {
  render: () => (
    <Tabs defaultValue="overview">
      <TabsList variant="default"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="pricing">Pricing</TabsTrigger><TabsTrigger value="venues">Venues</TabsTrigger></TabsList>
      {panels}
    </Tabs>
  ),
}
export const Line: Story = {
  render: () => (
    <Tabs defaultValue="overview">
      <TabsList variant="line"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="pricing">Pricing</TabsTrigger><TabsTrigger value="venues">Venues</TabsTrigger></TabsList>
      {panels}
    </Tabs>
  ),
}
export const SoftAccent: Story = {
  render: () => (
    <Tabs defaultValue="overview">
      <TabsList variant="soft" tone="accent"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="pricing">Pricing</TabsTrigger><TabsTrigger value="venues">Venues</TabsTrigger></TabsList>
      {panels}
    </Tabs>
  ),
}

const three = (
  <>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="pricing">Pricing</TabsTrigger>
    <TabsTrigger value="venues">Venues</TabsTrigger>
  </>
)
export const Outline: Story = {
  render: () => (
    <Tabs defaultValue="overview">
      <TabsList variant="outline">{three}</TabsList>
      {panels}
    </Tabs>
  ),
}
export const Sizes: Story = {
  parameters: { docs: { description: { story: "Heights follow the same ladder as buttons and fields: sm 36 (32 on desktop), md 40 (36), lg 48 (44)." } } },
  render: () => (
    <div className="flex flex-col gap-6">
      {(["sm", "md", "lg"] as const).map((size) => (
        <Tabs key={size} defaultValue="overview"><TabsList size={size}>{three}</TabsList></Tabs>
      ))}
    </div>
  ),
}
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {(["default", "soft", "outline", "line"] as const).map((v) => (
        <Tabs key={v} defaultValue="overview"><TabsList variant={v}>{three}</TabsList></Tabs>
      ))}
    </div>
  ),
}
export const FullWidth: Story = {
  parameters: { docs: { description: { story: "Tabs share the row equally, for phone layouts and card headers." } } },
  render: () => (
    <div className="flex max-w-md flex-col gap-6">
      {(["default", "line"] as const).map((v) => (
        <Tabs key={v} defaultValue="overview"><TabsList variant={v} fullWidth>{three}</TabsList></Tabs>
      ))}
    </div>
  ),
}
export const WithIconsAndCounts: Story = {
  parameters: { docs: { description: { story: "An icon before the label, or a count after it. Counts use a small soft badge so they do not compete with the label." } } },
  render: () => (
    <Tabs defaultValue="orders">
      <TabsList variant="line">
        <TabsTrigger value="orders"><Ticket weight="bold" />Orders <Badge variant="soft" size="sm">48</Badge></TabsTrigger>
        <TabsTrigger value="guests"><Users weight="bold" />Guests <Badge variant="soft" size="sm">312</Badge></TabsTrigger>
        <TabsTrigger value="schedule"><Calendar weight="bold" />Schedule</TabsTrigger>
        <TabsTrigger value="reports"><ChartBar weight="bold" />Reports</TabsTrigger>
        <TabsTrigger value="settings"><Gear weight="bold" />Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="orders" className="pt-3 text-sm">Orders content</TabsContent>
    </Tabs>
  ),
}
export const Scrollable: Story = {
  parameters: { docs: { description: { story: "When tabs do not fit, the row scrolls sideways with soft fades at the edges instead of wrapping or squashing." } } },
  render: () => (
    <Tabs defaultValue="t1" className="max-w-xs">
      <TabsList variant="soft" scrollable>
        {["Upcoming", "Past events", "Drafts", "Cancelled", "Archived", "Templates"].map((l, i) => <TabsTrigger key={l} value={`t${i + 1}`}>{l}</TabsTrigger>)}
      </TabsList>
    </Tabs>
  ),
}
export const WithDisabledTab: Story = {
  render: () => (
    <Tabs defaultValue="overview">
      <TabsList variant="soft"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="pricing">Pricing</TabsTrigger><TabsTrigger value="venues" disabled>Venues</TabsTrigger></TabsList>
    </Tabs>
  ),
}
export const Vertical: Story = {
  parameters: { docs: { description: { story: "A side list for settings pages and long forms." } } },
  render: () => (
    <Tabs defaultValue="profile" orientation="vertical" className="flex-row gap-6">
      <TabsList variant="soft" className="w-44 items-stretch">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
        <TabsTrigger value="team">Team</TabsTrigger>
      </TabsList>
      <TabsContent value="profile" className="text-sm">Profile settings</TabsContent>
      <TabsContent value="billing" className="text-sm">Billing settings</TabsContent>
      <TabsContent value="team" className="text-sm">Team settings</TabsContent>
    </Tabs>
  ),
}

export const PillsWithIcons: Story = {
  parameters: { docs: { description: { story: "Icons inside the pill styles: a label with an icon, a count, or icon-only tabs (`iconOnly`, give each an aria-label). The active pill glides under the icon and label together." } } },
  render: () => (
    <div className="flex flex-col gap-6">
      {(["default", "soft", "outline"] as const).map((v) => (
        <div key={v} className="flex flex-wrap items-center gap-6">
          <Tabs defaultValue="orders">
            <TabsList variant={v}>
              <TabsTrigger value="orders"><Ticket weight="bold" />Orders</TabsTrigger>
              <TabsTrigger value="guests"><Users weight="bold" />Guests</TabsTrigger>
              <TabsTrigger value="reports"><ChartBar weight="bold" />Reports</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs defaultValue="grid">
            <TabsList variant={v}>
              <TabsTrigger value="grid" iconOnly aria-label="Grid view"><SquaresFour weight="bold" /></TabsTrigger>
              <TabsTrigger value="list" iconOnly aria-label="List view"><Rows weight="bold" /></TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      ))}
    </div>
  ),
}


export const SecondaryVertical: Story = {
  parameters: { docs: { description: { story: "The underline style stacked: a baseline down the side with the accent marking the active tab." } } },
  render: () => (
    <Tabs defaultValue="profile" orientation="vertical" className="flex-row gap-6">
      <TabsList variant="line" className="w-44 items-stretch">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
        <TabsTrigger value="team">Team</TabsTrigger>
      </TabsList>
      <TabsContent value="profile" className="text-sm">Profile settings</TabsContent>
      <TabsContent value="billing" className="text-sm">Billing settings</TabsContent>
      <TabsContent value="team" className="text-sm">Team settings</TabsContent>
    </Tabs>
  ),
}

export const WithSeparator: Story = {
  parameters: { docs: { description: { story: "`separator` draws a thin divider between tabs, hidden beside the selected one." } } },
  render: () => (
    <Tabs defaultValue="overview">
      <TabsList separator>{three}</TabsList>
      {panels}
    </Tabs>
  ),
}
export const Alignment: Story = {
  parameters: { docs: { description: { story: "`align` places the label inside each tab: start, centre (the default) or end. Handy for sidebar-style vertical tabs." } } },
  render: () => (
    <Tabs defaultValue="general" orientation="vertical" className="flex-row gap-6">
      <TabsList align="end" className="w-52 items-stretch">
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="billing">Subscription &amp; Billing</TabsTrigger>
        <TabsTrigger value="appearance">Appearance</TabsTrigger>
      </TabsList>
      <TabsContent value="general" className="text-sm">General settings</TabsContent>
      <TabsContent value="billing" className="text-sm">Billing settings</TabsContent>
      <TabsContent value="appearance" className="text-sm">Appearance settings</TabsContent>
    </Tabs>
  ),
}
