import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { ColorPicker, ColorPickerPopover, ColorPickerTrigger } from "./color-picker"
import { ColorArea } from "./color-area"
import { ColorField, type FieldChannel } from "./color-field"
import { ColorSlider } from "./color-slider"
import { ColorSwatch } from "./color-swatch"
import { ColorSwatchPicker, ColorSwatchPickerItem } from "./color-swatch-picker"
import { Label } from "./label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"

const meta = {
  title: "Select & pickers/Color picker",
  id: "molecules-color-picker",
  component: ColorPicker,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "Pick any colour. A trigger (a swatch and a label) opens a popover of controls that all edit one shared colour: an area for saturation and brightness, a slider for hue, a hex or channel field, and a row of preset swatches. Use it for team colours, event brand colours and ticket themes." } } },
} satisfies Meta<typeof ColorPicker>
export default meta
type Story = StoryObj<typeof meta>

const presets = ["#F43F5E", "#D946EF", "#8B5CF6", "#3B82F6", "#06B6D4", "#10B981", "#84CC16"]

export const Basic: Story = {
  render: (args) => (
    <ColorPicker {...args} defaultValue="#0485F7">
      <ColorPickerTrigger>
        <ColorSwatch />
        <Label>Pick a color</Label>
      </ColorPickerTrigger>
      <ColorPickerPopover>
        <ColorArea />
        <ColorSlider channel="hue" label={false} />
      </ColorPickerPopover>
    </ColorPicker>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: /pick a color/i })
    await userEvent.click(trigger)
    const body = within(document.body)
    await waitFor(() => expect(body.getByRole("slider", { name: "Hue" })).toBeInTheDocument())
    await expect(body.getByRole("slider", { name: "Saturation" })).toBeInTheDocument()
    await expect(body.getByRole("slider", { name: "Brightness" })).toBeInTheDocument()
  },
}

function ControlledDemo() {
  const [color, setColor] = React.useState("#325578")
  return (
    <div className="flex flex-col gap-3">
      <ColorPicker value={color} onChange={setColor}>
        <ColorPickerTrigger>
          <ColorSwatch />
          <Label>Pick a color</Label>
        </ColorPickerTrigger>
        <ColorPickerPopover>
          <ColorArea />
          <ColorSlider channel="hue" label={false} />
        </ColorPickerPopover>
      </ColorPicker>
      <p className="text-sm text-h-muted">Selected: <span className="font-medium text-h-foreground tabular-nums">{color}</span></p>
      <button type="button" className="w-fit text-sm text-h-link underline-offset-4 hover:underline" onClick={() => setColor("#F43F5E")}>Set to rose</button>
    </div>
  )
}
export const Controlled: Story = {
  parameters: { docs: { description: { story: "Hold the colour in state. It comes out as hex (`#RRGGBB`, or `#RRGGBBAA` when not opaque) and can be changed from outside." } } },
  render: () => <ControlledDemo />,
}

export const WithSwatches: Story = {
  parameters: { docs: { description: { story: "A row of preset swatches in the popover. They follow the picker's colour and set it when chosen; a custom colour leaves none selected." } } },
  render: () => (
    <ColorPicker defaultValue="#8B5CF6">
      <ColorPickerTrigger>
        <ColorSwatch />
        <Label>Brand colour</Label>
      </ColorPickerTrigger>
      <ColorPickerPopover>
        <ColorArea />
        <ColorSlider channel="hue" label={false} />
        <ColorSwatchPicker aria-label="Preset colours" className="gap-1.5">
          {presets.map((c) => <ColorSwatchPickerItem key={c} color={c} />)}
        </ColorSwatchPicker>
      </ColorPickerPopover>
    </ColorPicker>
  ),
}

const spaces: { id: string; label: string; channels: FieldChannel[] }[] = [
  { id: "hex", label: "Hex", channels: ["hex"] },
  { id: "rgb", label: "RGB", channels: ["red", "green", "blue"] },
  { id: "hsb", label: "HSB", channels: ["hue", "saturation", "brightness"] },
  { id: "hsl", label: "HSL", channels: ["hue", "saturation", "lightness"] },
]
function FieldsDemo() {
  const [space, setSpace] = React.useState("hex")
  const current = spaces.find((s) => s.id === space) ?? spaces[0]
  return (
    <ColorPicker defaultValue="#0485F7">
      <ColorPickerTrigger>
        <ColorSwatch />
        <Label>Pick a color</Label>
      </ColorPickerTrigger>
      <ColorPickerPopover>
        <ColorArea />
        <ColorSlider channel="hue" label={false} />
        <Select value={space} onValueChange={setSpace}>
          <SelectTrigger aria-label="Colour space" size="sm"><SelectValue /></SelectTrigger>
          <SelectContent>{spaces.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex gap-2">
          {current.channels.map((ch) => <ColorField key={ch} channel={ch} variant="secondary" size="sm" fullWidth />)}
        </div>
      </ColorPickerPopover>
    </ColorPicker>
  )
}
export const WithFields: Story = {
  parameters: { docs: { description: { story: "A `ColorField` edits the colour as hex or as individual channels, with a select to switch colour space. Type a value and press Enter or leave the field; a value that is not a colour shows the invalid state and Escape puts the current colour back." } } },
  render: () => <FieldsDemo />,
}

export const WithSliders: Story = {
  parameters: { docs: { description: { story: "One slider per channel, with the value beside its label. The track of each slider shows what moving it will do to the colour." } } },
  render: () => (
    <ColorPicker defaultValue="#0485F7">
      <ColorPickerTrigger>
        <ColorSwatch />
        <Label>Pick a color</Label>
      </ColorPickerTrigger>
      <ColorPickerPopover className="w-64">
        <ColorSlider channel="hue" showOutput />
        <ColorSlider channel="saturation" showOutput />
        <ColorSlider channel="brightness" showOutput />
        <ColorSlider channel="alpha" showOutput />
      </ColorPickerPopover>
    </ColorPicker>
  ),
}

export const ThemeColor: Story = {
  parameters: { docs: { description: { story: "A larger trigger swatch with the colour spelled out beside it, for a settings row." } } },
  render: () => (
    <ColorPicker defaultValue="#10B981">
      <ColorPickerTrigger className="gap-4 rounded-lg">
        <ColorSwatch size="xl" shape="square" />
        <span className="flex flex-col text-start">
          <span className="font-medium">Theme colour</span>
          <span className="text-h-muted">Used on your event page</span>
        </span>
      </ColorPickerTrigger>
      <ColorPickerPopover>
        <ColorArea showDots />
        <ColorSlider channel="hue" label={false} />
        <ColorField channel="hex" variant="secondary" fullWidth />
      </ColorPickerPopover>
    </ColorPicker>
  ),
}

export const Disabled: Story = {
  render: () => (
    <ColorPicker defaultValue="#0485F7" disabled>
      <ColorPickerTrigger>
        <ColorSwatch />
        <Label>Pick a color</Label>
      </ColorPickerTrigger>
      <ColorPickerPopover><ColorArea /></ColorPickerPopover>
    </ColorPicker>
  ),
}
