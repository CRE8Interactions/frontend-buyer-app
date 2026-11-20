"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { groupedListClass, groupedRowClass } from "@/components/ui/grouped-list"
import { iconTile } from "@/lib/icon-tile"
import { AlertDialog as AlertDialogPrimitive } from "radix-ui"

import { Button } from "@/components/ui/button"

function AlertDialog({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  )
}

function AlertDialogPortal({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
  )
}

function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-h-backdrop data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  )
}

/* Alert dialog. The reference structure (overlay surface, 24px padding, sizes), tightened for a faster read:
   16px corners, a 40px icon tile beside the title instead of above it, a 18px title, 14px body and an optional
   details panel for the facts that matter (who is affected, how much, until when). Actions are right-aligned
   and stack full width on phones with the safe choice last. */
const AlertAlignContext = React.createContext<"start" | "center">("start")

function AlertDialogContent({
  className,
  size = "md",
  align = "start",
  children,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content> & {
  size?: "xs" | "sm" | "md" | "lg" | "default"
  /** `center` stacks the icon above centred text and centres the actions. */
  align?: "start" | "center"
}) {
  const s = size === "default" ? "md" : size
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        data-size={s}
        className={cn(
          "group/alert-dialog-content fixed top-[50%] left-[50%] z-50 flex max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] flex-col overflow-clip rounded-[16px] bg-h-overlay p-6 text-h-overlay-foreground shadow-h-overlay outline-none duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          "data-[size=xs]:max-w-xs data-[size=sm]:max-w-sm data-[size=md]:max-w-md data-[size=lg]:max-w-lg",
          className
        )}
        {...props}
      >
        <AlertAlignContext.Provider value={align}>{children}</AlertAlignContext.Provider>
      </AlertDialogPrimitive.Content>
    </AlertDialogPortal>
  )
}

/* Icon tile and text sit side by side: the tile in column one, title and description in column two. */
function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const align = React.useContext(AlertAlignContext)
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn(
        align === "center"
          ? "flex flex-col items-center text-center *:data-[slot=alert-dialog-media]:mb-4 *:data-[slot=alert-dialog-media]:size-14 *:data-[slot=alert-dialog-media]:rounded-[20px] *:data-[slot=alert-dialog-media]:[--tile-halo:6px]"
          : "flex flex-col text-left has-data-[slot=alert-dialog-media]:grid has-data-[slot=alert-dialog-media]:grid-cols-[auto_1fr] has-data-[slot=alert-dialog-media]:gap-x-4",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const align = React.useContext(AlertAlignContext)
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn("mt-6 flex flex-row items-center gap-2 max-sm:flex-col-reverse max-sm:*:w-full", align === "center" ? "justify-center *:flex-1" : "justify-end", className)}
      {...props}
    />
  )
}

/* The facts behind the decision: the library GroupedList block (grouped-list.tsx) in dl form, so a details panel and every other list look the same. */
function AlertDialogDetails({ className, ...props }: React.ComponentProps<"dl">) {
  return (
    <dl
      data-slot="alert-dialog-details"
      className={cn("mt-5", groupedListClass, className)}
      {...props}
    />
  )
}

function AlertDialogDetail({
  label,
  children,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div data-slot="alert-dialog-detail" className={cn(groupedRowClass, "items-baseline", className)} {...props}>
      <dt className="text-h-muted">{label}</dt>
      <dd className="text-right font-medium tabular-nums text-h-foreground">{children}</dd>
    </div>
  )
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("col-start-2 text-lg leading-7 font-semibold text-h-foreground", className)}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("col-start-2 mt-1 text-sm leading-5 text-h-muted", className)}
      {...props}
    />
  )
}

const mediaTone = {
  default: iconTile("default"),
  accent: iconTile("accent"),
  success: iconTile("success"),
  warning: iconTile("warning"),
  danger: iconTile("danger"),
} as const

/* 48px tile with a 16px radius, a 24px glyph and a 4px halo (shared icon-tile style), tinted by `tone`. Sits beside the title. */
function AlertDialogMedia({
  className,
  tone = "default",
  ...props
}: React.ComponentProps<"div"> & { tone?: keyof typeof mediaTone }) {
  return (
    <div
      data-slot="alert-dialog-media"
      className={cn(
        "row-span-2 mx-1 my-0 self-center flex size-12 shrink-0 items-center justify-center rounded-[16px] [--tile-halo:4px] select-none *:[svg:not([class*='size-'])]:size-6",
        mediaTone[tone],
        className
      )}
      {...props}
    />
  )
}

function AlertDialogAction({
  className,
  variant = "primary",
  size = "md",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action> &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <Button variant={variant} size={size} asChild>
      <AlertDialogPrimitive.Action
        data-slot="alert-dialog-action"
        className={cn(className)}
        {...props}
      />
    </Button>
  )
}

function AlertDialogCancel({
  className,
  variant = "tertiary",
  size = "md",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel> &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <Button variant={variant} size={size} asChild>
      <AlertDialogPrimitive.Cancel
        data-slot="alert-dialog-cancel"
        className={cn(className)}
        {...props}
      />
    </Button>
  )
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDetail,
  AlertDialogDetails,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
}
