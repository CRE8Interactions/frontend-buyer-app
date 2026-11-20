"use client"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/* Hold to confirm, after the reference PressableFeedback.HoldConfirm: press and keep holding and an overlay sweeps across the
   button (clip-path) over `duration` (default 2000ms). Release early and it snaps back in `releaseDuration` (200ms) and nothing
   happens; hold to the end and `onHoldComplete` fires (data-complete="true"), then it resets. Mouse, touch, and Enter/Space
   (hold the key). Use it for destructive or irreversible actions, so a slip or a stray tap can never trigger them. */
type Sweep = "right" | "left" | "down" | "up"
const from: Record<Sweep, string> = {
  right: "inset(0 100% 0 0)",
  left: "inset(0 0 0 100%)",
  down: "inset(0 0 100% 0)",
  up: "inset(100% 0 0 0)",
}
const overlayColour: Record<string, string> = {
  /* the same green, deeper: the button fills with its own colour, so progress reads without a jump to another hue */
  primary: "[--hold-bg:color-mix(in_srgb,var(--h-accent)_52%,black)] [--hold-fg:white]",
  default: "[--hold-bg:color-mix(in_srgb,var(--h-accent)_52%,black)] [--hold-fg:white]",
  danger: "[--hold-bg:color-mix(in_srgb,var(--h-danger)_65%,black)] [--hold-fg:white]",
  destructive: "[--hold-bg:color-mix(in_srgb,var(--h-danger)_65%,black)] [--hold-fg:white]",
  "danger-soft": "[--hold-bg:var(--h-danger)] [--hold-fg:white]",
}
const fallbackOverlay = "[--hold-bg:var(--h-foreground)] [--hold-fg:var(--h-background)]"

type HoldButtonProps = Omit<React.ComponentProps<typeof Button>, "asChild" | "onClick"> & {
  /** ms to hold before it confirms. */
  duration?: number
  /** ms for the snap back on an early release. */
  releaseDuration?: number
  sweep?: Sweep
  /** what the overlay says while filling; defaults to the button's own label. */
  holdLabel?: React.ReactNode
  /** reset the overlay after completing (default true). */
  resetOnComplete?: boolean
  onHoldComplete?: () => void
  /** called every frame while the overlay moves (filling or snapping back) with how far it is, 0 to 1, so something else can follow the hold. */
  onHoldProgress?: (progress: number) => void
}

function HoldButton({
  duration = 2000, releaseDuration = 200, sweep = "right", holdLabel, resetOnComplete = true, onHoldComplete, onHoldProgress,
  variant = "danger-soft", className, children, onPointerDown, onKeyDown, onPointerUp, ...props
}: HoldButtonProps) {
  const overlay = React.useRef<HTMLSpanElement>(null)
  const anim = React.useRef<Animation | null>(null)
  const [holding, setHolding] = React.useState(false)
  const [complete, setComplete] = React.useState(false)
  const raf = React.useRef(0)
  const progressRef = React.useRef(onHoldProgress)
  progressRef.current = onHoldProgress
  /* follow the overlay's animation clock for as long as it runs, and report where it is */
  const follow = React.useCallback(() => {
    cancelAnimationFrame(raf.current)
    const loop = () => {
      const a = anim.current
      if (!a) return
      const t = typeof a.currentTime === "number" ? a.currentTime : Number(a.currentTime ?? 0)
      progressRef.current?.(Math.min(1, Math.max(0, t / duration)))
      if (a.playState === "running") raf.current = requestAnimationFrame(loop)
    }
    loop()
  }, [duration])

  const release = React.useCallback(() => {
    window.removeEventListener("pointerup", release)
    window.removeEventListener("pointercancel", release)
    window.removeEventListener("keyup", keyRelease)
    setHolding(false)
    const a = anim.current
    if (a && a.playState !== "finished") { a.playbackRate = -(duration / releaseDuration); a.play(); follow() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, releaseDuration])
  const keyRelease = React.useCallback((e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") release() }, [release])

  const start = () => {
    const el = overlay.current
    if (!el || anim.current?.playState === "running" && anim.current.playbackRate > 0) return
    anim.current?.cancel()
    setComplete(false)
    const a = el.animate([{ clipPath: from[sweep] }, { clipPath: "inset(0 0 0 0)" }], { duration, easing: "linear", fill: "both" })
    a.onfinish = () => {
      if (a.playbackRate < 0) return
      progressRef.current?.(1)
      setComplete(true)
      onHoldComplete?.()
      if (resetOnComplete) { window.setTimeout(() => { a.playbackRate = -(duration / releaseDuration); a.play(); setComplete(false); follow() }, 250) }
    }
    anim.current = a
    setHolding(true)
    follow()
  }

  React.useEffect(() => () => { anim.current?.cancel(); cancelAnimationFrame(raf.current) }, [])

  return (
    <Button
      variant={variant}
      className={cn("overflow-hidden", overlayColour[variant as string] ?? fallbackOverlay, className)}
      data-holding={holding ? "true" : undefined}
      data-complete={complete ? "true" : undefined}
      title={props.title ?? "Press and hold to confirm"}
      onClick={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        onPointerDown?.(e)
        if (e.button !== 0) return
        start()
        window.addEventListener("pointerup", release)
        window.addEventListener("pointercancel", release)
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e)
        if (!e.repeat && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); start(); window.addEventListener("keyup", keyRelease) }
      }}
      onPointerUp={onPointerUp}
      {...props}
    >
      {children}
      <span
        ref={overlay}
        aria-hidden="true"
        data-slot="hold-confirm"
        style={{ clipPath: from[sweep] }}
        className="pointer-events-none absolute -inset-px z-10 flex items-center justify-center gap-2 rounded-[inherit] bg-(--hold-bg) px-4 text-(color:--hold-fg)"
      >
        {holdLabel ?? children}
      </span>
    </Button>
  )
}

export { HoldButton }
