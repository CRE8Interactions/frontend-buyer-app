import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { EnvelopeSimple, MagnifyingGlass } from "@phosphor-icons/react"
import { expect, userEvent, within } from "storybook/test"
import { Button } from "./button"
import { Card } from "./card"
import { Input } from "./input"
import { Label } from "./label"
import { Description } from "./description"
import { FieldError } from "./field-error"

const meta = {
  title: "Forms & inputs/Input",
  id: "atoms-input",
  component: Input,
  tags: ["autodocs", "updated"],
  args: { placeholder: "you@club.com", type: "email" },
  argTypes: {
    variant: { control: "inline-radio", options: ["primary", "secondary", "tertiary", "underlined"] },
    fullWidth: { control: "boolean" },
    disabled: { control: "boolean" },
    isInvalid: { control: "boolean" },
  },
  parameters: { docs: { description: { component: "the reference Input: 12px radius, px-3 py-2, 16px (14px from sm), field fill with field shadow, 150ms transitions. Hover darkens fill and border, focus shows a 2px accent ring, invalid a danger outline/ring. Full width by default (the reference is auto width; pass fullWidth={false})." } } },
} satisfies Meta<typeof Input>
export default meta
type Story = StoryObj<typeof meta>

const wrap = "grid w-80 gap-4"

export const Playground: Story = { render: (args) => <div className="w-80"><Input {...args} /></div> }

export const Variants: Story = {
  render: () => (
    <div className={wrap}>
      <Input variant="primary" placeholder="Primary" />
      <Input variant="secondary" placeholder="Secondary (on a card)" />
      <Input variant="tertiary" placeholder="Tertiary (no fill)" />
      <Input variant="underlined" placeholder="Underlined" />
      <Input variant="bordered" placeholder="Bordered" />
    </div>
  ),
}

export const WithLabelAndDescription: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-1">
      <Label htmlFor="em">Email</Label>
      <Input id="em" type="email" placeholder="you@club.com" />
      <Description>We send your tickets to this address.</Description>
    </div>
  ),
}

export const Required: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-1">
      <Label htmlFor="rq" isRequired>Promo code</Label>
      <Input id="rq" placeholder="SPRING20" required />
    </div>
  ),
}

function ShakeDemo() {
  const [value, setValue] = React.useState("")
  const [invalid, setInvalid] = React.useState(false)
  return (
    <form
      className="flex w-80 flex-col gap-1"
      onSubmit={(e) => {
        e.preventDefault()
        /* Clear first so a second bad submit shakes again: the shake runs when the field becomes invalid. */
        setInvalid(false)
        setTimeout(() => setInvalid(!/^\S+@\S+\.\S+$/.test(value)), 30)
      }}
    >
      <Label htmlFor="shake-email">Email</Label>
      <Input id="shake-email" value={value} onChange={(e) => { setValue(e.target.value); setInvalid(false) }} isInvalid={invalid} placeholder="you@example.com" />
      {/* The message slot is always there, so the button below never moves when the error appears. */}
      <div className="min-h-4">{invalid && <FieldError>Please enter a valid email.</FieldError>}</div>
      <Button type="submit" className="mt-1">Continue</Button>
    </form>
  )
}
export const ShakeOnError: Story = {
  name: "Shake on error",
  parameters: { docs: { description: { story: "Submit with an empty or malformed email. The field shakes once (6px, 6px, 4px overshoot, 280ms) as it turns invalid and the message fades in. Typing clears the error." } } },
  render: () => <ShakeDemo />,
}
export const Invalid: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-1" data-invalid="true">
      <Label htmlFor="iv">Promo code</Label>
      <Input id="iv" defaultValue="SPRING2" isInvalid />
      <FieldError>This code has expired.</FieldError>
    </div>
  ),
}

export const InvalidSecondary: Story = {
  render: () => <div className="w-80"><Input defaultValue="SPRING2" isInvalid /></div>,
}

export const Disabled: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-1" data-disabled="true">
      <Label htmlFor="ds">Seat</Label>
      <Input id="ds" defaultValue="Row 12, Seat 4" disabled />
    </div>
  ),
}

export const ReadOnly: Story = {
  render: () => <div className="w-80"><Input defaultValue="BT-2026-004981" readOnly /></div>,
}

export const FullWidth: Story = {
  render: () => <div className="w-[480px] max-w-full"><Input fullWidth placeholder="Search events" /></div>,
}

export const AutoWidth: Story = {
  render: () => <Input fullWidth={false} placeholder="Auto width" />,
}

export const Types: Story = {
  parameters: { docs: { description: { story: "The file field opens the system picker and displays the selected file name." } } },
  render: () => (
    <div className={wrap}>
      <Input type="text" placeholder="Name" />
      <Input type="email" placeholder="Email" />
      <Input type="password" defaultValue="hunter2hunter2" />
      <Input type="number" placeholder="Quantity" />
      <Input type="search" placeholder="Search events" />
      <Input type="file" aria-label="Choose a file" />
    </div>
  ),
}

export const WithIcon: Story = {
  render: () => (
    <div className="relative w-80">
      <MagnifyingGlass className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-h-field-placeholder" weight="bold" />
      <Input className="pl-9" placeholder="Search events" />
    </div>
  ),
}

export const Sizes: Story = {
  parameters: { docs: { description: { story: "sm 32, md 36 and lg 44px on desktop; 4px taller below the md breakpoint so touch targets stay comfortable. Text is 14px for sm and md and 16px for lg, at every width." } } },
  render: () => (
    <div className={wrap}>
      <Input size="sm" placeholder="Small, 32px" />
      <Input size="md" placeholder="Medium, 36px" />
      <Input size="lg" placeholder="Large, 44px" />
    </div>
  ),
}

const ClearableDemo = () => {
  const [v, setV] = React.useState("Harbour Lights")
  return (
    <div className="grid w-80 gap-2">
      <Input clearable value={v} onChange={(e) => setV(e.target.value)} placeholder="Search events" />
      <p className="text-xs text-h-muted">Value: {v || "(empty)"}</p>
    </div>
  )
}
export const Clearable: Story = {
  parameters: { docs: { description: { story: "A clear button shows while the field has text and returns focus to the field. Works controlled and uncontrolled." } } },
  render: () => <ClearableDemo />,
}
export const Password: Story = {
  parameters: { docs: { description: { story: "Password fields get an eye toggle to show or hide the text." } } },
  render: () => <div className="w-80"><Input type="password" defaultValue="hunter2hunter2" placeholder="Password" /></div>,
}
export const PasswordClearable: Story = {
  render: () => <div className="w-80"><Input type="password" clearable defaultValue="hunter2hunter2" placeholder="Password" /></div>,
}
export const PrefixAndSuffix: Story = {
  parameters: { docs: { description: { story: "A short prefix or suffix lives inside the field: a currency sign, a unit or an icon." } } },
  render: () => (
    <div className={wrap}>
      <Input prefix="$" defaultValue="142.00" inputMode="decimal" aria-label="Price" />
      <Input suffix="tickets" defaultValue="4" inputMode="numeric" aria-label="Quantity" />
      <Input prefix={<MagnifyingGlass weight="bold" />} clearable defaultValue="Arena" aria-label="Search" />
    </div>
  ),
}
export const AdornmentSizes: Story = {
  render: () => (
    <div className={wrap}>
      {(["sm", "md", "lg"] as const).map((s) => <Input key={s} size={s} prefix={<MagnifyingGlass weight="bold" />} clearable defaultValue={`Size ${s}`} aria-label={s} />)}
    </div>
  ),
}

export const Loading: Story = {
  parameters: { docs: { description: { story: "A spinner while something is being checked, such as a promo code." } } },
  render: () => <div className="w-80"><Input isLoading defaultValue="SPRING25" aria-label="Promo code" /></div>,
}
export const Valid: Story = {
  parameters: { docs: { description: { story: "A green edge and a check once the value passes validation. Invalid wins if both are set." } } },
  render: () => <div className="w-80"><Input isValid defaultValue="SPRING25" aria-label="Promo code" /></div>,
}
export const CharacterCount: Story = {
  parameters: { docs: { description: { story: "Counter on the right; it turns red at the limit." } } },
  render: () => <div className="w-80"><Input showCount maxLength={30} defaultValue="Aisle seats if possible" aria-label="Note" /></div>,
}
export const Underlined: Story = {
  parameters: { docs: { description: { story: "Only a bottom line, no fill or box. For dense forms and inline editing. Focus is a 2px accent line." } } },
  render: () => (
    <div className={wrap}>
      <Input variant="underlined" placeholder="Name on ticket" />
      <Input variant="underlined" defaultValue="Alex Rivera" clearable aria-label="Name" />
      <Input variant="underlined" isInvalid defaultValue="alex@" aria-label="Email" />
    </div>
  ),
}
export const Pill: Story = {
  parameters: { docs: { description: { story: "Fully round, for search boxes." } } },
  render: () => (
    <div className={wrap}>
      <Input shape="pill" prefix={<MagnifyingGlass weight="bold" />} placeholder="Search events" clearable aria-label="Search" />
      <Input shape="pill" variant="tertiary" prefix={<MagnifyingGlass weight="bold" />} placeholder="Search venues" aria-label="Search venues" />
    </div>
  ),
}

/* A card holding a labelled email field with a mail icon and a hint, built only from existing components: Card (surface),
   Label, Input with an icon prefix, and Description. The play function checks it like a user would. */
export const EmailFieldInCard: Story = {
  parameters: { docs: { description: { story: "A labelled email field on a card: label above, a mail icon inside the field, a hint below. Made only from Card, Label, Input (with an icon prefix) and Description. The interaction test checks that the label points at the input, the hint is announced with it, and typing works." } } },
  render: () => (
    <Card className="w-[268px] max-w-full bg-muted p-6">
      <div className="flex flex-col gap-1">
        <Label htmlFor="email-in-card">Email address</Label>
        <Input id="email-in-card" type="email" variant="secondary" prefix={<EnvelopeSimple weight="bold" />} placeholder="name@email.com" aria-describedby="email-in-card-hint" />
        <Description id="email-in-card-hint">We&apos;ll never share this with anyone else</Description>
      </div>
    </Card>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText("Email address")
    await expect(input).toHaveAttribute("type", "email")
    await expect(input).toHaveAttribute("placeholder", "name@email.com")
    await expect(input).toHaveAccessibleDescription("We'll never share this with anyone else")
    await expect(canvasElement.querySelector("[data-slot=card] svg")).not.toBeNull()
    await userEvent.type(input, "marta@mail.com")
    await expect(input).toHaveValue("marta@mail.com")
  },
}

export const Bordered: Story = {
  parameters: { docs: { description: { story: "A visible 1px border on the surface fill. Hover softens the border and takes the secondary surface; focus is an accent border with a 2px ring at 20%; invalid is a danger border with a soft danger fill and danger text." } } },
  render: () => (
    <div className={wrap}>
      <Input variant="bordered" placeholder="Resting" />
      <Input variant="bordered" placeholder="Focused" autoFocus />
      <Input variant="bordered" defaultValue="not an email" isInvalid aria-label="Invalid" />
      <Input variant="bordered" placeholder="Disabled" disabled />
    </div>
  ),
}
