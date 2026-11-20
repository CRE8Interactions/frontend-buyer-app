import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ArrowLeft, ArrowRight, Plus, Ticket, Trash, Heart } from "@phosphor-icons/react"
import { Button } from "./button"
import { Badge } from "./badge"
import { CheckCircle } from "@phosphor-icons/react"

const variants = ["primary", "secondary", "tertiary", "ghost", "outline", "danger", "danger-soft", "glass"] as const

const meta = {
  title: "Actions/Button",
  id: "atoms-button",
  component: Button,
  tags: ["autodocs"],
  args: { children: "Buy tickets" },
  argTypes: {
    variant: { control: "select", options: [...variants] },
    size: { control: "select", options: ["sm", "md", "lg", "icon-sm", "icon", "icon-lg"] },
    disabled: { control: "boolean" },
    pending: { control: "boolean" },
    fullWidth: { control: "boolean" },
  },
  parameters: { docs: { description: { component: "Copy of the reference Button: 24px radius, 14px/500 text, press scale 0.97 with a ripple from the press point (150ms grow, 225ms minimum hold, 12% of the text colour), accent is our green with navy text. Sizes sm 36 (32 on md+), md 40 (36), lg 44 (40). Variants: primary, secondary, tertiary, ghost, outline, danger, danger-soft, glass." } } },
} satisfies Meta<typeof Button>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {variants.map((v) => <Button key={v} variant={v}>{v}</Button>)}
    </div>
  ),
}
export const Glass: Story = {
  parameters: { docs: { description: { story: "Translucent: a tint of the page text colour with a hairline ring and blur, so it follows the theme. Switch the theme to see it on white and on dark. On a photo that stays dark in both themes, pin `--foreground` on the surface and the glass stays white." } } },
  render: () => (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3"><Button variant="glass">On the page</Button><Button variant="glass" iconOnly aria-label="Next"><ArrowRight weight="bold" /></Button></div>
      <div className="flex flex-wrap items-center gap-3 rounded-[24px] bg-[#0B2540] p-6 [--foreground:#fff]"><Button variant="glass">On a dark photo</Button><Button variant="glass" iconOnly aria-label="Next"><ArrowRight weight="bold" /></Button></div>
    </div>
  ),
}
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {(["sm", "md", "lg"] as const).map((s) => <Button key={s} size={s}>{s}</Button>)}
    </div>
  ),
}
export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button><Ticket weight="bold" /> Buy tickets</Button>
      <Button variant="secondary">Add event <Plus weight="bold" /></Button>
      <Button variant="outline">Continue <ArrowRight weight="bold" /></Button>
      <Button variant="danger-soft"><Trash weight="bold" /> Cancel order</Button>
    </div>
  ),
}
export const IconOnly: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {(["icon-sm", "icon", "icon-lg"] as const).map((s) => (
        <Button key={s} size={s} variant="secondary" aria-label="Save event"><Heart weight="bold" /></Button>
      ))}
      <Button iconOnly variant="outline" aria-label="Add"><Plus weight="bold" /></Button>
      <Button iconOnly size="lg" variant="ghost" aria-label="Add"><Plus weight="bold" /></Button>
    </div>
  ),
}
export const Disabled: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {variants.map((v) => <Button key={v} variant={v} disabled>{v}</Button>)}
    </div>
  ),
}
export const Pending: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button pending>Holding your seats</Button>
      <Button pending variant="secondary">Processing payment</Button>
      <Button pending variant="outline">Saving</Button>
    </div>
  ),
}
export const FullWidth: Story = {
  render: () => (
    <div className="w-80"><Button fullWidth><Ticket weight="bold" /> Checkout, 2 tickets</Button></div>
  ),
}

export const Hierarchy: StoryObj = {
  parameters: { docs: { description: { story: "One hue per row. The green primary is the only coloured fill; secondary, tertiary, ghost and outline step down through neutrals with ink text, so any mix of them in one line stays consistent. Danger is the only other coloured button." } } },
  render: () => (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button>Buy tickets</Button>
        <Button variant="secondary">Add to wishlist</Button>
        <Button variant="tertiary">Share</Button>
        <Button variant="ghost">Details</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary">Back</Button>
        <Button variant="outline">Save draft</Button>
        <Button variant="danger">Cancel event</Button>
      </div>
    </div>
  ),
}

export const OnSurfaces: StoryObj = {
  name: "On cards and overlays",
  parameters: { docs: { description: { story: "In dark, the secondary fill is the same grey as cards, dialogs, drawers and sheets, so a secondary button there shows only its label. On a surface use `tertiary`: it is a tint of the text colour, so it reads on light and dark. Secondary is for the page ground." } } },
  render: () => (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2 rounded-[24px] bg-h-surface p-4"><p className="text-sm text-h-muted">Secondary on a card (avoid)</p><Button variant="secondary">Add just this ticket</Button></div>
      <div className="grid gap-2 rounded-[24px] bg-h-surface p-4"><p className="text-sm text-h-muted">Tertiary on a card</p><Button variant="tertiary">Add just this ticket</Button></div>
    </div>
  ),
}

export const DangerAndStatus: StoryObj = {
  name: "Danger and status pairing",
  parameters: { docs: { description: { story: "The green primary stays as it is. Destructive actions start as `danger-soft` and go solid `danger` only in the confirm step. Status uses the real success Badge with a check icon (text 9:1 or better in both themes), so it reads as a status, not a second button." } } },
  render: () => (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-2"><Button>Buy tickets</Button><Button variant="danger-soft">Cancel order</Button></div>
      <div className="flex flex-wrap items-center gap-2"><Button variant="danger">Yes, cancel order</Button><Button variant="tertiary">Keep order</Button></div>
      <Badge variant="success"><CheckCircle weight="bold" /> Confirmed</Badge>
    </div>
  ),
}
