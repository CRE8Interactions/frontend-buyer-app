import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { HoloCard } from "./holo-card"
import { TIER_OPTIONS, TIER_ORDER, resolveCardTheme } from "@/lib/cardTheme"

const meta = {
  title: "Display & content/Holo card",
  id: "molecules-holo-card",
  component: HoloCard,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A card face with a thin-film hologram that follows the light: it tilts a little toward the cursor (or the phone) and the foil, sheen and glare move with it. No flip. Colours come from a CardTheme (`resolveCardTheme` in `lib/cardTheme.ts`). The rule, in order: a colour from the backend wins (the card becomes a light tint of it, with a dark ink made from it); else a tier name from the backend that we recognise (basic, bronze, silver, gold, platinum, or an alias such as titanium) takes that step's colours; else Basic. The content is whatever you put inside, and text inherits the theme's ink.",
      },
    },
  },
} satisfies Meta<typeof HoloCard>
export default meta
type Story = StoryObj<typeof meta>

const Face = ({ label }: { label: string }) => (
  <div className="flex h-full flex-col justify-between p-5">
    <div className="flex items-start justify-between">
      <div className="text-[15px] font-semibold tracking-[-0.02em]">Aggie Club</div>
      <div className="text-[12px] font-medium uppercase tracking-[.12em] opacity-60">{label}</div>
    </div>
    <div>
      <div className="text-[40px] font-semibold leading-none tabular-nums tracking-[-0.04em]">2,140</div>
      <div className="mt-1 text-[13px] opacity-60">points</div>
    </div>
    <div className="flex items-end justify-between">
      <div><div className="text-[11px] font-medium uppercase tracking-[.12em] opacity-50">Member</div><div className="text-[15px] font-semibold">Jordan Reyes</div></div>
      <div className="text-right"><div className="text-[11px] font-medium uppercase tracking-[.12em] opacity-50">Since 2023</div><div className="text-[15px] font-semibold tabular-nums tracking-[.04em]">4407 0862</div></div>
    </div>
  </div>
)

export const Silver: Story = {
  args: { theme: resolveCardTheme({ name: "Silver" }) },
  render: (args) => <HoloCard {...args} className="max-w-[380px]"><Face label={args.theme.label} /></HoloCard>,
}

/* a shorter card for a small screen: `aspect` is width over height (1.586 by default, 1.8 here) */
export const Shorter: Story = {
  args: { theme: resolveCardTheme({ name: "Silver" }), aspect: 1.8 },
  render: (args) => <HoloCard {...args} className="max-w-[380px]"><Face label={args.theme.label} /></HoloCard>,
}

/* every step of the ladder, in order */
export const Tiers: Story = {
  args: { theme: resolveCardTheme({ name: "Basic" }) },
  render: () => (
    <div className="grid max-w-[820px] gap-8 sm:grid-cols-2">
      {TIER_ORDER.map((k) => {
        const theme = resolveCardTheme({ name: k })
        return <HoloCard key={k} theme={theme}><Face label={theme.label} /></HoloCard>
      })}
    </div>
  ),
}

/* the backend names a tier we know under another word: titanium is Platinum, free is Basic */
export const BackendNameAlias: Story = {
  args: { theme: resolveCardTheme({ name: "Titanium Elite" }) },
  render: (args) => <HoloCard {...args} className="max-w-[380px]"><Face label={args.theme.label} /></HoloCard>,
}

/* the backend sends a colour: it wins over any tier name */
export const BackendColour: Story = {
  args: { theme: resolveCardTheme({ name: "Founders", color: "#3358D4" }) },
  render: (args) => <HoloCard {...args} className="max-w-[380px]"><Face label={args.theme.label} /></HoloCard>,
}

/* turn the hologram down or up */
export const FoilStrength: Story = {
  args: { theme: resolveCardTheme({ name: "Gold" }), foil: 1.4 },
  render: (args) => <HoloCard {...args} className="max-w-[380px]"><Face label={args.theme.label} /></HoloCard>,
}

/* every look we are considering for each step, to choose from (also at /wallet/tiers) */
export const ColourOptions: Story = {
  args: { theme: resolveCardTheme({ name: "Basic" }) },
  render: () => (
    <div className="flex max-w-[1100px] flex-col gap-10">
      {TIER_ORDER.map((k) => (
        <div key={k}>
          <h3 className="mb-3 text-[17px] font-semibold capitalize">{k}</h3>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {TIER_OPTIONS[k].map((o) => (
              <figure key={o.id} className="m-0 flex flex-col gap-2">
                <HoloCard theme={o.theme}><Face label={o.theme.label} /></HoloCard>
                <figcaption className="px-1 text-[13px]"><b>{o.id}</b> · {o.name}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
}
