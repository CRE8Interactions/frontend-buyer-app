import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

/* the reference Chip wearing the shadcn Badge API, plus the reference Badge
   (count / dot overlay) exported as NotificationBadge. */

type ChipColor = "default" | "accent" | "success" | "warning" | "danger" | "info" | "purple"
type ChipVariantName = "primary" | "secondary" | "tertiary" | "soft"
type LegacyVariant = "default" | "destructive" | "neutral" | "outline" | "accent" | "success" | "warning" | "info" | "purple"
type BadgeVariant = ChipVariantName | LegacyVariant
type BadgeSize = "sm" | "md" | "lg" | "default"

/* Legacy shadcn / brand variants -> closest Chip variant + colour. `default` is neutral on purpose: green means
   success, so a plain badge must never be green. There is one green (the brand green); `accent` is an alias of `success`. */
const legacyMap: Record<string, { variant: ChipVariantName; color: ChipColor }> = {
  default: { variant: "secondary", color: "default" },
  info: { variant: "soft", color: "info" },
  purple: { variant: "soft", color: "purple" },
  accent: { variant: "soft", color: "success" },
  success: { variant: "soft", color: "success" },
  warning: { variant: "soft", color: "warning" },
  destructive: { variant: "soft", color: "danger" },
  neutral: { variant: "secondary", color: "default" },
  outline: { variant: "tertiary", color: "default" },
}

/* The Badge (the reference Chip): pill, 12px text, 16px radius. A colour sets the text colour (secondary and tertiary use it on the
   default / transparent fill); primary and soft combine variant and colour for fill and text. */
const chipVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-0.5 rounded-[16px] px-2 py-0.5 text-xs leading-5 font-medium",
  {
    variants: {
      size: {
        sm: "px-1 py-0 text-xs leading-[var(--text-xs--line-height)]",
        md: "",
        lg: "px-3 py-1 text-sm leading-5 font-medium",
      },
      variant: {
        primary: "",
        secondary: "bg-h-default",
        tertiary: "bg-transparent",
        soft: "",
      },
      color: {
        default: "text-h-default-foreground",
        accent: "text-h-accent-soft-foreground",
        success: "text-h-success-soft-foreground",
        warning: "text-h-warning-soft-foreground",
        danger: "text-h-danger-soft-foreground",
        info: "text-h-info-soft-foreground",
        purple: "text-h-purple-soft-foreground",
      },
    },
    compoundVariants: [
    { variant: "primary", color: "default", class: "bg-h-default text-h-default-foreground" },
    { variant: "primary", color: "accent", class: "bg-h-accent text-h-accent-foreground" },
    { variant: "primary", color: "success", class: "bg-h-success text-h-success-foreground" },
    { variant: "primary", color: "warning", class: "bg-h-warning text-h-warning-foreground" },
    { variant: "primary", color: "danger", class: "bg-h-danger text-h-danger-foreground" },
    { variant: "primary", color: "info", class: "bg-h-info text-h-info-foreground" },
    { variant: "primary", color: "purple", class: "bg-h-purple text-h-purple-foreground" },
    { variant: "soft", color: "default", class: "bg-h-default-soft text-h-default-soft-foreground" },
    { variant: "soft", color: "accent", class: "bg-h-accent-soft text-h-accent-soft-foreground" },
    { variant: "soft", color: "success", class: "bg-h-success-soft text-h-success-soft-foreground" },
    { variant: "soft", color: "warning", class: "bg-h-warning-soft text-h-warning-soft-foreground" },
    { variant: "soft", color: "danger", class: "bg-h-danger-soft text-h-danger-soft-foreground" },
    { variant: "soft", color: "info", class: "bg-h-info-soft text-h-info-soft-foreground" },
    { variant: "soft", color: "purple", class: "bg-h-purple-soft text-h-purple-soft-foreground" },
    ],
    defaultVariants: { size: "md", variant: "secondary", color: "default" },
  }
)

const chipClasses = (size: "sm" | "md" | "lg", variant: ChipVariantName, color: ChipColor) => cn(chipVariants({ size, variant, color }))

function resolveChip(variant: BadgeVariant, color?: ChipColor, size: BadgeSize = "md") {
  /* One green: the brand green is the success green, so `accent` is an alias of `success`. */
  if (color === "accent") color = "success"
  const legacy = legacyMap[variant]
  const v: ChipVariantName = legacy ? legacy.variant : (variant as ChipVariantName)
  const c: ChipColor = color ?? (legacy ? legacy.color : "default")
  const s = size === "default" ? "md" : size
  return { v, c, s }
}

/* Kept for call sites that build class names directly. */
function badgeVariants({
  variant = "default",
  color,
  size = "md",
}: { variant?: BadgeVariant; color?: ChipColor; size?: BadgeSize } = {}) {
  const { v, c, s } = resolveChip(variant, color, size)
  return chipClasses(s, v, c)
}

function BadgeLabel({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="badge-label" className={cn("px-0.5", className)} {...props} />
}

function Badge({
  className,
  variant = "default",
  color,
  size = "md",
  asChild = false,
  children,
  ...props
}: Omit<React.ComponentProps<"span">, "color"> & {
  /** the reference: primary | secondary | tertiary | soft. Legacy: default | accent | success | warning | destructive | neutral | outline. */
  variant?: BadgeVariant
  /** the reference colour. Overrides the colour implied by a legacy variant. */
  color?: ChipColor
  size?: BadgeSize
  asChild?: boolean
}) {
  const Comp = asChild ? Slot.Root : "span"
  const { v, c, s } = resolveChip(variant, color, size)
  /* the reference wraps the text in .chip__label (px-0.5); icons stay outside it. */
  const content = asChild
    ? children
    : React.Children.map(children, (child) =>
        typeof child === "string" || typeof child === "number" ? <BadgeLabel>{child}</BadgeLabel> : child
      )

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      data-color={c}
      className={cn(chipClasses(s, v, c), className)}
      {...props}
    >
      {content}
    </Comp>
  )
}

/* ---------------------------------------------------------------------------------------------
   NotificationBadge = the reference Badge : count / dot overlay anchored to a corner.
   --------------------------------------------------------------------------------------------- */
type NotificationPlacement = "top-right" | "top-left" | "bottom-right" | "bottom-left"

/** Wrap the element (avatar, icon button) the badge sits on. */
function NotificationBadgeAnchor({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="notification-badge-anchor" className={cn("relative inline-flex shrink-0", className)} {...props} />
}

const notificationBadgeVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-0.5 border border-h-background font-medium bg-clip-padding",
  {
    variants: {
      size: {
        sm: "min-h-4 min-w-4 rounded-[12px] text-[10px] leading-[1.34]",
        md: "min-h-7 min-w-7 rounded-[24px] text-xs leading-[1.34]",
        lg: "min-h-8 min-w-8 rounded-[16px] text-sm leading-[1.43]",
      },
      kind: { primary: "", secondary: "bg-h-default", soft: "" },
      color: {
        default: "text-h-default-foreground",
        accent: "text-h-accent-soft-foreground",
        success: "text-h-success-soft-foreground",
        warning: "text-h-warning-soft-foreground",
        danger: "text-h-danger-soft-foreground",
        info: "text-h-info-soft-foreground",
        purple: "text-h-purple-soft-foreground",
      },
      placement: {
        "top-right": "absolute top-0 right-0 translate-x-1/4 -translate-y-1/4",
        "top-left": "absolute top-0 left-0 -translate-x-1/4 -translate-y-1/4",
        "bottom-right": "absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4",
        "bottom-left": "absolute bottom-0 left-0 -translate-x-1/4 translate-y-1/4",
      },
    },
    compoundVariants: [
    { kind: "primary", color: "default", class: "bg-h-default text-h-default-foreground" },
    { kind: "primary", color: "accent", class: "bg-h-accent text-h-accent-foreground" },
    { kind: "primary", color: "success", class: "bg-h-success text-h-success-foreground" },
    { kind: "primary", color: "warning", class: "bg-h-warning text-h-warning-foreground" },
    { kind: "primary", color: "danger", class: "bg-h-danger text-h-danger-foreground" },
    { kind: "primary", color: "info", class: "bg-h-info text-h-info-foreground" },
    { kind: "primary", color: "purple", class: "bg-h-purple text-h-purple-foreground" },
    { kind: "soft", color: "default", class: "bg-h-default-soft text-h-default-soft-foreground" },
    { kind: "soft", color: "accent", class: "bg-h-accent-soft text-h-accent-soft-foreground" },
    { kind: "soft", color: "success", class: "bg-h-success-soft text-h-success-soft-foreground" },
    { kind: "soft", color: "warning", class: "bg-h-warning-soft text-h-warning-soft-foreground" },
    { kind: "soft", color: "danger", class: "bg-h-danger-soft text-h-danger-soft-foreground" },
    { kind: "soft", color: "info", class: "bg-h-info-soft text-h-info-soft-foreground" },
    { kind: "soft", color: "purple", class: "bg-h-purple-soft text-h-purple-soft-foreground" },
    ],
    defaultVariants: { size: "md", kind: "primary", color: "accent" },
  }
)

function NotificationBadge({
  className,
  variant = "primary",
  color = "accent",
  size = "md",
  placement = "top-right",
  children,
  ...props
}: Omit<React.ComponentProps<"span">, "color"> & {
  variant?: ChipVariantName
  color?: ChipColor
  size?: "sm" | "md" | "lg"
  /** Omit the placement (pass `null`) to render inline instead of overlaying a corner. */
  placement?: NotificationPlacement | null
}) {
  /* Badge colours: primary solid, soft muted, secondary = default bg + coloured text (no tertiary). */
  const kind = variant === "soft" || variant === "primary" ? variant : "secondary"
  return (
    <span
      data-slot="notification-badge"
      className={cn(notificationBadgeVariants({ size, kind, color, placement: placement ?? undefined }), className)}
      {...props}
    >
      {typeof children === "string" || typeof children === "number" ? <span className="px-0.5">{children}</span> : children}
    </span>
  )
}

export { Badge, BadgeLabel, badgeVariants, NotificationBadge, NotificationBadgeAnchor }
export type { ChipColor, ChipVariantName, BadgeVariant, NotificationPlacement }
