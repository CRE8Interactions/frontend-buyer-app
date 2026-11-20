"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useScrollFade } from "@/lib/scroll-fade"
import { CloseButton } from "@/components/ui/close-button"
import { Dialog as SheetPrimitive } from "radix-ui"

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-h-backdrop data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "fixed z-50 flex flex-col overflow-clip bg-h-overlay text-h-overlay-foreground shadow-h-overlay outline-none transition ease-[var(--e-drawer)] data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:animate-in data-[state=open]:duration-300",
          side === "right" &&
            "inset-y-0 right-0 h-full w-[min(24rem,96vw)] rounded-l-[16px] data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
          side === "left" &&
            "inset-y-0 left-0 h-full w-[min(24rem,96vw)] rounded-r-[16px] data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
          side === "top" &&
            "inset-x-0 top-0 h-auto max-h-[calc(100%-2rem)] w-full rounded-b-[16px] data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
          side === "bottom" &&
            "inset-x-0 bottom-0 h-auto max-h-[calc(100%-2rem)] w-full rounded-t-[16px] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close asChild>
            <CloseButton data-slot="sheet-close" className="absolute end-3 top-3 z-10" />
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex shrink-0 flex-col px-5 pt-4 pb-2 pe-12", className)}
      {...props}
    />
  )
}

/** The scrolling middle of a sheet: 20px side padding, 8px top and bottom. */
function SheetBody({ className, style, ...props }: React.ComponentProps<"div">) {
  const fade = useScrollFade<HTMLDivElement>()
  return <div ref={fade.ref} data-slot="sheet-body" className={cn("min-h-0 flex-auto overflow-y-auto px-5 py-2 text-sm leading-5 text-h-muted", className)} {...props} style={{ ...fade.style, ...style }} />
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex shrink-0 flex-col gap-2 px-5 pt-2 pb-4 *:data-[slot=button]:w-full sm:flex-row sm:items-center sm:justify-end sm:*:data-[slot=button]:w-auto", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-lg leading-7 font-semibold text-h-foreground", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("mt-1 text-sm leading-5 text-h-muted", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
