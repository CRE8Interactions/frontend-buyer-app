import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { BigAmount, StubCard, Terms, Tracker } from "./WalletFlow"
import PackRow, { PackCard } from "./WalletPackRow"
import { PACK_CARDS_CSS } from "./pack-cards-styles"
import { ACCESS_PASSES, EVENTS, FLEX_PACKS, PACKAGES } from "@/lib/walletDemo"

/* Parts of the wallet worth reusing elsewhere: the steps tracker, the ticket summary and its terms, the amount you type, and the packs and passes as
   a list row and as a card. Each is the real component, with the wallet's demo data. */
const meta = {
  title: "Page sections/Wallet parts",
  id: "organisms-wallet-parts",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Parts of the wallet that are worth reusing. `Tracker` shows where something has got to (done, now, next). `StubCard` and `Terms` are the ticket summary and the plain list of terms under it. `BigAmount` is an amount you type or step, in digits that roll. `PackRow` is a season package, flex pack or access pass as a list row (picture, name, a ring for what is left); `PackCard` is the same as the card the purchase flow uses on the team pages, in a tile layout.",
      },
    },
  },
  decorators: [
    (Story: React.ComponentType) => (
      <div style={{ "--land": "cubic-bezier(.34,1.3,.64,1)", "--out": "cubic-bezier(.23,1,.32,1)" } as React.CSSProperties}>
        <style dangerouslySetInnerHTML={{ __html: PACK_CARDS_CSS }} />
        <Story />
      </div>
    ),
  ],
} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

/** Where something has got to: done, in progress, still to come. The steps rise in one after another. */
export const StepsTracker: Story = {
  render: () => (
    <div className="max-w-[420px]">
      <Tracker steps={[
        { title: "Transfer sent", sub: "Your seats are held for them.", state: "done" },
        { title: "Email on its way", sub: "A claim link goes to sam@example.com.", state: "now" },
        { title: "They claim it", sub: "The ticket moves to their wallet.", state: "next" },
      ]} />
    </div>
  ),
}

/** The ticket you are about to do something with, and the terms under it. */
export const TicketSummary: Story = {
  render: () => (
    <div className="flex max-w-[420px] flex-col gap-4">
      <StubCard event={EVENTS[0]} subject={EVENTS[0].title} seats={["Seat 6", "Seat 7"]} />
      <Terms rows={[
        { k: "Tickets", v: "2 × $24.00" },
        { k: "Service fee", v: "−$4.80" },
        { k: "You receive", v: "$43.20", strong: true },
        { k: "Paid", v: "After the event" },
      ]} />
    </div>
  ),
}

function AmountDemo() {
  const [price, setPrice] = React.useState<number | null>(24)
  const fee = (price ?? 0) * 0.1
  return (
    <div className="flex max-w-[420px] flex-col gap-4">
      <BigAmount label="Asking price per ticket" value={price} onChange={setPrice} min={24} max={500} invalid={price == null || price < 24} />
      <p className="text-center text-[15px] text-muted-foreground">You keep ${((price ?? 0) - fee).toFixed(2)} after the 10% service fee.</p>
    </div>
  )
}

/** An amount you type or step with − and +, in digits that roll. Below the minimum it turns invalid. */
export const AmountInput: Story = { render: () => <AmountDemo /> }

/** A season package, a flex pack and an access pass as list rows. */
export const PackRows: Story = {
  render: () => (
    <div className="flex max-w-[640px] flex-col gap-3">
      <PackRow kind="package" id={PACKAGES[0].id} onOpen={() => {}} />
      <PackRow kind="package" id={PACKAGES[1].id} onOpen={() => {}} />
      <PackRow kind="flex" id={FLEX_PACKS[0].id} onOpen={() => {}} />
      <PackRow kind="pass" id={ACCESS_PASSES[0].id} onOpen={() => {}} />
    </div>
  ),
}

/** The same as cards: the purchase flow's pass card, in a tile layout, with the ring for what is left. */
export const PackCards: Story = {
  render: () => (
    <div className="grid max-w-[820px] gap-4 sm:grid-cols-2">
      <PackCard kind="package" id={PACKAGES[0].id} onOpen={() => {}} />
      <PackCard kind="package" id={PACKAGES[1].id} onOpen={() => {}} />
      <PackCard kind="flex" id={FLEX_PACKS[0].id} onOpen={() => {}} />
      <PackCard kind="flex" id={FLEX_PACKS[1].id} onOpen={() => {}} />
      <PackCard kind="pass" id={ACCESS_PASSES[0].id} onOpen={() => {}} />
    </div>
  ),
}
