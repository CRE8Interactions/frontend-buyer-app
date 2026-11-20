import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

/* A coloured container that keeps its text contrast. */
const surfaceVariants = cva("relative text-foreground", {
  variants: {
    variant: {
      transparent: "bg-transparent",
      default: "bg-h-surface text-h-surface-foreground",
      secondary: "bg-h-surface-secondary text-h-surface-secondary-foreground",
      tertiary: "bg-h-surface-tertiary text-h-surface-tertiary-foreground",
    },
  },
  defaultVariants: { variant: "default" },
})

function Surface({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof surfaceVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "div"
  return <Comp data-slot="surface" data-variant={variant} className={cn(surfaceVariants({ variant }), className)} {...props} />
}

export { Surface, surfaceVariants }
