import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Button } from "./button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card"

const meta = {
  title: "Display & content/Card",
  id: "molecules-card",
  component: Card,
  tags: ["autodocs"],
  argTypes: { variant: { control: "select", options: ["transparent", "default", "secondary", "tertiary", "feature"] } },
  parameters: { docs: { description: { component: "the reference card: 16px padding, 12px gap, 24px radius, surface fill. Variants transparent, default, secondary and tertiary step through the surface fills. Our change: the title is 18px (the reference uses 14px) and body text is 14px. The feature variant is our dark card, one per view." } } },
} satisfies Meta<typeof Card>
export default meta
type Story = StoryObj<typeof meta>

const body = (
  <>
    <CardHeader>
      <CardTitle>Know your fans</CardTitle>
      <CardDescription>Track attendance, purchasing behavior and renewals in one place.</CardDescription>
      <CardAction><Button size="sm" variant="outline">Edit</Button></CardAction>
    </CardHeader>
    <CardContent>1,240 tickets sold this season.</CardContent>
    <CardFooter><Button size="sm">See how it works</Button></CardFooter>
  </>
)
export const Default: Story = { render: (args) => <Card {...args} className="max-w-sm">{body}</Card> }
export const Feature: Story = { args: { variant: "feature" }, render: (args) => <Card {...args} className="max-w-sm">{body}</Card> }

export const Variants: Story = {
  render: () => (
    <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
      {(["transparent", "default", "secondary", "tertiary"] as const).map((v) => (
        <Card key={v} variant={v}>
          <CardHeader>
            <CardTitle className="capitalize">{v}</CardTitle>
            <CardDescription>Section 112, row F. 14 seats left from $142 each.</CardDescription>
          </CardHeader>
          <CardContent>Doors open at 6:30 pm.</CardContent>
        </Card>
      ))}
    </div>
  ),
}
export const TypeScale: Story = {
  render: () => (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Title, 18px / 28px, medium</CardTitle>
        <CardDescription>Description, 14px / 20px, muted.</CardDescription>
      </CardHeader>
      <CardContent>Body, 14px / 20px.</CardContent>
    </Card>
  ),
}
