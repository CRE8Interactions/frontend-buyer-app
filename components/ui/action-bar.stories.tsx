import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Archive, Export, PencilSimple, Trash, X } from "@phosphor-icons/react"
import { ActionBar } from "./action-bar"
import { Badge } from "./badge"
import { Button } from "./button"
import { Checkbox } from "./checkbox"
import { ToolbarItem } from "./toolbar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table"
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip"

const meta = {
  title: "Navigation & menus/Action bar",
  id: "molecules-action-bar",
  component: ActionBar,
  tags: ["autodocs", "new"],
  args: { isOpen: true, children: null },
  parameters: { docs: { story: { inline: false, iframeHeight: 360 }, description: { component: "A floating toolbar for contextual actions: bulk selection, editing controls, or any set of actions that appear in response to what the user does. It is the Toolbar on a surface pill that slides up and fades in when `isOpen` is true. Three optional sections, Prefix (a count or label), Content (the actions) and Suffix (a dismiss button), with `ActionBar.Separator` between them. Arrow keys move between its buttons. Use ghost buttons for ordinary actions, the soft danger button for destructive ones such as Delete, and the primary button for the one very important command. It is fixed to the bottom centre of the viewport by default; `position=\"absolute\"` floats it at the bottom of a positioned container, as the stories do. `ActionBar.Label` collapses to screen-reader-only text below 640px so buttons become icons on a phone." } } },
} satisfies Meta<typeof ActionBar>
export default meta
type Story = StoryObj<typeof meta>

const files = ["Project proposal.pdf", "Venue map.png", "Seating plan.xlsx", "Press kit.zip"]

function Actions({ count, onClear }: { count: number; onClear: () => void }) {
  return (
    <>
      <ActionBar.Prefix><Badge size="sm" variant="secondary">{count}</Badge><ActionBar.Label>selected</ActionBar.Label></ActionBar.Prefix>
      <ActionBar.Separator />
      <ActionBar.Content>
        <ToolbarItem asChild><Button size="sm" variant="ghost" aria-label="Edit"><PencilSimple weight="bold" /><ActionBar.Label>Edit</ActionBar.Label></Button></ToolbarItem>
        <ToolbarItem asChild><Button size="sm" variant="ghost" aria-label="Export"><Export weight="bold" /><ActionBar.Label>Export</ActionBar.Label></Button></ToolbarItem>
        <ToolbarItem asChild><Button size="sm" variant="ghost" aria-label="Archive"><Archive weight="bold" /><ActionBar.Label>Archive</ActionBar.Label></Button></ToolbarItem>
        <ToolbarItem asChild><Button size="sm" variant="danger-soft" aria-label="Delete"><Trash weight="bold" /><ActionBar.Label>Delete</ActionBar.Label></Button></ToolbarItem>
      </ActionBar.Content>
      <ActionBar.Separator />
      <ActionBar.Suffix>
        <Tooltip>
          <TooltipTrigger asChild>
            <ToolbarItem asChild><Button size="icon-sm" variant="ghost" aria-label="Clear selection" onClick={onClear}><X weight="bold" /></Button></ToolbarItem>
          </TooltipTrigger>
          <TooltipContent>Clear selection</TooltipContent>
        </Tooltip>
      </ActionBar.Suffix>
    </>
  )
}

export const Basic: Story = {
  parameters: { docs: { description: { story: "Select files and the bar appears; clear the selection and it leaves." } } },
  render: () => {
    const [selected, setSelected] = React.useState<string[]>(["Venue map.png"])
    const toggle = (name: string) => setSelected((s) => (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]))
    return (
      <div className="relative h-72 w-full max-w-xl overflow-hidden rounded-[24px] bg-h-surface-secondary p-4">
        <ul className="grid gap-1">
          {files.map((name) => (
            <li key={name} className="flex items-center gap-3 rounded-[12px] px-3 py-2 text-sm text-h-foreground hover:bg-h-default/60">
              <Checkbox aria-label={`Select ${name}`} checked={selected.includes(name)} onCheckedChange={() => toggle(name)} />
              {name}
            </li>
          ))}
        </ul>
        <ActionBar isOpen={selected.length > 0} position="absolute" aria-label="File actions">
          <Actions count={selected.length} onClear={() => setSelected([])} />
        </ActionBar>
      </div>
    )
  },
}

export const WithDataGrid: Story = {
  parameters: { docs: { description: { story: "Pair it with a table for bulk selection: the bar appears when rows are selected and offers contextual actions." } } },
  render: () => {
    const rows = [
      { id: "1", name: "Harbour Lights Festival", venue: "Riverside Arena", sold: 4820 },
      { id: "2", name: "Riverside Jazz Night", venue: "Old Town Theatre", sold: 3640 },
      { id: "3", name: "Summer Sessions Live", venue: "Park Stage", sold: 2150 },
    ]
    const [selected, setSelected] = React.useState<string[]>(["2"])
    const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
    return (
      <div className="relative h-80 w-full max-w-2xl overflow-hidden pb-20">
        <Table aria-label="Events">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"><span className="sr-only">Select</span></TableHead>
              <TableHead>Event</TableHead><TableHead>Venue</TableHead><TableHead>Sold</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} selected={selected.includes(row.id)}>
                <TableCell><Checkbox aria-label={`Select ${row.name}`} checked={selected.includes(row.id)} onCheckedChange={() => toggle(row.id)} /></TableCell>
                <TableCell>{row.name}</TableCell><TableCell>{row.venue}</TableCell><TableCell>{row.sold.toLocaleString("en-US")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <ActionBar isOpen={selected.length > 0} position="absolute" aria-label="Event actions">
          <Actions count={selected.length} onClear={() => setSelected([])} />
        </ActionBar>
      </div>
    )
  },
}

export const Controlled: Story = {
  parameters: { docs: { description: { story: "`isOpen` is yours: a button opens and closes it, and the bar animates in and out." } } },
  render: () => {
    const [open, setOpen] = React.useState(true)
    return (
      <div className="relative h-56 w-full max-w-xl overflow-hidden rounded-[24px] bg-h-surface-secondary p-4">
        <Button size="sm" variant="tertiary" onClick={() => setOpen((o) => !o)}>{open ? "Hide" : "Show"} action bar</Button>
        <ActionBar isOpen={open} position="absolute">
          <ActionBar.Content>
            <ToolbarItem asChild><Button size="sm" variant="ghost">Save draft</Button></ToolbarItem>
            <ToolbarItem asChild><Button size="sm">Publish</Button></ToolbarItem>
          </ActionBar.Content>
        </ActionBar>
      </div>
    )
  },
}

export const Vertical: Story = {
  parameters: { docs: { description: { story: "`orientation=\"vertical\"` stacks the sections, for a bar that sits at a screen edge." } } },
  render: () => (
    <div className="relative h-64 w-full max-w-xl overflow-hidden rounded-[24px] bg-h-surface-secondary">
      <ActionBar isOpen position="absolute" orientation="vertical" className="!w-fit">
        <ActionBar.Content className="flex-col">
          <ToolbarItem asChild><Button size="icon-sm" variant="ghost" aria-label="Edit"><PencilSimple weight="bold" /></Button></ToolbarItem>
          <ToolbarItem asChild><Button size="icon-sm" variant="ghost" aria-label="Export"><Export weight="bold" /></Button></ToolbarItem>
          <ToolbarItem asChild><Button size="icon-sm" variant="danger-soft" aria-label="Delete"><Trash weight="bold" /></Button></ToolbarItem>
        </ActionBar.Content>
      </ActionBar>
    </div>
  ),
}
