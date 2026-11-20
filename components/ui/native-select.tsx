import * as React from "react"
import { cn } from "@/lib/utils"
import { inputVariants as fieldVariants, fieldSizes, type FieldSize } from "./input"
import { CaretDown } from "@phosphor-icons/react"
const nativeSelectOption = "bg-[Canvas] text-[CanvasText]"

type NativeSelectProps = Omit<React.ComponentProps<"select">, "size"> & {
  size?: FieldSize | "default"
  variant?: "primary" | "secondary" | "tertiary"
  fullWidth?: boolean
  indicator?: React.ReactNode
  wrapperClassName?: string
}

function NativeSelect({
  className,
  size = "md",
  variant,
  fullWidth = false,
  indicator = <CaretDown weight="bold" />,
  wrapperClassName,
  ...props
}: NativeSelectProps) {
  return (
    <div
      className={cn("group/native-select relative max-w-full", fullWidth ? "w-full" : "w-fit", wrapperClassName)}
      data-slot="native-select-wrapper"
    >
      <select
        data-slot="native-select"
        data-size={size}
        className={cn(
          fieldVariants({ variant, fullWidth: true }),
          fieldSizes[size === "default" ? "md" : size],
          "peer appearance-none pe-8 has-[option[value='']:checked]:text-h-field-placeholder",
          className
        )}
        {...props}
      />
      <span
        data-slot="native-select-icon"
        className="pointer-events-none absolute inset-e-2.5 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center text-h-field-placeholder select-none peer-disabled:opacity-50 peer-aria-disabled:opacity-50 [&_svg]:size-4 [&_svg]:p-0.5"
        aria-hidden="true"
      >
        {indicator}
      </span>
    </div>
  )
}

function NativeSelectOption({
  className,
  ...props
}: React.ComponentProps<"option">) {
  return (
    <option
      data-slot="native-select-option"
      className={cn(nativeSelectOption, className)}
      {...props}
    />
  )
}

function NativeSelectOptGroup({
  className,
  ...props
}: React.ComponentProps<"optgroup">) {
  return (
    <optgroup
      data-slot="native-select-optgroup"
      className={cn(nativeSelectOption, className)}
      {...props}
    />
  )
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption }
export type { NativeSelectProps }
