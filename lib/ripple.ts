import type * as React from "react"
/* Press ripple, after the reference PressableFeedback: a circle in the current text colour grows from the press point to the
   farthest corner in 150ms, stays for at least 225ms, then fades out. Pressed opacity 0.12. Clipped to the host's radius.
   Imperative on purpose: it works on any element (button, asChild link) without extra markup in React's tree. */
const GROW_MS = 150
const MIN_PRESS_MS = 225
const FADE_MS = 200
const PRESSED_OPACITY = 0.12

export function startRipple(host: HTMLElement, point?: { x: number; y: number }) {
  if (typeof window === "undefined") return
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
  if ((host as HTMLButtonElement).disabled || host.getAttribute("aria-disabled") === "true" || host.dataset.pending === "true") return

  const rect = host.getBoundingClientRect()
  const x = point ? point.x - rect.left : rect.width / 2
  const y = point ? point.y - rect.top : rect.height / 2
  const radius = Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y))

  const clip = document.createElement("span")
  clip.setAttribute("data-slot", "ripple")
  clip.setAttribute("aria-hidden", "true")
  clip.style.cssText = "position:absolute;inset:0;overflow:hidden;border-radius:inherit;pointer-events:none;z-index:0"
  const dot = document.createElement("span")
  dot.style.cssText = `position:absolute;left:${x - radius}px;top:${y - radius}px;width:${radius * 2}px;height:${radius * 2}px;border-radius:50%;background:currentColor;opacity:${PRESSED_OPACITY};transform:scale(0)`
  clip.appendChild(dot)
  host.appendChild(clip)

  const started = performance.now()
  const grow = dot.animate([{ transform: "scale(0)" }, { transform: "scale(1)" }], { duration: GROW_MS, easing: "cubic-bezier(0.2,0,0,1)", fill: "forwards" })

  let released = false
  const release = () => {
    if (released) return
    released = true
    cleanup()
    const wait = Math.max(0, MIN_PRESS_MS - (performance.now() - started))
    window.setTimeout(() => {
      const fade = dot.animate([{ opacity: PRESSED_OPACITY }, { opacity: 0 }], { duration: FADE_MS, easing: "linear", fill: "forwards" })
      fade.onfinish = () => clip.remove()
    }, wait)
  }
  const onKeyUp = (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") release() }
  const cleanup = () => {
    window.removeEventListener("pointerup", release)
    window.removeEventListener("pointercancel", release)
    window.removeEventListener("keyup", onKeyUp)
    host.removeEventListener("pointerleave", release)
  }
  grow.onfinish = () => {}
  if (point) {
    window.addEventListener("pointerup", release)
    window.addEventListener("pointercancel", release)
    host.addEventListener("pointerleave", release)
  } else {
    window.addEventListener("keyup", onKeyUp)
  }
}

/* Event handlers to spread on a pressable element; compose with the element's own handlers. */
export function rippleHandlers<T extends HTMLElement>(own: { onPointerDown?: React.PointerEventHandler<T>; onKeyDown?: React.KeyboardEventHandler<T> }) {
  return {
    onPointerDown: (e: React.PointerEvent<T>) => {
      own.onPointerDown?.(e)
      if (e.button === 0) startRipple(e.currentTarget, { x: e.clientX, y: e.clientY })
    },
    onKeyDown: (e: React.KeyboardEvent<T>) => {
      own.onKeyDown?.(e)
      if (!e.repeat && (e.key === "Enter" || e.key === " ")) startRipple(e.currentTarget)
    },
  }
}
