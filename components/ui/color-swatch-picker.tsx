"use client"

import * as React from "react"
import { Check } from "@phosphor-icons/react"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"
import { parseColor, toHex } from "@/lib/color"
import { ColorContext } from "./color-context"
import type { SwatchShape, SwatchSize } from "./color-swatch"

/* Copied from the reference color-swatch-picker.css: a row of colour swatches where one is selected. It is a radio group,
   so arrow keys move the selection, Tab enters and leaves once, and a screen reader hears "radio, 3 of 7".
   Each item is 32px (xs 16, sm 24, lg 36, xl 40) with a transparent border. Hover grows the swatch to 110%. Selecting an
   item colours its border with the swatch colour and shrinks the swatch to 77% so a gap shows between swatch and ring; a
   check scales in from nothing over 150ms (white, or black on pale colours). Shapes: circle (default) and square. Layouts:
   grid (wraps, default) and stack (a column). Focus draws the focus ring, disabled dims the item. */
type PickerLayout = "grid" | "stack"
const PickerContext = React.createContext<{ size: SwatchSize; shape: SwatchShape }>({ size: "md", shape: "circle" })

const itemSize: Record<SwatchSize, string> = {
  xs: "size-4 border",
  sm: "size-6 border-2",
  md: "size-8 border-2",
  lg: "size-9 border-3",
  xl: "size-10 border-3",
}
/* [item radius, swatch radius, swatch radius when selected] per size for the square shape */
const squareRadius: Record<SwatchSize, string> = {
  xs: "rounded-md [&>[data-slot=color-swatch-picker-swatch]]:rounded-md",
  sm: "rounded-lg [&>[data-slot=color-swatch-picker-swatch]]:rounded-lg data-[state=checked]:[&>[data-slot=color-swatch-picker-swatch]]:rounded-md",
  md: "rounded-xl [&>[data-slot=color-swatch-picker-swatch]]:rounded-lg",
  lg: "rounded-xl [&>[data-slot=color-swatch-picker-swatch]]:rounded-lg",
  xl: "rounded-xl [&>[data-slot=color-swatch-picker-swatch]]:rounded-lg",
}

const norm = (v?: string | null) => v?.trim().toLowerCase()

/** Relative luminance of a #rgb or #rrggbb colour. Used to pick a black or white check. Other formats count as dark. */
function isLightColor(color: string) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim())
  if (!m) return false
  const h = m[1].length === 3 ? m[1].replace(/./g, "$&$&") : m[1]
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6
}

type ColorSwatchPickerProps = Omit<React.ComponentProps<typeof RadioGroupPrimitive.Root>, "onChange" | "dir"> & {
  size?: SwatchSize
  variant?: SwatchShape
  layout?: PickerLayout
  /** Called with the chosen colour. Alias of `onValueChange`. */
  onChange?: (color: string) => void
}

function ColorSwatchPicker({
  className,
  size = "md",
  variant = "circle",
  layout = "grid",
  value,
  defaultValue,
  onValueChange,
  onChange,
  onKeyDown,
  "aria-label": ariaLabel = "Color",
  ...props
}: ColorSwatchPickerProps) {
  /* Inside a ColorPicker with no value of its own, the swatches follow the picker's colour and set it when chosen. */
  const picker = React.useContext(ColorContext)
  const synced = picker && value === undefined && defaultValue === undefined
  return (
    <PickerContext.Provider value={{ size, shape: variant }}>
      <RadioGroupPrimitive.Root
        data-slot="color-swatch-picker"
        data-size={size}
        data-variant={variant}
        data-layout={layout}
        aria-label={ariaLabel}
        value={synced ? norm(toHex(picker.color) ?? undefined) : value === undefined ? undefined : norm(value)}
        defaultValue={synced ? undefined : norm(defaultValue)}
        onValueChange={(v) => {
          if (synced) {
            const c = parseColor(v)
            if (c) picker.setColor(c)
          }
          onValueChange?.(v)
          onChange?.(v)
        }}
        orientation={layout === "stack" ? "vertical" : "horizontal"}
        onKeyDown={(e) => {
          onKeyDown?.(e)
          if (e.defaultPrevented) return
          /* Arrow keys select as well as move focus. The radio library only selects when the key is still down as focus
             lands, which a quick tap misses, so choose the neighbouring enabled swatch here. Disabled ones are skipped. */
          const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0
          if (!dir) return
          const radios = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]:not([disabled])'))
          const at = radios.indexOf(e.target as HTMLElement)
          if (at < 0) return
          const next = radios[(at + dir + radios.length) % radios.length]
          e.preventDefault()
          next.focus()
          next.click()
        }}
        className={cn("flex items-center gap-2", layout === "stack" ? "flex-col" : "flex-wrap", className)}
        {...props}
      />
    </PickerContext.Provider>
  )
}

type ColorSwatchPickerItemProps = Omit<React.ComponentProps<typeof RadioGroupPrimitive.Item>, "value" | "color"> & {
  /** The colour this item picks. It is also the value the picker reports. */
  color: string
  /** Accessible name. Defaults to the colour. */
  label?: string
}

function ColorSwatchPickerItem({ color, label, className, style, children, ...props }: ColorSwatchPickerItemProps) {
  const { size, shape } = React.useContext(PickerContext)
  return (
    <RadioGroupPrimitive.Item
      data-slot="color-swatch-picker-item"
      data-light-color={isLightColor(color) ? "true" : undefined}
      value={norm(color) as string}
      aria-label={label ?? color}
      className={cn(
        "group/swatch relative flex shrink-0 cursor-pointer items-center justify-center border-transparent outline-none [-webkit-tap-highlight-color:transparent] transform-gpu",
        itemSize[size],
        shape === "circle" ? "rounded-full [&>[data-slot=color-swatch-picker-swatch]]:rounded-full" : squareRadius[size],
        "[transition:border-color_100ms_var(--e-out),box-shadow_100ms_var(--e-out)] motion-reduce:[transition:none]",
        "focus-visible:h-focus-ring disabled:h-status-disabled disabled:cursor-not-allowed",
        "data-[state=checked]:border-(--color-swatch-current) data-[state=checked]:shadow-[var(--h-field-shadow)]",
        className
      )}
      style={{ ["--color-swatch-current" as string]: color, ...style }}
      {...props}
    >
      {children ?? (
        <>
          <ColorSwatchPickerSwatch />
          <ColorSwatchPickerIndicator />
        </>
      )}
    </RadioGroupPrimitive.Item>
  )
}

/** The colour itself, with the checkered pattern under it for transparent colours. */
function ColorSwatchPickerSwatch({ className, style, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="color-swatch-picker-swatch"
      className={cn(
        "block size-full rounded-[inherit] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] transform-gpu",
        "[transition:transform_100ms_var(--e-out)] motion-reduce:[transition:none]",
        "[@media(hover:hover)]:group-hover/swatch:scale-110 group-data-[state=checked]/swatch:scale-[0.77] [@media(hover:hover)]:group-hover/swatch:group-data-[state=checked]/swatch:scale-[0.77]",
        className
      )}
      style={{
        background:
          "linear-gradient(var(--color-swatch-current), var(--color-swatch-current)), repeating-conic-gradient(#efefef 0% 25%, #f7f7f7 0% 50%) 50% / 16px 16px",
        ...style,
      }}
      {...props}
    />
  )
}

/** The mark on the selected swatch. With no children it is a bold check; pass an icon to replace it. */
function ColorSwatchPickerIndicator({ className, children, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="color-swatch-picker-indicator"
      className={cn(
        "pointer-events-none absolute inset-0 z-10 flex items-center justify-center",
        "[&>*]:size-1/3 [&>*]:scale-0 [&>*]:text-white [&>*]:transform-gpu [&>*]:[transition:transform_150ms_var(--e-out)] motion-reduce:[&>*]:[transition:none]",
        "group-data-[light-color=true]/swatch:[&>*]:text-black group-data-[state=checked]/swatch:[&>*]:scale-100",
        className
      )}
      {...props}
    >
      {children ?? <Check weight="bold" />}
    </span>
  )
}

export { ColorSwatchPicker, ColorSwatchPickerItem, ColorSwatchPickerSwatch, ColorSwatchPickerIndicator }
export type { PickerLayout }
