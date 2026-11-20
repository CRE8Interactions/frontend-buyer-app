"use client"

import * as React from "react"
import { AsYouType, getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js"
import * as Flags from "country-flag-icons/react/3x2"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input, type InputProps } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/* Mobile number field (built on Input): a country picker (flag and caret, the shipped Select) on the left, the number formatted
   as you type for that country. `value` is the E.164 string ("+12123123123") or undefined, so it stores and validates anywhere.
   Typing a leading "+" switches the country to match. */
type PhoneInputProps = Omit<InputProps, "value" | "defaultValue" | "onChange" | "type" | "prefix" | "suffix"> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string | undefined) => void
  defaultCountry?: CountryCode
  onCountryChange?: (country: CountryCode) => void
}

const names = typeof Intl !== "undefined" && "DisplayNames" in Intl ? new Intl.DisplayNames(["en"], { type: "region" }) : null
const COUNTRIES = getCountries()
  .map((c) => ({ code: c, name: names?.of(c) ?? c, dial: getCountryCallingCode(c) }))
  .sort((a, b) => a.name.localeCompare(b.name))

function Flag({ country, className }: { country: CountryCode; className?: string }) {
  const Svg = (Flags as unknown as Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>>)[country]
  return Svg ? <Svg aria-hidden className={cn("h-[14px] w-5 rounded-[2px]", className)} /> : <span className={cn("h-[14px] w-5", className)} />
}

/** The national part as the user sees it ("(212) 312-3123"), from an E.164 value. */
function display(value: string | undefined, country: CountryCode) {
  if (!value) return ""
  const p = parsePhoneNumberFromString(value)
  if (p && p.country === country) return p.formatNational()
  return new AsYouType(country).input(value.replace(/^\+\d+/, (m) => (m === `+${getCountryCallingCode(country)}` ? "" : m)))
}

function PhoneInput({ value, defaultValue, onValueChange, defaultCountry = "US", onCountryChange, size = "md", className, onBlur, onFocus, placeholder, ...props }: PhoneInputProps) {
  const initial = defaultValue ?? value
  const [inner, setInner] = React.useState<string | undefined>(defaultValue)
  const current = value !== undefined ? value : inner
  const [country, setCountry] = React.useState<CountryCode>(() => (initial && parsePhoneNumberFromString(initial)?.country) || defaultCountry)
  const [text, setText] = React.useState(() => display(current, country))
  const focused = React.useRef(false)

  React.useEffect(() => {
    if (focused.current) return
    const p = current ? parsePhoneNumberFromString(current) : undefined
    const c = p?.country ?? country
    if (p?.country && p.country !== country) setCountry(p.country)
    setText(display(current, c))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])

  const commit = (next: string | undefined) => {
    setInner(next)
    onValueChange?.(next)
  }
  const e164 = (c: CountryCode, national: string) => {
    const digits = national.replace(/\D/g, "")
    return digits ? `+${getCountryCallingCode(c)}${digits}` : undefined
  }

  const onType = (raw: string) => {
    if (raw.trim().startsWith("+")) {
      const digits = raw.replace(/\D/g, "")
      const p = parsePhoneNumberFromString(`+${digits}`)
      const c = p?.country ?? country
      if (p?.country && p.country !== country) {
        setCountry(p.country)
        onCountryChange?.(p.country)
      }
      setText(p ? p.formatNational() : raw)
      commit(digits ? `+${digits}` : undefined)
      return
    }
    const formatted = new AsYouType(country).input(raw)
    setText(formatted)
    commit(e164(country, formatted))
  }

  const pick = (c: CountryCode) => {
    setCountry(c)
    onCountryChange?.(c)
    const national = text.replace(/\D/g, "")
    setText(new AsYouType(c).input(national))
    commit(e164(c, national))
  }

  const pad = size === "sm" || size === "md" ? "pl-[4.25rem]" : "pl-[4.75rem]"
  return (
    <div data-slot="phone-input" className="relative w-full">
      <Select value={country} onValueChange={(c) => pick(c as CountryCode)} disabled={props.disabled}>
        <SelectTrigger
          aria-label="Country"
          size={typeof size === "number" ? "md" : size}
          className={cn("absolute inset-y-0 left-0 z-10 h-full! w-auto gap-1.5 rounded-r-none bg-transparent px-3 shadow-none hover:bg-transparent focus-visible:bg-transparent", size === "lg" && "px-4")}
        >
          <SelectValue><Flag country={country} /></SelectValue>
        </SelectTrigger>
        <SelectContent position="popper" align="start" className="max-h-72">
          {COUNTRIES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              <Flag country={c.code} />
              <span>{c.name}</span>
              <span className="text-h-muted">+{c.dial}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        {...props}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        size={size}
        value={text}
        placeholder={placeholder ?? new AsYouType(country).input(country === "US" ? "2125551234" : "")}
        className={cn(pad, className)}
        onFocus={(e) => {
          focused.current = true
          onFocus?.(e)
        }}
        onBlur={(e) => {
          focused.current = false
          onBlur?.(e)
        }}
        onChange={(e) => onType(e.target.value)}
      />
    </div>
  )
}

export { PhoneInput }
export type { PhoneInputProps }
