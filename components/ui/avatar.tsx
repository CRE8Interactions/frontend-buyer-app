"use client"

import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Avatar as AvatarPrimitive } from "radix-ui"

/* sm 32px / radius 16, md 40px / radius 24, lg 48px / radius 24.
   `--avatar-size` / `--avatar-radius` live on the element so the group's clip seam can trace them. */
type AvatarSize = "sm" | "md" | "lg" | "default"
type AvatarColor = "default" | "accent" | "success" | "warning" | "danger"

/* AvatarGroup passes size, colour and variant to the avatars that do not set their own. */
type AvatarVariant = "default" | "soft"
const AvatarGroupContext = React.createContext<{ size?: AvatarSize; color?: AvatarColor; variant?: AvatarVariant }>({})
const AvatarColorContext = React.createContext<AvatarColor | undefined>(undefined)

const avatarVariants = cva(
  [
    "group/avatar relative flex size-10 shrink-0 items-center justify-center overflow-hidden select-none",
    "rounded-[var(--avatar-radius)] bg-h-default",
    "[--avatar-size:2.5rem] [--avatar-radius:24px]",
  ].join(" "),
  {
    variants: {
      size: {
        sm: "size-8 [--avatar-size:2rem] [--avatar-radius:16px]",
        md: "",
        lg: "size-12 [--avatar-size:3rem]",
      },
      variant: { default: "", soft: "bg-transparent" },
    },
    defaultVariants: { size: "md", variant: "default" },
  }
)

const avatarFallbackVariants = cva(
  [
    "flex size-full items-center justify-center bg-h-default text-sm font-medium",
    "group-data-[size=sm]/avatar:text-xs group-data-[size=lg]/avatar:text-base",
  ].join(" "),
  {
    variants: {
      color: {
        accent: "text-h-accent-soft-foreground group-data-[variant=soft]/avatar:bg-h-accent-soft",
        default: "text-h-default-soft-foreground group-data-[variant=soft]/avatar:bg-h-default-soft",
        success: "text-h-success-soft-foreground group-data-[variant=soft]/avatar:bg-h-success-soft",
        warning: "text-h-warning-soft-foreground group-data-[variant=soft]/avatar:bg-h-warning-soft",
        danger: "text-h-danger-soft-foreground group-data-[variant=soft]/avatar:bg-h-danger-soft",
      },
    },
    defaultVariants: { color: "default" },
  }
)

/* Status dot: 8px at sm (icon hidden), 10px at md and 12px at lg (icon 8px). */
const avatarBadge = [
  "absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full select-none",
  "bg-h-success text-h-success-foreground ring-2 ring-h-background",
  "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
  "group-data-[size=md]/avatar:size-2.5 group-data-[size=md]/avatar:[&>svg]:size-2",
  "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
].join(" ")

const avatarGroupVariants = cva(
  "inline-flex items-center [--avatar-group-overlap:0.5rem] [--avatar-group-seam:2px]",
  {
    variants: {
      mode: {
        grid: "flex-wrap gap-3",
        /* stacked: each avatar after the first overlaps the previous one */
        clip: [
          "[&>[data-slot=avatar]+[data-slot=avatar]]:[margin-inline-start:calc(-1*var(--avatar-group-overlap,0.5rem))]",
          "[&>[data-slot=avatar]+[data-slot=avatar-group-count]]:[margin-inline-start:calc(-1*var(--avatar-group-overlap,0.5rem))]",
          /* the glyph of an avatar that is cut is nudged away from the cut */
          "[&>[data-slot=avatar]:not(:last-child)_[data-slot=avatar-fallback]]:box-border",
          "[&>[data-slot=avatar]:not(:last-child)_[data-slot=avatar-fallback]]:[padding-inline-end:calc(0.5rem*0.35)]",
        ].join(" "),
        /* ring: a background-coloured seam around each avatar */
        ring: [
          "[&>[data-slot=avatar]+[data-slot=avatar]]:[margin-inline-start:calc(-1*var(--avatar-group-overlap,0.5rem))]",
          "[&>[data-slot=avatar]+[data-slot=avatar-group-count]]:[margin-inline-start:calc(-1*var(--avatar-group-overlap,0.5rem))]",
          "[&>[data-slot=avatar]]:relative [&>[data-slot=avatar-group-count]]:relative",
          "[&>[data-slot=avatar]]:[box-shadow:0_0_0_var(--avatar-group-seam,2px)_var(--background)]",
          "[&>[data-slot=avatar-group-count]]:[box-shadow:0_0_0_var(--avatar-group-seam,2px)_var(--background)]",
        ].join(" "),
      },
    },
    defaultVariants: { mode: "clip" },
  }
)

function Avatar({
  className,
  size: sizeProp,
  variant: variantProp,
  color: colorProp,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & {
  size?: AvatarSize
  /** `soft` makes the fallback background the soft tint of its colour. */
  variant?: AvatarVariant
  /** Colour of the fallback text (and its tint in the soft variant). */
  color?: AvatarColor
}) {
  const group = React.useContext(AvatarGroupContext)
  const size = sizeProp ?? group.size ?? "md"
  const variant = variantProp ?? group.variant ?? "default"
  const color = colorProp ?? group.color
  const s = size === "default" ? "md" : size
  return (
    <AvatarColorContext.Provider value={color}>
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={s}
      data-variant={variant}
      className={cn(avatarVariants({ size: s, variant }), className)}
      {...props}
    />
    </AvatarColorContext.Provider>
  )
}

function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("absolute inset-0 aspect-square size-full object-cover transition-opacity duration-250 motion-reduce:transition-none", className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  color,
  ...props
}: Omit<React.ComponentProps<typeof AvatarPrimitive.Fallback>, "color"> & { color?: AvatarColor }) {
  const inherited = React.useContext(AvatarColorContext)
  color = color ?? inherited ?? "default"
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(avatarFallbackVariants({ color }), className)}
      {...props}
    />
  )
}

/* Small status dot on the avatar corner (shadcn API). For the reference count badges use NotificationBadge. */
function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(avatarBadge, className)}
      {...props}
    />
  )
}

type AvatarGroupProps = React.ComponentProps<"div"> & {
  /** Size, colour and variant applied to child avatars (and the count) that do not set their own. */
  size?: AvatarSize
  color?: AvatarColor
  variant?: AvatarVariant
  /** Show at most this many avatars; the rest become a "+N" count. */
  max?: number
  /** Wrapping grid with no overlap. */
  isGrid?: boolean
  /** Stacked overlap: `clip` (default, a transparent seam) or `ring` (a background-coloured seam). `grid` is the old spelling of `isGrid`. */
  overlap?: "clip" | "ring" | "grid"
}

function AvatarGroup({ className, size, color, variant, max, isGrid, overlap = "clip", children, ...props }: AvatarGroupProps) {
  const grid = isGrid || overlap === "grid"
  const mode = grid ? "grid" : overlap
  const all = React.Children.toArray(children)
  const hasCount = all.some((c) => React.isValidElement(c) && c.type === AvatarGroupCount)
  const avatars = all.filter((c) => !(React.isValidElement(c) && c.type === AvatarGroupCount))
  const counts = all.filter((c) => React.isValidElement(c) && c.type === AvatarGroupCount)
  const limited = max != null && avatars.length > max
  const visible = limited ? avatars.slice(0, max) : avatars
  return (
    <AvatarGroupContext.Provider value={{ size, color, variant }}>
      <div
        data-slot="avatar-group"
        data-overlap={mode}
        className={cn(avatarGroupVariants({ mode }), className)}
        {...props}
      >
        {visible}
        {limited && !hasCount ? <AvatarGroupCount>+{avatars.length - (max as number)}</AvatarGroupCount> : null}
        {counts}
      </div>
    </AvatarGroupContext.Provider>
  )
}

/** Overflow counter ("+12"): an avatar whose fallback holds the text. Not cut by `max`. */
function AvatarGroupCount({
  className,
  size,
  color,
  variant,
  children,
  ...props
}: Omit<React.ComponentProps<typeof AvatarPrimitive.Root>, "color"> & { size?: AvatarSize; color?: AvatarColor; variant?: AvatarVariant }) {
  return (
    <Avatar data-slot="avatar-group-count" size={size} color={color} variant={variant} className={className} {...props}>
      <AvatarFallback>{children}</AvatarFallback>
    </Avatar>
  )
}


/* ---------------------------------------------------------------------------------------------
   AvatarMarble: a generated avatar for someone with no photo and no name we can trust (a recipient known only by their email).
   A soft, blurred marble whose colours come from a hue picked from the seed, so every person gets their own colour world
   (blue, coral, violet, amber...), the same one every time. After the "marble" avatars of Boring Avatars. For the person
   signed in, use initials (or their photo) on a regular Avatar instead.
   --------------------------------------------------------------------------------------------- */
const marbleSize = { sm: "size-8", md: "size-10", lg: "size-12", xl: "size-16" } as const
const hashOf = (str: string) => { let h = 0; for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0 } return Math.abs(h) }
const unitOf = (n: number, range: number, index?: number) => { const v = n % range; return index && Math.floor(n / 10 ** index) % 2 === 0 ? -v : v }

/** The hue (0-360) a seed gives its marble, for anything that wants to share the person's colour. */
const marbleHue = (seed: string) => hashOf(seed.trim().toLowerCase()) % 360

function AvatarMarble({
  seed,
  size = "md",
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  /** What identifies the person (their email); the same seed always gives the same marble. */
  seed: string
  size?: keyof typeof marbleSize
}) {
  const id = React.useId().replace(/:/g, "")
  const n = hashOf(seed.trim().toLowerCase())
  const hue = n % 360
  const colours = [`oklch(0.8 0.15 ${hue})`, `oklch(0.42 0.1 ${(hue + 40) % 360})`, `oklch(0.92 0.1 ${(hue + 90) % 360})`]
  const els = [0, 1, 2].map((i) => ({
    color: colours[i],
    x: unitOf(n * (i + 1), 8, 1), y: unitOf(n * (i + 1), 8, 2),
    scale: 1.2 + unitOf(n * (i + 1), 4) / 10, rotate: unitOf(n * (i + 1), 360, 1),
  }))
  return (
    <span data-slot="avatar-marble" aria-hidden className={cn("inline-flex shrink-0 overflow-hidden rounded-full", marbleSize[size], className)} {...props}>
      <svg viewBox="0 0 80 80" fill="none" className="size-full">
        <mask id={`m${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width="80" height="80" style={{ maskType: "alpha" }}><rect width="80" height="80" rx="160" fill="#fff" /></mask>
        <g mask={`url(#m${id})`}>
          <rect width="80" height="80" fill={els[0].color} />
          <path filter={`url(#f${id})`} d="M32.414 59.35L50.376 70.5H72.5v-71H33.728L26.5 13.381l19.057 27.08L32.414 59.35z" fill={els[1].color} transform={`translate(${els[1].x} ${els[1].y}) rotate(${els[1].rotate} 40 40) scale(${els[1].scale})`} />
          <path filter={`url(#f${id})`} style={{ mixBlendMode: "overlay" }} d="M22.216 24L0 46.75l14.108 38.129L78 86l-3.081-59.276-22.378 4.005 12.972 20.186-23.35 27.395L22.216 24z" fill={els[2].color} transform={`translate(${els[2].x} ${els[2].y}) rotate(${els[2].rotate} 40 40) scale(${els[2].scale})`} />
        </g>
        <defs><filter id={`f${id}`} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB" x="0" y="0" width="80" height="80"><feFlood floodOpacity="0" result="b" /><feBlend in="SourceGraphic" in2="b" result="s" /><feGaussianBlur stdDeviation="7" result="e" /></filter></defs>
      </svg>
    </span>
  )
}

export { Avatar, AvatarImage, AvatarFallback, AvatarBadge, AvatarGroup, AvatarGroupCount, AvatarMarble, marbleHue }
export type { AvatarSize, AvatarColor, AvatarVariant }
