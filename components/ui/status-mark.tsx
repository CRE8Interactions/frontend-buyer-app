"use client"

import * as React from "react"
import { motion, useReducedMotion } from "framer-motion"
import { EASE_OUT } from "@/lib/motion"
import { cn } from "@/lib/utils"

/* StatusMark: the big animated mark that confirms an outcome. A soft disc, a ripple that fades out, and the icon drawn in one stroke:
   a check for success, an "i" for info, a "!" for warning, a cross for danger. Each is drawn over about a second and
   only plays once. Reduced motion shows the finished mark. For small inline state use Status or a Badge instead. */
type Tone = "success" | "info" | "warning" | "danger"

const TONE: Record<Tone, { stroke: string; label: string }> = {
  success: { stroke: "var(--color-green-deep)", label: "Success" },
  info: { stroke: "var(--h-info)", label: "Information" },
  warning: { stroke: "var(--h-warning)", label: "Warning" },
  danger: { stroke: "var(--h-danger-text)", label: "Error" },
}

const draw = (reduce: boolean | null, duration: number, delay = 0) => ({
  initial: reduce ? false : { pathLength: 0, opacity: 0 },
  animate: { pathLength: 1, opacity: 1 },
  transition: { pathLength: { duration, ease: EASE_OUT, delay }, opacity: { duration: 0.01, delay } },
}) as const

const line = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const

function Glyph({ tone, reduce }: { tone: Tone; reduce: boolean | null }) {
  if (tone === "success")
    return (
      <>
        <motion.circle cx="32" cy="32" r="28" strokeWidth="4" {...line} {...draw(reduce, 0.55)} />
        <motion.path d="M20 33.5 28.5 42 44.5 24" strokeWidth="5" {...line} {...draw(reduce, 0.4, 0.4)} />
      </>
    )
  if (tone === "info")
    return (
      <>
        <motion.circle cx="32" cy="32" r="28" strokeWidth="4" {...line} {...draw(reduce, 0.55)} />
        <motion.path d="M32 29v13" strokeWidth="5" {...line} {...draw(reduce, 0.3, 0.45)} />
        <motion.circle cx="32" cy="20.5" r="3" fill="currentColor" stroke="none" initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 520, damping: 14, delay: 0.4 }} style={{ transformOrigin: "32px 20.5px" }} />
      </>
    )
  if (tone === "warning")
    return (
      <>
        <motion.circle cx="32" cy="32" r="28" strokeWidth="4" {...line} {...draw(reduce, 0.55)} />
        <motion.path d="M32 19.5v15" strokeWidth="5" {...line} {...draw(reduce, 0.3, 0.45)} />
        <motion.circle cx="32" cy="44.5" r="3" fill="currentColor" stroke="none" initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 520, damping: 14, delay: 0.7 }} style={{ transformOrigin: "32px 44.5px" }} />
      </>
    )
  return (
    <motion.g initial={reduce ? false : { x: 0 }} animate={{ x: [0, -3, 3, -2, 1, 0] }} transition={{ duration: 0.4, delay: 0.85, ease: "easeInOut" }}>
      <motion.circle cx="32" cy="32" r="28" strokeWidth="4" {...line} {...draw(reduce, 0.55)} />
      <motion.path d="M23 23 41 41" strokeWidth="5" {...line} {...draw(reduce, 0.25, 0.4)} />
      <motion.path d="M41 23 23 41" strokeWidth="5" {...line} {...draw(reduce, 0.25, 0.55)} />
    </motion.g>
  )
}

function StatusMark({ tone = "success", size = 96, label, className, ...props }: Omit<React.ComponentProps<"div">, "children"> & {
  tone?: Tone
  /** Width and height of the whole mark in px. The icon is two thirds of it. */
  size?: number
  /** Spoken label; defaults to the tone's name. Pass "" when the text next to it already says it. */
  label?: string
}) {
  const reduce = useReducedMotion()
  const text = label ?? TONE[tone].label
  return (
    <motion.div
      data-slot="status-mark"
      data-tone={tone}
      role={text ? "img" : undefined}
      aria-label={text || undefined}
      aria-hidden={text ? undefined : true}
      className={cn("relative mx-auto flex shrink-0 items-center justify-center", className)}
      initial={reduce ? false : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
      style={{ width: size, height: size, color: TONE[tone].stroke }}
      {...(props as object)}
    >
      {!reduce && <motion.span aria-hidden className="absolute inset-0 rounded-full bg-current opacity-30" initial={{ scale: 0.6, opacity: 0.9 }} animate={{ scale: 1.5, opacity: 0 }} transition={{ duration: 1.1, ease: EASE_OUT, delay: 0.25 }} />}
      <span aria-hidden className="absolute inset-0 rounded-full bg-current opacity-15" />
      <svg viewBox="0 0 64 64" aria-hidden className="relative size-2/3">
        <Glyph tone={tone} reduce={reduce} />
      </svg>
    </motion.div>
  )
}

export { StatusMark }
export type { Tone as StatusMarkTone }
