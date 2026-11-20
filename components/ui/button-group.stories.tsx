import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { CaretDown, Minus, Plus, GitFork, Star, QrCode, ArrowLeft, ArrowRight, TextAlignLeft, TextAlignCenter, TextAlignRight, PushPin, Image as ImageIcon, VideoCamera } from "@phosphor-icons/react"
import { Button } from "./button"
import { Input } from "./input"
import { NativeSelect } from "./native-select"
import { NumberField } from "./number-field"
import { Toggle } from "./toggle"
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from "./button-group"

const meta = {
  title: "Actions/Button group",
  id: "molecules-button-group",
  component: ButtonGroup,
  tags: ["autodocs"],
  argTypes: {
    orientation: { control: "select", options: ["horizontal", "vertical"] },
    variant: { control: "select", options: ["primary", "secondary", "tertiary", "ghost", "outline", "danger", "danger-soft"] },
    size: { control: "select", options: ["sm", "md", "lg"] },
    fullWidth: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  parameters: { docs: { description: { component: "Fuses related buttons into one control. Variant, size and disabled set on the group apply to every button (a button can override them). Copied from the reference: sizes sm 32, md 36 and lg 40px, 14px medium text, pill outer ends, square inner corners, a 1px separator inside every button after the first, and no press scale." } } },
} satisfies Meta<typeof ButtonGroup>
export default meta
type Story = StoryObj<typeof meta>

const row = "flex flex-wrap items-center gap-6"
const Sep = ButtonGroupSeparator

export const Playground: Story = {
  args: { orientation: "horizontal", variant: "primary", size: "md" },
  render: (args) => (
    <ButtonGroup {...args}>
      <Button>First</Button>
      <Button><Sep />Second</Button>
      <Button><Sep />Third</Button>
    </ButtonGroup>
  ),
}
export const Variants: Story = {
  render: () => (
    <div className="grid justify-items-start gap-4">
      {(["primary", "secondary", "tertiary", "ghost", "outline", "danger", "danger-soft"] as const).map((v) => (
        <ButtonGroup key={v} variant={v} aria-label={v}>
          <Button>First</Button><Button><Sep />Second</Button><Button><Sep />Third</Button>
        </ButtonGroup>
      ))}
    </div>
  ),
}
export const Sizes: Story = {
  render: () => (
    <div className="grid justify-items-start gap-4">
      {(["sm", "md", "lg"] as const).map((z) => (
        <ButtonGroup key={z} size={z} variant="tertiary">
          <Button>Photos</Button><Button><Sep />Videos</Button><Button><Sep />Maps</Button>
        </ButtonGroup>
      ))}
    </div>
  ),
}
export const Vertical: Story = {
  render: () => (
    <ButtonGroup orientation="vertical" variant="tertiary">
      <Button>General admission</Button><Button><Sep />Balcony</Button><Button><Sep />VIP lounge</Button>
    </ButtonGroup>
  ),
}
export const WithIcons: Story = {
  render: () => (
    <div className={row}>
      <ButtonGroup variant="tertiary">
        <Button><GitFork weight="bold" />Fork</Button>
        <Button size="icon" aria-label="Fork count"><Sep /><CaretDown weight="bold" /></Button>
      </ButtonGroup>
      <ButtonGroup variant="tertiary">
        <Button size="icon" aria-label="Previous"><ArrowLeft weight="bold" /></Button>
        <Button size="icon" aria-label="Next"><Sep /><ArrowRight weight="bold" /></Button>
      </ButtonGroup>
      <ButtonGroup variant="tertiary">
        <Button><QrCode weight="bold" />Scan to pay</Button>
        <Button><Sep /><Star weight="bold" />2.4K</Button>
      </ButtonGroup>
    </div>
  ),
}
export const FullWidth: Story = {
  render: () => (
    <ButtonGroup fullWidth variant="tertiary">
      <Button>Left</Button><Button><Sep />Center</Button><Button><Sep />Right</Button>
    </ButtonGroup>
  ),
}
export const Disabled: Story = {
  render: () => (
    <div className="grid justify-items-start gap-4">
      <ButtonGroup disabled variant="tertiary"><Button>Left</Button><Button><Sep />Center</Button><Button><Sep />Right</Button></ButtonGroup>
      <ButtonGroup variant="tertiary"><Button>Left</Button><Button disabled><Sep />Center (disabled)</Button><Button><Sep />Right</Button></ButtonGroup>
    </div>
  ),
}
export const WithoutSeparator: Story = {
  render: () => (
    <ButtonGroup variant="tertiary"><Button>First</Button><Button>Second</Button><Button>Third</Button></ButtonGroup>
  ),
}
export const Quantity: Story = {
  render: () => (
    <ButtonGroup variant="tertiary">
      <Button size="icon" aria-label="Fewer tickets"><Minus weight="bold" /></Button>
      <ButtonGroupText><Sep />2 tickets</ButtonGroupText>
      <Button size="icon" aria-label="More tickets"><Sep /><Plus weight="bold" /></Button>
    </ButtonGroup>
  ),
}
export const SplitButton: Story = {
  render: () => (
    <ButtonGroup>
      <Button>Merge pull request</Button>
      <Button size="icon" aria-label="More options"><Sep /><CaretDown weight="bold" /></Button>
    </ButtonGroup>
  ),
}

export const NextToInput: Story = {
  parameters: { docs: { description: { story: "A neutral button group beside fields. In dark they share one fill." } } },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Input placeholder="Promo code" className="w-48" />
      <ButtonGroup variant="tertiary">
        <Button size="icon" aria-label="Fewer tickets"><Minus weight="bold" /></Button>
        <ButtonGroupText><Sep />2 tickets</ButtonGroupText>
        <Button size="icon" aria-label="More tickets"><Sep /><Plus weight="bold" /></Button>
      </ButtonGroup>
      <Input variant="tertiary" placeholder="Tertiary" className="w-40" />
    </div>
  ),
}

export const MatchingHeights: Story = {
  parameters: { docs: { description: { story: "Every control at the same size has the same height: sm 36 (32 on desktop), md 40 (36), lg 48 (44)." } } },
  render: () => (
    <div className="flex flex-col gap-4">
      {(["sm", "md", "lg"] as const).map((size) => (
        <div key={size} data-row={size} className="flex flex-wrap items-center gap-3">
          <Button size={size} variant="secondary">Button</Button>
          <Button size={size === "sm" ? "icon-sm" : size === "lg" ? "icon-lg" : "icon"} variant="secondary" aria-label="Add"><Plus weight="bold" /></Button>
          <ButtonGroup size={size} variant="tertiary">
            <Button size="icon" aria-label="Fewer"><Minus weight="bold" /></Button>
            <ButtonGroupText><Sep />2 tickets</ButtonGroupText>
            <Button size="icon" aria-label="More"><Sep /><Plus weight="bold" /></Button>
          </ButtonGroup>
          <Input size={size} placeholder="Input" className="w-32" />
          <NativeSelect size={size}><option>Select</option></NativeSelect>
          <NumberField aria-label="Qty" size={size} defaultValue={2} />
          <Toggle size={size}>Toggle</Toggle>
        </div>
      ))}
    </div>
  ),
}

export const OutlineSharedBorders: Story = {
  parameters: { docs: { description: { story: "Outline buttons share one border: where two touch, the inner edges drop theirs so the line is not doubled. Works horizontally and vertically." } } },
  render: () => (
    <div className="flex items-start gap-8">
      <ButtonGroup variant="outline" aria-label="Horizontal outline">
        <Button>Left</Button><Button><Sep />Middle</Button><Button><Sep />Right</Button>
      </ButtonGroup>
      <ButtonGroup variant="outline" orientation="vertical" aria-label="Vertical outline">
        <Button>Top</Button><Button><Sep />Middle</Button><Button><Sep />Bottom</Button>
      </ButtonGroup>
    </div>
  ),
}
export const Examples: Story = {
  parameters: { docs: { description: { story: "Common groups: a label with a count, a toggle with a count, an icon with text, previous and next, and icon-only alignment." } } },
  render: () => (
    <div className="grid justify-items-start gap-4">
      <ButtonGroup variant="tertiary">
        <Button><GitFork weight="bold" />Fork</Button>
        <Button><Sep />24</Button>
      </ButtonGroup>
      <ButtonGroup variant="tertiary">
        <Button><QrCode weight="bold" />Scan to pay</Button>
        <Button><Sep />2.4K</Button>
      </ButtonGroup>
      <ButtonGroup variant="tertiary">
        <Button><Star weight="bold" />Star</Button>
        <Button><Sep />104</Button>
        <Button iconOnly aria-label="Pin"><Sep /><PushPin weight="bold" /></Button>
      </ButtonGroup>
      <ButtonGroup variant="tertiary">
        <Button><ArrowLeft weight="bold" />Previous</Button>
        <Button><Sep />Next<ArrowRight weight="bold" /></Button>
      </ButtonGroup>
      <ButtonGroup variant="tertiary">
        <Button><ImageIcon weight="bold" />Photos</Button>
        <Button><Sep /><VideoCamera weight="bold" />Videos</Button>
      </ButtonGroup>
      <ButtonGroup variant="tertiary">
        <Button iconOnly aria-label="Align left"><TextAlignLeft weight="bold" /></Button>
        <Button iconOnly aria-label="Align centre"><Sep /><TextAlignCenter weight="bold" /></Button>
        <Button iconOnly aria-label="Align right"><Sep /><TextAlignRight weight="bold" /></Button>
      </ButtonGroup>
    </div>
  ),
}
export const HoverAndPress: Story = {
  parameters: { docs: { description: { story: "Hover lightens only the button under the pointer. Pressing does not shrink the button, so the group never breaks apart. The focused button rises above its neighbours so the ring is never cut off. Try it with the mouse and with Tab." } } },
  render: () => (
    <div className="grid justify-items-start gap-4">
      {(["secondary", "tertiary", "ghost", "outline"] as const).map((v) => (
        <ButtonGroup key={v} variant={v} aria-label={`${v} hover and press`}>
          <Button>First</Button><Button><Sep />Second</Button><Button><Sep />Third</Button>
        </ButtonGroup>
      ))}
    </div>
  ),
}
