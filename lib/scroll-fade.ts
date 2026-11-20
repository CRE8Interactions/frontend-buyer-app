"use client"
import * as React from "react"

/* Fading scroll edges for anything that scrolls inside a panel (dialog body, sheet body): the top edge fades out once you have
   scrolled down, the bottom edge fades out while more is below, and nothing fades when the content fits. Spread `ref` and
   `style` on the scrolling element. Edge size is `size` px (default 28). Respects nothing but the scroll position, so it is
   safe with reduced motion. */
export function useScrollFade<T extends HTMLElement>(size = 28) {
  const ref = React.useRef<T | null>(null)
  const [edge, setEdge] = React.useState({ top: false, bottom: false })

  const update = React.useCallback(() => {
    const el = ref.current
    if (!el) return
    const top = el.scrollTop > 1
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1
    setEdge((e) => (e.top === top && e.bottom === bottom ? e : { top, bottom }))
  }, [])

  const setRef = React.useCallback((node: T | null) => {
    ref.current = node
    if (node) update()
  }, [update])

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    update()
    el.addEventListener("scroll", update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    Array.from(el.children).forEach((c) => ro.observe(c))
    return () => { el.removeEventListener("scroll", update); ro.disconnect() }
  }, [update])

  const t = edge.top ? size : 0
  const b = edge.bottom ? size : 0
  const mask = `linear-gradient(to bottom, transparent 0, #000 ${t}px, #000 calc(100% - ${b}px), transparent 100%)`
  const style: React.CSSProperties = edge.top || edge.bottom ? { maskImage: mask, WebkitMaskImage: mask } : {}
  return { ref: setRef, style }
}
