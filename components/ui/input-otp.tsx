"use client"

import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { OTPInput, OTPInputContext, REGEXP_ONLY_CHARS, REGEXP_ONLY_DIGITS, REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp"

/* cva + utilities. Slots are standalone 40 x 38px field boxes (36px tall on desktop, like fields)
   with 12px corners and an 8px gap. Hover steps the fill up, the active slot lifts above its neighbours and takes the focus
   ring, a filled slot keeps the focus fill, invalid draws the danger outline. Each character arrives with the reference
   animation: it fades in while rising 8px from 80% size, 250ms, from the bottom centre (`slot-value-in`, in globals.css);
   typing the next character animates just that slot. A caret blinks in the active empty slot. The separator is a 6 x 2px
   bar. `secondary` drops the shadow and uses the default fill, for use on a surface. */
/** Omit that keeps a union of prop types a union (OTPInput takes either children or a render function). */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never
type OTPVariant = "primary" | "secondary"
type OTPSize = "sm" | "md" | "lg"
/* sm: 32 x 36 / 32 (fits the control ladder), md: 38 x 40 / 36 (the reference), lg: 48 wide, 56 tall on phones and 48 tall on desktop (the height follows the width, so the slots stay proportioned when the row has to shrink), with 24px digits, for login and
   verification screens where the code is the one thing on the page. */
/* Slot fills, strongest last (the order is the cascade): base fill, then the filled / active fill, then the secondary's own
   fill, then the invalid outline, then hover, which wins over all of them. The invalid flag picks the class set in JS, so no two
   rules of equal weight compete. Hover is written [&:hover:hover] (one more pseudo-class) to outrank the data-attribute fills. */
const slotVariants = cva(
  [
    "relative flex min-w-0 flex-1 items-center justify-center rounded-[12px] text-sm font-semibold text-h-field-foreground outline-none",
    "[transition:background-color_150ms_ease,box-shadow_150ms_var(--e-out)] motion-reduce:[transition:none]",
    "data-[filled=true]:bg-h-field-focus data-[active=true]:bg-h-field-focus",
    "data-[active=true]:z-10 data-[active=true]:shadow-[0_0_0_2px_var(--h-focus)]",
  ].join(" "),
  {
    variants: {
      variant: { primary: "", secondary: "" },
      invalid: { true: "", false: "" },
      size: {
        sm: "h-9 w-8 md:h-8",
        md: "h-10 w-9.5 md:h-9",
        lg: "w-12 aspect-[6/7] rounded-[14px] md:aspect-square",
      },
    },
    compoundVariants: [
      { variant: "primary", invalid: false, className: "bg-h-field shadow-(--h-field-outline)" },
      { variant: "secondary", invalid: false, className: "bg-h-default shadow-none data-[filled=true]:bg-h-default data-[active=true]:bg-h-default" },
      { variant: ["primary", "secondary"], invalid: true, className: "bg-h-field-focus shadow-[0_0_0_1px_var(--h-danger)] data-[active=true]:shadow-[0_0_0_2px_var(--h-danger)]" },
      { variant: "primary", className: "[@media(hover:hover)]:[&:hover:hover]:bg-h-field-hover" },
      { variant: "secondary", className: "[@media(hover:hover)]:[&:hover:hover]:bg-h-default-hover" },
    ],
    defaultVariants: { variant: "primary", invalid: false, size: "md" },
  }
)

const slotValueVariants = cva("origin-bottom tracking-[-0.27px] [animation:slot-value-in_250ms_ease_both] motion-reduce:[animation:none]", {
  variants: { size: { sm: "text-base leading-6", md: "text-lg leading-6", lg: "text-2xl leading-8" } },
})

const containerVariants = cva("relative flex w-full items-center has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50", {
  variants: { size: { sm: "gap-2", md: "gap-2", lg: "gap-3" } },
})
const groupVariants = cva("flex min-w-0 items-center", { variants: { size: { sm: "gap-2", md: "gap-2", lg: "gap-3" } } })
const caretVariants = cva("absolute w-0.5 animate-caret-blink rounded-[8px] bg-h-field-placeholder", { variants: { size: { sm: "h-4", md: "h-4", lg: "h-6" } } })
const separatorVariants = cva("shrink-0 rounded-[8px] bg-h-separator", { variants: { size: { sm: "h-0.5 w-1.5", md: "h-0.5 w-1.5", lg: "h-[3px] w-2" } } })

const OTPContext = React.createContext<{ variant: OTPVariant; isInvalid: boolean; size: OTPSize }>({ variant: "primary", isInvalid: false, size: "md" })

function InputOTP({
  className,
  containerClassName,
  variant = "primary",
  size = "md",
  isInvalid = false,
  isDisabled,
  disabled,
  ...props
}: DistributiveOmit<React.ComponentProps<typeof OTPInput>, "size"> & {
  containerClassName?: string
  variant?: OTPVariant
  /** Slot size: sm, md (default) or lg for login and verification screens. */
  size?: OTPSize
  /** Draws every slot with the danger outline. */
  isInvalid?: boolean
  /** Alias of `disabled`. */
  isDisabled?: boolean
}) {
  const off = isDisabled ?? disabled
  return (
    <OTPContext.Provider value={{ variant, isInvalid, size }}>
      <OTPInput
        data-slot="input-otp"
        data-variant={variant}
        data-size={size}
        disabled={off}
        aria-invalid={isInvalid || undefined}
        containerClassName={cn(containerVariants({ size }), containerClassName)}
        className={cn("disabled:cursor-not-allowed", className)}
        {...props}
      />
    </OTPContext.Provider>
  )
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  const { size } = React.useContext(OTPContext)
  return <div data-slot="input-otp-group" className={cn(groupVariants({ size }), className)} {...props} />
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  index: number
}) {
  const inputOTPContext = React.useContext(OTPInputContext)
  const { variant, isInvalid, size } = React.useContext(OTPContext)
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {}
  const invalid = isInvalid || props["aria-invalid"] === true || props["aria-invalid"] === "true"

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive || undefined}
      data-filled={char ? "true" : undefined}
      data-invalid={invalid ? "true" : undefined}
      className={cn(slotVariants({ variant, invalid: !!invalid, size }), className)}
      {...props}
    >
      {char ? (
        /* keyed by the character so a new character replays the entrance */
        <span
          key={char}
          data-slot="input-otp-slot-value"
          className={slotValueVariants({ size })}
        >
          {char}
        </span>
      ) : null}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div data-slot="input-otp-caret" className={caretVariants({ size })} />
        </div>
      )}
    </div>
  )
}

function InputOTPSeparator({ className, ...props }: React.ComponentProps<"div">) {
  const { size } = React.useContext(OTPContext)
  return <div data-slot="input-otp-separator" role="separator" className={cn(separatorVariants({ size }), className)} {...props} />
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator, REGEXP_ONLY_CHARS, REGEXP_ONLY_DIGITS, REGEXP_ONLY_DIGITS_AND_CHARS }
export type { OTPVariant, OTPSize }
