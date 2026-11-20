import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Archive, Export, FolderOpen, Trash, X } from "@phosphor-icons/react"
import { DataGrid, type DataGridColumn, type SortDescriptor } from "./data-grid"
import { ActionBar } from "./action-bar"
import { Badge } from "./badge"
import { Button } from "./button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./empty"
import { Spinner } from "./spinner"
import { ToolbarItem } from "./toolbar"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPageSize, PaginationPrevious, PaginationSummary } from "./pagination"
import { SearchField } from "./search-field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "./dropdown-menu"
import { Columns } from "@phosphor-icons/react"

const meta = {
  title: "Display & content/Data grid",
  id: "molecules-data-grid",
  component: DataGrid,
  tags: ["autodocs", "new"],
  args: { "aria-label": "Data", columns: [], data: [], getRowId: () => "" },
  parameters: { docs: { story: { inline: false, iframeHeight: 460 }, description: { component: "A full-featured data grid on the Table. Give it a flat `data` array, a `columns` definition and a `getRowId`, and it renders the whole table with sorting, row selection, expandable tree rows, column resizing, pinned columns, row reorder, an empty state, infinite loading and a sticky header. Columns have an `id`, a `header` and either an `accessorKey` or a custom `cell`. Sorting is client-side and locale-aware unless you control it with `sortDescriptor` and `onSortChange`, or give a column a `sortFn`. Selection, sorting and expansion work controlled or uncontrolled. Row virtualization is not included yet." } } },
} satisfies Meta<typeof DataGrid>
export default meta
type Story = StoryObj<typeof meta>

type Payment = { id: string; customer: string; amount: number; date: string; status: "succeeded" | "failed" | "pending" }
const payments: Payment[] = [
  { id: "p1", customer: "Marta Silva", amount: 128.5, date: "2026-03-02", status: "succeeded" },
  { id: "p2", customer: "Jonas Weber", amount: 64, date: "2026-03-04", status: "pending" },
  { id: "p3", customer: "Amara Okafor", amount: 240.25, date: "2026-03-05", status: "succeeded" },
  { id: "p4", customer: "Liam Chen", amount: 89.9, date: "2026-03-07", status: "failed" },
  { id: "p5", customer: "Sofia Rossi", amount: 312, date: "2026-03-09", status: "succeeded" },
  { id: "p6", customer: "Noah Silva", amount: 45.75, date: "2026-03-11", status: "pending" },
]
const statusBadge = (status: Payment["status"]) => (
  <Badge size="sm" variant="soft" color={status === "succeeded" ? "success" : status === "failed" ? "danger" : "warning"}>{status}</Badge>
)
const columns: DataGridColumn<Payment>[] = [
  { id: "customer", header: "Customer", accessorKey: "customer", isRowHeader: true, allowsSorting: true },
  { id: "amount", header: "Amount", accessorKey: "amount", align: "end", allowsSorting: true, cell: (p) => `$${p.amount.toFixed(2)}` },
  { id: "date", header: "Date", accessorKey: "date", allowsSorting: true },
  { id: "status", header: "Status", accessorKey: "status", cell: (p) => statusBadge(p.status) },
]
const byId = (item: { id: string }) => item.id

export const Basic: Story = {
  render: () => <DataGrid aria-label="Payments" columns={columns} data={payments} getRowId={byId} />,
}

export const Selection: Story = {
  parameters: { docs: { description: { story: "`selectionMode` is `single` or `multiple`; checkboxes show unless `showSelectionCheckboxes={false}`. Clicking a row toggles it. Controlled with `selectedKeys` and `onSelectionChange`, or uncontrolled with `defaultSelectedKeys`." } } },
  render: () => <DataGrid aria-label="Payments" columns={columns} data={payments} getRowId={byId} selectionMode="multiple" defaultSelectedKeys={new Set(["p2", "p3"])} />,
}

export const Sorting: Story = {
  parameters: { docs: { description: { story: "Mark columns `allowsSorting`. With `defaultSortDescriptor` the grid sorts itself; a column's `sortFn` replaces the default comparison (here, status by priority)." } } },
  render: () => {
    const order = { failed: 0, pending: 1, succeeded: 2 }
    const cols: DataGridColumn<Payment>[] = columns.map((c) => (c.id === "status" ? { ...c, allowsSorting: true, sortFn: (a: Payment, b: Payment) => order[a.status] - order[b.status] } : c))
    return <DataGrid aria-label="Payments" columns={cols} data={payments} getRowId={byId} defaultSortDescriptor={{ column: "amount", direction: "descending" }} />
  },
}

export const ControlledSorting: Story = {
  parameters: { docs: { description: { story: "For server-side sorting pass a `sortDescriptor` and handle `onSortChange`; the grid then leaves the data order to you." } } },
  render: () => {
    const [sort, setSort] = React.useState<SortDescriptor>({ column: "date", direction: "descending" })
    const sorted = [...payments].sort((a, b) => (sort.direction === "ascending" ? 1 : -1) * a.date.localeCompare(b.date))
    return (
      <div className="grid gap-3">
        <p className="text-sm text-h-muted">Sorted by {sort.column}, {sort.direction}</p>
        <DataGrid aria-label="Payments" columns={columns.map((c) => (c.id === "date" ? c : { ...c, allowsSorting: false }))} data={sorted} getRowId={byId} sortDescriptor={sort} onSortChange={setSort} />
      </div>
    )
  },
}

export const ColumnResizing: Story = {
  parameters: { docs: { description: { story: "Set `allowsColumnResize` on the grid and `allowsResizing` with a `minWidth` on the columns that can be dragged. Arrow keys on a focused handle resize too." } } },
  render: () => {
    const cols: DataGridColumn<Payment>[] = columns.map((c) => ({ ...c, allowsResizing: true, width: c.id === "customer" ? 200 : 140, minWidth: 100 }))
    return <DataGrid aria-label="Payments" columns={cols} data={payments} getRowId={byId} allowsColumnResize />
  },
}

export const PinnedColumns: Story = {
  parameters: { docs: { description: { story: "Pin columns to the start or end edge so they stay visible while the grid scrolls sideways. Pinned columns need a numeric `width` or `minWidth`." } } },
  render: () => {
    const cols: DataGridColumn<Payment>[] = [
      { id: "customer", header: "Customer", accessorKey: "customer", isRowHeader: true, pinned: "start", width: 170 },
      { id: "amount", header: "Amount", accessorKey: "amount", width: 220, cell: (p) => `$${p.amount.toFixed(2)}` },
      { id: "date", header: "Date", accessorKey: "date", width: 260 },
      { id: "id", header: "Reference", accessorKey: "id", width: 260 },
      { id: "status", header: "Status", accessorKey: "status", width: 120, pinned: "end", cell: (p) => statusBadge(p.status) },
    ]
    return <div className="w-full max-w-md"><DataGrid aria-label="Payments" columns={cols} data={payments} getRowId={byId} /></div>
  },
}

type FileRow = { id: string; name: string; type: "Folder" | "File"; size: string; children?: FileRow[] }
const files: FileRow[] = [
  { id: "1", name: "Marketing", type: "Folder", size: "—", children: [
    { id: "1a", name: "Posters", type: "Folder", size: "—", children: [{ id: "1a1", name: "festival.png", type: "File", size: "2.4 MB" }, { id: "1a2", name: "jazz.png", type: "File", size: "1.9 MB" }] },
    { id: "1b", name: "Press kit.zip", type: "File", size: "18 MB" },
  ] },
  { id: "2", name: "Contracts", type: "Folder", size: "—", children: [{ id: "2a", name: "Venue agreement.pdf", type: "File", size: "420 KB" }] },
  { id: "3", name: "Seating plan.xlsx", type: "File", size: "96 KB" },
]
export const ExpandableRows: Story = {
  parameters: { docs: { description: { story: "Give `getChildren` and the grid renders nested rows, with a chevron in the `treeColumn` and indent per level (`treeIndent`). It composes with selection and sorting." } } },
  render: () => (
    <DataGrid
      aria-label="Files"
      columns={[
        { id: "name", header: "Name", accessorKey: "name", isRowHeader: true },
        { id: "type", header: "Type", accessorKey: "type" },
        { id: "size", header: "Size", accessorKey: "size", align: "end" },
      ]}
      data={files}
      getRowId={byId}
      getChildren={(item) => item.children}
      treeColumn="name"
      defaultExpandedKeys={new Set(["1"])}
    />
  ),
}

export const DragAndDrop: Story = {
  parameters: { docs: { description: { story: "`onReorder` adds a drag handle to each row, with the data in its new order. Keyboard: focus the handle, press Enter to grab, use the arrow keys to move and Enter or Escape to drop." } } },
  render: () => {
    const [tasks, setTasks] = React.useState(payments.slice(0, 5))
    return <DataGrid aria-label="Backlog" columns={columns.slice(0, 2)} data={tasks} getRowId={byId} onReorder={(event) => setTasks(event.reorderedData)} />
  },
}

export const EmptyState: Story = {
  render: () => (
    <DataGrid
      aria-label="Projects"
      columns={columns}
      data={[]}
      getRowId={byId}
      renderEmptyState={() => (
        <Empty className="border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon"><FolderOpen weight="bold" /></EmptyMedia>
            <EmptyTitle>No payments yet</EmptyTitle>
            <EmptyDescription>Payments will appear here as soon as a customer buys a ticket.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    />
  ),
}

export const AsyncLoading: Story = {
  parameters: { docs: { description: { story: "`onLoadMore`, `isLoadingMore` and `loadMoreContent` give infinite scrolling: a sentinel row at the end calls `onLoadMore` when it scrolls into view." } } },
  render: () => {
    const [items, setItems] = React.useState(payments)
    const [loading, setLoading] = React.useState(false)
    const more = () => {
      setLoading(true)
      setTimeout(() => {
        setItems((current) => [...current, ...payments.map((p) => ({ ...p, id: `${p.id}-${current.length}` }))])
        setLoading(false)
      }, 800)
    }
    return (
      <DataGrid aria-label="Invoices" columns={columns} data={items} getRowId={byId} stickyHeader scrollContainerClassName="max-h-72 overflow-y-auto"
        onLoadMore={items.length < 30 ? more : undefined} isLoadingMore={loading} loadMoreContent={<Spinner className="size-4" />} />
    )
  },
}

export const StickyHeader: Story = {
  parameters: { docs: { description: { story: "`stickyHeader` keeps the column headers visible while the rows scroll inside the grid; give `scrollContainerClassName` a height." } } },
  render: () => {
    const many = Array.from({ length: 4 }, (_, i) => payments.map((p) => ({ ...p, id: `${p.id}-${i}` }))).flat()
    return <DataGrid aria-label="Payments" columns={columns} data={many} getRowId={byId} stickyHeader scrollContainerClassName="max-h-72 overflow-y-auto" selectionMode="multiple" />
  },
}

export const SecondaryVariant: Story = {
  render: () => <DataGrid aria-label="Payments" variant="secondary" columns={columns} data={payments} getRowId={byId} />,
}

export const BulkActions: Story = {
  parameters: { docs: { description: { story: "Combine selection with an Action bar for bulk operations such as export, archive or delete." } } },
  render: () => {
    const [selected, setSelected] = React.useState<Set<string>>(new Set(["p1"]))
    return (
      <div className="relative w-full max-w-2xl pb-24">
        <DataGrid aria-label="Payments" columns={columns} data={payments} getRowId={byId} selectionMode="multiple" selectedKeys={selected} onSelectionChange={setSelected} />
        <ActionBar isOpen={selected.size > 0} position="absolute" aria-label="Payment actions">
          <ActionBar.Prefix><Badge size="sm" variant="secondary">{selected.size}</Badge><ActionBar.Label>selected</ActionBar.Label></ActionBar.Prefix>
          <ActionBar.Separator />
          <ActionBar.Content>
            <ToolbarItem asChild><Button size="sm" variant="ghost" aria-label="Export"><Export weight="bold" /><ActionBar.Label>Export</ActionBar.Label></Button></ToolbarItem>
            <ToolbarItem asChild><Button size="sm" variant="ghost" aria-label="Archive"><Archive weight="bold" /><ActionBar.Label>Archive</ActionBar.Label></Button></ToolbarItem>
            <ToolbarItem asChild><Button size="sm" variant="danger-soft" aria-label="Delete"><Trash weight="bold" /><ActionBar.Label>Delete</ActionBar.Label></Button></ToolbarItem>
          </ActionBar.Content>
          <ActionBar.Separator />
          <ActionBar.Suffix>
            <ToolbarItem asChild><Button size="icon-sm" variant="ghost" aria-label="Clear selection" onClick={() => setSelected(new Set())}><X weight="bold" /></Button></ToolbarItem>
          </ActionBar.Suffix>
        </ActionBar>
      </div>
    )
  },
}

const people = ["Marta Silva", "Jonas Weber", "Amara Okafor", "Liam Chen", "Sofia Rossi", "Noah Silva", "Priya Nair", "Diego Ramos", "Lena Fischer", "Eric Grundfast", "Ana López", "Joe Fields"]
const invoices = Array.from({ length: 47 }, (_, i) => ({ id: `INV-${1000 + i}`, customer: people[(i * 5) % people.length], amount: 40 + ((i * 37) % 260), status: payments[(i * 2) % payments.length].status }))
type Invoice = (typeof invoices)[number]
const invoiceColumns: DataGridColumn<Invoice>[] = [
  { id: "id", header: "Invoice", accessorKey: "id", isRowHeader: true, allowsSorting: true },
  { id: "customer", header: "Customer", accessorKey: "customer", allowsSorting: true },
  { id: "amount", header: "Amount", accessorKey: "amount", align: "end", allowsSorting: true, cell: (i) => `$${i.amount.toFixed(2)}` },
  { id: "status", header: "Status", accessorKey: "status", cell: (i) => statusBadge(i.status) },
]

export const Footer: Story = {
  parameters: { docs: { description: { story: "Pass a `footer` node for pagination, totals or a summary. It sits under the table at the full width of the grid, outside the horizontal scroll area, and `footerClassName` adjusts its layout (for example `justify-between`)." } } },
  render: () => {
    const [page, setPage] = React.useState(1)
    const [size, setSize] = React.useState(5)
    const pages = Math.ceil(invoices.length / size)
    const go = (p: number) => (e: React.MouseEvent) => { e.preventDefault(); setPage(Math.min(pages, Math.max(1, p))) }
    const first = Math.max(0, Math.min(page - 2, pages - 3))
    return (
      <DataGrid aria-label="Invoices" columns={invoiceColumns} data={invoices.slice((page - 1) * size, page * size)} getRowId={byId}
        footerClassName="flex-wrap justify-between"
        footer={(
          <>
            <PaginationSummary>Showing {(page - 1) * size + 1} to {Math.min(page * size, invoices.length)} of {invoices.length} invoices</PaginationSummary>
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem><PaginationPrevious href="#" onClick={go(page - 1)} /></PaginationItem>
                {Array.from({ length: Math.min(3, pages) }, (_, i) => first + i + 1).map((n) => <PaginationItem key={n}><PaginationLink href="#" isActive={n === page} onClick={go(n)}>{n}</PaginationLink></PaginationItem>)}
                <PaginationItem><PaginationNext href="#" onClick={go(page + 1)} /></PaginationItem>
              </PaginationContent>
            </Pagination>
            <PaginationPageSize value={size} onValueChange={(v) => { setSize(v); setPage(1) }} options={[5, 10, 25]} />
          </>
        )} />
    )
  },
}

export const Users: Story = {
  parameters: { docs: { description: { story: "A minimal directory: the secondary variant with accessor-only columns and a row action, with no selection and no sorting." } } },
  render: () => (
    <DataGrid aria-label="Users" variant="secondary" getRowId={byId}
      columns={[
        { id: "customer", header: "Name", accessorKey: "customer", isRowHeader: true },
        { id: "id", header: "Reference", accessorKey: "id" },
        { id: "status", header: "Status", accessorKey: "status" },
        { id: "open", header: "", align: "end", width: 80, cell: (p: Payment) => <a href="#" className="text-sm text-h-accent-soft-foreground hover:underline" onClick={(e) => e.preventDefault()}>View {p.id}</a> },
      ]}
      data={payments} />
  ),
}

export const Virtualized: Story = {
  parameters: { docs: { description: { story: "`virtualized` renders only the visible rows, for thousands of rows. Give `scrollContainerClassName` a fixed height; rows are `rowHeight` tall (42 by default) and the header `headingHeight` (36)." } } },
  render: () => {
    type Big = { id: string; order: string; customer: string; amount: number }
    const big = React.useMemo<Big[]>(() => Array.from({ length: 10000 }, (_, i) => ({ id: `row-${i}`, order: `ORD-${60000 + i}`, customer: payments[i % payments.length].customer, amount: 20 + ((i * 53) % 480) })), [])
    const bigColumns: DataGridColumn<Big>[] = [
      { id: "order", header: "Order", accessorKey: "order", isRowHeader: true, allowsSorting: true },
      { id: "customer", header: "Customer", accessorKey: "customer", allowsSorting: true },
      { id: "amount", header: "Amount", accessorKey: "amount", align: "end", allowsSorting: true, cell: (r) => `$${r.amount.toFixed(2)}` },
    ]
    return (
      <div className="grid gap-2">
        <p className="text-sm text-h-muted">10,000 rows</p>
        <DataGrid aria-label="Orders" virtualized rowHeight={42} headingHeight={36} scrollContainerClassName="h-72" getRowId={byId} data={big} columns={bigColumns} />
      </div>
    )
  },
}

export const VerticalAlign: Story = {
  parameters: { docs: { description: { story: "`verticalAlign` places the cell content at the top, middle (default) or bottom of the row." } } },
  render: () => {
    const tall = payments.slice(0, 3).map((p) => ({ ...p, note: "A longer note that wraps onto several lines so the row is tall enough to show the alignment." }))
    return (
      <div className="grid gap-4">
        {(["top", "middle", "bottom"] as const).map((v) => (
          <DataGrid key={v} aria-label={`Aligned ${v}`} verticalAlign={v} getRowId={byId} data={tall.slice(0, 2)}
            columns={[
              { id: "customer", header: `Vertical align: ${v}`, accessorKey: "customer", isRowHeader: true, width: 200 },
              { id: "note", header: "Note", accessorKey: "note" },
              { id: "amount", header: "Amount", align: "end", width: 110, cell: (p) => `$${p.amount.toFixed(2)}` },
            ]} />
        ))}
      </div>
    )
  },
}

export const DisabledRows: Story = {
  parameters: { docs: { description: { story: "`disabledKeys` dims rows and takes them out of selection and actions." } } },
  render: () => <DataGrid aria-label="Payments" columns={columns} data={payments} getRowId={byId} selectionMode="multiple" disabledKeys={["p2", "p4"]} defaultSelectedKeys={new Set(["p1"])} />,
}

export const SelectionBehavior: Story = {
  parameters: { docs: { description: { story: "`selectionBehavior=\"replace\"`: a click selects only that row, Ctrl or Cmd adds to the selection, and the checkboxes still toggle." } } },
  render: () => <DataGrid aria-label="Payments" columns={columns} data={payments} getRowId={byId} selectionMode="multiple" selectionBehavior="replace" />,
}

export const RowActions: Story = {
  parameters: { docs: { description: { story: "`onRowAction` fires on double-click, or Enter on a focused row." } } },
  render: () => {
    const [last, setLast] = React.useState<string>("none yet")
    return (
      <div className="grid gap-3">
        <p className="text-sm text-h-muted">Last actioned row: {last}</p>
        <DataGrid aria-label="Payments" columns={columns} data={payments} getRowId={byId} onRowAction={setLast} />
      </div>
    )
  },
}

export const TeamMembers: Story = {
  parameters: { docs: { description: { story: "A full-featured table: controlled sorting, multi-selection, a pinned first column, resizable columns, column visibility, search, a status filter and client-side pagination." } } },
  render: () => {
    const [query, setQuery] = React.useState("")
    const [status, setStatus] = React.useState("all")
    const [hidden, setHidden] = React.useState<string[]>([])
    const [sort, setSort] = React.useState<SortDescriptor>({ column: "customer", direction: "ascending" })
    const [page, setPage] = React.useState(1)
    const size = 6
    const filtered = invoices.filter((i) => (status === "all" || i.status === status) && i.customer.toLowerCase().includes(query.toLowerCase()))
    const sorted = [...filtered].sort((a, b) => {
      const key = sort.column as keyof Invoice
      const diff = typeof a[key] === "number" ? (a[key] as number) - (b[key] as number) : String(a[key]).localeCompare(String(b[key]))
      return sort.direction === "ascending" ? diff : -diff
    })
    const pages = Math.max(1, Math.ceil(sorted.length / size))
    const shown = sorted.slice((Math.min(page, pages) - 1) * size, Math.min(page, pages) * size)
    const all: DataGridColumn<Invoice>[] = [
      { id: "customer", header: "Customer", accessorKey: "customer", isRowHeader: true, allowsSorting: true, pinned: "start", width: 180, allowsResizing: true, minWidth: 120 },
      { id: "id", header: "Invoice", accessorKey: "id", allowsSorting: true, width: 140, allowsResizing: true, minWidth: 100 },
      { id: "amount", header: "Amount", accessorKey: "amount", align: "end", allowsSorting: true, width: 140, allowsResizing: true, minWidth: 100, cell: (i) => `$${i.amount.toFixed(2)}` },
      { id: "status", header: "Status", accessorKey: "status", width: 140, allowsResizing: true, minWidth: 100, cell: (i) => statusBadge(i.status) },
    ]
    return (
      <div className="grid w-full max-w-3xl gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-56"><SearchField size="sm" aria-label="Search customers" placeholder="Search customers" shortcutLabel="" shortcutKey="" value={query} onChange={(e) => { setQuery(e.currentTarget.value); setPage(1) }} /></div>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
            <SelectTrigger size="sm" aria-label="Status filter"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="succeeded">Succeeded</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="failed">Failed</SelectItem></SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button size="sm" variant="tertiary" className="ml-auto"><Columns weight="bold" /> Columns</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {all.slice(1).map((c) => (
                <DropdownMenuCheckboxItem key={c.id} checked={!hidden.includes(c.id)} onCheckedChange={(on) => setHidden((h) => (on ? h.filter((x) => x !== c.id) : [...h, c.id]))} onSelect={(e) => e.preventDefault()}>{String(c.header)}</DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <DataGrid aria-label="Team members" columns={all.filter((c) => !hidden.includes(c.id))} data={shown} getRowId={byId}
          selectionMode="multiple" sortDescriptor={sort} onSortChange={setSort} allowsColumnResize
          footerClassName="justify-between"
          footer={(
            <>
              <PaginationSummary>{sorted.length} members</PaginationSummary>
              <Pagination className="mx-0 w-auto">
                <PaginationContent>
                  <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage(Math.max(1, page - 1)) }} /></PaginationItem>
                  <PaginationItem><PaginationLink href="#" isActive onClick={(e) => e.preventDefault()}>{Math.min(page, pages)}</PaginationLink></PaginationItem>
                  <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage(Math.min(pages, page + 1)) }} /></PaginationItem>
                </PaginationContent>
              </Pagination>
            </>
          )} />
      </div>
    )
  },
}
