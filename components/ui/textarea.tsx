import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { fieldBase } from "./input"

/** the reference TextArea (textarea.css): same field surface as Input (fieldBase), min-height 38px, grows with its content. */
const textareaSizes = {
  sm: "min-h-9 px-2.5 py-1.5 text-sm",
  md: "",
  lg: "min-h-14 px-4 py-3 text-base",
} as const

const textareaSecondary = [
  "bg-(--input-bg) shadow-none",
  "[--input-bg:var(--h-field-secondary)] [--input-bg-hover:var(--h-field-secondary-hover)] [--input-bg-focus:var(--h-field-secondary)]",
].join(" ")
const textareaTertiary = [
  "bg-(--input-bg) shadow-[inset_0_0_0_1px_var(--h-border-secondary)]",
  "[--input-bg:transparent] [--input-bg-hover:transparent] [--input-bg-focus:transparent]",
  "[@media(hover:hover)]:[&:hover:not(:focus):not(:focus-visible)]:shadow-[inset_0_0_0_1px_var(--h-border-tertiary)]",
].join(" ")

const textareaVariants = cva([fieldBase, "min-h-[38px] field-sizing-content"].join(" "), {
  variants: {
    variant: {
      primary: "",
      secondary: textareaSecondary,
      tertiary: textareaTertiary,
    },
    fullWidth: { true: "w-full", false: "" },
  },
  defaultVariants: { variant: "primary", fullWidth: true },
})

type TextareaProps = React.ComponentProps<"textarea"> &
  VariantProps<typeof textareaVariants> & { isInvalid?: boolean; size?: "sm" | "md" | "lg" }

function Textarea({
  className,
  variant,
  size = "md",
  fullWidth,
  isInvalid,
  ...props
}: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      data-invalid={isInvalid ? "true" : undefined}
      aria-invalid={isInvalid ? true : props["aria-invalid"]}
      className={cn(textareaVariants({ variant, fullWidth }), textareaSizes[size], className)}
      {...props}
    />
  )
}

export { Textarea, textareaVariants }
export type { TextareaProps }
