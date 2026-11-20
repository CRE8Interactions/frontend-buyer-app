import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { MapPin } from "@phosphor-icons/react"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { Autocomplete, type AutocompleteItem } from "./autocomplete"

const meta = {
  title: "Select & pickers/Autocomplete",
  id: "molecules-autocomplete",
  component: Autocomplete,
  tags: ["autodocs"],
  parameters: { docs: { story: { inline: false, iframeHeight: 460 }, description: { component: "A field that opens a searchable list: type to filter a long list, then choose. Single choice closes the list; multiple keeps it open. The 16px option corners sit 6px inside the 22px popover." } } },
} satisfies Meta<typeof Autocomplete>
export default meta
type Story = StoryObj<typeof meta>

const venues: AutocompleteItem[] = [
  { value: "arena", label: "Harbour Arena", description: "Lisbon · 12,000 seats" },
  { value: "stadium", label: "Riverside Stadium", description: "Porto · 38,000 seats" },
  { value: "theatre", label: "Grand Theatre", description: "Lisbon · 1,200 seats" },
  { value: "park", label: "Central Park Stage", description: "Faro · open air" },
  { value: "club", label: "Blue Room", description: "Porto · 400 standing", disabled: true },
  { value: "hall", label: "City Hall", description: "Braga · 2,000 seats" },
]

export const Basic: Story = {
  args: { items: venues, label: "Venue", placeholder: "Choose a venue", description: "Where is your event?" },
  render: (args) => <div className="w-72"><Autocomplete {...args} fullWidth /></div>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("combobox", { name: "Venue" })
    await userEvent.click(trigger)
    const body = within(document.body)
    await waitFor(() => expect(body.getByRole("searchbox")).toBeInTheDocument())
    await userEvent.type(body.getByRole("searchbox"), "grand")
    await userEvent.click(await body.findByRole("option", { name: /grand theatre/i }))
    await waitFor(() => expect(trigger).toHaveTextContent("Grand Theatre"))
  },
}
export const Multiple: Story = {
  args: { items: venues, label: "Venues", selectionMode: "multiple", defaultValue: ["arena", "park"], placeholder: "Choose venues" },
  render: (args) => <div className="w-72"><Autocomplete {...args} fullWidth /></div>,
}
export const WithIcons: Story = {
  args: { items: venues.map((v) => ({ ...v, icon: <MapPin weight="bold" /> })), label: "Venue", placeholder: "Choose a venue" },
  render: (args) => <div className="w-72"><Autocomplete {...args} fullWidth /></div>,
}
export const Secondary: Story = {
  parameters: { docs: { description: { story: "The stronger fill, for a field on a card." } } },
  args: { items: venues, placeholder: "Choose a venue", variant: "secondary", "aria-label": "Venue" },
  render: (args) => <div className="w-72 rounded-3xl bg-h-surface p-4"><Autocomplete {...args} fullWidth /></div>,
}
export const Invalid: Story = {
  args: { items: venues, label: "Venue", isInvalid: true, errorMessage: "Choose a venue to continue.", description: "Where is your event?" },
  render: (args) => <div className="w-72"><Autocomplete {...args} fullWidth /></div>,
}
export const Disabled: Story = {
  args: { items: venues, label: "Venue", isDisabled: true, defaultValue: "arena" },
  render: (args) => <div className="w-72"><Autocomplete {...args} fullWidth /></div>,
}
function ControlledDemo() {
  const [v, setV] = React.useState<string>("stadium")
  return (
    <div className="flex w-72 flex-col gap-2">
      <Autocomplete items={venues} label="Venue" value={v} onChange={(n) => setV(n as string)} fullWidth />
      <p className="text-sm text-h-muted">Selected: <span className="font-medium text-h-foreground">{venues.find((x) => x.value === v)?.label ?? "none"}</span></p>
    </div>
  )
}
export const Controlled: Story = { args: { items: venues }, render: () => <ControlledDemo /> }
