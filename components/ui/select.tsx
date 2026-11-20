"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { menuRow, menuRowState, menuPopover, menuSeparator, menuLabel } from "@/lib/menu-item"
import { Check, CaretDown, CaretUp } from "@phosphor-icons/react"
import { Select as SelectPrimitive } from "radix-ui"

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
  className,
  size = "default",
  variant = "primary",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "md" | "lg" | "default"
  /** `secondary` drops the outline and uses the secondary fill, for use on a surface. */
  variant?: "primary" | "secondary"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-fit items-center justify-between gap-2 rounded-[12px] border-0 bg-h-field px-3 py-2 text-sm whitespace-nowrap text-h-field-foreground shadow-[var(--h-field-outline)] transition-[background-color,box-shadow] duration-150 outline-none hover:bg-h-field-hover focus-visible:bg-h-field-focus focus-visible:shadow-[0_0_0_2px_var(--h-focus)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:shadow-[0_0_0_1px_var(--h-danger)] aria-invalid:focus-visible:shadow-[0_0_0_2px_var(--h-danger)] data-[placeholder]:text-h-field-placeholder data-[size=default]:h-10 md:data-[size=default]:h-9 data-[size=md]:h-10 md:data-[size=md]:h-9 data-[size=sm]:h-9 md:data-[size=sm]:h-8 data-[size=lg]:h-12 md:data-[size=lg]:h-11 data-[size=lg]:px-4 data-[size=lg]:text-lg *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
        variant === "secondary" && "bg-(--h-field-secondary) shadow-none hover:bg-(--h-field-secondary-hover) focus-visible:bg-(--h-field-secondary) focus-visible:shadow-[0_0_0_2px_var(--h-focus)] aria-invalid:shadow-[0_0_0_1px_var(--h-danger)]",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <CaretDown className="size-4 opacity-50" weight="bold" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  position = "item-aligned",
  align = "center",
  container,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content> & {
  /** Where the list opens in the DOM (default: the document body). A shadow root host passes an element inside the root. */
  container?: HTMLElement | null
}) {
  return (
    <SelectPrimitive.Portal container={container}>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          menuPopover, "relative max-h-(--radix-select-content-available-height) origin-(--radix-select-content-transform-origin) p-0",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        align={align}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "flex flex-col gap-0.5 p-1.5",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1"
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn(menuLabel, className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        menuRow, menuRowState, "pe-8 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      )}
      {...props}
    >
      <span
        data-slot="select-item-indicator"
        className="absolute end-2.5 flex size-4 items-center justify-center"
      >
        <SelectPrimitive.ItemIndicator>
          <Check weight="bold" className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("pointer-events-none", menuSeparator, className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <CaretUp className="size-4" weight="bold" />
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <CaretDown className="size-4" weight="bold" />
    </SelectPrimitive.ScrollDownButton>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
