/* Shared motion presets for components. Strong ease-out, short, so they match the CSS tokens in globals.css
   (--e-out). Reduced motion keeps the fade and drops the scale (see usePop). */
import { useReducedMotion } from "framer-motion"

export const EASE_OUT = [0.23, 1, 0.32, 1] as const

/** A small control appearing or leaving (clear button, status icon): fade plus a 0.85 scale, 120ms. */
export function usePop() {
  const reduce = useReducedMotion()
  return {
    initial: { opacity: 0, scale: reduce ? 1 : 0.85 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: reduce ? 1 : 0.85 },
    transition: { duration: 0.12, ease: EASE_OUT },
  } as const
}
