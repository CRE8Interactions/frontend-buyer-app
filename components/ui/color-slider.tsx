"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { CHECKERED, getChannel, hsbToRgb, setChannel, toCss, type ColorChannel, type HSBA } from "@/lib/color"
import { useColorControl, type ColorStateProps } from "./color-context"

/* Copied from the reference color-slider.css: a bar for one colour channel with a label and the value above it. The track is
   20px tall with the channel's own gradient (the hue slider is the rainbow at the current saturation and brightness, the
   alpha slider fades from clear over a checkered pattern). The thumb is a 16px dot with a 3px white edge and the overlay
   shadow, filled with the colour at that point; the track is inset by half a thumb so the thumb never leaves it. Pointer
   drag anywhere on the bar; a hidden range input gives keyboard control and the accessible name. */
type SliderChannel = Extract<ColorChannel, "hue" | "saturation" | "brightness" | "red" | "green" | "blue" | "alpha">
const MAX: Record<SliderChannel, number> = { hue: 360, saturation: 100, brightness: 100, red: 255, green: 255, blue: 255, alpha: 100 }
const NAME: Record<SliderChannel, string> = { hue: "Hue", saturation: "Saturation", brightness: "Brightness", red: "Red", green: "Green", blue: "Blue", alpha: "Alpha" }
const UNIT: Record<SliderChannel, string> = { hue: "°", saturation: "%", brightness: "%", red: "", green: "", blue: "", alpha: "%" }

function trackGradient(channel: SliderChannel, c: HSBA) {
  const at = (v: number) => toCss({ ...setChannel({ ...c, a: 1 }, channel === "alpha" ? "hue" : channel, v), a: 1 })
  if (channel === "hue") {
    const stops = [0, 60, 120, 180, 240, 300, 360].map((h) => toCss({ ...c, h, a: 1 }))
    return `linear-gradient(to right, ${stops.join(", ")})`
  }
  if (channel === "alpha") {
    const [r, g, b] = hsbToRgb(c)
    return `linear-gradient(to right, rgb(${r} ${g} ${b} / 0), rgb(${r} ${g} ${b})), ${CHECKERED}`
  }
  return `linear-gradient(to right, ${at(0)}, ${at(MAX[channel])})`
}

type ColorSliderProps = ColorStateProps &
  Omit<React.ComponentProps<"div">, "onChange" | "defaultValue"> & {
    channel?: SliderChannel
    /** Text above the bar. Pass `false` to hide it; by default the channel name. */
    label?: React.ReactNode | false
    /** Show the number at the right of the label. */
    showOutput?: boolean
    disabled?: boolean
  }

function ColorSlider({ channel = "hue", value, defaultValue, onChange, label, showOutput, disabled, className, ...props }: ColorSliderProps) {
  const { color, setColor } = useColorControl({ value, defaultValue, onChange })
  const track = React.useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = React.useState(false)
  const max = MAX[channel]
  const current = getChannel(color, channel)
  const pct = (current / max) * 100
  const id = React.useId()

  const fromPointer = (e: React.PointerEvent) => {
    const r = track.current!.getBoundingClientRect()
    const half = 8 /* half the thumb */
    const t = Math.min(1, Math.max(0, (e.clientX - r.left - half) / (r.width - half * 2)))
    setColor(setChannel(color, channel, Math.round(t * max)))
  }
  const thumbFill = channel === "alpha" ? toCss(color) : toCss({ ...color, a: 1 })
  const text = label === false ? null : label ?? NAME[channel]
  return (
    <div data-slot="color-slider" data-channel={channel} data-disabled={disabled ? "true" : undefined} className={cn("grid w-full gap-1 data-[disabled=true]:h-status-disabled", className)} {...props}>
      {text != null || showOutput ? (
        <div className="flex items-center justify-between text-sm font-medium">
          {text != null ? <label htmlFor={id} className="w-fit">{text}</label> : <span />}
          {showOutput ? <output htmlFor={id} className="tabular-nums">{current}{UNIT[channel]}</output> : null}
        </div>
      ) : null}
      <div
        ref={track}
        data-slot="color-slider-track"
        className="group/slider relative h-5 touch-none cursor-pointer rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)]"
        style={{ background: trackGradient(channel, color) }}
        onPointerDown={(e) => {
          if (disabled) return
          ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
          setDragging(true)
          fromPointer(e)
        }}
        onPointerMove={(e) => dragging && fromPointer(e)}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        <input
          id={id} type="range" min={0} max={max} step={1} disabled={disabled}
          aria-label={typeof text === "string" ? undefined : NAME[channel]}
          value={current} onChange={(e) => setColor(setChannel(color, channel, Number(e.target.value)))}
          className="pointer-events-none absolute inset-0 size-full opacity-0"
        />
        <span
          aria-hidden
          data-slot="color-slider-thumb"
          data-dragging={dragging ? "true" : undefined}
          className={cn(
            "pointer-events-none absolute top-1/2 z-10 size-4 -translate-y-1/2 rounded-full border-[3px] border-white shadow-h-overlay",
            "[transition:transform_250ms_var(--e-out),box-shadow_150ms_var(--e-out)] motion-reduce:[transition:none]",
            "group-has-[:focus-visible]/slider:h-focus-ring"
          )}
          style={{ left: `calc(${pct}% - ${(pct / 100) * 16}px)`, background: channel === "alpha" ? `linear-gradient(${thumbFill}, ${thumbFill}), ${CHECKERED}` : thumbFill }}
        />
      </div>
    </div>
  )
}

export { ColorSlider }
export type { ColorSliderProps, SliderChannel }
