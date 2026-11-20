import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { CaretRight, Ticket, Wallet } from "@phosphor-icons/react"
import { Button } from "./button"
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from "./item"

const meta = {
  title: "Display & content/Item",
  id: "molecules-item",
  component: Item,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["default", "outline", "muted"] },
    size: { control: "select", options: ["default", "sm"] },
  },
  args: { variant: "outline" },
  parameters: { docs: { description: { component: "Flexible row for a title, description, media and actions. For a plain list of facts or choices (label and value) use the Grouped list instead; the same fill holds Items when rows need media." } } },
} satisfies Meta<typeof Item>
export default meta
type Story = StoryObj<typeof meta>

const row = (
  <>
    <ItemMedia variant="icon"><Ticket weight="bold" /></ItemMedia>
    <ItemContent>
      <ItemTitle>Arctic Monkeys, Section 104</ItemTitle>
      <ItemDescription>Row F, seats 12-13 · Sat 21 June, 20:00</ItemDescription>
    </ItemContent>
    <ItemActions><Button size="sm" variant="outline">View</Button></ItemActions>
  </>
)

export const Playground: Story = { render: (args) => <div className="max-w-xl"><Item {...args}>{row}</Item></div> }
export const Variants: Story = {
  render: () => (
    <div className="flex max-w-xl flex-col gap-4">
      {(["default", "outline", "muted"] as const).map((v) => <Item key={v} variant={v}>{row}</Item>)}
    </div>
  ),
}
export const Sizes: Story = {
  render: () => (
    <div className="flex max-w-xl flex-col gap-4">
      {(["default", "sm"] as const).map((s) => <Item key={s} size={s} variant="outline">{row}</Item>)}
    </div>
  ),
}
export const AsLink: Story = {
  render: () => (
    <div className="max-w-xl">
      <Item asChild variant="outline">
        <a href="#payout">
          <ItemMedia variant="icon"><Wallet weight="bold" /></ItemMedia>
          <ItemContent><ItemTitle>Payout settings</ItemTitle><ItemDescription>Next payout of $4,280.00 on 1 July</ItemDescription></ItemContent>
          <CaretRight weight="bold" className="size-4" />
        </a>
      </Item>
    </div>
  ),
}
export const Group: Story = {
  render: () => (
    <ItemGroup className="max-w-xl">
      {["Tickets x2 · $178.00", "Service fee · $12.40", "Parking pass · $20.00"].map((t, i) => (
        <div key={t}>
          {i > 0 && <ItemSeparator />}
          <Item><ItemContent><ItemTitle>{t}</ItemTitle></ItemContent></Item>
        </div>
      ))}
    </ItemGroup>
  ),
}
