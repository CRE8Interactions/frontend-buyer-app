import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { CheckCircle, Info, Trash, Warning, XCircle } from "@phosphor-icons/react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDetail, AlertDialogDetails, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle, AlertDialogTrigger } from "./alert-dialog"
import { Button } from "./button"

const meta = {
  title: "Overlays/Alert dialog",
  id: "molecules-alert-dialog",
  component: AlertDialog,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: { component: "the reference structure, tightened for a faster read: 16px corners, 24px padding, a 40px icon tile beside an 18px title, 14px body, an optional details panel for the facts behind the decision, and right-aligned actions that stack full width on phones with the safe choice last. Sizes xs, sm, md (default) and lg. Tile tones: default, accent, success, warning, danger. Focus lands on Cancel." },
      story: { inline: false, iframeHeight: 420 },
    },
  },
} satisfies Meta<typeof AlertDialog>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <AlertDialog defaultOpen>
      <AlertDialogTrigger asChild><Button variant="outline">Cancel event</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Harbour Lights Festival?</AlertDialogTitle>
          <AlertDialogDescription>All 4,200 ticket holders will be refunded automatically and notified by email. This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep event</AlertDialogCancel>
          <AlertDialogAction variant="danger">Cancel event</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
}
export const Small: Story = {
  render: () => (
    <AlertDialog defaultOpen>
      <AlertDialogTrigger asChild><Button variant="outline">Release seats</Button></AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Release 6 held seats?</AlertDialogTitle>
          <AlertDialogDescription>Section 204, Row C goes back on sale.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep</AlertDialogCancel>
          <AlertDialogAction>Release</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
}
export const WithMedia: Story = {
  render: () => (
    <AlertDialog defaultOpen>
      <AlertDialogTrigger asChild><Button variant="danger">Delete venue map</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia tone="danger"><Trash weight="bold" /></AlertDialogMedia>
          <AlertDialogTitle>Delete the Riverside Arena map?</AlertDialogTitle>
          <AlertDialogDescription>3 upcoming events use this seating chart and will lose their sections.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="danger">Delete map</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
}
export const Closed: Story = {
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="outline"><Warning weight="bold" /> Refund order</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Refund order #48213?</AlertDialogTitle>
          <AlertDialogDescription>$248.00 returns to the original card within 5 business days.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Refund</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
}

export const Tones: Story = {
  parameters: { docs: { story: { inline: false, iframeHeight: 420 } } },
  render: () => (
    <AlertDialog defaultOpen>
      <AlertDialogTrigger asChild><Button variant="tertiary">Open</Button></AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia tone="warning"><Warning weight="bold" /></AlertDialogMedia>
          <AlertDialogTitle>Event is almost sold out</AlertDialogTitle>
          <AlertDialogDescription>Only 12 seats left. Raise the price for the final block?</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Not now</AlertDialogCancel>
          <AlertDialogAction>Raise price</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
}

const frame = { docs: { story: { inline: false, iframeHeight: 460 } } }
const Dialog = ({ align, tone, icon, trigger, title, body, details, cancel, action, actionVariant }: { align?: "start" | "center"; tone: "danger" | "warning" | "success" | "accent"; icon: React.ReactNode; trigger: string; title: string; body: string; details?: [string, string][]; cancel?: string; action: string; actionVariant?: "primary" | "danger" }) => (
  <AlertDialog defaultOpen>
    <AlertDialogTrigger asChild><Button variant="tertiary">{trigger}</Button></AlertDialogTrigger>
    <AlertDialogContent align={align}>
      <AlertDialogHeader>
        <AlertDialogMedia tone={tone}>{icon}</AlertDialogMedia>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{body}</AlertDialogDescription>
      </AlertDialogHeader>
      {details ? (
        <AlertDialogDetails>
          {details.map(([l, v]) => <AlertDialogDetail key={l} label={l}>{v}</AlertDialogDetail>)}
        </AlertDialogDetails>
      ) : null}
      <AlertDialogFooter>
        {cancel ? <AlertDialogCancel>{cancel}</AlertDialogCancel> : null}
        <AlertDialogAction variant={actionVariant ?? "primary"}>{action}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)
export const CancelEvent: Story = {
  parameters: frame,
  render: () => <Dialog tone="danger" icon={<Trash weight="bold" />} trigger="Cancel event" title="Cancel Harbour Lights Festival?" body="Every ticket holder is refunded automatically and told by email. This can't be undone." details={[["Ticket holders", "4,200"], ["Refund total", "$286,400"], ["Event date", "Sat 14 Jun"]]} cancel="Keep event" action="Cancel event" actionVariant="danger" />,
}
export const DoorsMoved: Story = {
  parameters: frame,
  render: () => <Dialog tone="warning" icon={<Warning weight="bold" />} trigger="Change doors" title="Move doors to 18:00?" body="Gates open 30 minutes earlier than printed on the tickets." details={[["Notified by email", "3,100"], ["Previously", "18:30"]]} cancel="Not now" action="Move doors" />,
}
export const RefundSent: Story = {
  parameters: frame,
  render: () => <Dialog tone="success" icon={<CheckCircle weight="bold" />} trigger="Refund order" title="Refund sent" body="It usually arrives within 3 to 5 days." details={[["Amount", "$148.40"], ["Card", "Visa ending 4242"]]} action="Back to orders" />,
}
export const ResaleOpens: Story = {
  parameters: frame,
  render: () => <Dialog tone="accent" icon={<Info weight="bold" />} trigger="New rules" title="Resale opens Friday" body="Fans can list tickets from 10:00. Prices are capped at face value plus fees." cancel="Later" action="See the rules" />,
}
export const PaymentFailed: Story = {
  parameters: frame,
  render: () => <Dialog tone="danger" icon={<XCircle weight="bold" />} trigger="Payment" title="Payment didn't go through" body="Your bank declined the charge. Nothing was taken and your seats are held for 10 minutes." cancel="Use another card" action="Try again" />,
}
export const Centered: Story = {
  parameters: { ...frame, docs: { story: { inline: false, iframeHeight: 520 }, description: { story: "`align=\"center\"` stacks the icon above centred text and centres the actions, equal width." } } },
  render: () => <Dialog align="center" tone="danger" icon={<Trash weight="bold" />} trigger="Cancel event" title="Cancel Harbour Lights Festival?" body="Every ticket holder is refunded automatically and told by email. This can't be undone." details={[["Ticket holders", "4,200"], ["Refund total", "$286,400"], ["Event date", "Sat 14 Jun"]]} cancel="Keep event" action="Cancel event" actionVariant="danger" />,
}
