"use client"

import * as React from "react"
import type { DateRange } from "react-day-picker"
import { CalendarBlank } from "@phosphor-icons/react"
import { Popover as PopoverPrimitive } from "radix-ui"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { FieldError } from "@/components/ui/field-error"
import { Input, inputVariants, fieldSizes, type InputProps } from "@/components/ui/input"
import { Popover, PopoverContent } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/* Date fields for event dates, on-sale windows and doors-open times.
   - DateField: type a date ("6/14", "Jun 14 2026", "tomorrow") or pick it. Commits on Enter or blur, shows a
     clear error for text it cannot read, ArrowDown opens the calendar, presets sit under the calendar.
   - DateRangeField: the same for a window, with presets (next 7 days, this month), a live day count and Done.
   - TimeField: the native time input with optional one-tap presets (doors 18:00, show 20:00). */
type Common = Omit<InputProps, "min" | "max" | "value" | "defaultValue" | "onChange" | "type" | "suffix" | "prefix" | "readOnly" | "clearable">

const longFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" })
const shortFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const sameDay = (a?: Date, b?: Date) => !!a && !!b && a.getTime() === b.getTime()
const daysBetween = (a: Date, b: Date) => Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000) + 1

/** Reads what people actually type. Returns undefined when it cannot make a real date out of it. */
function parseDate(input: string, today = new Date()): Date | undefined {
  const t = input.trim().toLowerCase().replace(/,/g, " ").replace(/\s+/g, " ")
  if (!t) return undefined
  const base = startOfDay(today)
  if (t === "today") return base
  if (t === "tomorrow") return addDays(base, 1)
  if (t === "yesterday") return addDays(base, -1)
  const valid = (y: number, m: number, d: number) => {
    const dt = new Date(y, m, d)
    return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d ? dt : undefined
  }
  const year = (y: string | undefined) => (y ? (y.length === 2 ? 2000 + Number(y) : Number(y)) : base.getFullYear())
  let m: RegExpMatchArray | null
  if ((m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) return valid(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  if ((m = t.match(/^(\d{1,2})[/.\-](\d{1,2})(?:[/.\-](\d{2,4}))?$/))) return valid(year(m[3]), Number(m[1]) - 1, Number(m[2]))
  if ((m = t.match(/^([a-z]{3,9})\.? (\d{1,2})(?: (\d{2,4}))?$/))) {
    const mi = MONTHS.indexOf(m[1].slice(0, 3))
    return mi >= 0 ? valid(year(m[3]), mi, Number(m[2])) : undefined
  }
  if ((m = t.match(/^(\d{1,2}) ([a-z]{3,9})\.?(?: (\d{2,4}))?$/))) {
    const mi = MONTHS.indexOf(m[2].slice(0, 3))
    return mi >= 0 ? valid(year(m[3]), mi, Number(m[1])) : undefined
  }
  return undefined
}

const numericFmt = (d: Date) => `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`
/** Digits only, with the slashes put in: 12 -> 12, 123 -> 12/3, 12312000 -> 12/31/2000. */
const maskDate = (raw: string) => {
  const d = raw.replace(/\D/g, "").slice(0, 8)
  return d.length <= 2 ? d : d.length <= 4 ? `${d.slice(0, 2)}/${d.slice(2)}` : `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

function useWideCalendar() {
  const [wide, setWide] = React.useState(true)
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 700px)")
    const set = () => setWide(mq.matches)
    set()
    mq.addEventListener("change", set)
    return () => mq.removeEventListener("change", set)
  }, [])
  return wide
}

/* h-8 on phones, 36px from md (the button's own md height), 13px text on a 1.5 line height. */
const presetBtn = "h-8 rounded-full px-3 text-[13px] leading-[1.5] font-medium md:h-9"

function DateField({
  value,
  defaultValue,
  onValueChange,
  placeholder = "MM/DD/YYYY",
  min,
  max,
  presets = true,
  captionLayout,
  defaultMonth,
  numeric,
  ...props
}: Common & {
  value?: Date | undefined
  defaultValue?: Date
  onValueChange?: (d: Date | undefined) => void
  /** Earliest and latest selectable day. */
  min?: Date
  max?: Date
  /** Today, Tomorrow and In a week under the calendar. */
  presets?: boolean
  /** `dropdown` adds month and year selectors to the calendar, for dates far from today such as a birth date. */
  captionLayout?: "label" | "dropdown" | "dropdown-months" | "dropdown-years"
  /** The month the calendar opens on when no date is chosen yet. */
  defaultMonth?: Date
  /** Types and shows MM/DD/YYYY: the slashes are added as you type, and a picked date shows in the same form. */
  numeric?: boolean
}) {
  const show = (d: Date) => (numeric ? numericFmt(d) : longFmt.format(d))
  const [inner, setInner] = React.useState<Date | undefined>(defaultValue)
  const date = value !== undefined ? value : inner
  const [text, setText] = React.useState(date ? show(date) : "")
  const [focused, setFocused] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [open, setOpen] = React.useState(false)
  React.useEffect(() => {
    // keep what the person typed visible while it is showing an error
    if (!focused && !error) setText(date ? show(date) : "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, focused, error])

  const inRange = (d: Date) => (!min || d >= startOfDay(min)) && (!max || d <= startOfDay(max))
  const commit = (d: Date | undefined) => {
    if (value === undefined) setInner(d)
    onValueChange?.(d)
    setError(null)
  }
  const finish = () => {
    if (!text.trim()) return commit(undefined)
    const d = parseDate(text)
    if (!d) return setError("Enter a date like 06/14/2026 or Jun 14")
    if (!inRange(d)) return setError(min && d < startOfDay(min) ? `Pick ${longFmt.format(min)} or later` : `Pick ${longFmt.format(max!)} or earlier`)
    commit(d)
    setText(show(d))
  }
  const disabled = (d: Date) => !inRange(d)
  const pick = (d: Date | undefined) => {
    commit(d)
    if (d) setText(show(d))
    setOpen(false)
  }
  const today = startOfDay(new Date())

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Anchor asChild>
          <div className="w-full">
            <Input
              {...props}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={text}
              placeholder={placeholder}
              isInvalid={props.isInvalid || error != null}
              onFocus={(e) => { setFocused(true); props.onFocus?.(e) }}
              onBlur={(e) => { setFocused(false); finish(); props.onBlur?.(e) }}
              onChange={(e) => { setText(numeric ? maskDate(e.target.value) : e.target.value); if (error) setError(null) }}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); finish() }
                if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true) }
                props.onKeyDown?.(e)
              }}
              suffix={
                <PopoverPrimitive.Trigger asChild>
                  <button type="button" aria-label="Open calendar" className="relative h-touch-44 flex size-6 cursor-pointer items-center justify-center rounded-full text-h-muted outline-none transition-colors hover:bg-h-default hover:text-h-foreground focus-visible:h-focus-ring [&_svg]:size-5">
                    <CalendarBlank weight="bold" />
                  </button>
                </PopoverPrimitive.Trigger>
              }
            />
          </div>
        </PopoverPrimitive.Anchor>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar mode="single" selected={date} onSelect={pick} defaultMonth={date ?? defaultMonth} disabled={disabled}
            captionLayout={captionLayout} startMonth={captionLayout?.startsWith("dropdown") ? new Date(min?.getFullYear() ?? 1900, 0) : undefined} endMonth={captionLayout?.startsWith("dropdown") ? new Date(max?.getFullYear() ?? new Date().getFullYear() + 10, 11) : undefined} className="rounded-[16px]" />
          {presets ? (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-h-separator px-3 py-2.5">
              {([["Today", today], ["Tomorrow", addDays(today, 1)], ["In a week", addDays(today, 7)]] as const).map(([label, d]) => (
                <Button key={label} variant="tertiary" className={presetBtn} disabled={!inRange(d)} onClick={() => pick(d)}>{label}</Button>
              ))}
              {date ? <Button variant="ghost" className={cn(presetBtn, "ml-auto")} onClick={() => pick(undefined)}>Clear</Button> : null}
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
      {error ? <FieldError>{error}</FieldError> : null}
    </>
  )
}

function DateRangeField({
  value,
  defaultValue,
  onValueChange,
  placeholder = "Select dates",
  min,
  max,
  ...props
}: Common & {
  value?: DateRange | undefined
  defaultValue?: DateRange
  onValueChange?: (r: DateRange | undefined) => void
  min?: Date
  max?: Date
}) {
  const [inner, setInner] = React.useState<DateRange | undefined>(defaultValue)
  const range = value !== undefined ? value : inner
  const [open, setOpen] = React.useState(false)
  const [hover, setHover] = React.useState<Date | undefined>()
  const wide = useWideCalendar()
  const set = (r: DateRange | undefined) => {
    if (value === undefined) setInner(r)
    onValueChange?.(r)
  }
  const label = range?.from ? (range.to && !sameDay(range.from, range.to) ? `${shortFmt.format(range.from)} to ${longFmt.format(range.to)}` : longFmt.format(range.from)) : ""
  const days = range?.from && range.to ? daysBetween(range.from, range.to) : range?.from ? 1 : 0
  /* While choosing the last day, the days between the first day and the hovered day preview as a band. */
  const choosing = !!range?.from && (!range.to || sameDay(range.from, range.to)) && !!hover && hover > range.from
  const previewMiddle: Date[] = choosing ? Array.from({ length: Math.max(0, daysBetween(range!.from!, hover!) - 2) }, (_, i) => addDays(range!.from!, i + 1)) : []
  const previewEnd = choosing ? hover : undefined
  const today = startOfDay(new Date())
  const somDate = new Date(today.getFullYear(), today.getMonth(), 1)
  const quick: [string, DateRange][] = [
    ["Next 7 days", { from: today, to: addDays(today, 6) }],
    ["Next 30 days", { from: today, to: addDays(today, 29) }],
    ["This month", { from: today, to: new Date(somDate.getFullYear(), somDate.getMonth() + 1, 0) }],
    ["Next month", { from: new Date(somDate.getFullYear(), somDate.getMonth() + 1, 1), to: new Date(somDate.getFullYear(), somDate.getMonth() + 2, 0) }],
  ]
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Anchor asChild>
        <div className="w-full" onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true) } }}>
          <PopoverPrimitive.Trigger asChild>
            <div className="w-full">
              <Input
                {...props}
                readOnly
                value={label}
                placeholder={placeholder}
                className="cursor-pointer"
                suffix={<span className="flex items-center gap-1.5">{days > 1 ? <span className="text-xs tabular-nums">{days} days</span> : null}<CalendarBlank weight="bold" /></span>}
                aria-haspopup="dialog"
                aria-expanded={open}
              />
            </div>
          </PopoverPrimitive.Trigger>
        </div>
      </PopoverPrimitive.Anchor>
      <PopoverContent align="start" className="w-auto p-0">
        <div className="flex flex-col md:flex-row">
          <div className="flex flex-wrap gap-1.5 border-b border-h-separator p-3 md:w-40 md:flex-col md:flex-nowrap md:border-r md:border-b-0">
            {quick.map(([name, r]) => (
              <Button key={name} variant={range?.from && sameDay(range.from, r.from) && sameDay(range.to, r.to) ? "secondary" : "tertiary"} className={cn(presetBtn, "md:w-full md:justify-start")} onClick={() => set(r)}>
                {name}
              </Button>
            ))}
          </div>
          <Calendar
            mode="range"
            selected={range}
            onSelect={set}
            defaultMonth={range?.from}
            numberOfMonths={wide ? 2 : 1}
            onDayMouseEnter={(d) => setHover(startOfDay(d))}
            onDayMouseLeave={() => setHover(undefined)}
            modifiers={{
              preview: previewMiddle,
              previewEnd: previewEnd ? [previewEnd] : [],
            }}
            modifiersClassNames={{
              preview: "bg-h-accent-soft transition-[background-color] duration-100",
              previewEnd: "bg-[linear-gradient(to_left,transparent_50%,var(--h-accent-soft)_50%)]",
            }}
            disabled={(d) => (!!min && d < startOfDay(min)) || (!!max && d > startOfDay(max))}
            className="rounded-[16px]"
          />
        </div>
        <div className="flex items-center gap-2 border-t border-h-separator px-3 py-2.5">
          <p className="text-sm tabular-nums text-h-muted" aria-live="polite">
            {range?.from ? (
              <><span className="font-medium text-h-foreground">{days} {days === 1 ? "day" : "days"}</span>{range.to ? "" : ", pick the last day"}</>
            ) : "Pick the first day"}
          </p>
          <div className="ml-auto flex gap-1.5">
            {range?.from ? <Button variant="ghost" className={presetBtn} onClick={() => set(undefined)}>Clear</Button> : null}
            <Button className={presetBtn} disabled={!range?.from} onClick={() => setOpen(false)}>Done</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/* ---- Time ------------------------------------------------------------------------------------------------
   US 12-hour time, entered in segments like a native time input but identical on every system: hours, then minutes
   as a whole, then AM / PM. Only digits (and a or p) are accepted, so there is nothing to validate. The value is a
   plain "HH:MM" 24-hour string, or "" while it is incomplete.
   Hours: 2-9 complete at once, 1 waits for 0-2 (10, 11, 12). Minutes: 0-5 waits for a second digit, 6-9 become 06-09.
   Arrow up and down step a segment, left and right (or typing past the end) move between segments, Backspace clears. */
const pad = (n: number) => String(n).padStart(2, "0")
const to12 = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number)
  return { h: h % 12 === 0 ? 12 : h % 12, m, period: (h >= 12 ? "PM" : "AM") as "AM" | "PM" }
}
const formatTime = (hhmm: string) => {
  const t = to12(hhmm)
  return `${t.h}:${pad(t.m)} ${t.period}`
}
const to24 = (h12: number, m: number, p: "AM" | "PM") => `${pad((h12 % 12) + (p === "PM" ? 12 : 0))}:${pad(m)}`

type Seg = "h" | "m" | "p"

function TimeField({
  className,
  presets,
  value,
  defaultValue,
  onValueChange,
  step = 15,
  size = "md",
  variant,
  isInvalid,
  disabled,
  ...props
}: Omit<InputProps, "type" | "suffix" | "prefix" | "value" | "defaultValue" | "onChange" | "step" | "min" | "max" | "clearable"> & {
  /** "HH:MM" in 24-hour form. */
  value?: string
  defaultValue?: string
  onValueChange?: (hhmm: string) => void
  /** Minutes moved by PageUp and PageDown (arrows move one). */
  step?: number
  /** One-tap times under the field, "HH:MM" in 24-hour form. */
  presets?: string[]
}) {
  const initial = (value ?? defaultValue ?? "") ? to12(value ?? defaultValue ?? "") : null
  const [hour, setHour] = React.useState<number | null>(initial ? initial.h : null)
  const [minute, setMinute] = React.useState<number | null>(initial ? initial.m : null)
  const [period, setPeriod] = React.useState<"AM" | "PM">(initial ? initial.period : "PM")
  const buf = React.useRef<{ seg: Seg | null; text: string }>({ seg: null, text: "" })
  const refs = { h: React.useRef<HTMLDivElement>(null), m: React.useRef<HTMLDivElement>(null), p: React.useRef<HTMLButtonElement>(null) }

  // follow a controlled value
  React.useEffect(() => {
    if (value === undefined) return
    if (!value) return
    const t = to12(value)
    setHour(t.h); setMinute(t.m); setPeriod(t.period)
  }, [value])

  const emit = (h: number | null, m: number | null, p: "AM" | "PM") => {
    onValueChange?.(h != null && m != null ? to24(h, m, p) : "")
  }
  const set = (next: { h?: number | null; m?: number | null; p?: "AM" | "PM" }) => {
    const h = next.h !== undefined ? next.h : hour
    const m = next.m !== undefined ? next.m : minute
    const p = next.p ?? period
    setHour(h); setMinute(m); setPeriod(p)
    emit(h, m, p)
  }
  const focusSeg = (seg: Seg) => refs[seg].current?.focus()
  const order: Seg[] = ["h", "m", "p"]
  const move = (seg: Seg, dir: 1 | -1) => {
    const i = order.indexOf(seg) + dir
    if (i >= 0 && i < order.length) focusSeg(order[i])
  }
  const wrap = (n: number, lo: number, hi: number) => (n > hi ? lo : n < lo ? hi : n)

  const onKey = (seg: Seg) => (e: React.KeyboardEvent) => {
    if (disabled) return
    const k = e.key
    if (k === "Tab") return
    if (k === "ArrowLeft") { e.preventDefault(); return move(seg, -1) }
    if (k === "ArrowRight") { e.preventDefault(); return move(seg, 1) }
    if (k === "a" || k === "A") { e.preventDefault(); return set({ p: "AM" }) }
    if (k === "p" || k === "P") { e.preventDefault(); return set({ p: "PM" }) }
    if (seg === "p") {
      if (k === "ArrowUp" || k === "ArrowDown" || k === " ") { e.preventDefault(); set({ p: period === "AM" ? "PM" : "AM" }) }
      return
    }
    if (k === "ArrowUp" || k === "ArrowDown") {
      e.preventDefault()
      const dir = k === "ArrowUp" ? 1 : -1
      buf.current = { seg: null, text: "" }
      if (seg === "h") set({ h: wrap((hour ?? (dir === 1 ? 0 : 13)) + dir, 1, 12) })
      else set({ m: wrap((minute ?? (dir === 1 ? -1 : 60)) + dir, 0, 59) })
      return
    }
    if (k === "PageUp" || k === "PageDown") {
      e.preventDefault()
      const dir = k === "PageUp" ? 1 : -1
      if (seg === "m") set({ m: ((minute ?? 0) + dir * step + 60) % 60 })
      return
    }
    if (k === "Backspace" || k === "Delete") {
      e.preventDefault()
      buf.current = { seg: null, text: "" }
      if (seg === "h") { if (hour == null) return; set({ h: null }) }
      else if (minute == null) move(seg, -1)
      else set({ m: null })
      return
    }
    if (/^\d$/.test(k)) {
      e.preventDefault()
      const d = Number(k)
      const pending = buf.current.seg === seg ? buf.current.text : ""
      if (seg === "h") {
        if (pending === "1") {
          if (d <= 2) { buf.current = { seg: null, text: "" }; set({ h: 10 + d }); focusSeg("m") }
          else { buf.current = { seg: null, text: "" }; set({ h: 1 }); focusSeg("m"); typeInto("m", d) }
          return
        }
        if (d === 0) { buf.current = { seg: "h", text: "0" }; return }
        if (d === 1) { buf.current = { seg: "h", text: "1" }; set({ h: 1 }); return }
        buf.current = { seg: null, text: "" }; set({ h: d }); focusSeg("m")
        return
      }
      typeInto("m", d, pending)
      return
    }
    // anything else is ignored: the field only takes digits, a and p
    if (k.length === 1) e.preventDefault()
  }
  function typeInto(_seg: "m", d: number, pending = "") {
    if (pending) {
      const m = Number(pending + d)
      buf.current = { seg: null, text: "" }
      set({ m })
      focusSeg("p")
      return
    }
    if (d <= 5) { buf.current = { seg: "m", text: String(d) }; set({ m: d }); return }
    buf.current = { seg: null, text: "" }
    set({ m: d })
    focusSeg("p")
  }

  const segBase =
    "rounded-md px-1 py-0.5 text-center tabular-nums caret-transparent outline-none select-none transition-colors duration-100 focus:bg-h-accent-soft focus:text-h-accent-soft-foreground"
  const empty = "text-h-field-placeholder"
  const shown = (n: number | null, two: boolean) => (n == null ? "--" : two ? pad(n) : String(n))
  const fieldClass = cn(
    inputVariants({ variant, fullWidth: true }),
    fieldSizes[size as keyof typeof fieldSizes],
    "flex items-center gap-0.5 focus-within:shadow-(--field-focus) focus-within:bg-(--input-bg-focus)",
    isInvalid && "shadow-(--field-invalid)",
    disabled && "pointer-events-none opacity-50",
    className
  )

  return (
    <div className="w-full">
      <div
        role="group"
        aria-label={(props as { "aria-label"?: string })["aria-label"] ?? "Time"}
        className={fieldClass}
        data-slot="time-field"
        onBlur={() => { buf.current = { seg: null, text: "" } }}
      >
        <div ref={refs.h} role="spinbutton" tabIndex={disabled ? -1 : 0} aria-label="Hour" aria-valuemin={1} aria-valuemax={12} aria-valuenow={hour ?? undefined} aria-valuetext={hour == null ? "Empty" : String(hour)} onKeyDown={onKey("h")} onFocus={() => { buf.current = { seg: null, text: "" } }} className={cn(segBase, "min-w-6", hour == null && empty)}>
          {shown(hour, false)}
        </div>
        <span aria-hidden className="text-h-muted">:</span>
        <div ref={refs.m} role="spinbutton" tabIndex={disabled ? -1 : 0} aria-label="Minute" aria-valuemin={0} aria-valuemax={59} aria-valuenow={minute ?? undefined} aria-valuetext={minute == null ? "Empty" : pad(minute)} onKeyDown={onKey("m")} onFocus={() => { buf.current = { seg: null, text: "" } }} className={cn(segBase, "min-w-6", minute == null && empty)}>
          {shown(minute, true)}
        </div>
        <span role="group" aria-label="AM or PM" className="ml-auto flex rounded-full bg-h-default p-0.5 text-xs font-semibold">
          {(["AM", "PM"] as const).map((p) => (
            <button
              key={p}
              ref={p === period ? refs.p : undefined}
              type="button"
              aria-pressed={period === p}
              onKeyDown={onKey("p")}
              onClick={() => set({ p })}
              className={cn(
                "h-5 min-w-8 cursor-pointer rounded-full px-1.5 outline-none transition-[background-color,color,box-shadow] duration-150 focus-visible:h-focus-ring",
                period === p ? "bg-h-surface text-h-foreground shadow-[var(--h-field-outline)]" : "text-h-muted hover:text-h-foreground"
              )}
            >
              {p}
            </button>
          ))}
        </span>
      </div>
      {presets?.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <Button key={p} type="button" variant={hour != null && minute != null && to24(hour, minute, period) === p ? "secondary" : "tertiary"} className={presetBtn} onClick={() => { const t = to12(p); set({ h: t.h, m: t.m, p: t.period }) }}>
              {formatTime(p)}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export { DateField, DateRangeField, TimeField, parseDate }
