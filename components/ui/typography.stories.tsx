import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Prose, Typography } from "./typography"

const meta = {
  title: "Layout & foundations/Typography",
  id: "atoms-typography",
  component: Typography,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "Named text styles from one scale: six headings, three body sizes and inline code. `as` picks the element so the look and the page outline can differ. `Prose` styles plain HTML from the same scale for CMS and markdown content." } } },
} satisfies Meta<typeof Typography>
export default meta
type Story = StoryObj<typeof meta>

export const Scale: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Typography variant="h1">Heading 1</Typography>
      <Typography variant="h2">Heading 2</Typography>
      <Typography variant="h3">Heading 3</Typography>
      <Typography variant="h4">Heading 4</Typography>
      <Typography variant="h5">Heading 5</Typography>
      <Typography variant="h6">Heading 6</Typography>
      <Typography variant="body">Body: doors open at seven and the show starts at eight.</Typography>
      <Typography variant="body-sm">Body small: bring your ticket QR code.</Typography>
      <Typography variant="body-xs" color="muted">Body extra small: prices include fees.</Typography>
      <Typography>Use <Typography variant="code" as="code">npm run dev</Typography> to start.</Typography>
    </div>
  ),
}
export const ElementAndLook: Story = {
  parameters: { docs: { description: { story: "A heading look on a different element: the style is `h3`, the outline level is `h2`." } } },
  render: () => <Typography variant="h3" as="h2">Looks like an h3, is an h2</Typography>,
}
export const AlignmentAndColour: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-2">
      <Typography align="start">Start aligned</Typography>
      <Typography align="center">Centre aligned</Typography>
      <Typography align="end">End aligned</Typography>
      <Typography color="muted">Muted colour</Typography>
      <Typography weight="bold">Bold weight</Typography>
    </div>
  ),
}
export const Truncate: Story = {
  render: () => <div className="w-48"><Typography truncate>A very long event name that does not fit on one line</Typography></div>,
}
export const ProseContent: Story = {
  parameters: { docs: { description: { story: "Plain HTML styled from the scale." } } },
  render: () => (
    <Prose className="max-w-md">
      <h2>Refund policy</h2>
      <p>Tickets are <strong>refundable</strong> up to 48 hours before the event. Read the <a href="#">full terms</a> before you buy.</p>
      <ul><li>Request a refund from your wallet</li><li>Refunds arrive in 5 to 10 days</li></ul>
      <blockquote>Fees are not refunded after the event starts.</blockquote>
      <p>Order reference: <code>ORD-48210</code></p>
    </Prose>
  ),
}
