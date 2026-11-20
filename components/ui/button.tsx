import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"
import { Spinner } from "@/components/ui/spinner"
import { rippleHandlers } from "@/lib/ripple"

/* Colours flow through --button-bg / --button-bg-hover / --button-bg-pressed / --button-fg, so each variant only sets the four values.
   States: hover (media hover), pressed (fill + scale 0.97, sm 0.98, lg 0.96), focus-visible ring, disabled, data-pending.
   Variants: primary, secondary, tertiary, ghost, outline, danger, danger-soft, glass. Sizes: sm, md, lg and their icon-only forms. */
const layout = [
  "relative isolate inline-flex h-10 w-fit shrink-0 origin-center items-center justify-center gap-2 rounded-[36px] px-4 md:h-9",
  "text-sm font-medium whitespace-nowrap",
  "cursor-pointer outline-none select-none h-no-highlight transform-gpu",
].join(" ")
const motion = "[transition:transform_250ms_ease,background-color_100ms_var(--e-out),box-shadow_100ms_var(--e-out)] motion-reduce:[transition:none]"
const colour = [
  "[--button-bg:transparent] [--button-bg-hover:var(--button-bg)] [--button-bg-pressed:var(--button-bg-hover)] [--button-fg:currentColor]",
  "bg-(color:--button-bg) text-(color:--button-fg)",
].join(" ")
const states = [
  "[@media(hover:hover)]:hover:bg-(color:--button-bg-hover) [@media(hover:hover)]:data-[hovered=true]:bg-(color:--button-bg-hover)",
  "active:bg-(color:--button-bg-pressed) active:will-change-transform active:[transform:scale(0.97)]",
  "data-[pressed=true]:bg-(color:--button-bg-pressed) data-[pressed=true]:will-change-transform data-[pressed=true]:[transform:scale(0.97)]",
  "focus-visible:h-focus-ring data-[focus-visible=true]:h-focus-ring",
  "disabled:h-status-disabled aria-disabled:h-status-disabled",
  "data-[pending=true]:pointer-events-none",
  /* a pressed fill must win over the hover fill while the pointer is still over the button */
  "[@media(hover:hover)]:hover:active:bg-(color:--button-bg-pressed) [@media(hover:hover)]:hover:data-[pressed=true]:bg-(color:--button-bg-pressed) [@media(hover:hover)]:data-[hovered=true]:active:bg-(color:--button-bg-pressed) [@media(hover:hover)]:data-[hovered=true]:data-[pressed=true]:bg-(color:--button-bg-pressed)",
].join(" ")
const icon = [
  "[&_svg:not([data-slot=spinner])]:pointer-events-none [&_svg:not([data-slot=spinner])]:-mx-0.5 [&_svg:not([data-slot=spinner])]:my-0.5 [&_svg:not([data-slot=spinner])]:shrink-0 [&_svg:not([data-slot=spinner])]:self-center sm:[&_svg:not([data-slot=spinner])]:my-1",
].join(" ")
const base = [layout, motion, colour, states, icon].join(" ")

/* Sizes: height, padding, press scale and the icon size (an icon with its own size- class keeps it). */
const sizeSm = "h-9 px-3 md:h-8 active:[transform:scale(0.98)] data-[pressed=true]:[transform:scale(0.98)] [&_svg:not([data-slot=spinner]):not([class*=size-])]:size-4"
const sizeMd = "[&_svg:not([data-slot=spinner]):not([class*=size-])]:max-sm:size-5 [&_svg:not([data-slot=spinner]):not([class*=size-])]:sm:size-4"
const sizeLg = "h-12 text-base md:h-11 active:[transform:scale(0.96)] data-[pressed=true]:[transform:scale(0.96)] [&_svg:not([data-slot=spinner]):not([class*=size-])]:max-sm:size-5 [&_svg:not([data-slot=spinner]):not([class*=size-])]:sm:size-4"

/* Colour variants: custom property values only. */
const primary = "[--button-bg:var(--h-accent)] [--button-bg-hover:var(--h-accent-hover)] [--button-fg:var(--h-accent-foreground)]"
const danger = "[--button-bg:var(--h-danger)] [--button-bg-hover:var(--h-danger-hover)] [--button-fg:var(--h-danger-foreground)]"

const buttonVariants = cva(base, {
  variants: {
    variant: {
      primary,
      secondary: "[--button-bg:var(--h-default)] [--button-bg-hover:var(--h-default-hover)] [--button-fg:var(--h-default-foreground)]",
      tertiary: "[--button-bg:var(--h-default-soft)] [--button-bg-hover:var(--h-tertiary-hover)] [--button-bg-pressed:var(--h-tertiary-hover)] [--button-fg:var(--h-default-foreground)] [:root:not([data-nt=light])_&]:[--button-bg:color-mix(in_srgb,var(--h-default-foreground)_7%,transparent)] [:root:not([data-nt=light])_&]:[--button-bg-hover:color-mix(in_srgb,var(--h-default-foreground)_12%,transparent)] [:root:not([data-nt=light])_&]:[--button-bg-pressed:color-mix(in_srgb,var(--h-default-foreground)_12%,transparent)]",
      ghost: "[--button-bg:transparent] [--button-bg-hover:var(--h-default)] [--button-fg:var(--h-default-foreground)]",
      outline: "border border-h-border [--button-bg:transparent] [--button-bg-hover:color-mix(in_srgb,var(--h-default)_60%,transparent)] [--button-bg-pressed:var(--h-default)] [--button-fg:var(--h-default-foreground)]",
      danger,
      "danger-soft": "[--button-bg:var(--h-danger-soft)] [--button-bg-hover:var(--h-danger-soft-hover)] [--button-fg:var(--h-danger-soft-foreground)]",
      /* Translucent, for photos and any surface: a tint of the page text colour with a hairline ring and blur, so it reads on light and on dark. */
      glass: "[--button-bg:color-mix(in_srgb,var(--foreground,var(--h-foreground))_10%,transparent)] [--button-bg-hover:color-mix(in_srgb,var(--foreground,var(--h-foreground))_17%,transparent)] [--button-fg:var(--foreground,var(--h-foreground))] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--foreground,var(--h-foreground))_22%,transparent)] backdrop-blur-md",
    },
    size: {
      sm: sizeSm,
      md: sizeMd,
      lg: sizeLg,
      "icon-sm": sizeSm + " w-9 p-0 md:w-8",
      icon: sizeMd + " w-10 p-0 md:w-9",
      "icon-lg": sizeLg + " w-12 p-0 md:w-11",
    },
    fullWidth: { true: "w-full", false: "" },
  },
  defaultVariants: { variant: "primary", size: "md", fullWidth: false },
})

/* A ButtonGroup passes variant, size and disabled to its buttons. A button's own props win. */
export type ButtonGroupContextValue = {
  variant?: VariantProps<typeof buttonVariants>["variant"]
  size?: VariantProps<typeof buttonVariants>["size"]
  disabled?: boolean
}
const ButtonGroupContext = React.createContext<ButtonGroupContextValue>({})

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** the reference isPending: shows a 16px spinner before the label and blocks presses. */
    pending?: boolean
    /** the reference isIconOnly: square button, use with an aria-label. Same as size="icon" / "icon-sm" / "icon-lg". */
    iconOnly?: boolean
  }

function Button({
  className,
  variant,
  size,
  fullWidth,
  disabled,
  pending = false,
  iconOnly = false,
  asChild = false,
  children,
  onPointerDown,
  onKeyDown,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button"
  const group = React.useContext(ButtonGroupContext)
  variant = variant ?? group.variant ?? "primary"
  size = size ?? "md"
  if (iconOnly && !String(size).startsWith("icon")) {
    size = size === "sm" ? "icon-sm" : size === "lg" ? "icon-lg" : "icon"
  }
  disabled = disabled ?? group.disabled

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-pending={pending ? "true" : undefined}
      aria-busy={pending || undefined}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={disabled}
      {...props}
      {...rippleHandlers<HTMLButtonElement>({ onPointerDown, onKeyDown })}
    >
      {asChild ? children : <>{pending ? <Spinner size="sm" /> : null}{children}</>}
    </Comp>
  )
}

export { Button, ButtonGroupContext, buttonVariants }
