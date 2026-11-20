"use client"

import * as React from "react"
import { CheckCircle, CloudArrowUp, File, Trash, XCircle } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentTitle,
} from "./attachment"
import { Button } from "./button"
import { Progress } from "./progress"

type DropZoneProps = {
  label: string
  description: string
  accept?: string
  maxSizeMB?: number
  multiple?: boolean
  disabled?: boolean
  icon?: React.ReactNode
  trigger?: React.ReactNode
  triggerVariant?: React.ComponentProps<typeof Button>["variant"]
  triggerClassName?: string
  onFiles: (files: File[]) => void
  className?: string
  children?: React.ReactNode
}

function acceptsFile(file: File, rules: string[]) {
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  return rules.length === 0 || rules.some((rule) => {
    if (rule.startsWith(".")) return name.endsWith(rule)
    if (rule.endsWith("/*")) return type.startsWith(rule.slice(0, -1))
    return rule === type
  })
}

function DropZone({
  label,
  description,
  accept,
  maxSizeMB,
  multiple = false,
  disabled = false,
  icon = <CloudArrowUp weight="bold" />,
  trigger = "Select files",
  triggerVariant = "outline",
  triggerClassName,
  onFiles,
  className,
  children,
}: DropZoneProps) {
  const id = React.useId()
  const input = React.useRef<HTMLInputElement>(null)
  const dragDepth = React.useRef(0)
  const [dragging, setDragging] = React.useState(false)
  const [errors, setErrors] = React.useState<string[]>([])

  function receiveFiles(files: FileList) {
    if (disabled || !files.length) return

    const rules = (accept ?? "").toLowerCase().split(",").map((rule) => rule.trim()).filter(Boolean)
    const selected: File[] = []
    const rejected: string[] = []

    for (const file of Array.from(files)) {
      if (!acceptsFile(file, rules)) {
        rejected.push(`${file.name} has an unsupported file type.`)
      } else if (maxSizeMB !== undefined && file.size > maxSizeMB * 1024 ** 2) {
        rejected.push(`${file.name} exceeds the ${maxSizeMB} MB limit.`)
      } else if (multiple || selected.length === 0) {
        selected.push(file)
      }
    }

    setErrors(rejected)
    if (selected.length) onFiles(selected)
  }

  return (
    <div data-slot="drop-zone" className={cn("grid w-full min-w-0 gap-3", className)}>
      <div
        role="group"
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-description`}
        aria-disabled={disabled || undefined}
        data-slot="drop-zone-area"
        data-drop-target={!disabled && dragging ? "true" : undefined}
        data-disabled={disabled ? "true" : undefined}
        className="flex cursor-pointer flex-col items-center gap-2 rounded-[16px] border border-dashed border-h-muted/55 px-6 py-8 text-center text-h-foreground transition-colors has-[:focus-visible]:h-focus-ring data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50 data-[drop-target=true]:border-h-accent data-[drop-target=true]:bg-h-accent-soft motion-reduce:transition-none"
        onClick={() => { if (!disabled) input.current?.click() }}
        onDragEnter={(event) => {
          if (!event.dataTransfer.types.includes("Files")) return
          event.preventDefault()
          if (!disabled) {
            dragDepth.current++
            setDragging(true)
          }
        }}
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes("Files")) return
          event.preventDefault()
          event.dataTransfer.dropEffect = disabled ? "none" : "copy"
        }}
        onDragLeave={() => {
          dragDepth.current = Math.max(0, dragDepth.current - 1)
          if (dragDepth.current === 0) setDragging(false)
        }}
        onDrop={(event) => {
          if (!event.dataTransfer.types.includes("Files")) return
          event.preventDefault()
          dragDepth.current = 0
          setDragging(false)
          receiveFiles(event.dataTransfer.files)
        }}
      >
        <span aria-hidden="true" className="grid size-8 place-items-center text-h-muted [&>svg]:size-full">
          {icon}
        </span>
        <span id={`${id}-label`} className="text-sm font-medium">{label}</span>
        <span id={`${id}-description`} className="text-xs text-h-muted">{description}</span>
        <Button
          type="button"
          data-slot="drop-zone-trigger"
          variant={triggerVariant}
          disabled={disabled}
          className={cn("mt-1 h-9 md:h-9", triggerClassName)}
        >
          {trigger}
        </Button>
      </div>
      <input
        ref={input}
        data-slot="drop-zone-input"
        hidden
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(event) => {
          if (event.currentTarget.files) receiveFiles(event.currentTarget.files)
          event.currentTarget.value = ""
        }}
      />
      <div role="alert" className="empty:sr-only">
        {errors.length > 0 && (
          <ul className="grid gap-1 text-xs wrap-anywhere text-h-danger-text">
            {errors.map((error, index) => <li key={index}>{error}</li>)}
          </ul>
        )}
      </div>
      {children}
    </div>
  )
}

type DropZoneFile = {
  id: string
  name: string
  size: string
  status: "uploading" | "complete" | "failed"
  progress?: number
  error?: string
}

type DropZoneFileListProps = {
  files: DropZoneFile[]
  compact?: boolean
  onRemove: (id: string) => void
  onRetry?: (id: string) => void
}

const formatColors: Record<string, string> = {
  PDF: "bg-h-danger text-h-danger-foreground",
  DOC: "bg-h-info text-h-info-foreground",
  DOCX: "bg-h-info text-h-info-foreground",
  PNG: "bg-h-success text-h-success-foreground",
  JPG: "bg-h-success text-h-success-foreground",
  JPEG: "bg-h-success text-h-success-foreground",
  SVG: "bg-h-success text-h-success-foreground",
  MP4: "bg-h-warning text-h-warning-foreground",
}

function DropZoneFileList({ files, compact = false, onRemove, onRetry }: DropZoneFileListProps) {
  if (!files.length) return null

  return (
    <ul data-slot="drop-zone-file-list" aria-label="Files" className="grid w-full min-w-0 gap-2">
      {files.map((file) => {
        const format = (file.name.match(/\.([^.]+)$/)?.[1] ?? "FILE").slice(0, 5).toUpperCase()
        const failed = file.status === "failed"
        const complete = file.status === "complete"
        const progress = complete ? 100 : file.progress
        return (
          <li key={file.id} data-slot="drop-zone-file-item" data-status={file.status} className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150">
            <Attachment
              className={cn(
                "w-full flex-nowrap items-start gap-3 rounded-[16px] border border-h-border bg-transparent p-3 has-data-[slot=attachment-content]:p-3",
                failed && "border-h-danger/35",
              )}
            >
              <span aria-hidden="true" className="relative block h-10 w-8 shrink-0 text-h-border">
                <File weight="bold" className="absolute inset-0 h-10 w-8 scale-[1.18] fill-h-default" />
                <span className={cn("absolute bottom-1 left-0 rounded-[4px] px-[3px] py-0.5 text-[8px]/[10px] font-bold", formatColors[format] ?? "bg-h-default text-h-default-foreground")}>
                  {format}
                </span>
              </span>
              <AttachmentContent className="grid gap-0.5">
                <AttachmentTitle title={file.name}>{file.name}</AttachmentTitle>
                <AttachmentDescription className="flex flex-wrap items-center gap-1">
                  {file.size}
                  {!(failed && file.error) && (
                    <>
                      <span aria-hidden="true">|</span>
                      {complete && <CheckCircle weight="fill" aria-hidden="true" className="size-3 text-h-success" />}
                      {failed && <XCircle weight="fill" aria-hidden="true" className="size-3 text-h-danger-text" />}
                      {compact && file.status === "uploading" && <CloudArrowUp weight="bold" aria-hidden="true" className="size-3" />}
                      <span className={failed ? "text-h-danger-text" : undefined}>
                        {failed ? "Failed" : compact && progress !== undefined ? `${progress}%` : complete ? "Complete" : "Uploading…"}
                      </span>
                    </>
                  )}
                </AttachmentDescription>
                {file.error && failed && <p className="text-xs wrap-anywhere text-h-muted">{file.error}</p>}
                {!compact && !failed && (
                  <Progress
                    size="sm"
                    value={progress}
                    color={complete ? "success" : "accent"}
                    aria-label={`Upload progress for ${file.name}`}
                    className={cn("mt-2 gap-0", !complete && "[&_[data-slot=progress-fill]]:bg-h-info")}
                  />
                )}
                {failed && onRetry && (
                  <Button
                    type="button"
                    size="sm"
                    variant="danger-soft"
                    className="-ml-1 mt-2 h-8 md:h-8"
                    aria-label={`Try again: ${file.name}`}
                    onClick={() => onRetry(file.id)}
                  >
                    Try again
                  </Button>
                )}
              </AttachmentContent>
              <AttachmentActions>
                <AttachmentAction
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  className="size-6 rounded-[6px] text-h-muted md:size-6"
                  onClick={() => onRemove(file.id)}
                >
                  <Trash weight="bold" />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          </li>
        )
      })}
    </ul>
  )
}

export { DropZone, DropZoneFileList }
export type { DropZoneFile, DropZoneFileListProps, DropZoneProps }
