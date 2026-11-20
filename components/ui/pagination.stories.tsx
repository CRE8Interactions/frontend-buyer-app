import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPageSize, PaginationPrevious, PaginationSummary } from "./pagination"

const meta = {
  title: "Navigation & menus/Pagination",
  id: "molecules-pagination",
  component: Pagination,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "Page links for event search results. The current page is an outline pill with aria-current." } } },
} satisfies Meta<typeof Pagination>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Pagination>
      <PaginationContent>
        <PaginationItem><PaginationPrevious href="#" /></PaginationItem>
        <PaginationItem><PaginationLink href="#">1</PaginationLink></PaginationItem>
        <PaginationItem><PaginationLink href="#" isActive>2</PaginationLink></PaginationItem>
        <PaginationItem><PaginationLink href="#">3</PaginationLink></PaginationItem>
        <PaginationItem><PaginationEllipsis /></PaginationItem>
        <PaginationItem><PaginationLink href="#">24</PaginationLink></PaginationItem>
        <PaginationItem><PaginationNext href="#" /></PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
}
export const FirstPage: Story = {
  render: () => (
    <div className="grid gap-3">
      <p className="text-center text-sm text-muted-foreground">Showing 1 to 12 of 286 events</p>
      <Pagination>
        <PaginationContent>
          <PaginationItem><PaginationPrevious href="#" aria-disabled className="pointer-events-none opacity-50" /></PaginationItem>
          {[1, 2, 3].map((n) => <PaginationItem key={n}><PaginationLink href="#" isActive={n === 1}>{n}</PaginationLink></PaginationItem>)}
          <PaginationItem><PaginationEllipsis /></PaginationItem>
          <PaginationItem><PaginationNext href="#" /></PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  ),
}

const WithPageSizeDemo = () => {
  const [size, setSize] = React.useState(10)
  const total = 286
  const pages = Math.ceil(total / size)
  return (
    <div className="flex w-full flex-col items-center justify-between gap-4 px-2 sm:flex-row sm:gap-6">
      <PaginationSummary>Showing 1 to {Math.min(size, total)} of {total} events</PaginationSummary>
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem><PaginationPrevious href="#" /></PaginationItem>
          <PaginationItem><PaginationLink href="#" isActive>1</PaginationLink></PaginationItem>
          <PaginationItem><PaginationLink href="#">2</PaginationLink></PaginationItem>
          <PaginationItem><PaginationLink href="#">3</PaginationLink></PaginationItem>
          <PaginationItem><PaginationEllipsis /></PaginationItem>
          <PaginationItem><PaginationLink href="#">{pages}</PaginationLink></PaginationItem>
          <PaginationItem><PaginationNext href="#" /></PaginationItem>
        </PaginationContent>
      </Pagination>
      <PaginationPageSize value={size} onValueChange={setSize} />
    </div>
  )
}
export const WithSummaryAndPageSize: Story = {
  parameters: { docs: { description: { story: "Summary on the left, page links in the middle, results per page on the right. Changing the page size recalculates the last page." } } },
  render: () => <WithPageSizeDemo />,
}

export const WithLabels: Story = {
  parameters: { docs: { description: { story: "Optional text on Previous and Next. They switch to auto width." } } },
  render: () => (
    <Pagination>
      <PaginationContent>
        <PaginationItem><PaginationPrevious href="#">Previous</PaginationPrevious></PaginationItem>
        <PaginationItem><PaginationLink href="#">1</PaginationLink></PaginationItem>
        <PaginationItem><PaginationLink href="#" isActive>2</PaginationLink></PaginationItem>
        <PaginationItem><PaginationLink href="#">3</PaginationLink></PaginationItem>
        <PaginationItem><PaginationNext href="#">Next</PaginationNext></PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
}
