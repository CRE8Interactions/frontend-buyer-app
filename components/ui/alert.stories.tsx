import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { CheckCircle, Info, Warning, WarningCircle, Ticket } from "@phosphor-icons/react"
import { Alert, AlertContent, AlertDescription, AlertIndicator, AlertTitle } from "./alert"
import { Button } from "./button"
import { CloseButton } from "./close-button"
import { Spinner } from "./spinner"

const meta = {
  title: "Feedback/Alert",
  id: "molecules-alert",
  component: Alert,
  tags: ["autodocs"],
  argTypes: { variant: { control: "select", options: ["default", "accent", "success", "warning", "danger", "info", "purple"] } },
  parameters: { docs: { description: { component: "Inline message for the page or form it sits in. The icon and title take the variant colour, the description stays muted. Compose as Alert > AlertIndicator + AlertContent > AlertTitle + AlertDescription." } } },
} satisfies Meta<typeof Alert>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => (
    <Alert {...args} className="max-w-lg">
      <AlertIndicator><Info weight="bold" /></AlertIndicator>
      <AlertContent>
        <AlertTitle>Doors open at 19:00</AlertTitle>
        <AlertDescription>Bring your ticket QR code and a photo ID to Section 112.</AlertDescription>
      </AlertContent>
    </Alert>
  ),
}
export const Variants: Story = {
  render: () => (
    <div className="flex max-w-lg flex-col gap-3">
      <Alert variant="default"><AlertIndicator><Info weight="bold" /></AlertIndicator><AlertContent><AlertTitle>Doors open at 19:00</AlertTitle><AlertDescription>Bring your ticket QR code and a photo ID to Section 112.</AlertDescription></AlertContent></Alert>
      <Alert variant="accent"><AlertIndicator><Ticket weight="bold" /></AlertIndicator><AlertContent><AlertTitle>Presale is open</AlertTitle><AlertDescription>Use the code from your email before it ends tonight.</AlertDescription></AlertContent></Alert>
      <Alert variant="success"><AlertIndicator><CheckCircle weight="bold" /></AlertIndicator><AlertContent><AlertTitle>Order confirmed</AlertTitle><AlertDescription>Your tickets are in your wallet.</AlertDescription></AlertContent></Alert>
      <Alert variant="warning"><AlertIndicator><Warning weight="bold" /></AlertIndicator><AlertContent><AlertTitle>Only 12 tickets left for Saturday</AlertTitle><AlertDescription>Prices may change as the date gets closer.</AlertDescription></AlertContent></Alert>
      <Alert variant="danger"><AlertIndicator><WarningCircle weight="bold" /></AlertIndicator><AlertContent><AlertTitle>Payment declined</AlertTitle><AlertDescription>Your seats in Row F are held for 8 more minutes. Try another card to keep them.</AlertDescription></AlertContent></Alert>
      <Alert variant="info"><AlertIndicator><Info weight="bold" /></AlertIndicator><AlertContent><AlertTitle>New date announced</AlertTitle><AlertDescription>Your tickets stay valid for 14 March.</AlertDescription></AlertContent></Alert>
      <Alert variant="purple"><AlertIndicator><Ticket weight="bold" /></AlertIndicator><AlertContent><AlertTitle>VIP upgrade available</AlertTitle><AlertDescription>Upgrade this order for the lounge and early entry.</AlertDescription></AlertContent></Alert>
    </div>
  ),
}
export const TitleOnly: Story = {
  render: () => (
    <Alert variant="warning" className="max-w-lg"><AlertIndicator><Warning weight="bold" /></AlertIndicator><AlertContent><AlertTitle>Only 12 tickets left for Saturday</AlertTitle></AlertContent></Alert>
  ),
}
export const WithoutIcon: Story = {
  render: () => (
    <Alert className="max-w-lg">
      <AlertContent>
        <AlertTitle>Resale window closes Friday</AlertTitle>
        <AlertDescription>List your tickets before 18:00 to keep your payout date.</AlertDescription>
      </AlertContent>
    </Alert>
  ),
}
export const WithAction: Story = {
  render: () => (
    <Alert variant="danger" className="max-w-lg items-center">
      <AlertIndicator><WarningCircle weight="bold" /></AlertIndicator>
      <AlertContent>
        <AlertTitle>Payment declined</AlertTitle>
        <AlertDescription>Try another card to keep your seats.</AlertDescription>
      </AlertContent>
      <Button size="sm" variant="danger-soft">Retry</Button>
    </Alert>
  ),
}

const wrapper = "flex w-full max-w-xl flex-col gap-4"
export const Examples: Story = {
  parameters: { docs: { description: { story: "The common compositions: plain message, message with an action, a list in the description, dismissible, a spinner as the indicator, and a long description. An empty indicator shows the variant's own icon." } } },
  render: () => (
    <div className={wrapper}>
      <Alert>
        <AlertIndicator />
        <AlertContent>
          <AlertTitle>New features available</AlertTitle>
          <AlertDescription>Check out our latest updates including dark mode support and improved accessibility features.</AlertDescription>
        </AlertContent>
      </Alert>
      <Alert variant="accent">
        <AlertIndicator />
        <AlertContent>
          <AlertTitle>Update available</AlertTitle>
          <AlertDescription>A new version of the application is available. Please refresh to get the latest features and bug fixes.</AlertDescription>
        </AlertContent>
        <Button variant="primary">Refresh</Button>
      </Alert>
      <Alert variant="danger">
        <AlertIndicator />
        <AlertContent>
          <AlertTitle>Unable to connect to server</AlertTitle>
          <AlertDescription>
            We&apos;re experiencing connection issues. Please try the following:
            <ul className="mt-2 list-inside list-disc space-y-1 ps-1">
              <li>Check your internet connection</li>
              <li>Refresh the page</li>
              <li>Clear your browser cache</li>
            </ul>
          </AlertDescription>
        </AlertContent>
        <Button variant="danger">Retry</Button>
      </Alert>
      <Alert variant="success" className="items-center">
        <AlertIndicator />
        <AlertContent>
          <AlertTitle>Profile updated successfully</AlertTitle>
        </AlertContent>
        <CloseButton />
      </Alert>
      <Alert>
        <AlertIndicator><Spinner size="sm" /></AlertIndicator>
        <AlertContent>
          <AlertTitle>Processing your request</AlertTitle>
          <AlertDescription>Please wait while we sync your data. This may take a few moments.</AlertDescription>
        </AlertContent>
      </Alert>
      <Alert variant="warning">
        <AlertIndicator />
        <AlertContent>
          <AlertTitle>Scheduled maintenance</AlertTitle>
          <AlertDescription>Our services will be unavailable on Sunday, March 15th from 2:00 AM to 6:00 AM UTC for scheduled maintenance.</AlertDescription>
        </AlertContent>
      </Alert>
    </div>
  ),
}
