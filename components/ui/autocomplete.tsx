"use client"

import * as React from "react"
import { CaretDown, MagnifyingGlass, X } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { Description } from "./description"
import { FieldError } from "./field-error"
import { Label } from "./label"
import { ListBox, ListBoxItem } from "./list-box"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

/* Copied from the reference autocomplete.css: a field that opens a popover with a search box over a list, so you can filter
   a long list and choose from it. The field is the same box as our inputs (36px tall on desktop, 12px corners, the field
   fill, text inset 12px, a caret at the end that turns over while open) with `primary` and `secondary` fills. The popover is as wide
   as the field, 22px corners on the overlay fill with the overlay edge, a search row on top, and a 4px-padded list below
   (36px rows, 16px corners, a check at the end of the chosen row). Typing filters the list as you type; the arrow keys
   move through it, Enter or Space chooses, Escape closes. Choosing in single mode closes the popover; in multiple mode
   it stays open. A clear button appears when something is chosen. Invalid draws the danger outline and replaces the
   description with the error. */
type AutocompleteItem = { value: string; label: string; description?: string; disabled?: boolean; icon?: React.ReactNode }

type AutocompleteProps = {
  items: AutocompleteItem[]
  selectionMode?: "single" | "multiple"
  /** Chosen value(s). A string for single, a list for multiple. */
  value?: string | string[]
  defaultValue?: string | string[]
  onChange?: (value: string | string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  label?: React.ReactNode
  description?: React.ReactNode
  errorMessage?: React.ReactNode
  isInvalid?: boolean
  isDisabled?: boolean
  clearable?: boolean
  variant?: "primary" | "secondary"
  fullWidth?: boolean
  className?: string
  id?: string
  "aria-label"?: string
}

function Autocomplete({
  items, selectionMode = "single", value, defaultValue, onChange, placeholder = "Select", searchPlaceholder = "Search", emptyText = "No results", label, description, errorMessage,
  isInvalid, isDisabled, clearable = true, variant = "primary", fullWidth, className, id, "aria-label": ariaLabel,
}: AutocompleteProps) {
  const multiple = selectionMode === "multiple"
  const asList = (v?: string | string[]) => (v == null ? [] : Array.isArray(v) ? v : v ? [v] : [])
  const [inner, setInner] = React.useState<string[]>(asList(defaultValue))
  const selected = value !== undefined ? asList(value) : inner
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const auto = React.useId()
  const triggerId = id ?? auto
  const listRef = React.useRef<HTMLDivElement>(null)
  const filtered = items.filter((i) => i.label.toLowerCase().includes(query.trim().toLowerCase()))
  const emit = (next: string[]) => {
    setInner(next)
    onChange?.(multiple ? next : next[0] ?? "")
  }
  const shown = selected.map((v) => items.find((i) => i.value === v)?.label).filter(Boolean) as string[]
  const text = shown.length === 0 ? null : multiple && shown.length > 2 ? `${shown.length} selected` : shown.join(", ")

  return (
    <div data-slot="autocomplete" data-invalid={isInvalid ? "true" : undefined} className={cn("flex flex-col gap-1", fullWidth ? "w-full" : "w-fit", className)}>
      {label ? <Label htmlFor={triggerId} isInvalid={isInvalid} isDisabled={isDisabled} className="w-fit">{label}</Label> : null}
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery("") }}>
        <PopoverTrigger asChild>
          <button
            id={triggerId}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-label={label ? undefined : ariaLabel}
            aria-invalid={isInvalid || undefined}
            disabled={isDisabled}
            data-slot="autocomplete-trigger"
            data-placeholder={text === null ? "true" : undefined}
            className={cn(
              "relative isolate inline-flex min-h-10 w-full min-w-48 items-center rounded-[12px] px-3 py-2 pe-14 text-start text-sm text-h-field-foreground outline-none select-none md:min-h-9",
              "[transition:background-color_150ms_ease,box-shadow_150ms_var(--e-out)] motion-reduce:[transition:none]",
              variant === "primary"
                ? "bg-h-field shadow-[var(--h-field-outline)] [@media(hover:hover)]:hover:bg-h-field-hover"
                : "bg-(--h-field-secondary) shadow-none [@media(hover:hover)]:hover:bg-(--h-field-secondary-hover)",
              "focus-visible:bg-h-field-focus focus-visible:shadow-[0_0_0_2px_var(--h-focus)] disabled:h-status-disabled disabled:cursor-not-allowed",
              isInvalid && "bg-h-field-focus shadow-[0_0_0_1px_var(--h-danger)] focus-visible:shadow-[0_0_0_2px_var(--h-danger)]"
            )}
          >
            <span className={cn("flex-1 truncate", text === null && "text-h-field-placeholder")}>{text ?? placeholder}</span>
            <span className="absolute inset-y-0 end-2 my-auto flex items-center gap-1">
              {clearable && selected.length > 0 && !isDisabled ? (
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label="Clear"
                  data-slot="autocomplete-clear-button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); emit([]) }}
                  className="relative flex size-4 cursor-pointer items-center justify-center rounded-full text-h-field-placeholder before:absolute before:-inset-1.5 before:content-[''] hover:text-h-foreground"
                >
                  <X weight="bold" className="size-3" />
                </span>
              ) : null}
              <CaretDown weight="bold" aria-hidden className={cn("size-4 text-h-field-placeholder [transition:transform_150ms_ease] motion-reduce:[transition:none]", open && "rotate-180")} />
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          data-slot="autocomplete-popover"
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="flex w-(--radix-popover-trigger-width) min-w-56 flex-col overflow-hidden rounded-[22px] border-0 glass p-0 pt-2 text-sm text-h-foreground shadow-none outline-none"
        >
          <div className="relative mx-2 mb-1">
            <MagnifyingGlass aria-hidden weight="bold" className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-h-field-placeholder" />
            <input
              autoFocus
              type="text"
              role="searchbox"
              aria-label={searchPlaceholder}
              value={query}
              placeholder={searchPlaceholder}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); listRef.current?.querySelector<HTMLElement>('[role="option"]:not([aria-disabled="true"])')?.focus() }
                if (e.key === "Enter") { e.preventDefault(); const first = filtered.find((i) => !i.disabled); if (first) { emit(multiple ? (selected.includes(first.value) ? selected.filter((s) => s !== first.value) : [...selected, first.value]) : [first.value]); if (!multiple) setOpen(false) } }
              }}
              className="h-9 w-full rounded-[12px] bg-(--h-field-secondary) ps-9 pe-3 text-sm text-h-field-foreground outline-none placeholder:text-h-field-placeholder focus-visible:shadow-[0_0_0_2px_var(--h-focus)]"
            />
          </div>
          <div ref={listRef} className="max-h-64 overflow-y-auto overscroll-contain">
            {filtered.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-h-muted">{emptyText}</p>
            ) : (
              <ListBox
                className="p-1.5"
                aria-label={typeof label === "string" ? label : ariaLabel ?? "Options"}
                selectionMode={multiple ? "multiple" : "single"}
                value={selected}
                onChange={(next) => { emit(next); if (!multiple) setOpen(false) }}
              >
                {filtered.map((i) => (
                  <ListBoxItem key={i.value} value={i.value} description={i.description} icon={i.icon} disabled={i.disabled}>{i.label}</ListBoxItem>
                ))}
              </ListBox>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {isInvalid ? (errorMessage ? <FieldError>{errorMessage}</FieldError> : null) : description ? <Description>{description}</Description> : null}
    </div>
  )
}

export { Autocomplete }
export type { AutocompleteProps, AutocompleteItem }
