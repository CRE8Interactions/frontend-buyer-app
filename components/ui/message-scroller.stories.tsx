import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { MessageScroller, MessageScrollerButton, MessageScrollerContent, MessageScrollerItem, MessageScrollerProvider, MessageScrollerViewport } from "./message-scroller"
import { Message, MessageContent, MessageFooter } from "./message"
import { Bubble, BubbleContent } from "./bubble"

const meta = {
  title: "Display & content/Message scroller",
  id: "molecules-message-scroller",
  component: MessageScroller,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "Chat viewport that sticks to the newest message and shows a jump to latest button when you scroll up." } } },
} satisfies Meta<typeof MessageScroller>
export default meta
type Story = StoryObj<typeof meta>

const chat: [boolean, string][] = [
  [false, "Hi, I bought two tickets for Raptors vs Celtics. Can I transfer one to my brother?"],
  [true, "Yes. Open the order, choose Transfer, and enter his email. He gets the ticket in a minute."],
  [false, "Will my original barcode stop working?"],
  [true, "Right away. Only the new barcode will scan at Scotiabank Arena."],
  [false, "Great. Is there a fee?"],
  [true, "Transfers are free for face value tickets."],
  [false, "And if he cannot make it either?"],
  [true, "He can list it for resale from his own account."],
  [false, "Perfect, sending it now."],
  [true, "Done. You will get a confirmation when he accepts."],
]
const Chat = ({ items, className }: { items: typeof chat; className: string }) => (
  <div className={className}>
    <MessageScrollerProvider>
      <MessageScroller>
        <MessageScrollerViewport>
          <MessageScrollerContent className="gap-4 p-4">
            {items.map(([agent, text], i) => (
              <MessageScrollerItem key={i} scrollAnchor={i === items.length - 1}>
                <Message align={agent ? "start" : "end"}>
                  <MessageContent>
                    <Bubble variant={agent ? "muted" : "default"} align={agent ? "start" : "end"}><BubbleContent>{text}</BubbleContent></Bubble>
                    {i === items.length - 1 && <MessageFooter>{agent ? "Support, just now" : "Delivered"}</MessageFooter>}
                  </MessageContent>
                </Message>
              </MessageScrollerItem>
            ))}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  </div>
)
export const Default: Story = { render: () => <Chat items={chat} className="h-80 w-96 rounded-3xl border" /> }
export const Short: Story = { render: () => <Chat items={chat.slice(0, 3)} className="h-80 w-96 rounded-3xl border" /> }
