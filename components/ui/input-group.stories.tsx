import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ArrowUp, Copy, MagnifyingGlass } from "@phosphor-icons/react"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea } from "./input-group"
import { Kbd } from "./kbd"

const meta = {
  title: "Forms & inputs/Input group",
  id: "molecules-input-group",
  component: InputGroup,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "Input with addons (icons, text, buttons, shortcuts) at the start, end, top or bottom." } } },
} satisfies Meta<typeof InputGroup>
export default meta
type Story = StoryObj<typeof meta>

export const Search: Story = {
  render: () => (
    <InputGroup className="max-w-sm">
      <InputGroupAddon><MagnifyingGlass weight="bold" /></InputGroupAddon>
      <InputGroupInput placeholder="Search events" />
      <InputGroupAddon align="inline-end"><Kbd>/</Kbd></InputGroupAddon>
    </InputGroup>
  ),
}
export const TextAndButton: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-4">
      <InputGroup>
        <InputGroupAddon><InputGroupText>$</InputGroupText></InputGroupAddon>
        <InputGroupInput placeholder="89.00" />
        <InputGroupAddon align="inline-end"><InputGroupText>USD</InputGroupText></InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput defaultValue="blocktickets.com/e/summer-fest" readOnly />
        <InputGroupAddon align="inline-end"><InputGroupButton><Copy weight="bold" /> Copy</InputGroupButton></InputGroupAddon>
      </InputGroup>
    </div>
  ),
}
export const States: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-4">
      <InputGroup data-disabled="true"><InputGroupInput disabled placeholder="Disabled" /></InputGroup>
      <InputGroup><InputGroupInput aria-invalid defaultValue="not-an-email" /></InputGroup>
    </div>
  ),
}
export const Textarea: Story = {
  render: () => (
    <InputGroup className="max-w-sm">
      <InputGroupTextarea placeholder="Message to the organizer" />
      <InputGroupAddon align="block-end"><InputGroupText>0 / 280</InputGroupText><InputGroupButton className="ml-auto" size="sm" variant="primary">Send<ArrowUp weight="bold" /></InputGroupButton></InputGroupAddon>
    </InputGroup>
  ),
}
