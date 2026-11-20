import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { CaretRight, Cube } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "./avatar"
import {
  InlineSelect,
  InlineSelectIndicator,
  InlineSelectItem,
  InlineSelectPopover,
  InlineSelectTrigger,
  InlineSelectValue,
} from "./inline-select"

const meta = {
  title: "Select & pickers/Inline select",
  id: "molecules-inline-select",
  component: InlineSelectTrigger,
  tags: ["autodocs"],
  parameters: {
    controls: { disable: true },
    docs: { description: { component: "A compact selection control for use within text or a toolbar. Supports single and multiple selections, custom indicators, and anchored placement." } },
  },
  decorators: [
    (Story, { viewMode }) => (
      <div className={cn("grid place-items-center", viewMode === "story" && "min-h-[calc(100dvh-3rem)]")}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof InlineSelectTrigger>
export default meta
type Story = StoryObj<typeof meta>

const languages = ["English", "Spanish", "French", "Japanese"]
const roles = ["Viewer", "Editor", "Admin"]
const channels = ["Email", "WhatsApp", "Push Notification"]
const listFormat = new Intl.ListFormat("en")

export const Default: Story = {
  render: () => (
    <InlineSelect defaultValue="English">
      <InlineSelectTrigger aria-label="Language">
        <InlineSelectValue />
        <InlineSelectIndicator />
      </InlineSelectTrigger>
      <InlineSelectPopover className="w-35">
        {languages.map((language) => <InlineSelectItem key={language} value={language}>{language}</InlineSelectItem>)}
      </InlineSelectPopover>
    </InlineSelect>
  ),
}

const teams = [
  { name: "Northwind Labs", color: "bg-h-purple text-h-purple-foreground" },
  { name: "Acme Corp", color: "bg-h-info text-h-info-foreground" },
  { name: "Maple Studio", color: "bg-h-warning text-h-warning-foreground" },
]

function TeamName({ name, color }: (typeof teams)[number]) {
  return (
    <>
      <Avatar aria-hidden="true" className="inline-flex size-5 rounded-[4px]">
        <AvatarFallback className={cn("text-[10px] font-semibold", color)}>{name[0]}</AvatarFallback>
      </Avatar>
      <span className="truncate">{name}</span>
    </>
  )
}

export const TeamSwitcher: Story = {
  render: () => (
    <div className="flex max-w-full items-center gap-3">
      <Cube aria-hidden="true" weight="bold" className="size-4 shrink-0 text-h-foreground" />
      <span aria-hidden="true" className="text-sm text-h-muted">/</span>
      <InlineSelect defaultValue={teams[0].name}>
        <InlineSelectTrigger aria-label="Team">
          <InlineSelectValue className="inline-flex items-center gap-2">
            {(value: string | null) => {
              const team = teams.find(({ name }) => name === value)
              return team ? <TeamName {...team} /> : "Choose a team"
            }}
          </InlineSelectValue>
          <InlineSelectIndicator />
        </InlineSelectTrigger>
        <InlineSelectPopover className="w-50">
          {teams.map((team) => (
            <InlineSelectItem key={team.name} value={team.name} label={team.name}>
              <TeamName {...team} />
            </InlineSelectItem>
          ))}
        </InlineSelectPopover>
      </InlineSelect>
    </div>
  ),
}

export const CustomIndicator: Story = {
  render: () => (
    <InlineSelect defaultValue="Editor">
      <InlineSelectTrigger aria-label="Role">
        <InlineSelectValue />
        <InlineSelectIndicator><CaretRight weight="bold" /></InlineSelectIndicator>
      </InlineSelectTrigger>
      <InlineSelectPopover>
        {roles.map((role) => <InlineSelectItem key={role} value={role}>{role}</InlineSelectItem>)}
      </InlineSelectPopover>
    </InlineSelect>
  ),
}

export const MultiSelect: Story = {
  render: () => (
    <InlineSelect multiple defaultValue={["Email", "Push Notification"]}>
      <InlineSelectTrigger aria-label="Notification channels">
        <InlineSelectValue>
          {(values: string[]) => values.length ? listFormat.format(values) : "Choose channels"}
        </InlineSelectValue>
        <InlineSelectIndicator />
      </InlineSelectTrigger>
      <InlineSelectPopover className="w-48">
        {channels.map((channel) => <InlineSelectItem key={channel} value={channel}>{channel}</InlineSelectItem>)}
      </InlineSelectPopover>
    </InlineSelect>
  ),
}

const placements = [
  { label: "bottom", side: "bottom", align: "center" },
  { label: "bottom start", side: "bottom", align: "start" },
  { label: "bottom end (default)", side: "bottom", align: "end" },
  { label: "top", side: "top", align: "center" },
  { label: "top start", side: "top", align: "start" },
  { label: "top end", side: "top", align: "end" },
  { label: "left", side: "left", align: "center" },
  { label: "left top", side: "left", align: "start" },
  { label: "left bottom", side: "left", align: "end" },
  { label: "right", side: "right", align: "center" },
  { label: "right top", side: "right", align: "start" },
  { label: "right bottom", side: "right", align: "end" },
] as const

export const Placements: Story = {
  render: function Render() {
    const [placement, setPlacement] = React.useState<(typeof placements)[number]>(placements[2])

    return (
      <InlineSelect items={placements.map(({ label }) => ({ label, value: label }))} value={placement.label}
        onValueChange={(label) => {
          const next = placements.find((entry) => entry.label === label)
          if (next) setPlacement(next)
        }}
      >
        <InlineSelectTrigger aria-label="Placement">
          <InlineSelectValue />
          <InlineSelectIndicator />
        </InlineSelectTrigger>
        <InlineSelectPopover side={placement.side} align={placement.align} className="w-46 max-h-[min(20rem,var(--available-height))]">
          {placements.map(({ label }) => <InlineSelectItem key={label} value={label}>{label}</InlineSelectItem>)}
        </InlineSelectPopover>
      </InlineSelect>
    )
  },
}
