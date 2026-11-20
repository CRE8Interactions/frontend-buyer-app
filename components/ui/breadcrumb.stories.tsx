import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "./breadcrumb"

const meta = {
  title: "Navigation & menus/Breadcrumb",
  id: "molecules-breadcrumb",
  component: Breadcrumb,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "Shows where the organizer is in the event tree. The last item is the current page and is not a link. Links are 14px medium muted text with no underline until hover; the current page takes the foreground colour; 12px muted chevron separators (mirrored in right-to-left)." } } },
} satisfies Meta<typeof Breadcrumb>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem><BreadcrumbLink href="#">Events</BreadcrumbLink></BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem><BreadcrumbLink href="#">Harbour Lights Festival</BreadcrumbLink></BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem><BreadcrumbPage>Ticket types</BreadcrumbPage></BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),
}
export const WithEllipsis: Story = {
  render: () => (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem><BreadcrumbLink href="#">Events</BreadcrumbLink></BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem><BreadcrumbEllipsis /></BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem><BreadcrumbLink href="#">Riverside Arena</BreadcrumbLink></BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem><BreadcrumbPage>Section 112</BreadcrumbPage></BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),
}
export const CurrentOnly: Story = {
  render: () => (
    <Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbPage>Dashboard</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>
  ),
}
