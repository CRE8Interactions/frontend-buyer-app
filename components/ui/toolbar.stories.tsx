import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { TextB, TextItalic, TextUnderline, TextAlignLeft, TextAlignCenter, TextAlignRight, Link as LinkIcon } from "@phosphor-icons/react"
import { Button } from "./button"
import { ButtonGroup, ButtonGroupSeparator as Sep } from "./button-group"
import { Toolbar, ToolbarItem, ToolbarSeparator } from "./toolbar"

const meta = {
  title: "Actions/Toolbar",
  id: "molecules-toolbar",
  component: Toolbar,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "A group of related controls that is one tab stop: Tab enters it once and the arrow keys move between the buttons. Use it for editor controls, table actions and floating action bars." } } },
} satisfies Meta<typeof Toolbar>
export default meta
type Story = StoryObj<typeof meta>

const icon = (label: string, node: React.ReactNode) => (
  <ToolbarItem asChild><Button iconOnly variant="tertiary" aria-label={label}>{node}</Button></ToolbarItem>
)
export const Horizontal: Story = {
  render: () => (
    <Toolbar aria-label="Text formatting">
      {icon("Bold", <TextB weight="bold" />)}
      {icon("Italic", <TextItalic weight="bold" />)}
      {icon("Underline", <TextUnderline weight="bold" />)}
      <ToolbarSeparator />
      {icon("Link", <LinkIcon weight="bold" />)}
    </Toolbar>
  ),
}
export const Attached: Story = {
  parameters: { docs: { description: { story: "A floating bar: surface fill, 24px corners, overlay shadow." } } },
  render: () => (
    <Toolbar variant="attached" aria-label="Text formatting">
      {icon("Bold", <TextB weight="bold" />)}
      {icon("Italic", <TextItalic weight="bold" />)}
      {icon("Underline", <TextUnderline weight="bold" />)}
      <ToolbarSeparator />
      {icon("Align left", <TextAlignLeft weight="bold" />)}
      {icon("Align centre", <TextAlignCenter weight="bold" />)}
      {icon("Align right", <TextAlignRight weight="bold" />)}
    </Toolbar>
  ),
}
export const Vertical: Story = {
  render: () => (
    <Toolbar orientation="vertical" variant="attached" aria-label="Tools">
      {icon("Bold", <TextB weight="bold" />)}
      {icon("Italic", <TextItalic weight="bold" />)}
      <ToolbarSeparator />
      {icon("Link", <LinkIcon weight="bold" />)}
    </Toolbar>
  ),
}
export const WithButtonGroup: Story = {
  render: () => (
    <Toolbar aria-label="Editor">
      <ButtonGroup variant="tertiary">
        <ToolbarItem asChild><Button iconOnly aria-label="Align left"><TextAlignLeft weight="bold" /></Button></ToolbarItem>
        <ToolbarItem asChild><Button iconOnly aria-label="Align centre"><Sep /><TextAlignCenter weight="bold" /></Button></ToolbarItem>
        <ToolbarItem asChild><Button iconOnly aria-label="Align right"><Sep /><TextAlignRight weight="bold" /></Button></ToolbarItem>
      </ButtonGroup>
      <ToolbarSeparator />
      <ToolbarItem asChild><Button variant="primary">Publish</Button></ToolbarItem>
    </Toolbar>
  ),
}
