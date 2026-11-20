import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/* sm 16, md 24, lg 32, xl 40, colours current/accent/danger/success/warning. Spins at 0.75s linear, no spin under reduced motion. */
const spinnerVariants = cva(
  ["pointer-events-none inline-flex size-6 shrink-0", "animate-[spin_0.75s_linear_infinite] motion-reduce:animate-none"].join(" "),
  {
  variants: {
    size: { sm: "size-4", md: "", lg: "size-8", xl: "size-10" },
    color: {
      current: "text-[inherit]",
      accent: "text-h-accent",
      danger: "text-h-danger-text",
      success: "text-h-success-soft-foreground",
      warning: "text-h-warning",
    },
  },
  defaultVariants: { size: "md", color: "current" },
  }
)

/* The default Spinner is 16px and inherits colour so existing usages keep their size; pass size="md" for 24px. */
function Spinner({
  className,
  size,
  color,
  ...props
}: Omit<React.ComponentProps<"svg">, "color"> & VariantProps<typeof spinnerVariants>) {
  return (
    <svg
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      viewBox="0 0 24 24"
      fill="none"
      className={cn(spinnerVariants({ size: size ?? "sm", color }), className)}
      {...props}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export { Spinner, spinnerVariants }
