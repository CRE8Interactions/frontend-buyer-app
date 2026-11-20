import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { FileText, ImageSquare, Warning, X } from "@phosphor-icons/react"
import { Attachment, AttachmentAction, AttachmentActions, AttachmentContent, AttachmentDescription, AttachmentGroup, AttachmentMedia, AttachmentTitle } from "./attachment"

const meta = {
  title: "Display & content/Attachment",
  id: "molecules-attachment",
  component: Attachment,
  tags: ["autodocs"],
  argTypes: {
    shape: { control: "select", options: ["rounded", "pill"] },
    state: { control: "select", options: ["idle", "uploading", "processing", "error", "done"] },
    size: { control: "select", options: ["default", "sm", "xs"] },
    orientation: { control: "select", options: ["horizontal", "vertical"] },
  },
  parameters: { docs: { description: { component: "A file chip with media, title and actions. Five states cover the whole upload lifecycle." } } },
} satisfies Meta<typeof Attachment>
export default meta
type Story = StoryObj<typeof meta>

const File = ({ title, description, progress, state, ...props }: React.ComponentProps<typeof Attachment> & { title: string; description: string; progress?: number }) => (
  <Attachment state={state} {...props}>
    <AttachmentMedia progress={state === "uploading" ? progress : undefined}><FileText weight="bold" /></AttachmentMedia>
    <AttachmentContent><AttachmentTitle>{title}</AttachmentTitle><AttachmentDescription>{description}</AttachmentDescription></AttachmentContent>
    <AttachmentActions><AttachmentAction aria-label="Remove"><X weight="bold" /></AttachmentAction></AttachmentActions>
  </Attachment>
)

export const Playground: Story = {
  args: { state: "done", size: "default", orientation: "horizontal" },
  render: (args) => <File {...args} title="Riverside-Arena-seating-plan.pdf" description="2.4 MB" />,
}
export const States: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-3">
      <File state="idle" title="Drop the floor plan here" description="PDF up to 10 MB" />
      <File state="uploading" progress={62} title="Harbour-Lights-contract.pdf" description="Uploading 62%" />
      <File state="processing" title="Press-kit.pdf" description="Scanning file" />
      <File state="done" title="Rider-technical.pdf" description="1.1 MB" />
      <File state="error" title="Venue-licence.pdf" description="Upload failed, file too large" />
    </div>
  ),
}
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-3">
      {(["default", "sm", "xs"] as const).map((s) => <File key={s} size={s} title={`Set-times-${s}.pdf`} description="320 KB" />)}
    </div>
  ),
}
export const Vertical: Story = {
  render: () => (
    <AttachmentGroup>
      {["Stage-left.jpg", "Floor-view.jpg", "Balcony.jpg"].map((n) => (
        <Attachment key={n} orientation="vertical">
          <AttachmentMedia variant="image"><ImageSquare weight="bold" /></AttachmentMedia>
          <AttachmentContent><AttachmentTitle>{n}</AttachmentTitle><AttachmentDescription>Venue photo</AttachmentDescription></AttachmentContent>
        </Attachment>
      ))}
      <Attachment orientation="vertical" state="error">
        <AttachmentMedia><Warning weight="bold" /></AttachmentMedia>
        <AttachmentContent><AttachmentTitle>Entrance.jpg</AttachmentTitle><AttachmentDescription>Failed</AttachmentDescription></AttachmentContent>
      </Attachment>
    </AttachmentGroup>
  ),
}

export const Shapes: Story = {
  parameters: { docs: { description: { story: "Rounded (default) has 12px corners and an 8px tile. Pill is fully round with a circular tile. Pick one per screen." } } },
  render: () => (
    <div className="flex flex-col items-start gap-6">
      {(["rounded", "pill"] as const).map((shape) => (
        <div key={shape} className="flex flex-col items-start gap-3">
          <File shape={shape} title="Riverside-Arena-seating-plan.pdf" description="2.4 MB" />
          <File shape={shape} state="uploading" progress={62} title="Harbour-Lights-contract.pdf" description="Uploading 62%" />
          <File shape={shape} state="error" title="Venue-licence.pdf" description="Upload failed" />
        </div>
      ))}
    </div>
  ),
}
