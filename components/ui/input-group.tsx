"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

/* The group draws the radius, fill, edge and ring; its control (InputGroupInput / InputGroupTextarea) has none of its own.
   The group shows the focus ring while its control has focus-visible, the danger ring while a control is invalid, and dims its addons
   when [data-disabled="true"]. */
const groupLayout = "relative flex h-10 w-full min-w-0 items-center rounded-[12px] border-0 outline-none md:h-9"
const groupColour = "bg-h-field shadow-[var(--h-field-outline)] transition-[color,box-shadow,background-color]"
const groupAlignment = [
  "has-[>textarea]:h-auto",
  "has-[>[data-align=inline-start]]:[&>input]:pl-2 has-[>[data-align=inline-end]]:[&>input]:pr-2",
  "has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3",
  "has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3",
].join(" ")
const groupStates = [
  "has-[[data-slot=input-group-control]:focus-visible]:bg-h-field-focus has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-h-focus",
  "has-[[data-slot][aria-invalid=true]]:ring-2 has-[[data-slot][aria-invalid=true]]:ring-h-danger",
].join(" ")

function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn("group/input-group", groupLayout, groupColour, groupAlignment, groupStates, className)}
      {...props}
    />
  )
}

/* The control inside the group: no radius, edge, fill or shadow of its own. */
const groupControl = [
  "flex-1 rounded-none border-0 bg-transparent shadow-none",
  "focus:bg-transparent focus:shadow-none focus-visible:bg-transparent focus-visible:ring-0",
  "aria-invalid:focus:bg-transparent aria-invalid:focus-visible:bg-transparent data-[invalid=true]:focus:bg-transparent data-[invalid=true]:focus-visible:bg-transparent",
  "aria-invalid:ring-0 aria-invalid:outline-none",
  "[&[aria-invalid=true]:not([data-invalid=true])]:bg-transparent [&[aria-invalid=true]:not([data-invalid=true])]:focus:shadow-none",
].join(" ")

const addonBase = [
  "flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground select-none",
  "group-data-[disabled=true]/input-group:opacity-50",
  "[&>kbd]:bg-transparent [&>kbd]:px-0 [&>kbd]:text-sm",
  "[&>svg:not([class*=size-])]:size-4",
].join(" ")

const inputGroupAddonVariants = cva(addonBase, {
  variants: {
    align: {
      "inline-start": "order-first pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]",
      "inline-end": "order-last pr-3 has-[>button]:mr-[-0.45rem] has-[>kbd]:mr-[-0.35rem]",
      "block-start": "order-first w-full justify-start px-3 pt-3 group-has-[>input]/input-group:pt-2.5 [&:is(.border-b)]:pb-3",
      "block-end": "order-last w-full justify-start px-3 pb-3 group-has-[>input]/input-group:pb-2.5 [&:is(.border-t)]:pt-3",
    },
  },
  defaultVariants: {
    align: "inline-start",
  },
})

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) {
          return
        }
        e.currentTarget.parentElement?.querySelector("input")?.focus()
      }}
      {...props}
    />
  )
}

/* A Button inside the group: pill, no shadow, and its own compact sizes (they merge over the Button's, so they win). */
const inputGroupButtonVariants = cva("flex items-center gap-2 text-sm shadow-none", {
  variants: {
    size: {
      xs: "h-6 gap-1 rounded-full px-2.5 md:h-6 has-[>svg]:px-2.5",
      sm: "h-9 gap-1.5 rounded-full px-4 font-semibold md:h-9 has-[>svg]:px-3.5",
      "icon-xs": "relative h-touch-44 size-6 rounded-full p-0 md:size-6 has-[>svg]:p-0",
      "icon-sm": "size-9 rounded-full p-0 md:size-9 has-[>svg]:p-0",
    },
  },
  defaultVariants: {
    size: "xs",
  },
})

function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size = "xs",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size"> &
  VariantProps<typeof inputGroupButtonVariants>) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  )
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("flex items-center gap-2 text-sm text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*=size-])]:size-4", className)}
      {...props}
    />
  )
}

function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn(groupControl, "h-full md:h-full", className)}
      {...props}
    />
  )
}

function InputGroupTextarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <Textarea
      data-slot="input-group-control"
      className={cn(groupControl, "resize-none py-3", className)}
      {...props}
    />
  )
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
}
