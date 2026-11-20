"use client"

import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"
import { Dialog as DialogPrimitive } from "radix-ui"
import { MagnifyingGlass, X } from "@phosphor-icons/react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { CloseButton } from "@/components/ui/close-button"

/* Styled with cva + Tailwind utilities. The panel is the overlay fill with 16px corners and the overlay shadow, in
   three sizes (sm 384px wide and 300px tall at most, md 512 and 356, lg 576 and 440, never taller than 80vh) and its height
   eases over 200ms when the list changes. Optional header (8px padding, for a breadcrumb or tabs), then the search row:
   a muted prefix icon, a 14px input with 16px side and 12px top and bottom padding, a clear button while there is text
   and an optional suffix, with a hairline under it. The list has 6px padding; items are 36px rows (14px text, 8px
   corners, 12px by 8px padding, 10px gap, 16px muted icons) that take the default fill on hover and keyboard highlight
   and the stronger fill while pressed; headings are 12px medium muted; separators are inset 12px. An optional footer sits
   on a half-strength default fill with a hairline above it, for keyboard hints. In a dialog the panel opens 15vh from the
   top over a backdrop (opaque, blur or transparent): the backdrop fades in 150ms and out in 100ms, the panel fades and
   scales from 95% while dropping 8px. Reduced motion skips it. */
type CommandSize = "sm" | "md" | "lg" | "none"

const backdropVariants = cva(
  [
    "fixed inset-0 z-50",
    "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-150",
    "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-100",
    "data-[state=open]:[will-change:opacity] data-[state=closed]:[will-change:opacity]",
    "motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none",
  ].join(" "),
  {
    variants: {
      backdrop: {
        transparent: "bg-transparent",
        opaque: "bg-h-backdrop",
        /* A full-viewport backdrop-filter stalls mid-range mobile GPUs, so keep the dim scrim there. */
        blur: "bg-h-backdrop backdrop-blur-md [@media(hover:none)_and_(pointer:coarse)]:[-webkit-backdrop-filter:none] [@media(hover:none)_and_(pointer:coarse)]:[backdrop-filter:none]",
      },
    },
  }
)

/* Positions the dialog 15vh from the top and centres it; the size sets its width and height. */
const containerVariants = cva(
  [
    "fixed top-[15vh] left-1/2 z-50 flex w-[calc(100%-2rem)] -translate-x-1/2 flex-col outline-none",
    "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-top-2 data-[state=open]:duration-150",
    "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-150",
    "data-[state=open]:[will-change:opacity,transform] data-[state=closed]:[will-change:opacity,transform]",
    "motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none",
  ].join(" "),
  {
    variants: {
      size: {
        sm: "max-w-sm max-h-[min(80vh,300px)]",
        md: "max-w-lg max-h-[min(80vh,356px)]",
        lg: "max-w-xl max-h-[min(80vh,440px)]",
      },
    },
  }
)

const dialogVariants = cva(
  [
    "relative flex min-h-0 w-full flex-col overflow-hidden rounded-[16px] glass glass-panel text-h-foreground outline-none",
    "[transition:height_200ms_cubic-bezier(0.16,1,0.3,1)] motion-reduce:[transition:none]",
  ].join(" "),
  {
    variants: {
      size: {
        sm: "max-w-sm max-h-[min(80vh,300px)]",
        md: "max-w-lg max-h-[min(80vh,356px)]",
        lg: "max-w-xl max-h-[min(80vh,440px)]",
        none: "",
      },
    },
  }
)

const headerClass = "flex w-full items-center gap-2 px-2 pt-2 pb-0 text-sm"
const inputGroupClass = "group/command-input flex w-full items-center gap-2 border-b border-h-border/70"
const inputClass = "min-w-0 flex-1 bg-transparent px-4 py-3 text-sm leading-5 text-h-foreground outline-none placeholder:text-h-muted disabled:cursor-not-allowed disabled:opacity-50"
const clearButtonClass = [
  /* the close button keeps its own size, padding, radius and icon size (they won over the old stylesheet too) */
  "me-3 shrink-0",
  "group-data-[empty=true]/command-input:pointer-events-none group-data-[empty=true]/command-input:opacity-0",
].join(" ")
const prefixClass = "flex shrink-0 items-center ps-4 text-h-muted [&_svg]:size-4"
const suffixClass = "flex shrink-0 items-center pe-4 text-h-muted [&_svg]:size-4"
const listClass = "min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-1.5 outline-none"
const itemClass = [
  "relative flex cursor-pointer items-center gap-2.5 rounded-[8px] px-3 py-2 text-sm leading-5 text-h-foreground outline-none select-none",
  "[@media(hover:hover)]:hover:bg-h-default [@media(hover:hover)]:data-[hovered=true]:bg-h-default",
  "data-[selected=true]:bg-h-default data-[focused=true]:bg-h-default",
  /* pressed wins over the highlight, as the press rule came last in the stylesheet */
  "active:bg-h-default-hover data-[pressed=true]:bg-h-default-hover data-[selected=true]:active:bg-h-default-hover data-[focused=true]:active:bg-h-default-hover data-[selected=true]:data-[pressed=true]:bg-h-default-hover data-[focused=true]:data-[pressed=true]:bg-h-default-hover",
  "data-[disabled=true]:pointer-events-none data-[disabled=true]:cursor-default data-[disabled=true]:opacity-50",
  "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-h-muted",
  "[&_kbd]:ms-auto [&_kbd]:font-sans [&_kbd]:text-xs [&_kbd]:leading-4 [&_kbd]:font-normal [&_kbd]:text-h-muted",
].join(" ")
const groupClass = [
  "overflow-hidden text-h-foreground [&+[data-slot=command-group]]:mt-1",
  "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:leading-4 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-h-muted [&_[cmdk-group-heading]]:select-none",
].join(" ")
const separatorClass = "mx-3 my-1 h-px bg-h-separator"
const footerClass = "flex w-full items-center gap-2 border-t border-h-border/50 bg-h-default/50 px-3 py-1 text-xs leading-4 text-h-muted"
const emptyClass = "flex items-center justify-center py-6 text-center text-sm leading-5 text-h-muted"

function Command({
  className,
  size = "md",
  ...props
}: React.ComponentProps<typeof CommandPrimitive> & { size?: CommandSize }) {
  return (
    <CommandPrimitive
      data-slot="command"
      data-size={size}
      className={cn(dialogVariants({ size }), className)}
      {...props}
    />
  )
}

type CommandBackdrop = "opaque" | "blur" | "transparent"

/** The command palette: a dialog opened 15vh from the top over a backdrop. */
function CommandDialog({
  title = "Command palette",
  description = "Search for a command to run",
  children,
  className,
  size = "md",
  backdrop = "opaque",
  instant = false,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root> & {
  title?: string
  description?: string
  className?: string
  size?: Exclude<CommandSize, "none">
  backdrop?: CommandBackdrop
  /** No enter or exit animation, for a palette that is always opened with the keyboard. */
  instant?: boolean
}) {
  return (
    <DialogPrimitive.Root {...props}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          data-slot="command-backdrop"
          data-variant={backdrop}
          className={cn(backdropVariants({ backdrop }), instant && "data-[state=open]:animate-none data-[state=closed]:animate-none")}
        />
        <DialogPrimitive.Content
          data-slot="command-dialog"
          data-size={size}
          className={cn(containerVariants({ size }), instant && "data-[state=open]:animate-none data-[state=closed]:animate-none", className)}
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">{description}</DialogPrimitive.Description>
          <Command size="none" className="flex-1">
            {children}
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/** Above the search row: a breadcrumb, tabs or a scope chip. 8px padding, 14px text. */
function CommandHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="command-header" className={cn(headerClass, className)} {...props} />
}

type CommandInputProps = Omit<React.ComponentProps<typeof CommandPrimitive.Input>, "prefix"> & {
  /** Leading content. Defaults to a magnifier. Pass `null` for none. */
  prefix?: React.ReactNode
  /** Trailing content, such as an Esc hint. */
  suffix?: React.ReactNode
  /** Shows a clear button while there is text. Default true. */
  clearable?: boolean
  onClear?: () => void
}

function CommandInput({ className, prefix, suffix, clearable = true, onClear, value: valueProp, defaultValue, onValueChange, ...props }: CommandInputProps) {
  const [inner, setInner] = React.useState<string>(typeof defaultValue === "string" ? defaultValue : "")
  const value = valueProp ?? inner
  const change = (v: string) => {
    setInner(v)
    onValueChange?.(v)
  }
  const inputRef = React.useRef<HTMLInputElement>(null)
  const hasPrefix = prefix !== null
  return (
    <div data-slot="command-input-wrapper" data-empty={value ? undefined : "true"} className={inputGroupClass}>
      {hasPrefix ? (
        <div data-slot="command-input-prefix" className={prefixClass}>
          {prefix ?? <MagnifyingGlass weight="bold" />}
        </div>
      ) : null}
      <CommandPrimitive.Input
        ref={inputRef}
        data-slot="command-input"
        value={value}
        onValueChange={change}
        className={cn(inputClass, hasPrefix && "ps-0", suffix && "pe-0", className)}
        {...props}
      />
      {clearable ? (
        <CloseButton
          aria-label="Clear search"
          tabIndex={-1}
          data-slot="command-input-clear-button"
          onClick={() => {
            change("")
            onClear?.()
            inputRef.current?.focus()
          }}
          className={clearButtonClass}
        >
          <X weight="bold" />
        </CloseButton>
      ) : null}
      {suffix ? (
        <div data-slot="command-input-suffix" className={suffixClass}>
          {suffix}
        </div>
      ) : null}
    </div>
  )
}

function CommandList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(listClass, className)}
      {...props}
    />
  )
}

function CommandEmpty({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn(emptyClass, className)}
      {...props}
    />
  )
}

function CommandGroup({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(groupClass, className)}
      {...props}
    />
  )
}

function CommandSeparator({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return <CommandPrimitive.Separator data-slot="command-separator" className={cn(separatorClass, className)} {...props} />
}

function CommandItem({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(itemClass, className)}
      {...props}
    />
  )
}

function CommandShortcut({ className, ...props }: React.ComponentProps<"kbd">) {
  return <kbd data-slot="command-shortcut" className={className} {...props} />
}

/** Below the list: keyboard hints. A half-strength default fill with a hairline above, 12px text. */
function CommandFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="command-footer"
      className={cn(footerClass, className)}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandHeader,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
  CommandFooter,
}
export type { CommandSize }
