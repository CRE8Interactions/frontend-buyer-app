"use client"

import * as React from "react"
import { Input, type InputProps } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/* Money field (built on Input): currency sign as a prefix, ISO code as a suffix, digits right-aligned in tabular figures, grouped
   and padded to the right number of decimals when you leave the field. `value` is a plain number. */
type CurrencyInputProps = Omit<InputProps, "value" | "defaultValue" | "onChange" | "type" | "prefix" | "suffix"> & {
  value?: number | null
  defaultValue?: number | null
  onValueChange?: (value: number | null) => void
  /** ISO 4217 code. The sign comes from Intl. */
  currency?: string
  locale?: string
  decimals?: number
  min?: number
  max?: number
  /** Hide the code on the right. */
  hideCode?: boolean
}

function symbolFor(currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "narrowSymbol" })
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value ?? currency
  } catch {
    return currency
  }
}

function CurrencyInput({
  value,
  defaultValue = null,
  onValueChange,
  currency = "USD",
  locale = "en-US",
  decimals = 2,
  min,
  max,
  hideCode,
  className,
  onBlur,
  ...props
}: CurrencyInputProps) {
  const fmt = React.useMemo(
    () => new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
    [locale, decimals]
  )
  const [inner, setInner] = React.useState<number | null>(defaultValue)
  const current = value !== undefined ? value : inner
  const [text, setText] = React.useState(current == null ? "" : fmt.format(current))
  const focused = React.useRef(false)
  React.useEffect(() => {
    if (!focused.current) setText(current == null ? "" : fmt.format(current))
  }, [current, fmt])

  const clampNum = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n))
  const commit = (n: number | null) => {
    if (value === undefined) setInner(n)
    onValueChange?.(n)
  }

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      prefix={symbolFor(currency, locale)}
      suffix={hideCode ? undefined : currency}
      value={text}
      className={cn("text-right tabular-nums", className)}
      onFocus={(e) => {
        focused.current = true
        // show the raw number while editing
        setText(current == null ? "" : String(current))
        props.onFocus?.(e)
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d.]/g, "")
        const [intPart, ...rest] = raw.split(".")
        const cleaned = rest.length ? `${intPart}.${rest.join("").slice(0, decimals)}` : intPart
        setText(cleaned)
        const n = cleaned === "" || cleaned === "." ? null : Number(cleaned)
        commit(n)
      }}
      onBlur={(e) => {
        focused.current = false
        const n = text === "" || text === "." ? null : clampNum(Number(text))
        commit(n)
        setText(n == null ? "" : fmt.format(n))
        onBlur?.(e)
      }}
    />
  )
}

export { CurrencyInput }
export type { CurrencyInputProps }
