"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { toCss, type HSBA } from "@/lib/color"
import { useColorControl, type ColorStateProps } from "./color-context"

/* Copied from the reference color-area.css: a square field for choosing saturation (left to right) and brightness (bottom to
   top) at the current hue. Up to 224px wide, 16px corners, a faint inset ring. The thumb is a 16px dot with a 3px white edge
   filled with the colour under it; it grows to 20px while dragged and shows the focus ring from the keyboard. `showDots`
   lays a fine dot grid over the area. Pointer and touch drag anywhere; two hidden range inputs (saturation and brightness)
   give keyboard control (arrows 1, Page Up and Down 10) and names for screen readers. */
type ColorAreaProps = ColorStateProps &
  Omit<React.ComponentProps<"div">, "onChange" | "defaultValue"> & {
    showDots?: boolean
    disabled?: boolean
  }

function ColorArea({ value, defaultValue, onChange, showDots, disabled, className, style, children, ...props }: ColorAreaProps) {
  const { color, setColor } = useColorControl({ value, defaultValue, onChange })
  const ref = React.useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = React.useState(false)

  const fromPointer = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    const s = Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100))
    const b = Math.min(100, Math.max(0, (1 - (e.clientY - r.top) / r.height) * 100))
    setColor({ ...color, s: Math.round(s * 10) / 10, b: Math.round(b * 10) / 10 })
  }
  const hueColor = toCss({ h: color.h, s: 100, b: 100, a: 1 })
  const thumbColor = toCss({ ...color, a: 1 })
  const sr = "pointer-events-none absolute inset-0 size-full opacity-0"
  return (
    <div
      ref={ref}
      role="group"
      aria-label="Color area"
      aria-disabled={disabled || undefined}
      data-slot="color-area"
      data-disabled={disabled ? "true" : undefined}
      className={cn(
        "group/area relative aspect-square w-full max-w-56 shrink-0 touch-none rounded-2xl shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] data-[disabled=true]:h-status-disabled",
        showDots && "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:[background-image:radial-gradient(circle,rgba(255,255,255,0.2)_1px,transparent_1px)] after:[background-size:8px_8px] after:content-['']",
        className
      )}
      style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})`, ...style }}
      onPointerDown={(e) => {
        if (disabled) return
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        setDragging(true)
        fromPointer(e)
      }}
      onPointerMove={(e) => dragging && fromPointer(e)}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      {...props}
    >
      <input
        type="range" min={0} max={100} step={1} disabled={disabled}
        aria-label="Saturation" aria-valuetext={`${Math.round(color.s)}%`}
        value={Math.round(color.s)} onChange={(e) => setColor({ ...color, s: Number(e.target.value) })}
        className={sr}
      />
      <input
        type="range" min={0} max={100} step={1} disabled={disabled}
        aria-label="Brightness" aria-valuetext={`${Math.round(color.b)}%`}
        value={Math.round(color.b)} onChange={(e) => setColor({ ...color, b: Number(e.target.value) })}
        className={sr}
      />
      <span
        aria-hidden
        data-slot="color-area-thumb"
        data-dragging={dragging ? "true" : undefined}
        className={cn(
          "pointer-events-none absolute z-10 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white will-change-[width,height]",
          "shadow-[0_0_0_1px_rgba(0,0,0,0.1),inset_0_0_0_1px_rgba(0,0,0,0.1)] [transition:width_150ms_var(--e-out),height_150ms_var(--e-out)] motion-reduce:[transition:none]",
          "data-[dragging=true]:size-5 group-has-[:focus-visible]/area:h-focus-ring"
        )}
        style={{ left: `${color.s}%`, top: `${100 - color.b}%`, backgroundColor: thumbColor }}
      />
      {children}
    </div>
  )
}

export { ColorArea }
export type { ColorAreaProps, HSBA }
