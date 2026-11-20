import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import NextLink from "next/link"
import { ArrowRight, Ticket } from "@phosphor-icons/react"
import { Link, LinkIcon, linkVariants } from "./link"

const meta = {
  title: "Navigation & menus/Link",
  id: "atoms-link",
  component: Link,
  tags: ["autodocs"],
  args: { href: "#", children: "Read the refund policy" },
  parameters: { docs: { description: { component: "A styled anchor: weight 500, no underline at rest, underline on hover and press (offset 4px, 1.5px), focus ring. Add a `LinkIcon` for the small arrow, or put your own icon in it. Use `isDisabled` to turn a link off and `linkVariants()` to style a router link." } } },
} satisfies Meta<typeof Link>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
export const Basic: Story = {
  render: () => <Link href="#">Call to action<LinkIcon /></Link>,
}
export const WithIcon: Story = { args: { showAnchorIcon: true, children: "View the venue map" } }
export const IconPlacement: Story = {
  parameters: { docs: { description: { story: "The icon follows its position in the children: after the text by default, before it when placed first." } } },
  render: () => (
    <div className="flex flex-col items-start gap-3">
      <Link href="#">Call to action<LinkIcon /></Link>
      <Link href="#"><LinkIcon className="me-1 ms-0 pb-0"><ArrowRight weight="bold" className="rotate-180" /></LinkIcon>Back to events</Link>
    </div>
  ),
}
export const CustomIcon: Story = {
  parameters: { docs: { description: { story: "Any icon in `LinkIcon` replaces the arrow." } } },
  render: () => <Link href="#">Get tickets<LinkIcon className="ms-1.5 pb-0"><Ticket weight="bold" /></LinkIcon></Link>,
}
export const Disabled: Story = {
  parameters: { docs: { description: { story: "`isDisabled` dims the link and takes it out of the tab order and out of reach of clicks." } } },
  render: () => <Link href="#" isDisabled>Resale closed</Link>,
}
export const TextDecoration: Story = {
  parameters: { docs: { description: { story: "Underline on hover is the default. Tailwind text-decoration classes change it: always underlined, none, a colour, a style (dotted, dashed, wavy), a thickness or an offset." } } },
  render: () => (
    <div className="flex flex-col items-start gap-3">
      <Link href="#">Default: underline on hover</Link>
      <Link href="#" className="underline">Always underlined</Link>
      <Link href="#" className="hover:no-underline">Never underlined</Link>
      <Link href="#" className="underline decoration-h-accent">Accent colour</Link>
      <Link href="#" className="underline decoration-dotted">Dotted</Link>
      <Link href="#" className="underline decoration-dashed">Dashed</Link>
      <Link href="#" className="underline decoration-wavy">Wavy</Link>
      <Link href="#" className="underline decoration-double">Double</Link>
      <Link href="#" className="underline decoration-4">Thick</Link>
      <Link href="#" className="underline underline-offset-2">Close offset</Link>
    </div>
  ),
}
export const RouterLink: Story = {
  parameters: { docs: { description: { story: "Style a framework link with `asChild`, or with the class strings from `linkVariants()`." } } },
  render: () => {
    const slots = linkVariants()
    return (
      <div className="flex flex-col items-start gap-3">
        <Link asChild><NextLink href="/about">About page (asChild)<LinkIcon /></NextLink></Link>
        <NextLink className={slots.base} href="/about">About page (linkVariants)<LinkIcon className={slots.icon} /></NextLink>
      </div>
    )
  },
}
export const InText: Story = {
  render: () => (
    <p className="max-w-sm text-sm text-h-foreground">Doors open at 7pm. See the <Link href="#">entry requirements</Link> before you travel, or <Link href="#" showAnchorIcon>contact the venue</Link>.</p>
  ),
}
