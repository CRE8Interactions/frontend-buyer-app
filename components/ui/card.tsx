import * as React from "react"
import { cn } from "@/lib/utils"

/* the reference card (card.css): 16px padding, 12px gap, 24px radius, surface fill with the surface shadow (light only,
   none on dark). Variants transparent, default, secondary, tertiary. `feature` is our dark card for the one key
   message in view. Brand change: the title is two steps bigger than the reference (18px instead of 14px), body 14px. */
function Card({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & { variant?: "transparent" | "default" | "secondary" | "tertiary" | "feature" }) {
  return (
    <div
      data-slot="card"
      data-variant={variant}
      className={cn(
        "relative flex flex-col gap-3 overflow-visible rounded-[24px] p-4 shadow-h-surface",
        variant === "transparent" && "bg-transparent shadow-none",
        variant === "default" && "bg-h-surface text-h-surface-foreground",
        variant === "secondary" && "bg-h-surface-secondary text-h-surface-secondary-foreground",
        variant === "tertiary" && "bg-h-surface-tertiary text-h-surface-tertiary-foreground",
        variant === "feature" && "bg-feature text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-lg leading-7 font-medium text-inherit", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm leading-5 text-h-muted", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("flex flex-1 flex-col gap-1 text-sm leading-5", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex flex-row items-center", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
