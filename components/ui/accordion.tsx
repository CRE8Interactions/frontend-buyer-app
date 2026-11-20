"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { CaretDown } from "@phosphor-icons/react"
import { Accordion as AccordionPrimitive } from "radix-ui"

/* Copied from the reference accordion.css. Rows are 16px padded with a 14px medium trigger, a 16px muted caret that turns
   180 degrees on open (250ms), muted 14px body text with 16px side and bottom padding, and a 1px separator under every
   item except the last. Hover on a closed row is a faint wash. `surface` puts the group on the surface fill with 24px
   corners, an inset separator (3% in, 94% wide) and the default fill on hover. The panel opens in 200ms (height and
   opacity). The open item (trigger and panel together) sits on a rounded box with the same fill as a hovered row (no lighter) and loses its separator: this is the
   accordion style for the whole app. */
type AccordionProps = React.ComponentProps<typeof AccordionPrimitive.Root> & {
  /** default: rows on the page. surface: one rounded group on the surface fill. card: rows inside a card or tinted panel you provide; the open item uses the same wash as a hovered row in light and dark. */
  variant?: "default" | "surface" | "card"
}

function Accordion({ className, variant = "default", ...props }: AccordionProps) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      data-variant={variant}
      className={cn(
        "group/accordion w-full",
        /* --hover-fill is the wash on a hovered closed row: the foreground over whatever is behind. --open-fill is the open item's box: the same wash, in every variant and both modes. Tokens only. */
        "[--hover-fill:color-mix(in_oklab,var(--h-foreground)_3%,transparent)] [--open-fill:var(--hover-fill)]",
        variant === "surface" && "rounded-[24px] bg-h-surface [:root:not([data-nt=light])_&]:bg-h-field",
        className
      )}
      {...props}
    />
  )
}

function AccordionItem({
  className,
  hideSeparator,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item> & { hideSeparator?: boolean }) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      data-hide-separator={hideSeparator ? "true" : undefined}
      className={cn(
        /* an open item (its trigger and panel together) is one box on the same fill as a hovered row (no lighter), so it reads as set apart and the settings around it stay put */
        "relative overflow-clip rounded-[20px] border-none transition-colors duration-200 ease-[var(--e-out)] motion-reduce:transition-none",
        "data-[state=open]:bg-[var(--open-fill)] group-data-[variant=surface]/accordion:data-[state=open]:bg-h-default data-[state=open]:after:hidden",
        "after:absolute after:bottom-0 after:start-0 after:h-px after:w-full after:rounded-xs after:bg-h-separator after:content-['']",
        "last:after:content-none data-[hide-separator=true]:after:hidden",
        "group-data-[variant=surface]/accordion:after:start-[3%] group-data-[variant=surface]/accordion:after:w-[94%] group-data-[variant=surface]/accordion:after:bg-h-surface-foreground/6",
        className
      )}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group/trigger flex min-h-11 flex-1 cursor-pointer touch-manipulation select-none items-center justify-between gap-4 px-4 py-4 text-start text-sm font-medium h-no-highlight outline-none",
          "[transition:opacity_150ms_var(--e-out),box-shadow_150ms_var(--e-out),background-color_150ms_var(--e-out)] motion-reduce:transition-none",
          "[@media(hover:hover)]:hover:not-aria-expanded:bg-[var(--hover-fill)]",
          "[@media(hover:hover)]:group-data-[variant=surface]/accordion:hover:not-aria-expanded:bg-h-default",
          "focus-visible:h-focus-ring disabled:h-status-disabled aria-disabled:h-status-disabled",
          "group-data-[variant=surface]/accordion:in-[[data-slot=accordion-item]:first-child]:rounded-t-[24px]",
          "group-data-[variant=surface]/accordion:in-[[data-slot=accordion-item]:last-child]:not-aria-expanded:rounded-b-[24px]",
          className
        )}
        {...props}
      >
        {children}
        <CaretDown
          aria-hidden
          weight="bold"
          className="pointer-events-none ms-auto size-4 shrink-0 text-h-muted transition-transform duration-250 ease-[var(--e-out)] motion-reduce:transition-none group-data-[state=open]/trigger:-rotate-180"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="overflow-clip text-sm data-[state=closed]:animate-[accordion-close_200ms_cubic-bezier(0.25,0.46,0.45,0.94)] data-[state=open]:animate-[accordion-open_200ms_cubic-bezier(0.25,0.46,0.45,0.94)] motion-reduce:animate-none"
      {...props}
    >
      <div className={cn("px-4 pt-0 pb-4 text-h-muted", className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
