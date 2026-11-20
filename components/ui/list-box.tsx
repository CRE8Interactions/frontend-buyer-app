"use client"

import * as React from "react"
import { Check } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { menuRowRadius } from "@/lib/menu-item"
import { Kbd } from "./kbd"

/* Copied from the reference list-box.css and list-box-item.css. A ListBox is an always-visible list you choose from: one
   item (`single`), several (`multiple`) or none (`none`, a plain list of actions). 4px of padding and a 4px gap between
   rows; separators span 94% of the width, centred. A row is at least 36px tall with 16px corners, 8px side padding and a
   12px gap between its parts; hover and keyboard focus use the default fill, pressing scales it to 98%, the keyboard shows
   the focus ring, disabled rows dim. A selected row shows a 10px check in a 16px box at its end (and gains 28px of end
   padding). `description` adds a muted line under the label, `icon` an icon at the start, `shortcut` a keyboard hint at the
   end, and `variant="danger"` colours the label and check red. Keyboard: Tab enters the list on the selected row, the arrow
   keys move (Home and End jump), Space or Enter chooses. */
type SelectionMode = "single" | "multiple" | "none"
const Ctx = React.createContext<{ mode: SelectionMode; selected: string[]; choose: (v: string) => void }>({ mode: "single", selected: [], choose: () => {} })

type ListBoxProps = Omit<React.ComponentProps<"div">, "onChange" | "defaultValue"> & {
  selectionMode?: SelectionMode
  /** Selected values (controlled). For single selection pass one value or none. */
  value?: string[]
  defaultValue?: string[]
  onChange?: (values: string[]) => void
}

function ListBox({ selectionMode = "single", value, defaultValue = [], onChange, className, children, onKeyDown, ...props }: ListBoxProps) {
  const [inner, setInner] = React.useState<string[]>(defaultValue)
  const selected = value ?? inner
  const choose = React.useCallback(
    (v: string) => {
      if (selectionMode === "none") return
      const next = selectionMode === "single" ? [v] : selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]
      setInner(next)
      onChange?.(next)
    },
    [selectionMode, selected, onChange]
  )
  const move = (e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e)
    if (e.defaultPrevented) return
    const keys = ["ArrowDown", "ArrowUp", "Home", "End"]
    if (!keys.includes(e.key)) return
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="option"]:not([aria-disabled="true"]), [data-slot="list-box-action"]:not([aria-disabled="true"])'))
    if (!items.length) return
    const at = items.indexOf(document.activeElement as HTMLElement)
    const next = e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : e.key === "ArrowDown" ? Math.min(items.length - 1, at + 1) : Math.max(0, at - 1)
    e.preventDefault()
    items[next]?.focus()
  }
  return (
    <Ctx.Provider value={{ mode: selectionMode, selected, choose }}>
      <div
        role="listbox"
        aria-multiselectable={selectionMode === "multiple" || undefined}
        data-slot="list-box"
        data-selection-mode={selectionMode}
        onKeyDown={move}
        className={cn("relative w-full overflow-clip p-1 [&>*+*]:mt-1 [&_[data-slot=list-box-separator]]:ms-[3%] [&_[data-slot=list-box-separator]]:w-[94%]", className)}
        {...props}
      >
        {children}
      </div>
    </Ctx.Provider>
  )
}

type ListBoxItemProps = Omit<React.ComponentProps<"div">, "id"> & {
  /** The value this row stands for. Defaults to its text. */
  value?: string
  description?: React.ReactNode
  icon?: React.ReactNode
  shortcut?: string | string[]
  variant?: "default" | "danger"
  disabled?: boolean
}

function ListBoxItem({ value, description, icon, shortcut, variant = "default", disabled, className, children, onClick, onKeyDown, ...props }: ListBoxItemProps) {
  const { mode, selected, choose } = React.useContext(Ctx)
  const key = value ?? (typeof children === "string" ? children : "")
  const isSelected = selected.includes(key)
  const danger = variant === "danger"
  const tabbable = mode === "none" ? true : isSelected || (selected.length === 0 && undefined)
  return (
    <div
      role={mode === "none" ? undefined : "option"}
      data-slot={mode === "none" ? "list-box-action" : "list-box-item"}
      aria-selected={mode === "none" ? undefined : isSelected}
      aria-disabled={disabled || undefined}
      data-selected={isSelected ? "true" : undefined}
      data-disabled={disabled ? "true" : undefined}
      tabIndex={disabled ? -1 : tabbable ? 0 : -1}
      onClick={(e) => { onClick?.(e); if (!disabled && !e.defaultPrevented) choose(key) }}
      onKeyDown={(e) => {
        onKeyDown?.(e)
        if (disabled || e.defaultPrevented) return
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); choose(key); if (mode === "none") e.currentTarget.click() }
      }}
      className={cn(
        menuRowRadius,
        "group/item relative flex min-h-9 w-full cursor-pointer items-center justify-start gap-3 px-2 py-1.5 text-sm text-h-foreground outline-none h-no-highlight",
        "[transition:transform_250ms_cubic-bezier(0.165,0.84,0.44,1),box-shadow_150ms_var(--e-out),background-color_100ms_var(--e-out)] motion-reduce:[transition:none]",
        "[@media(hover:hover)]:hover:bg-h-default focus-visible:h-focus-ring active:[transform:scale(0.98)] data-[disabled=true]:pointer-events-none data-[disabled=true]:h-status-disabled",
        mode !== "none" && "has-[[data-slot=list-box-item-indicator]]:pe-7",
        description != null && "items-start py-2",
        danger && "text-h-danger-soft-foreground [&_svg:not([class*='text-'])]:text-h-danger-soft-foreground",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-h-muted",
        className
      )}
      {...props}
    >
      {icon != null ? <span data-slot="icon" className={cn("flex size-4 shrink-0 items-center justify-center", description != null && "mt-0.5")}>{icon}</span> : null}
      <span className="flex min-w-0 flex-col">
        <span data-slot="label" className="pointer-events-none w-fit select-none">{children}</span>
        {description != null ? <span data-slot="description" className="pointer-events-none text-xs text-wrap text-h-muted select-none">{description}</span> : null}
      </span>
      {shortcut != null ? <Kbd variant="light" keys={shortcut} className="pointer-events-none ms-auto -me-1 ps-3 self-center select-none" /> : null}
      {mode !== "none" ? (
        <span data-slot="list-box-item-indicator" className="pointer-events-none absolute end-2 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center text-h-default-foreground">
          <Check weight="bold" className={cn("size-2.5 [transition:transform_250ms_var(--e-out),opacity_250ms_var(--e-out)] motion-reduce:[transition:none]", isSelected ? "scale-100 opacity-100" : "scale-50 opacity-0", danger && "text-h-danger-soft-foreground")} />
        </span>
      ) : null}
    </div>
  )
}

/** A group of rows with a small muted header. */
function ListBoxSection({ header, className, children, ...props }: React.ComponentProps<"div"> & { header?: React.ReactNode }) {
  return (
    <div role="group" aria-label={typeof header === "string" ? header : undefined} data-slot="list-box-section" className={cn("flex flex-col items-start gap-0", className)} {...props}>
      {header ? <div data-slot="list-box-header" className="w-full px-2 pt-1.5 pb-1 text-xs font-medium text-h-muted select-none">{header}</div> : null}
      <div className="flex w-full flex-col gap-1">{children}</div>
    </div>
  )
}

function ListBoxSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return <div role="separator" data-slot="list-box-separator" className={cn("my-0.5 h-px shrink-0 bg-h-separator", className)} {...props} />
}

export { ListBox, ListBoxItem, ListBoxSection, ListBoxSeparator }
export type { ListBoxProps, ListBoxItemProps }
