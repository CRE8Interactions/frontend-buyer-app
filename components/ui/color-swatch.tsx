"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { toCss } from "@/lib/color"
import { ColorContext } from "./color-context"

/* Copied from the reference color-swatch.css: a square or round chip of one colour. A checkered pattern sits under the
   colour so transparent and semi-transparent colours read as such, and a 1px inset ring (10% black) keeps pale colours
   visible on a pale background. Sizes xs 16, sm 24, md 32 (default), lg 36, xl 40. Circle is the default shape; square has
   6px corners. It is an image for assistive tech: `label` names the colour. */
type SwatchSize = "xs" | "sm" | "md" | "lg" | "xl"
type SwatchShape = "circle" | "square"

const swatchSize: Record<SwatchSize, string> = { xs: "size-4", sm: "size-6", md: "size-8", lg: "size-9", xl: "size-10" }

/** The colour inside the surrounding ColorPicker, as a CSS colour, or undefined outside one. */
function useColorValue() {
  const ctx = React.useContext(ColorContext)
  return ctx ? toCss(ctx.color) : undefined
}

function ColorSwatch({
  color: colorProp,
  size = "md",
  shape = "circle",
  label,
  className,
  style,
  ...props
}: Omit<React.ComponentProps<"div">, "color"> & {
  /** Any CSS colour: hex, rgb(), hsl(), a variable. Inside a ColorPicker it defaults to the picker's colour. */
  color?: string
  size?: SwatchSize
  shape?: SwatchShape
  /** Accessible name. Defaults to the colour value. */
  label?: string
}) {
  const fromPicker = useColorValue()
  const color = colorProp ?? fromPicker ?? "transparent"
  return (
    <div
      role="img"
      aria-label={label ?? color}
      data-slot="color-swatch"
      data-size={size}
      data-shape={shape}
      className={cn(
        "relative box-border shrink-0 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)]",
        swatchSize[size],
        shape === "circle" ? "rounded-full" : "rounded-md",
        className
      )}
      style={{
        ["--color-swatch-current" as string]: color,
        background:
          "linear-gradient(var(--color-swatch-current), var(--color-swatch-current)), repeating-conic-gradient(#efefef 0% 25%, #f7f7f7 0% 50%) 50% / 16px 16px",
        ...style,
      }}
      {...props}
    />
  )
}

export { ColorSwatch, useColorValue }
export type { SwatchSize, SwatchShape }
