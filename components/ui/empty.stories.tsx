import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { CalendarX, CheckCircle, MagnifyingGlass, Ticket, WarningCircle, WifiSlash } from "@phosphor-icons/react"
import { Avatar, AvatarFallback, AvatarGroup } from "./avatar"
import { Button } from "./button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./empty"

const meta = {
  title: "Feedback/Empty",
  id: "molecules-empty",
  component: Empty,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "Empty state with media, title, description and a next action. 14px muted text, a 40px icon tile with 12px corners, an 18px semibold title; no dashed outline." } } },
} satisfies Meta<typeof Empty>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon" tone="accent"><Ticket weight="bold" /></EmptyMedia>
        <EmptyTitle>No tickets yet</EmptyTitle>
        <EmptyDescription>Tickets you buy will show up here, ready to scan at the door.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent><Button>Browse events</Button><Button variant="tertiary">How tickets work</Button></EmptyContent>
    </Empty>
  ),
}
export const PlainMedia: Story = {
  render: () => (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia><MagnifyingGlass weight="bold" className="size-8" /></EmptyMedia>
        <EmptyTitle>No events in Lisbon</EmptyTitle>
        <EmptyDescription>Try another city or clear the date filter.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent><Button variant="outline">Clear filters</Button></EmptyContent>
    </Empty>
  ),
}

export const Minimal: Story = {
  render: () => (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>No results</EmptyTitle>
        <EmptyDescription>Try adjusting your search or filters.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  ),
}
export const Outline: Story = {
  parameters: { docs: { description: { story: "A bordered container, for an empty area inside a page." } } },
  render: () => (
    <Empty className="rounded-3xl border border-dashed border-h-border">
      <EmptyHeader>
        <EmptyMedia variant="icon" tone="accent"><Ticket weight="bold" /></EmptyMedia>
        <EmptyTitle>No tickets yet</EmptyTitle>
        <EmptyDescription>Tickets you buy will show up here.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent><Button>Browse events</Button><Button variant="tertiary">How tickets work</Button></EmptyContent>
    </Empty>
  ),
}
export const Sizes: Story = {
  parameters: { docs: { description: { story: "`size` sets the padding and gap: the padding, gap, icon tile (40, 56, 80px), title (16, 20, 30px) and description (13, 14, 16px) all scale together." } } },
  render: () => (
    <div className="flex flex-col gap-4">
      {(["sm", "md", "lg"] as const).map((size) => (
        <Empty key={size} size={size} className="rounded-3xl border">
          <EmptyHeader>
            <EmptyMedia variant="icon" tone="accent"><Ticket weight="bold" /></EmptyMedia>
            <EmptyTitle>Size {size}</EmptyTitle>
            <EmptyDescription>Tickets you buy will show up here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ))}
    </div>
  ),
}
export const FullHeight: Story = {
  parameters: { docs: { description: { story: "The empty state fills its parent and centres its content." } } },
  render: () => (
    <div className="flex h-[420px] w-full rounded-3xl border">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon" tone="accent"><Ticket weight="bold" /></EmptyMedia>
          <EmptyTitle>No tickets yet</EmptyTitle>
          <EmptyDescription>Tickets you buy will show up here.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent><Button>Browse events</Button><Button variant="tertiary">How tickets work</Button></EmptyContent>
      </Empty>
    </div>
  ),
}
export const WithAvatar: Story = {
  render: () => (
    <Empty className="rounded-3xl border">
      <EmptyHeader>
        <EmptyMedia><Avatar size="lg" variant="soft"><AvatarFallback color="accent">MS</AvatarFallback></Avatar></EmptyMedia>
        <EmptyTitle>Mia hasn&apos;t shared any tickets</EmptyTitle>
        <EmptyDescription>Ask Mia to send you a ticket, or invite them to an event.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent><Button>Invite Mia</Button></EmptyContent>
    </Empty>
  ),
}
export const WithAvatarGroup: Story = {
  render: () => (
    <Empty className="rounded-3xl border">
      <EmptyHeader>
        <EmptyMedia>
          <AvatarGroup variant="soft">
            <Avatar><AvatarFallback color="accent">MS</AvatarFallback></Avatar>
            <Avatar><AvatarFallback color="success">JO</AvatarFallback></Avatar>
            <Avatar><AvatarFallback color="warning">TL</AvatarFallback></Avatar>
          </AvatarGroup>
        </EmptyMedia>
        <EmptyTitle>Nobody is going yet</EmptyTitle>
        <EmptyDescription>Invite friends to get seats together.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent><Button>Invite friends</Button></EmptyContent>
    </Empty>
  ),
}
export const WithBackground: Story = {
  parameters: { docs: { description: { story: "On the surface fill, for an empty panel." } } },
  render: () => (
    <Empty className="rounded-3xl bg-h-surface">
      <EmptyHeader>
        <EmptyMedia variant="icon" tone="accent"><Ticket weight="bold" /></EmptyMedia>
        <EmptyTitle>No tickets yet</EmptyTitle>
        <EmptyDescription>Tickets you buy will show up here.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent><Button>Browse events</Button><Button variant="tertiary">How tickets work</Button></EmptyContent>
    </Empty>
  ),
}

export const Tones: Story = {
  parameters: { docs: { description: { story: "The icon tile takes the tone of the message: accent for a nudge, success for done, warning for a heads-up, danger for a failure, default for neutral. A soft tint with a faint halo of the same colour." } } },
  render: () => (
    <div className="grid gap-4 md:grid-cols-2">
      <Empty className="rounded-3xl border">
        <EmptyHeader><EmptyMedia variant="icon" tone="success"><CheckCircle weight="bold" /></EmptyMedia><EmptyTitle>You&apos;re all caught up</EmptyTitle><EmptyDescription>No orders need your attention.</EmptyDescription></EmptyHeader>
      </Empty>
      <Empty className="rounded-3xl border">
        <EmptyHeader><EmptyMedia variant="icon" tone="warning"><CalendarX weight="bold" /></EmptyMedia><EmptyTitle>No dates this week</EmptyTitle><EmptyDescription>New shows are added every Monday.</EmptyDescription></EmptyHeader>
        <EmptyContent><Button variant="secondary">Notify me</Button></EmptyContent>
      </Empty>
      <Empty className="rounded-3xl border">
        <EmptyHeader><EmptyMedia variant="icon" tone="danger"><WifiSlash weight="bold" /></EmptyMedia><EmptyTitle>Can&apos;t load your tickets</EmptyTitle><EmptyDescription>Check your connection and try again.</EmptyDescription></EmptyHeader>
        <EmptyContent><Button>Try again</Button></EmptyContent>
      </Empty>
      <Empty className="rounded-3xl border">
        <EmptyHeader><EmptyMedia variant="icon"><MagnifyingGlass weight="bold" /></EmptyMedia><EmptyTitle>No results for &ldquo;jazz&rdquo;</EmptyTitle><EmptyDescription>Try a different word or clear your filters.</EmptyDescription></EmptyHeader>
        <EmptyContent><Button variant="tertiary">Clear filters</Button></EmptyContent>
      </Empty>
    </div>
  ),
}
