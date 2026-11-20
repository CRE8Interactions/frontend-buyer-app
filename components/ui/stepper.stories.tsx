import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import {
  Bell,
  CalendarBlank,
  CheckCircle,
  Circle,
  CircleNotch,
  Gift,
  Headset,
  LockKey,
  MapPin,
  Package,
  Plugs,
  Rocket,
  ThumbsUp,
  UploadSimple,
  User,
} from "@phosphor-icons/react"
import { Button } from "./button"
import { CopyButton } from "./copy-field"
import {
  Stepper,
  StepperContent,
  StepperDescription,
  StepperIcon,
  StepperIndicator,
  StepperSeparator,
  StepperStep,
  StepperTitle,
  useStepperStep,
} from "./stepper"

/* Each story mirrors one documented example: the same fixed width, the same starting step, the same steps that are
   clickable (the ones with `onStepChange`) and the same ones that are display only. Widths are inline styles so the
   layout never depends on which utility classes the build happened to generate. */
const meta = {
  title: "Navigation & menus/Stepper",
  id: "molecules-stepper",
  component: Stepper,
  tags: ["autodocs", "new"],
  parameters: { docs: { description: { component: "A step-by-step progress indicator, horizontal or vertical, in three sizes. Each step is inactive, active or complete; the circle shows the number, a drawn checkmark when complete, or any icon you put in it. The line between steps fills as steps complete. Steps are display only until `onStepChange` is given, then each is a button. Colours are CSS variables on the root (`--stepper-active-color`, `--stepper-active-fg`, `--stepper-complete-color`, `--stepper-complete-fg`, `--stepper-inactive-border`, `--stepper-inactive-fg`, `--stepper-separator-size`)." } } },
} satisfies Meta<typeof Stepper>
export default meta
type Story = StoryObj<typeof meta>

const noop = () => {}
const w = (px: number): React.CSSProperties => ({ width: px })
const checkout = ["Cart", "Shipping", "Payment", "Confirmation"]
const account = [
  ["Account", "Create your account"],
  ["Profile", "Set up your profile"],
  ["Settings", "Configure preferences"],
  ["Review", "Review and confirm"],
] as const
const accountIcons = [
  ["Account", "Create your account", User],
  ["Settings", "Configure preferences", Bell],
  ["Security", "Security options", LockKey],
  ["Confirm", "Review and confirm", ThumbsUp],
] as const

type RootProps = React.ComponentProps<typeof Stepper>

function Titles({ titles = checkout, ...props }: RootProps & { titles?: readonly string[] }) {
  return (
    <Stepper aria-label="Progress" {...props}>
      {titles.map((t) => (
        <StepperStep key={t}>
          <StepperIndicator />
          <StepperContent><StepperTitle>{t}</StepperTitle></StepperContent>
          <StepperSeparator />
        </StepperStep>
      ))}
    </Stepper>
  )
}

function Described(props: RootProps) {
  return (
    <Stepper aria-label="Progress" {...props}>
      {account.map(([t, d]) => (
        <StepperStep key={t}>
          <StepperIndicator />
          <StepperContent><StepperTitle>{t}</StepperTitle><StepperDescription>{d}</StepperDescription></StepperContent>
          <StepperSeparator />
        </StepperStep>
      ))}
    </Stepper>
  )
}

function WithIconsStepper(props: RootProps) {
  return (
    <Stepper aria-label="Progress" {...props}>
      {accountIcons.map(([t, d, Icon]) => (
        <StepperStep key={t}>
          <StepperIndicator><StepperIcon><Icon weight="fill" size={16} /></StepperIcon></StepperIndicator>
          <StepperContent><StepperTitle>{t}</StepperTitle><StepperDescription>{d}</StepperDescription></StepperContent>
          <StepperSeparator />
        </StepperStep>
      ))}
    </Stepper>
  )
}

const Label = ({ children }: { children: React.ReactNode }) => <span className="text-xs font-medium text-h-muted uppercase">{children}</span>

export const Default: Story = {
  render: () => <div style={w(500)}><Titles defaultStep={1} onStepChange={noop} /></div>,
}

export const WithDescriptions: Story = {
  render: () => <div style={w(600)}><Described defaultStep={1} onStepChange={noop} /></div>,
}

export const WithIcons: Story = {
  render: () => <div style={w(600)}><WithIconsStepper defaultStep={1} onStepChange={noop} /></div>,
}

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-8" style={w(500)}>
      {(["sm", "md", "lg"] as const).map((s) => (
        <div key={s} className="flex flex-col gap-2">
          <Label>{s}</Label>
          <Titles size={s} defaultStep={1} />
        </div>
      ))}
    </div>
  ),
}

export const Vertical: Story = {
  render: () => <div style={w(320)}><Described orientation="vertical" defaultStep={1} onStepChange={noop} /></div>,
}

export const VerticalSizes: Story = {
  render: () => (
    <div className="flex items-start gap-12">
      {(["sm", "md", "lg"] as const).map((s) => (
        <div key={s} className="flex flex-col gap-2">
          <Label>{s}</Label>
          <Described size={s} orientation="vertical" defaultStep={1} />
        </div>
      ))}
    </div>
  ),
}

export const VerticalWithIcons: Story = {
  render: () => <div style={w(320)}><WithIconsStepper orientation="vertical" defaultStep={2} onStepChange={noop} /></div>,
}

export const Controlled: Story = {
  parameters: { docs: { description: { story: "Click a step, or use Previous and Next. The counter and buttons follow the current step." } } },
  render: () => {
    const [step, setStep] = React.useState(0)
    const last = account.length - 1
    return (
      <div className="flex flex-col gap-6" style={w(600)}>
        <Described currentStep={step} onStepChange={setStep} />
        <div className="flex items-center justify-between">
          <Button size="sm" variant="ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Previous</Button>
          <span className="text-sm text-h-muted">Step {step + 1} of {account.length}</span>
          <Button size="sm" disabled={step === last} onClick={() => setStep((s) => Math.min(last, s + 1))}>Next</Button>
        </div>
      </div>
    )
  },
}

export const ControlledVertical: Story = {
  parameters: { docs: { description: { story: "The steps sit beside a panel for the current step; Back and Continue move through them." } } },
  render: () => {
    const [step, setStep] = React.useState(0)
    const last = account.length - 1
    return (
      <div className="flex gap-8" style={w(640)}>
        <div style={w(200)} className="shrink-0">
          <Described orientation="vertical" currentStep={step} onStepChange={setStep} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-col gap-2 rounded-[16px] bg-h-surface p-5 shadow-h-surface">
            <h3 className="text-base font-semibold text-h-foreground">{account[step][0]}</h3>
            <p className="text-sm text-h-muted">{account[step][1]}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</Button>
            <Button size="sm" disabled={step === last} onClick={() => setStep((s) => Math.min(last, s + 1))}>Continue</Button>
          </div>
        </div>
      </div>
    )
  },
}

export const DisplayOnly: Story = {
  parameters: { docs: { description: { story: "Without `onStepChange` the steps are not buttons: no hover, no focus stop, nothing to click." } } },
  render: () => (
    <div className="flex flex-col gap-8" style={w(500)}>
      <Titles defaultStep={2} />
      <div style={w(280)}><Described orientation="vertical" defaultStep={2} /></div>
    </div>
  ),
}

function Bullet() {
  return <StepperIcon><Circle weight="fill" size={16} /></StepperIcon>
}
function BulletStepper({ titles, descriptions, ...props }: RootProps & { titles: readonly string[]; descriptions?: readonly string[] }) {
  return (
    <Stepper aria-label="Progress" {...props}>
      {titles.map((t, i) => (
        <StepperStep key={t}>
          <StepperIndicator><Bullet /></StepperIndicator>
          <StepperContent><StepperTitle>{t}</StepperTitle>{descriptions ? <StepperDescription>{descriptions[i]}</StepperDescription> : null}</StepperContent>
          <StepperSeparator />
        </StepperStep>
      ))}
    </Stepper>
  )
}
export const BulletSteps: Story = {
  parameters: { docs: { description: { story: "A small dot in the indicator instead of the number. It replaces the checkmark too." } } },
  render: () => (
    <div className="flex flex-col gap-8" style={w(500)}>
      <BulletStepper titles={checkout} defaultStep={1} onStepChange={noop} />
      <div style={w(280)}><BulletStepper orientation="vertical" titles={account.map((a) => a[0])} descriptions={account.map((a) => a[1])} defaultStep={1} onStepChange={noop} /></div>
    </div>
  ),
}

function CustomCompleted({ titles, descriptions, ...props }: RootProps & { titles: readonly string[]; descriptions?: readonly string[] }) {
  return (
    <Stepper aria-label="Progress" {...props}>
      {titles.map((t, i) => (
        <StepperStep key={t}>
          {({ status, index }) => (
            <>
              <StepperIndicator>
                {status === "complete" ? <StepperIcon><CheckCircle weight="fill" size={16} /></StepperIcon> : <span>{index + 1}</span>}
              </StepperIndicator>
              <StepperContent><StepperTitle>{t}</StepperTitle>{descriptions ? <StepperDescription>{descriptions[i]}</StepperDescription> : null}</StepperContent>
              <StepperSeparator />
            </>
          )}
        </StepperStep>
      ))}
    </Stepper>
  )
}
export const CustomCompletedIcon: Story = {
  parameters: { docs: { description: { story: "Your own icon for completed steps; the number stays for the rest." } } },
  render: () => (
    <div className="flex flex-col gap-8" style={w(500)}>
      <CustomCompleted titles={checkout} defaultStep={2} onStepChange={noop} />
      <div style={w(280)}><CustomCompleted orientation="vertical" titles={account.map((a) => a[0])} descriptions={account.map((a) => a[1])} defaultStep={2} onStepChange={noop} /></div>
    </div>
  ),
}

function StatusIcon({ icons }: { icons: Record<"inactive" | "active" | "complete", React.ReactNode> }) {
  const { status } = useStepperStep()
  return <StepperIcon>{icons[status]}</StepperIcon>
}
export const DynamicIcon: Story = {
  parameters: { docs: { description: { story: "`useStepperStep` gives any child the step's `index`, `status` and `isLast`, so an icon can change with the status." } } },
  render: () => (
    <div style={w(500)}>
      <Stepper defaultStep={1} onStepChange={noop} aria-label="Upload progress">
        {[
          ["Upload", UploadSimple],
          ["Process", CircleNotch],
          ["Complete", Package],
        ].map(([t, Icon]) => {
          const I = Icon as typeof UploadSimple
          return (
            <StepperStep key={t as string}>
              <StepperIndicator>
                <StatusIcon icons={{ complete: <CheckCircle weight="fill" size={16} />, active: <I weight="bold" size={16} className={t === "Process" ? "animate-spin motion-reduce:animate-none" : undefined} />, inactive: <I weight="fill" size={16} /> }} />
              </StepperIndicator>
              <StepperContent><StepperTitle>{t as string}</StepperTitle></StepperContent>
              <StepperSeparator />
            </StepperStep>
          )
        })}
      </Stepper>
    </div>
  ),
}

export const RenderFunction: Story = {
  parameters: { docs: { description: { story: "A step's children can be a function of `{ index, status, isLast }`." } } },
  render: () => (
    <div style={w(280)}>
      <Stepper orientation="vertical" defaultStep={1} onStepChange={noop} aria-label="Progress">
        {account.map(([t, d]) => (
          <StepperStep key={t}>
            {({ status }) => (
              <>
                <StepperIndicator><Bullet /></StepperIndicator>
                <StepperContent>
                  <StepperTitle>{t}</StepperTitle>
                  <StepperDescription>{status === "complete" ? "Completed" : status === "active" ? "In progress" : d}</StepperDescription>
                </StepperContent>
                <StepperSeparator />
              </>
            )}
          </StepperStep>
        ))}
      </Stepper>
    </div>
  ),
}

const tone = (color: string, fg: string, onColor: string) =>
  ({ "--stepper-active-color": color, "--stepper-active-fg": fg, "--stepper-complete-color": color, "--stepper-complete-fg": onColor }) as React.CSSProperties
const tones: [string, React.CSSProperties | undefined][] = [
  ["Accent (default)", undefined],
  ["Success", tone("var(--h-success)", "var(--h-success-soft-foreground)", "var(--h-success-foreground)")],
  ["Danger", tone("var(--h-danger)", "var(--h-danger-text)", "var(--h-danger-foreground)")],
  ["Warning", tone("var(--h-warning)", "var(--h-warning-soft-foreground)", "var(--h-warning-foreground)")],
  ["Inverted", tone("var(--h-foreground)", "var(--h-foreground)", "var(--h-background)")],
]

export const CustomColor: Story = {
  parameters: { docs: { description: { story: "Colours are CSS variables on the root, set here with an inline style. Display only, two steps done." } } },
  render: () => (
    <div className="flex flex-col gap-6" style={w(500)}>
      {tones.map(([label, style]) => (
        <div key={label} className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-h-muted">{label}</span>
          <Titles defaultStep={2} style={style} />
        </div>
      ))}
    </div>
  ),
}

export const CustomColorVertical: Story = {
  render: () => (
    <div className="flex gap-10">
      {tones.filter(([l]) => l !== "Warning").map(([label, style]) => (
        <div key={label} className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-h-muted">{label.replace(" (default)", "")}</span>
          <Described orientation="vertical" defaultStep={2} style={style} />
        </div>
      ))}
    </div>
  ),
}

const inverted = tones[4][1]
const trial = [
  [Gift, "Today", "Get instant access to all premium features, no credit card required."],
  [Bell, "In 12 days", "We'll send you a friendly reminder that your trial is wrapping up."],
  [CalendarBlank, "In 14 days", "Your plan activates automatically. Cancel anytime before, no questions asked."],
] as const
export const FreeTrialTimeline: Story = {
  render: () => (
    <div style={w(340)}>
      <h3 className="mb-5 text-lg font-bold text-h-foreground">Start your 14-day free trial</h3>
      <Stepper orientation="vertical" size="lg" defaultStep={0} style={inverted} aria-label="Trial timeline">
        {trial.map(([Icon, t, d]) => (
          <StepperStep key={t}>
            <StepperIndicator><StepperIcon><Icon weight="fill" size={16} /></StepperIcon></StepperIndicator>
            <StepperContent><StepperTitle>{t}</StepperTitle><StepperDescription>{d}</StepperDescription></StepperContent>
            <StepperSeparator />
          </StepperStep>
        ))}
      </Stepper>
    </div>
  ),
}

const onboarding = [
  [User, "Account created", "Your workspace is ready. Invite your team whenever you're set."],
  [Plugs, "Set up integrations", "Connect your tools, such as Slack, GitHub and Figma, to keep everything in sync."],
  [Rocket, "Create a project", "Launch your first project and see the magic happen."],
] as const
export const OnboardingTimeline: Story = {
  render: () => (
    <div style={w(340)}>
      <h3 className="mb-5 text-lg font-bold text-h-foreground">Getting started</h3>
      <Stepper orientation="vertical" size="lg" defaultStep={1} aria-label="Onboarding">
        {onboarding.map(([Icon, t, d]) => (
          <StepperStep key={t}>
            <StepperIndicator><StepperIcon><Icon weight="fill" size={16} /></StepperIcon></StepperIndicator>
            <StepperContent><StepperTitle>{t}</StepperTitle><StepperDescription>{d}</StepperDescription></StepperContent>
            <StepperSeparator />
          </StepperStep>
        ))}
      </Stepper>
    </div>
  ),
}

const tracking = [
  ["Order Placed", "Payment verified successfully", "Mar 28, 10:45 AM"],
  ["Shipment Picked Up", "Picked up from warehouse", "Mar 29, 03:12 PM"],
  ["In Transit", "Cleared customs in Leipzig, DE", "Mar 31, 07:30 AM"],
  ["Out for Delivery", "Pending", "--"],
  ["Delivered", "Pending", "--"],
] as const
export const PackageTracking: Story = {
  parameters: { docs: { description: { story: "A card with a display-only vertical stepper. The step's time sits beside its content inside the step, the current step's title and time take the accent colour, and its line is part filled with `progress`." } } },
  render: () => <TrackingCard />,
}

const TRACKING_NUMBER = "1Z 849 FL2 0347"
function TrackingCard() {
  return (
    <div className="rounded-[16px] bg-h-surface p-6 shadow-h-surface" style={w(420)}>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-medium tracking-wide text-h-muted">Order #DHL-472891</span>
        <span className="rounded-full bg-h-info-soft px-2.5 py-0.5 text-[11px] font-medium text-h-info-soft-foreground">In Transit</span>
      </div>
      <h2 className="text-[22px] leading-tight font-bold text-h-foreground">Arriving Wednesday</h2>
      <p className="mb-5 text-sm text-h-muted">Estimated delivery by 6:00 PM</p>
      <div className="mb-6 flex items-center gap-3 rounded-[12px] bg-h-default px-3.5 py-3">
        <div className="flex size-10 items-center justify-center rounded-[8px] bg-h-surface text-h-muted"><Package weight="bold" className="size-4" /></div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold text-h-foreground">DHL Express</span>
          <span className="text-xs text-h-muted">TRK: {TRACKING_NUMBER}</span>
        </div>
        <CopyButton value={TRACKING_NUMBER} />
      </div>
      <Stepper orientation="vertical" defaultStep={2} aria-label="Progress" className="px-1">
        {tracking.map(([t, d, time], i) => (
          <StepperStep key={t}>
            {({ status }) => (
              <>
                <StepperIndicator>
                  {status === "inactive" ? <></> : status === "active" ? <StepperIcon><Circle weight="fill" size={16} /></StepperIcon> : undefined}
                </StepperIndicator>
                <StepperContent className="flex-1">
                  <StepperTitle style={status === "active" ? { color: "var(--stepper-active-color)" } : undefined}>{t}</StepperTitle>
                  <StepperDescription>{d}</StepperDescription>
                </StepperContent>
                <span className={status === "active" ? "shrink-0 text-right text-[11px] font-medium whitespace-nowrap" : "shrink-0 text-right text-[11px] whitespace-nowrap text-h-muted"} style={status === "active" ? { color: "var(--stepper-active-color)" } : undefined}>{time}</span>
                <StepperSeparator progress={i === 2 ? 0.4 : undefined} />
              </>
            )}
          </StepperStep>
        ))}
      </Stepper>
      <div className="mt-6 flex gap-3">
        <Button size="sm" className="flex-1"><MapPin weight="bold" /> Live Map Tracking</Button>
        <Button size="sm" variant="outline" className="flex-1"><Headset weight="bold" /> Support</Button>
      </div>
    </div>
  )
}
