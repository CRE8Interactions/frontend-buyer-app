import * as React from "react"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CaretLeft, CaretRight, DotsThree } from "@phosphor-icons/react"

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  )
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  )
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
} & React.ComponentProps<"a">

/* the reference pagination.css: 36px (32px from md) pill, 14px / 500, ghost fill, hover default-hover,
   press scale 0.97. The active page is the tertiary fill (bg default). */
function PaginationLink({ className, isActive, ...props }: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        "relative isolate inline-flex size-9 origin-center transform-gpu cursor-pointer items-center justify-center rounded-3xl text-sm font-medium whitespace-nowrap text-h-default-foreground outline-none select-none h-no-highlight md:size-8",
        "bg-transparent [transition:transform_250ms_ease,background-color_100ms_var(--e-out),box-shadow_100ms_var(--e-out)] motion-reduce:transition-none",
        "[@media(hover:hover)]:hover:bg-h-default-hover active:scale-[0.97] active:bg-h-default-hover focus-visible:h-focus-ring",
        "aria-disabled:h-status-disabled data-[active=true]:bg-h-default data-[active=true]:hover:bg-h-default-hover",
        className
      )}
      {...props}
    />
  )
}

/* Previous / Next are icon circles like the page links. Pass children (for example "Previous") for a labelled
   version; it then grows to auto width. */
function PaginationPrevious({
  className,
  children,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      className={cn(children && "w-auto gap-1.5 px-2.5 md:w-auto", className)}
      {...props}
    >
      <CaretLeft weight="bold" className="size-4" data-slot="pagination-previous-icon" />
      {children}
    </PaginationLink>
  )
}

function PaginationNext({
  className,
  children,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      className={cn(children && "w-auto gap-1.5 px-2.5 md:w-auto", className)}
      {...props}
    >
      {children}
      <CaretRight weight="bold" className="size-4" data-slot="pagination-next-icon" />
    </PaginationLink>
  )
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn("inline-flex size-9 items-center justify-center text-sm text-h-muted select-none md:size-8", className)}
      {...props}
    >
      <DotsThree className="size-4" weight="bold" />
      <span className="sr-only">More pages</span>
    </span>
  )
}

/* "Showing 1-10 of 286 events". The reference pagination__summary: 14px, muted. */
function PaginationSummary({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="pagination-summary" className={cn("text-sm text-h-muted", className)} {...props} />
}

/* Results per page. Not part of the reference pagination, built from our Select in the same field look. */
function PaginationPageSize({
  value,
  onValueChange,
  options = [10, 25, 50, 100],
  label = "Results per page",
  className,
}: {
  value: number
  onValueChange?: (value: number) => void
  options?: number[]
  label?: string
  className?: string
}) {
  return (
    <div data-slot="pagination-page-size" className={cn("flex items-center gap-2 text-sm text-h-muted", className)}>
      <span id="pagination-page-size-label">{label}</span>
      <Select value={String(value)} onValueChange={(v) => onValueChange?.(Number(v))}>
        <SelectTrigger size="sm" aria-labelledby="pagination-page-size-label" className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={String(o)}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
export {
  Pagination,
  PaginationSummary,
  PaginationPageSize,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
}
