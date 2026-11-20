import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ArrowRight, Basketball, Bell, Hockey } from "@phosphor-icons/react"
import Button from "@/components/atoms/Button"
import { Status } from "@/components/ui/status"
import EventTile from "./EventTile"
import TicketStrip from "./TicketStrip"
import { EVENT_TILE_CSS } from "./event-tile-styles"
import { TICKET_STRIP_CSS } from "./ticket-strip-styles"

const poster = (a: string, b: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='600' height='800'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs><rect width='600' height='800' fill='url(#g)'/><circle cx='300' cy='260' r='150' fill='white' fill-opacity='.85'/><circle cx='300' cy='260' r='96' fill='${a}'/></svg>`)}`

const css = { "--land": "cubic-bezier(.34,1.3,.64,1)", "--out": "cubic-bezier(.23,1,.32,1)" } as React.CSSProperties
const cat = (Icon: typeof Hockey, label: string) => <span className="br-cat-t"><Icon size={14} weight="bold" aria-hidden />{label}</span>
const price = (p: string) => <span className="br-pr"><small>From</small><b>{p}</b></span>
const get = <Button href="#" variant="ghost" size="sm">Get tickets<ArrowRight weight="bold" aria-hidden /></Button>
const remind = <Button href="#" variant="ghost" size="sm"><Bell weight="bold" aria-hidden />Remind me</Button>

const EVENTS = [
  { img: poster("#b8c2cc", "#6d7782"), status: "On sale", date: "Mon, Nov 16", cat: [Basketball, "Basketball"] as const, title: "NMSU WBB vs Kansas City", meta: "6:00 PM · Pan American Center · Las Cruces, NM", price: "$4.50" },
  { img: poster("#d8dde2", "#8b95a0"), status: "On sale", date: "Thu, Nov 19", cat: [Hockey, "Hockey"] as const, title: "Niagara IceDogs vs Saginaw Spirit", meta: "7:00 PM · Niagara IceDogs Hockey Club · St. Catharines, ON", price: "$17" },
  { img: poster("#8a5a1f", "#3b2410"), status: "On sale", date: "Fri, Nov 20", cat: [Hockey, "Hockey"] as const, title: "Des Moines Buccaneers vs. Muskegon Lumberjacks", meta: "7:05 PM · MidAmerican Energy Company RecPlex · West Des Moines, IA", price: "$12" },
  { img: poster("#b3201c", "#4a0b0a"), status: "On sale", date: "Fri, Nov 20", cat: [Hockey, "Hockey"] as const, title: "North Iowa Bulls vs. Willmar WarHawks", meta: "7:10 PM · Mason City Arena · Mason City, IA", price: "$9" },
]

function Grid({ children }: { children: React.ReactNode }) {
  return <ul className="br-tg">{children}</ul>
}

const meta = {
  title: "Page sections/Event cards",
  id: "organisms-event-cards",
  parameters: {
    layout: "padded",
    docs: { description: { component: "The two event cards used on Browse, the wallet, and team and venue pages. The vertical tile (`EventTile`, styles in `event-tile-styles.ts`) is a 3:4 poster with status and date on the photo, category, title and place over a dark fade, and a ticket-stub bar with price and button. The horizontal row (`TicketStrip`, styles in `ticket-strip-styles.ts`) is date, picture, title and place, and a stub with price and button; it stacks on phones. Pages pass content, never styles." } },
  },
  decorators: [(Story: React.ComponentType) => <div className="br" style={css}><style dangerouslySetInnerHTML={{ __html: EVENT_TILE_CSS + TICKET_STRIP_CSS }} /><Story /></div>],
} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const Tiles: Story = {
  render: () => (
    <Grid>
      {EVENTS.map((e) => (
        <li key={e.title}><EventTile img={e.img} status={<Status color="success">{e.status}</Status>} dateLabel={e.date} category={cat(e.cat[0], e.cat[1])} title={e.title} href="#" meta={e.meta} price={price(e.price)} cta={get} /></li>
      ))}
    </Grid>
  ),
}
export const TileStates: Story = {
  name: "Tile: presale, no picture, no price",
  render: () => (
    <Grid>
      <li><EventTile img={EVENTS[0].img} status={<Status color="info">Presale</Status>} dateLabel="Sat, Nov 21" category={cat(Basketball, "Basketball")} title="NMSU Football vs. Delaware" href="#" meta="1:00 PM · Aggie Memorial Stadium · Las Cruces, NM" price={<span className="br-pr" />} cta={remind} /></li>
      <li><EventTile mono="PA" status={<Status color="success">On sale</Status>} dateLabel="Sun, Nov 22" category={cat(Hockey, "Hockey")} title="Pan American Center" href="#" meta="Las Cruces, NM" price={price("$11.50")} cta={get} /></li>
    </Grid>
  ),
}
const Rows = () => (
  <ul style={{ display: "grid", gap: 12, listStyle: "none", margin: 0, padding: 0 }}>
    {EVENTS.map((e, i) => (
      <li key={e.title}><TicketStrip dow={e.date.split(",")[0]} d={20 + i} img={e.img} chips={<><span className="tk-cat">{e.cat[1]}</span><Status color="success">{e.status}</Status></>} title={e.title} href="#" meta={e.meta} price={e.price} cta={get} /></li>
    ))}
  </ul>
)
export const Horizontal: Story = { name: "Horizontal row", render: () => <Rows /> }
export const HorizontalMobile: Story = {
  name: "Horizontal row (mobile)",
  globals: { viewport: { value: "mobile1", isRotated: false } },
  render: () => <Rows />,
}
export const TilesMobile: Story = {
  name: "Tiles (mobile)",
  globals: { viewport: { value: "mobile1", isRotated: false } },
  render: Tiles.render,
}
