"use client"

import * as React from "react"
import { cva } from "class-variance-authority"
import { Dialog as DialogPrimitive } from "radix-ui"

import { Button } from "@/components/ui/button"
import { CloseButton } from "@/components/ui/close-button"
import { cn } from "@/lib/utils"
import { iconTile, type IconTone } from "@/lib/icon-tile"
import { useScrollFade } from "@/lib/scroll-fade"

const DialogModalContext = React.createContext(true)

function Dialog({
  modal = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return (
    <DialogModalContext.Provider value={modal}>
      <DialogPrimitive.Root modal={modal} data-slot="dialog" {...props} />
    </DialogModalContext.Provider>
  )
}

function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal(props: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

const backdropVariants = cva("", {
  variants: {
    backdrop: {
      opaque: "bg-h-backdrop",
      blur: "bg-h-backdrop backdrop-blur-md [@media(hover:none)_and_(pointer:coarse)]:backdrop-blur-none",
      transparent: "bg-transparent",
    },
  },
})

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-[60] bg-h-backdrop motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=closed]:duration-100 motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=open]:duration-150",
        className
      )}
      {...props}
    />
  )
}

const dialogVariants = cva(
  "pointer-events-auto relative flex min-h-0 w-full flex-col rounded-[24px] bg-h-overlay p-6 text-h-overlay-foreground shadow-h-overlay outline-none [&>[data-slot=dialog-header]+*:not([data-slot=dialog-footer])]:mt-4",
  {
    variants: {
      size: {
        xs: "max-w-[320px]",
        sm: "max-w-[384px]",
        md: "max-w-[448px]",
        lg: "max-w-[512px]",
        cover: "flex-1",
        full: "flex-1 rounded-none shadow-none",
      },
      placement: {
        auto: "mt-auto sm:my-auto",
        center: "my-auto",
        top: "",
        bottom: "mt-auto",
      },
      scroll: {
        inside: "max-h-full overflow-y-auto has-[>[data-slot=dialog-body]]:overflow-clip [&>[data-slot=dialog-body]]:overflow-y-auto [&>[data-slot=dialog-body]]:overscroll-contain",
        outside: "shrink-0",
      },
    },
  }
)

type DialogContentProps = React.ComponentProps<typeof DialogPrimitive.Content> & {
  size?: "xs" | "sm" | "md" | "lg" | "cover" | "full"
  placement?: "auto" | "center" | "top" | "bottom"
  scroll?: "inside" | "outside"
  backdrop?: "opaque" | "blur" | "transparent"
  backdropClassName?: string
  portalContainer?: React.ComponentProps<typeof DialogPortal>["container"]
  dismissable?: boolean
  keyboardDismissDisabled?: boolean
  showCloseButton?: boolean
  /** No enter or exit animation. Use for keyboard-opened surfaces. */
  instant?: boolean
}

function DialogContent({
  className,
  children,
  size = "md",
  placement = "auto",
  scroll = "inside",
  backdrop = "opaque",
  backdropClassName,
  portalContainer,
  dismissable = true,
  keyboardDismissDisabled = false,
  showCloseButton = true,
  instant = false,
  onPointerDownOutside,
  onEscapeKeyDown,
  ...props
}: DialogContentProps) {
  const modal = React.useContext(DialogModalContext)
  const viewport = (
    <div className={cn("relative h-dvh", scroll === "outside" && "overflow-y-auto overscroll-contain")}>
      <div className={cn(
        "flex w-full flex-col items-center",
        scroll === "inside" ? "h-full" : "min-h-full",
        size !== "full" && "p-4 sm:p-10"
      )}>
        <DialogPrimitive.Content
          data-slot="dialog-content"
          data-placement={placement}
          data-instant={instant ? "" : undefined}
          className={cn(
            dialogVariants({ size, placement, scroll }),
            scroll === "outside" && size === "cover" && "min-h-[calc(100dvh-2rem)] sm:min-h-[calc(100dvh-5rem)]",
            scroll === "outside" && size === "full" && "min-h-dvh",
            className
          )}
          onPointerDownOutside={(event) => {
            onPointerDownOutside?.(event)
            if (!dismissable) event.preventDefault()
          }}
          onEscapeKeyDown={(event) => {
            onEscapeKeyDown?.(event)
            if (keyboardDismissDisabled) event.preventDefault()
          }}
          {...props}
        >
          {children}
          {showCloseButton && (
            <DialogPrimitive.Close asChild>
              <CloseButton data-slot="dialog-close" className="absolute end-4 top-4" />
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </div>
    </div>
  )

  return (
    <DialogPortal container={portalContainer}>
      {modal ? (
        <DialogPrimitive.Overlay
          data-slot="dialog-overlay"
          className={cn(
            "group/dialog-overlay fixed inset-0 z-[60]",
            // Keep the overlay mounted during the panel's exit without fading the panel twice. 150ms is the panel's own leave time (--modal-close-dur).
            !instant && "motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:duration-150"
          )}
        >
          <div
            aria-hidden="true"
            data-slot="dialog-backdrop"
            className={cn(
              "pointer-events-none absolute inset-0",
              backdropVariants({ backdrop }),
              !instant && "motion-safe:group-data-[state=open]/dialog-overlay:animate-in motion-safe:group-data-[state=open]/dialog-overlay:fade-in-0 motion-safe:group-data-[state=open]/dialog-overlay:duration-150 motion-safe:group-data-[state=closed]/dialog-overlay:animate-out motion-safe:group-data-[state=closed]/dialog-overlay:fade-out-0 motion-safe:group-data-[state=closed]/dialog-overlay:duration-150 motion-safe:group-data-[state=closed]/dialog-overlay:fill-mode-forwards",
              backdropClassName
            )}
          />
          {viewport}
        </DialogPrimitive.Overlay>
      ) : (
        <div className="pointer-events-none fixed inset-0 z-[60]">{viewport}</div>
      )}
    </DialogPortal>
  )
}

type DialogAlign = "start" | "stack" | "center"
const DialogAlignContext = React.createContext<DialogAlign>("start")

/* `start`: icon beside the text (default). `stack`: icon above, text left. `center`: icon above, text and actions centred. */
function DialogHeader({ className, align = "start", ...props }: React.ComponentProps<"div"> & { align?: DialogAlign }) {
  return (
    <DialogAlignContext.Provider value={align}>
      <div
        data-slot="dialog-header"
        data-align={align}
        className={cn(
          "flex shrink-0 flex-col pr-8 text-left",
          "data-[align=start]:has-data-[slot=dialog-icon]:grid data-[align=start]:has-data-[slot=dialog-icon]:grid-cols-[auto_1fr] data-[align=start]:has-data-[slot=dialog-icon]:gap-x-4",
          "data-[align=stack]:items-start data-[align=stack]:*:data-[slot=dialog-icon]:mb-5 data-[align=stack]:*:data-[slot=dialog-icon]:ms-1",
          "data-[align=center]:items-center data-[align=center]:pr-0 data-[align=center]:text-center data-[align=center]:*:data-[slot=dialog-icon]:mb-5 data-[align=center]:*:data-[slot=dialog-icon]:size-14 data-[align=center]:*:data-[slot=dialog-icon]:rounded-[20px] data-[align=center]:*:data-[slot=dialog-icon]:[--tile-halo:6px]",
          className
        )}
        {...props}
      />
    </DialogAlignContext.Provider>
  )
}

/* The same tile as the alert dialog's media: 48px, 16px radius, 24px glyph, 4px halo, beside the title and description. */
function DialogIcon({ className, tone = "default", ...props }: React.ComponentProps<"div"> & { tone?: IconTone }) {
  return (
    <div
      aria-hidden="true"
      data-slot="dialog-icon"
      data-tone={tone}
      className={cn("relative row-span-2 mx-1 flex size-12 shrink-0 select-none items-center justify-center self-center rounded-[16px] [--tile-halo:4px] [&_svg]:size-6 data-[slot=dialog-icon]:[[data-align=center]_&]:mx-0", iconTile(tone), className)}
      {...props}
    />
  )
}

function DialogBody({ className, style, ...props }: React.ComponentProps<"div">) {
  const fade = useScrollFade<HTMLDivElement>()
  return (
    <div
      ref={fade.ref}
      data-slot="dialog-body"
      style={{ ...fade.style, ...style }}
      className={cn("-mx-[3px] min-h-0 flex-1 p-[3px] text-sm leading-5 text-h-muted", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  align,
  children,
  ...props
}: React.ComponentProps<"div"> & { showCloseButton?: boolean; align?: "end" | "center" | "stretch" }) {
  const a = align ?? "end"
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "mt-6 flex shrink-0 items-center gap-2 max-sm:flex-col-reverse max-sm:*:w-full",
        a === "end" && "justify-end",
        a === "center" && "justify-center *:flex-1",
        a === "stretch" && "*:flex-1",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("col-start-2 text-lg leading-7 font-semibold text-h-foreground", className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("col-start-2 text-sm leading-5 text-h-muted [[data-slot=dialog-header]_&]:mt-1", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogIcon,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
