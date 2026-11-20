"use client"

import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"
import { EASE_OUT } from "@/lib/motion"
import { Toolbar, ToolbarSeparator } from "./toolbar"

/* A floating toolbar for contextual actions: bulk selection, editing controls, anything that appears in response to what the
   user does. It is the Toolbar on a surface pill (24px corners, overlay shadow) that slides up and fades in when `isOpen` is
   true and back out when it is not. Three optional sections: Prefix (a count, a label), Content (the actions) and Suffix (a
   dismiss button), with Separator between them. Arrow keys move between its buttons. By default it is fixed to the bottom
   centre of the viewport; use `position="absolute"` to float it at the bottom of a positioned container. */
type ActionBarProps = Omit<React.ComponentProps<typeof Toolbar>, "variant"> & {
  /** Shows or hides the bar, with an enter and exit animation. */
  isOpen: boolean
  /** Where it floats: fixed to the viewport (default), or absolute inside a positioned parent. */
  position?: "fixed" | "absolute"
  /** Put the bar on its own surface pill (default). Turn off to place it on a surface you already have. */
  isAttached?: boolean
}

function ActionBar({ isOpen, position = "fixed", isAttached = true, orientation = "horizontal", className, children, "aria-label": ariaLabel = "Actions", ...props }: ActionBarProps) {
  const reduce = useReducedMotion()
  return (
    <div
      data-slot="action-bar"
      className={cn("pointer-events-none inset-x-0 bottom-4 z-50 flex justify-center px-4", position === "fixed" ? "fixed" : "absolute")}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            data-slot="action-bar-wrapper"
            className="pointer-events-auto max-w-full"
            initial={{ opacity: 0, y: reduce ? 0 : 16, scale: reduce ? 1 : 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduce ? 0 : 16, scale: reduce ? 1 : 0.97 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
          >
            <Toolbar
              aria-label={ariaLabel}
              orientation={orientation}
              variant={isAttached ? "attached" : "default"}
              className={cn("glass glass-float max-w-full grid-flow-col items-center gap-1 overflow-x-auto p-2 [scrollbar-width:none]", orientation === "vertical" && "grid-flow-row", className)}
              {...props}
            >
              {children}
            </Toolbar>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

type SectionProps = React.ComponentProps<"div">

function Prefix({ className, ...props }: SectionProps) {
  return <div data-slot="action-bar-prefix" className={cn("flex items-center gap-2 px-2 text-sm font-medium text-h-foreground", className)} {...props} />
}
function Content({ className, ...props }: SectionProps) {
  return <div data-slot="action-bar-content" className={cn("flex items-center gap-1", className)} {...props} />
}
function Suffix({ className, ...props }: SectionProps) {
  return <div data-slot="action-bar-suffix" className={cn("flex items-center gap-1", className)} {...props} />
}
/** Text that collapses to screen-reader-only below 640px, so buttons shrink to icons on a phone while staying accessible. */
function Label({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="action-bar-label" className={cn("max-sm:sr-only", className)} {...props} />
}
function Separator({ className, ...props }: React.ComponentProps<typeof ToolbarSeparator>) {
  return <ToolbarSeparator orientation="vertical" className={cn("mx-1 h-5 self-center", className)} {...props} />
}

const ActionBarRoot = Object.assign(ActionBar, { Prefix, Content, Suffix, Label, Separator })

export { ActionBarRoot as ActionBar }
export type { ActionBarProps }
