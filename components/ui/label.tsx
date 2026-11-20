"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Label as LabelPrimitive } from "radix-ui"
import { Info } from "@phosphor-icons/react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const labelBase = "text-sm font-medium text-h-foreground select-none"
// required: the danger asterisk, also when the parent carries data-required (except groups)
const labelRequired = [
  "data-[required=true]:after:ms-0.5 data-[required=true]:after:text-h-danger-text data-[required=true]:after:content-['*']",
  "[[data-required=true]:not([role=group]):not([role=radiogroup])>&]:after:ms-0.5",
  "[[data-required=true]:not([role=group]):not([role=radiogroup])>&]:after:text-h-danger-text",
  "[[data-required=true]:not([role=group]):not([role=radiogroup])>&]:after:content-['*']",
].join(" ")
// disabled: own, a parent's, a group's or a disabled peer
const labelDisabled = [
  "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed",
  "[[data-disabled=true]_&]:pointer-events-none [[data-disabled=true]_&]:opacity-50 [[data-disabled=true]_&]:cursor-not-allowed",
  "group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
  "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
].join(" ")
// invalid: own, a parent's data-invalid / aria-invalid
const labelInvalid = "data-[invalid=true]:text-h-danger-text [[data-invalid=true]_&]:text-h-danger-text [[aria-invalid=true]_&]:text-h-danger-text"
const infoButton = [
  "relative h-touch-44 flex size-4 cursor-help items-center justify-center rounded-full text-h-muted outline-none transition-colors",
  "[@media(hover:hover)]:hover:text-h-foreground [@media(hover:hover)]:data-[hovered=true]:text-h-foreground",
  "focus-visible:h-focus-ring data-[focus-visible=true]:h-focus-ring",
].join(" ")

/**
 * the reference Label: text-sm / medium / foreground.
 * `isRequired` adds the danger asterisk, `isDisabled` the disabled look,
 * `isInvalid` turns it danger. Also reacts to a parent's data-required /
 * data-disabled / data-invalid / aria-invalid like the reference selectors.
 */
function Label({
  className,
  isRequired,
  isDisabled,
  isInvalid,
  info,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root> & {
  isRequired?: boolean
  isDisabled?: boolean
  isInvalid?: boolean
  /** Explanation shown in a tooltip from a small info button after the label (fees, rules, what a field means). */
  info?: React.ReactNode
}) {
  const label = (
    <LabelPrimitive.Root
      data-slot="label"
      data-required={isRequired ? "true" : undefined}
      data-disabled={isDisabled ? "true" : undefined}
      data-invalid={isInvalid ? "true" : undefined}
      className={cn(labelBase, labelRequired, labelDisabled, labelInvalid, className)}
      {...props}
    />
  )
  if (info == null) return label
  return (
    <span className="inline-flex items-center gap-1.5" data-slot="label-with-info">
      {label}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="More information"
            className={infoButton}
          >
            <Info weight="bold" className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>{info}</TooltipContent>
      </Tooltip>
    </span>
  )
}

export { Label }
