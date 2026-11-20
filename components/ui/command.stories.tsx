import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ArrowDown, ArrowElbowDownLeft, ArrowUp, CalendarBlank, MapPin, Ticket, Users } from "@phosphor-icons/react"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandHeader,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./command"

const meta = {
  title: "Navigation & menus/Command",
  id: "molecules-command",
  component: Command,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "Searchable command list (cmdk). Render inline, or inside CommandDialog for the Cmd+K palette. The panel is the overlay fill with 16px corners and the overlay shadow, in three sizes (sm, md, lg). Items are 36px rows with 8px corners that take the default fill on hover and keyboard highlight. Optional header and footer, a prefix and suffix on the search row, and a clear button while there is text. The dialog opens 15vh from the top over an opaque, blur or transparent backdrop." } } },
} satisfies Meta<typeof Command>
export default meta
type Story = StoryObj<typeof meta>

const Key = ({ children, label }: { children: React.ReactNode; label?: string }) => (
  <kbd aria-label={label} className="flex h-5 min-w-5 items-center justify-center rounded-[8px] bg-h-default px-2 font-sans text-xs font-medium text-h-muted">{children}</kbd>
)

const list = (
  <CommandList>
    <CommandEmpty>No results for that search.</CommandEmpty>
    <CommandGroup heading="Events">
      <CommandItem><CalendarBlank weight="bold" /> Harbour Lights Festival <CommandShortcut>⌘E</CommandShortcut></CommandItem>
      <CommandItem><CalendarBlank weight="bold" /> Riverside Jazz Night</CommandItem>
      <CommandItem disabled><Ticket weight="bold" /> Summer Sessions Live (sold out)</CommandItem>
    </CommandGroup>
    <CommandSeparator />
    <CommandGroup heading="Venues">
      <CommandItem><MapPin weight="bold" /> Riverside Arena</CommandItem>
      <CommandItem><MapPin weight="bold" /> Old Town Theatre</CommandItem>
    </CommandGroup>
    <CommandSeparator />
    <CommandGroup heading="Fans">
      <CommandItem><Users weight="bold" /> Marta Silva</CommandItem>
    </CommandGroup>
  </CommandList>
)

const footer = (
  <CommandFooter>
    <Key label="Up"><ArrowUp weight="bold" className="size-3" /></Key>
    <Key label="Down"><ArrowDown weight="bold" className="size-3" /></Key>
    <span>Navigate</span>
    <Key label="Enter"><ArrowElbowDownLeft weight="bold" className="size-3" /></Key>
    <span>Select</span>
  </CommandFooter>
)

const palette = (
  <>
    <CommandHeader>
      <span className="inline-flex h-5 items-center rounded-[16px] bg-h-default px-1 text-xs font-medium">Home</span>
    </CommandHeader>
    <CommandInput placeholder="Type a command or search..." suffix={<Key>Esc</Key>} />
    {list}
    {footer}
  </>
)

export const Inline: Story = {
  render: () => (
    <Command>
      <CommandInput placeholder="Search events, venues or fans" />
      {list}
    </Command>
  ),
}

export const WithHeaderAndFooter: Story = { render: () => <Command>{palette}</Command> }

export const Empty: Story = {
  render: () => (
    <Command>
      <CommandInput placeholder="Search events" defaultValue="zzz" />
      <CommandList><CommandEmpty>No events match that search.</CommandEmpty></CommandList>
    </Command>
  ),
}

export const Sizes: Story = {
  parameters: { docs: { description: { story: "sm is 384px wide and 300px tall at most, md 512 and 356, lg 576 and 440." } } },
  render: () => (
    <div className="flex flex-col gap-6">
      {(["sm", "md", "lg"] as const).map((s) => (
        <Command key={s} size={s}>
          <CommandInput placeholder={`Size ${s}`} />
          {list}
        </Command>
      ))}
    </div>
  ),
}

const dialogParams = { docs: { story: { inline: false, iframeHeight: 420 } } }

export const InDialog: Story = {
  parameters: dialogParams,
  render: () => <CommandDialog open onOpenChange={() => {}}>{palette}</CommandDialog>,
}

export const BackdropOpaque: Story = {
  parameters: dialogParams,
  render: () => <CommandDialog open onOpenChange={() => {}} backdrop="opaque">{palette}</CommandDialog>,
}
export const BackdropBlur: Story = {
  parameters: dialogParams,
  render: () => <CommandDialog open onOpenChange={() => {}} backdrop="blur">{palette}</CommandDialog>,
}
export const BackdropTransparent: Story = {
  parameters: dialogParams,
  render: () => <CommandDialog open onOpenChange={() => {}} backdrop="transparent">{palette}</CommandDialog>,
}
