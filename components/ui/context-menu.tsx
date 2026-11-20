"use client"

import * as React from "react"
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"
import {
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"

/* A menu that opens where you click. It is the dropdown menu anchored at the pointer, so the popover, rows, sections,
   selection rows, submenus (they open on hover) and separators are the dropdown's, and it grows from the click point.
   Opens on right-click, on a long press (500ms) for touch, and from the keyboard when the trigger is focusable
   (`tabIndex={0}`): Shift+F10 or the Menu key, and Control+Enter on a Mac, open it at the trigger. `open` /
   `defaultOpen` / `onOpenChange` control it, `isDisabled` turns it off (the browser's own menu shows instead). The
   trigger is not focusable by default, so it stays out of the tab order. Selecting an item closes the menu. */
type Point = { x: number; y: number }

type Ctx = {
  disabled: boolean
  openAt: (point: Point) => void
  point: Point
  triggerRef: React.RefObject<HTMLDivElement | null>
}
const ContextMenuContext = React.createContext<Ctx | null>(null)

function useContextMenu() {
  const ctx = React.useContext(ContextMenuContext)
  if (!ctx) throw new Error("ContextMenu parts must be used inside <ContextMenu>")
  return ctx
}

type ContextMenuProps = {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  isDisabled?: boolean
  children?: React.ReactNode
}

function ContextMenu({ open: openProp, defaultOpen = false, onOpenChange, isDisabled = false, children }: ContextMenuProps) {
  const [inner, setInner] = React.useState(defaultOpen)
  const open = openProp ?? inner
  const [point, setPoint] = React.useState<Point>({ x: 0, y: 0 })
  const triggerRef = React.useRef<HTMLDivElement>(null)
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setInner(next)
      onOpenChange?.(next)
    },
    [openProp, onOpenChange]
  )
  const openAt = React.useCallback(
    (p: Point) => {
      if (isDisabled) return
      setPoint(p)
      setOpen(true)
    },
    [isDisabled, setOpen]
  )
  return (
    <ContextMenuContext.Provider value={{ disabled: isDisabled, openAt, point, triggerRef }}>
      <DropdownMenuPrimitive.Root data-slot="context-menu" open={open && !isDisabled} onOpenChange={setOpen}>
        {/* An invisible anchor at the pointer: the menu is positioned against it. */}
        <DropdownMenuPrimitive.Trigger asChild>
          <span aria-hidden="true" data-slot="context-menu-anchor" tabIndex={-1} style={{ position: "fixed", left: point.x, top: point.y, width: 0, height: 0, pointerEvents: "none" }} />
        </DropdownMenuPrimitive.Trigger>
        {children}
      </DropdownMenuPrimitive.Root>
    </ContextMenuContext.Provider>
  )
}

const LONG_PRESS_MS = 500
const LONG_PRESS_SLOP = 10

function ContextMenuTrigger({ className, onContextMenu, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onKeyDown, ...props }: React.ComponentProps<"div">) {
  const { disabled, openAt, triggerRef } = useContextMenu()
  const press = React.useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number } | null>(null)
  const cancel = () => {
    if (press.current) clearTimeout(press.current.timer)
    press.current = null
  }
  React.useEffect(() => cancel, [])
  return (
    <div
      ref={triggerRef}
      data-slot="context-menu-trigger"
      data-disabled={disabled ? "true" : undefined}
      className={cn("relative inline-block [-webkit-touch-callout:none]", className)}
      onContextMenu={(e) => {
        onContextMenu?.(e)
        if (e.defaultPrevented || disabled) return
        e.preventDefault()
        cancel()
        openAt({ x: e.clientX, y: e.clientY })
      }}
      // iOS does not fire contextmenu, so touch and pen open on a long press.
      onPointerDown={(e) => {
        onPointerDown?.(e)
        if (disabled || e.pointerType === "mouse") return
        const { clientX: x, clientY: y } = e
        cancel()
        press.current = { x, y, timer: setTimeout(() => { press.current = null; openAt({ x, y }) }, LONG_PRESS_MS) }
      }}
      onPointerMove={(e) => {
        onPointerMove?.(e)
        const p = press.current
        if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > LONG_PRESS_SLOP) cancel()
      }}
      onPointerUp={(e) => { onPointerUp?.(e); cancel() }}
      onPointerCancel={(e) => { onPointerCancel?.(e); cancel() }}
      onKeyDown={(e) => {
        onKeyDown?.(e)
        if (e.defaultPrevented || disabled || e.target !== e.currentTarget) return
        const shiftF10 = e.shiftKey && e.key === "F10"
        const menuKey = e.key === "ContextMenu"
        const ctrlEnter = e.ctrlKey && e.key === "Enter"
        if (shiftF10 || menuKey || ctrlEnter) {
          e.preventDefault()
          const r = e.currentTarget.getBoundingClientRect()
          openAt({ x: r.left + 8, y: r.top + 8 })
        }
      }}
      {...props}
    />
  )
}

function ContextMenuContent({
  className,
  offset = 2,
  side = "bottom",
  align = "start",
  onCloseAutoFocus,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent> & {
  /** Distance from the click point in pixels. */
  offset?: number
}) {
  const { triggerRef } = useContextMenu()
  return (
    <DropdownMenuContent
      data-slot="context-menu-content"
      side={side}
      align={align}
      sideOffset={offset}
      collisionPadding={8}
      className={cn("z-50 outline-none data-[focus-visible=true]:outline-none motion-reduce:animate-none", className)}
      onCloseAutoFocus={(e) => {
        onCloseAutoFocus?.(e)
        if (e.defaultPrevented) return
        // Give focus back to the trigger when it can take it; the invisible anchor must not.
        e.preventDefault()
        const t = triggerRef.current
        if (t && t.tabIndex >= 0) t.focus()
      }}
      {...props}
    />
  )
}

/* The rows, sections and submenus are the dropdown's. */
const ContextMenuItem = DropdownMenuItem
const ContextMenuCheckboxItem = DropdownMenuCheckboxItem
const ContextMenuRadioGroup = DropdownMenuRadioGroup
const ContextMenuRadioItem = DropdownMenuRadioItem
const ContextMenuLabel = DropdownMenuLabel
const ContextMenuSeparator = DropdownMenuSeparator
const ContextMenuShortcut = DropdownMenuShortcut
const ContextMenuGroup = DropdownMenuGroup
const ContextMenuPortal = DropdownMenuPortal
const ContextMenuSub = DropdownMenuSub
const ContextMenuSubTrigger = DropdownMenuSubTrigger
const ContextMenuSubContent = DropdownMenuSubContent

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
}
export type { ContextMenuProps }
