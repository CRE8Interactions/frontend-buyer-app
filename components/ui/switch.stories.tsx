import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { SunIcon, MoonIcon, CheckIcon, XIcon } from "@phosphor-icons/react"
import { Switch, SwitchGroup } from "./switch"

const meta = {
  title: "Forms & inputs/Switch",
  id: "atoms-switch",
  component: Switch,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "the reference switch on Radix. Sizes sm/md/lg, label, description, thumb icons, disabled, controlled, SwitchGroup." } } },
} satisfies Meta<typeof Switch>
export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = { args: { label: "Ticket alerts" } }
export const WithDescription: Story = {
  args: { label: "Resale marketplace", description: "Let fans buy and sell tickets for your events.", defaultChecked: true },
}
export const Sizes: Story = {
  render: () => (
    <div className="grid gap-4">
      {(["sm", "md", "lg"] as const).map((s) => (
        <div key={s} className="flex items-center gap-6">
          <Switch size={s} label={`Size ${s}`} />
          <Switch size={s} label="On" defaultChecked />
        </div>
      ))}
    </div>
  ),
}
export const Disabled: Story = {
  render: () => (
    <div className="grid gap-4">
      <Switch label="Disabled off" disabled />
      <Switch label="Disabled on" disabled defaultChecked />
    </div>
  ),
}
export const WithThumbIcon: Story = {
  render: () => (
    <div className="grid gap-4">
      <Switch size="lg" thumbIcon={<SunIcon size={12} weight="bold" />} thumbIconChecked={<MoonIcon size={12} weight="bold" />} label="Theme" />
      <Switch size="lg" defaultChecked thumbIcon={<XIcon size={10} weight="bold" />} thumbIconChecked={<CheckIcon size={10} weight="bold" />} label="Check-in open" />
    </div>
  ),
}
export const Controlled: Story = {
  render: function Render() {
    const [on, setOn] = React.useState(false)
    return (
      <div className="grid gap-2">
        <Switch checked={on} onCheckedChange={setOn} label="Publish event" />
        <p className="text-xs text-h-muted">{on ? "Live" : "Draft"}</p>
      </div>
    )
  },
}
export const Group: Story = {
  render: () => (
    <SwitchGroup>
      <Switch label="Order confirmations" defaultChecked />
      <Switch label="Event reminders" defaultChecked />
      <Switch label="Marketing emails" />
    </SwitchGroup>
  ),
}
export const GroupHorizontal: Story = {
  render: () => (
    <SwitchGroup orientation="horizontal">
      <Switch label="Email" defaultChecked />
      <Switch label="SMS" />
      <Switch label="Push" />
    </SwitchGroup>
  ),
}
