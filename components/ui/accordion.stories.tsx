import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion"

const meta = {
  title: "Layout & foundations/Accordion",
  id: "molecules-accordion",
  component: Accordion,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "Stacked disclosure rows for FAQs and policy details. Single mode keeps one row open, multiple lets fans compare. An open row (trigger and panel together) sits on a rounded box with the same fill as a hovered row, so what you opened is clearly set apart from the rows around it. Two looks: default (rows on the page with a separator) and surface (one rounded group on the surface fill)." } } },
} satisfies Meta<typeof Accordion>
export default meta
type Story = StoryObj<typeof meta>

const faqs = [
  { id: "refunds", q: "Can I get a refund if the event is postponed?", a: "Yes. Tickets stay valid for the new date, or you can request a full refund within 30 days of the announcement." },
  { id: "transfer", q: "How do I transfer tickets to a friend?", a: "Open the ticket in your wallet, tap Transfer and enter their email. They get the seat instantly." },
  { id: "resale", q: "Is resale allowed?", a: "Resale is capped at face value plus fees on the official marketplace only." },
]
const makeItems = () => faqs.map((f) => (
  <AccordionItem key={f.id} value={f.id}>
    <AccordionTrigger>{f.q}</AccordionTrigger>
    <AccordionContent>{f.a}</AccordionContent>
  </AccordionItem>
))

const items = makeItems()

export const Single: Story = {
  args: { type: "single", collapsible: true, defaultValue: "refunds" },
  render: (args) => <Accordion {...args} className="max-w-xl">{items}</Accordion>,
}
export const Multiple: Story = {
  args: { type: "multiple", defaultValue: ["refunds", "transfer"] },
  render: (args) => <Accordion {...args} className="max-w-xl">{items}</Accordion>,
}
export const WithDisabledItem: Story = {
  args: { type: "single", collapsible: true },
  render: () => (
    <Accordion type="single" collapsible className="max-w-xl">
      {items.slice(0, 2)}
      <AccordionItem value="vip" disabled>
        <AccordionTrigger>VIP lounge access (sold out)</AccordionTrigger>
        <AccordionContent>Not available.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}
export const Surface: Story = {
  args: { type: "single", collapsible: true, defaultValue: "refunds" },
  render: (args) => <Accordion {...args} variant="surface" className="max-w-xl">{items}</Accordion>,
}
/* inside a card or tinted panel: the open item uses the same wash as a hovered row, in light and dark */
export const InACard: Story = {
  args: { type: "single", collapsible: true, defaultValue: "refunds" },
  render: (args) => (
    <div className="max-w-xl rounded-[28px] bg-card p-2">
      <Accordion {...args} variant="card">{items}</Accordion>
    </div>
  ),
}
export const HiddenSeparator: Story = {
  args: { type: "single", collapsible: true },
  render: () => (
    <Accordion type="single" collapsible className="max-w-xl">
      <AccordionItem value="a" hideSeparator>
        <AccordionTrigger>No line under this row</AccordionTrigger>
        <AccordionContent>The separator can be hidden per row.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="b">
        <AccordionTrigger>Second row</AccordionTrigger>
        <AccordionContent>Content.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}
