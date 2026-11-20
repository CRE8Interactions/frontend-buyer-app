"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Toggle as TogglePrimitive } from "radix-ui"

/* Unselected: default surface; selected: accent-soft with accent-soft foreground, the accent marking the active item (data-[state=on] replaces data-selected).
   Same size/radius/transition as the button. Colours flow through --toggle-button-* custom properties. */
const layout = [
  "relative isolate inline-flex h-10 w-fit origin-center items-center justify-center gap-2 rounded-[36px] px-4 md:h-9",
  "text-sm font-medium whitespace-nowrap",
  "cursor-pointer outline-none select-none h-no-highlight transform-gpu",
].join(" ")
const motion = "[transition:transform_250ms_ease,background-color_100ms_var(--e-out),box-shadow_100ms_var(--e-out)] motion-reduce:[transition:none]"
const colour = [
  "[--toggle-button-bg:color-mix(in_oklab,var(--h-default)_55%,transparent)] [--toggle-button-bg-hover:var(--h-default)] [--toggle-button-bg-pressed:var(--h-default)] [--toggle-button-fg:currentColor]",
  "[--toggle-button-bg-selected:var(--h-accent-selected)] [--toggle-button-bg-selected-hover:var(--h-accent-selected-hover)] [--toggle-button-bg-selected-pressed:var(--h-accent-selected-hover)] [--toggle-button-fg-selected:var(--h-accent-soft-foreground)]",
  "bg-(color:--toggle-button-bg) text-(color:--toggle-button-fg)",
].join(" ")
const states = [
  "[@media(hover:hover)]:hover:bg-(color:--toggle-button-bg-hover) [@media(hover:hover)]:data-[hovered=true]:bg-(color:--toggle-button-bg-hover)",
  "active:scale-[0.97] active:bg-(color:--toggle-button-bg-pressed) active:[transform:scale(0.97)]",
  "data-[pressed=true]:scale-[0.97] data-[pressed=true]:bg-(color:--toggle-button-bg-pressed) data-[pressed=true]:[transform:scale(0.97)]",
  "data-[state=on]:bg-(color:--toggle-button-bg-selected) data-[state=on]:text-(color:--toggle-button-fg-selected)",
  "data-[state=on]:[@media(hover:hover)]:hover:bg-(color:--toggle-button-bg-selected-hover) data-[state=on]:[@media(hover:hover)]:data-[hovered=true]:bg-(color:--toggle-button-bg-selected-hover)",
  "data-[state=on]:active:bg-(color:--toggle-button-bg-selected-pressed) data-[state=on]:data-[pressed=true]:bg-(color:--toggle-button-bg-selected-pressed)",
  /* a pressed fill must win over the hover fill while the pointer is still over the toggle */
  "[@media(hover:hover)]:hover:active:bg-(color:--toggle-button-bg-pressed) [@media(hover:hover)]:hover:data-[pressed=true]:bg-(color:--toggle-button-bg-pressed) [@media(hover:hover)]:data-[hovered=true]:active:bg-(color:--toggle-button-bg-pressed) [@media(hover:hover)]:data-[hovered=true]:data-[pressed=true]:bg-(color:--toggle-button-bg-pressed)",
  "data-[state=on]:[@media(hover:hover)]:hover:active:bg-(color:--toggle-button-bg-selected-pressed) data-[state=on]:[@media(hover:hover)]:hover:data-[pressed=true]:bg-(color:--toggle-button-bg-selected-pressed) data-[state=on]:[@media(hover:hover)]:data-[hovered=true]:active:bg-(color:--toggle-button-bg-selected-pressed) data-[state=on]:[@media(hover:hover)]:data-[hovered=true]:data-[pressed=true]:bg-(color:--toggle-button-bg-selected-pressed)",
  "focus-visible:h-focus-ring data-[focus-visible=true]:h-focus-ring",
  "disabled:h-status-disabled aria-disabled:h-status-disabled",
].join(" ")
const icon = "[&_svg]:pointer-events-none [&_svg]:-mx-0.5 [&_svg]:my-0.5 [&_svg]:shrink-0 [&_svg]:self-center sm:[&_svg]:my-1 [&_svg:not([class*=size-])]:size-5 sm:[&_svg:not([class*=size-])]:size-4"
const ghost = "[--toggle-button-bg:transparent] [--toggle-button-bg-hover:var(--h-default)] [--toggle-button-bg-pressed:var(--h-default)] [--toggle-button-fg:var(--h-default-foreground)]"

const toggleVariants = cva([layout, motion, colour, states, icon].join(" "), {
  variants: {
    variant: {
      default: "",
      ghost,
      /* legacy: outline reads as ghost */
      outline: ghost,
    },
    size: {
      sm: "h-9 px-3 md:h-8 active:[transform:scale(0.98)] data-[pressed=true]:[transform:scale(0.98)] [&_svg:not([class*=size-])]:size-4",
      md: "",
      default: "",
      lg: "h-12 text-base md:h-11 active:[transform:scale(0.96)] data-[pressed=true]:[transform:scale(0.96)]",
    },
    iconOnly: {
      true: "w-10 p-0 md:w-9",
      false: "",
    },
  },
  compoundVariants: [
    { iconOnly: true, size: "sm", class: "w-9 md:w-8" },
    { iconOnly: true, size: "lg", class: "w-12 md:w-11" },
  ],
  defaultVariants: { variant: "default", size: "md", iconOnly: false },
})

function Toggle({
  className,
  variant,
  size,
  iconOnly,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, iconOnly }), className)}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
