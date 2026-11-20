"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Separator as SeparatorPrimitive } from "radix-ui"

const separatorVariants = cva("h-px w-full shrink-0 rounded-[4px] border-t-0 border-b-0 bg-h-separator", {
  variants: {
    variant: {
      default: "bg-h-separator",
      secondary: "bg-h-separator-secondary",
      tertiary: "bg-h-separator-tertiary",
    },
    orientation: {
      horizontal: "h-px w-full",
      vertical: "h-auto min-h-2 w-px self-stretch",
    },
  },
  defaultVariants: { variant: "default", orientation: "horizontal" },
})

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  variant = "default",
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root> & Pick<VariantProps<typeof separatorVariants>, "variant">) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(separatorVariants({ variant, orientation }), className)}
      {...props}
    />
  )
}

export { Separator, separatorVariants }
