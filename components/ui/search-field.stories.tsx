import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { SearchField } from "./search-field"

const meta = {
  title: "Forms & inputs/Search field",
  id: "molecules-search-field",
  component: SearchField,
  tags: ["autodocs", "updated"],
  parameters: { docs: { description: { component: "Search box with a magnifier, a clear button while typing, a keyboard hint at the right while empty and an optional filter button with an active-filter count. Cmd or Ctrl + K focuses it. Pill by default; pass shape=\"default\" for a standard field." } } },
} satisfies Meta<typeof SearchField>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { render: () => <div className="w-96"><SearchField placeholder="Search events, venues or fans" aria-label="Search" /></div> }
export const WithFilter: Story = {
  render: () => {
    const [n, setN] = React.useState(2)
    return <div className="w-96"><SearchField placeholder="Search orders" aria-label="Search orders" onFilterClick={() => setN((c) => (c + 1) % 5)} filterCount={n} /></div>
  },
}
export const Rounded: Story = { render: () => <div className="w-96"><SearchField shape="default" placeholder="Search tickets" aria-label="Search tickets" shortcutLabel="/" shortcutKey="" /></div> }
export const Variants: Story = {
  render: () => (
    <div className="grid w-96 gap-3">
      <SearchField aria-label="primary" placeholder="Primary" />
      <SearchField aria-label="tertiary" variant="tertiary" placeholder="Tertiary" />
      <SearchField aria-label="underlined" variant="underlined" shape="default" placeholder="Underlined" />
    </div>
  ),
}
export const Sizes: Story = {
  render: () => (
    <div className="grid w-96 gap-3">
      {(["sm", "md", "lg"] as const).map((s) => <SearchField key={s} size={s} aria-label={s} placeholder={`Search, ${s}`} onFilterClick={() => {}} />)}
    </div>
  ),
}
