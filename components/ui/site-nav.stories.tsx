import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import Nav from "@/app/concept/Nav"
import { CSS } from "@/app/concept/styles"

const meta = {
  title: "Page sections/Navigation header",
  id: "organisms-site-nav",
  component: Nav,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: "the site header: a floating glass bar that fills in as the page scrolls. `business` is the marketing bar (Platform, Results, Our Story, Sell with us, theme switch, Book a call); `user` is the ticket buyer's bar (search, theme, Log in, or the account menu when signed in). From 760px down it becomes one floating island showing the current chapter, and the menu button grows the island into the menu. Use the Mobile and Tablet stories (or the viewport toolbar) to see it." } },
  },
  decorators: [
    (Story) => (
      <div className="n" style={{ minHeight: "160vh", position: "relative" }}>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        {/* colourful shapes behind the bar, so the frosted menus have something to blur */}
        <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: 40, right: "8%", width: 260, height: 260, borderRadius: "50%", background: "#97DD62" }} />
          <div style={{ position: "absolute", top: 160, right: "26%", width: 220, height: 220, borderRadius: "50%", background: "#3358D4" }} />
          <div style={{ position: "absolute", top: 20, left: "12%", width: 300, height: 140, borderRadius: 70, background: "#E8A317" }} />
        </div>
        <Story />
        <section data-chapter="Overview" className="n-sec"><div className="n-wrap"><h2>Scroll to see the glass fill in</h2><p>The bar's blur and fill ease in over the first 140px of scroll.</p></div></section>
        <section data-chapter="Details" className="n-sec" style={{ paddingTop: 320 }}><div className="n-wrap"><h2>Second chapter</h2><p>On small screens the island names the chapter you are in.</p></div></section>
      </div>
    ),
  ],
} satisfies Meta<typeof Nav>
export default meta
type Story = StoryObj<typeof meta>

export const Business: Story = { args: { variant: "business" } }
export const Buyer: Story = { args: { variant: "user" } }
export const BuyerSignedIn: Story = {
  name: "Buyer, signed in",
  args: { variant: "user", account: { name: "Jordan Reyes", email: "jordan@email.com" } },
}
export const Mobile: Story = {
  args: { variant: "business" },
  globals: { viewport: { value: "mobile1", isRotated: false } },
}
export const MobileBuyer: Story = {
  name: "Mobile, buyer",
  args: { variant: "user" },
  globals: { viewport: { value: "mobile1", isRotated: false } },
}
export const Tablet: Story = {
  args: { variant: "business" },
  globals: { viewport: { value: "tablet", isRotated: false } },
}
