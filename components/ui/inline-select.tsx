"use client"

import * as React from "react"
import { Select } from "@base-ui/react/select"
import { CaretUpDown, Check } from "@phosphor-icons/react"

import { menuPopover, menuRow, menuRowState } from "@/lib/menu-item"
import { cn } from "@/lib/utils"

function InlineSelect<Value, Multiple extends boolean | undefined = false>(
  props: Select.Root.Props<Value, Multiple>
) {
  return <Select.Root modal={false} {...props} />
}

function InlineSelectTrigger({ className, ...props }: Omit<Select.Trigger.Props, "className"> & {
  className?: string
}) {
  return (
    <Select.Trigger
      data-slot="inline-select-trigger"
      className={cn(
        "inline-flex max-w-full cursor-pointer items-center gap-2 rounded-[6px] px-1 py-0.5 text-sm leading-5 font-normal text-h-muted align-baseline outline-none h-no-highlight",
        "transition-colors duration-150 hover:text-h-foreground focus-visible:h-focus-field-ring disabled:h-status-disabled motion-reduce:transition-none",
        className
      )}
      {...props}
    />
  )
}

function InlineSelectValue({ className, ...props }: Omit<Select.Value.Props, "className"> & {
  className?: string
}) {
  return (
    <Select.Value
      data-slot="inline-select-value"
      className={cn("min-w-0 max-w-48 truncate", className)}
      {...props}
    />
  )
}

function InlineSelectIndicator({ className, children, ...props }: React.ComponentProps<"span">) {
  return (
    <Select.Icon
      data-slot="inline-select-indicator"
      aria-hidden="true"
      className={cn("inline-flex size-3 shrink-0 items-center justify-center [&_svg]:size-full", className)}
      {...props}
    >
      {children ?? <CaretUpDown weight="bold" />}
    </Select.Icon>
  )
}

type InlineSelectPopoverProps = Pick<Select.Positioner.Props, "side" | "align" | "sideOffset"> & {
  children: React.ReactNode
  className?: string
}

function InlineSelectPopover({ side = "bottom", align = "end", sideOffset = 6, className, children }: InlineSelectPopoverProps) {
  return (
    <Select.Portal>
      <Select.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={12}
        alignItemWithTrigger={false}
        className="z-50"
      >
        <Select.Popup
          data-slot="inline-select-popover"
          className={cn(
            menuPopover,
            "[min-width:min(7.5rem,var(--available-width))] max-h-(--available-height) max-w-[min(var(--available-width),calc(100svw-1.5rem))] origin-(--transform-origin)",
            "transition-[opacity,scale] duration-150 ease-out data-starting-style:scale-90 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-100 motion-reduce:transition-none",
            className
          )}
        >
          <Select.List className="flex flex-col gap-0.5">{children}</Select.List>
        </Select.Popup>
      </Select.Positioner>
    </Select.Portal>
  )
}

function InlineSelectItem({ className, children, ...props }: Omit<Select.Item.Props, "className"> & {
  className?: string
}) {
  return (
    <Select.Item
      data-slot="inline-select-item"
      className={cn(menuRow, menuRowState, "pe-8", className)}
      {...props}
    >
      <Select.ItemText className="flex min-w-0 items-center gap-3">{children}</Select.ItemText>
      <Select.ItemIndicator className="pointer-events-none absolute end-2.5 flex items-center text-h-foreground">
        <Check weight="bold" className="size-3" />
      </Select.ItemIndicator>
    </Select.Item>
  )
}

export { InlineSelect, InlineSelectTrigger, InlineSelectValue, InlineSelectIndicator, InlineSelectPopover, InlineSelectItem }
