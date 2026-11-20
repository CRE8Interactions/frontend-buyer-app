"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Check, Eye, EyeSlash, X } from "@phosphor-icons/react"
import { AnimatePresence, motion } from "framer-motion"
import { usePop } from "@/lib/motion"
import { Spinner } from "./spinner"

/**
 * the reference Input (input.css), as shadcn cva + utilities. Primary = faint field fill + soft edge, secondary = stronger fill, no edge
 * (on cards), tertiary = no fill, outline. Fill is driven by --input-bg so the autofill cover always matches the current state; the edge
 * is --field-edge, the focus ring --field-focus. Order matters for the merge: base, variant, size, pill, prefix.
 */
const fieldLayout = "rounded-[12px] px-3 py-2 text-sm outline-none"
const fieldColour = [
  "border-solid [border-width:var(--h-field-border-width,0px)] border-h-field-border text-h-field-foreground bg-(--input-bg) shadow-(--field-edge)",
  "[--input-bg:var(--h-field-background,var(--h-default))] [--input-bg-hover:var(--h-field-hover)] [--input-bg-focus:var(--h-field-focus)]",
  "[--field-edge:var(--h-field-outline)] [--field-focus:0_0_0_2px_var(--h-focus)] [--field-invalid:0_0_0_1px_var(--h-danger)] [--field-invalid-focus:0_0_0_2px_var(--h-danger)]",
  "placeholder:text-h-field-placeholder",
].join(" ")
const fieldMotion = "[transition:background-color_150ms_ease,border-color_150ms_ease,box-shadow_150ms_ease] motion-reduce:[transition-property:none]"
const fieldStates = [
  "[&:autofill]:[-webkit-text-fill-color:var(--h-field-foreground)] [&:autofill]:caret-h-field-foreground",
  "[@media(hover:hover)]:[&:hover:not(:focus):not(:focus-visible)]:border-h-field-border-hover [@media(hover:hover)]:[&:hover:not(:focus):not(:focus-visible)]:bg-(--input-bg-hover)",
  "focus:border-h-field-border-focus focus:shadow-(--field-focus) focus:bg-(--input-bg-focus)",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
  "aria-invalid:shadow-(--field-invalid) aria-invalid:bg-(--input-bg-focus) aria-invalid:focus:shadow-(--field-invalid-focus)",
  "data-[invalid=true]:shadow-(--field-invalid) data-[invalid=true]:bg-(--input-bg-focus) data-[invalid=true]:focus:shadow-(--field-invalid-focus)",
  "[&:-webkit-autofill]:shadow-[0_0_0_1000px_var(--input-bg)_inset] [&:-webkit-autofill]:[transition:background-color_9999s_ease-in-out_0s,border-color_150ms_ease]",
].join(" ")
/** The shared text-field surface: also the base of the textarea and the native select. */
const fieldBase = [fieldLayout, fieldColour, fieldMotion, fieldStates].join(" ")

const fieldSecondary = "[--field-edge:var(--h-field-outline)] [--input-bg:var(--h-field-secondary)] [--input-bg-hover:var(--h-field-secondary-hover)] [--input-bg-focus:var(--h-field-secondary)]"
const fieldTertiary = [
  "[--field-edge:inset_0_0_0_1px_var(--h-border-secondary)] [--input-bg:transparent] [--input-bg-hover:transparent] [--input-bg-focus:transparent]",
  "[@media(hover:hover)]:[&:hover:not(:focus):not(:focus-visible)]:[--field-edge:inset_0_0_0_1px_var(--h-border-tertiary)]",
].join(" ")
const fieldUnderlined = [
  "rounded-none px-0",
  "[--field-edge:inset_0_-1px_0_var(--h-border-secondary)] [--field-focus:inset_0_-2px_0_var(--h-focus)]",
  "[--input-bg:transparent] [--input-bg-hover:transparent] [--input-bg-focus:transparent]",
  "[--field-invalid:inset_0_-2px_0_var(--h-danger)] [--field-invalid-focus:inset_0_-3px_0_var(--h-danger)]",
  "[@media(hover:hover)]:[&:hover:not(:focus):not(:focus-visible)]:[--field-edge:inset_0_-1px_0_var(--h-border-tertiary)]",
].join(" ")

/* bordered: a visible 1px border (20% of the text colour) on the surface fill. Hover strengthens it to 28% and takes the secondary surface, focus is an accent
   border with a 2px ring at 20%, invalid is a danger border, a soft danger fill and danger text. */
const fieldBordered = [
  "[--field-edge:inset_0_0_0_1px_color-mix(in_oklab,var(--h-foreground)_20%,transparent)] [--input-bg:var(--h-surface)] [--input-bg-hover:var(--h-surface-secondary)] [--input-bg-focus:var(--h-surface)]",
  "[--field-focus:inset_0_0_0_1px_var(--h-accent),0_0_0_2px_color-mix(in_oklab,var(--h-accent)_20%,transparent)]",
  "[--field-invalid:inset_0_0_0_1px_var(--h-danger)] [--field-invalid-focus:inset_0_0_0_1px_var(--h-danger),0_0_0_2px_color-mix(in_oklab,var(--h-danger)_20%,transparent)]",
  "[@media(hover:hover)]:[&:hover:not(:focus):not(:focus-visible)]:[--field-edge:inset_0_0_0_1px_color-mix(in_oklab,var(--h-foreground)_28%,transparent)]",
  "aria-invalid:[--input-bg-focus:var(--h-danger-soft)] aria-invalid:[--input-bg-hover:var(--h-danger-soft)] aria-invalid:bg-(--h-danger-soft) aria-invalid:text-h-danger",
  "data-[invalid=true]:[--input-bg-focus:var(--h-danger-soft)] data-[invalid=true]:bg-(--h-danger-soft) data-[invalid=true]:text-h-danger",
].join(" ")

/* Heights: sm 36 (32 from md), md 40 (36), lg 48 (44). Text: sm and md 14px, lg 16px, at every width. Shared by input, native select, select trigger and number field. */
const fieldSizes = {
  sm: "h-9 px-2.5 py-0 text-sm md:h-8",
  md: "h-10 py-0 md:h-9",
  lg: "h-12 px-4 py-0 text-base md:h-11",
} as const
type FieldSize = keyof typeof fieldSizes

const fieldVariants = cva(fieldBase, {
  variants: {
    variant: {
      primary: "",
      /* secondary: a stronger fill with no edge, for fields on a card or surface */
      secondary: fieldSecondary,
      tertiary: fieldTertiary,
      underlined: fieldUnderlined,
      bordered: fieldBordered,
    },
    fullWidth: { true: "w-full", false: "" },
  },
  defaultVariants: { variant: "primary", fullWidth: false },
})

/* The stand-alone input element, the pill shape, the prefix padding and the green "valid" edge. */
const fieldControl = "min-w-0"
const fileControl = "enabled:cursor-pointer enabled:file:cursor-pointer file:me-3 file:inline-flex file:h-full file:items-center file:border-0 file:border-e file:border-h-border file:bg-transparent file:pe-3 file:text-sm file:font-medium file:text-h-field-foreground"

/* Adornments */
const adornment = "flex shrink-0 items-center text-h-muted [&_svg]:size-4"
const actionButton = [
  "relative h-touch-44 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-h-muted outline-none transition-colors [&_svg]:size-4",
  "[@media(hover:hover)]:hover:bg-h-default [@media(hover:hover)]:hover:text-h-foreground [@media(hover:hover)]:data-[hovered=true]:bg-h-default [@media(hover:hover)]:data-[hovered=true]:text-h-foreground",
  "focus-visible:h-focus-ring data-[focus-visible=true]:h-focus-ring",
].join(" ")

type InputProps = Omit<React.ComponentProps<"input">, "size" | "prefix"> &
  VariantProps<typeof fieldVariants> & {
    isInvalid?: boolean
    /** Shows a green edge and a check: the value passed validation. */
    isValid?: boolean
    /** Shows a spinner on the right, for example while a promo code is being checked. */
    isLoading?: boolean
    size?: FieldSize | number
    /** `pill` makes the field fully round, for search boxes. */
    shape?: "default" | "pill"
    /** Shows a clear button while the field has text. */
    clearable?: boolean
    /** Called after the clear button empties the field. */
    onClear?: () => void
    /** Shows "12/60" on the right. Needs `maxLength`. */
    showCount?: boolean
    /** Content inside the field on the left (an icon or a short text such as "$"). */
    prefix?: React.ReactNode
    /** Content inside the field on the right (a unit or an icon). Sits left of the other right-hand items. */
    suffix?: React.ReactNode
  }

/* Field with optional adornments. Plain `<Input />` renders just the input element, nothing is wrapped.
   Right-hand items (suffix, counter, status, clear, reveal) sit in one row; the input pads itself by its width. */
function Input({
  className,
  type,
  variant,
  size = "md",
  shape = "default",
  fullWidth = true,
  isInvalid,
  isValid,
  isLoading,
  clearable,
  onClear,
  showCount,
  prefix,
  suffix,
  ref,
  ...props
}: InputProps) {
  const inner = React.useRef<HTMLInputElement | null>(null)
  const right = React.useRef<HTMLDivElement | null>(null)
  const setRef = React.useCallback(
    (node: HTMLInputElement | null) => {
      inner.current = node
      if (typeof ref === "function") ref(node)
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node
    },
    [ref]
  )
  const [revealed, setRevealed] = React.useState(false)
  const [length, setLength] = React.useState(String(props.value ?? props.defaultValue ?? "").length)
  const [rightPad, setRightPad] = React.useState(0)
  React.useEffect(() => {
    if (props.value !== undefined) setLength(String(props.value).length)
  }, [props.value])

  const pop = usePop()
  const isPassword = type === "password"
  const counter = showCount && props.maxLength != null
  const filled = length > 0
  const wrapped = clearable || isPassword || isLoading || isValid || counter || prefix != null || suffix != null
  const resolved = typeof size === "string" ? size : "md"

  /* Measure the right-hand cluster and keep following it: its width changes when an item animates in or out, or when
     a suffix such as the copy button grows into a "Copied" pill. */
  React.useLayoutEffect(() => {
    const el = right.current
    if (!el) {
      setRightPad(0)
      return
    }
    const update = () => setRightPad(el.offsetWidth + 14)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [wrapped])

  const input = (
    <input
      ref={setRef}
      type={isPassword && revealed ? "text" : type}
      size={typeof size === "number" ? size : undefined}
      data-slot="input"
      data-invalid={isInvalid ? "true" : undefined}
      data-valid={isValid && !isInvalid ? "true" : undefined}
      aria-invalid={isInvalid ? true : props["aria-invalid"]}
      style={
        rightPad
          ? {
              paddingRight: rightPad,
              transitionProperty: "background-color, border-color, box-shadow, padding-right",
              transitionDuration: "150ms, 150ms, 150ms, 200ms",
              transitionTimingFunction: "ease, ease, ease-out, cubic-bezier(0.23, 1, 0.32, 1)",
              ...props.style,
            }
          : props.style
      }
      className={cn(
        fieldVariants({ variant, fullWidth }),
        fieldSizes[resolved],
        shape === "pill" && "rounded-full px-4",
        fieldControl,
        type === "file" && fileControl,
        prefix != null && (shape === "pill" ? "pl-10" : "pl-9"),
        isValid && !isInvalid && (variant === "underlined" ? "shadow-[inset_0_-2px_0_var(--h-success)]" : "shadow-[inset_0_0_0_1px_var(--h-success),0_0_0_3px_color-mix(in_oklab,var(--h-success)_22%,transparent)]"),
        className
      )}
      {...props}
      onChange={(e) => {
        setLength(e.target.value.length)
        props.onChange?.(e)
      }}
    />
  )
  if (!wrapped) return input

  const clear = () => {
    const el = inner.current
    if (!el) return
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
    setter?.call(el, "")
    el.dispatchEvent(new Event("input", { bubbles: true }))
    setLength(0)
    el.focus()
    onClear?.()
  }

  return (
    <div data-slot="input-wrapper" className={cn("relative", fullWidth ? "w-full" : "w-fit")}>
      {prefix != null ? (
        <span className={cn(adornment, "pointer-events-none absolute top-1/2 left-3 -translate-y-1/2", shape === "pill" && "left-4")}>{prefix}</span>
      ) : null}
      {input}
      <div ref={right} className={cn("absolute inset-y-0 right-2.5 flex items-center gap-1.5", shape === "pill" && "right-3")}>
        {suffix != null ? <span className={cn(adornment, "text-sm")}>{suffix}</span> : null}
        {counter ? (
          <span className={cn(adornment, "text-xs tabular-nums", length >= (props.maxLength ?? Infinity) && "text-h-danger-text")} aria-live="polite">
            {length}/{props.maxLength}
          </span>
        ) : null}
        <AnimatePresence initial={false}>
          {isLoading ? (
            <motion.span key="loading" className="flex" {...pop}>
              <Spinner size="sm" className="text-h-muted" />
            </motion.span>
          ) : isValid && !isInvalid ? (
            <motion.span key="valid" className="flex" {...pop}>
              <span role="img" aria-label="Valid" className="grid size-[18px] place-items-center rounded-full bg-h-success text-black"><Check weight="bold" className="size-3" /></span>
            </motion.span>
          ) : null}
          {clearable && filled ? (
            <motion.button key="clear" type="button" aria-label="Clear" onClick={clear} className={actionButton} {...pop}>
              <X weight="bold" />
            </motion.button>
          ) : null}
        </AnimatePresence>
        {isPassword ? (
          <button
            type="button"
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            onClick={() => setRevealed((r) => !r)}
            className={actionButton}
          >
            {revealed ? <EyeSlash weight="bold" /> : <Eye weight="bold" />}
          </button>
        ) : null}
      </div>
    </div>
  )
}

export { Input, fieldVariants as inputVariants, fieldSizes, fieldBase, fieldSecondary, fieldTertiary }
export type { FieldSize, InputProps }
