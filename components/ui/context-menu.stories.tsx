import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Copy, Export, PencilSimple, Scissors, ShareNetwork, Trash } from "@phosphor-icons/react"
import { Button } from "./button"
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "./context-menu"

const meta = {
  title: "Navigation & menus/Context menu",
  id: "molecules-context-menu",
  component: ContextMenu,
  tags: ["autodocs", "new"],
  parameters: { docs: { story: { inline: false, iframeHeight: 420 }, description: { component: "A menu that opens where you click: it is the dropdown menu anchored at the pointer, so the popover, rows, sections, selection rows and submenus are the dropdown's, and it grows from the click point. Opens on right-click, on a long press for touch (iOS sends no context-menu event), and from the keyboard when the trigger is focusable. `open`, `defaultOpen` and `onOpenChange` control it; `isDisabled` turns it off. Each story opens itself so you can see it." } } },
} satisfies Meta<typeof ContextMenu>
export default meta
type Story = StoryObj<typeof meta>

const zoneClass = "flex h-40 w-80 items-center justify-center rounded-[16px] bg-h-default text-sm text-h-muted outline-none focus-visible:h-focus-ring"

/** Fires a right-click in the middle-left of the zone, so the story opens its menu. */
const rightClick = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  const el = canvasElement.querySelector("[data-slot=context-menu-trigger]")
  const r = el?.getBoundingClientRect()
  el?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: (r?.left ?? 0) + 60, clientY: (r?.top ?? 0) + 50 }))
}

export const Default: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className={zoneClass}>Right-click this seat row</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuLabel>Row F, seat 12</ContextMenuLabel>
        <ContextMenuItem>Hold seat <ContextMenuShortcut>H</ContextMenuShortcut></ContextMenuItem>
        <ContextMenuItem>Release seat</ContextMenuItem>
        <ContextMenuItem disabled>Move seat</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="danger">Remove seat</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
  play: rightClick,
}

export const Controlled: Story = {
  parameters: { docs: { description: { story: "Open state is yours: buttons open and close it, and `onOpenChange` keeps your state in step when a click outside or Escape closes it." } } },
  render: () => {
    const [open, setOpen] = React.useState(false)
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="tertiary" onClick={() => setOpen(true)}>Open</Button>
          <Button size="sm" variant="tertiary" onClick={() => setOpen(false)}>Close</Button>
          <span className="text-sm text-h-muted">Menu is {open ? "open" : "closed"}</span>
        </div>
        <ContextMenu open={open} onOpenChange={setOpen}>
          <ContextMenuTrigger className={zoneClass}>Right-click here, or use the buttons</ContextMenuTrigger>
          <ContextMenuContent className="w-56">
            <ContextMenuItem>Hold seat</ContextMenuItem>
            <ContextMenuItem>Release seat</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>
    )
  },
}

export const Disabled: Story = {
  parameters: { docs: { description: { story: "`isDisabled`: nothing opens, and the browser's own menu shows instead." } } },
  render: () => (
    <ContextMenu isDisabled>
      <ContextMenuTrigger className={zoneClass}>Right-click does nothing here</ContextMenuTrigger>
      <ContextMenuContent className="w-56"><ContextMenuItem>Hold seat</ContextMenuItem></ContextMenuContent>
    </ContextMenu>
  ),
}

export const LongPress: Story = {
  parameters: { docs: { description: { story: "On touch the menu opens after a 500ms press that stays within 10px; moving or lifting sooner cancels it. The story simulates a touch press." } } },
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className={zoneClass}>Press and hold (touch)</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem>Hold seat</ContextMenuItem>
        <ContextMenuItem>Release seat</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector("[data-slot=context-menu-trigger]")
    const r = el?.getBoundingClientRect()
    el?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch", clientX: (r?.left ?? 0) + 60, clientY: (r?.top ?? 0) + 50 }))
  },
}

export const Keyboard: Story = {
  parameters: { docs: { description: { story: "The trigger is not focusable by default. Give it `tabIndex={0}` and Shift+F10, the Menu key (or Control+Enter on a Mac) opens the menu at the trigger; closing returns focus to it." } } },
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger tabIndex={0} className={zoneClass}>Focus me, then press Shift+F10</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem>Hold seat</ContextMenuItem>
        <ContextMenuItem>Release seat</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector<HTMLElement>("[data-slot=context-menu-trigger]")
    el?.focus()
    el?.dispatchEvent(new KeyboardEvent("keydown", { key: "F10", shiftKey: true, bubbles: true, cancelable: true }))
  },
}

export const WithSections: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className={zoneClass}>Right-click this ticket</ContextMenuTrigger>
      <ContextMenuContent className="w-60">
        <ContextMenuGroup>
          <ContextMenuLabel>Edit</ContextMenuLabel>
          <ContextMenuItem icon={<PencilSimple weight="bold" />} shortcut="⌘E">Rename</ContextMenuItem>
          <ContextMenuItem icon={<Copy weight="bold" />} shortcut="⌘C">Copy link</ContextMenuItem>
          <ContextMenuItem icon={<Scissors weight="bold" />} shortcut="⌘X">Cut</ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuLabel>Share</ContextMenuLabel>
          <ContextMenuItem icon={<ShareNetwork weight="bold" />} description="Send to someone with a link">Share ticket</ContextMenuItem>
          <ContextMenuItem icon={<Export weight="bold" />}>Export PDF</ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuItem icon={<Trash weight="bold" />} variant="danger" shortcut="⌫">Delete</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
  play: rightClick,
}

export const WithSelection: Story = {
  parameters: { docs: { description: { story: "Checkbox rows toggle on their own; radio rows pick one. A menu that should stay open while choosing prevents the default in `onSelect`." } } },
  render: () => {
    const [showSeats, setShowSeats] = React.useState(true)
    const [showPrices, setShowPrices] = React.useState(false)
    const [sort, setSort] = React.useState("price")
    return (
      <ContextMenu>
        <ContextMenuTrigger className={zoneClass}>Right-click the seat map</ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuLabel>Show</ContextMenuLabel>
          <ContextMenuCheckboxItem checked={showSeats} onCheckedChange={setShowSeats} onSelect={(e) => e.preventDefault()}>Seat numbers</ContextMenuCheckboxItem>
          <ContextMenuCheckboxItem checked={showPrices} onCheckedChange={setShowPrices} onSelect={(e) => e.preventDefault()}>Prices</ContextMenuCheckboxItem>
          <ContextMenuSeparator />
          <ContextMenuLabel>Sort by</ContextMenuLabel>
          <ContextMenuRadioGroup value={sort} onValueChange={setSort}>
            <ContextMenuRadioItem value="price" onSelect={(e) => e.preventDefault()}>Price</ContextMenuRadioItem>
            <ContextMenuRadioItem value="row" onSelect={(e) => e.preventDefault()}>Row</ContextMenuRadioItem>
            <ContextMenuRadioItem value="view" onSelect={(e) => e.preventDefault()}>View quality</ContextMenuRadioItem>
          </ContextMenuRadioGroup>
        </ContextMenuContent>
      </ContextMenu>
    )
  },
  play: rightClick,
}

export const WithSubmenus: Story = {
  parameters: { docs: { description: { story: "Submenus open on hover or with the right arrow, and nest." } } },
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className={zoneClass}>Right-click this seat row</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem>Hold seat</ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>Move to section</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem>Section 104</ContextMenuItem>
            <ContextMenuItem>Section 105</ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger>Upper level</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem>Section 204</ContextMenuItem>
                <ContextMenuItem>Section 205</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem variant="danger">Remove seat</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
  play: rightClick,
}
