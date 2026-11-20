"use client"

import * as React from "react"
import { CaretDown } from "@phosphor-icons/react"
import { Collapsible as CollapsiblePrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

/* Copied from the reference disclosure.css and disclosure-group.css. A Disclosure shows or hides a panel from a trigger. The
   trigger is any element (a button, a row) with the focus ring; a `DisclosureIndicator` inside it turns 180 degrees when
   open over 250ms. The panel opens in 200ms (height and opacity) and its `DisclosureBody` has 8px of padding. A
   `DisclosureGroup` holds several and lets one open at a time (or many with `allowsMultipleExpanded`). Open state is
   `expanded` / `defaultExpanded` / `onExpandedChange`, or the group's `expandedKeys`. */
type GroupCtx = { open: string[]; toggle: (id: string, next: boolean) => void } | null
const Group = React.createContext<GroupCtx>(null)

type DisclosureProps = Omit<React.ComponentProps<typeof CollapsiblePrimitive.Root>, "open" | "defaultOpen" | "onOpenChange"> & {
  /** Identifies the disclosure inside a group. */
  id?: string
  expanded?: boolean
  defaultExpanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
}

function Disclosure({ id, expanded, defaultExpanded, onExpandedChange, className, ...props }: DisclosureProps) {
  const group = React.useContext(Group)
  const own = group && id ? { open: group.open.includes(id), onOpenChange: (n: boolean) => { group.toggle(id, n); onExpandedChange?.(n) } } : null
  return (
    <CollapsiblePrimitive.Root
      data-slot="disclosure"
      {...(own ?? { open: expanded, defaultOpen: defaultExpanded, onOpenChange: onExpandedChange })}
      className={cn("relative", className)}
      {...props}
    />
  )
}

function DisclosureTrigger({ className, ...props }: React.ComponentProps<typeof CollapsiblePrimitive.Trigger>) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="disclosure-trigger"
      className={cn(
        "group/disclosure inline-block cursor-pointer outline-none h-no-highlight focus-visible:h-focus-ring disabled:h-status-disabled disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  )
}

/** The caret in the trigger. Turns upside down while the panel is open. */
function DisclosureIndicator({ className, children, ...props }: React.ComponentProps<"span">) {
  return (
    <span aria-hidden data-slot="disclosure-indicator" className={cn("ms-auto inline-flex size-4 shrink-0 text-inherit [transition:transform_250ms_var(--e-out)] group-data-[state=open]/disclosure:-rotate-180 motion-reduce:[transition:none]", className)} {...props}>
      {children ?? <CaretDown weight="bold" className="size-4" />}
    </span>
  )
}

function DisclosureContent({ className, ...props }: React.ComponentProps<typeof CollapsiblePrimitive.Content>) {
  return (
    <CollapsiblePrimitive.Content
      data-slot="disclosure-content"
      className={cn(
        "overflow-clip data-[state=open]:animate-[disclosure-open_200ms_cubic-bezier(0.25,0.46,0.45,0.94)] data-[state=closed]:animate-[disclosure-close_200ms_cubic-bezier(0.25,0.46,0.45,0.94)] motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  )
}

function DisclosureBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="disclosure-body" className={cn("p-2", className)} {...props} />
}

type DisclosureGroupProps = Omit<React.ComponentProps<"div">, "defaultValue"> & {
  allowsMultipleExpanded?: boolean
  /** Ids of the open disclosures (controlled). */
  expandedKeys?: string[]
  defaultExpandedKeys?: string[]
  onExpandedChange?: (keys: string[]) => void
}

function DisclosureGroup({ allowsMultipleExpanded, expandedKeys, defaultExpandedKeys = [], onExpandedChange, className, ...props }: DisclosureGroupProps) {
  const [inner, setInner] = React.useState<string[]>(defaultExpandedKeys)
  const open = expandedKeys ?? inner
  const toggle = React.useCallback(
    (id: string, next: boolean) => {
      const keys = next ? (allowsMultipleExpanded ? [...open, id] : [id]) : open.filter((k) => k !== id)
      setInner(keys)
      onExpandedChange?.(keys)
    },
    [open, allowsMultipleExpanded, onExpandedChange]
  )
  return (
    <Group.Provider value={{ open, toggle }}>
      <div data-slot="disclosure-group" className={cn("w-full [contain:layout_style]", className)} {...props} />
    </Group.Provider>
  )
}

export { Disclosure, DisclosureTrigger, DisclosureIndicator, DisclosureContent, DisclosureBody, DisclosureGroup }
