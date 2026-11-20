import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import type { DateRange } from "react-day-picker"
import { CalendarBlank } from "@phosphor-icons/react"
import { Button } from "./button"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

const meta = {
  title: "Select & pickers/Calendar",
  id: "molecules-calendar",
  component: Calendar,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "Day picker for event dates and sales windows, built on react-day-picker." } } },
} satisfies Meta<typeof Calendar>
export default meta
type Story = StoryObj<typeof meta>

const june = new Date(2026, 5, 1)

export const Single: Story = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>(new Date(2026, 5, 14))
    return <Calendar mode="single" defaultMonth={june} selected={date} onSelect={setDate} className="rounded-3xl" />
  },
}
export const Range: Story = {
  render: () => {
    const [range, setRange] = React.useState<DateRange | undefined>({ from: new Date(2026, 5, 12), to: new Date(2026, 5, 15) })
    return <Calendar mode="range" defaultMonth={june} selected={range} onSelect={setRange} className="rounded-3xl" />
  },
}
export const TwoMonths: Story = {
  render: () => <Calendar mode="range" numberOfMonths={2} defaultMonth={june} selected={{ from: new Date(2026, 5, 20), to: new Date(2026, 6, 4) }} className="rounded-3xl" />,
}
export const DisabledPastDates: Story = {
  parameters: { docs: { description: { story: "Sale start cannot be in the past. Dates before 10 June are disabled." } } },
  render: () => <Calendar mode="single" defaultMonth={june} disabled={{ before: new Date(2026, 5, 10) }} selected={new Date(2026, 5, 18)} className="rounded-3xl" />,
}
export const DropdownCaption: Story = {
  render: () => <Calendar mode="single" captionLayout="dropdown" defaultMonth={june} startMonth={new Date(2025, 0)} endMonth={new Date(2027, 11)} className="rounded-3xl" />,
}
export const InPopover: Story = {
  parameters: { docs: { story: { inline: false, iframeHeight: 460 } } },
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>(new Date(2026, 5, 14))
    return (
      <Popover defaultOpen>
        <PopoverTrigger asChild>
          <Button variant="outline"><CalendarBlank weight="bold" /> {date ? date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Event date"}</Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" defaultMonth={june} selected={date} onSelect={setDate} /></PopoverContent>
      </Popover>
    )
  },
}
