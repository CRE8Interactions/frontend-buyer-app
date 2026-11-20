"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { menuRow, menuRowState } from "@/lib/menu-item"
import { CaretRight, Check } from "@phosphor-icons/react"
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui"
import { Kbd } from "./kbd"

/* Copied from the reference dropdown.css, menu.css and menu-item.css.
   Popover: the overlay fill, 22px corners, the overlay shadow, at least 220px wide (never wider than the screen minus
   2rem), 6px of padding, and a 6px-gap column of items; it opens from the trigger with a 150ms scale-and-fade from 90%
   and closes in 100ms. Item: at least 36px tall, 16px corners, 10px side padding, a 12px gap between its parts, a
   `default` fill on hover and keyboard highlight, pressed scale 0.98 (250ms), focus ring from the keyboard, disabled dims.
   Selection indicator at the start (checkbox: a 10px check, radio: an 8px dot that scales in); the item gains 28px of
   start padding to make room. Submenu rows end in a 12px chevron. Separators span 94% of the width, centred. `danger`
   items colour the label and indicator red. Sections have a small muted header. A row can take an `icon` (16px, lined up with the first line), a `description` under the label and a `shortcut` at the end, centred on the row; the description lines up with the label text, not with the icon. */
function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return (
    <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
  )
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...props}
    />
  )
}

const popoverBase =
  "z-50 max-h-(--radix-dropdown-menu-content-available-height) origin-(--radix-dropdown-menu-content-transform-origin) scroll-py-1 overflow-x-hidden overflow-y-auto overscroll-contain rounded-[22px] glass p-0 text-sm text-h-foreground shadow-none [min-width:min(13.75rem,100%,calc(100svw-2rem))] max-w-[min(100%,calc(100svw-2rem))] outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-90 data-[state=open]:duration-150 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-100 motion-reduce:animate-none"

/* the column inside the popover: 6px padding, 2px between items, separators 94% wide and centred */
const menuColumn = "relative flex w-full flex-col gap-0.5 overflow-clip p-1.5 [&_[data-slot=dropdown-menu-separator]]:ms-[3%] [&_[data-slot=dropdown-menu-separator]]:w-[94%]"

function DropdownMenuContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(popoverBase, className)}
        {...props}
      >
        <div data-slot="dropdown-menu-list" className={menuColumn}>{children}</div>
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  )
}

function DropdownMenuGroup({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return (
    <DropdownMenuPrimitive.Group
      data-slot="dropdown-menu-group"
      className={cn("flex flex-col items-start gap-0", className)}
      {...props}
    />
  )
}

/** The item box shared by every kind of row. */
const itemBase = cn(menuRow, menuRowState)

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  description,
  icon,
  shortcut,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  /** Leaves room at the start, so the label lines up with rows that have an indicator. */
  inset?: boolean
  variant?: "default" | "danger" | "destructive"
  /** A second, muted line under the label. */
  description?: React.ReactNode
  /** An icon at the start of the row. With a description it lines up with the first line. */
  icon?: React.ReactNode
  /** A keyboard hint at the end of the row, centred on the whole row (for example ⌘N). */
  shortcut?: React.ReactNode
}) {
  const danger = variant === "danger" || variant === "destructive"
  const structured = description != null || icon != null || shortcut != null
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={danger ? "danger" : "default"}
      data-has-description={description != null ? "true" : undefined}
      className={cn(
        itemBase,
        "data-[inset]:ps-7 data-[has-description=true]:items-start data-[has-description=true]:py-2",
        danger && "text-h-danger-soft-foreground data-[highlighted]:bg-h-danger-soft [&_svg:not([class*='text-'])]:text-h-danger-soft-foreground",
        className
      )}
      {...props}
    >
      {structured ? (
        <>
          {icon != null ? (
            <span data-slot="icon" className={cn("flex size-4 shrink-0 items-center justify-center", description != null && "mt-0.5")}>{icon}</span>
          ) : null}
          <span className="flex min-w-0 flex-col">
            <span data-slot="label" className="pointer-events-none select-none">{children}</span>
            {description != null ? <span data-slot="description" className="pointer-events-none text-xs text-wrap text-h-muted select-none">{description}</span> : null}
          </span>
          {shortcut != null ? <DropdownMenuShortcut className="self-center">{shortcut}</DropdownMenuShortcut> : null}
        </>
      ) : (
        children
      )}
    </DropdownMenuPrimitive.Item>
  )
}

/* The indicator box at the start of a selectable row: absolute, 16px, muted. */
const indicatorBox = "pointer-events-none absolute start-2 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center text-h-muted"

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(itemBase, "ps-7", className)}
      checked={checked}
      {...props}
    >
      <span className={indicatorBox}>
        <DropdownMenuPrimitive.ItemIndicator forceMount>
          <Check
            weight="bold"
            className="size-2.5 [transition:transform_200ms_var(--e-out),opacity_200ms_var(--e-out)] group-data-[state=unchecked]/item:scale-50 group-data-[state=unchecked]/item:opacity-0 motion-reduce:[transition:none]"
          />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return (
    <DropdownMenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(itemBase, "ps-7", className)}
      {...props}
    >
      <span className={indicatorBox}>
        <DropdownMenuPrimitive.ItemIndicator forceMount>
          <span className="block size-2 rounded-full bg-current [transition:transform_250ms_var(--e-out),opacity_250ms_var(--e-out)] group-data-[state=unchecked]/item:scale-70 group-data-[state=unchecked]/item:opacity-0 motion-reduce:[transition:none]" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
}

/** A section header: small, muted, aligned with the item labels. */
function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn("w-full px-2.5 pt-1.5 pb-1 text-xs font-medium text-h-muted select-none data-[inset]:ps-7", className)}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("my-0.5 h-px shrink-0 bg-h-separator", className)}
      {...props}
    />
  )
}

/** A keyboard hint at the end of a row, such as ⌘K. Uses our Kbd without its box: each key sits apart in muted text. */
function DropdownMenuShortcut({
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Kbd>, "keys" | "variant"> & { children?: React.ReactNode }) {
  return (
    <Kbd
      variant="light"
      data-slot="dropdown-menu-shortcut"
      keys={typeof children === "string" ? children : undefined}
      className={cn("pointer-events-none ms-auto -me-1 ps-3 select-none", className)}
      {...props}
    >
      {typeof children === "string" ? undefined : children}
    </Kbd>
  )
}

function DropdownMenuSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(itemBase, "pe-7 data-[inset]:ps-7 data-[state=open]:bg-h-default", className)}
      {...props}
    >
      {children}
      <span data-slot="submenu-indicator" className="pointer-events-none absolute end-2 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center text-h-muted">
        <CaretRight weight="bold" className="size-3" />
      </span>
    </DropdownMenuPrimitive.SubTrigger>
  )
}

function DropdownMenuSubContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  /* Portaled: the parent panel is frosted (backdrop-filter), which would otherwise trap and clip a position:fixed submenu inside it. */
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.SubContent
        data-slot="dropdown-menu-sub-content"
        className={cn(popoverBase, className)}
        {...props}
      >
        <div data-slot="dropdown-menu-list" className={menuColumn}>{children}</div>
      </DropdownMenuPrimitive.SubContent>
    </DropdownMenuPrimitive.Portal>
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
