import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { CalendarBlank, MapPin } from "@phosphor-icons/react"
import { Avatar, AvatarFallback } from "./avatar"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card"

const meta = {
  title: "Overlays/Hover card",
  id: "molecules-hover-card",
  component: HoverCard,
  tags: ["autodocs"],
  parameters: { docs: { story: { inline: false, iframeHeight: 420 }, description: { component: "Preview card shown when hovering a link, such as an organizer or venue. Uses the popover surface: 24px corners, overlay fill, overlay shadow, 16px padding." } } },
} satisfies Meta<typeof HoverCard>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div className="flex justify-center pt-4">
      <HoverCard defaultOpen>
        <HoverCardTrigger asChild><a href="#o" className="text-sm font-medium underline underline-offset-4">Live Nation Lisbon</a></HoverCardTrigger>
        <HoverCardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Avatar><AvatarFallback>LN</AvatarFallback></Avatar>
            <div><p className="text-sm font-semibold">Live Nation Lisbon</p><p className="text-sm text-muted-foreground">Verified organizer</p></div>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-2"><CalendarBlank weight="bold" /> 24 upcoming events</p>
          <p className="text-sm text-muted-foreground flex items-center gap-2"><MapPin weight="bold" /> Altice Arena, Lisbon</p>
        </HoverCardContent>
      </HoverCard>
    </div>
  ),
}
