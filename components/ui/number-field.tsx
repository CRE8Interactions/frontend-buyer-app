"use client"

import * as React from "react"
import { Minus, Plus } from "@phosphor-icons/react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Description } from "@/components/ui/description"

/* the reference NumberField, as cva + utilities: a 36px field group with a 40px decrement cell on the left, a tabular
   number input in the middle and a 40px increment cell on the right. Primary uses the field fill and shadow,
   tertiary has no fill. Focus is a 2px ring on the whole group, invalid a danger outline. */
type NumberFieldProps = {
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: React.ReactNode
  description?: React.ReactNode
  variant?: "primary" | "secondary" | "tertiary"
  size?: "sm" | "md" | "lg"
  fullWidth?: boolean
  disabled?: boolean
  isInvalid?: boolean
  name?: string
  id?: string
  className?: string
  "aria-label"?: string
}

const groupVariants = cva(
  [
    "grid items-center overflow-hidden rounded-[12px] text-sm text-h-field-foreground outline-none",
    "[grid-template-columns:var(--cell)_minmax(0,1fr)_var(--cell)] h-(--cell) [transition:background-color_150ms,box-shadow_150ms] motion-reduce:[transition:none]",
    "focus-within:shadow-[0_0_0_2px_var(--h-focus)]",
    "data-[invalid=true]:shadow-[0_0_0_1px_var(--h-danger)] data-[invalid=true]:focus-within:shadow-[0_0_0_2px_var(--h-danger)]",
    "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: [
          "bg-h-field shadow-(--h-field-outline) focus-within:bg-h-field-focus",
          "[@media(hover:hover)]:[&:hover:not(:focus-within)]:bg-h-field-hover",
        ].join(" "),
        secondary: [
          "bg-(--h-field-secondary) focus-within:bg-(--h-field-secondary)",
          "[@media(hover:hover)]:[&:hover:not(:focus-within)]:bg-(--h-field-secondary-hover)",
        ].join(" "),
        tertiary: [
          "bg-transparent shadow-[inset_0_0_0_1px_var(--h-border-secondary)] focus-within:bg-transparent",
          "[@media(hover:hover)]:[&:hover:not(:focus-within)]:shadow-[inset_0_0_0_1px_var(--h-border-tertiary)]",
        ].join(" "),
      },
      /* The cell is the control height: sm 36 / 32 from md, md 40 / 36, lg 48 / 44. */
      size: {
        sm: "w-[7.5rem] [--cell:36px] md:[--cell:32px]",
        md: "w-[7.5rem] [--cell:40px] md:[--cell:36px]",
        lg: "w-36 [--cell:48px] md:[--cell:44px]",
      },
      fullWidth: { true: "w-full", false: "" },
    },
  }
)

const stepButtonBase = [
  "flex h-full w-(--cell) cursor-pointer items-center justify-center bg-transparent text-h-field-foreground outline-none transition-[background-color,transform] duration-150",
  "active:scale-[0.97] active:bg-h-field-foreground/10 data-[pressed=true]:scale-[0.97] data-[pressed=true]:bg-h-field-foreground/10",
  "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
].join(" ")
const decrementClass = cn(stepButtonBase, "rounded-s-[12px] border-e border-h-field-placeholder/15")
const incrementClass = cn(stepButtonBase, "rounded-e-[12px] border-s border-h-field-placeholder/15")

const inputVariants = cva("h-full min-w-0 border-0 bg-transparent px-3 py-2 text-center tabular-nums shadow-none outline-none", {
  variants: { size: { sm: "text-sm", md: "text-base min-[40rem]:text-[15px]", lg: "text-lg" } },
})

function NumberField({
  value: valueProp,
  defaultValue = 0,
  onValueChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  label,
  description,
  variant = "primary",
  size = "md",
  fullWidth,
  disabled,
  isInvalid,
  name,
  id,
  className,
  ...rest
}: NumberFieldProps) {
  const autoId = React.useId()
  const inputId = id ?? autoId
  const [inner, setInner] = React.useState(defaultValue)
  const value = valueProp ?? inner
  const clamp = (n: number) => Math.min(max, Math.max(min, n))
  const commit = (n: number) => {
    const next = clamp(Number.isFinite(n) ? n : 0)
    if (valueProp === undefined) setInner(next)
    onValueChange?.(next)
  }
  /* Press and hold repeats: 400ms delay, then every 90ms, speeding up after a second. */
  const valueRef = React.useRef(value)
  valueRef.current = value
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const stop = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }, [])
  React.useEffect(() => stop, [stop])
  const hold = (dir: 1 | -1) => (e: React.PointerEvent) => {
    if (e.button !== 0) return
    commit(valueRef.current + dir * step)
    let ticks = 0
    const tick = () => {
      ticks += 1
      const bump = ticks > 12 ? 5 : 1
      commit(valueRef.current + dir * step * bump)
      timer.current = setTimeout(tick, ticks > 12 ? 60 : 90)
    }
    timer.current = setTimeout(tick, 400)
  }
  return (
    <div
      data-slot="number-field"
      data-invalid={isInvalid ? "true" : undefined}
      className={cn("flex w-fit flex-col gap-1", fullWidth && "w-full", className)}
    >
      {label ? <Label htmlFor={inputId} className="w-fit">{label}</Label> : null}
      <div
        data-slot="number-field-group"
        data-disabled={disabled ? "true" : undefined}
        data-invalid={isInvalid ? "true" : undefined}
        className={cn(groupVariants({ variant, size, fullWidth: !!fullWidth }))}
      >
        <button
          type="button"
          data-slot="decrement"
          aria-label="Decrease"
          disabled={disabled || value <= min}
          onPointerDown={hold(-1)} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); commit(value - step) } }}
          className={decrementClass}
        >
          <Minus weight="bold" className={(size === "lg" ? "size-5" : "size-4")} data-slot="number-field-decrement-button-icon" />
        </button>
        <input
          id={inputId}
          name={name}
          inputMode="decimal"
          role="spinbutton"
          aria-valuenow={value}
          aria-valuemin={Number.isFinite(min) ? min : undefined}
          aria-valuemax={Number.isFinite(max) ? max : undefined}
          aria-invalid={isInvalid || undefined}
          aria-label={rest["aria-label"]}
          disabled={disabled}
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (!Number.isNaN(n)) commit(n)
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") { e.preventDefault(); commit(value + step) }
            if (e.key === "ArrowDown") { e.preventDefault(); commit(value - step) }
          }}
          data-slot="number-field-input"
          className={inputVariants({ size })}
        />
        <button
          type="button"
          data-slot="increment"
          aria-label="Increase"
          disabled={disabled || value >= max}
          onPointerDown={hold(1)} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); commit(value + step) } }}
          className={incrementClass}
        >
          <Plus weight="bold" className={(size === "lg" ? "size-5" : "size-4")} data-slot="number-field-increment-button-icon" />
        </button>
      </div>
      {description && !isInvalid ? <Description>{description}</Description> : null}
    </div>
  )
}

export { NumberField }
