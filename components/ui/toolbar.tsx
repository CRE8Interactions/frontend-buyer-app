"use client"

import * as React from "react"
import { Toolbar as ToolbarPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

/* Copied from the reference toolbar.css. A row (or column) of related controls that behaves as one tab stop: Tab enters
   the toolbar once and the arrow keys move between its buttons (Home and End jump to the ends). Items are spaced 8px
   apart; separators inside are half the toolbar's height. `variant="attached"` puts the toolbar on a surface pill: 24px
   corners, 4px padding and the overlay shadow, for a floating bar of actions. */
type ToolbarProps = React.ComponentProps<typeof ToolbarPrimitive.Root> & { variant?: "default" | "attached" }

function Toolbar({ className, orientation = "horizontal", variant = "default", ...props }: ToolbarProps) {
  return (
    <ToolbarPrimitive.Root
      data-slot="toolbar"
      data-variant={variant}
      orientation={orientation}
      className={cn(
        "grid w-fit items-center gap-2",
        orientation === "vertical" ? "grid-flow-row items-start justify-start" : "grid-flow-col",
        variant === "attached" && "rounded-[24px] bg-h-surface p-1 shadow-h-overlay",
        "[&>[data-orientation=vertical][role=separator]]:h-1/2 [&>[data-orientation=vertical][role=separator]]:self-center",
        "[&>[data-orientation=horizontal][role=separator]]:w-1/2 [&>[data-orientation=horizontal][role=separator]]:justify-self-center",
        className
      )}
      {...props}
    />
  )
}

/** A control in the toolbar. Wrap a Button (asChild) to join the arrow-key navigation. */
function ToolbarItem({ ...props }: React.ComponentProps<typeof ToolbarPrimitive.Button>) {
  return <ToolbarPrimitive.Button data-slot="toolbar-item" {...props} />
}

function ToolbarSeparator({ className, orientation, ...props }: React.ComponentProps<typeof ToolbarPrimitive.Separator>) {
  return (
    <ToolbarPrimitive.Separator
      data-slot="toolbar-separator"
      className={cn("shrink-0 bg-h-separator data-[orientation=horizontal]:h-px data-[orientation=vertical]:w-px", className)}
      {...props}
    />
  )
}

export { Toolbar, ToolbarItem, ToolbarSeparator }
