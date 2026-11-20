import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Avatar, AvatarFallback } from "./avatar"
import { Bubble, BubbleContent, BubbleReactions } from "./bubble"
import { Marker, MarkerContent } from "./marker"
import { Message, MessageAvatar, MessageContent, MessageFooter, MessageGroup, MessageHeader } from "./message"

const meta = {
  title: "Display & content/Message",
  id: "molecules-message",
  component: Message,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "Chat message layout with avatar, header, footer and bubbles. Align end for the current user." } } },
} satisfies Meta<typeof Message>
export default meta
type Story = StoryObj<typeof meta>

export const Conversation: Story = {
  render: () => (
    <MessageGroup className="max-w-md">
      <Marker variant="separator"><MarkerContent>Today, 18:42</MarkerContent></Marker>
      <Message>
        <MessageAvatar><Avatar><AvatarFallback>MS</AvatarFallback></Avatar></MessageAvatar>
        <MessageContent>
          <MessageHeader>Maya, Box office</MessageHeader>
          <Bubble variant="secondary"><BubbleContent className="rounded-2xl px-3 py-2">Hi Alex, your seats in Section 104 are confirmed.</BubbleContent></Bubble>
        </MessageContent>
      </Message>
      <Message align="end">
        <MessageContent>
          <Bubble align="end"><BubbleContent className="rounded-2xl px-3 py-2">Great, can I add a parking pass?</BubbleContent></Bubble>
          <MessageFooter>Delivered</MessageFooter>
        </MessageContent>
      </Message>
      <Marker><MarkerContent>Maya is typing</MarkerContent></Marker>
    </MessageGroup>
  ),
}
export const WithReaction: Story = {
  render: () => (
    <Message className="max-w-md pb-4">
      <MessageContent>
        <Bubble variant="muted">
          <BubbleContent className="rounded-2xl px-3 py-2">Gates open at 19:00, bring your QR code.</BubbleContent>
          <BubbleReactions>3 fans liked this</BubbleReactions>
        </Bubble>
      </MessageContent>
    </Message>
  ),
}
