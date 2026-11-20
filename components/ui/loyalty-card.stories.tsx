import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { LoyaltyCard } from "./loyalty-card"
import { TIER_OPTIONS, TIER_ORDER, resolveCardTheme, type TierKey } from "@/lib/cardTheme"

const meta = {
  title: "Display & content/Loyalty card",
  id: "molecules-loyalty-card",
  component: LoyaltyCard,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A membership card: the club and the member's status, their points large, and who it belongs to, since when and their number. It is a Holo card (thin-film hologram that follows the light) with one face every club uses. Colours come from a card theme: a status name from the backend (Basic, Bronze, Silver, Gold, Platinum, and aliases such as Titanium), or a colour the backend sends, in which case the card is a light tint of it and the ink a dark shade. Text inherits the theme's ink, so the same face reads on a pale card and a dark one.",
      },
    },
  },
  args: {
    club: "Aggie Club",
    status: "Silver",
    points: 2140,
    name: "Jordan Reyes",
    since: 2023,
    memberId: "4407 0862",
    theme: resolveCardTheme({ name: "Silver" }),
  },
  decorators: [(Story) => <div className="max-w-[380px]"><Story /></div>],
} satisfies Meta<typeof LoyaltyCard>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

/* the points a member usually has at each status, so the cards read as a ladder */
const POINTS: Record<TierKey, number> = { basic: 120, bronze: 640, silver: 2140, gold: 6800, platinum: 18450 }

/** Every status in order, in its own colour. */
export const Statuses: Story = {
  render: (args) => (
    <div className="grid w-[min(860px,calc(100vw-48px))] gap-8 sm:grid-cols-2">
      {TIER_ORDER.map((k) => {
        const theme = resolveCardTheme({ name: k })
        return <LoyaltyCard key={k} {...args} theme={theme} status={theme.label} points={POINTS[k]} />
      })}
    </div>
  ),
  decorators: [],
}

/** Every colour each status comes in: the shipped one first, then the alternatives. */
export const AllColours: Story = {
  render: (args) => (
    <div className="flex w-[min(1180px,calc(100vw-48px))] flex-col gap-12">
      {TIER_ORDER.map((k) => (
        <section key={k} className="flex flex-col gap-4">
          <h3 className="text-[15px] font-semibold capitalize tracking-[-0.01em]">{k}</h3>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {TIER_OPTIONS[k].map((o) => (
              <div key={o.id} className="flex flex-col gap-2">
                <LoyaltyCard {...args} theme={o.theme} status={o.theme.label} points={POINTS[k]} />
                <p className="px-1 text-[13px] text-muted-foreground">{o.name}</p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  ),
  decorators: [],
}

const BRAND = [
  ["Founders", "#3358D4"],
  ["Season", "#0F8A5F"],
  ["Insiders", "#D2463B"],
  ["Crew", "#D98324"],
  ["Pit", "#0E8FA3"],
  ["Roses", "#C73E7B"],
] as const

/** A colour sent by the backend (a club's own): a light tint of it, with a dark shade of it for the ink. */
export const BackendColours: Story = {
  render: (args) => (
    <div className="grid w-[min(860px,calc(100vw-48px))] gap-8 sm:grid-cols-2">
      {BRAND.map(([club, color]) => (
        <LoyaltyCard key={club} {...args} club={`${club} Club`} status={club} points={3210} theme={resolveCardTheme({ name: club, color })} />
      ))}
    </div>
  ),
  decorators: [],
}

/** A shorter card for a small screen: `aspect` is width over height (1.586 by default, 1.8 here). */
export const Shorter: Story = {
  args: { aspect: 1.8 },
}
