import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Ticket, CheckCircle, Warning, XCircle, BellSimple } from "@phosphor-icons/react"
import { Badge, NotificationBadge, NotificationBadgeAnchor } from "./badge"
import { Avatar, AvatarFallback } from "./avatar"

const colors = ["default", "info", "purple", "success", "warning", "danger"] as const
const variants = ["primary", "secondary", "tertiary", "soft"] as const
const legacy = ["default", "accent", "success", "warning", "destructive", "neutral", "secondary", "outline"] as const

const meta = {
  title: "Display & content/Badge",
  id: "atoms-badge",
  component: Badge,
  tags: ["autodocs"],
  args: { children: "On sale" },
  argTypes: {
    variant: { control: "select", options: [...variants, ...legacy] },
    color: { control: "select", options: colors },
    size: { control: "select", options: ["sm", "md", "lg"] },
  },
  parameters: { docs: { description: { component: "A label pill for ticket and order status. Colour carries meaning: green is success (one green, the brand green), blue is info, amber is warning, red is danger, grey is neutral. A plain badge is grey on purpose. Legacy variants (default, destructive, neutral, outline) map to the closest Chip variant. Count and dot overlays are `NotificationBadge` (the reference Badge)." } } },
} satisfies Meta<typeof Badge>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = { args: { variant: "secondary", color: "default", size: "md" } }

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {variants.map((v) => <Badge key={v} variant={v} color="success">{v}</Badge>)}
    </div>
  ),
}
export const Colors: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {variants.map((v) => (
        <div key={v} className="flex flex-wrap items-center gap-3">
          {colors.map((c) => <Badge key={c} variant={v} color={c}>{c}</Badge>)}
        </div>
      ))}
    </div>
  ),
}
export const Sizes: Story = {
  render: () => <div className="flex items-center gap-3"><Badge size="sm">Small</Badge><Badge size="md">Medium</Badge><Badge size="lg">Large</Badge></div>,
}
export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Badge variant="soft" color="success"><Ticket size={12} weight="bold" />12 tickets left</Badge>
      <Badge variant="soft" color="success"><CheckCircle size={12} weight="bold" />Checked in</Badge>
      <Badge variant="soft" color="warning"><Warning size={12} weight="bold" />Almost sold out</Badge>
      <Badge variant="soft" color="danger"><XCircle size={12} weight="bold" />Cancelled</Badge>
    </div>
  ),
}
export const LegacyVariants: Story = {
  render: () => <div className="flex flex-wrap items-center gap-3">{legacy.map((v) => <Badge key={v} variant={v}>{v}</Badge>)}</div>,
}

export const NotificationBadges: Story = {
  name: "NotificationBadge (the reference Badge)",
  render: () => (
    <div className="flex flex-wrap items-center gap-8">
      {(["top-right", "top-left", "bottom-right", "bottom-left"] as const).map((p) => (
        <NotificationBadgeAnchor key={p}>
          <Avatar><AvatarFallback>MS</AvatarFallback></Avatar>
          <NotificationBadge size="sm" placement={p} />
        </NotificationBadgeAnchor>
      ))}
      <NotificationBadgeAnchor>
        <Avatar><AvatarFallback>JO</AvatarFallback></Avatar>
        <NotificationBadge size="sm" color="danger">3</NotificationBadge>
      </NotificationBadgeAnchor>
      <NotificationBadgeAnchor>
        <Avatar size="lg"><AvatarFallback><BellSimple size={20} weight="bold" /></AvatarFallback></Avatar>
        <NotificationBadge size="md" color="success" variant="soft">12</NotificationBadge>
      </NotificationBadgeAnchor>
      <NotificationBadgeAnchor>
        <Avatar><AvatarFallback>TR</AvatarFallback></Avatar>
        <NotificationBadge size="lg" color="warning" variant="primary">99+</NotificationBadge>
      </NotificationBadgeAnchor>
    </div>
  ),
}

export const StatusVocabulary: Story = {
  parameters: { docs: { description: { story: "Which colour means what. Always keep the text label, and add an icon where it helps, so colour is never the only signal." } } },
  render: () => (
    <div className="grid max-w-xl gap-3">
      {([
        ["Neutral", "default", ["Draft", "Archived", "Unlisted"]],
        ["Info", "info", ["Scheduled", "On sale", "In review"]],
        ["Success", "success", ["Paid", "Delivered", "Refunded"]],
        ["Special", "purple", ["VIP", "Premium", "Resale"]],
        ["Warning", "warning", ["Low stock", "Pending", "Expires soon"]],
        ["Danger", "danger", ["Failed", "Cancelled", "Sold out"]],
      ] as const).map(([label, color, items]) => (
        <div key={label} className="flex items-center gap-3">
          <span className="w-20 text-sm text-h-muted">{label}</span>
          <div className="flex flex-wrap gap-2">{items.map((t) => <Badge key={t} variant="soft" color={color}>{t}</Badge>)}</div>
        </div>
      ))}
    </div>
  ),
}


