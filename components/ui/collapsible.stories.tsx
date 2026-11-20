import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { CaretDown } from "@phosphor-icons/react"
import { Button } from "./button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible"

const meta = {
  title: "Layout & foundations/Collapsible",
  id: "molecules-collapsible",
  component: Collapsible,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "Single show/hide region with an external trigger. Use accordion when several rows belong together." } } },
} satisfies Meta<typeof Collapsible>
export default meta
type Story = StoryObj<typeof meta>

const rows = ["Section 112, Row F, Seat 14", "Section 112, Row F, Seat 15", "Section 112, Row F, Seat 16"]

export const Default: Story = {
  render: () => {
    const [open, setOpen] = React.useState(false)
    return (
      <Collapsible open={open} onOpenChange={setOpen} className="w-80 space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-semibold">3 seats selected</p>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">{open ? "Hide" : "Show"} seats <CaretDown weight="bold" className={open ? "rotate-180" : ""} /></Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="space-y-2">
          {rows.map((r) => <div key={r} className="rounded-xl bg-secondary px-4 py-2 text-sm">{r}</div>)}
        </CollapsibleContent>
      </Collapsible>
    )
  },
}
export const DefaultOpen: Story = {
  render: () => (
    <Collapsible defaultOpen className="w-80 space-y-2">
      <CollapsibleTrigger asChild><Button variant="outline" size="sm">Fees breakdown</Button></CollapsibleTrigger>
      <CollapsibleContent className="rounded-xl bg-secondary p-4 text-sm">Tickets $136.00, service fee $12.40, total $148.40.</CollapsibleContent>
    </Collapsible>
  ),
}
export const Disabled: Story = {
  render: () => (
    <Collapsible disabled className="w-80 space-y-2">
      <CollapsibleTrigger asChild><Button variant="outline" size="sm" disabled>Presale details</Button></CollapsibleTrigger>
      <CollapsibleContent>Presale has ended.</CollapsibleContent>
    </Collapsible>
  ),
}
