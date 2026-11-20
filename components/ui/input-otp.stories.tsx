import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot, REGEXP_ONLY_CHARS, REGEXP_ONLY_DIGITS } from "./input-otp"
import { Button } from "./button"
import { Label } from "./label"
import { Link } from "./link"

const meta = {
  title: "Forms & inputs/Input OTP",
  id: "molecules-input-otp",
  component: InputOTP,
  tags: ["autodocs"],
  argTypes: { variant: { control: "inline-radio", options: ["primary", "secondary"] }, isInvalid: { control: "boolean" }, isDisabled: { control: "boolean" } },
  parameters: { docs: { description: { component: "One-time code input for confirming a fan's email or phone before checkout. Each character arrives with a short rise-and-fade, and the next slot takes the focus ring. Built on the input-otp library, so paste, autofill and one-time-code keyboards work." } } },
} satisfies Meta<typeof InputOTP>
export default meta
type Story = StoryObj<typeof meta>

const slots = (n: number[]) => n.map((i) => <InputOTPSlot key={i} index={i} />)
const six = (
  <>
    <InputOTPGroup>{slots([0, 1, 2])}</InputOTPGroup>
    <InputOTPSeparator />
    <InputOTPGroup>{slots([3, 4, 5])}</InputOTPGroup>
  </>
)

export const Default: Story = {
  args: { maxLength: 6, children: null as never },
  render: ({ variant, isInvalid, isDisabled }) => <InputOTP variant={variant} isInvalid={isInvalid} isDisabled={isDisabled} maxLength={6} pattern={REGEXP_ONLY_DIGITS}>{six}</InputOTP>,
}
export const Basic: Story = {
  parameters: { docs: { description: { story: "A verification step: a label, the code, and a way to ask for another." } } },
  args: { maxLength: 6, children: null as never },
  render: () => (
    <div className="flex w-[280px] flex-col gap-2">
      <Label>Verify your email</Label>
      <p className="text-sm text-h-muted">We&apos;ve sent a code to m****@mail.com</p>
      <InputOTP maxLength={6} pattern={REGEXP_ONLY_DIGITS}>{six}</InputOTP>
      <p className="text-sm text-h-muted">Didn&apos;t receive a code? <Link href="#">Resend</Link></p>
    </div>
  ),
}
export const Variants: Story = {
  parameters: { docs: { description: { story: "Primary has the soft field outline. Secondary drops the outline and uses the default fill, for use on a surface." } } },
  args: { maxLength: 6, children: null as never },
  render: () => (
    <div className="flex flex-col gap-6">
      <InputOTP maxLength={6} variant="primary" defaultValue="482">{six}</InputOTP>
      <div className="rounded-3xl bg-h-surface p-4">
        <InputOTP maxLength={6} variant="secondary" defaultValue="482">{six}</InputOTP>
      </div>
    </div>
  ),
}
export const FourDigits: Story = {
  args: { maxLength: 4, children: null as never },
  render: () => <InputOTP maxLength={4} pattern={REGEXP_ONLY_DIGITS}><InputOTPGroup>{slots([0, 1, 2, 3])}</InputOTPGroup></InputOTP>,
}
export const Filled: Story = {
  parameters: { docs: { description: { story: "Filled slots keep the focus fill. Reloading this story replays the entrance on every character." } } },
  args: { maxLength: 6, children: null as never },
  render: () => <InputOTP maxLength={6} defaultValue="482913"><InputOTPGroup>{slots([0, 1, 2, 3, 4, 5])}</InputOTPGroup></InputOTP>,
}
export const Disabled: Story = {
  args: { maxLength: 4, children: null as never },
  render: () => <InputOTP maxLength={4} isDisabled defaultValue="12"><InputOTPGroup>{slots([0, 1, 2, 3])}</InputOTPGroup></InputOTP>,
}
export const WithPattern: Story = {
  parameters: { docs: { description: { story: "`pattern` limits what can be typed or pasted. Exported patterns: `REGEXP_ONLY_DIGITS`, `REGEXP_ONLY_CHARS` and `REGEXP_ONLY_DIGITS_AND_CHARS`. This one takes letters only." } } },
  args: { maxLength: 4, children: null as never },
  render: () => <InputOTP maxLength={4} pattern={REGEXP_ONLY_CHARS}><InputOTPGroup>{slots([0, 1, 2, 3])}</InputOTPGroup></InputOTP>,
}

function ControlledDemo() {
  const [value, setValue] = React.useState("")
  return (
    <div className="flex flex-col gap-3">
      <InputOTP maxLength={6} value={value} onChange={setValue} pattern={REGEXP_ONLY_DIGITS}>{six}</InputOTP>
      <div className="flex items-center gap-3 text-sm text-h-muted">
        <span>Value: <span className="font-medium text-h-foreground tabular-nums">{value || "empty"}</span></span>
        <Button size="sm" variant="tertiary" onClick={() => setValue("")}>Clear</Button>
      </div>
    </div>
  )
}
export const Controlled: Story = {
  parameters: { docs: { description: { story: "Hold the value in state to show it, clear it or validate it." } } },
  args: { maxLength: 6, children: null as never },
  render: () => <ControlledDemo />,
}

function OnCompleteDemo() {
  const [done, setDone] = React.useState<string | null>(null)
  return (
    <div className="flex flex-col gap-3">
      <InputOTP maxLength={6} pattern={REGEXP_ONLY_DIGITS} onComplete={setDone} onChange={() => setDone(null)}>{six}</InputOTP>
      <p className="text-sm text-h-muted" aria-live="polite">{done ? `Code ${done} entered, checking it.` : "Enter the 6-digit code."}</p>
    </div>
  )
}
export const OnComplete: Story = {
  parameters: { docs: { description: { story: "`onComplete` fires when the last slot is filled: the moment to submit." } } },
  args: { maxLength: 6, children: null as never },
  render: () => <OnCompleteDemo />,
}

function ValidationDemo() {
  const [value, setValue] = React.useState("123456")
  const wrong = value.length === 6 && value !== "482913"
  return (
    <div className="flex flex-col gap-2">
      <InputOTP maxLength={6} value={value} onChange={setValue} isInvalid={wrong} pattern={REGEXP_ONLY_DIGITS}>{six}</InputOTP>
      {wrong ? <p className="text-xs text-h-danger">That code is wrong or expired. Try 482913.</p> : <p className="text-xs text-h-muted">Enter the code we sent you.</p>}
    </div>
  )
}
export const WithValidation: Story = {
  parameters: { docs: { description: { story: "`isInvalid` draws every slot with the danger outline. Here any complete code except 482913 is wrong." } } },
  args: { maxLength: 6, children: null as never },
  render: () => <ValidationDemo />,
}
export const Invalid: Story = {
  args: { maxLength: 4, children: null as never },
  render: () => (
    <div className="flex flex-col gap-2">
      <InputOTP maxLength={4} defaultValue="1234" isInvalid><InputOTPGroup>{slots([0, 1, 2, 3])}</InputOTPGroup></InputOTP>
      <p className="text-sm text-h-danger">That code is wrong or expired.</p>
    </div>
  ),
}

function FormDemo() {
  const [value, setValue] = React.useState("")
  const [sent, setSent] = React.useState(false)
  return (
    <form
      className="flex w-[300px] flex-col gap-4"
      onSubmit={(e) => { e.preventDefault(); setSent(true) }}
    >
      <div className="flex flex-col gap-1">
        <Label>Two-factor code</Label>
        <p className="text-sm text-h-muted">Open your authenticator app and enter the 6-digit code.</p>
      </div>
      <InputOTP maxLength={6} name="code" value={value} onChange={(v) => { setValue(v); setSent(false) }} pattern={REGEXP_ONLY_DIGITS} autoFocus>{six}</InputOTP>
      <Button type="submit" disabled={value.length < 6}>Verify</Button>
      {sent ? <p className="text-sm text-h-success-soft-foreground" role="status">Code {value} accepted.</p> : null}
    </form>
  )
}
export const FormExample: Story = {
  parameters: { docs: { description: { story: "A two-factor form: the submit button waits for all six digits." } } },
  args: { maxLength: 6, children: null as never },
  render: () => <FormDemo />,
}

export const Sizes: Story = {
  parameters: { docs: { description: { story: "sm for dense forms, md (default, the reference size) and lg for login and verification screens, with 24px digits, bigger boxes and a wider gap." } } },
  args: { maxLength: 6, children: null as never },
  render: () => (
    <div className="flex flex-col gap-8">
      {(["sm", "md", "lg"] as const).map((size) => (
        <InputOTP key={size} maxLength={6} size={size} defaultValue="482" pattern={REGEXP_ONLY_DIGITS}>{six}</InputOTP>
      ))}
    </div>
  ),
}
export const LoginScreen: Story = {
  parameters: { docs: { description: { story: "The large size on a verification screen: the code is the one job on the page." } } },
  args: { maxLength: 6, children: null as never },
  render: () => (
    <div className="flex w-full max-w-md flex-col items-center gap-5 text-center">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-h-foreground">Enter your code</h2>
        <p className="text-sm text-h-muted">We sent a 6-digit code to m****@mail.com</p>
      </div>
      <InputOTP maxLength={6} size="lg" pattern={REGEXP_ONLY_DIGITS} containerClassName="justify-center" autoFocus>{six}</InputOTP>
      <p className="text-sm text-h-muted">Didn&apos;t receive a code? <Link href="#">Resend</Link></p>
    </div>
  ),
}
