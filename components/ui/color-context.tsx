"use client"

import * as React from "react"
import { parseColor, toHex, type HSBA } from "@/lib/color"

/* Shared colour state for the colour components. A ColorPicker provides it so the area, sliders, field, swatches and
   swatch picker inside it stay in step. The colour is held as HSBA, so the hue survives while a colour passes through grey
   or black (a hex string would forget it). */
type ColorContextValue = { color: HSBA; setColor: (next: HSBA) => void }
const ColorContext = React.createContext<ColorContextValue | null>(null)
const FALLBACK: HSBA = { h: 0, s: 0, b: 0, a: 1 }

type ColorStateProps = {
  /** Controlled colour, as a CSS colour string (hex, rgb(), hsl(), hsb()). */
  value?: string
  defaultValue?: string
  /** Called with the new colour as hex (`#RRGGBB`, or `#RRGGBBAA` when not opaque). */
  onChange?: (hex: string, color: HSBA) => void
}

/** Holds a colour that can be controlled or not. Outside edits to `value` are taken in without losing the hue. */
function useColorState({ value, defaultValue, onChange }: ColorStateProps): ColorContextValue {
  const [inner, setInner] = React.useState<HSBA>(() => parseColor(value ?? defaultValue ?? "#000000") ?? FALLBACK)
  const incoming = value === undefined ? null : parseColor(value)
  const innerHex = toHex(inner, true)
  React.useEffect(() => {
    if (incoming && toHex(incoming, true) !== innerHex) setInner(incoming)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  const setColor = React.useCallback(
    (next: HSBA) => {
      setInner(next)
      onChange?.(toHex(next), next)
    },
    [onChange]
  )
  return { color: inner, setColor }
}

/** The colour a child component edits: its own `value` / `defaultValue` if given, otherwise the surrounding ColorPicker's. */
function useColorControl(props: ColorStateProps): ColorContextValue {
  const ctx = React.useContext(ColorContext)
  const own = useColorState(props)
  return props.value !== undefined || props.defaultValue !== undefined || !ctx ? own : ctx
}

export { ColorContext, useColorState, useColorControl }
export type { ColorStateProps, ColorContextValue }
