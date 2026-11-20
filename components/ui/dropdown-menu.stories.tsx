import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { DotsThree, Export, Copy, PlusSquare, PencilSimple, Trash, Users, Ticket, Share, Envelope, ChatText, Link as LinkIcon, Gear, CaretDown } from "@phosphor-icons/react"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { Button } from "./button"
import { Avatar, AvatarFallback } from "./avatar"
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "./dropdown-menu"

const meta = {
  title: "Navigation & menus/Dropdown menu",
  id: "molecules-dropdown-menu",
  component: DropdownMenu,
  tags: ["autodocs"],
  parameters: { docs: { story: { inline: false, iframeHeight: 460 }, description: { component: "A list of actions or options opened from a button. Rows can hold icons, descriptions and keyboard hints; groups get a small header; checkbox and radio rows make single or multiple choices; a row can open a submenu. The arrow keys move, Enter chooses, Escape closes, and typing jumps to a row. The 16px row corners sit 6px inside the 22px popover. The stories open the menu so it shows on the page." } } },
} satisfies Meta<typeof DropdownMenu>
export default meta
type Story = StoryObj<typeof meta>

const open = { defaultOpen: true, modal: false } as const

export const Default: Story = {
  render: () => (
    <DropdownMenu {...open}>
      <DropdownMenuTrigger asChild><Button variant="secondary">Actions</Button></DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem>New event</DropdownMenuItem>
        <DropdownMenuItem>Open template</DropdownMenuItem>
        <DropdownMenuItem>Duplicate</DropdownMenuItem>
        <DropdownMenuItem variant="danger">Cancel event</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  play: async ({ canvasElement }) => {
    const body = within(document.body)
    await waitFor(() => expect(body.getByRole("menu")).toBeInTheDocument())
    await expect(body.getAllByRole("menuitem")).toHaveLength(4)
    const canvas = within(canvasElement)
    void canvas
  },
}

export const WithIcons: Story = {
  render: () => (
    <DropdownMenu {...open}>
      <DropdownMenuTrigger asChild><Button variant="outline">Event actions <DotsThree weight="bold" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem><PencilSimple weight="bold" />Edit event</DropdownMenuItem>
        <DropdownMenuItem><Users weight="bold" />View attendees</DropdownMenuItem>
        <DropdownMenuItem><Copy weight="bold" />Duplicate</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="danger"><Trash weight="bold" />Cancel event</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}

export const WithDescriptions: Story = {
  parameters: { docs: { description: { story: "A muted second line under the label, for rows that need a hint." } } },
  render: () => (
    <DropdownMenu {...open}>
      <DropdownMenuTrigger asChild><Button variant="secondary">Add tickets</Button></DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuItem icon={<Ticket weight="bold" />} description="Standard entry for one person">General admission</DropdownMenuItem>
        <DropdownMenuItem icon={<Ticket weight="bold" />} description="Lounge access and early entry">VIP</DropdownMenuItem>
        <DropdownMenuItem icon={<Ticket weight="bold" />} description="Sold out for this event" disabled>Backstage</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}

export const WithDescriptionsAndShortcuts: Story = {
  parameters: { docs: { description: { story: "Icon, label, description and shortcut together. The description lines up with the label text, the icon with its first line, and the shortcut is centred on the row. A section header groups the rows and a danger row colours the label and icon red while its description stays muted." } } },
  render: () => (
    <DropdownMenu {...open}>
      <DropdownMenuTrigger asChild><Button variant="secondary" iconOnly aria-label="File actions"><DotsThree weight="bold" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem icon={<PlusSquare weight="bold" />} description="Create a new file" shortcut="⌘N">New file</DropdownMenuItem>
          <DropdownMenuItem icon={<PencilSimple weight="bold" />} description="Make changes" shortcut="⌘E">Edit file</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Danger zone</DropdownMenuLabel>
          <DropdownMenuItem variant="danger" icon={<Trash weight="bold" />} description="Move to trash" shortcut="⌘⇧D">Delete file</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}

export const WithDisabledItems: Story = {
  render: () => (
    <DropdownMenu {...open}>
      <DropdownMenuTrigger asChild><Button variant="secondary">Order</Button></DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem>View receipt</DropdownMenuItem>
        <DropdownMenuItem disabled>Transfer tickets</DropdownMenuItem>
        <DropdownMenuItem disabled>Request refund</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}

export const WithSections: Story = {
  parameters: { docs: { description: { story: "Groups with a small muted header and separators between them." } } },
  render: () => (
    <DropdownMenu {...open}>
      <DropdownMenuTrigger asChild><Button variant="outline">Summer Fest 2026</Button></DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Manage</DropdownMenuLabel>
          <DropdownMenuItem><PencilSimple weight="bold" />Edit event</DropdownMenuItem>
          <DropdownMenuItem><Users weight="bold" />View attendees</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Export</DropdownMenuLabel>
          <DropdownMenuItem><Export weight="bold" />Guest list</DropdownMenuItem>
          <DropdownMenuItem><Export weight="bold" />Sales report</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="danger"><Trash weight="bold" />Cancel event</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}

function MultipleDemo() {
  const [cols, setCols] = React.useState({ event: true, tickets: true, total: false, status: true })
  const flip = (k: keyof typeof cols) => (v: boolean) => setCols((c) => ({ ...c, [k]: v }))
  return (
    <DropdownMenu {...open}>
      <DropdownMenuTrigger asChild><Button variant="outline"><Gear weight="bold" />Columns</Button></DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel>Show columns</DropdownMenuLabel>
        <DropdownMenuCheckboxItem checked={cols.event} onCheckedChange={flip("event")} onSelect={(e) => e.preventDefault()}>Event</DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked={cols.tickets} onCheckedChange={flip("tickets")} onSelect={(e) => e.preventDefault()}>Tickets</DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked={cols.total} onCheckedChange={flip("total")} onSelect={(e) => e.preventDefault()}>Total</DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked={cols.status} onCheckedChange={flip("status")} onSelect={(e) => e.preventDefault()}>Status</DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
export const MultipleSelection: Story = {
  parameters: { docs: { description: { story: "Checkbox rows for several choices. The check scales in at the start of the row. Keeping the menu open while choosing is done with `onSelect` preventing the default." } } },
  render: () => <MultipleDemo />,
}

function SingleDemo() {
  const [sort, setSort] = React.useState("date")
  return (
    <DropdownMenu {...open}>
      <DropdownMenuTrigger asChild><Button variant="outline">Sort: {sort} <CaretDown weight="bold" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel>Sort events by</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
          <DropdownMenuRadioItem value="date">Date</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="price">Lowest price</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="sales">Tickets sold</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
export const SingleSelection: Story = {
  parameters: { docs: { description: { story: "Radio rows for one choice: a dot scales in at the start of the chosen row." } } },
  render: () => <SingleDemo />,
}

export const WithKeyboardShortcuts: Story = {
  render: () => (
    <DropdownMenu {...open}>
      <DropdownMenuTrigger asChild><Button variant="secondary">Edit</Button></DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem><Copy weight="bold" />Copy<DropdownMenuShortcut>⌘C</DropdownMenuShortcut></DropdownMenuItem>
        <DropdownMenuItem><PencilSimple weight="bold" />Rename<DropdownMenuShortcut>⌘R</DropdownMenuShortcut></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="danger"><Trash weight="bold" />Delete<DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}

export const WithSubmenus: Story = {
  parameters: { docs: { description: { story: "A row that ends in a small chevron opens a second menu. The arrow keys open and close it." } } },
  render: () => (
    <DropdownMenu {...open}>
      <DropdownMenuTrigger asChild><Button variant="outline"><Share weight="bold" />Share</Button></DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem><LinkIcon weight="bold" />Copy event link</DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger><Users weight="bold" />Send to a fan</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem><Envelope weight="bold" />By email</DropdownMenuItem>
            <DropdownMenuItem><ChatText weight="bold" />By SMS</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}

export const CustomTrigger: Story = {
  parameters: { docs: { description: { story: "Any element can be the trigger, here an avatar. Give it an accessible name." } } },
  render: () => (
    <DropdownMenu {...open}>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="Account menu" className="rounded-full outline-none focus-visible:h-focus-ring">
          <Avatar><AvatarFallback>MS</AvatarFallback></Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Marta Silva</DropdownMenuLabel>
        <DropdownMenuItem>My tickets</DropdownMenuItem>
        <DropdownMenuItem>Account settings</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="danger">Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}

function ControlledOpenDemo() {
  const [isOpen, setOpen] = React.useState(false)
  return (
    <div className="flex flex-col items-start gap-3">
      <DropdownMenu open={isOpen} onOpenChange={setOpen} modal={false}>
        <DropdownMenuTrigger asChild><Button variant="secondary">Actions</Button></DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem>New event</DropdownMenuItem>
          <DropdownMenuItem>Duplicate</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <p className="text-sm text-h-muted">The menu is <span className="font-medium text-h-foreground">{isOpen ? "open" : "closed"}</span>.</p>
      <Button size="sm" variant="tertiary" onClick={() => setOpen((o) => !o)}>Toggle from outside</Button>
    </div>
  )
}
export const ControlledOpenState: Story = {
  parameters: { docs: { description: { story: "Hold the open state to open or close the menu from elsewhere." } } },
  render: () => <ControlledOpenDemo />,
}
