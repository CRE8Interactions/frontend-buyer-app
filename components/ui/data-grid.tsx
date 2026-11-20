"use client"

import * as React from "react"
import { DotsSixVertical } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { Checkbox } from "./checkbox"
import {
  Table, TableBody, TableCell, TableColumnResizer, TableEmpty, TableExpandButton, TableFooterBar, TableHead, TableHeader, TableLoadMore, TableRow,
  type TableAlign, type TableDensity, type TableVariant,
} from "./table"

/* A data-driven grid on the Table. Give it `data`, a `columns` definition and a `getRowId`, and it renders the whole table with
   sorting, row selection (single or multiple, with checkboxes), expandable tree rows, column resizing, pinned columns, row
   reorder by drag handle or keyboard, an empty state, infinite loading, a sticky header, a footer, vertical alignment,
   disabled rows and row virtualization. It is not a compound component. Sorting is client-side and locale-aware unless you
   control it (`sortDescriptor` and `onSortChange`) or give a column a `sortFn`. Selection, sorting and expansion each work
   controlled or uncontrolled. The selection column is 40px wide and the drag handle column 32px. A pinned column that the
   content has scrolled past shows a separator on its edge. */
type SortDirection = "ascending" | "descending"
type SortDescriptor = { column: string; direction: SortDirection }

type DataGridColumn<T> = {
  id: string
  /** Header content, or a function that receives the column's sort direction. */
  header?: React.ReactNode | ((context: { sortDirection?: SortDirection }) => React.ReactNode)
  /** Reads the cell value from the row object; also the value sorting compares. */
  accessorKey?: keyof T & string
  /** Custom cell content. */
  cell?: (item: T, column: DataGridColumn<T>) => React.ReactNode
  /** Aligns the header and the cells together. */
  align?: TableAlign
  /** The column that names the row for assistive technology; the first one is the tree column by default. */
  isRowHeader?: boolean
  allowsSorting?: boolean
  /** Custom comparison for sorting this column. */
  sortFn?: (a: T, b: T) => number
  /** Initial width in pixels. Columns that resize or pin need a numeric `width` or `minWidth`. */
  width?: number
  defaultWidth?: number
  minWidth?: number
  allowsResizing?: boolean
  /** Keeps the column visible while the grid scrolls sideways. */
  pinned?: "start" | "end"
  className?: string
}

type DataGridProps<T> = {
  "aria-label": string
  columns: DataGridColumn<T>[]
  data: T[]
  getRowId: (item: T) => string
  variant?: TableVariant
  density?: TableDensity
  /** Vertical alignment of the cell content within each row (default middle). */
  verticalAlign?: "top" | "middle" | "bottom"
  selectionMode?: "none" | "single" | "multiple"
  /** `toggle` (default): a click toggles a row. `replace`: a click selects only that row; Ctrl or Cmd adds to the selection. */
  selectionBehavior?: "toggle" | "replace"
  showSelectionCheckboxes?: boolean
  selectedKeys?: Set<string>
  defaultSelectedKeys?: Set<string>
  onSelectionChange?: (keys: Set<string>) => void
  /** Rows that cannot be selected or activated. */
  disabledKeys?: Iterable<string>
  sortDescriptor?: SortDescriptor
  defaultSortDescriptor?: SortDescriptor
  onSortChange?: (descriptor: SortDescriptor) => void
  /** Turns on the resize handles for columns that set `allowsResizing`. */
  allowsColumnResize?: boolean
  onColumnResize?: (widths: Record<string, number>) => void
  onColumnResizeEnd?: (widths: Record<string, number>) => void
  /** Child rows, which makes the grid a tree. */
  getChildren?: (item: T) => T[] | undefined
  treeColumn?: string
  expandedKeys?: Set<string>
  defaultExpandedKeys?: Set<string>
  onExpandedChange?: (keys: Set<string>) => void
  /** Pixels of indent per nesting level (default 20; 0 turns indenting off). */
  treeIndent?: number
  /** Adds a drag handle to each row; called with the data in its new order. */
  onReorder?: (event: { reorderedData: T[]; movedId: string }) => void
  renderEmptyState?: () => React.ReactNode
  onLoadMore?: () => void
  isLoadingMore?: boolean
  loadMoreContent?: React.ReactNode
  /** Called when a row is actioned: double-click, or Enter on a focused row. */
  onRowAction?: (id: string) => void
  /** Keeps the header visible while the rows scroll; give `scrollContainerClassName` a height. */
  stickyHeader?: boolean
  /** Renders only the visible rows. Needs a fixed height on `scrollContainerClassName`, and uses `rowHeight` and `headingHeight`. */
  virtualized?: boolean
  rowHeight?: number
  headingHeight?: number
  /** Classes for the `<table>`, for example a minimum width to scroll sideways. */
  contentClassName?: string
  scrollContainerClassName?: string
  /** Content under the table at the full width of the grid, outside the horizontal scroll area (pagination, totals). */
  footer?: React.ReactNode
  footerClassName?: string
  /** Classes for the grid's outer container. */
  className?: string
}

const SELECTION_WIDTH = 40
const DRAG_WIDTH = 32
const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" })

function compare<T>(column: DataGridColumn<T>, a: T, b: T) {
  if (column.sortFn) return column.sortFn(a, b)
  const key = column.accessorKey
  if (!key) return 0
  const x = a[key]
  const y = b[key]
  if (typeof x === "number" && typeof y === "number") return x - y
  return collator.compare(String(x ?? ""), String(y ?? ""))
}

function useControllable<V>(value: V | undefined, defaultValue: V, onChange?: (next: V) => void) {
  const [inner, setInner] = React.useState<V>(defaultValue)
  const current = value !== undefined ? value : inner
  const set = React.useCallback((next: V) => {
    if (value === undefined) setInner(next)
    onChange?.(next)
  }, [value, onChange])
  return [current, set] as const
}

type Row<T> = { item: T; id: string; level: number; expandable: boolean }

function DataGrid<T>({
  columns, data, getRowId, variant, density, verticalAlign = "middle", selectionMode = "none", selectionBehavior = "toggle", showSelectionCheckboxes,
  selectedKeys, defaultSelectedKeys, onSelectionChange, disabledKeys, sortDescriptor, defaultSortDescriptor, onSortChange, allowsColumnResize,
  onColumnResize, onColumnResizeEnd, getChildren, treeColumn, expandedKeys, defaultExpandedKeys, onExpandedChange, treeIndent = 20, onReorder,
  renderEmptyState, onLoadMore, isLoadingMore, loadMoreContent, onRowAction, stickyHeader, virtualized, rowHeight = 42, headingHeight = 36,
  contentClassName, scrollContainerClassName, footer, footerClassName, className, ...props
}: DataGridProps<T>) {
  const [selection, setSelection] = useControllable<Set<string>>(selectedKeys, defaultSelectedKeys ?? new Set(), onSelectionChange)
  const [sort, setSort] = useControllable<SortDescriptor | undefined>(sortDescriptor, defaultSortDescriptor, onSortChange as ((d: SortDescriptor | undefined) => void) | undefined)
  const [expanded, setExpanded] = useControllable<Set<string>>(expandedKeys, defaultExpandedKeys ?? new Set(), onExpandedChange)
  const [widths, setWidths] = React.useState<Record<string, number>>(() =>
    Object.fromEntries(columns.filter((c) => (c.width ?? c.defaultWidth ?? c.minWidth) !== undefined).map((c) => [c.id, (c.width ?? c.defaultWidth ?? c.minWidth) as number])))
  const [grabbed, setGrabbed] = React.useState<string | null>(null)
  const [dragging, setDragging] = React.useState<string | null>(null)
  const [dropOver, setDropOver] = React.useState<string | null>(null)
  const disabled = React.useMemo(() => new Set(disabledKeys ?? []), [disabledKeys])

  // Scroll state: the pinned-edge separators and the virtual window.
  const [scrollEl, setScrollEl] = React.useState<HTMLDivElement | null>(null)
  const [scroll, setScroll] = React.useState({ top: 0, height: 400, startDetached: false, endDetached: false })
  const measure = React.useCallback(() => {
    if (!scrollEl) return
    setScroll({
      top: scrollEl.scrollTop,
      height: scrollEl.clientHeight || 400,
      startDetached: scrollEl.scrollLeft > 0,
      endDetached: scrollEl.scrollLeft + scrollEl.clientWidth < scrollEl.scrollWidth - 1,
    })
  }, [scrollEl])
  React.useEffect(() => {
    if (!scrollEl) return
    measure()
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null
    observer?.observe(scrollEl)
    return () => observer?.disconnect()
  }, [scrollEl, measure])

  const showCheckboxes = selectionMode !== "none" && showSelectionCheckboxes !== false
  const sortColumn = sort ? columns.find((c) => c.id === sort.column) : undefined
  const tree = columns.find((c) => c.id === treeColumn) ?? columns.find((c) => c.isRowHeader) ?? columns[0]

  const rows = React.useMemo(() => {
    const out: Row<T>[] = []
    const sorted = (items: T[]) => {
      if (!sortColumn || !sort) return items
      const direction = sort.direction === "descending" ? -1 : 1
      return [...items].sort((a, b) => direction * compare(sortColumn, a, b))
    }
    const walk = (items: T[], level: number) => {
      for (const item of sorted(items)) {
        const id = getRowId(item)
        const children = getChildren?.(item)
        const expandable = !!children?.length
        out.push({ item, id, level, expandable })
        if (expandable && expanded.has(id)) walk(children, level + 1)
      }
    }
    walk(data, 1)
    return out
  }, [data, sort, sortColumn, getChildren, getRowId, expanded])

  const selectable = rows.filter((r) => !disabled.has(r.id))
  const toggleRow = (id: string, additive = false) => {
    if (selectionMode === "none" || disabled.has(id)) return
    const next = new Set(selection)
    if (selectionMode === "single") { next.clear(); if (!selection.has(id)) next.add(id) }
    else if (selectionBehavior === "replace" && !additive) { next.clear(); next.add(id) }
    else if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelection(next)
  }
  const allSelected = selectable.length > 0 && selectable.every((r) => selection.has(r.id))
  const someSelected = selectable.some((r) => selection.has(r.id))

  const setWidth = (id: string, delta: number) => {
    const column = columns.find((c) => c.id === id)
    setWidths((current) => {
      const next = { ...current, [id]: Math.max(column?.minWidth ?? 60, (current[id] ?? column?.minWidth ?? 120) + delta) }
      onColumnResize?.(next)
      return next
    })
  }

  const move = (id: string, toIndex: number) => {
    const from = data.findIndex((item) => getRowId(item) === id)
    if (from < 0 || toIndex < 0 || toIndex >= data.length || from === toIndex) return
    const reorderedData = [...data]
    const [item] = reorderedData.splice(from, 1)
    reorderedData.splice(toIndex, 0, item)
    onReorder?.({ reorderedData, movedId: id })
  }

  // Pinned columns stick to the edge; their offsets are the widths of the pinned columns before them (after the selection and
  // drag columns on the start side).
  const startBase = (onReorder ? DRAG_WIDTH : 0) + (showCheckboxes ? SELECTION_WIDTH : 0)
  const hasStartPinned = columns.some((c) => c.pinned === "start")
  const pinOffset = (column: DataGridColumn<T>) => {
    const side = column.pinned
    if (!side) return undefined
    const group = columns.filter((c) => c.pinned === side)
    const ordered = side === "start" ? group : [...group].reverse()
    let offset = side === "start" ? startBase : 0
    for (const other of ordered) {
      if (other.id === column.id) break
      offset += widths[other.id] ?? other.width ?? other.minWidth ?? 0
    }
    return { side, offset }
  }
  const startEdge = [...columns].reverse().find((c) => c.pinned === "start")?.id
  const endEdge = columns.find((c) => c.pinned === "end")?.id
  const cellStyle = (column: DataGridColumn<T>): React.CSSProperties => {
    const pin = pinOffset(column)
    const width = widths[column.id]
    return { ...(width ? { width, minWidth: width, maxWidth: width } : {}), ...(pin ? { position: "sticky", [pin.side === "start" ? "left" : "right"]: pin.offset, zIndex: 2 } : {}) }
  }
  const cellClass = (column: DataGridColumn<T>) => cn(
    column.pinned && "bg-clip-padding",
    column.pinned === "start" && column.id === startEdge && scroll.startDetached && "shadow-[inset_-1px_0_0_var(--h-separator)]",
    column.pinned === "end" && column.id === endEdge && scroll.endDetached && "shadow-[inset_1px_0_0_var(--h-separator)]",
    (column.width || column.pinned || virtualized) && "whitespace-nowrap",
    virtualized && "overflow-hidden text-ellipsis",
    column.className
  )
  const verticalClass = verticalAlign === "top" ? "align-top" : verticalAlign === "bottom" ? "align-bottom" : undefined
  // A selection or drag column sticks too when something is pinned to the start, so the pinned columns do not slide under it.
  const fixedCell = (width: number, left: number): React.CSSProperties => hasStartPinned ? { width, minWidth: width, maxWidth: width, position: "sticky", left, zIndex: 2 } : { width, minWidth: width, maxWidth: width }

  const colCount = columns.length + (showCheckboxes ? 1 : 0) + (onReorder ? 1 : 0)
  const fixedLayout = allowsColumnResize || virtualized
  const tableWidth = allowsColumnResize && columns.every((c) => widths[c.id] !== undefined) ? columns.reduce((sum, c) => sum + (widths[c.id] ?? 0), startBase) : undefined

  // The virtual window.
  const total = rows.length
  const start = virtualized ? Math.max(0, Math.floor(scroll.top / rowHeight) - 6) : 0
  const end = virtualized ? Math.min(total, Math.ceil((scroll.top + scroll.height) / rowHeight) + 6) : total
  const visible = rows.slice(start, end)

  return (
    <Table
      variant={variant}
      density={density}
      footer={footer ? <TableFooterBar className={footerClassName}>{footer}</TableFooterBar> : undefined}
      scrollClassName={cn(virtualized && "overflow-y-auto", scrollContainerClassName)}
      scrollProps={{ ref: setScrollEl, onScroll: measure }}
      containerClassName={cn(allowsColumnResize && tableWidth && "w-fit max-w-full", className)}
      className={cn(fixedLayout && "table-fixed", contentClassName)}
      style={tableWidth ? { width: tableWidth } : undefined}
      data-vertical-align={verticalAlign}
      {...props}
    >
      <TableHeader className={stickyHeader || virtualized ? "[&_th]:sticky [&_th]:top-0 [&_th]:z-10" : undefined}>
        <TableRow style={virtualized ? { height: headingHeight } : undefined}>
          {onReorder && <TableHead className="px-1" style={fixedCell(DRAG_WIDTH, 0)}><span className="sr-only">Reorder</span></TableHead>}
          {showCheckboxes && (
            <TableHead style={fixedCell(SELECTION_WIDTH, onReorder ? DRAG_WIDTH : 0)}>
              {selectionMode === "multiple" ? (
                <Checkbox aria-label="Select all rows" checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={(checked) => setSelection(checked ? new Set(selectable.map((r) => r.id)) : new Set())} />
              ) : <span className="sr-only">Select</span>}
            </TableHead>
          )}
          {columns.map((column) => {
            const direction = sort?.column === column.id ? sort.direction : undefined
            const header = typeof column.header === "function" ? column.header({ sortDirection: direction }) : column.header
            return (
              <TableHead
                key={column.id}
                align={column.align}
                style={cellStyle(column)}
                className={cellClass(column)}
                sortDirection={column.allowsSorting ? direction ?? "none" : undefined}
                onSort={column.allowsSorting ? () => setSort({ column: column.id, direction: direction === "ascending" ? "descending" : "ascending" }) : undefined}
              >
                {header}
                {allowsColumnResize && column.allowsResizing && (
                  <TableColumnResizer onResize={(delta) => setWidth(column.id, delta)} />
                )}
              </TableHead>
            )
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {total === 0 && (
          <TableEmpty colSpan={colCount}>{renderEmptyState ? renderEmptyState() : "No data"}</TableEmpty>
        )}
        {virtualized && start > 0 && <tr aria-hidden="true"><td colSpan={colCount} style={{ height: start * rowHeight, padding: 0 }} /></tr>}
        {visible.map((row, offset) => {
          const index = start + offset
          const selected = selection.has(row.id)
          const isDisabled = disabled.has(row.id)
          return (
            <TableRow
              key={row.id}
              selected={selected}
              disabled={isDisabled}
              interactive={selectionMode !== "none" || !!onRowAction}
              aria-selected={selectionMode !== "none" ? selected : undefined}
              aria-level={getChildren ? row.level : undefined}
              aria-expanded={row.expandable ? expanded.has(row.id) : undefined}
              aria-rowindex={virtualized ? index + 2 : undefined}
              style={virtualized ? { height: rowHeight } : undefined}
              className={cn(dragging === row.id && "opacity-50", dropOver === row.id && dragging !== row.id && "[&>td]:shadow-[inset_0_2px_0_var(--h-accent)]")}
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("button, a, input, [role=checkbox]")) return
                if (event.detail === 0) { if (onRowAction) onRowAction(row.id); else toggleRow(row.id); return } // Enter on a focused row
                toggleRow(row.id, event.metaKey || event.ctrlKey)
              }}
              onDoubleClick={onRowAction ? (event) => { if (!(event.target as HTMLElement).closest("button, a, input, [role=checkbox]") && !isDisabled) onRowAction(row.id) } : undefined}
              draggable={onReorder && grabbed === null ? true : undefined}
              onDragStart={onReorder ? (event) => { event.dataTransfer.setData("text/plain", row.id); setDragging(row.id) } : undefined}
              onDragEnd={onReorder ? () => { setDragging(null); setDropOver(null) } : undefined}
              onDragOver={onReorder ? (event) => { event.preventDefault(); setDropOver(row.id) } : undefined}
              onDrop={onReorder ? (event) => { event.preventDefault(); move(event.dataTransfer.getData("text/plain"), data.findIndex((item) => getRowId(item) === row.id)); setDragging(null); setDropOver(null) } : undefined}
            >
              {onReorder && (
                <TableCell className="px-1" style={fixedCell(DRAG_WIDTH, 0)}>
                  <button
                    type="button"
                    aria-label={grabbed === row.id ? "Drop row (arrow keys move it)" : "Reorder row"}
                    aria-pressed={grabbed === row.id}
                    disabled={isDisabled}
                    onClick={() => setGrabbed(grabbed === row.id ? null : row.id)}
                    onBlur={() => setGrabbed(null)}
                    onKeyDown={(event) => {
                      if (grabbed !== row.id) return
                      if (event.key === "ArrowUp") { event.preventDefault(); move(row.id, index - 1) }
                      else if (event.key === "ArrowDown") { event.preventDefault(); move(row.id, index + 1) }
                      else if (event.key === "Escape") setGrabbed(null)
                    }}
                    className={cn("inline-flex size-6 cursor-grab items-center justify-center rounded-md text-h-muted outline-none transition-colors hover:text-h-foreground focus-visible:h-focus-ring active:cursor-grabbing", grabbed === row.id && "bg-h-default text-h-foreground")}
                  >
                    <DotsSixVertical weight="bold" className="size-4" />
                  </button>
                </TableCell>
              )}
              {showCheckboxes && (
                <TableCell style={fixedCell(SELECTION_WIDTH, onReorder ? DRAG_WIDTH : 0)}>
                  <Checkbox aria-label={`Select row ${row.id}`} checked={selected} disabled={isDisabled} onCheckedChange={() => toggleRow(row.id, true)} />
                </TableCell>
              )}
              {columns.map((column) => {
                const content = column.cell ? column.cell(row.item, column) : column.accessorKey ? (row.item[column.accessorKey] as React.ReactNode) : null
                const isTree = getChildren && column.id === tree?.id
                return (
                  <TableCell
                    key={column.id}
                    align={column.align}
                    style={{ ...cellStyle(column), ...(virtualized ? { paddingBlock: 0 } : {}) }}
                    className={cn(cellClass(column), verticalClass)}
                  >
                    {isTree ? (
                      <div className="flex items-center gap-1" style={{ paddingInlineStart: (row.level - 1) * treeIndent }}>
                        {row.expandable ? (
                          <TableExpandButton expanded={expanded.has(row.id)} onToggle={() => {
                            const next = new Set(expanded)
                            if (next.has(row.id)) next.delete(row.id)
                            else next.add(row.id)
                            setExpanded(next)
                          }} />
                        ) : <span aria-hidden className="size-6 shrink-0" />}
                        {content}
                      </div>
                    ) : content}
                  </TableCell>
                )
              })}
            </TableRow>
          )
        })}
        {virtualized && end < total && <tr aria-hidden="true"><td colSpan={colCount} style={{ height: (total - end) * rowHeight, padding: 0 }} /></tr>}
        {onLoadMore && (
          <TableLoadMore colSpan={colCount} isLoading={isLoadingMore} onLoadMore={onLoadMore}>{isLoadingMore ? loadMoreContent : null}</TableLoadMore>
        )}
      </TableBody>
    </Table>
  )
}

export { DataGrid }
export type { DataGridColumn, DataGridProps, SortDescriptor, SortDirection }
