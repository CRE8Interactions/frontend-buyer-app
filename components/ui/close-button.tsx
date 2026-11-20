import * as React from "react"
import { X } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { rippleHandlers } from "@/lib/ripple"

/* 24px square, 12px radius, default fill with a muted icon. Hover: default-hover fill, foreground icon. Pressed: scale 0.93.
   In dark mode the fill is the default colour lifted with white (96%, 91% on hover). Icon is Phosphor X (bold). */
const layout = "relative isolate h-touch-44 inline-flex size-6 shrink-0 origin-center items-center justify-center rounded-[12px] p-1 transform-gpu"
const type = "cursor-pointer text-h-muted select-none h-no-highlight outline-none bg-h-default"
const motion = "[transition:transform_250ms_cubic-bezier(0.165,0.84,0.44,1),color_200ms_var(--e-out),background-color_200ms_var(--e-out),box-shadow_150ms_var(--e-out)] motion-reduce:[transition:none]"
const dark = [
  "[:root:not([data-nt=light])_&]:bg-[color-mix(in_oklab,var(--h-default)_96%,white)]",
  "[:root:not([data-nt=light])_&]:[@media(hover:hover)]:hover:bg-[color-mix(in_oklab,var(--h-default)_91%,white)]",
  "[:root:not([data-nt=light])_&]:[@media(hover:hover)]:data-[hovered=true]:bg-[color-mix(in_oklab,var(--h-default)_91%,white)]",
].join(" ")
const states = [
  "[@media(hover:hover)]:hover:bg-h-default-hover [@media(hover:hover)]:hover:text-h-foreground",
  "[@media(hover:hover)]:data-[hovered=true]:bg-h-default-hover [@media(hover:hover)]:data-[hovered=true]:text-h-foreground",
  "active:[transform:scale(0.93)] data-[pressed=true]:[transform:scale(0.93)]",
  "focus-visible:h-focus-ring data-[focus-visible=true]:h-focus-ring",
  "disabled:h-status-disabled aria-disabled:h-status-disabled",
  "data-[pending=true]:pointer-events-none",
].join(" ")
const icon = "[&_svg]:pointer-events-none [&_svg]:-mx-0.5 [&_svg]:my-0.5 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:self-center"

function CloseButton({ className, children, onPointerDown, onKeyDown, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-label="Close"
      data-slot="close-button"
      className={cn(layout, type, motion, dark, states, icon, className)}
      {...props}
      {...rippleHandlers<HTMLButtonElement>({ onPointerDown, onKeyDown })}
    >
      {children ?? <X weight="bold" className="size-4" />}
    </button>
  )
}

export { CloseButton }
