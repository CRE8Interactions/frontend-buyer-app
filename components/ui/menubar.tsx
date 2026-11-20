"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { menuRow, menuRowState, menuRowIndicator, menuPopover, menuSeparator, menuLabel, menuShortcut } from "@/lib/menu-item"
import { CaretRight, Check, Circle } from "@phosphor-icons/react"
import { Menubar as MenubarPrimitive } from "radix-ui"

function Menubar({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Root>) {
  return (
    <MenubarPrimitive.Root
      data-slot="menubar"
      className={cn(
        "flex w-fit items-center gap-1 rounded-[24px] bg-h-surface p-1 shadow-h-overlay",
        className
      )}
      {...props}
    />
  )
}

function MenubarMenu({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Menu>) {
  return <MenubarPrimitive.Menu data-slot="menubar-menu" {...props} />
}

function MenubarGroup({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Group>) {
  return <MenubarPrimitive.Group data-slot="menubar-group" {...props} />
}

function MenubarPortal({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Portal>) {
  return <MenubarPrimitive.Portal data-slot="menubar-portal" {...props} />
}

function MenubarRadioGroup({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.RadioGroup>) {
  return (
    <MenubarPrimitive.RadioGroup data-slot="menubar-radio-group" {...props} />
  )
}

function MenubarTrigger({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Trigger>) {
  return (
    <MenubarPrimitive.Trigger
      data-slot="menubar-trigger"
      className={cn(
        "flex h-8 items-center rounded-full px-3 text-sm font-medium text-h-foreground outline-none select-none h-no-highlight [transition:background-color_100ms_var(--e-out),box-shadow_150ms_var(--e-out)] motion-reduce:[transition:none] data-[highlighted]:bg-h-default data-[state=open]:bg-h-default [@media(hover:hover)]:hover:bg-h-default focus-visible:h-focus-ring",
        className
      )}
      {...props}
    />
  )
}

function MenubarContent({
  className,
  align = "start",
  alignOffset = -4,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Content>) {
  return (
    <MenubarPortal>
      <MenubarPrimitive.Content
        data-slot="menubar-content"
        align={align}
        alignOffset={alignOffset}
        sideOffset={sideOffset}
        className={cn(
          menuPopover, "max-h-(--radix-menubar-content-available-height) origin-(--radix-menubar-content-transform-origin)",
          className
        )}
        {...props}
      />
    </MenubarPortal>
  )
}

function MenubarItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Item> & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  return (
    <MenubarPrimitive.Item
      data-slot="menubar-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        menuRow, menuRowState, "data-[inset]:ps-7 data-[variant=destructive]:text-h-danger-soft-foreground data-[variant=destructive]:data-[highlighted]:bg-h-danger-soft data-[variant=destructive]:[&_svg:not([class*='text-'])]:text-h-danger-soft-foreground",
        className
      )}
      {...props}
    />
  )
}

function MenubarCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.CheckboxItem>) {
  return (
    <MenubarPrimitive.CheckboxItem
      data-slot="menubar-checkbox-item"
      className={cn(
        menuRow, menuRowState, "ps-7",
        className
      )}
      checked={checked}
      {...props}
    >
      <span className={menuRowIndicator}>
        <MenubarPrimitive.ItemIndicator>
          <Check className="size-2.5" weight="bold" />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.CheckboxItem>
  )
}

function MenubarRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.RadioItem>) {
  return (
    <MenubarPrimitive.RadioItem
      data-slot="menubar-radio-item"
      className={cn(
        menuRow, menuRowState, "ps-7",
        className
      )}
      {...props}
    >
      <span className={menuRowIndicator}>
        <MenubarPrimitive.ItemIndicator>
          <Circle className="size-2 fill-current" />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.RadioItem>
  )
}

function MenubarLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Label> & {
  inset?: boolean
}) {
  return (
    <MenubarPrimitive.Label
      data-slot="menubar-label"
      data-inset={inset}
      className={cn(
        menuLabel,
        className
      )}
      {...props}
    />
  )
}

function MenubarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Separator>) {
  return (
    <MenubarPrimitive.Separator
      data-slot="menubar-separator"
      className={cn(menuSeparator, className)}
      {...props}
    />
  )
}

function MenubarShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="menubar-shortcut"
      className={cn(
        menuShortcut,
        className
      )}
      {...props}
    />
  )
}

function MenubarSub({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Sub>) {
  return <MenubarPrimitive.Sub data-slot="menubar-sub" {...props} />
}

function MenubarSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.SubTrigger> & {
  inset?: boolean
}) {
  return (
    <MenubarPrimitive.SubTrigger
      data-slot="menubar-sub-trigger"
      data-inset={inset}
      className={cn(
        menuRow, menuRowState, "data-[inset]:ps-7 data-[state=open]:bg-h-default",
        className
      )}
      {...props}
    >
      {children}
      <CaretRight className="size-4 ml-auto h-4 w-4" weight="bold" />
    </MenubarPrimitive.SubTrigger>
  )
}

function MenubarSubContent({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.SubContent>) {
  /* Portaled so the frosted parent panel (backdrop-filter) cannot trap or clip the fixed-position submenu. */
  return (
    <MenubarPortal>
      <MenubarPrimitive.SubContent
        data-slot="menubar-sub-content"
        className={cn(
          menuPopover, "max-h-(--radix-menubar-content-available-height) origin-(--radix-menubar-content-transform-origin)",
          className
        )}
        {...props}
      />
    </MenubarPortal>
  )
}

export {
  Menubar,
  MenubarPortal,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarGroup,
  MenubarSeparator,
  MenubarLabel,
  MenubarItem,
  MenubarShortcut,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
}
