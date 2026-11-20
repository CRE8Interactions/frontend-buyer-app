import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Button } from "./button"
import { DirectionProvider } from "./direction"
import { Input } from "./input"
import { Label } from "./label"

const meta = {
  title: "Layout & foundations/Direction",
  id: "molecules-direction",
  component: DirectionProvider,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "Sets text direction for Radix primitives (menus, tabs, sliders) so they mirror in right-to-left languages." } } },
} satisfies Meta<typeof DirectionProvider>
export default meta
type Story = StoryObj<typeof meta>

function Panel({ dir, title, label, cta }: { dir: "ltr" | "rtl"; title: string; label: string; cta: string }) {
  return (
    <DirectionProvider dir={dir} direction={dir}>
      <div dir={dir} className="flex flex-1 flex-col gap-3 rounded-lg border p-4">
        <h3 className="text-base font-semibold">{title}</h3>
        <Label htmlFor={`email-${dir}`}>{label}</Label>
        <Input id={`email-${dir}`} placeholder="fan@example.com" />
        <Button>{cta}</Button>
      </div>
    </DirectionProvider>
  )
}

export const LtrAndRtl: Story = {
  args: { dir: "ltr", children: null },
  render: () => (
    <div className="flex max-w-3xl gap-4">
      <Panel dir="ltr" title="Get tickets" label="Email address" cta="Buy tickets" />
      <Panel dir="rtl" title="احصل على التذاكر" label="البريد الإلكتروني" cta="اشترِ التذاكر" />
    </div>
  ),
}
