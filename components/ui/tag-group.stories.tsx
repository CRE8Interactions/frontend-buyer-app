import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"
import { Tag, TagGroup } from "./tag-group"

const meta = {
  title: "Display & content/Tag group",
  id: "molecules-tag-group",
  component: TagGroup,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "A labelled, wrapping row of tags for categories, filters and interests. Tags can be plain, selectable (one or several) and removable. Selected tags take the soft accent fill. Keyboard: Tab between tags, Space or Enter to select, Delete to remove." } } },
} satisfies Meta<typeof TagGroup>
export default meta
type Story = StoryObj<typeof meta>

const cats = ["Music", "Sports", "Theatre", "Comedy", "Festivals", "Family"]
export const Basic: Story = {
  render: () => <TagGroup label="Categories" aria-label="Categories">{cats.map((c) => <Tag key={c}>{c}</Tag>)}</TagGroup>,
}
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(["sm", "md", "lg"] as const).map((s) => <TagGroup key={s} size={s} aria-label={`${s} tags`}>{cats.slice(0, 4).map((c) => <Tag key={c}>{c}</Tag>)}</TagGroup>)}
    </div>
  ),
}
export const Variants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <TagGroup variant="default" aria-label="Default tags">{cats.slice(0, 4).map((c) => <Tag key={c}>{c}</Tag>)}</TagGroup>
      <div className="rounded-3xl bg-h-surface-secondary p-4"><TagGroup variant="surface" aria-label="Surface tags">{cats.slice(0, 4).map((c) => <Tag key={c}>{c}</Tag>)}</TagGroup></div>
    </div>
  ),
}
export const SingleSelection: Story = {
  render: () => <TagGroup label="Pick one" selectionMode="single" defaultValue={["Music"]}>{cats.map((c) => <Tag key={c}>{c}</Tag>)}</TagGroup>,
}
export const MultipleSelection: Story = {
  render: () => <TagGroup label="Interests" selectionMode="multiple" defaultValue={["Music", "Comedy"]} description="Choose as many as you like.">{cats.map((c) => <Tag key={c}>{c}</Tag>)}</TagGroup>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const sports = canvas.getByRole("button", { name: "Sports" })
    await expect(sports).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(sports)
    await expect(sports).toHaveAttribute("aria-pressed", "true")
    await expect(canvas.getByRole("button", { name: "Music" })).toHaveAttribute("aria-pressed", "true")
  },
}
function RemovableDemo() {
  const [tags, setTags] = React.useState(cats.slice(0, 5))
  return (
    <TagGroup label="Filters" onRemove={(id) => setTags((t) => t.filter((x) => x !== id))} description={tags.length ? undefined : "No filters left."}>
      {tags.map((c) => <Tag key={c}>{c}</Tag>)}
    </TagGroup>
  )
}
export const Removable: Story = {
  parameters: { docs: { description: { story: "A small X removes a tag; so does Delete or Backspace on the focused tag, and focus moves on to the next tag." } } },
  render: () => <RemovableDemo />,
}
export const DisabledTag: Story = {
  render: () => <TagGroup aria-label="Tags" selectionMode="multiple">{cats.slice(0, 4).map((c, i) => <Tag key={c} disabled={i === 2}>{c}</Tag>)}</TagGroup>,
}
export const WithError: Story = {
  render: () => <TagGroup label="Categories" isInvalid errorMessage="Pick at least one category." selectionMode="multiple">{cats.slice(0, 4).map((c) => <Tag key={c}>{c}</Tag>)}</TagGroup>,
}
