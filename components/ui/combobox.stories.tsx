import type * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Combobox, ComboboxChip, ComboboxChips, ComboboxChipsInput, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxValue, useComboboxAnchor } from "./combobox"

const meta = {
  title: "Select & pickers/Combobox",
  id: "molecules-combobox",
  component: Combobox,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: { component: "Type-ahead select built on Base UI. Single value with an input, or multiple values as chips. Options use the dropdown menu row: at least 36px tall, a highlight with 16px corners in the default fill, press scales to 98%." },
      story: { inline: false, iframeHeight: 420 },
    },
  },
} satisfies Meta<typeof Combobox>
export default meta
type Story = StoryObj<typeof meta>

const venues = ["Riverside Arena", "Old Town Theatre", "Harbour Hall", "Skyline Rooftop", "Grand Opera House", "Union Square Club"]

export const Default: Story = {
  render: () => (
    <Combobox items={venues} defaultOpen>
      <ComboboxInput placeholder="Select a venue" className="w-64" />
      <ComboboxContent>
        <ComboboxEmpty>No venues found.</ComboboxEmpty>
        <ComboboxList>{(v: string) => <ComboboxItem key={v} value={v}>{v}</ComboboxItem>}</ComboboxList>
      </ComboboxContent>
    </Combobox>
  ),
}
export const WithClear: Story = {
  render: () => (
    <Combobox items={venues} defaultValue="Harbour Hall">
      <ComboboxInput placeholder="Select a venue" showClear className="w-64" />
      <ComboboxContent>
        <ComboboxEmpty>No venues found.</ComboboxEmpty>
        <ComboboxList>{(v: string) => <ComboboxItem key={v} value={v}>{v}</ComboboxItem>}</ComboboxList>
      </ComboboxContent>
    </Combobox>
  ),
}
export const Disabled: Story = {
  render: () => (
    <Combobox items={venues} defaultValue="Riverside Arena">
      <ComboboxInput disabled className="w-64" />
    </Combobox>
  ),
}
const Multi = () => {
  const anchor = useComboboxAnchor()
  return (
    <Combobox items={venues} multiple defaultValue={["Riverside Arena", "Harbour Hall"]}>
      <ComboboxChips ref={anchor} className="w-80">
        <ComboboxValue>
          {(values: string[]) => (
            <>
              {values.map((v) => <ComboboxChip key={v}>{v}</ComboboxChip>)}
              <ComboboxChipsInput placeholder="Add venue" />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>No venues found.</ComboboxEmpty>
        <ComboboxList>{(v: string) => <ComboboxItem key={v} value={v}>{v}</ComboboxItem>}</ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
export const MultipleChips: Story = { render: () => <Multi /> }
