"use client"

import * as React from "react"
import { FunnelSimple, MagnifyingGlass } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input, type InputProps } from "@/components/ui/input"
import { Kbd, KbdGroup } from "@/components/ui/kbd"

/* Search box: magnifier prefix, a clear button while typing, a keyboard hint ("⌘K", "/") at the right while empty
   and an optional filter button beside it with an active-filter count. `shortcut` also focuses the field. */
type SearchFieldProps = Omit<InputProps, "prefix" | "suffix" | "type" | "clearable"> & {
  shortcutLabel?: string
  /** Key (with meta or ctrl) that focuses the field, for example "k". */
  shortcutKey?: string
  onFilterClick?: () => void
  filterCount?: number
}

function SearchField({ shortcutLabel = "⌘K", shortcutKey = "k", onFilterClick, filterCount = 0, shape = "pill", className, ...props }: SearchFieldProps) {
  const ref = React.useRef<HTMLInputElement | null>(null)
  const [hasText, setHasText] = React.useState(Boolean(props.value ?? props.defaultValue))
  React.useEffect(() => {
    if (!shortcutKey) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === shortcutKey) {
        e.preventDefault()
        ref.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [shortcutKey])
  return (
    <div className="flex w-full items-center gap-2">
      <Input
        {...props}
        ref={ref}
        type="search"
        shape={shape}
        clearable
        prefix={<MagnifyingGlass weight="bold" />}
        suffix={!hasText && shortcutLabel ? <KbdGroup>{Array.from(shortcutLabel).map((key, index) => <Kbd key={index} keys={[key]} className="bg-h-foreground/10" />)}</KbdGroup> : undefined}
        className={cn("[&::-webkit-search-cancel-button]:hidden", className)}
        onChange={(e) => {
          setHasText(e.target.value.length > 0)
          props.onChange?.(e)
        }}
      />
      {onFilterClick ? (
        <Button variant="tertiary" iconOnly aria-label={filterCount ? `Filters, ${filterCount} active` : "Filters"} onClick={onFilterClick} className="relative shrink-0">
          <FunnelSimple weight="bold" />
          {filterCount > 0 ? (
            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-h-accent text-[10px] leading-none font-semibold text-h-accent-foreground tabular-nums">{filterCount}</span>
          ) : null}
        </Button>
      ) : null}
    </div>
  )
}

export { SearchField }
export type { SearchFieldProps }
