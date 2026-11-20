import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ImageSquare, Paperclip, UploadSimple } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import { DropZone, DropZoneFileList, type DropZoneFile, type DropZoneProps } from "./drop-zone"

const meta = {
  title: "Forms & inputs/Drop zone",
  id: "molecules-drop-zone",
  component: DropZone,
  tags: ["autodocs"],
  decorators: [
    (Story, { viewMode }) => (
      <div className={cn("grid content-center", viewMode === "story" && "min-h-[calc(100dvh-3rem)]")}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    controls: { disable: true },
    docs: { description: { component: "Select or drop files with optional type and size limits. The file list displays upload progress and supports removal and retry. Uploads in these stories are simulated." } },
  },
} satisfies Meta<typeof DropZone>
export default meta
type Story = StoryObj

type DemoFile = DropZoneFile & { simulated?: boolean }

const projectFiles: DemoFile[] = [
  { id: "report", name: "Annual report 2025.pdf", size: "2.2 MB", status: "complete" },
  { id: "banner", name: "Hero banner.png", size: "480 KB", status: "uploading", progress: 42 },
  { id: "video", name: "Onboarding flow.mp4", size: "8.0 MB", status: "failed" },
]

const compactFiles: DemoFile[] = [
  { id: "logo", name: "Logo dark.svg", size: "24 KB", status: "complete" },
  { id: "notes", name: "Meeting notes.docx", size: "350 KB", status: "uploading", progress: 68 },
  { id: "demo", name: "Demo recording.mp4", size: "5.0 MB", status: "failed", error: "Something went wrong, please retry" },
]

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

function useDemoFiles(initialFiles: DemoFile[] = []) {
  const [files, setFiles] = React.useState(initialFiles)
  const nextFileId = React.useRef(0)
  const uploading = files.some((file) => file.simulated && file.status === "uploading")

  React.useEffect(() => {
    if (!uploading) return

    const timer = window.setInterval(() => {
      setFiles((current) => current.map((file) => {
        if (!file.simulated || file.status !== "uploading") return file
        const progress = Math.min(100, (file.progress ?? 0) + 20)
        return { ...file, progress, status: progress === 100 ? "complete" : "uploading" }
      }))
    }, 240)

    return () => window.clearInterval(timer)
  }, [uploading])

  function add(selected: File[], multiple: boolean) {
    const additions: DemoFile[] = selected.map((file) => ({
      id: String(nextFileId.current++),
      name: file.name,
      size: formatSize(file.size),
      progress: 0,
      status: "uploading",
      simulated: true,
    }))
    setFiles((current) => multiple ? [...current, ...additions] : additions)
  }

  return {
    add,
    list: {
      files,
      onRemove: (id: string) => setFiles((current) => current.filter((file) => file.id !== id)),
      onRetry: (id: string) => setFiles((current) => current.map((file) =>
        file.id === id ? { ...file, progress: 0, status: "uploading", simulated: true } : file,
      )),
    },
  }
}

function DropZoneDemo({
  initialFiles,
  wide,
  ...props
}: Omit<DropZoneProps, "onFiles" | "children"> & { initialFiles?: DemoFile[]; wide?: boolean }) {
  const { add, list } = useDemoFiles(initialFiles)
  return (
    <DropZone
      {...props}
      className={cn("mx-auto", wide ? "max-w-[480px]" : "max-w-[420px]")}
      onFiles={(files) => add(files, props.multiple ?? false)}
    >
      <DropZoneFileList {...list} />
    </DropZone>
  )
}

function CompactDemo() {
  const { list } = useDemoFiles(compactFiles)
  return <div className="mx-auto max-w-[480px]"><DropZoneFileList compact {...list} /></div>
}

const documents = ".pdf,.doc,.docx,.txt"
const images = ".png,.jpg,.jpeg,.gif,.webp,.svg"

export const Default: Story = {
  render: () => (
    <DropZoneDemo
      label="Drag files here or click to browse"
      description="Supports JPEG, PNG, PDF, and MP4 up to 50 MB."
      trigger="Select File"
      accept=".jpeg,.jpg,.png,.pdf,.mp4"
      maxSizeMB={50}
    />
  ),
}

export const WithFileList: Story = {
  render: () => (
    <DropZoneDemo
      wide multiple
      label="Upload project assets"
      description="Documents, images, or videos up to 10 MB each."
      trigger="Add Files"
      accept={`${documents},image/*,video/*`}
      maxSizeMB={10}
      initialFiles={projectFiles}
    />
  ),
}

export const CompactFileList: Story = { render: () => <CompactDemo /> }

export const Disabled: Story = {
  render: () => (
    <DropZoneDemo disabled label="File upload unavailable" description="Uploads are temporarily disabled." trigger="Select File" />
  ),
}

export const ImageOnly: Story = {
  render: () => (
    <DropZoneDemo label="Drop your images here" description="Accepts PNG, JPG, GIF, WebP, and SVG." trigger="Select Images" accept={images} />
  ),
}

export const MaxSizeLimit: Story = {
  render: () => (
    <DropZoneDemo
      multiple
      label="Attach files (5 MB limit per file)"
      description="Any file type accepted. Files over 5 MB will be rejected."
      trigger="Select Files"
      maxSizeMB={5}
    />
  ),
}

export const MultipleFiles: Story = {
  render: () => (
    <DropZoneDemo wide multiple label="Add multiple attachments" description="All formats welcome, 50 MB max per file." trigger="Choose Files" maxSizeMB={50} />
  ),
}

export const CustomIcon: Story = {
  render: () => (
    <DropZoneDemo
      label="Set your profile photo"
      description="PNG or JPG under 2 MB. Best at 400 × 400 px."
      trigger="Pick Image"
      icon={<ImageSquare weight="bold" />}
      accept=".png,.jpg,.jpeg"
      maxSizeMB={2}
    />
  ),
}

export const CustomTriggers: Story = {
  render: () => (
    <div className="grid gap-8">
      <DropZoneDemo
        wide multiple
        label="Drag files here to get started"
        description="PDF, DOCX, or TXT up to 25 MB."
        trigger={<><UploadSimple weight="bold" /> Upload Files</>}
        triggerVariant="primary"
        triggerClassName="mt-2"
        accept=".pdf,.docx,.txt"
        maxSizeMB={25}
      />
      <DropZoneDemo
        wide
        label="Attach supporting documents"
        description="Any format, 10 MB limit."
        icon={<Paperclip weight="bold" />}
        trigger="Browse from your device"
        triggerVariant="ghost"
        triggerClassName="mt-0 h-6 px-0 md:h-6 [--button-fg:var(--h-foreground)]"
        maxSizeMB={10}
      />
      <DropZoneDemo
        wide
        label="Import spreadsheet data"
        description="CSV or XLSX files only."
        trigger="Choose Spreadsheet"
        triggerVariant="secondary"
        triggerClassName="mt-2 h-8 px-3 md:h-8"
        accept=".csv,.xlsx"
      />
    </div>
  ),
}
