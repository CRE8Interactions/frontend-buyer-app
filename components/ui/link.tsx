import * as React from "react"
import { ArrowUpRight } from "@phosphor-icons/react"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"

/* Weight 500, colour --h-link, no underline at rest, underline on hover and
   press, focus ring, disabled via aria-disabled. The optional icon (`LinkIcon`) is a 0.75em box, 60% opacity and 100% on hover, press
   and focus of the link; the default arrow has ms-1 pb-1.5 (.link__icon--default).
   `isDisabled` turns the link off for pointer and keyboard. `linkVariants()` gives the class strings for framework links
   (Next.js Link and the like): `<NextLink className={linkVariants().base}>` and `<LinkIcon className={linkVariants().icon}>`.
   The link is the `group/link`; the icon reads its hover, press and focus. */
const linkBase = [
  "group/link relative inline-flex h-fit w-fit cursor-pointer items-center rounded-[24px]",
  "font-medium text-h-link no-underline decoration-h-separator-tertiary decoration-[1.5px] underline-offset-4 h-no-highlight outline-none",
  "[transition:color_100ms_ease,background-color_150ms_ease,box-shadow_150ms_var(--e-out),opacity_100ms_var(--e-out)] motion-reduce:[transition:none]",
  "[@media(hover:hover)]:hover:underline [@media(hover:hover)]:hover:decoration-h-muted/50",
  "[@media(hover:hover)]:data-[hovered=true]:underline [@media(hover:hover)]:data-[hovered=true]:decoration-h-muted/50",
  "active:underline active:decoration-h-muted data-[pressed=true]:underline data-[pressed=true]:decoration-h-muted",
  "focus-visible:h-focus-ring data-[focus-visible=true]:h-focus-ring",
  "aria-disabled:h-status-disabled aria-disabled:pointer-events-none",
].join(" ")
const linkIcon = [
  "pointer-events-none inline-flex size-[0.75em] shrink-0 items-center justify-center text-current opacity-60",
  "[transition:opacity_150ms_var(--e-out)] motion-reduce:[transition:none]",
  "group-hover/link:opacity-100 group-data-[hovered=true]/link:opacity-100",
  "group-active/link:opacity-100 group-data-[pressed=true]/link:opacity-100",
  "group-focus-visible/link:opacity-100 group-data-[focus-visible=true]/link:opacity-100",
  "[&_svg]:size-[0.857em] [&_svg]:shrink-0 [&_svg]:transform-gpu",
].join(" ")
const linkIconDefault = "ms-1 pb-1.5"

/** Class strings for links rendered by another component (a router link, a custom element). */
function linkVariants() {
  return { base: linkBase, icon: cn(linkIcon, linkIconDefault) }
}

type LinkProps = React.ComponentProps<"a"> & {
  /** Merge the link styles onto the child element (a router link, a button) instead of rendering an anchor. */
  asChild?: boolean
  /** Shortcut for adding the default arrow icon after the text. Same as placing `<LinkIcon />` yourself. Ignored with `asChild`: put the icon inside the child instead. */
  showAnchorIcon?: boolean
  /** Turns the link off for pointer and keyboard. */
  isDisabled?: boolean
}

function Link({ className, asChild = false, showAnchorIcon = false, isDisabled = false, children, onClick, ...props }: LinkProps) {
  const Comp = asChild ? Slot.Root : "a"
  const disabled = isDisabled || props["aria-disabled"] === true || props["aria-disabled"] === "true"
  return (
    <Comp
      data-slot="link"
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : props.tabIndex}
      onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
        if (disabled) {
          e.preventDefault()
          return
        }
        onClick?.(e)
      }}
      className={cn(linkBase, className)}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {children}
          {showAnchorIcon ? <LinkIcon /> : null}
        </>
      )}
    </Comp>
  )
}

/** The small icon in a link. With no children it shows the default arrow; pass your own icon to replace it, and put it before the text to move it. */
function LinkIcon({ className, children, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="link-icon"
      data-default-icon={children == null ? "true" : undefined}
      className={cn(linkIcon, children == null && linkIconDefault, className)}
      {...props}
    >
      {children ?? <ArrowUpRight weight="bold" />}
    </span>
  )
}

export { Link, LinkIcon, linkVariants }
