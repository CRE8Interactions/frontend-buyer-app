import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import Image from "next/image"
import { User } from "@phosphor-icons/react"
import { Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage, AvatarMarble } from "./avatar"

const colors = ["default", "accent", "success", "warning", "danger"] as const
const meta = {
  title: "Display & content/Avatar",
  id: "atoms-avatar",
  component: Avatar,
  tags: ["autodocs"],
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] },
    variant: { control: "select", options: ["default", "soft"] },
    color: { control: "select", options: colors },
  },
  parameters: { docs: { description: { component: "Profile image with a fallback for fans and organizers. The fallback shows when the image is missing or still loading. Size, colour and variant can be set on the avatar or, in a group, on the group." } } },
} satisfies Meta<typeof Avatar>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  args: { size: "md" },
  render: (args) => <Avatar {...args}><AvatarImage src="/missing.png" alt="Marta Silva" /><AvatarFallback>MS</AvatarFallback></Avatar>,
}
export const Sizes: Story = {
  render: () => <div className="flex items-center gap-4">{(["sm", "md", "lg"] as const).map((s) => <Avatar key={s} size={s}><AvatarFallback>JR</AvatarFallback></Avatar>)}</div>,
}
export const Colors: Story = {
  render: () => <div className="flex items-center gap-4">{colors.map((c) => <Avatar key={c} color={c}><AvatarFallback>{c.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>)}</div>,
}
export const Variants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(["default", "soft"] as const).map((v) => (
        <div key={v} className="flex items-center gap-4">
          {colors.map((c) => <Avatar key={c} variant={v} color={c}><AvatarFallback>{c.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>)}
        </div>
      ))}
    </div>
  ),
}
const photos = [
  { src: "/people/joe-fields.jpg", name: "Joe Fields", initials: "JF" },
  { src: "/people/trever-wilson.jpg", name: "Trever Wilson", initials: "TW" },
  { src: "/people/steven-tomlin.jpg", name: "Steven Tomlin", initials: "ST" },
  { src: "/people/eric-grundfast.jpg", name: "Eric Grundfast", initials: "EG" },
  { src: "/people/chaz-haskins.jpg", name: "Chaz Haskins", initials: "CH" },
  { src: "/people/harrison-cogan.jpg", name: "Harrison Cogan", initials: "HC" },
]
export const Images: Story = {
  parameters: { docs: { description: { story: "A photo with an initials fallback. The fallback shows until the image loads, or if it fails." } } },
  render: () => (
    <div className="flex items-center gap-4">
      {photos.slice(0, 2).map((p) => <Avatar key={p.src}><AvatarImage src={p.src} alt={p.name} /><AvatarFallback>{p.initials}</AvatarFallback></Avatar>)}
      <Avatar><AvatarImage src="/missing.png" alt="Missing" /><AvatarFallback>JR</AvatarFallback></Avatar>
    </div>
  ),
}
export const FallbackContent: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar><AvatarFallback>JD</AvatarFallback></Avatar>
      <Avatar><AvatarFallback><User weight="bold" className="size-4" /></AvatarFallback></Avatar>
      <Avatar><AvatarFallback>NA</AvatarFallback></Avatar>
    </div>
  ),
}
export const CustomStyles: Story = {
  parameters: { docs: { description: { story: "Any avatar part takes a className: a gradient fallback, or a squarer corner on the avatar." } } },
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar><AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-500 text-white">GB</AvatarFallback></Avatar>
      <Avatar className="rounded-lg"><AvatarImage src="/people/joe-fields.jpg" alt="Joe Fields" /><AvatarFallback>JF</AvatarFallback></Avatar>
    </div>
  ),
}
export const CustomImageComponent: Story = {
  parameters: { docs: { description: { story: "`asChild` on the image composes it with another image component, here Next.js Image. Pass `src` on the avatar image too, so it can track loading and show the fallback until the image is ready." } } },
  render: () => (
    <Avatar>
      <AvatarImage asChild src="/people/trever-wilson.jpg">
        <Image src="/people/trever-wilson.jpg" alt="Trever Wilson" width={40} height={40} />
      </AvatarImage>
      <AvatarFallback>TW</AvatarFallback>
    </Avatar>
  ),
}
export const WithBadge: Story = {
  render: () => <div className="flex items-center gap-4">{(["sm", "md", "lg"] as const).map((s) => <Avatar key={s} size={s} className="overflow-visible"><AvatarFallback>TR</AvatarFallback><AvatarBadge /></Avatar>)}</div>,
}

const people = ["MS", "JO", "TR", "AL", "CB", "DK", "EP"]
const group = (n = people.length) => people.slice(0, n).map((p, i) => <Avatar key={p}><AvatarFallback color={colors[i % 5]}>{p}</AvatarFallback></Avatar>)

export const Group: Story = {
  parameters: { docs: { description: { story: "Stacked avatars with soft colour tints. The default overlap is a transparent seam that follows the next avatar's outline, so it works on any background." } } },
  render: () => <AvatarGroup variant="soft">{group(4)}</AvatarGroup>,
}
export const GroupWithImages: Story = {
  render: () => (
    <AvatarGroup>
      {photos.slice(0, 4).map((p) => <Avatar key={p.src}><AvatarImage src={p.src} alt={p.name} /><AvatarFallback>{p.initials}</AvatarFallback></Avatar>)}
      <AvatarGroupCount>+2</AvatarGroupCount>
    </AvatarGroup>
  ),
}
export const GroupMax: Story = {
  parameters: { docs: { description: { story: "`max` shows that many avatars and turns the rest into a +N count." } } },
  render: () => <AvatarGroup variant="soft" max={3}>{group()}</AvatarGroup>,
}
export const GroupWithCount: Story = {
  parameters: { docs: { description: { story: "For a known total, add an explicit `AvatarGroupCount`. It is never cut by `max`." } } },
  render: () => <AvatarGroup variant="soft">{group(4)}<AvatarGroupCount>+12</AvatarGroupCount></AvatarGroup>,
}
export const GroupSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {(["sm", "md", "lg"] as const).map((s) => (
        <AvatarGroup key={s} size={s} variant="soft">{group(4)}<AvatarGroupCount>+8</AvatarGroupCount></AvatarGroup>
      ))}
    </div>
  ),
}
export const GroupGrid: Story = {
  render: () => <AvatarGroup variant="soft" isGrid className="max-w-60">{group()}</AvatarGroup>,
}
export const GroupOverlap: Story = {
  parameters: { docs: { description: { story: "Clip cuts a transparent seam; ring draws a background-coloured outline." } } },
  render: () => (
    <div className="flex flex-col gap-6">
      {(["clip", "ring"] as const).map((o) => (
        <div key={o} className="flex items-center gap-4">
          <span className="w-10 text-xs text-h-muted">{o}</span>
          <AvatarGroup variant="soft" overlap={o}>{group(4)}<AvatarGroupCount>+12</AvatarGroupCount></AvatarGroup>
        </div>
      ))}
    </div>
  ),
}

/* A generated avatar for someone known only by their email: its own colour world per person, the same every time. */
const marblePeople = ["sam.okafor@gmail.com", "alex.m@gmail.com", "priya.n@gmail.com", "dad@reyesfamily.com", "m.ortega@gmail.com", "late.claimer@gmail.com", "rach.venneri@gmail.com", "member.services@aggieclub.org", "testeamil@gmail.com", "jordan@blocktickets.xyz"]
export const Marble: Story = {
  parameters: { docs: { description: { story: "`AvatarMarble` makes a soft marble from a seed (the person's email), with a hue picked from the seed so each person has their own colours. Use it for a recipient with no photo and no known name. For the signed-in person use initials, or their photo, on a regular Avatar." } } },
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      {marblePeople.map((p) => <AvatarMarble key={p} seed={p} size="lg" />)}
    </div>
  ),
}
export const MarbleSizes: Story = {
  render: () => <div className="flex items-center gap-4">{(["sm", "md", "lg", "xl"] as const).map((s) => <AvatarMarble key={s} seed="alex.m@gmail.com" size={s} />)}</div>,
}
export const MarbleWithEmail: Story = {
  render: () => (
    <div className="flex items-start gap-8">
      <div className="flex w-28 flex-col items-center gap-2 text-center"><Avatar size="lg"><AvatarFallback>JR</AvatarFallback></Avatar><span className="text-sm text-ink2">You</span></div>
      <div className="flex w-36 flex-col items-center gap-2 text-center"><AvatarMarble seed="sam.okafor@gmail.com" size="lg" /><span className="break-all text-sm text-ink2">sam.okafor@gmail.com</span></div>
    </div>
  ),
}
