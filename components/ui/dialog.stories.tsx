import { useId, useState, type ComponentProps, type ReactNode } from "react"
import { CalendarCheck, CheckCircle, Info, PaperPlaneTilt, PencilSimple, Sparkle, Ticket, Trash, UserCircle, Warning } from "@phosphor-icons/react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Button } from "./button"
import { GroupedList, GroupedListItem } from "./grouped-list"
import { HoldButton } from "./hold-button"
import {
  Dialog, DialogBody, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogIcon, DialogTitle, DialogTrigger,
} from "./dialog"
import { Input } from "./input"
import { Label } from "./label"

const meta = {
  title: "Overlays/Dialog (modal)",
  id: "molecules-dialog",
  component: Dialog,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "A modal panel for focused tasks. It centers on desktop and opens near the bottom on phones by default. Set size, placement, scroll, or backdrop on DialogContent. Use DialogBody to scroll the content while keeping the header and actions in view.",
      },
    },
  },
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj<typeof meta>
type PanelProps = ComponentProps<typeof DialogContent>

function WelcomeDialog({ preview = false }: { preview?: boolean }) {
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="secondary">Open modal</Button></DialogTrigger>
      <DialogContent className="sm:max-w-[400px]" instant={preview}>
        <DialogHeader>
          <DialogIcon tone="accent"><Sparkle weight="bold" /></DialogIcon>
          <DialogTitle>Welcome to Blocktickets</DialogTitle>
          <DialogDescription>Discover live events and keep your tickets in one place, from the day you book to the moment you walk through the doors.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild><Button fullWidth>Continue</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ExamplePanel({ title, children, ...props }: PanelProps & { title: string }) {
  return (
    <DialogContent {...props}>
      <DialogHeader>
        <DialogIcon><Info weight="bold" /></DialogIcon>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{children ?? "Review the details before continuing."}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <DialogClose asChild><Button variant="secondary">Close</Button></DialogClose>
      </DialogFooter>
    </DialogContent>
  )
}

function Example({ trigger, title = trigger, triggerContent, children, ...props }: PanelProps & {
  trigger: string
  title?: string
  triggerContent?: ReactNode
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{triggerContent ?? <Button variant="secondary">{trigger}</Button>}</DialogTrigger>
      <ExamplePanel title={title} {...props}>{children}</ExamplePanel>
    </Dialog>
  )
}

export const Default: Story = { render: () => <WelcomeDialog /> }

export const OpenPreview: Story = {
  render: () => <WelcomeDialog preview />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Open modal" }))
  },
}

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {(["xs", "sm", "md", "lg", "cover", "full"] as const).map((size) => (
        <Example key={size} size={size} trigger={size.toUpperCase()} title={`Size: ${size.toUpperCase()}`} />
      ))}
    </div>
  ),
}

export const Placement: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Example placement="auto" trigger="Auto">Centered on desktop and near the bottom on phones.</Example>
      <Example placement="top" trigger="Top">Aligned to the top of the viewport.</Example>
      <Example placement="center" trigger="Center">Centered in the viewport at every width.</Example>
      <Example placement="bottom" trigger="Bottom">Aligned to the bottom of the viewport.</Example>
    </div>
  ),
}

function ScrollExample({ scroll }: { scroll: "inside" | "outside" }) {
  const title = scroll === "inside" ? "Scroll inside" : "Scroll outside"
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="secondary">{title}</Button></DialogTrigger>
      <DialogContent scroll={scroll}>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <DialogBody tabIndex={0} aria-label="Event information">
          <DialogDescription className="mb-4">
            {scroll === "inside" ? "The content scrolls while the title and actions stay in view." : "The entire panel scrolls with its title and actions."}
          </DialogDescription>
          {Array.from({ length: 12 }, (_, i) => (
            <p key={i} className="mb-4">
              <strong className="block font-medium text-h-foreground">Event information {i + 1}</strong>
              Keep your mobile ticket ready when you arrive. Check the venue details for doors, accessibility, and entry information before you travel.
            </p>
          ))}
        </DialogBody>
        <DialogFooter><DialogClose asChild><Button>Done</Button></DialogClose></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const ScrollBehavior: Story = {
  render: () => <div className="flex flex-wrap gap-2"><ScrollExample scroll="inside" /><ScrollExample scroll="outside" /></div>,
}

function ControlledExample() {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex items-center gap-3">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><Button variant="secondary">Open controlled modal</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogIcon><Info weight="bold" /></DialogIcon>
            <DialogTitle>Controlled modal</DialogTitle>
            <DialogDescription>The parent controls when this modal opens and closes.</DialogDescription>
          </DialogHeader>
          <DialogFooter><Button onClick={() => setOpen(false)}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <span className="text-sm text-h-muted" role="status">Modal is {open ? "open" : "closed"}</span>
    </div>
  )
}

export const ControlledState: Story = { render: () => <ControlledExample /> }

function FormExample() {
  const formId = useId()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("Alex Rivera")
  return (
    <div className="flex items-center gap-3">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><Button variant="secondary">Edit profile</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogIcon><UserCircle weight="bold" /></DialogIcon>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Change how your name appears on tickets.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <form id={formId} className="mt-1 grid gap-2" onSubmit={(event) => {
              event.preventDefault()
              setName(String(new FormData(event.currentTarget).get("name")))
              setOpen(false)
            }}>
              <Label htmlFor={`${formId}-name`}>Name</Label>
              <Input id={`${formId}-name`} name="name" defaultValue={name} required />
            </form>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
            <Button form={formId} type="submit">Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <span className="text-sm text-h-muted" role="status">{name}</span>
    </div>
  )
}

export const WithForm: Story = { render: () => <FormExample /> }

export const CustomTrigger: Story = {
  render: () => (
    <Example trigger="Edit ticket" triggerContent={
      <Button variant="outline"><PencilSimple weight="bold" />Edit ticket</Button>
    }>
      Use any button that forwards its ref and props as the trigger.
    </Example>
  ),
}

export const BackdropVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Example backdrop="opaque" trigger="Opaque backdrop" />
      <Example backdrop="blur" trigger="Blur backdrop" />
      <Example backdrop="transparent" trigger="Transparent backdrop" />
    </div>
  ),
}

export const CustomBackdrop: Story = {
  render: () => (
    <Example trigger="Custom backdrop" backdropClassName="bg-linear-to-br from-h-backdrop to-h-background/90">
      The backdrop can take its own classes, separate from the panel.
    </Example>
  ),
}

export const DismissBehavior: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Example trigger="Dismissable">Click outside the panel or press Escape to close it.</Example>
      <Example trigger="Backdrop stays open" dismissable={false}>Clicking the backdrop does nothing. Escape still closes the modal.</Example>
      <Example trigger="Escape disabled" keyboardDismissDisabled>Escape does nothing. The backdrop and close buttons still work.</Example>
      <Example trigger="Close button only" dismissable={false} keyboardDismissDisabled showCloseButton={false}>Use the footer button to close the modal.</Example>
    </div>
  ),
}

export const CloseMethods: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Example trigger="Default close controls">Use the close icon, the footer button, Escape, or the backdrop.</Example>
      <Example trigger="No close icon" showCloseButton={false}>The close icon is optional when other dismissal methods are available.</Example>
    </div>
  ),
}

export const CustomAnimations: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Example trigger="Slide and fade" className="motion-safe:data-[state=open]:zoom-in-100 motion-safe:data-[state=open]:slide-in-from-bottom-8 motion-safe:data-[state=open]:duration-300 motion-safe:data-[state=closed]:zoom-out-100 motion-safe:data-[state=closed]:slide-out-to-bottom-4" />
      <Example trigger="No animation" instant />
    </div>
  ),
}

function PortalExample() {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  return (
    <>
      <Example trigger="Custom portal" portalContainer={container}>
        This panel is mounted inside the example’s portal element.
      </Example>
      <div ref={setContainer} data-portal-demo />
    </>
  )
}

export const CustomPortal: Story = { render: () => <PortalExample /> }

/* Layouts: the icon does not always sit on the left. */
function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <GroupedList className="mt-5">
      {rows.map(([k, v]) => <GroupedListItem key={k} label={k}>{v}</GroupedListItem>)}
    </GroupedList>
  )
}

export const Layouts: Story = {
  parameters: { docs: { description: { story: "Three header layouts. `start` puts the icon beside the text (quick notices), `stack` puts it above with left-aligned text (tasks and forms), `center` centres everything with a larger tile (moments of success). Leave the icon out for compact confirmations." } } },
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Dialog>
        <DialogTrigger asChild><Button variant="secondary">Icon beside</Button></DialogTrigger>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogIcon tone="warning"><CalendarCheck weight="bold" /></DialogIcon>
            <DialogTitle>Doors moved to 6:30 PM</DialogTitle>
            <DialogDescription>Your tickets stay valid. Nothing to do on your side.</DialogDescription>
          </DialogHeader>
          <DialogFooter><DialogClose asChild><Button>Got it</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild><Button variant="secondary">Icon above</Button></DialogTrigger>
        <DialogContent size="sm">
          <DialogHeader align="stack">
            <DialogIcon tone="accent"><PaperPlaneTilt weight="bold" /></DialogIcon>
            <DialogTitle>Send tickets to a friend</DialogTitle>
            <DialogDescription>They get an email with a link to claim. You keep the tickets until they accept.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="mt-1 grid gap-2">
              <Label htmlFor="friend-email">Their email</Label>
              <Input id="friend-email" type="email" placeholder="friend@example.com" />
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild><Button variant="tertiary">Cancel</Button></DialogClose>
            <Button><PaperPlaneTilt weight="bold" />Send tickets</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild><Button>Centred moment</Button></DialogTrigger>
        <DialogContent size="sm">
          <DialogHeader align="center">
            <DialogIcon tone="success"><CheckCircle weight="bold" /></DialogIcon>
            <DialogTitle>You are going to Harbour Lights</DialogTitle>
            <DialogDescription>Your order is confirmed. Tickets are in your wallet.</DialogDescription>
          </DialogHeader>
          <Facts rows={[["Date", "Sat 14 Jun, 7:30 PM"], ["Seats", "Sec 112, Row F, 4 to 5"], ["Total", "$248.00"]]} />
          <DialogFooter align="center">
            <DialogClose asChild><Button variant="tertiary">Done</Button></DialogClose>
            <Button><Ticket weight="bold" />View tickets</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild><Button variant="secondary">No icon, compact</Button></DialogTrigger>
        <DialogContent size="xs">
          <DialogHeader>
            <DialogTitle>Leave without saving?</DialogTitle>
            <DialogDescription>Your seat selection is lost if you leave now.</DialogDescription>
          </DialogHeader>
          <DialogFooter><DialogClose asChild><Button variant="tertiary">Stay</Button></DialogClose><DialogClose asChild><Button variant="danger-soft">Leave</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild><Button variant="secondary">Warning, stacked</Button></DialogTrigger>
        <DialogContent size="sm">
          <DialogHeader align="stack">
            <DialogIcon tone="danger"><Warning weight="bold" /></DialogIcon>
            <DialogTitle>Resale price is above face value</DialogTitle>
            <DialogDescription>Listings over the cap are removed by the venue. Lower your price to $120 or less to keep the listing live.</DialogDescription>
          </DialogHeader>
          <DialogFooter><DialogClose asChild><Button variant="tertiary">Keep price</Button></DialogClose><DialogClose asChild><Button>Set to $120</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  ),
}

export const FadingScroll: Story = {
  name: "Fading scroll",
  parameters: { docs: { description: { story: "When the body scrolls inside the panel, its edges fade: the bottom while there is more to read, the top once you have scrolled. Nothing fades when the content fits. The same behaviour is built into the sheet body." } } },
  render: () => (
    <Dialog>
      <DialogTrigger asChild><Button variant="secondary">Ticket terms</Button></DialogTrigger>
      <DialogContent size="md" className="max-h-[min(560px,100%)]">
        <DialogHeader align="stack">
          <DialogIcon><Info weight="bold" /></DialogIcon>
          <DialogTitle>Ticket terms</DialogTitle>
          <DialogDescription>Read before you buy. Scroll for the full terms.</DialogDescription>
        </DialogHeader>
        <DialogBody tabIndex={0} aria-label="Ticket terms" className="mt-4">
          {["Entry", "Transfers", "Resale", "Refunds", "Accessibility", "Age limits", "Re-entry", "Bags", "Cameras", "Support"].map((h) => (
            <p key={h} className="mb-4">
              <strong className="block text-base font-medium text-h-foreground">{h}</strong>
              Keep your mobile ticket ready when you arrive. Check the venue details for doors, accessibility and entry information before you travel. Terms can change if the event is moved or rescheduled.
            </p>
          ))}
        </DialogBody>
        <DialogFooter><DialogClose asChild><Button variant="tertiary">Close</Button></DialogClose><DialogClose asChild><Button>I agree</Button></DialogClose></DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

function HoldExample() {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="danger-soft"><Trash weight="bold" />Delete event</Button></DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader align="stack">
          <DialogIcon tone="danger"><Trash weight="bold" /></DialogIcon>
          <DialogTitle>Delete Harbour Lights?</DialogTitle>
          <DialogDescription>412 tickets are sold. Every buyer is refunded and notified. This cannot be undone.</DialogDescription>
        </DialogHeader>
        <Facts rows={[["Tickets sold", "412"], ["Refunds", "$51,430.00"], ["Notifications", "412 emails"]]} />
        <DialogFooter>
          <DialogClose asChild><Button variant="tertiary">Keep event</Button></DialogClose>
          <HoldButton variant="danger" holdLabel="Deleting…" onHoldComplete={() => setOpen(false)}>Hold to delete</HoldButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    )
}

export const HoldToConfirm: Story = {
  name: "Danger, hold to confirm",
  parameters: { docs: { description: { story: "Irreversible actions never take a single click: the destructive button is a `HoldButton`. Press and hold for two seconds, release early to cancel. Cancel stays one tap." } } },
  render: () => <HoldExample />,
}
