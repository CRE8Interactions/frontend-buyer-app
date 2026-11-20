"use client"

import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slider as SliderPrimitive } from "radix-ui"

/**
 * the reference Slider on Radix. Track is 20px tall (w-5 when vertical) in bg-default with an accent fill; the thumb is
 * a 28x20 accent capsule holding a 24x16 white pill. Spec: docs/style-ref/slider.css.
 * Radix has no label/output, so this component renders them (grid: label | output, then track, then marks).
 */

/* Parts of the slider, each with its horizontal / vertical variant. The field is a grid: label | output, then the track, then the marks. */
const sliderFieldVariants = cva("grid w-full gap-1 data-[disabled=true]:h-status-disabled", {
  variants: {
    orientation: {
      horizontal: "grid-cols-[1fr_auto]",
      vertical: "h-full min-h-44 w-auto grid-cols-[1fr] grid-rows-[auto_1fr_auto] gap-2 justify-items-center",
    },
  },
})
const sliderLabelVariants = cva("w-fit text-sm font-medium text-h-foreground", {
  variants: { orientation: { horizontal: "col-start-1 row-start-1", vertical: "order-3 text-center" } },
})
const sliderOutputVariants = cva("text-sm font-medium text-h-foreground tabular-nums", {
  variants: { orientation: { horizontal: "col-start-2 row-start-1", vertical: "order-1 text-center" } },
})
const sliderControlVariants = cva("relative flex touch-none items-center select-none", {
  variants: { orientation: { horizontal: "col-span-2 w-full", vertical: "order-2 h-full w-5 flex-col" } },
})
const sliderTrackVariants = cva("relative grow overflow-hidden rounded-[24px] bg-(--h-track)", {
  variants: { orientation: { horizontal: "h-5 w-full", vertical: "h-full w-5" } },
})
const fillClass = "pointer-events-none absolute bg-h-accent"
const stepClass =
  "pointer-events-none absolute top-1/2 z-1 size-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-h-muted/25 data-[filled=true]:bg-h-accent-foreground/25"
/* The thumb: a 28x20 accent capsule (::after is the white pill). */
const thumbBase = [
  "z-2 flex cursor-grab items-center justify-center rounded-[24px] bg-h-accent h-no-highlight",
  "[transition:background-color_250ms_ease,transform_250ms_var(--e-out),box-shadow_150ms_var(--e-out)] motion-reduce:[transition:none]",
  "after:relative after:z-10 after:origin-center after:rounded-[16px] after:bg-white after:text-black after:shadow-h-field after:transition-[transform,background-color] after:content-[''] motion-reduce:after:[transition:none]",
  "active:cursor-grabbing data-[pressed=true]:cursor-grabbing active:after:scale-90 data-[pressed=true]:after:scale-90 motion-reduce:active:after:scale-100 motion-reduce:data-[pressed=true]:after:scale-100",
  "focus-visible:z-10 focus-visible:h-focus-ring focus-visible:outline-none data-[focus-visible=true]:z-10 data-[focus-visible=true]:h-focus-ring data-[focus-visible=true]:outline-none",
  "data-[disabled]:cursor-default",
].join(" ")
const sliderThumbVariants = cva(thumbBase, {
  variants: { orientation: { horizontal: "h-5 w-7 after:h-4 after:w-6", vertical: "h-7 w-5 after:h-6 after:w-4" } },
})
const marksClass = "relative col-span-2 grid h-4 grid-cols-[minmax(0,1fr)]"
const markClass =
  "absolute w-max -translate-x-1/2 text-xs text-h-muted tabular-nums [transition:color_200ms_ease] motion-reduce:[transition:none] data-[filled=true]:text-h-foreground"

type SliderMark = { value: number; label?: React.ReactNode }

type SliderProps = React.ComponentProps<typeof SliderPrimitive.Root> & {
  /** Text label (top-left). */
  label?: React.ReactNode
  /** Show the current value (top-right). Pass a function to format it. */
  output?: boolean | ((values: number[]) => React.ReactNode)
  /** Marks under the track (horizontal only). */
  marks?: SliderMark[]
  /** Draw a dot for each step (horizontal only, step must be set). */
  showSteps?: boolean
}

// Thumb is 28px wide (24 + 4); Radix keeps its edges inside the track, so centres run 14px .. 100%-14px.
const pos = (p: number, size = 28) => `calc(${size / 2}px + (100% - ${size}px) * ${p})`

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  step = 1,
  orientation = "horizontal",
  disabled,
  label,
  output,
  marks,
  showSteps,
  onValueChange,
  ...props
}: SliderProps) {
  const [internal, setInternal] = React.useState<number[]>(
    Array.isArray(defaultValue) ? defaultValue : [min]
  )
  const values = Array.isArray(value) ? value : internal
  const vertical = orientation === "vertical"
  const frac = (v: number) => (max === min ? 0 : (v - min) / (max - min))
  const range = values.length > 1
  const lo = range ? Math.min(...values) : min
  const hi = range ? Math.max(...values) : values[0]

  const fillStart = range ? pos(frac(lo)) : "0px"
  const fillEnd = pos(frac(hi))

  const stepCount = showSteps && step > 0 ? Math.floor((max - min) / step) : 0
  const steps = Array.from({ length: stepCount + 1 }, (_, i) => min + i * step)

  const outputNode =
    output === true
      ? values.join(" – ")
      : typeof output === "function"
        ? output(values)
        : null

  return (
    <div
      data-slot="slider-field"
      data-orientation={orientation}
      data-disabled={disabled ? "true" : undefined}
      className={cn(sliderFieldVariants({ orientation }), className)}
    >
      {label != null && (
        <span
          data-slot="label"
          className={sliderLabelVariants({ orientation })}
        >
          {label}
        </span>
      )}
      {outputNode != null && (
        <output
          data-slot="slider-output"
          className={sliderOutputVariants({ orientation })}
        >
          {outputNode}
        </output>
      )}
      <SliderPrimitive.Root
        data-slot="slider"
        defaultValue={defaultValue}
        value={value}
        min={min}
        max={max}
        step={step}
        orientation={orientation}
        disabled={disabled}
        onValueChange={(v) => {
          if (value === undefined) setInternal(v)
          onValueChange?.(v)
        }}
        className={cn(
          sliderControlVariants({ orientation }),
          !vertical && (label != null || outputNode != null) && "row-start-2"
        )}
        {...props}
      >
        <SliderPrimitive.Track
          data-slot="slider-track"
          className={sliderTrackVariants({ orientation })}
        >
          <span
            data-slot="slider-fill"
            className={fillClass}
            style={
              vertical
                ? { left: 0, width: "100%", bottom: fillStart, top: `calc(100% - ${fillEnd})` }
                : { top: 0, height: "100%", left: fillStart, right: `calc(100% - ${fillEnd})` }
            }
          />
          {!vertical &&
            steps.map((s) => (
              <span
                key={s}
                data-slot="slider-step"
                data-filled={s >= lo && s <= hi ? "true" : "false"}
                className={stepClass}
                style={{ left: pos(frac(s), 28) }}
              />
            ))}
        </SliderPrimitive.Track>
        {values.map((_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            className={sliderThumbVariants({ orientation })}
          />
        ))}
      </SliderPrimitive.Root>
      {marks != null && marks.length > 0 && !vertical && (
        <div data-slot="slider-marks" className={marksClass}>
          {marks.map((m) => (
            <span
              key={m.value}
              data-slot="slider-mark"
              data-filled={m.value >= lo && m.value <= hi ? "true" : "false"}
              className={markClass}
              style={{ left: pos(frac(m.value), 28) }}
            >
              {m.label ?? m.value}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export { Slider }
export type { SliderProps, SliderMark }
