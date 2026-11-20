import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./resizable"

const meta = {
  title: "Layout & foundations/Resizable",
  id: "molecules-resizable",
  component: ResizablePanelGroup,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "Drag the handle to resize panels. The group fills its parent, so the parent needs an explicit size." } } },
} satisfies Meta<typeof ResizablePanelGroup>
export default meta
type Story = StoryObj<typeof meta>

const Pane = ({ title, body }: { title: string; body: string }) => (
  <div className="flex h-full flex-col gap-1 p-4"><p className="font-semibold">{title}</p><p className="text-sm text-muted-foreground">{body}</p></div>
)
export const Horizontal: Story = {
  render: () => (
    <div className="h-64 w-[640px] max-w-full overflow-hidden rounded-3xl border">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize={35} minSize={20}><Pane title="Sections" body="Lower Bowl, Club, Upper Bowl" /></ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={65}><Pane title="Seat map" body="Section 112, Row F, 14 seats left" /></ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
}
export const Vertical: Story = {
  render: () => (
    <div className="h-80 w-[420px] max-w-full overflow-hidden rounded-3xl border">
      <ResizablePanelGroup orientation="vertical">
        <ResizablePanel defaultSize={60}><Pane title="Orders" body="1,840 tickets sold" /></ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={40}><Pane title="Activity" body="Maya Chen bought 2 tickets" /></ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
}
export const ThreePanels: Story = {
  render: () => (
    <div className="h-56 w-[720px] max-w-full overflow-hidden rounded-3xl border">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize={25}><Pane title="Filters" body="Price, date, venue" /></ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50}><Pane title="Results" body="286 events" /></ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={25}><Pane title="Cart" body="2 tickets, $284" /></ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
}
