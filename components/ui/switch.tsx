"use client"

import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Switch as SwitchPrimitive } from "radix-ui"

/**
 * the reference Switch on Radix. The Radix root is the track (control); pass `label` / `description` for the full
 * field. Sizes sm (32x16), md (40x20, default), lg (48x24). Spec: docs/style-ref/switch.css, switch-group.css.
 * The control carries `group/switch` so the thumb icons react to its data-state.
 */
const controlLayout = "group/switch relative flex shrink-0 cursor-pointer items-center overflow-hidden bg-(--h-track) h-no-highlight"
const controlMotion = "[transition:background-color_250ms_ease,box-shadow_150ms_var(--e-out),transform_120ms_var(--e-out)] motion-reduce:[transition:none]"
const controlStates = [
  "focus-visible:h-focus-ring data-[focus-visible=true]:h-focus-ring",
  "[@media(hover:hover)]:hover:bg-[color-mix(in_oklab,var(--h-track),transparent_20%)] [@media(hover:hover)]:data-[hovered=true]:bg-[color-mix(in_oklab,var(--h-track),transparent_20%)]",
  "active:scale-[0.97] active:bg-[color-mix(in_oklab,var(--h-track),transparent_20%)] data-[pressed=true]:scale-[0.97] data-[pressed=true]:bg-[color-mix(in_oklab,var(--h-track),transparent_20%)]",
  "data-[state=checked]:bg-h-accent",
  "[@media(hover:hover)]:hover:data-[state=checked]:bg-h-accent-hover [@media(hover:hover)]:data-[hovered=true]:data-[state=checked]:bg-h-accent-hover",
  "active:data-[state=checked]:bg-h-accent-hover data-[pressed=true]:data-[state=checked]:bg-h-accent-hover",
].join(" ")

const switchControlVariants = cva([controlLayout, controlMotion, controlStates].join(" "), {
  variants: {
    size: {
      sm: "h-4 w-8 rounded-[16px]",
      md: "h-5 w-10 rounded-[24px]",
      lg: "h-6 w-12 rounded-[24px]",
    },
  },
  defaultVariants: { size: "md" },
})
/* A control without a label row dims itself; with one, the field wrapper dims */
const controlStandalone = "disabled:h-status-disabled aria-disabled:h-status-disabled data-[disabled=true]:h-status-disabled"

/* thumb: height, width, radius, offset (100% - width - spacing) */
const thumbBase = [
  "pointer-events-none relative ms-0.5 flex origin-center transform-gpu bg-white text-black shadow-h-field start-0",
  "[transition:inset-inline-start_300ms_var(--e-drawer),background-color_200ms_var(--e-out)] motion-reduce:[transition:none]",
  "data-[state=checked]:bg-white data-[state=checked]:text-h-accent data-[state=checked]:shadow-[0px_0px_5px_0px_rgb(0_0_0/0.02),0px_2px_10px_0px_rgb(0_0_0/0.06),0px_0px_1px_0px_rgb(0_0_0/0.3)] data-[state=checked]:[inset-inline-start:var(--switch-thumb-offset)]",
  "data-[disabled]:bg-h-default-foreground/20 data-[disabled]:data-[state=checked]:bg-white data-[disabled]:data-[state=checked]:opacity-40",
].join(" ")
const switchThumbVariants = cva(thumbBase, {
  variants: {
    size: {
      sm: "h-3 w-[1.03125rem] rounded-[12px] [--switch-thumb-offset:calc(100%_-_1.03125rem_-_var(--h-spacing))]",
      md: "h-4 w-[1.375rem] rounded-[16px] [--switch-thumb-offset:calc(100%_-_1.375rem_-_var(--h-spacing))]",
      lg: "h-5 w-[1.71875rem] rounded-[24px] [--switch-thumb-offset:calc(100%_-_1.71875rem_-_var(--h-spacing))]",
    },
  },
  defaultVariants: { size: "md" },
})
const thumbIconClass = "flex size-full items-center justify-center"
const thumbIconOff = "group-data-[state=checked]/switch:hidden"
const thumbIconOn = "hidden group-data-[state=checked]/switch:flex"

const fieldClass = "flex flex-col items-start gap-1 h-no-highlight data-[disabled=true]:h-status-disabled"
const contentClass = "relative inline-flex cursor-pointer items-center gap-3 text-sm font-medium text-h-foreground select-none"
const descriptionBase = "w-full min-w-0 cursor-default text-xs text-wrap wrap-break-word text-h-muted select-none"
const descriptionSize = {
  sm: "ps-[calc(2rem+0.75rem)]",
  md: "ps-[calc(2.5rem+0.75rem)]",
  lg: "ps-[calc(3rem+0.75rem)]",
} as const

type SwitchSize = "sm" | "md" | "lg" | "default"

type SwitchProps = Omit<React.ComponentProps<typeof SwitchPrimitive.Root>, "size"> & {
  /** "default" is kept as an alias of "md" for existing callers. */
  size?: SwitchSize
  label?: React.ReactNode
  description?: React.ReactNode
  /** Icon shown inside the thumb (always, or only when off if `thumbIconChecked` is given). */
  thumbIcon?: React.ReactNode
  /** Icon shown inside the thumb when on. */
  thumbIconChecked?: React.ReactNode
  wrapperClassName?: string
}

function Switch({
  className,
  size = "md",
  label,
  description,
  thumbIcon,
  thumbIconChecked,
  wrapperClassName,
  disabled,
  ...props
}: SwitchProps) {
  const s: "sm" | "md" | "lg" = size === "default" ? "md" : size
  const hasField = label != null || description != null

  const control = (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={s}
      disabled={disabled}
      className={cn(switchControlVariants({ size: s }), "peer", !hasField && controlStandalone, className)}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={switchThumbVariants({ size: s })}
      >
        {thumbIcon != null && (
          <span
            className={cn(thumbIconClass, thumbIconChecked != null && thumbIconOff)}
          >
            {thumbIcon}
          </span>
        )}
        {thumbIconChecked != null && (
          <span className={cn(thumbIconClass, thumbIconOn)}>
            {thumbIconChecked}
          </span>
        )}
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  )

  if (!hasField) return control

  return (
    <div
      data-slot="switch-field"
      data-disabled={disabled ? "true" : undefined}
      className={cn(fieldClass, wrapperClassName)}
    >
      <label
        data-slot="switch-content"
        className={contentClass}
      >
        {control}
        {label != null && <span data-slot="label" className="select-none">{label}</span>}
      </label>
      {description != null && (
        <p
          data-slot="description"
          className={cn(descriptionBase, descriptionSize[s])}
        >
          {description}
        </p>
      )}
    </div>
  )
}

type SwitchGroupProps = React.ComponentProps<"div"> & {
  orientation?: "horizontal" | "vertical"
}

/** the reference SwitchGroup: flex-col gap-6 wrapper; items row/column gap-4 by orientation. */
function SwitchGroup({ className, orientation = "vertical", children, ...props }: SwitchGroupProps) {
  return (
    <div
      role="group"
      data-slot="switch-group"
      data-orientation={orientation}
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <div
        data-slot="switch-group-items"
        className={cn("flex gap-4", orientation === "horizontal" ? "flex-row" : "flex-col")}
      >
        {children}
      </div>
    </div>
  )
}

export { Switch, SwitchGroup }
export type { SwitchProps, SwitchGroupProps }
