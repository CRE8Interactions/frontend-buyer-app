import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

import { ButtonGroupContext, type ButtonGroupContextValue } from "@/components/ui/button"

/* From the reference ButtonGroup, with our accent. Group sizes (phone, desktop): sm 36/32px, md 40/36px, lg 48/44px, 14px text at weight
   500, pill outer ends, square inner corners, no gap, no press scale (a pressed button keeps its size so the group stays one shape). Outline buttons share their borders: the touching edges drop theirs. variant and disabled flow to the buttons
   through context. The separator goes inside each button except the first (see ButtonGroupSeparator). The group styles its
   children by data-slot, so the rules sit here and the buttons stay unaware of the group. */
const groupBase = [
  "flex w-fit items-stretch has-[>[data-slot=button-group]]:gap-2",
  "[&>*:focus-visible]:relative [&>*:focus-visible]:z-10",
  "[&>[data-slot=button]]:relative [&>[data-slot=button]]:text-sm [&>[data-slot=button]]:font-medium",
  "[&>[data-slot=button]:active]:[transform:none] [&>[data-slot=button][data-pressed=true]]:[transform:none]",
  "[&>[data-slot=button]_svg]:pointer-events-none [&>[data-slot=button]_svg]:size-4 [&>[data-slot=button]_svg]:shrink-0",
  "[&>[data-slot=button]:not([data-size^=icon])_svg]:-mx-0.5",
  "[&>[data-slot=button][data-size^=icon]]:aspect-square [&>[data-slot=button][data-size^=icon]]:w-auto [&>[data-slot=button][data-size^=icon]]:px-0",
  "[&>[data-slot=select-trigger]:not([class*=w-])]:w-fit",
  "[&>input]:flex-1",
].join(" ")

/* Outer ends are pills, inner corners are square; outline buttons drop the border they share with a neighbour. */
const horizontalEdges = [
  "[&>[data-slot=button]:not(:first-child)]:rounded-s-none",
  "[&>[data-slot=button]:not(:last-child)]:rounded-e-none",
  "[&>[data-variant=outline]:first-child:not(:last-child)]:border-e-0",
  "[&>[data-variant=outline]:last-child:not(:first-child)]:border-s-0",
  "[&>[data-variant=outline]:not(:first-child):not(:last-child)]:border-x-0",
].join(" ")
const verticalEdges = [
  "flex-col",
  "[&>[data-slot=button]]:w-full",
  "[&>[data-slot=button]:not(:first-child)]:rounded-t-none",
  "[&>[data-slot=button]:not(:last-child)]:rounded-b-none",
  "[&>[data-variant=outline]:first-child:not(:last-child)]:border-b-0",
  "[&>[data-variant=outline]:last-child:not(:first-child)]:border-t-0",
  "[&>[data-variant=outline]:not(:first-child):not(:last-child)]:border-y-0",
].join(" ")

const sizeSm = [
  "[&>[data-slot=button-group-text]]:h-9 [&>[data-slot=button-group-text]]:md:h-8 [&>[data-slot=button]]:h-9 [&>[data-slot=button]]:md:h-8",
  "[&>[data-slot=button]:not([data-size^=icon])]:px-3",
].join(" ")
const sizeMd = [
  "[&>[data-slot=button-group-text]]:h-10 [&>[data-slot=button-group-text]]:md:h-9 [&>[data-slot=button]]:h-10 [&>[data-slot=button]]:md:h-9",
  "[&>[data-slot=button]:not([data-size^=icon])]:px-4",
].join(" ")
const sizeLg = [
  "[&>[data-slot=button-group-text]]:h-12 [&>[data-slot=button-group-text]]:md:h-11 [&>[data-slot=button]]:h-12 [&>[data-slot=button]]:md:h-11",
  "[&>[data-slot=button]:not([data-size^=icon])]:px-5",
].join(" ")

const buttonGroupVariants = cva(groupBase, {
  variants: {
    orientation: {
      horizontal: horizontalEdges,
      vertical: verticalEdges,
    },
    size: {
      sm: sizeSm,
      md: sizeMd,
      lg: sizeLg,
    },
    fullWidth: {
      true: "w-full [&>[data-slot=button]]:flex-1",
      false: "",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
    size: "md",
    fullWidth: false,
  },
})

/* Text cell: same height and fill as the tertiary button (the group sets the height), square corners, 14px / 500. */
const groupText = [
  "relative flex shrink-0 items-center justify-center gap-2 bg-h-default px-4 text-sm font-medium whitespace-nowrap text-h-default-foreground tabular-nums",
  "[&_svg]:pointer-events-none [&_svg:not([class*=size-])]:size-4",
].join(" ")

/* A 1px line, half the button height; rotated to a horizontal line in a vertical group. */
const groupSeparator = [
  "pointer-events-none absolute top-1/4 -left-px h-1/2 w-px rounded-[4px] bg-current opacity-15",
  "[[data-orientation=vertical]_&]:top-[-1px] [[data-orientation=vertical]_&]:left-1/4 [[data-orientation=vertical]_&]:h-px [[data-orientation=vertical]_&]:w-1/2",
].join(" ")

function ButtonGroup({
  className,
  orientation,
  fullWidth,
  size,
  variant,
  disabled,
  isDisabled,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof buttonGroupVariants> &
  Pick<ButtonGroupContextValue, "variant" | "disabled"> & {
    /** Alias of `disabled`: turns off every button in the group (a button can still override it). */
    isDisabled?: boolean
  }) {
  const off = isDisabled ?? disabled
  const value = React.useMemo(() => ({ variant, disabled: off }), [variant, off])
  return (
    <ButtonGroupContext.Provider value={value}>
      <div
        role="group"
        data-slot="button-group"
        data-orientation={orientation}
        className={cn(buttonGroupVariants({ orientation, size, fullWidth }), className)}
        {...props}
      />
    </ButtonGroupContext.Provider>
  )
}

/* A text cell inside a group (for example the "2 tickets" in a quantity control). Same height and fill as the
   tertiary button, square corners, 14px / 500. */
function ButtonGroupText({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & {
  asChild?: boolean
}) {
  const Comp = asChild ? Slot.Root : "div"

  return (
    <Comp
      data-slot="button-group-text"
      className={cn(groupText, className)}
      {...props}
    />
  )
}

/* Place inside each button except the first, as in the reference: <Button><ButtonGroupSeparator />Second</Button>.
   A 1px line, half the button height, in the button's text colour at 15%. */
function ButtonGroupSeparator({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="button-group-separator"
      className={cn(groupSeparator, className)}
      {...props}
    />
  )
}

export {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  buttonGroupVariants,
}
