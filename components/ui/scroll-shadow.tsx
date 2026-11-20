"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/* Copied from the reference scroll-shadow.css (the rules are in globals.css). A scrolling area that fades out at an edge
   while there is more to see in that direction: the top fades once you have scrolled down, the bottom while content
   remains below, and the same sideways. The fade is 40px by default (`size`), can start a little in (`offset`), and the
   scrollbar can be hidden. Where scroll timelines exist the fade follows the real scroll position from the first paint; a
   scroll listener sets the same state as data attributes for engines without them. `isEnabled={false}` turns the fade off. */
type ScrollShadowProps = React.ComponentProps<"div"> & {
  orientation?: "vertical" | "horizontal"
  /** Length of the fade in pixels. */
  size?: number
  /** Distance from the edge before the fade starts, in pixels. */
  offset?: number
  hideScrollBar?: boolean
  isEnabled?: boolean
}

function ScrollShadow({ orientation = "vertical", size = 40, offset = 0, hideScrollBar, isEnabled = true, className, style, onScroll, children, ...props }: ScrollShadowProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [flags, setFlags] = React.useState<Record<string, "true" | undefined>>({})
  const measure = React.useCallback(() => {
    const el = ref.current
    if (!el || !isEnabled) return setFlags({})
    const vertical = orientation === "vertical"
    const pos = vertical ? el.scrollTop : Math.abs(el.scrollLeft)
    const total = vertical ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth
    const start = pos > offset
    const end = total - pos > offset + 1
    const key = vertical ? (start && end ? "top-bottom" : start ? "top" : end ? "bottom" : "") : start && end ? "left-right" : start ? "left" : end ? "right" : ""
    setFlags(key ? { [`data-${key}-scroll`]: "true" } : {})
  }, [orientation, offset, isEnabled])
  React.useEffect(() => {
    measure()
    const el = ref.current
    if (!el || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [measure])
  return (
    <div
      ref={ref}
      data-slot="scroll-shadow"
      data-scroll-shadow-mode={isEnabled ? "auto" : undefined}
      {...flags}
      onScroll={(e) => { measure(); onScroll?.(e) }}
      className={cn("scroll-shadow", isEnabled && "scroll-shadow--fade", orientation === "vertical" ? "scroll-shadow--vertical" : "scroll-shadow--horizontal", hideScrollBar && "scroll-shadow--hide-scrollbar", className)}
      style={{ ["--scroll-shadow-size" as string]: `${size}px`, ["--scroll-shadow-offset" as string]: `${offset}px`, ...style }}
      {...props}
    >
      {children}
    </div>
  )
}

export { ScrollShadow }
export type { ScrollShadowProps }
