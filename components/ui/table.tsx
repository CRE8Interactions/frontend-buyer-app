"use client"

import * as React from "react"
import { CaretRight, CaretUp } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

/* Copied from the reference table.css. Two looks:
   - primary (default): a grey container (`surface-secondary`, 20px corners, 4px side and bottom padding) with the body as
     a surface card inside it, 16px corners on the body, a faint line under every row but the last.
   - secondary: no container, a standalone rounded header bar, transparent rows with a line under each.
   Header cells are 12px medium muted text on 16px / 10px padding with a short 1px divider between columns. Body cells are
   14px on 16px / 12px padding. Row hover lightens the cell fill, a selected row fades it. The footer is a bar outside the
   table, on the container.
   Colours are the reference's, through our matching tokens: surface-secondary for the container and header, surface for the
   body cells, separator for lines, muted for header text, default for the secondary hover.
   Parts: Table (root, scroll container and <table>), TableHeader, TableBody, TableRow, TableHead (sortable with `onSort`),
   TableCell, TableFooter (<tfoot>), TableCaption, TableFooterBar (outside the table), TableEmpty, TableGroupRow, TableLoadMore,
   TableColumnResizer, TableExpandButton, TableToolbar. */
type TableVariant = "primary" | "secondary"
type TableDensity = "sm" | "md" | "lg"

const TableContext = React.createContext<{ variant: TableVariant }>({ variant: "primary" })

type TableProps = React.ComponentProps<"table"> & {
  variant?: TableVariant
  /** Row height: sm 8px, md 12px (default), lg 16px of vertical cell padding. */
  density?: TableDensity
  /** Content under the table, inside the container: a TableFooterBar with pagination or counts. */
  footer?: React.ReactNode
  /** Classes for the scroll area around the table, for example a max height to scroll vertically. */
  scrollClassName?: string
  /** Classes for the outer container. */
  containerClassName?: string
  /** Props for the scroll area, for example `onScroll` for virtualized rows or a `style` with a max height. */
  scrollProps?: React.ComponentProps<"div">
}

function Table({ className, variant = "primary", density = "md", footer, scrollClassName, containerClassName, scrollProps, ...props }: TableProps) {
  return (
    <TableContext.Provider value={{ variant }}>
      <div
        data-slot="table-container"
        data-variant={variant}
        data-density={density}
        className={cn(
          "group/table relative grid w-full grid-cols-[minmax(0,1fr)] overflow-clip",
          "[--table-cell-bg:var(--h-surface)]",
          variant === "primary" && "rounded-[20px] bg-h-surface-secondary px-1 pb-1",
          variant === "secondary" && "[--table-cell-bg:transparent]",
          containerClassName
        )}
      >
        <div data-slot="table-scroll" {...scrollProps} className={cn("overflow-x-auto [scrollbar-gutter:auto]", scrollClassName, scrollProps?.className)}>
          <table
            data-slot="table"
            className={cn(
              "w-full border-separate border-spacing-0 text-sm",
              variant === "primary" && "overflow-clip",
              /* rounded body corners (primary). Secondary has none. */
              variant === "primary" &&
                "[&_tbody_tr:first-child_td:first-child]:rounded-ss-[16px] [&_tbody_tr:first-child_td:last-child]:rounded-se-[16px] [&_tbody_tr:last-child_td:first-child]:rounded-es-[16px] [&_tbody_tr:last-child_td:last-child]:rounded-ee-[16px]",
              className
            )}
            {...props}
          />
        </div>
        {footer}
      </div>
    </TableContext.Provider>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={cn(className)} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={cn(className)} {...props} />
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return <tfoot data-slot="table-footer" className={cn("font-medium text-h-foreground", className)} {...props} />
}

type TableRowProps = React.ComponentProps<"tr"> & {
  /** Highlights the row as selected. */
  selected?: boolean
  /** Dims the row and removes it from interaction. */
  disabled?: boolean
  /** Makes the whole row a button: pointer cursor, focusable, Enter or Space activates it (calls `onClick`), arrow keys move between rows. */
  interactive?: boolean
}

function TableRow({ className, selected, disabled, interactive, onKeyDown, ...props }: TableRowProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    onKeyDown?.(e)
    if (!interactive || e.defaultPrevented || e.target !== e.currentTarget) return
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      e.currentTarget.click()
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      const sib = (e.key === "ArrowDown" ? e.currentTarget.nextElementSibling : e.currentTarget.previousElementSibling) as HTMLElement | null
      if (sib?.tabIndex === 0) sib.focus()
    }
  }
  return (
    <tr
      data-slot="table-row"
      data-interactive={interactive ? "true" : undefined}
      tabIndex={interactive ? 0 : props.tabIndex}
      onKeyDown={handleKeyDown}
      data-selected={selected ? "true" : undefined}
      data-state={selected ? "selected" : undefined}
      data-disabled={disabled ? "true" : undefined}
      aria-disabled={disabled || undefined}
      className={cn(
        "group/row relative h-full outline-none data-[interactive=true]:cursor-pointer",
        "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
        "focus-visible:[&>td]:shadow-[inset_0_0_0_2px_var(--h-focus)] focus-visible:[&>td:first-child]:rounded-s-lg focus-visible:[&>td:last-child]:rounded-e-lg",
        className
      )}
      {...props}
    />
  )
}

type TableAlign = "start" | "center" | "end"
const alignText: Record<TableAlign, string> = { start: "text-start", center: "text-center", end: "text-end" }
/* The caret sits after the label, except for right-aligned columns, where it goes before it so the label stays flush with the cells. */
const alignFlex: Record<TableAlign, string> = { start: "justify-start", center: "justify-center", end: "flex-row-reverse justify-start" }

type TableHeadProps = Omit<React.ComponentProps<"th">, "aria-sort" | "align"> & {
  /** Aligns the header text and its sort button; use the same value on the column's cells. */
  align?: TableAlign
  /** Current sort direction of this column. Setting `onSort` makes the header a sort button. */
  sortDirection?: "ascending" | "descending" | "none"
  onSort?: () => void
  /** Hide the short divider on the right edge. */
  hideDivider?: boolean
}

function TableHead({ className, children, sortDirection, onSort, hideDivider, align = "start", ...props }: TableHeadProps) {
  const { variant } = React.useContext(TableContext)
  const sortable = !!onSort
  return (
    <th
      data-slot="table-head"
      data-allows-sorting={sortable ? "true" : undefined}
      aria-sort={sortable ? sortDirection ?? "none" : undefined}
      className={cn(
        "group/col relative bg-h-surface-secondary px-4 py-2.5 text-xs font-medium whitespace-nowrap text-h-muted",
        alignText[align],
        variant === "primary" && "border-b border-h-separator/50",
        variant === "secondary" &&
          "first:rounded-s-[16px] last:rounded-e-[16px]",
        !hideDivider &&
          "after:pointer-events-none after:absolute after:end-0 after:top-1/2 after:h-4 after:w-px after:-translate-y-1/2 after:rounded-sm after:bg-h-separator after:content-[''] last:after:content-none",
        "[&:has([role=checkbox])]:w-10 [&:has([role=checkbox])]:pe-0",
        className
      )}
      {...props}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          className={cn("-mx-1 flex w-[calc(100%+0.5rem)] cursor-pointer items-center gap-1 rounded-md px-1 text-start outline-none [transition:color_150ms_var(--e-out)] [@media(hover:hover)]:hover:text-h-foreground focus-visible:h-focus-ring", alignFlex[align])}
        >
          <span>{children}</span>
          <CaretUp
            aria-hidden
            weight="bold"
            className={cn(
              "size-3 shrink-0 [transition:transform_100ms_ease-out,opacity_100ms_ease-out]",
              sortDirection === "descending" && "rotate-180",
              (!sortDirection || sortDirection === "none") && "opacity-0 group-hover/col:opacity-40"
            )}
          />
        </button>
      ) : (
        children
      )}
    </th>
  )
}

type TableCellProps = Omit<React.ComponentProps<"td">, "align"> & {
  /** Aligns the cell content; use the same value on the column's header. */
  align?: TableAlign
  /** Nesting depth for tree rows (1 = top level). Indents the cell by 1rem per level. */
  level?: number
}

function TableCell({ className, level, style, align = "start", ...props }: TableCellProps) {
  return (
    <td
      data-slot="table-cell"
      data-tree-column={level != null ? "true" : undefined}
      style={level != null ? { paddingInlineStart: `calc(1rem * ${level})`, ...style } : style}
      className={cn(
        "h-full border-b border-h-separator-tertiary/50 bg-(--table-cell-bg) px-4 align-middle text-sm text-h-foreground",
        alignText[align],
        "group-data-[density=sm]/table:py-2 group-data-[density=md]/table:py-3 group-data-[density=lg]/table:py-4",
        "[transition:background-color_150ms_var(--e-out)]",
        /* hover and selected are on the cells so the rounded corners clip them */
        "[@media(hover:hover)]:group-hover/row:bg-[color-mix(in_oklab,var(--table-cell-bg)_40%,transparent)]",
        "group-data-[selected=true]/row:bg-[color-mix(in_oklab,var(--table-cell-bg)_10%,transparent)]",
        "group-data-[variant=secondary]/table:[@media(hover:hover)]:group-hover/row:bg-h-default/50",
        "group-data-[variant=secondary]/table:group-data-[selected=true]/row:bg-h-default/70",
        "group-last/row:border-b-0",
        "group-data-[variant=secondary]/table:group-last/row:border-b",
        "[&:has([role=checkbox])]:w-10 [&:has([role=checkbox])]:pe-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return <caption data-slot="table-caption" className={cn("mt-4 text-sm text-h-muted", className)} {...props} />
}

/** The bar under the table, on the container. Put pagination, row counts or bulk actions here (pass it to `Table footer`). */
function TableFooterBar({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="table-footer-bar" className={cn("flex items-center gap-4 px-4 py-2.5", className)} {...props} />
}

/** The bar above the table: search, filters, column menu. Sits outside the container. */
function TableToolbar({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="table-toolbar" className={cn("mb-3 flex flex-wrap items-center gap-2", className)} {...props} />
}

/** A full-width label row that groups the rows under it ("Today", "Harbour Lights Festival"). */
function TableGroupRow({ colSpan, className, children, ...props }: React.ComponentProps<"td"> & { colSpan: number }) {
  return (
    <tr data-slot="table-group-row" className="group/row">
      <td
        colSpan={colSpan}
        className={cn(
          "border-b border-h-separator-tertiary/50 bg-[color-mix(in_oklab,var(--h-surface-secondary)_55%,var(--table-cell-bg))] px-4 py-2 text-xs font-medium text-h-muted",
          "group-data-[variant=secondary]/table:bg-h-default/40",
          className
        )}
        {...props}
      >
        {children}
      </td>
    </tr>
  )
}

/** A row that fills the table width, for the empty state. */
function TableEmpty({ colSpan, className, children, ...props }: React.ComponentProps<"td"> & { colSpan: number }) {
  return (
    <tr data-slot="table-empty" className="group/row">
      <td
        colSpan={colSpan}
        className={cn("bg-(--table-cell-bg) px-4 py-12 text-center text-sm text-h-muted", className)}
        {...props}
      >
        {children}
      </td>
    </tr>
  )
}

/** Sentinel row for infinite scrolling: calls `onLoadMore` when it scrolls into view and nothing is loading. */
function TableLoadMore({
  colSpan,
  isLoading,
  onLoadMore,
  className,
  children,
}: {
  colSpan: number
  isLoading?: boolean
  onLoadMore?: () => void
  className?: string
  children?: React.ReactNode
}) {
  const ref = React.useRef<HTMLTableCellElement>(null)
  const latest = React.useRef({ isLoading, onLoadMore })
  latest.current = { isLoading, onLoadMore }
  React.useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !latest.current.isLoading) latest.current.onLoadMore?.()
    }, { rootMargin: "80px" })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <tr data-slot="table-load-more" className="group/row">
      <td ref={ref} colSpan={colSpan} className={cn("bg-(--table-cell-bg) px-4 py-3 text-center text-sm text-h-muted", className)}>
        <div className="flex items-center justify-center gap-2 py-2">{children}</div>
      </td>
    </tr>
  )
}

/** Drag handle on the right edge of a header cell. `onResize` gets the change in width in pixels while dragging. */
function TableColumnResizer({ onResize, className }: { onResize: (deltaPx: number) => void; className?: string }) {
  const [dragging, setDragging] = React.useState(false)
  const start = React.useRef(0)
  return (
    <span
      role="separator"
      aria-orientation="vertical"
      tabIndex={0}
      data-slot="table-column-resizer"
      data-resizing={dragging ? "true" : undefined}
      onPointerDown={(e) => {
        e.preventDefault()
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        start.current = e.clientX
        setDragging(true)
      }}
      onPointerMove={(e) => {
        if (!dragging) return
        const d = e.clientX - start.current
        if (d !== 0) {
          onResize(d)
          start.current = e.clientX
        }
      }}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") onResize(-12)
        if (e.key === "ArrowRight") onResize(12)
      }}
      className={cn(
        "absolute end-0 top-1/2 box-content h-4 w-px translate-x-1/2 -translate-y-1/2 cursor-col-resize touch-none rounded-sm bg-h-separator bg-clip-content px-2 outline-none",
        "[transition:height_150ms_var(--e-out),width_150ms_var(--e-out),background-color_150ms_var(--e-out)]",
        "hover:h-full hover:w-0.5 hover:bg-h-accent focus-visible:h-full focus-visible:w-0.5 focus-visible:bg-h-focus data-[resizing=true]:h-full data-[resizing=true]:w-0.5 data-[resizing=true]:bg-h-accent",
        className
      )}
    />
  )
}

/** Chevron for tree rows: turns a quarter turn when expanded. Put it in the first cell of a parent row. */
function TableExpandButton({
  expanded,
  onToggle,
  className,
  ...props
}: Omit<React.ComponentProps<"button">, "onToggle"> & { expanded: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-label={expanded ? "Collapse row" : "Expand row"}
      onClick={onToggle}
      className={cn(
        "relative h-touch-44 inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-h-muted outline-none [transition:color_150ms_var(--e-out),background-color_150ms_var(--e-out)] hover:bg-h-default hover:text-h-foreground focus-visible:h-focus-ring",
        className
      )}
      {...props}
    >
      <CaretRight aria-hidden weight="bold" className={cn("size-4 [transition:transform_200ms_var(--e-out)]", expanded && "rotate-90")} />
    </button>
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  TableFooterBar,
  TableToolbar,
  TableEmpty,
  TableGroupRow,
  TableLoadMore,
  TableColumnResizer,
  TableExpandButton,
}
export type { TableVariant, TableDensity, TableAlign }
