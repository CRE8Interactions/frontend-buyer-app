import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { DotsThree, MagnifyingGlass, Tray, Trash, Export, Columns, Funnel, X } from "@phosphor-icons/react"
import {
  Table, TableBody, TableCell, TableColumnResizer, TableEmpty, TableExpandButton, TableFooter, TableFooterBar, TableGroupRow, TableHead,
  TableHeader, TableLoadMore, TableRow, TableToolbar,
} from "./table"
import { Avatar, AvatarFallback } from "./avatar"
import { Badge } from "./badge"
import { Button } from "./button"
import { Checkbox } from "./checkbox"
import { Input } from "./input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./sheet"
import { Skeleton } from "./skeleton"
import { Spinner } from "./spinner"
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPageSize, PaginationPrevious, PaginationSummary,
} from "./pagination"
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "./dropdown-menu"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./empty"

const meta = {
  title: "Display & content/Table",
  id: "molecules-table",
  component: Table,
  tags: ["autodocs"],
  argTypes: { variant: { control: "inline-radio", options: ["primary", "secondary"] }, density: { control: "inline-radio", options: ["sm", "md", "lg"] } },
  parameters: {
    docs: {
      description: {
        component:
          "Structured data in rows and columns. Two looks: primary (a grey container with the body as a rounded card inside) and secondary (flat, with a standalone header bar). Compose from Table, TableHeader, TableBody, TableRow, TableHead and TableCell. Sorting, selection, expanding, resizing, paging, loading and empty states are built from small parts, shown in the stories below.",
      },
    },
  },
} satisfies Meta<typeof Table>
export default meta
type Story = StoryObj<typeof meta>

/* ---------- fixture: ticket orders ---------- */
type Status = "Paid" | "Pending" | "Refunded" | "Failed"
type Order = { id: string; customer: string; email: string; event: string; tickets: number; total: number; status: Status; date: string }
const events = ["Harbour Lights Festival", "Saturday Night Derby", "Spring Gala", "City Marathon Expo", "Indie Rooftop Sessions"]
const names = ["Marta Silva", "Joe Fields", "Trever Wilson", "Ana López", "Chaz Haskins", "Eric Grundfast", "Harrison Cogan", "Steven Tomlin", "Priya Nair", "Tom Becker", "Lena Fischer", "Diego Ramos"]
const statuses: Status[] = ["Paid", "Paid", "Pending", "Paid", "Refunded", "Paid", "Failed", "Paid"]
const statusList: Status[] = ["Paid", "Pending", "Refunded", "Failed"]
const orders: Order[] = Array.from({ length: 48 }, (_, i) => {
  const name = names[(i * 5) % names.length]
  return {
    id: `ORD-${(48210 + i * 7).toString()}`,
    customer: name,
    email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@mail.com`,
    event: events[(i * 3) % events.length],
    tickets: 1 + ((i * 7) % 6),
    total: 38 + ((i * 53) % 340),
    status: statuses[i % statuses.length],
    date: `2026-0${1 + (i % 9)}-${String(1 + ((i * 5) % 27)).padStart(2, "0")}`,
  }
})
const money = (n: number) => `$${n.toFixed(2)}`
const statusColor: Record<Status, "success" | "warning" | "default" | "danger"> = { Paid: "success", Pending: "warning", Refunded: "default", Failed: "danger" }
const StatusBadge = ({ s }: { s: Status }) => <Badge variant="soft" color={statusColor[s]} size="sm">{s}</Badge>
const initials = (n: string) => n.split(" ").map((p) => p[0]).join("").slice(0, 2)

/* ---------- basic ---------- */
const BasicTable = ({ variant }: { variant?: "primary" | "secondary" }) => (
  <Table variant={variant} aria-label="Recent orders" className="min-w-[36rem]">
    <TableHeader>
      <TableRow>
        <TableHead>Customer</TableHead>
        <TableHead>Event</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Email</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {orders.slice(0, 4).map((o) => (
        <TableRow key={o.id}>
          <TableCell>{o.customer}</TableCell>
          <TableCell>{o.event}</TableCell>
          <TableCell><StatusBadge s={o.status} /></TableCell>
          <TableCell className="text-h-muted">{o.email}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
)
export const Basic: Story = { render: () => <BasicTable /> }
export const Secondary: Story = {
  parameters: { docs: { description: { story: "No container: the header is its own rounded bar and rows are transparent with a line under each." } } },
  render: () => <BasicTable variant="secondary" />,
}

/* ---------- sorting ---------- */
type SortKey = "customer" | "event" | "tickets" | "total" | "date"
function useSort<T>(rows: T[], initial?: { key: keyof T; dir: "ascending" | "descending" }) {
  const [sort, setSort] = React.useState<{ key: keyof T; dir: "ascending" | "descending" } | undefined>(initial)
  const sorted = React.useMemo(() => {
    if (!sort) return rows
    const m = sort.dir === "ascending" ? 1 : -1
    return [...rows].sort((a, b) => (a[sort.key] > b[sort.key] ? m : a[sort.key] < b[sort.key] ? -m : 0))
  }, [rows, sort])
  const toggle = (key: keyof T) => setSort((s) => (s?.key === key ? (s.dir === "ascending" ? { key, dir: "descending" } : undefined) : { key, dir: "ascending" }))
  const dirOf = (key: keyof T) => (sort?.key === key ? sort.dir : "none")
  return { sorted, toggle, dirOf }
}
function SortingDemo() {
  const { sorted, toggle, dirOf } = useSort(orders.slice(0, 8), { key: "total", dir: "descending" })
  return (
    <Table aria-label="Sortable orders" className="min-w-[40rem]">
      <TableHeader>
        <TableRow>
          <TableHead sortDirection={dirOf("customer")} onSort={() => toggle("customer")}>Customer</TableHead>
          <TableHead sortDirection={dirOf("event")} onSort={() => toggle("event")}>Event</TableHead>
          <TableHead sortDirection={dirOf("tickets")} onSort={() => toggle("tickets")}>Tickets</TableHead>
          <TableHead sortDirection={dirOf("total")} onSort={() => toggle("total")}>Total</TableHead>
          <TableHead sortDirection={dirOf("date")} onSort={() => toggle("date")}>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((o) => (
          <TableRow key={o.id}>
            <TableCell>{o.customer}</TableCell>
            <TableCell>{o.event}</TableCell>
            <TableCell className="tabular-nums">{o.tickets}</TableCell>
            <TableCell className="tabular-nums">{money(o.total)}</TableCell>
            <TableCell className="tabular-nums text-h-muted">{o.date}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
export const Sorting: Story = {
  parameters: { docs: { description: { story: "A header with `onSort` becomes a button. Click once for ascending, again for descending, a third time to clear. The arrow flips with the direction; `aria-sort` follows." } } },
  render: () => <SortingDemo />,
}

/* ---------- selection ---------- */
function useSelection(ids: string[]) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const all = ids.length > 0 && ids.every((i) => selected.has(i))
  const some = ids.some((i) => selected.has(i))
  return {
    selected,
    all: all ? true : some ? ("indeterminate" as const) : false,
    toggle: (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n }),
    toggleAll: () => setSelected(all ? new Set() : new Set(ids)),
    clear: () => setSelected(new Set()),
  }
}
function SelectionDemo() {
  const rows = orders.slice(0, 6)
  const sel = useSelection(rows.map((r) => r.id))
  return (
    <div>
      <TableToolbar className="min-h-9">
        {sel.selected.size > 0 ? (
          <>
            <span className="text-sm text-h-muted">{sel.selected.size} selected</span>
            <Button size="sm" variant="tertiary"><Export weight="bold" />Export</Button>
            <Button size="sm" variant="danger-soft"><Trash weight="bold" />Cancel orders</Button>
            <Button size="sm" variant="ghost" onClick={sel.clear}>Clear</Button>
          </>
        ) : (
          <span className="text-sm text-h-muted">Select orders to act on them in bulk.</span>
        )}
      </TableToolbar>
      <Table aria-label="Selectable orders" className="min-w-[40rem]">
        <TableHeader>
          <TableRow>
            <TableHead><Checkbox aria-label="Select all" checked={sel.all} onCheckedChange={sel.toggleAll} /></TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((o, i) => (
            <TableRow key={o.id} selected={sel.selected.has(o.id)} disabled={i === 5}>
              <TableCell><Checkbox aria-label={`Select ${o.id}`} checked={sel.selected.has(o.id)} onCheckedChange={() => sel.toggle(o.id)} /></TableCell>
              <TableCell className="font-medium tabular-nums">{o.id}</TableCell>
              <TableCell>{o.customer}</TableCell>
              <TableCell><StatusBadge s={o.status} /></TableCell>
              <TableCell className="tabular-nums">{money(o.total)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
export const Selection: Story = {
  parameters: { docs: { description: { story: "Checkboxes in the first column, with select-all (mixed when some are chosen). Selected rows fade their fill, and a toolbar above the table shows bulk actions. The last row shows the disabled state." } } },
  render: () => <SelectionDemo />,
}

/* ---------- expandable rows ---------- */
const tiers: Record<string, { tier: string; sold: number; cap: number; price: number }[]> = {
  "Harbour Lights Festival": [{ tier: "General admission", sold: 1840, cap: 2500, price: 45 }, { tier: "VIP lounge", sold: 190, cap: 200, price: 140 }],
  "Saturday Night Derby": [{ tier: "Lower bowl", sold: 3100, cap: 4000, price: 68 }, { tier: "Upper bowl", sold: 5200, cap: 8000, price: 32 }, { tier: "Suites", sold: 38, cap: 40, price: 420 }],
  "Spring Gala": [{ tier: "Table of 8", sold: 21, cap: 30, price: 800 }, { tier: "Single seat", sold: 64, cap: 120, price: 120 }],
}
function ExpandableDemo() {
  const [open, setOpen] = React.useState<Set<string>>(new Set(["Saturday Night Derby"]))
  const flip = (k: string) => setOpen((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })
  return (
    <Table aria-label="Events and ticket tiers" className="min-w-[38rem] table-fixed">
      <colgroup><col className="w-[46%]" /><col className="w-[18%]" /><col className="w-[20%]" /><col className="w-[16%]" /></colgroup>
      <TableHeader>
        <TableRow>
          <TableHead>Event / tier</TableHead>
          <TableHead>Sold</TableHead>
          <TableHead>Capacity</TableHead>
          <TableHead>Price</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Object.entries(tiers).map(([ev, list]) => {
          const sold = list.reduce((a, t) => a + t.sold, 0)
          const cap = list.reduce((a, t) => a + t.cap, 0)
          return (
            <React.Fragment key={ev}>
              <TableRow>
                <TableCell level={1}>
                  <div className="flex items-center gap-2">
                    <TableExpandButton expanded={open.has(ev)} onToggle={() => flip(ev)} />
                    <span className="font-medium">{ev}</span>
                  </div>
                </TableCell>
                <TableCell className="tabular-nums">{sold.toLocaleString()}</TableCell>
                <TableCell className="tabular-nums">{cap.toLocaleString()}</TableCell>
                <TableCell className="text-h-muted">{list.length} tiers</TableCell>
              </TableRow>
              {open.has(ev) && list.map((t) => (
                <TableRow key={t.tier}>
                  <TableCell level={3} className="text-h-muted">{t.tier}</TableCell>
                  <TableCell className="tabular-nums">{t.sold.toLocaleString()}</TableCell>
                  <TableCell className="tabular-nums">{t.cap.toLocaleString()}</TableCell>
                  <TableCell className="tabular-nums">{money(t.price)}</TableCell>
                </TableRow>
              ))}
            </React.Fragment>
          )
        })}
      </TableBody>
    </Table>
  )
}
export const ExpandableRows: Story = {
  parameters: { docs: { description: { story: "Hierarchical data. The first cell takes a `level` to indent by 1rem per level, and a `TableExpandButton` turns its chevron a quarter turn when open. The table uses fixed column widths (`table-fixed` with a `colgroup`) so the columns stay put when rows open and close." } } },
  render: () => <ExpandableDemo />,
}

/* ---------- pagination ---------- */
function PagingDemo() {
  const [page, setPage] = React.useState(1)
  const [size, setSize] = React.useState(10)
  const pages = Math.ceil(orders.length / size)
  const rows = orders.slice((page - 1) * size, page * size)
  const go = (p: number) => (e: React.MouseEvent) => { e.preventDefault(); setPage(Math.min(pages, Math.max(1, p))) }
  const shown = Array.from({ length: pages }, (_, i) => i + 1).slice(Math.max(0, Math.min(page - 2, pages - 3)), Math.max(0, Math.min(page - 2, pages - 3)) + 3)
  return (
    <Table
      aria-label="Paged orders"
      className="min-w-[40rem]"
      footer={
        <TableFooterBar className="flex-wrap justify-between">
          <PaginationSummary>Showing {(page - 1) * size + 1} to {Math.min(page * size, orders.length)} of {orders.length} orders</PaginationSummary>
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem><PaginationPrevious href="#" onClick={go(page - 1)} /></PaginationItem>
              {shown.map((p) => <PaginationItem key={p}><PaginationLink href="#" isActive={p === page} onClick={go(p)}>{p}</PaginationLink></PaginationItem>)}
              <PaginationItem><PaginationNext href="#" onClick={go(page + 1)} /></PaginationItem>
            </PaginationContent>
          </Pagination>
          <PaginationPageSize value={size} onValueChange={(v) => { setSize(v); setPage(1) }} options={[5, 10, 25]} />
        </TableFooterBar>
      }
    >
      <TableHeader>
        <TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Event</TableHead><TableHead>Total</TableHead></TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((o) => (
          <TableRow key={o.id}>
            <TableCell className="font-medium tabular-nums">{o.id}</TableCell>
            <TableCell>{o.customer}</TableCell>
            <TableCell>{o.event}</TableCell>
            <TableCell className="tabular-nums">{money(o.total)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
export const WithPagination: Story = {
  parameters: { docs: { description: { story: "A `TableFooterBar` passed to the `footer` prop sits under the table on the container: a summary, page links and results per page." } } },
  render: () => <PagingDemo />,
}

/* ---------- resizing ---------- */
function ResizeDemo() {
  const [w, setW] = React.useState([180, 220, 120, 120])
  const resize = (i: number) => (d: number) => setW((cur) => cur.map((x, j) => (j === i ? Math.max(90, x + d) : x)))
  const labels = ["Customer", "Event", "Tickets", "Total"]
  return (
    <Table aria-label="Resizable columns" className="table-fixed" style={{ width: w.reduce((a, b) => a + b, 0) }} containerClassName="w-fit max-w-full" scrollClassName="max-w-full">
      <colgroup>{w.map((x, i) => <col key={i} style={{ width: x }} />)}</colgroup>
      <TableHeader>
        <TableRow>
          {labels.map((l, i) => (
            <TableHead key={l}>{l}<TableColumnResizer onResize={resize(i)} /></TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.slice(0, 5).map((o) => (
          <TableRow key={o.id}>
            <TableCell className="truncate">{o.customer}</TableCell>
            <TableCell className="truncate">{o.event}</TableCell>
            <TableCell className="tabular-nums">{o.tickets}</TableCell>
            <TableCell className="tabular-nums">{money(o.total)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
export const ColumnResizing: Story = {
  parameters: { docs: { description: { story: "A `TableColumnResizer` on the right edge of a header drags the column wider or narrower (arrow keys work too). The divider grows into an accent line while you hover or drag." } } },
  render: () => <ResizeDemo />,
}

/* ---------- empty + loading ---------- */
export const EmptyState: Story = {
  parameters: { docs: { description: { story: "`TableEmpty` fills the body when there is nothing to show." } } },
  render: () => (
    <Table aria-label="No orders" className="min-w-[36rem]">
      <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Status</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
      <TableBody>
        <TableEmpty colSpan={4}>
          <Empty className="border-0 p-0">
            <EmptyHeader>
              <EmptyMedia variant="icon"><Tray weight="bold" /></EmptyMedia>
              <EmptyTitle>No orders match</EmptyTitle>
              <EmptyDescription>Try a different search or clear the filters.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </TableEmpty>
      </TableBody>
    </Table>
  ),
}
export const LoadingSkeleton: Story = {
  parameters: { docs: { description: { story: "Skeleton rows keep the table's shape while data loads, so the layout does not jump." } } },
  render: () => (
    <Table aria-label="Loading orders" aria-busy className="min-w-[36rem]">
      <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Status</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
      <TableBody>
        {Array.from({ length: 5 }, (_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
            <TableCell><Skeleton className="h-4 w-14" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
}
function LoadMoreDemo() {
  const [n, setN] = React.useState(8)
  const [loading, setLoading] = React.useState(false)
  const more = () => { setLoading(true); setTimeout(() => { setN((x) => Math.min(orders.length, x + 8)); setLoading(false) }, 700) }
  return (
    <Table aria-label="Infinite orders" className="min-w-[36rem]" scrollClassName="max-h-72 overflow-y-auto">
      <TableHeader><TableRow><TableHead className="sticky top-0 z-10">Order</TableHead><TableHead className="sticky top-0 z-10">Customer</TableHead><TableHead className="sticky top-0 z-10">Total</TableHead></TableRow></TableHeader>
      <TableBody>
        {orders.slice(0, n).map((o) => (
          <TableRow key={o.id}><TableCell className="tabular-nums">{o.id}</TableCell><TableCell>{o.customer}</TableCell><TableCell className="tabular-nums">{money(o.total)}</TableCell></TableRow>
        ))}
        {n < orders.length && (
          <TableLoadMore colSpan={3} isLoading={loading} onLoadMore={more}><Spinner size="sm" /> Loading more</TableLoadMore>
        )}
      </TableBody>
    </Table>
  )
}
export const InfiniteScroll: Story = {
  parameters: { docs: { description: { story: "`TableLoadMore` is a sentinel row. When it scrolls into view and nothing is loading it calls `onLoadMore`." } } },
  render: () => <LoadMoreDemo />,
}

/* ---------- layout options ---------- */
export const StickyHeaderAndColumn: Story = {
  parameters: { docs: { description: { story: "A tall table scrolls inside its container with the header pinned, and the first column stays put while you scroll sideways." } } },
  render: () => (
    <Table aria-label="Wide orders" className="min-w-[60rem]" scrollClassName="max-h-72 overflow-y-auto">
      <TableHeader>
        <TableRow>
          {["Order", "Customer", "Email", "Event", "Tickets", "Total", "Status", "Date"].map((h, i) => (
            <TableHead key={h} className={i === 0 ? "sticky top-0 left-0 z-20" : "sticky top-0 z-10"}>{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.slice(0, 16).map((o) => (
          <TableRow key={o.id}>
            <TableCell className="sticky left-0 z-10 bg-(--table-cell-bg) font-medium whitespace-nowrap tabular-nums [@media(hover:hover)]:group-hover/row:bg-(--table-cell-bg)!">{o.id}</TableCell>
            <TableCell>{o.customer}</TableCell>
            <TableCell className="text-h-muted">{o.email}</TableCell>
            <TableCell>{o.event}</TableCell>
            <TableCell className="tabular-nums">{o.tickets}</TableCell>
            <TableCell className="tabular-nums">{money(o.total)}</TableCell>
            <TableCell><StatusBadge s={o.status} /></TableCell>
            <TableCell className="tabular-nums text-h-muted">{o.date}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
}
export const Density: Story = {
  parameters: { docs: { description: { story: "Row height: sm (8px cell padding), md (12px, default) and lg (16px)." } } },
  render: () => (
    <div className="flex flex-col gap-6">
      {(["sm", "md", "lg"] as const).map((d) => (
        <Table key={d} density={d} aria-label={`Density ${d}`} className="min-w-[30rem]">
          <TableHeader><TableRow><TableHead>Density {d}</TableHead><TableHead>Event</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
          <TableBody>
            {orders.slice(0, 2).map((o) => <TableRow key={o.id}><TableCell>{o.customer}</TableCell><TableCell>{o.event}</TableCell><TableCell className="tabular-nums">{money(o.total)}</TableCell></TableRow>)}
          </TableBody>
        </Table>
      ))}
    </div>
  ),
}
export const WithTotalsRow: Story = {
  parameters: { docs: { description: { story: "A `TableFooter` (the table's own foot) for totals, separate from the footer bar below the table." } } },
  render: () => {
    const rows = orders.slice(0, 5)
    return (
      <Table aria-label="Order totals" className="min-w-[32rem]">
        <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Tickets</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
        <TableBody>{rows.map((o) => <TableRow key={o.id}><TableCell className="tabular-nums">{o.id}</TableCell><TableCell className="tabular-nums">{o.tickets}</TableCell><TableCell className="tabular-nums">{money(o.total)}</TableCell></TableRow>)}</TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="border-t border-h-separator/50">Total</TableCell>
            <TableCell className="border-t border-h-separator/50 tabular-nums">{rows.reduce((a, o) => a + o.tickets, 0)}</TableCell>
            <TableCell className="border-t border-h-separator/50 tabular-nums">{money(rows.reduce((a, o) => a + o.total, 0))}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    )
  },
}

/* ---------- custom cells ---------- */
const Person = ({ name, email }: { name: string; email: string }) => (
  <div className="flex items-center gap-3">
    <Avatar size="sm"><AvatarFallback>{initials(name)}</AvatarFallback></Avatar>
    <div className="flex flex-col"><span className="font-medium leading-5">{name}</span><span className="text-xs text-h-muted">{email}</span></div>
  </div>
)
const Capacity = ({ sold, cap }: { sold: number; cap: number }) => {
  const pct = Math.round((sold / cap) * 100)
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-h-default"><div className="h-full rounded-full bg-h-accent" style={{ width: `${pct}%` }} /></div>
      <span className="text-xs text-h-muted tabular-nums">{pct}%</span>
    </div>
  )
}
const RowMenu = ({ label }: { label: string }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button size="icon-sm" variant="ghost" aria-label={`Actions for ${label}`}><DotsThree weight="bold" /></Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem>View order</DropdownMenuItem>
      <DropdownMenuItem>Resend tickets</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive">Refund</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)
export const CustomCells: Story = {
  parameters: { docs: { description: { story: "Cells hold anything: a person with an avatar and email, status badges, a capacity bar and a row menu." } } },
  render: () => (
    <Table aria-label="Orders with rich cells" className="min-w-[48rem]">
      <TableHeader>
        <TableRow><TableHead>Customer</TableHead><TableHead>Event</TableHead><TableHead>Status</TableHead><TableHead>Sold</TableHead><TableHead className="w-12"><span className="sr-only">Actions</span></TableHead></TableRow>
      </TableHeader>
      <TableBody>
        {orders.slice(0, 5).map((o, i) => (
          <TableRow key={o.id}>
            <TableCell><Person name={o.customer} email={o.email} /></TableCell>
            <TableCell>{o.event}</TableCell>
            <TableCell><StatusBadge s={o.status} /></TableCell>
            <TableCell><Capacity sold={40 + i * 13} cap={100} /></TableCell>
            <TableCell><RowMenu label={o.id} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
}

/* ---------- everything together ---------- */
const allCols = [
  { id: "event", label: "Event" },
  { id: "tickets", label: "Tickets" },
  { id: "total", label: "Total" },
  { id: "status", label: "Status" },
  { id: "date", label: "Date" },
] as const
type ColId = (typeof allCols)[number]["id"]
function FullDemo() {
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState<"all" | Status>("all")
  const [cols, setCols] = React.useState<Set<ColId>>(new Set(allCols.map((c) => c.id)))
  const [page, setPage] = React.useState(1)
  const [size, setSize] = React.useState(10)
  const filtered = React.useMemo(
    () => orders.filter((o) => (status === "all" || o.status === status) && (!query || `${o.id} ${o.customer} ${o.email} ${o.event}`.toLowerCase().includes(query.toLowerCase()))),
    [query, status]
  )
  const { sorted, toggle, dirOf } = useSort(filtered, { key: "date", dir: "descending" })
  const pages = Math.max(1, Math.ceil(sorted.length / size))
  const cur = Math.min(page, pages)
  const rows = sorted.slice((cur - 1) * size, cur * size)
  const sel = useSelection(rows.map((r) => r.id))
  const visible = (c: ColId) => cols.has(c)
  const colCount = 3 + allCols.filter((c) => visible(c.id)).length
  const go = (p: number) => (e: React.MouseEvent) => { e.preventDefault(); setPage(Math.min(pages, Math.max(1, p))) }
  const start = Math.max(1, Math.min(cur - 1, pages - 2))
  const nums = Array.from({ length: Math.min(3, pages) }, (_, i) => start + i)
  return (
    <div>
      <TableToolbar>
        <div className="relative w-64">
          <MagnifyingGlass aria-hidden weight="bold" className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-h-muted" />
          <Input aria-label="Search orders" placeholder="Search orders" className="ps-9" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1) }} />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v as typeof status); setPage(1) }}>
          <SelectTrigger aria-label="Status" className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statusList.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ms-auto flex items-center gap-2">
          {sel.selected.size > 0 && <><span className="text-sm text-h-muted">{sel.selected.size} selected</span><Button size="sm" variant="danger-soft"><Trash weight="bold" />Refund</Button></>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button size="sm" variant="tertiary"><Columns weight="bold" />Columns</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Show columns</DropdownMenuLabel>
              {allCols.map((c) => (
                <DropdownMenuCheckboxItem key={c.id} checked={cols.has(c.id)} onSelect={(e) => e.preventDefault()} onCheckedChange={(v) => setCols((s) => { const n = new Set(s); v ? n.add(c.id) : n.delete(c.id); return n })}>{c.label}</DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableToolbar>
      <Table
        aria-label="Orders"
        className="min-w-[56rem]"
        footer={
          <TableFooterBar className="flex-wrap justify-between">
            <PaginationSummary>{sorted.length === 0 ? "No orders" : `Showing ${(cur - 1) * size + 1} to ${Math.min(cur * size, sorted.length)} of ${sorted.length} orders`}</PaginationSummary>
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem><PaginationPrevious href="#" onClick={go(cur - 1)} /></PaginationItem>
                {nums.map((p) => <PaginationItem key={p}><PaginationLink href="#" isActive={p === cur} onClick={go(p)}>{p}</PaginationLink></PaginationItem>)}
                <PaginationItem><PaginationNext href="#" onClick={go(cur + 1)} /></PaginationItem>
              </PaginationContent>
            </Pagination>
            <PaginationPageSize value={size} onValueChange={(v) => { setSize(v); setPage(1) }} options={[5, 10, 25]} />
          </TableFooterBar>
        }
      >
        <TableHeader>
          <TableRow>
            <TableHead><Checkbox aria-label="Select all on page" checked={sel.all} onCheckedChange={sel.toggleAll} /></TableHead>
            <TableHead sortDirection={dirOf("customer")} onSort={() => toggle("customer")}>Customer</TableHead>
            {visible("event") && <TableHead sortDirection={dirOf("event")} onSort={() => toggle("event")}>Event</TableHead>}
            {visible("tickets") && <TableHead sortDirection={dirOf("tickets")} onSort={() => toggle("tickets")}>Tickets</TableHead>}
            {visible("total") && <TableHead sortDirection={dirOf("total")} onSort={() => toggle("total")}>Total</TableHead>}
            {visible("status") && <TableHead>Status</TableHead>}
            {visible("date") && <TableHead sortDirection={dirOf("date")} onSort={() => toggle("date")}>Date</TableHead>}
            <TableHead className="w-12" hideDivider><span className="sr-only">Actions</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableEmpty colSpan={colCount}>No orders match your search.</TableEmpty>
          ) : (
            rows.map((o) => (
              <TableRow key={o.id} selected={sel.selected.has(o.id)}>
                <TableCell><Checkbox aria-label={`Select ${o.id}`} checked={sel.selected.has(o.id)} onCheckedChange={() => sel.toggle(o.id)} /></TableCell>
                <TableCell><Person name={o.customer} email={o.email} /></TableCell>
                {visible("event") && <TableCell className="whitespace-nowrap">{o.event}</TableCell>}
                {visible("tickets") && <TableCell className="tabular-nums">{o.tickets}</TableCell>}
                {visible("total") && <TableCell className="tabular-nums">{money(o.total)}</TableCell>}
                {visible("status") && <TableCell><StatusBadge s={o.status} /></TableCell>}
                {visible("date") && <TableCell className="tabular-nums text-h-muted">{o.date}</TableCell>}
                <TableCell><RowMenu label={o.id} /></TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
export const FullFeatured: Story = {
  parameters: { docs: { description: { story: "An admin orders table with everything combined: search, a status filter, sortable columns, row selection with a bulk action, a column visibility menu, row menus, an empty result and paging with results per page." } } },
  render: () => <FullDemo />,
}

/* ---------- grouped rows ---------- */
export const GroupedRows: Story = {
  parameters: { docs: { description: { story: "`TableGroupRow` is a full-width label row that groups the rows under it, here by event with a count and the group total." } } },
  render: () => {
    const groups = events.slice(0, 3).map((ev) => ({ ev, rows: orders.filter((o) => o.event === ev).slice(0, 3) }))
    return (
      <Table aria-label="Orders by event" className="min-w-[36rem]">
        <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Status</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
        <TableBody>
          {groups.map((g) => (
            <React.Fragment key={g.ev}>
              <TableGroupRow colSpan={4}>{g.ev} · {g.rows.length} orders · {money(g.rows.reduce((a, o) => a + o.total, 0))}</TableGroupRow>
              {g.rows.map((o) => (
                <TableRow key={o.id}><TableCell className="tabular-nums">{o.id}</TableCell><TableCell>{o.customer}</TableCell><TableCell><StatusBadge s={o.status} /></TableCell><TableCell className="tabular-nums">{money(o.total)}</TableCell></TableRow>
              ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    )
  },
}

/* ---------- inline editing ---------- */
function InlineEditDemo() {
  const [rows, setRows] = React.useState(orders.slice(0, 5))
  const patch = (id: string, p: Partial<Order>) => setRows((r) => r.map((o) => (o.id === id ? { ...o, ...p } : o)))
  return (
    <Table aria-label="Editable orders" className="min-w-[42rem]">
      <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Tickets</TableHead><TableHead>Status</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
      <TableBody>
        {rows.map((o) => (
          <TableRow key={o.id}>
            <TableCell>{o.customer}</TableCell>
            <TableCell>
              <div className="inline-flex items-center gap-1">
                <Button size="icon-sm" variant="tertiary" aria-label={`Fewer tickets for ${o.customer}`} disabled={o.tickets <= 1} onClick={() => patch(o.id, { tickets: o.tickets - 1, total: Math.round(o.total * (o.tickets - 1) / o.tickets) })}>−</Button>
                <span className="w-6 text-center tabular-nums">{o.tickets}</span>
                <Button size="icon-sm" variant="tertiary" aria-label={`More tickets for ${o.customer}`} onClick={() => patch(o.id, { tickets: o.tickets + 1, total: Math.round(o.total * (o.tickets + 1) / o.tickets) })}>+</Button>
              </div>
            </TableCell>
            <TableCell>
              <Select value={o.status} onValueChange={(v) => patch(o.id, { status: v as Status })}>
                <SelectTrigger size="sm" aria-label={`Status for ${o.customer}`} className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>{statusList.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}</SelectContent>
              </Select>
            </TableCell>
            <TableCell className="tabular-nums">{money(o.total)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
export const InlineEditing: Story = {
  parameters: { docs: { description: { story: "Cells can be controls: a ticket stepper that recalculates the total, and a status select. Both use the library's own components, not native elements." } } },
  render: () => <InlineEditDemo />,
}

/* ---------- faceted filters ---------- */
function FacetedDemo() {
  const [sel, setSel] = React.useState<{ status: Set<Status>; event: Set<string> }>({ status: new Set(), event: new Set() })
  const rows = orders.filter((o) => (!sel.status.size || sel.status.has(o.status)) && (!sel.event.size || sel.event.has(o.event))).slice(0, 12)
  const flip = <K extends "status" | "event">(k: K, v: string) =>
    setSel((s) => { const n = new Set(s[k] as Set<string>); n.has(v) ? n.delete(v) : n.add(v); return { ...s, [k]: n } as typeof s })
  const total = sel.status.size + sel.event.size
  const Facet = ({ label, k, options }: { label: string; k: "status" | "event"; options: readonly string[] }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button size="sm" variant="tertiary"><Funnel weight="bold" />{label}{sel[k].size ? ` · ${sel[k].size}` : ""}</Button></DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        {options.map((o) => (
          <DropdownMenuCheckboxItem key={o} checked={(sel[k] as Set<string>).has(o)} onSelect={(e) => e.preventDefault()} onCheckedChange={() => flip(k, o)}>{o}</DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
  const chips = [...[...sel.status].map((v) => ({ k: "status" as const, v })), ...[...sel.event].map((v) => ({ k: "event" as const, v }))]
  return (
    <div>
      <TableToolbar>
        <Facet label="Status" k="status" options={statusList} />
        <Facet label="Event" k="event" options={events} />
        {chips.map((c) => (
          <Badge key={c.k + c.v} variant="secondary" size="md" className="gap-1 pe-1">
            {c.v}
            <button type="button" aria-label={`Remove ${c.v}`} onClick={() => flip(c.k, c.v)} className="inline-flex size-4 cursor-pointer items-center justify-center rounded-full hover:bg-h-default-hover"><X weight="bold" className="size-3" /></button>
          </Badge>
        ))}
        {total > 0 && <Button size="sm" variant="ghost" onClick={() => setSel({ status: new Set(), event: new Set() })}>Clear all</Button>}
        <span className="ms-auto text-sm text-h-muted">{rows.length} orders</span>
      </TableToolbar>
      <Table aria-label="Filtered orders" className="min-w-[40rem]">
        <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Event</TableHead><TableHead>Status</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.length === 0 ? <TableEmpty colSpan={5}>No orders match these filters.</TableEmpty> : rows.map((o) => (
            <TableRow key={o.id}><TableCell className="tabular-nums">{o.id}</TableCell><TableCell>{o.customer}</TableCell><TableCell className="whitespace-nowrap">{o.event}</TableCell><TableCell><StatusBadge s={o.status} /></TableCell><TableCell className="tabular-nums">{money(o.total)}</TableCell></TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
export const FacetedFilters: Story = {
  parameters: { docs: { description: { story: "Multi-select filters from dropdown menus with checkbox items. Active filters appear as removable chips with a Clear all." } } },
  render: () => <FacetedDemo />,
}

/* ---------- clickable rows + detail sheet ---------- */
function RowDetailsDemo() {
  const [open, setOpen] = React.useState<Order | null>(null)
  return (
    <>
      <Table aria-label="Orders, select one to open it" className="min-w-[40rem]">
        <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Status</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
        <TableBody>
          {orders.slice(0, 6).map((o) => (
            <TableRow key={o.id} interactive onClick={() => setOpen(o)} selected={open?.id === o.id}>
              <TableCell className="font-medium tabular-nums">{o.id}</TableCell>
              <TableCell>{o.customer}</TableCell>
              <TableCell><StatusBadge s={o.status} /></TableCell>
              <TableCell className="tabular-nums">{money(o.total)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{open?.id}</SheetTitle>
            <SheetDescription>{open?.customer} · {open?.email}</SheetDescription>
          </SheetHeader>
          {open && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 px-4 text-sm">
              <dt className="text-h-muted">Event</dt><dd>{open.event}</dd>
              <dt className="text-h-muted">Tickets</dt><dd className="tabular-nums">{open.tickets}</dd>
              <dt className="text-h-muted">Total</dt><dd className="tabular-nums">{money(open.total)}</dd>
              <dt className="text-h-muted">Status</dt><dd><StatusBadge s={open.status} /></dd>
              <dt className="text-h-muted">Date</dt><dd className="tabular-nums">{open.date}</dd>
            </dl>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
export const ClickableRows: Story = {
  parameters: { docs: { description: { story: "An `interactive` row is one button: pointer cursor, focusable, Enter or Space opens it, and the arrow keys move between rows. Here a row opens its order in a side sheet." } } },
  render: () => <RowDetailsDemo />,
}

/* ---------- inline detail row ---------- */
function DetailRowDemo() {
  const [open, setOpen] = React.useState<string | null>("ORD-48217")
  return (
    <Table aria-label="Orders with inline details" className="min-w-[38rem] table-fixed">
      <colgroup><col className="w-12" /><col className="w-[30%]" /><col className="w-[40%]" /><col /></colgroup>
      <TableHeader><TableRow><TableHead className="w-10"><span className="sr-only">Expand</span></TableHead><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
      <TableBody>
        {orders.slice(0, 4).map((o) => (
          <React.Fragment key={o.id}>
            <TableRow>
              <TableCell><TableExpandButton expanded={open === o.id} onToggle={() => setOpen(open === o.id ? null : o.id)} /></TableCell>
              <TableCell className="font-medium tabular-nums">{o.id}</TableCell>
              <TableCell>{o.customer}</TableCell>
              <TableCell className="tabular-nums">{money(o.total)}</TableCell>
            </TableRow>
            {open === o.id && (
              <TableRow>
                <TableCell />
                <TableCell className="align-top text-h-muted"><div className="text-xs">Event</div><div className="text-h-foreground">{o.event}</div></TableCell>
                <TableCell className="align-top text-h-muted"><div className="text-xs">Email</div><div className="text-h-foreground">{o.email}</div></TableCell>
                <TableCell className="align-top text-h-muted"><div className="mb-0.5 text-xs">Status</div><StatusBadge s={o.status} /></TableCell>
              </TableRow>
            )}
          </React.Fragment>
        ))}
      </TableBody>
    </Table>
  )
}
export const InlineDetails: Story = {
  parameters: { docs: { description: { story: "A row that opens a detail row under itself, for details that do not deserve a separate page. The details sit in the same columns as the row above (Event under Order, Email under Customer, Status under Total) so everything lines up." } } },
  render: () => <DetailRowDemo />,
}

/* ---------- floating bulk bar ---------- */
function FloatingBarDemo() {
  const rows = orders.slice(0, 8)
  const sel = useSelection(rows.map((r) => r.id))
  return (
    <div className="relative pb-20">
      <Table aria-label="Orders with floating bulk bar" className="min-w-[36rem]">
        <TableHeader><TableRow><TableHead><Checkbox aria-label="Select all" checked={sel.all} onCheckedChange={sel.toggleAll} /></TableHead><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.map((o) => (
            <TableRow key={o.id} selected={sel.selected.has(o.id)}>
              <TableCell><Checkbox aria-label={`Select ${o.id}`} checked={sel.selected.has(o.id)} onCheckedChange={() => sel.toggle(o.id)} /></TableCell>
              <TableCell className="tabular-nums">{o.id}</TableCell><TableCell>{o.customer}</TableCell><TableCell className="tabular-nums">{money(o.total)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {sel.selected.size > 0 && (
        <div role="region" aria-label="Bulk actions" className="sticky bottom-4 mx-auto mt-4 flex w-fit items-center gap-2 rounded-full bg-h-overlay p-2 ps-5 shadow-h-overlay">
          <span className="pe-2 text-sm font-medium tabular-nums">{sel.selected.size} selected</span>
          <Button size="sm" variant="tertiary"><Export weight="bold" />Export</Button>
          <Button size="sm" variant="danger-soft"><Trash weight="bold" />Refund</Button>
          <Button size="icon-sm" variant="ghost" aria-label="Clear selection" onClick={sel.clear}><X weight="bold" /></Button>
        </div>
      )}
    </div>
  )
}
export const FloatingBulkBar: Story = {
  parameters: { docs: { description: { story: "Selecting rows raises a bar at the bottom of the view with the bulk actions, instead of a toolbar above the table. Useful when the table is long." } } },
  render: () => <FloatingBarDemo />,
}

/* ---------- sticky actions column ---------- */
export const StickyActionsColumn: Story = {
  parameters: { docs: { description: { story: "Row actions pinned to the right edge while the other columns scroll sideways." } } },
  render: () => (
    <Table aria-label="Wide orders with pinned actions" className="min-w-[60rem]">
      <TableHeader>
        <TableRow>
          {["Order", "Customer", "Email", "Event", "Tickets", "Total", "Date"].map((h) => <TableHead key={h}>{h}</TableHead>)}
          <TableHead className="sticky right-0 z-10 w-12" hideDivider><span className="sr-only">Actions</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.slice(0, 6).map((o) => (
          <TableRow key={o.id}>
            <TableCell className="tabular-nums">{o.id}</TableCell><TableCell>{o.customer}</TableCell><TableCell className="text-h-muted">{o.email}</TableCell>
            <TableCell className="whitespace-nowrap">{o.event}</TableCell><TableCell className="tabular-nums">{o.tickets}</TableCell><TableCell className="tabular-nums">{money(o.total)}</TableCell><TableCell className="tabular-nums text-h-muted">{o.date}</TableCell>
            <TableCell className="sticky right-0 z-10 bg-(--table-cell-bg) [@media(hover:hover)]:group-hover/row:bg-(--table-cell-bg)!"><RowMenu label={o.id} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
}

/* ---------- virtualized ---------- */
const ROW_H = 48
const bigRows = Array.from({ length: 10000 }, (_, i) => ({ ...orders[i % orders.length], id: `ORD-${60000 + i}` }))
function VirtualDemo() {
  const [top, setTop] = React.useState(0)
  const viewH = 320
  const start = Math.max(0, Math.floor(top / ROW_H) - 4)
  const end = Math.min(bigRows.length, Math.ceil((top + viewH) / ROW_H) + 4)
  return (
    <div>
      <TableToolbar><span className="text-sm text-h-muted">{bigRows.length.toLocaleString()} orders, {end - start} rendered</span></TableToolbar>
      <Table
        aria-label="Ten thousand orders"
        aria-rowcount={bigRows.length}
        className="min-w-[36rem]"
        scrollClassName="overflow-y-auto"
        scrollProps={{ style: { maxHeight: viewH }, onScroll: (e) => setTop(e.currentTarget.scrollTop) }}
      >
        <TableHeader><TableRow><TableHead className="sticky top-0 z-10">Order</TableHead><TableHead className="sticky top-0 z-10">Customer</TableHead><TableHead className="sticky top-0 z-10">Event</TableHead><TableHead className="sticky top-0 z-10">Total</TableHead></TableRow></TableHeader>
        <TableBody>
          {start > 0 && <tr aria-hidden style={{ height: start * ROW_H }}><td colSpan={4} className="p-0" /></tr>}
          {bigRows.slice(start, end).map((o, i) => (
            <TableRow key={o.id} aria-rowindex={start + i + 2} className="[&>td]:box-border [&>td]:h-12 [&>td]:py-0">
              <TableCell className="tabular-nums">{o.id}</TableCell><TableCell>{o.customer}</TableCell><TableCell className="whitespace-nowrap">{o.event}</TableCell><TableCell className="tabular-nums">{money(o.total)}</TableCell>
            </TableRow>
          ))}
          {end < bigRows.length && <tr aria-hidden style={{ height: (bigRows.length - end) * ROW_H }}><td colSpan={4} className="p-0" /></tr>}
        </TableBody>
      </Table>
    </div>
  )
}
export const Virtualized: Story = {
  parameters: { docs: { description: { story: "Ten thousand rows with only the visible ones in the page. Fixed 48px rows, spacer rows above and below keep the scrollbar honest, and the header stays pinned." } } },
  render: () => <VirtualDemo />,
}
