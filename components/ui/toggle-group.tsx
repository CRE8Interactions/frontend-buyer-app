"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"

import { toggleVariants } from "@/components/ui/toggle"

type Ctx = VariantProps<typeof toggleVariants> & { detached?: boolean; separator?: boolean; orientation?: "horizontal" | "vertical" }
const ToggleGroupContext = React.createContext<Ctx>({ size: "md", variant: "default", detached: false, separator: true, orientation: "horizontal" })

/* From the reference toggle-button-group. Attached (default): no gap, pill outer ends, square inner corners,
   no press scale, inset focus ring, 1px separator at 25%..75% height in the item's text colour at 15%.
   detached (or legacy spacing > 0): gap-1, every item a full pill. */
const toggleGroupVariants = cva("group/toggle-group inline-flex h-auto w-fit items-center justify-center gap-0", {
  variants: {
    orientation: { horizontal: "flex-row", vertical: "flex-col" },
    /* attached: square inner corners, no press transform, an inset focus ring. detached: a gap and every item a full pill. */
    detached: {
      true: "gap-1",
      false: [
    "[&>[data-slot=toggle-group-item]]:rounded-none",
    "[&>[data-slot=toggle-group-item]:active]:[transform:none] [&>[data-slot=toggle-group-item][data-pressed=true]]:[transform:none]",
    "[&>[data-slot=toggle-group-item]:focus-visible]:[box-shadow:inset_0_0_0_2px_var(--h-focus)] [&>[data-slot=toggle-group-item][data-focus-visible=true]]:[box-shadow:inset_0_0_0_2px_var(--h-focus)]",
  ].join(" "),
    },
    fullWidth: { true: "w-full [&>*]:flex-1", false: "" },
  },
  compoundVariants: [
    { orientation: "horizontal", detached: false, class: [
    "[&>[data-slot=toggle-group-item]:first-child]:rounded-s-[36px]",
    "[&>[data-slot=toggle-group-item]:last-child]:rounded-e-[36px]",
    "[&>[data-slot=toggle-group-item]:first-child:last-child]:rounded-[36px]",
  ].join(" ") },
    { orientation: "vertical", detached: false, class: [
    "[&>[data-slot=toggle-group-item]:first-child]:rounded-t-[36px]",
    "[&>[data-slot=toggle-group-item]:last-child]:rounded-b-[36px]",
    "[&>[data-slot=toggle-group-item]:first-child:last-child]:rounded-[36px]",
  ].join(" ") },
  ],
  defaultVariants: { orientation: "horizontal", detached: false, fullWidth: false },
})

/* 1px line inside each item (none in the first): 25%..75% of the height in the item's text colour at 15%. */
const separator = [
  "pointer-events-none absolute rounded-[8px] bg-current opacity-15 transition-opacity duration-150",
  "group-data-[orientation=horizontal]/toggle-group:-start-px group-data-[orientation=horizontal]/toggle-group:top-1/4 group-data-[orientation=horizontal]/toggle-group:h-1/2 group-data-[orientation=horizontal]/toggle-group:w-px",
  "group-data-[orientation=vertical]/toggle-group:start-1/4 group-data-[orientation=vertical]/toggle-group:-top-px group-data-[orientation=vertical]/toggle-group:h-px group-data-[orientation=vertical]/toggle-group:w-1/2",
  "[[data-slot=toggle-group-item]:first-child>&]:hidden",
].join(" ")

/* Neutral tone: a plain lighter selected pill (HeroUI chrome) instead of the accent tint. */
const neutral = [
  "[&>[data-slot=toggle-group-item]]:[--toggle-button-bg-selected:var(--h-neutral-selected)]",
  "[&>[data-slot=toggle-group-item]]:[--toggle-button-bg-selected-hover:var(--h-neutral-selected-hover)]",
  "[&>[data-slot=toggle-group-item]]:[--toggle-button-bg-selected-pressed:var(--h-neutral-selected-hover)]",
  "[&>[data-slot=toggle-group-item]]:[--toggle-button-fg-selected:var(--h-neutral-selected-foreground)]",
].join(" ")

function ToggleGroup({
  className,
  variant,
  size,
  spacing = 0,
  detached,
  fullWidth = false,
  separator = true,
  tone = "accent",
  disallowEmptySelection = false,
  orientation = "horizontal",
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
  VariantProps<typeof toggleVariants> & {
    spacing?: number
    detached?: boolean
    /** Colour of the selected item: the theme accent (default) or a neutral lighter pill, as in docs chrome. */
    tone?: "accent" | "neutral"
    /** Show the thin divider between attached items (default true). */
    separator?: boolean
    /** Single mode only: clicking the selected item does not clear it. */
    disallowEmptySelection?: boolean
    fullWidth?: boolean
    orientation?: "horizontal" | "vertical"
  }) {
  const isDetached = detached ?? spacing > 0
  const rootProps = (disallowEmptySelection && props.type === "single"
    ? { ...props, onValueChange: (value: string) => { if (value) props.onValueChange?.(value) } }
    : props) as React.ComponentProps<typeof ToggleGroupPrimitive.Root>
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-detached={isDetached}
      data-orientation={orientation}
      data-tone={tone}
      className={cn(toggleGroupVariants({ orientation, detached: isDetached, fullWidth }), tone === "neutral" && neutral, className)}
      {...rootProps}
    >
      <ToggleGroupContext.Provider value={{ variant, size, detached: isDetached, separator, orientation }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  )
}

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  iconOnly,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> & VariantProps<typeof toggleVariants>) {
  const ctx = React.useContext(ToggleGroupContext)
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={ctx.variant || variant}
      data-size={ctx.size || size}
      className={cn(
        toggleVariants({ variant: ctx.variant || variant, size: ctx.size || size, iconOnly }),
        className
      )}
      {...props}
    >
      {!ctx.detached && ctx.separator ? (
        <span aria-hidden className={separator} />
      ) : null}
      {children}
    </ToggleGroupPrimitive.Item>
  )
}

export { ToggleGroup, ToggleGroupItem }
