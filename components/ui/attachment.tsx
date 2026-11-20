import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

import { Button } from "@/components/ui/button"

const attachmentVariants = cva(
  "group/attachment relative flex w-fit max-w-full min-w-0 shrink-0 flex-wrap rounded-[12px] bg-h-surface-secondary text-h-foreground transition-[background-color,box-shadow] duration-150 focus-within:h-focus-ring has-[>a,>button]:hover:bg-h-surface-tertiary data-[state=error]:bg-h-danger-soft data-[state=idle]:border data-[state=idle]:border-dashed data-[state=idle]:border-h-border data-[state=idle]:bg-transparent",
  {
    variants: {
      size: {
        default:
          "gap-3 text-sm has-data-[slot=attachment-content]:px-3 has-data-[slot=attachment-content]:py-2.5 has-data-[slot=attachment-media]:p-2.5",
        sm: "gap-2.5 rounded-[10px] text-sm has-data-[slot=attachment-content]:px-2.5 has-data-[slot=attachment-content]:py-2 has-data-[slot=attachment-media]:p-2",
        xs: "gap-2 rounded-[8px] text-xs has-data-[slot=attachment-content]:px-2 has-data-[slot=attachment-content]:py-1.5 has-data-[slot=attachment-media]:p-1.5",
      },
      orientation: {
        horizontal: "min-w-40 items-center",
        vertical: "w-24 flex-col has-data-[slot=attachment-content]:w-30",
      },
    },
  }
)

function Attachment({
  className,
  state = "done",
  size = "default",
  orientation = "horizontal",
  shape = "rounded",
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof attachmentVariants> & {
    /** rounded = 16px corners with a rounded tile, pill = fully round chip with a circular tile */
    shape?: "rounded" | "pill"
    state?: "idle" | "uploading" | "processing" | "error" | "done"
  }) {
  return (
    <div
      data-slot="attachment"
      data-state={state}
      data-size={size}
      data-orientation={orientation}
      data-shape={shape}
      className={cn(attachmentVariants({ size, orientation }), shape === "pill" && orientation === "horizontal" && "rounded-full has-data-[slot=attachment-content]:pr-5 has-data-[slot=attachment-media]:p-1.5 has-data-[slot=attachment-media]:pr-4", className)}
      {...props}
    />
  )
}

const attachmentMediaVariants = cva(
  "relative flex aspect-square w-10 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-h-surface text-h-surface-foreground group-data-[state=idle]/attachment:bg-h-default group-data-[orientation=vertical]/attachment:w-full group-data-[size=sm]/attachment:w-8 group-data-[size=xs]/attachment:w-7 group-data-[size=xs]/attachment:rounded-[6px] group-data-[shape=pill]/attachment:group-data-[orientation=horizontal]/attachment:rounded-full group-data-[state=error]/attachment:bg-h-surface group-data-[state=error]/attachment:text-h-danger-text group-data-[orientation=vertical]/attachment:*:data-[slot=spinner]:size-6! [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5 group-data-[size=sm]/attachment:[&_svg:not([class*='size-'])]:size-4 group-data-[orientation=vertical]/attachment:[&_svg:not([class*='size-'])]:size-6 group-data-[size=xs]/attachment:[&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        icon: "",
        image:
          "opacity-60 group-data-[state=done]/attachment:opacity-100 group-data-[state=idle]/attachment:opacity-100 *:[img]:aspect-square *:[img]:w-full *:[img]:object-cover",
      },
    },
    defaultVariants: {
      variant: "icon",
    },
  }
)

/* `progress` (0-100) draws a ring around the icon while uploading: a 2.5px accent arc on a track, the icon
   shrinks to 16px inside it. */
function AttachmentMedia({
  className,
  variant = "icon",
  progress,
  children,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof attachmentMediaVariants> & { progress?: number }) {
  const ring = progress !== undefined
  const v = ring ? Math.max(0, Math.min(100, progress)) : 0
  const r = 16
  const c = 2 * Math.PI * r
  return (
    <div
      data-slot="attachment-media"
      data-variant={variant}
      data-progress={ring ? v : undefined}
      className={cn(attachmentMediaVariants({ variant }), ring && "rounded-full group-data-[size=xs]/attachment:rounded-full [&>svg:not([data-slot=attachment-ring])]:size-4!", className)}
      {...props}
    >
      {children}
      {ring ? (
        <svg
          data-slot="attachment-ring"
          viewBox="0 0 40 40"
          role="progressbar"
          aria-valuenow={v}
          aria-valuemin={0}
          aria-valuemax={100}
          className="pointer-events-none absolute inset-0 size-full -rotate-90"
        >
          <circle cx="20" cy="20" r={r} fill="none" strokeWidth="2.5" className="stroke-h-border" />
          <circle
            cx="20"
            cy="20"
            r={r}
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - v / 100)}
            className="stroke-h-accent transition-[stroke-dashoffset] duration-300 ease-[var(--e-out)]"
          />
        </svg>
      ) : null}
    </div>
  )
}

function AttachmentContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="attachment-content"
      className={cn(
        "max-w-full min-w-0 flex-1 group-data-[orientation=vertical]/attachment:px-1",
        className
      )}
      {...props}
    />
  )
}

function AttachmentTitle({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="attachment-title"
      className={cn(
        "block max-w-full min-w-0 truncate text-sm leading-5 font-medium group-data-[state=processing]/attachment:animate-[t-skel-pulse_var(--pulse-dur)_ease-in-out_var(--pulse-count)] group-data-[state=uploading]/attachment:animate-[t-skel-pulse_var(--pulse-dur)_ease-in-out_var(--pulse-count)] motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  )
}

function AttachmentDescription({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="attachment-description"
      className={cn(
        "block min-w-0 truncate text-xs leading-4 text-h-muted group-data-[state=error]/attachment:text-h-danger-text",
        "max-w-full",
        className
      )}
      {...props}
    />
  )
}

function AttachmentActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="attachment-actions"
      className={cn(
        "relative z-20 flex shrink-0 items-center group-data-[orientation=vertical]/attachment:absolute group-data-[orientation=vertical]/attachment:top-3 group-data-[orientation=vertical]/attachment:right-3 group-data-[orientation=vertical]/attachment:gap-1",
        className
      )}
      {...props}
    />
  )
}

function AttachmentAction({
  className,
  variant,
  size = "icon-sm",
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      data-slot="attachment-action"
      variant={variant ?? "ghost"}
      size={size}
      className={cn(
        /* The highlight follows the chip: a tertiary surface step normally, a red tint on an error chip. */
        "[--button-bg-hover:color-mix(in_oklab,var(--h-surface-secondary)_86%,var(--h-foreground))] [--button-bg-pressed:color-mix(in_oklab,var(--h-surface-secondary)_82%,var(--h-foreground))]",
        "group-data-[state=idle]/attachment:[--button-bg-hover:var(--h-default)] group-data-[state=idle]/attachment:[--button-bg-pressed:var(--h-default)]",
        "group-data-[state=error]/attachment:[--button-bg-hover:var(--h-danger-soft-hover)] group-data-[state=error]/attachment:[--button-bg-pressed:var(--h-danger-soft-hover)] group-data-[state=error]/attachment:[--button-fg:var(--h-danger-text)]",
        className
      )}
      {...props}
    />
  )
}

function AttachmentTrigger({
  className,
  asChild = false,
  type,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean
}) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="attachment-trigger"
      type={asChild ? undefined : (type ?? "button")}
      className={cn("absolute inset-0 z-10 outline-none", className)}
      {...props}
    />
  )
}

function AttachmentGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="attachment-group"
      className={cn(
        "flex min-w-0 scroll-fade-x snap-x snap-mandatory scroll-px-1 scrollbar-none gap-3 overflow-x-auto overscroll-x-contain py-1 *:data-[slot=attachment]:flex-none *:data-[slot=attachment]:snap-start",
        className
      )}
      {...props}
    />
  )
}

export {
  Attachment,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentAction,
  AttachmentTrigger,
}
