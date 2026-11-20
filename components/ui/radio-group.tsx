"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"

/**
 * the reference Radio / RadioGroup on Radix. RadioGroupItem is the 20px control; pass `label` / `description`
 * for the full reference field. Spec: docs/style-ref/radio.css, radio-group.css.
 * The fill and the hole are variables (--radio-fill, --radio-hole) so they animate; the selected dot is the indicator's ::before.
 * The control carries `group/radio` and the group `group/radio-group`, so the indicator and the secondary variant react to their state.
 */
const controlLayout = "group/radio relative inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full shadow-(--h-control-outline) h-no-highlight"
const controlFill = [
  "[--radio-fill:var(--h-field)] [--radio-hole:0px]",
  "[background-image:radial-gradient(circle_at_center,transparent_var(--radio-hole),var(--radio-fill)_calc(var(--radio-hole)_+_0.5px))] [background-origin:border-box]",
].join(" ")
const controlMotion =
  "[transition:--radio-fill_260ms_cubic-bezier(0,0,0.2,1),--radio-hole_260ms_cubic-bezier(0,0,0.2,1),box-shadow_260ms_cubic-bezier(0,0,0.2,1),transform_100ms_cubic-bezier(0,0,0.2,1)] motion-reduce:[transition:none]"
const controlStates = [
  "focus-visible:h-focus-ring data-[focus-visible=true]:h-focus-ring",
  "active:scale-95 data-[pressed=true]:scale-95",
  /* inside a secondary group: the default fill, no outline */
  "group-data-[variant=secondary]/radio-group:shadow-none group-data-[variant=secondary]/radio-group:data-[state=unchecked]:[--radio-fill:var(--h-default)]",
  /* unchecked hover (it wins over the secondary fill) */
  "[@media(hover:hover)]:hover:data-[slot=radio]:data-[state=unchecked]:[--radio-fill:var(--h-field-hover)] [@media(hover:hover)]:hover:data-[slot=radio]:data-[state=unchecked]:shadow-(--h-control-outline-hover)",
  "[@media(hover:hover)]:data-[hovered=true]:data-[slot=radio]:data-[state=unchecked]:[--radio-fill:var(--h-field-hover)] [@media(hover:hover)]:data-[hovered=true]:data-[slot=radio]:data-[state=unchecked]:shadow-(--h-control-outline-hover)",
  "data-[state=checked]:shadow-none data-[state=checked]:[--radio-fill:var(--h-accent)] data-[state=checked]:[--radio-hole:var(--h-radio-hole)]",
  "data-[state=checked]:active:[--radio-fill:var(--h-accent-hover)] data-[state=checked]:active:[--radio-hole:calc(var(--h-radio-hole)_*_1.25)]",
  "data-[state=checked]:data-[pressed=true]:[--radio-fill:var(--h-accent-hover)] data-[state=checked]:data-[pressed=true]:[--radio-hole:calc(var(--h-radio-hole)_*_1.25)]",
  "aria-invalid:h-invalid-field-ring",
].join(" ")
/* Cards look the same in every variant, so the circle inside keeps the primary look even in a secondary group */
const cardCircle =
  "group-data-[variant=secondary]/radio-group:data-[state=unchecked]:shadow-(--h-control-outline) group-data-[variant=secondary]/radio-group:data-[state=unchecked]:[--radio-fill:var(--h-field)] group-data-[variant=secondary]/radio-group:[--radio-inner:var(--h-field)] group-data-[variant=secondary]/radio-group:group-hover/card:data-[state=unchecked]:shadow-(--h-control-outline-hover) group-data-[variant=secondary]/radio-group:group-hover/card:data-[state=unchecked]:[--radio-fill:var(--h-field-hover)] group-data-[variant=secondary]/radio-group:group-hover/card:[--radio-inner:var(--h-field-hover)]"
const radioControl = [controlLayout, controlFill, controlMotion, controlStates].join(" ")
/* A control without a label row dims itself; with one, the field wrapper dims */
const controlStandalone = "disabled:h-status-disabled aria-disabled:h-status-disabled data-[disabled=true]:h-status-disabled"

const indicatorClass = [
  "pointer-events-none absolute inset-0 flex items-center justify-center",
  /* 3px smaller than the control so the outline shows around it instead of being painted over */
  "before:size-[calc(100%-3px)] before:scale-100 before:rounded-full before:bg-h-field before:content-['']",
  "before:[transition:scale_260ms_cubic-bezier(0,0,0.2,1),background-color_260ms_cubic-bezier(0,0,0.2,1)] motion-reduce:before:[transition:none]",
  /* unchecked hover lightens the inside */
  "[@media(hover:hover)]:group-hover/radio:group-data-[state=unchecked]/radio:before:bg-h-field-hover",
  "[@media(hover:hover)]:group-data-[hovered=true]/radio:group-data-[state=unchecked]/radio:before:bg-h-field-hover",
  "data-[slot=radio-indicator]:group-data-[variant=secondary]/radio-group:group-data-[state=unchecked]/radio:before:bg-(--radio-inner,var(--h-default))",
  /* selected: the dot shrinks from full size to about 8px and turns a dark green, 10px while pressed */
  "group-data-[state=checked]/radio:before:scale-[0.47] group-data-[state=checked]/radio:before:bg-(color:--h-radio-dot)",
  "group-active/radio:group-data-[state=checked]/radio:before:scale-[0.6] group-data-[pressed=true]/radio:group-data-[state=checked]/radio:before:scale-[0.6]",
].join(" ")

/* Type scale: the group heading is 16px semibold, an option's label 14px medium, its description 13px regular and muted, and
   a trailing note (a price) 14px medium with tabular numbers. The description lines up under the label text (20px control
   + 10px gap = 30px). Options sit 12px apart; label and description 2px apart. */
const fieldClass = "flex flex-col items-start gap-0.5 h-no-highlight data-[disabled=true]:h-status-disabled"
const contentClass = "relative flex w-full cursor-pointer items-center gap-2.5 py-1 text-sm leading-5 font-medium text-h-foreground select-none"
const descriptionClass = "w-full min-w-0 cursor-default ps-[30px] text-[13px] leading-5 text-wrap wrap-break-word text-h-muted select-none"
const metaClass = "ms-auto shrink-0 ps-4 text-sm leading-5 font-medium text-h-foreground tabular-nums select-none"

/* Card layout: each option is a card (field fill, soft outline, 16px corners, 16px padding). The whole card is the label,
   so clicking anywhere chooses it. The chosen card takes the soft accent fill and a 2px accent outline. */
const cardClass = [
  "w-full cursor-pointer rounded-[16px] bg-h-field p-4 shadow-(--h-field-outline) h-no-highlight",
  "[transition:background-color_150ms_ease,box-shadow_150ms_var(--e-out)] motion-reduce:[transition:none]",
  /* hover steps an unchosen card up; a chosen card keeps its accent tint and outline and only deepens the tint */
  "[@media(hover:hover)]:not-has-[[data-state=checked]]:hover:bg-h-field-hover",
  "has-[[data-state=checked]]:bg-h-accent-soft has-[[data-state=checked]]:shadow-[inset_0_0_0_2px_var(--h-accent)] [@media(hover:hover)]:has-[[data-state=checked]]:hover:bg-h-accent-soft-hover",
  "has-[:focus-visible]:h-focus-ring data-[disabled=true]:h-status-disabled data-[disabled=true]:cursor-not-allowed",
].join(" ")
const RadioLayoutContext = React.createContext<"list" | "card">("list")

type RadioGroupProps = React.ComponentProps<typeof RadioGroupPrimitive.Root> & {
  variant?: "primary" | "secondary"
  /** `list` is plain rows (default); `card` makes each option a selectable card. */
  layout?: "list" | "card"
  /** Group label shown above the items. */
  label?: React.ReactNode
  description?: React.ReactNode
  isInvalid?: boolean
  errorMessage?: React.ReactNode
}

function RadioGroup({
  className,
  variant = "primary",
  orientation = "vertical",
  layout = "list",
  label,
  description,
  isInvalid,
  errorMessage,
  children,
  ...props
}: RadioGroupProps) {
  const labelId = React.useId()
  const hasLabel = label != null
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      data-variant={variant}
      data-invalid={isInvalid ? "true" : undefined}
      orientation={orientation}
      aria-labelledby={hasLabel ? labelId : props["aria-labelledby"]}
      aria-invalid={isInvalid ? true : undefined}
      className={cn(
        "group/radio-group flex flex-col",
        orientation === "vertical" && "[&>[data-slot=radio]]:mt-3 [&>[data-slot=radio-field]]:mt-3 [&>[data-slot=radio-group-header]+*]:mt-3",
        orientation === "horizontal" && "flex-row flex-wrap items-start gap-x-6 gap-y-3 [&>[data-slot=radio-group-header]]:w-full",
        className
      )}
      {...props}
    >
      {hasLabel || description != null ? (
        <div data-slot="radio-group-header" className="flex flex-col gap-0.5">
          {hasLabel && (
            <span id={labelId} data-slot="label" className="text-base leading-6 font-semibold text-h-foreground select-none">
              {label}
            </span>
          )}
          {description != null && <p data-slot="description" className="text-sm leading-5 text-wrap text-h-muted">{description}</p>}
        </div>
      ) : null}
      <RadioLayoutContext.Provider value={layout}>{children}</RadioLayoutContext.Provider>
      {isInvalid && errorMessage != null && (
        <p data-slot="field-error" className="mt-2 text-sm text-h-danger-text">{errorMessage}</p>
      )}
    </RadioGroupPrimitive.Root>
  )
}

type RadioGroupItemProps = React.ComponentProps<typeof RadioGroupPrimitive.Item> & {
  label?: React.ReactNode
  description?: React.ReactNode
  /** A note at the end of the option, such as a price. */
  meta?: React.ReactNode
  isInvalid?: boolean
  wrapperClassName?: string
}

function RadioGroupItem({
  className,
  label,
  description,
  meta,
  isInvalid,
  wrapperClassName,
  disabled,
  ...props
}: RadioGroupItemProps) {
  const layout = React.useContext(RadioLayoutContext)
  const hasField = label != null || description != null
  const control = (
    <RadioGroupPrimitive.Item
      data-slot="radio"
      disabled={disabled}
      aria-invalid={isInvalid ? true : props["aria-invalid"]}
      className={cn(radioControl, layout === "card" && cardCircle, !hasField && controlStandalone, className)}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        forceMount
        data-slot="radio-indicator"
        className={indicatorClass}
      />
    </RadioGroupPrimitive.Item>
  )

  if (!hasField) return control

  if (layout === "card") {
    return (
      <label
        data-slot="radio-field"
        data-layout="card"
        data-disabled={disabled ? "true" : undefined}
        className={cn("group/card", cardClass, "grid grid-cols-[auto_1fr_auto] items-start gap-x-3", wrapperClassName)}
      >
        <span className="mt-px">{control}</span>
        <span className="flex min-w-0 flex-col gap-0.5">
          {label != null && <span data-slot="label" className="text-sm leading-5 font-medium text-h-foreground select-none">{label}</span>}
          {description != null && <span data-slot="description" className="text-[13px] leading-5 text-wrap text-h-muted select-none">{description}</span>}
        </span>
        {meta != null ? <span data-slot="radio-meta" className="text-sm leading-5 font-medium text-h-foreground tabular-nums select-none">{meta}</span> : null}
      </label>
    )
  }

  return (
    <div
      data-slot="radio-field"
      data-disabled={disabled ? "true" : undefined}
      className={cn(fieldClass, wrapperClassName)}
    >
      <label
        data-slot="radio-content"
        className={contentClass}
      >
        {control}
        {label != null && <span data-slot="label" className="select-none">{label}</span>}
        {meta != null ? <span data-slot="radio-meta" className={metaClass}>{meta}</span> : null}
      </label>
      {description != null && (
        <p
          data-slot="description"
          className={descriptionClass}
        >
          {description}
        </p>
      )}
    </div>
  )
}

export { RadioGroup, RadioGroupItem }
export type { RadioGroupProps, RadioGroupItemProps }
