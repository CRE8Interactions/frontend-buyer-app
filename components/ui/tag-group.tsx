"use client"

import * as React from "react"
import { X } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { Description } from "./description"
import { FieldError } from "./field-error"
import { Label } from "./label"

/* Copied from the reference tag.css and tag-group.css. A TagGroup is a labelled, wrapping row of tags (6px gap). A Tag is an
   inline pill: 12px medium text, 12px corners, sizes sm (8 x 2px padding), md (8 x 4px, default) and lg (10 x 6px, 14px text,
   16px corners), variants default (the neutral fill) and surface. Tags can be selected (single or multiple): a selected
   tag takes the soft accent fill and its hover steps up. Tags can be removable: a small X inside the tag, with a 24px touch
   target, also reachable with Delete or Backspace on the focused tag. Disabled tags dim. Keyboard: Tab moves through the
   tags, Space or Enter selects, Delete removes, and the focus ring shows from the keyboard. */
type TagSize = "sm" | "md" | "lg"
type TagVariant = "default" | "surface"
type SelectionMode = "none" | "single" | "multiple"

const GroupContext = React.createContext<{
  size: TagSize
  variant: TagVariant
  mode: SelectionMode
  selected: string[]
  toggle: (id: string) => void
  onRemove?: (id: string) => void
}>({ size: "md", variant: "default", mode: "none", selected: [], toggle: () => {} })

type TagGroupProps = Omit<React.ComponentProps<"div">, "onChange" | "defaultValue"> & {
  label?: React.ReactNode
  description?: React.ReactNode
  errorMessage?: React.ReactNode
  isInvalid?: boolean
  size?: TagSize
  variant?: TagVariant
  selectionMode?: SelectionMode
  /** Selected tag ids (controlled). */
  value?: string[]
  defaultValue?: string[]
  onChange?: (ids: string[]) => void
  /** Makes tags removable. Called with the id of the tag to remove. */
  onRemove?: (id: string) => void
}

function TagGroup({
  label, description, errorMessage, isInvalid, size = "md", variant = "default", selectionMode = "none", value, defaultValue = [], onChange, onRemove, className, children, "aria-label": ariaLabel, ...props
}: TagGroupProps) {
  const [inner, setInner] = React.useState<string[]>(defaultValue)
  const selected = value ?? inner
  const labelId = React.useId()
  const listRef = React.useRef<HTMLDivElement>(null)
  const pendingFocus = React.useRef<number | null>(null)
  // Removing a tag destroys the element that had focus, so hand focus to the tag that takes its place (or the last one).
  const remove = React.useMemo(
    () =>
      onRemove
        ? (id: string) => {
            const tags = Array.from(listRef.current?.querySelectorAll<HTMLElement>("[data-slot=tag]") ?? [])
            const index = tags.findIndex((t) => t.contains(document.activeElement))
            pendingFocus.current = index >= 0 ? index : null
            onRemove(id)
          }
        : undefined,
    [onRemove]
  )
  React.useEffect(() => {
    const index = pendingFocus.current
    if (index === null) return
    pendingFocus.current = null
    const tags = Array.from(listRef.current?.querySelectorAll<HTMLElement>("[data-slot=tag]:not([data-disabled=true])") ?? [])
    ;(tags[Math.min(index, tags.length - 1)] ?? listRef.current)?.focus()
  })
  const toggle = React.useCallback(
    (id: string) => {
      if (selectionMode === "none") return
      const next = selectionMode === "single" ? (selected.includes(id) ? [] : [id]) : selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]
      setInner(next)
      onChange?.(next)
    },
    [selectionMode, selected, onChange]
  )
  return (
    <GroupContext.Provider value={{ size, variant, mode: selectionMode, selected, toggle, onRemove: remove }}>
      <div data-slot="tag-group" data-invalid={isInvalid ? "true" : undefined} className={cn("relative flex flex-col gap-1", className)} {...props}>
        {label ? <Label id={labelId}>{label}</Label> : null}
        <div ref={listRef} tabIndex={-1} role="group" aria-labelledby={label ? labelId : undefined} aria-label={label ? undefined : ariaLabel} data-slot="tag-group-list" className="relative flex flex-wrap gap-1.5 outline-none">
          {children}
        </div>
        {isInvalid ? (errorMessage ? <FieldError className="p-1">{errorMessage}</FieldError> : null) : description ? <Description className="p-1">{description}</Description> : null}
      </div>
    </GroupContext.Provider>
  )
}

type TagProps = Omit<React.ComponentProps<"span">, "id"> & {
  /** Identifies the tag for selection and removal. Defaults to the text. */
  id?: string
  disabled?: boolean
  /** The text of the tag, used for the remove button's name. Defaults to the children when they are text. */
  textValue?: string
}

function Tag({ id, disabled, textValue, className, children, onKeyDown, ...props }: TagProps) {
  const { size, variant, mode, selected, toggle, onRemove } = React.useContext(GroupContext)
  const key = id ?? (typeof children === "string" ? children : textValue ?? "")
  const text = textValue ?? (typeof children === "string" ? children : key)
  const isSelected = selected.includes(key)
  const interactive = mode !== "none"
  return (
    <span
      role={interactive ? "button" : undefined}
      tabIndex={disabled ? -1 : interactive || onRemove ? 0 : undefined}
      aria-pressed={interactive ? isSelected : undefined}
      aria-disabled={disabled || undefined}
      data-slot="tag"
      data-selected={isSelected ? "true" : undefined}
      data-disabled={disabled ? "true" : undefined}
      onClick={() => !disabled && toggle(key)}
      onKeyDown={(e) => {
        onKeyDown?.(e)
        if (disabled || e.defaultPrevented) return
        if (interactive && (e.key === " " || e.key === "Enter")) { e.preventDefault(); toggle(key) }
        if (onRemove && (e.key === "Delete" || e.key === "Backspace")) { e.preventDefault(); onRemove(key) }
      }}
      className={cn(
        "relative inline-flex origin-center transform-gpu items-center gap-1 rounded-[12px] font-medium select-none outline-none h-no-highlight",
        "[transition:color_100ms_ease,scale_100ms_ease,opacity_100ms_ease,background-color_100ms_ease,box-shadow_100ms_var(--e-out)] motion-reduce:[transition:none]",
        interactive || onRemove ? "cursor-pointer" : "cursor-default",
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-2 py-1 text-xs",
        size === "lg" && "rounded-[16px] px-2.5 py-1.5 text-sm",
        variant === "default" ? "bg-h-default text-h-default-foreground" : "bg-h-surface text-h-surface-foreground",
        !isSelected && !disabled && "[@media(hover:hover)]:hover:" + (variant === "default" ? "bg-h-default-hover" : "bg-h-surface-hover"),
        "focus-visible:h-focus-ring data-[disabled=true]:h-status-disabled",
        "data-[selected=true]:bg-h-accent-soft data-[selected=true]:text-h-accent-soft-foreground [@media(hover:hover)]:data-[selected=true]:hover:bg-h-accent-soft-hover",
        "[&_svg]:pointer-events-none [&_svg]:size-3 [&_svg]:shrink-0 [&_svg]:self-center [&_svg]:text-current",
        className
      )}
      {...props}
    >
      {children}
      {onRemove ? (
        <button
          type="button"
          tabIndex={-1}
          aria-label={`Remove ${text}`}
          disabled={disabled}
          data-slot="tag-remove-button"
          onClick={(e) => { e.stopPropagation(); onRemove(key) }}
          className="relative -me-0.5 inline-flex size-3 cursor-pointer items-center justify-center text-inherit outline-none before:absolute before:-inset-1.5 before:content-['']"
        >
          <X weight="bold" />
        </button>
      ) : null}
    </span>
  )
}

export { TagGroup, Tag }
export type { TagGroupProps, TagProps, TagSize, TagVariant }
