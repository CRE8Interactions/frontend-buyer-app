"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { getChannel, parseColor, setChannel, toHex, type ColorChannel } from "@/lib/color"
import { useColorControl, type ColorStateProps } from "./color-context"
import { Description } from "./description"
import { FieldError } from "./field-error"
import { Input } from "./input"
import { Label } from "./label"

/* Copied from the reference color-field.css: a labelled text field that edits a colour as hex or as one channel (red, green,
   blue, hue, saturation, brightness, lightness, alpha). It is built on our Input, so it has the same fills, sizes and
   states. The text is parsed when you leave the field or press Enter; if it is not a colour the field shows the invalid
   state and keeps what you typed, and Escape puts the current colour back. The description is hidden while invalid. */
type FieldChannel = "hex" | Extract<ColorChannel, "hue" | "saturation" | "brightness" | "lightness" | "red" | "green" | "blue" | "alpha">
const RANGE: Record<Exclude<FieldChannel, "hex">, [number, number]> = {
  hue: [0, 360], saturation: [0, 100], brightness: [0, 100], lightness: [0, 100], red: [0, 255], green: [0, 255], blue: [0, 255], alpha: [0, 100],
}
const LABEL: Record<FieldChannel, string> = { hex: "Hex", hue: "Hue", saturation: "Saturation", brightness: "Brightness", lightness: "Lightness", red: "Red", green: "Green", blue: "Blue", alpha: "Alpha" }

type ColorFieldProps = ColorStateProps & {
  channel?: FieldChannel
  label?: React.ReactNode
  description?: React.ReactNode
  errorMessage?: React.ReactNode
  variant?: React.ComponentProps<typeof Input>["variant"]
  size?: React.ComponentProps<typeof Input>["size"]
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  fullWidth?: boolean
  disabled?: boolean
  className?: string
  id?: string
  "aria-label"?: string
}

function ColorField({
  channel = "hex", value, defaultValue, onChange, label, description, errorMessage, variant, size, prefix, suffix, fullWidth, disabled, className, id, "aria-label": ariaLabel,
}: ColorFieldProps) {
  const { color, setColor } = useColorControl({ value, defaultValue, onChange })
  const auto = React.useId()
  const inputId = id ?? auto
  const shown = channel === "hex" ? toHex(color, color.a < 1) : String(getChannel(color, channel))
  const [draft, setDraft] = React.useState<string | null>(null)
  const [invalid, setInvalid] = React.useState(false)
  const text = draft ?? shown

  const commit = () => {
    if (draft === null) return
    if (channel === "hex") {
      const parsed = parseColor(draft.startsWith("#") ? draft : `#${draft}`)
      if (!parsed) return setInvalid(true)
      setColor(parsed)
    } else {
      const n = Number(draft)
      const [lo, hi] = RANGE[channel]
      if (draft.trim() === "" || Number.isNaN(n) || n < lo || n > hi) return setInvalid(true)
      setColor(setChannel(color, channel, n))
    }
    setInvalid(false)
    setDraft(null)
  }
  const text2 = label === undefined && !ariaLabel ? LABEL[channel] : label
  return (
    <div data-slot="color-field" data-invalid={invalid ? "true" : undefined} className={cn("flex flex-col gap-1", fullWidth && "w-full", className)}>
      {text2 ? <Label htmlFor={inputId} className="w-fit">{text2}</Label> : null}
      <Input
        id={inputId}
        value={text}
        variant={variant}
        size={size}
        prefix={prefix}
        suffix={suffix}
        disabled={disabled}
        isInvalid={invalid}
        aria-label={ariaLabel}
        data-dirty={draft !== null ? "true" : undefined}
        inputMode={channel === "hex" ? "text" : "numeric"}
        spellCheck={false}
        autoComplete="off"
        className={cn(channel === "hex" && "uppercase")}
        onChange={(e) => { setDraft(e.target.value); setInvalid(false) }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit() }
          if (e.key === "Escape") { setDraft(null); setInvalid(false) }
        }}
      />
      {invalid ? (errorMessage ? <FieldError>{errorMessage}</FieldError> : null) : description ? <Description>{description}</Description> : null}
    </div>
  )
}

export { ColorField }
export type { ColorFieldProps, FieldChannel }
