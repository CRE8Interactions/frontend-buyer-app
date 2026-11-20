import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { CaretUpDown, Ticket } from "@phosphor-icons/react"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "./select"
import { Avatar, AvatarFallback } from "./avatar"
import { Button } from "./button"
import { CloseButton } from "./close-button"
import { Label } from "./label"
import { Surface } from "./surface"

const meta = { title: "Select & pickers/Select", id: "molecules-select", component: Select, tags: ["autodocs"], parameters: { docs: { description: { component: "Radix select. The list is the dropdown popover: overlay fill, 22px corners, overlay shadow, 6px padding, 2px between rows. Options use the dropdown menu row: at least 36px tall, a highlight with 16px corners in the default fill, press scales to 98%. The check sits at the end of the chosen row." } } } } satisfies Meta<typeof Select>
export default meta
type Story = StoryObj<typeof meta>

const types = [["adult", "Adult"], ["youth", "Youth"], ["senior", "Senior"], ["student", "Student"], ["child", "Child"]] as const
const items = types.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)
const field = "flex w-64 flex-col gap-1.5"

export const Default: Story = {
  render: () => (
    <div className={field}>
      <Label>Ticket type</Label>
      <Select defaultValue="adult">
        <SelectTrigger className="w-full"><SelectValue placeholder="Ticket type" /></SelectTrigger>
        <SelectContent><SelectGroup><SelectLabel>Ticket type</SelectLabel>{items}</SelectGroup></SelectContent>
      </Select>
    </div>
  ),
}
export const Placeholder: Story = {
  render: () => (
    <div className={field}>
      <Label>Ticket type</Label>
      <Select><SelectTrigger className="w-full"><SelectValue placeholder="Select one" /></SelectTrigger><SelectContent>{items}</SelectContent></Select>
    </div>
  ),
}
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(["sm", "md", "lg"] as const).map((s) => (
        <Select key={s}><SelectTrigger size={s} className="w-56"><SelectValue placeholder={`Size ${s}`} /></SelectTrigger><SelectContent>{items}</SelectContent></Select>
      ))}
    </div>
  ),
}
export const Small: Story = {
  render: () => (
    <Select><SelectTrigger size="sm" className="w-48"><SelectValue placeholder="Section" /></SelectTrigger>
      <SelectContent><SelectItem value="a">Lower bowl</SelectItem><SelectItem value="b">Club level</SelectItem></SelectContent>
    </Select>
  ),
}
export const Variants: Story = {
  parameters: { docs: { description: { story: "Primary has the soft field outline. Secondary drops the outline and uses the secondary fill, for use on a surface." } } },
  render: () => (
    <div className="flex flex-col gap-6">
      <Select><SelectTrigger variant="primary" className="w-56"><SelectValue placeholder="Primary" /></SelectTrigger><SelectContent>{items}</SelectContent></Select>
      <Surface className="p-4"><Select><SelectTrigger variant="secondary" className="w-56"><SelectValue placeholder="Secondary" /></SelectTrigger><SelectContent>{items}</SelectContent></Select></Surface>
    </div>
  ),
}
export const FullWidth: Story = {
  render: () => (
    <div className="w-[420px]"><Select><SelectTrigger className="w-full"><SelectValue placeholder="Select a section" /></SelectTrigger><SelectContent>{items}</SelectContent></Select></div>
  ),
}
export const WithDescription: Story = {
  render: () => (
    <div className={field}>
      <Label>Ticket type</Label>
      <Select><SelectTrigger className="w-full"><SelectValue placeholder="Select one" /></SelectTrigger><SelectContent>{items}</SelectContent></Select>
      <p className="text-sm text-h-muted">Youth and senior tickets need ID at the door.</p>
    </div>
  ),
}
export const Required: Story = {
  render: () => (
    <form className="flex w-64 flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
      <div className="flex flex-col gap-1.5">
        <Label isRequired>Ticket type</Label>
        <Select name="type" required><SelectTrigger className="w-full"><SelectValue placeholder="Select one" /></SelectTrigger><SelectContent>{items}</SelectContent></Select>
      </div>
      <Button type="submit">Continue</Button>
    </form>
  ),
}
export const Invalid: Story = {
  render: () => (
    <div className={field}>
      <Label>Ticket type</Label>
      <Select><SelectTrigger aria-invalid className="w-full"><SelectValue placeholder="Select one" /></SelectTrigger><SelectContent>{items}</SelectContent></Select>
      <p className="text-sm text-h-danger">Choose a ticket type.</p>
    </div>
  ),
}
export const Disabled: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Select disabled><SelectTrigger className="w-56"><SelectValue placeholder="Disabled" /></SelectTrigger><SelectContent>{items}</SelectContent></Select>
      <Select disabled defaultValue="adult"><SelectTrigger className="w-56"><SelectValue /></SelectTrigger><SelectContent>{items}</SelectContent></Select>
    </div>
  ),
}
export const WithDisabledOptions: Story = {
  render: () => (
    <Select><SelectTrigger className="w-56"><SelectValue placeholder="Select one" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="adult">Adult</SelectItem><SelectItem value="youth" disabled>Youth (sold out)</SelectItem>
        <SelectItem value="senior">Senior</SelectItem><SelectItem value="student" disabled>Student (sold out)</SelectItem>
      </SelectContent>
    </Select>
  ),
}
export const WithSections: Story = {
  render: () => (
    <Select><SelectTrigger className="w-64"><SelectValue placeholder="Select a seat" /></SelectTrigger>
      <SelectContent>
        <SelectGroup><SelectLabel>Floor</SelectLabel><SelectItem value="f1">Standing</SelectItem><SelectItem value="f2">Pit</SelectItem></SelectGroup>
        <SelectSeparator />
        <SelectGroup><SelectLabel>Seated</SelectLabel><SelectItem value="s1">Lower bowl</SelectItem><SelectItem value="s2">Club level</SelectItem><SelectItem value="s3">Balcony</SelectItem></SelectGroup>
      </SelectContent>
    </Select>
  ),
}
function ControlledDemo() {
  const [v, setV] = React.useState("youth")
  return (
    <div className="flex flex-col gap-3">
      <Select value={v} onValueChange={setV}><SelectTrigger className="w-56"><SelectValue placeholder="Select one" /></SelectTrigger><SelectContent>{items}</SelectContent></Select>
      <p className="text-sm text-h-muted">Selected: <span className="font-medium text-h-foreground">{v}</span></p>
    </div>
  )
}
export const Controlled: Story = { render: () => <ControlledDemo /> }
function OpenStateDemo() {
  const [open, setOpen] = React.useState(false)
  return (
    <div className="flex items-center gap-3">
      <Select open={open} onOpenChange={setOpen}><SelectTrigger className="w-56"><SelectValue placeholder="Select one" /></SelectTrigger><SelectContent>{items}</SelectContent></Select>
      <Button variant="tertiary" onClick={() => setOpen((o) => !o)}>{open ? "Close" : "Open"} list</Button>
    </div>
  )
}
export const ControlledOpenState: Story = { render: () => <OpenStateDemo /> }
function ClearDemo() {
  const [v, setV] = React.useState("adult")
  return (
    <div className="flex items-center gap-2">
      <Select value={v} onValueChange={setV}><SelectTrigger className="w-56"><SelectValue placeholder="Select one" /></SelectTrigger><SelectContent>{items}</SelectContent></Select>
      {v ? <CloseButton aria-label="Clear selection" onClick={() => setV("")} /> : null}
    </div>
  )
}
export const WithClearButton: Story = {
  parameters: { docs: { description: { story: "A clear control beside the trigger resets the value to the placeholder." } } },
  render: () => <ClearDemo />,
}
export const CustomIndicator: Story = {
  render: () => (
    <Select><SelectTrigger className="w-56 [&>svg:last-child]:hidden"><SelectValue placeholder="Select one" /><CaretUpDown className="size-4 opacity-50" weight="bold" /></SelectTrigger><SelectContent>{items}</SelectContent></Select>
  ),
}
const people = [["mia", "Mia Santos", "MS", "accent"], ["jo", "Jo Okafor", "JO", "success"], ["tr", "Tran Lee", "TL", "warning"]] as const
export const CustomValue: Story = {
  render: () => (
    <Select defaultValue="mia">
      <SelectTrigger className="w-64"><SelectValue placeholder="Assign to" /></SelectTrigger>
      <SelectContent>
        {people.map(([v, name, i, c]) => (
          <SelectItem key={v} value={v}><Avatar size="sm" variant="soft" className="size-6"><AvatarFallback color={c} className="text-[10px]">{i}</AvatarFallback></Avatar>{name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  ),
}
export const WithIcons: Story = {
  render: () => (
    <Select defaultValue="adult"><SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
      <SelectContent>{types.map(([v, l]) => <SelectItem key={v} value={v}><Ticket weight="bold" />{l}</SelectItem>)}</SelectContent>
    </Select>
  ),
}
export const InSurface: Story = {
  render: () => (
    <Surface className="flex w-80 flex-col gap-4 p-5">
      <div className="flex flex-col gap-1.5"><Label isRequired>Ticket type</Label>
        <Select name="type" required><SelectTrigger variant="secondary" className="w-full"><SelectValue placeholder="Select one" /></SelectTrigger><SelectContent>{items}</SelectContent></Select>
      </div>
      <div className="flex flex-col gap-1.5"><Label>Section</Label>
        <Select><SelectTrigger variant="secondary" className="w-full"><SelectValue placeholder="Select one" /></SelectTrigger><SelectContent><SelectItem value="a">Lower bowl</SelectItem><SelectItem value="b">Club level</SelectItem></SelectContent></Select>
      </div>
    </Surface>
  ),
}
