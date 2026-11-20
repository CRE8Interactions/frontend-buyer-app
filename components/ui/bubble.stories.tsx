import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Heart } from "@phosphor-icons/react"
import { Bubble, BubbleContent, BubbleGroup, BubbleReactions } from "./bubble"

const variants = ["default", "secondary", "muted", "tinted", "outline", "ghost", "destructive"] as const

const meta = {
  title: "Display & content/Bubble",
  id: "molecules-bubble",
  component: Bubble,
  tags: ["autodocs"],
  argTypes: { variant: { control: "select", options: variants }, align: { control: "select", options: ["start", "end"] } },
  parameters: { docs: { description: { component: "Chat message bubble for fan support and organizer threads. Align end for the sender." } } },
} satisfies Meta<typeof Bubble>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  args: { variant: "secondary", align: "start" },
  render: (args) => <Bubble {...args}><BubbleContent>Hi, can I move my seats from Row F to Row B?</BubbleContent></Bubble>,
}
export const Variants: Story = {
  render: () => (
    <BubbleGroup className="max-w-lg">
      {variants.map((v) => <Bubble key={v} variant={v}><BubbleContent>{v}: your order #48213 is confirmed.</BubbleContent></Bubble>)}
    </BubbleGroup>
  ),
}
export const Conversation: Story = {
  render: () => (
    <BubbleGroup className="max-w-lg">
      <Bubble variant="secondary"><BubbleContent>Hi, the doors for Harbour Lights say 19:00 but my email says 18:30.</BubbleContent></Bubble>
      <Bubble variant="default" align="end"><BubbleContent>Thanks for flagging. Doors open at 19:00, the email had a typo. We are sending a correction today.</BubbleContent></Bubble>
      <Bubble variant="tinted"><BubbleContent>Perfect, see you there.</BubbleContent><BubbleReactions align="start"><span className="px-1"><Heart weight="fill" className="size-3.5" /></span></BubbleReactions></Bubble>
      <Bubble variant="destructive" className="mt-3"><BubbleContent>Message failed to send. Tap to retry.</BubbleContent></Bubble>
    </BubbleGroup>
  ),
}
