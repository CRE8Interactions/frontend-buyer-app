import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import WalletBadges, { WalletHandoff } from "./WalletBadges"

const meta = {
  title: "Tickets/Add to wallet",
  id: "organisms-wallet-badges",
  component: WalletBadges,
  tags: ["autodocs"],
  args: { wallet: "apple", count: 1 },
  argTypes: { wallet: { control: "select", options: ["apple", "google"] } },
  parameters: {
    docs: {
      description: {
        component:
          "The official Add to Apple Wallet and Add to Google Wallet badges as real buttons. The artwork is Apple's and Google's own and is never recoloured or redrawn; it only scales, at one fixed 48px height, keeping its own ratio. **One wallet shows at a time**, following the device: iPhone and iPad get Apple, Android gets Google. Up to iPad width with a desktop user agent (device mode) the Apple badge shows. A real desktop gets the hand-off instead (a QR to open the page on a phone, and Copy link). With more than one ticket, tapping the badge opens a bottom sheet: Add all N tickets, Add just this ticket, Cancel.",
      },
    },
  },
} satisfies Meta<typeof WalletBadges>
export default meta
type Story = StoryObj<typeof meta>

export const Apple: Story = {}
export const Google: Story = { args: { wallet: "google" } }
export const MoreThanOneTicket: Story = {
  name: "More than one ticket",
  parameters: { docs: { description: { story: "Tap the badge: a bottom sheet (the library Drawer) asks whether to add this ticket or all of them." } } },
  args: { count: 8 },
}
export const DesktopHandoff: Story = {
  name: "Desktop hand-off",
  parameters: { docs: { description: { story: "On a desktop there is no wallet to add to, so the page shows a QR of its own link to open on a phone, with a Copy link button. It renders nothing on phones. (In Storybook it shows only above 1024px wide on a desktop browser.)" } } },
  render: () => <WalletHandoff className="max-w-md" />,
}
