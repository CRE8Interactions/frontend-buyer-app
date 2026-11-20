import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { MapPlayerFrame, wait, type PlayerSetup, type PlayerWindow } from "./MapPlayerFrame"

/* eslint-disable @typescript-eslint/no-explicit-any -- the player is plain JavaScript and has no types */

/* Each story runs the real player (public/maps-2d) and then puts it in one state. The helpers below pick seats and
   sections from whatever venue is loaded, by what they are (a locked seat, a standing section), never by name. */
const seated = (api: any) => {
  const map = api.map(), count = new Map<string, number>()
  for (const seat of map.seats) count.set(seat.sectionId, (count.get(seat.sectionId) || 0) + 1)
  const id = [...count].sort((a, b) => b[1] - a[1]).find(([sectionId]) => !map.sectionById.get(sectionId)?.ga)?.[0]
  return map.seats.filter((seat: any) => seat.sectionId === id)
}
const statusOf = (api: any, id: string) => { const all = api.store().inventory.statuses; return JSON.stringify(all?.get ? all.get(id) : all?.[id]) || "" }
const tiersOf = (api: any, id: string) => { const inv = api.store().inventory; return inv.offers?.[inv.assignments?.[id]]?.tiers?.length || 0 }
const openSeat = (api: any, wanted: (seat: any) => boolean) => seated(api).find((seat: any) => !/lock|sold|unavail|held/i.test(statusOf(api, seat.id)) && wanted(seat))
const hover = (win: PlayerWindow, x: number, y: number) => {
  const canvas = win.document.querySelector("#canvas-host canvas")
  for (const type of ["pointerover", "pointermove", "pointermove"]) canvas?.dispatchEvent(new win.PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerType: "mouse", pointerId: 1, isPrimary: true }))
}

const intoSection: PlayerSetup = async (_win, api) => { api.showSection(seated(api)[0].sectionId); await wait(1400) }
const sectionHover: PlayerSetup = async (win, api) => { const at = api.player().projectSeat(seated(api)[0].id); hover(win, at.x, at.y) }
const seatHover: PlayerSetup = async (win, api) => { await intoSection(win, api); const seat = openSeat(api, () => true); const at = api.player().projectSeat(seat.id); hover(win, at.x, at.y) }
const seatCard: PlayerSetup = async (win, api) => { await intoSection(win, api); api.chooseSeat(openSeat(api, (seat) => tiersOf(api, seat.id) > 1).id) }
const lockedCard: PlayerSetup = async (win, api) => { await intoSection(win, api); api.chooseSeat(seated(api).find((seat: any) => /lock/i.test(statusOf(api, seat.id))).id) }
const standingCard: PlayerSetup = async (_win, api) => { const section = [...api.map().sectionById.values()].find((s: any) => s.ga && !s.killed) as any; api.showSection(section.id) }
const seatKey: PlayerSetup = async (win, api) => { await intoSection(win, api); const key = win.document.querySelector<HTMLDetailsElement>("#availability-legend details"); if (key) key.open = true }
const controlTip: PlayerSetup = async (win) => { const button = win.document.querySelector(".map-control-rail button"); button?.dispatchEvent(new win.PointerEvent("pointerover", { bubbles: true, pointerType: "mouse" })); await wait(2200) }
const seatView: PlayerSetup = async (win, api) => { await intoSection(win, api); const seat = openSeat(api, (s) => tiersOf(api, s.id) > 1); api.chooseSeat(seat.id); await wait(1500); await api.openSeatView(seat.id) }

const meta = {
  title: "Seat map/Map player",
  id: "organisms-map-player",
  component: MapPlayerFrame,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "The seat map buyers pick from: one shared player (`public/maps-2d/apps/experience`) and one folder per venue. Every story here runs the real player and puts it in one state, so hovers, cards, the phone drawer, the map controls and the 3D view are exactly what ships. The map stays live in each story: hover, click, zoom and drag. Light and Dark follow the toolbar; in the app the player follows the device. Styling lives in `runtime/blocktickets-callouts.css` (tokens at the top) and `runtime/map-dark.css`.",
      },
    },
  },
  argTypes: { size: { control: "inline-radio", options: ["desktop", "phone"] }, setup: { table: { disable: true } }, theme: { table: { disable: true } } },
  render: (args, context) => <MapPlayerFrame {...args} theme={context.globals.theme === "light" ? "light" : "dark"} />,
} satisfies Meta<typeof MapPlayerFrame>
export default meta
type Story = StoryObj<typeof meta>
const about = (story: string) => ({ docs: { description: { story } } })

export const Overview: Story = {
  parameters: about("The whole venue. Sections are shaded by price, the control rail sits at the right edge and the seat key at the bottom left."),
}
export const SectionTooltip: Story = {
  name: "Section hover and tooltip",
  parameters: about("Pointing at a section outlines it and shows its name with the lowest price. Sold-out sections say so in place of a price."),
  args: { setup: sectionHover },
}
export const SectionOpen: Story = {
  name: "Section open",
  parameters: about("A section is open: green outline with a soft inner glow, the rest of the map dimmed, the chip at the top with seats left and the lowest price, and the minimap showing where you are."),
  args: { setup: intoSection },
}
export const SeatHover: Story = {
  name: "Seat hover card",
  parameters: about("Pointing at a seat rings it and shows a small card with section, row, seat and price."),
  args: { setup: seatHover },
}
export const SeatCard: Story = {
  name: "Seat card (popover)",
  parameters: about("A picked seat on a wide screen: the card sits beside the seat with the 3D picture, the section plan as a second slide, and the ticket types. The thinking orb holds the picture's place until it is ready."),
  args: { setup: seatCard },
}
export const LockedOffer: Story = {
  name: "Locked offer",
  parameters: about("A seat behind an access code. The field and the Unlock button are the library's md size. In the sample venue the code is DEMO."),
  args: { setup: lockedCard },
}
export const StandingSection: Story = {
  name: "Standing section card",
  parameters: about("A section with no seats to pick turns green as a whole and opens a card with its ticket types and a quantity."),
  args: { setup: standingCard },
}
export const SeatKey: Story = {
  name: "Seat key",
  parameters: about("The key to the map's colours. With more than one price it lists the prices, lowest to highest, in the venue's team colours."),
  args: { setup: seatKey },
}
export const ControlTooltip: Story = {
  name: "Map controls and tooltip",
  parameters: about("The control rail: home, locate, full screen, zoom in and out. Resting the pointer on a control for two seconds names it."),
  args: { setup: controlTip },
}
export const PhoneDrawer: Story = {
  name: "Phone: seat drawer",
  parameters: about("On a phone held upright the seat card is a drawer. Pull the handle down to close it, or tap the map. The map glides up so the picked seat stays in view."),
  args: { size: "phone", setup: seatCard },
}
export const PhoneLocked: Story = {
  name: "Phone: locked offer",
  parameters: about("The locked offer in the drawer. With the keyboard up the picture steps aside and the field stays above the keyboard."),
  args: { size: "phone", setup: lockedCard },
}
export const PhoneStanding: Story = {
  name: "Phone: standing section",
  parameters: about("Standing sections use the same drawer."),
  args: { size: "phone", setup: standingCard },
}
export const SeatView: Story = {
  name: "View from the seat (3D)",
  parameters: about("\"View in 3D\" flies from the map down to the seat and lands on the view from it. Drag to look around; the back control returns to the map."),
  args: { setup: seatView },
}
export const LoadError: Story = {
  name: "Venue failed to load",
  parameters: about("An unknown or changed venue folder is refused: the error card with a retry button."),
  args: { venue: "no-such-venue" },
}
