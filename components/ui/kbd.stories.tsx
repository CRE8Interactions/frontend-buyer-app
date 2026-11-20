import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Kbd, KbdAbbr, KbdContent, KbdGroup } from "./kbd"
import { SearchField } from "./search-field"

const meta = {
  title: "Layout & foundations/Kbd",
  id: "atoms-kbd",
  component: Kbd,
  tags: ["autodocs", "updated"],
  args: { children: "K" },
  argTypes: { variant: { control: "inline-radio", options: ["default", "light"] } },
  parameters: { docs: { description: { component: "the reference Kbd: 24px tall, px-2, 8px radius, 14px medium, default fill, muted text. Use KbdAbbr for modifier keys and KbdContent for the label." } } },
} satisfies Meta<typeof Kbd>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Variants: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Kbd variant="default">Default</Kbd>
      <Kbd variant="light">Light</Kbd>
    </div>
  ),
}
export const WithAbbr: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Kbd><KbdAbbr title="Command">⌘</KbdAbbr><KbdContent>K</KbdContent></Kbd>
      <Kbd><KbdAbbr title="Shift">⇧</KbdAbbr><KbdContent>P</KbdContent></Kbd>
      <Kbd><KbdAbbr title="Option">⌥</KbdAbbr><KbdContent>S</KbdContent></Kbd>
      <Kbd><KbdAbbr title="Control">⌃</KbdAbbr><KbdContent>C</KbdContent></Kbd>
    </div>
  ),
}
export const InlineInText: Story = {
  render: () => (
    <p className="text-sm text-h-foreground">Press <Kbd variant="light"><KbdAbbr title="Command">⌘</KbdAbbr><KbdContent>K</KbdContent></Kbd> to search events.</p>
  ),
}
export const Group: Story = {
  render: () => <KbdGroup><Kbd>Ctrl</Kbd><Kbd>Shift</Kbd><Kbd>P</Kbd></KbdGroup>,
}

const row = (label: string, keys: string[][]) => (
  <div className="flex items-center gap-3"><span className="w-32 text-sm text-h-muted">{label}</span>{keys.map((k, i) => <Kbd key={i} keys={k} />)}</div>
)
export const Shortcuts: Story = {
  parameters: { docs: { description: { story: "Named keys show their symbol and are announced by name. Pass `keys` as a list." } } },
  render: () => (
    <div className="flex flex-col gap-3">
      {row("Copy", [["command", "C"]])}
      {row("Paste", [["command", "V"]])}
      {row("Undo", [["command", "Z"]])}
      {row("Redo", [["command", "shift", "Z"]])}
    </div>
  ),
}
export const NavigationKeys: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {row("Arrow keys", [["up"], ["down"], ["left"], ["right"]])}
      {row("Page navigation", [["pageup"], ["pagedown"], ["home"], ["end"]])}
    </div>
  ),
}
export const SpecialKeys: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {row("Confirm or cancel", [["enter"], ["escape"]])}
      {row("Move between fields", [["tab"], ["shift", "tab"]])}
      {row("Hold to pan", [["space"]])}
    </div>
  ),
}
export const InSearchField: Story = {
  parameters: { docs: { description: { story: "A search field shows its shortcut as separate keycaps, one per key, while it is empty." } } },
  render: () => <div className="w-80"><SearchField aria-label="Search" placeholder="Search" /></div>,
}
