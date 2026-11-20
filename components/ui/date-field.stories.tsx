import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import type { DateRange } from "react-day-picker"
import { DateField, DateRangeField, TimeField } from "./date-field"
import { Label } from "./label"

const meta = {
  title: "Select & pickers/Date field",
  id: "molecules-date-field",
  component: DateField,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "Date, date range and time fields for event dates, on-sale windows and doors-open times. The date fields show the formatted date with a calendar button; clicking opens the calendar in a popover. The time field uses the native time input with a clock icon." }, story: { inline: false, iframeHeight: 460 } } },
} satisfies Meta<typeof DateField>
export default meta
type Story = StoryObj<typeof meta>

export const Single: Story = {
  parameters: { docs: { description: { story: "Type a date or pick it. Reads 6/14, 6/14/26, Jun 14 2026, 14 Jun, 2026-06-14, today and tomorrow. Enter or leaving the field commits; unreadable text shows an error; ArrowDown opens the calendar." } } },
  render: () => (
    <div className="flex w-72 flex-col gap-1"><Label htmlFor="d1">Event date</Label><DateField id="d1" defaultValue={new Date(2026, 5, 14)} /></div>
  ),
}
export const WithLimits: Story = {
  parameters: { docs: { description: { story: "min and max grey out days and explain a typed date that is out of range." } } },
  render: () => (
    <div className="flex w-72 flex-col gap-1"><Label htmlFor="d3">Doors open date</Label><DateField id="d3" min={new Date(2026, 5, 10)} max={new Date(2026, 5, 30)} defaultValue={new Date(2026, 5, 14)} /></div>
  ),
}
export const Empty: Story = {
  render: () => <div className="w-72"><DateField aria-label="Event date" /></div>,
}
export const Range: Story = {
  render: () => {
    const [r, setR] = React.useState<DateRange | undefined>({ from: new Date(2026, 5, 12), to: new Date(2026, 5, 15) })
    return <div className="flex w-80 flex-col gap-1"><Label htmlFor="d2">On sale</Label><DateRangeField id="d2" value={r} onValueChange={setR} /></div>
  },
}
export const Time: Story = {
  parameters: { docs: { story: { inline: true }, description: { story: "US 12-hour time entered in segments: hours, then minutes, then AM or PM. Only digits (and a or p) are accepted, so nothing can be invalid. Arrows step a segment, a and p set AM and PM. The value is a plain HH:MM 24-hour string." } } },
  render: () => <div className="flex w-56 flex-col gap-1"><Label htmlFor="t1">Doors open</Label><TimeField id="t1" defaultValue="18:30" presets={["17:30", "18:00", "18:30", "19:00"]} /></div>,
}
export const Variants: Story = {
  parameters: { docs: { story: { inline: true } } },
  render: () => (
    <div className="grid w-72 gap-3">
      <TimeField aria-label="primary" defaultValue="18:30" />
      <TimeField aria-label="tertiary" variant="tertiary" defaultValue="18:30" />
      <TimeField aria-label="underlined" variant="underlined" defaultValue="18:30" />
    </div>
  ),
}
