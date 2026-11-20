import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import * as React from "react"
import { TextB, TextItalic, TextStrikethrough, TextUnderline } from "@phosphor-icons/react"
import { ToggleGroup, ToggleGroupItem } from "./toggle-group"

const meta = {
  title: "Actions/Toggle group",
  id: "molecules-toggle-group",
  component: ToggleGroup,
  args: { type: "single" },
  tags: ["autodocs", "updated"],
  parameters: { docs: { description: { component: "Groups several toggles into one control. type=single is mutually exclusive (a segmented control); type=multiple lets each toggle be on independently. Items are attached with a thin divider; detached separates them with gaps and separator={false} drops the dividers. The selected item takes the soft accent tint." } } },
} satisfies Meta<typeof ToggleGroup>
export default meta
type Story = StoryObj<typeof meta>

const fmt = (
  <>
    <ToggleGroupItem value="bold" iconOnly aria-label="Bold"><TextB weight="bold" /></ToggleGroupItem>
    <ToggleGroupItem value="italic" iconOnly aria-label="Italic"><TextItalic weight="bold" /></ToggleGroupItem>
    <ToggleGroupItem value="underline" iconOnly aria-label="Underline"><TextUnderline weight="bold" /></ToggleGroupItem>
    <ToggleGroupItem value="strike" iconOnly aria-label="Strikethrough"><TextStrikethrough weight="bold" /></ToggleGroupItem>
  </>
)
const words = (
  <>
    <ToggleGroupItem value="first">First</ToggleGroupItem>
    <ToggleGroupItem value="second">Second</ToggleGroupItem>
    <ToggleGroupItem value="third">Third</ToggleGroupItem>
  </>
)

export const Basic: Story = {
  render: () => <ToggleGroup type="multiple" aria-label="Text formatting">{fmt}</ToggleGroup>,
}
export const Sizes: Story = {
  render: () => (
    <div className="grid gap-4">
      {(["sm", "md", "lg"] as const).map((s) => <ToggleGroup key={s} type="multiple" size={s} aria-label={`Text formatting ${s}`}>{fmt}</ToggleGroup>)}
    </div>
  ),
}
export const Orientation: Story = {
  render: () => (
    <div className="flex items-start gap-8">
      <ToggleGroup type="multiple" orientation="horizontal" aria-label="Horizontal">{fmt}</ToggleGroup>
      <ToggleGroup type="multiple" orientation="vertical" aria-label="Vertical">{fmt}</ToggleGroup>
    </div>
  ),
}
export const FullWidth: Story = {
  render: () => <div className="w-96"><ToggleGroup type="single" fullWidth defaultValue="first" aria-label="Full width">{words}</ToggleGroup></div>,
}
export const Disabled: Story = {
  render: () => <ToggleGroup type="multiple" disabled defaultValue={["bold"]} aria-label="Disabled">{fmt}</ToggleGroup>,
}
export const WithoutSeparator: Story = {
  render: () => <ToggleGroup type="multiple" separator={false} aria-label="No separators">{fmt}</ToggleGroup>,
}
export const Detached: Story = {
  render: () => <ToggleGroup type="multiple" detached aria-label="Detached">{fmt}</ToggleGroup>,
}
export const SelectionMode: Story = {
  parameters: { docs: { description: { story: "`type=\"single\"` for mutually exclusive choices, `type=\"multiple\"` for independent toggles. `disallowEmptySelection` keeps one option on in single mode." } } },
  render: () => (
    <div className="grid gap-4">
      <ToggleGroup type="single" defaultValue="first" aria-label="Single">{words}</ToggleGroup>
      <ToggleGroup type="single" defaultValue="first" disallowEmptySelection aria-label="Single, never empty">{words}</ToggleGroup>
      <ToggleGroup type="multiple" defaultValue={["first", "third"]} aria-label="Multiple">{words}</ToggleGroup>
    </div>
  ),
}
function ControlledDemo() {
  const [value, setValue] = React.useState<string[]>(["bold"])
  return (
    <div className="grid gap-3">
      <ToggleGroup type="multiple" value={value} onValueChange={setValue} aria-label="Controlled">{fmt}</ToggleGroup>
      <p className="text-sm text-h-muted">Selected: {value.length ? value.join(", ") : "none"}</p>
    </div>
  )
}
export const Controlled: Story = { render: () => <ControlledDemo /> }
export const NeutralTone: Story = {
  parameters: { docs: { description: { story: "`tone=\"neutral\"` swaps the accent tint for a plain lighter pill, for page chrome such as theme switches. The default stays the accent." } } },
  render: () => <ToggleGroup type="single" tone="neutral" defaultValue="second" aria-label="Neutral">{words}</ToggleGroup>,
}
