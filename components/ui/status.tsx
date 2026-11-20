import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/* Status: a small glowing dot and a label, for availability and state that should read as text, not as a pill.
   The dot takes the status colour, the text keeps the colour of its surroundings (so it works on a card and on a photo).
   Use a Badge when the status needs a filled shape; use Status inside dense rows and over images. */
const statusVariants = cva("inline-flex items-center font-medium whitespace-nowrap", {
  variants: {
    color: {
      success: "[--dot:var(--h-success)]",
      warning: "[--dot:var(--h-warning)]",
      danger: "[--dot:var(--h-danger)]",
      info: "[--dot:var(--h-info)]",
      purple: "[--dot:var(--h-purple)]",
      neutral: "[--dot:color-mix(in_srgb,currentColor_45%,transparent)]",
    },
    size: {
      sm: "gap-1.5 text-[13px] leading-none [&_[data-slot=status-dot]]:size-2",
      md: "gap-2 text-sm leading-none [&_[data-slot=status-dot]]:size-2.5",
    },
  },
  defaultVariants: { color: "success", size: "sm" },
})

type StatusProps = React.ComponentProps<"span"> &
  VariantProps<typeof statusVariants> & {
    /** A slow breathing glow on the dot, for something live. Off with reduced motion. */
    pulse?: boolean
  }

function Status({ color, size, pulse = false, className, children, ...props }: StatusProps) {
  return (
    <span data-slot="status" data-color={color ?? "success"} className={cn(statusVariants({ color, size }), className)} {...props}>
      <span
        data-slot="status-dot"
        aria-hidden
        className={cn(
          "shrink-0 rounded-full bg-(--dot) shadow-[0_0_0_3px_color-mix(in_srgb,var(--dot)_28%,transparent),0_0_12px_1px_color-mix(in_srgb,var(--dot)_65%,transparent)]",
          pulse && "motion-safe:animate-pulse"
        )}
      />
      {children}
    </span>
  )
}

export { Status, statusVariants }
export type { StatusProps }
