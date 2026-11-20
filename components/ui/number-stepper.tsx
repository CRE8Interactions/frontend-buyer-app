"use client"

import * as React from "react"
import NumberFlow, { type Format } from "@number-flow/react"
import { Minus, Plus } from "@phosphor-icons/react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const rootClass = "inline-flex shrink-0"
const groupVariants = cva("inline-flex items-center rounded-full border-0 bg-h-default p-0.5", {
  variants: { size: { sm: "gap-0", md: "gap-0", lg: "gap-0.5" } },
})
/* Visually hidden native input, so the value is part of a form and announced. */
const inputClass = "absolute -m-px size-px overflow-hidden border-0 p-0 whitespace-nowrap [clip-path:inset(50%)]"

const buttonBase = [
  "relative flex shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-h-surface shadow-h-surface outline-none",
  "[-webkit-tap-highlight-color:transparent] [transform:translateZ(0)]",
  "[transition:background-color_100ms_var(--e-out),box-shadow_100ms_var(--e-out),transform_250ms_ease] motion-reduce:[transition:none]",
  "[&_svg]:shrink-0 [&_svg]:text-h-muted [&_svg]:[transition:color_150ms] motion-reduce:[&_svg]:[transition:none]",
  "[@media(hover:hover)]:hover:[&_svg]:text-h-foreground [@media(hover:hover)]:data-[hovered=true]:[&_svg]:text-h-foreground",
  "focus-visible:h-focus-ring data-[focus-visible=true]:h-focus-ring",
  "disabled:h-status-disabled aria-disabled:h-status-disabled data-[disabled=true]:h-status-disabled",
].join(" ")
const buttonVariants = cva(buttonBase, {
  variants: {
    size: {
      sm: "size-8 md:size-7 [&_svg]:size-3.5 active:[transform:scale(0.98)] data-[pressed=true]:[transform:scale(0.98)]",
      md: "size-9 md:size-8 [&_svg]:size-4 active:[transform:scale(0.98)] data-[pressed=true]:[transform:scale(0.98)]",
      lg: "size-10 md:size-9 [&_svg]:size-5 md:[&_svg]:size-4 active:[transform:scale(0.96)] data-[pressed=true]:[transform:scale(0.96)]",
    },
  },
})

const valueVariants = cva(
  "flex items-center justify-center rounded-full px-2 font-semibold text-h-foreground tabular-nums outline-none select-none focus-visible:h-focus-ring aria-disabled:h-status-disabled",
  {
    variants: {
      size: {
        sm: "h-8 min-w-6 text-xs leading-[0.85] md:h-7 md:min-w-5",
        md: "h-9 min-w-7 text-sm leading-[0.85] md:h-8 md:min-w-6",
        lg: "h-10 min-w-8 text-base leading-[0.85] md:h-9 md:min-w-7",
      },
    },
  }
)

/* Styled with cva + Tailwind utilities. A pill group on the default fill with 2px of padding holds a round
   decrement button, the value and a round increment button. Buttons sit on the surface fill with the surface shadow,
   an icon in the muted colour that turns to the foreground on hover (150ms), press scales to 0.98 (0.96 large) in 250ms,
   focus ring from the keyboard, disabled dims. Sizes: sm buttons 32 / 28px with 14px icons and 12px text, md 36 / 32px
   with 16px icons and 14px text, lg 40 / 36px with 20 / 16px icons and 16px text (phone / from the md breakpoint). The
   value is semibold and tabular, its minimum width 24, 28 or 32px (20, 24, 28 from md). Its digits spin on a reel
   (the number flow animation: 900ms spring-like movement, 450ms fade), which reduced motion skips. The value is a
   focusable spinbutton: ArrowUp and ArrowDown step, PageUp and PageDown by ten, Home and End jump to the bounds. Press
   and hold a button to repeat (400ms, then every 90ms). A hidden input carries the value for forms. */
type Size = "sm" | "md" | "lg"

type Ctx = {
  value: number
  min: number
  max: number
  step: number
  size: Size
  disabled: boolean
  formatOptions?: Format
  locale?: string
  name?: string
  set: (n: number) => void
  stepBy: (dir: 1 | -1, multiplier?: number) => void
  startHold: (dir: 1 | -1) => void
  stopHold: () => void
}

const StepperContext = React.createContext<Ctx | null>(null)
function useStepper() {
  const ctx = React.useContext(StepperContext)
  if (!ctx) throw new Error("NumberStepper parts must be used inside <NumberStepper>")
  return ctx
}

type NumberStepperProps = Omit<React.ComponentProps<"div">, "onChange" | "defaultValue"> & {
  value?: number
  defaultValue?: number
  onChange?: (value: number) => void
  minValue?: number
  maxValue?: number
  step?: number
  size?: Size
  isDisabled?: boolean
  /** Intl number formatting for the displayed value (currency, percent, units, fraction digits). */
  formatOptions?: Format
  locale?: string
  /** Name of the hidden form input. */
  name?: string
}

function NumberStepper({
  value: valueProp,
  defaultValue = 0,
  onChange,
  minValue = -Infinity,
  maxValue = Infinity,
  step = 1,
  size = "md",
  isDisabled = false,
  formatOptions,
  locale,
  name,
  className,
  children,
  ...props
}: NumberStepperProps) {
  const [inner, setInner] = React.useState(defaultValue)
  const value = valueProp ?? inner
  const clamp = React.useCallback((n: number) => Math.min(maxValue, Math.max(minValue, n)), [minValue, maxValue])
  // Round to the step's precision so 0.1 + 0.2 never shows 0.30000000000000004.
  const precision = React.useMemo(() => {
    const s = String(step)
    return s.includes(".") ? s.split(".")[1].length : 0
  }, [step])

  const valueRef = React.useRef(value)
  valueRef.current = value
  const set = React.useCallback(
    (n: number) => {
      const next = clamp(Number(n.toFixed(precision)))
      if (next === valueRef.current) return
      valueRef.current = next
      if (valueProp === undefined) setInner(next)
      onChange?.(next)
    },
    [clamp, precision, valueProp, onChange]
  )
  const stepBy = React.useCallback((dir: 1 | -1, multiplier = 1) => set(valueRef.current + dir * step * multiplier), [set, step])

  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const stopHold = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }, [])
  const startHold = React.useCallback(
    (dir: 1 | -1) => {
      stopHold()
      const began = Date.now()
      const tick = () => {
        stepBy(dir, Date.now() - began > 1000 ? 5 : 1)
        timer.current = setTimeout(tick, 90)
      }
      stepBy(dir)
      timer.current = setTimeout(tick, 400)
    },
    [stepBy, stopHold]
  )
  React.useEffect(() => stopHold, [stopHold])

  return (
    <StepperContext.Provider value={{ value, min: minValue, max: maxValue, step, size, disabled: isDisabled, formatOptions, locale, name, set, stepBy, startHold, stopHold }}>
      <div data-slot="number-stepper" data-size={size} data-disabled={isDisabled ? "true" : undefined} className={cn(rootClass, className)} {...props}>
        {children}
      </div>
    </StepperContext.Provider>
  )
}

function NumberStepperGroup({ className, children, ...props }: React.ComponentProps<"div">) {
  const ctx = useStepper()
  const { value, name } = ctx
  return (
    <div role="group" data-slot="number-stepper-group" className={cn(groupVariants({ size: ctx.size }), className)} {...props}>
      {children}
      <input type="hidden" className={inputClass} data-slot="number-stepper-input" name={name} value={value} readOnly />
    </div>
  )
}

function holdHandlers(dir: 1 | -1, ctx: Ctx) {
  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return
      ctx.startHold(dir)
    },
    onPointerUp: ctx.stopHold,
    onPointerLeave: ctx.stopHold,
    onPointerCancel: ctx.stopHold,
    onBlur: ctx.stopHold,
    // Keyboard activation (Enter or Space on a focused button) arrives as a click with no pointer.
    onClick: (e: React.MouseEvent) => {
      if (e.detail === 0) ctx.stepBy(dir)
    },
  }
}

function NumberStepperDecrementButton({ className, children, ...props }: React.ComponentProps<"button">) {
  const ctx = useStepper()
  return (
    <button
      type="button"
      data-slot="number-stepper-decrement-button"
      aria-label="Decrease"
      tabIndex={-1}
      disabled={ctx.disabled || ctx.value <= ctx.min}
      className={cn(buttonVariants({ size: ctx.size }), className)}
      {...holdHandlers(-1, ctx)}
      {...props}
    >
      {children ?? <Minus weight="bold" />}
    </button>
  )
}

function NumberStepperIncrementButton({ className, children, ...props }: React.ComponentProps<"button">) {
  const ctx = useStepper()
  return (
    <button
      type="button"
      data-slot="number-stepper-increment-button"
      aria-label="Increase"
      tabIndex={-1}
      disabled={ctx.disabled || ctx.value >= ctx.max}
      className={cn(buttonVariants({ size: ctx.size }), className)}
      {...holdHandlers(1, ctx)}
      {...props}
    >
      {children ?? <Plus weight="bold" />}
    </button>
  )
}

type ValueProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** Overrides the stepper's current value. */
  value?: number
  /** Overrides the stepper's number format. */
  format?: Format
  /** Custom content, or a function that receives the value and the format. */
  children?: React.ReactNode | ((props: { value: number; formatOptions?: Format }) => React.ReactNode)
}

function NumberStepperValue({ value: valueProp, format, children, className, onKeyDown, ...props }: ValueProps) {
  const ctx = useStepper()
  const value = valueProp ?? ctx.value
  const formatOptions = format ?? ctx.formatOptions
  const text = React.useMemo(() => new Intl.NumberFormat(ctx.locale, formatOptions).format(value), [value, formatOptions, ctx.locale])
  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e)
    if (e.defaultPrevented || ctx.disabled) return
    const keys: Record<string, () => void> = {
      ArrowUp: () => ctx.stepBy(1),
      ArrowRight: () => ctx.stepBy(1),
      ArrowDown: () => ctx.stepBy(-1),
      ArrowLeft: () => ctx.stepBy(-1),
      PageUp: () => ctx.stepBy(1, 10),
      PageDown: () => ctx.stepBy(-1, 10),
      Home: () => Number.isFinite(ctx.min) && ctx.set(ctx.min),
      End: () => Number.isFinite(ctx.max) && ctx.set(ctx.max),
    }
    const run = keys[e.key]
    if (run) { e.preventDefault(); run() }
  }
  const custom = typeof children === "function" ? children({ value, formatOptions }) : children
  return (
    <div
      role="spinbutton"
      tabIndex={ctx.disabled ? -1 : 0}
      aria-valuenow={value}
      aria-valuemin={Number.isFinite(ctx.min) ? ctx.min : undefined}
      aria-valuemax={Number.isFinite(ctx.max) ? ctx.max : undefined}
      aria-valuetext={text}
      aria-disabled={ctx.disabled || undefined}
      data-slot="number-stepper-value"
      onKeyDown={handleKey}
      className={cn(valueVariants({ size: ctx.size }), className)}
      {...props}
    >
      {custom ?? <NumberFlow value={value} format={formatOptions} locales={ctx.locale} aria-hidden="true" />}
    </div>
  )
}

export {
  NumberStepper,
  NumberStepperGroup,
  NumberStepperDecrementButton,
  NumberStepperValue,
  NumberStepperIncrementButton,
}
export type { NumberStepperProps }
