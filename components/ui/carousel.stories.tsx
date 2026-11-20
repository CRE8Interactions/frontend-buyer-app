import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./carousel"

const meta = {
  title: "Display & content/Carousel",
  id: "molecules-carousel",
  component: Carousel,
  tags: ["autodocs"],
  argTypes: { orientation: { control: "select", options: ["horizontal", "vertical"] } },
  parameters: { docs: { description: { component: "Swipeable row of cards built on Embla. Arrow keys and the previous/next buttons both work." } } },
} satisfies Meta<typeof Carousel>
export default meta
type Story = StoryObj<typeof meta>

const events = [
  { name: "Harbour Lights Festival", date: "Sat 14 Jun", price: "from $68" },
  { name: "Riverside Jazz Night", date: "Fri 20 Jun", price: "from $42" },
  { name: "Old Town Comedy Cup", date: "Thu 26 Jun", price: "from $35" },
  { name: "Summer Sessions Live", date: "Sat 5 Jul", price: "from $89" },
  { name: "Rooftop Cinema Club", date: "Sun 13 Jul", price: "from $24" },
]
const Card = ({ e }: { e: (typeof events)[number] }) => (
  <div className="flex h-44 flex-col justify-end rounded-3xl bg-secondary p-5">
    <p className="text-sm text-muted-foreground">{e.date}</p>
    <p className="text-lg font-semibold">{e.name}</p>
    <p className="text-sm text-muted-foreground">{e.price}</p>
  </div>
)

export const Default: Story = {
  render: (args) => (
    <div className="mx-auto w-full max-w-xs">
      <Carousel {...args}>
        <CarouselContent>{events.map((e) => <CarouselItem key={e.name}><Card e={e} /></CarouselItem>)}</CarouselContent>
        <CarouselPrevious /><CarouselNext />
      </Carousel>
    </div>
  ),
}
export const MultipleSlides: Story = {
  render: () => (
    <div className="mx-auto w-full max-w-2xl px-12">
      <Carousel opts={{ align: "start" }}>
        <CarouselContent>{events.map((e) => <CarouselItem key={e.name} className="basis-1/2 lg:basis-1/3"><Card e={e} /></CarouselItem>)}</CarouselContent>
        <CarouselPrevious /><CarouselNext />
      </Carousel>
    </div>
  ),
}
export const Vertical: Story = {
  render: () => (
    <div className="mx-auto w-full max-w-xs py-12">
      <Carousel orientation="vertical" opts={{ align: "start" }}>
        <CarouselContent className="h-48">{events.map((e) => <CarouselItem key={e.name} className="basis-1/2"><Card e={e} /></CarouselItem>)}</CarouselContent>
        <CarouselPrevious /><CarouselNext />
      </Carousel>
    </div>
  ),
}
