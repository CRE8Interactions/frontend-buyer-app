import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import Footer from "@/app/concept/Footer"
import { CSS } from "@/app/concept/styles"

const meta = {
  title: "Page sections/Footer",
  id: "organisms-site-footer",
  component: Footer,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: "the shared site footer: logo and two-tone slogan, then Company, For fans, Legal and Support link columns, and the small print. Legal links and the Help Center open in a new tab; Browse and Log in sit under For fans. It follows the light and dark theme." } },
  },
  decorators: [
    (Story) => (
      <div className="n" style={{ minHeight: "60vh", display: "flex", alignItems: "flex-end" }}>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div style={{ width: "100%" }}><Story /></div>
      </div>
    ),
  ],
} satisfies Meta<typeof Footer>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Mobile: Story = { globals: { viewport: { value: "mobile1", isRotated: false } } }
export const Tablet: Story = { globals: { viewport: { value: "tablet", isRotated: false } } }
