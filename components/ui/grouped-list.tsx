import * as React from "react"
import { Check } from "@phosphor-icons/react"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"

/* The one list: a grouped block in the iOS style. A faint fill (5% of the text colour, so it reads on cards, dialogs,
   drawers and sheets in light and dark), 16px corners, rows 12px / 16px with hairlines inset 16px between them, the
   label muted on the left and the value medium on the right. Use it for every list of facts (order lines, details,
   settings) and every list of choices (go to a ticket, pick a seat group). The alert dialog's details panel is the same
   block, so the two never drift. */
const groupedListClass = "grid overflow-hidden rounded-[16px] bg-h-foreground/[0.05] text-sm"
const groupedRowClass =
  "relative flex min-h-11 w-full items-center justify-between gap-4 px-4 py-3 text-left not-first:before:absolute not-first:before:inset-x-4 not-first:before:top-0 not-first:before:h-px not-first:before:bg-h-foreground/[0.08] not-first:before:content-['']"

function GroupedList({ className, ...props }: React.ComponentProps<"div">) {
  return <div role="list" data-slot="grouped-list" className={cn(groupedListClass, className)} {...props} />
}

type GroupedListItemProps = Omit<React.ComponentProps<"div">, "children" | "onClick"> & {
  /** The muted label on the left. */
  label: React.ReactNode
  /** The value on the right, medium weight, tabular figures. */
  children?: React.ReactNode
  /** Makes the row a button (a choice). Without it the row is plain text. */
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  /** For a list of choices: true puts a check at the end of the row, false keeps the space so values line up. Leave unset for a list of facts. */
  selected?: boolean
  /** Render the row as its child, for a link: `<GroupedListItem asChild label="Order"><a href>...</a></GroupedListItem>`. */
  asChild?: boolean
}

function GroupedListItem({ label, children, onClick, selected, asChild, className, ...props }: GroupedListItemProps) {
  const interactive = !!onClick || !!asChild
  const Comp: React.ElementType = asChild ? Slot.Root : onClick ? "button" : "div"
  return (
    <Comp
      role={onClick || asChild ? undefined : "listitem"}
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-current={selected ? "true" : undefined}
      data-slot="grouped-list-item"
      data-selected={selected ? "" : undefined}
      className={cn(
        groupedRowClass,
        interactive && "cursor-pointer outline-none h-no-highlight [touch-action:manipulation] focus-visible:h-focus-ring active:bg-h-foreground/[0.05] [@media(hover:hover)]:hover:bg-h-foreground/[0.04]",
        className
      )}
      {...props}
    >
      <span className="shrink-0 tabular-nums text-h-muted">{label}</span>
      <span className="min-w-0 flex-1 truncate text-right font-medium tabular-nums text-h-foreground">{children}</span>
      {selected !== undefined && (
        <span className="grid size-4 shrink-0 place-items-center">{selected && <Check weight="bold" className="size-4" aria-hidden />}</span>
      )}
    </Comp>
  )
}

export { GroupedList, GroupedListItem, groupedListClass, groupedRowClass }
