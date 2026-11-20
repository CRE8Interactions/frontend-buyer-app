"use client"

import * as React from "react"
import { Check, Copy } from "@phosphor-icons/react"
import { motion, useReducedMotion } from "framer-motion"
import { EASE_OUT } from "@/lib/motion"
import { Input, type InputProps } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const copyButtonBase = [
  "relative flex h-6 cursor-pointer items-center justify-center overflow-hidden text-sm font-medium whitespace-nowrap outline-none transition-colors duration-150",
  "[&_svg]:size-4",
  "focus-visible:h-focus-ring data-[focus-visible=true]:h-focus-ring",
].join(" ")
const copyButtonIdle = [
  "h-touch-44 w-6 text-h-muted",
  "[@media(hover:hover)]:hover:bg-h-default [@media(hover:hover)]:hover:text-h-foreground",
  "[@media(hover:hover)]:data-[hovered=true]:bg-h-default [@media(hover:hover)]:data-[hovered=true]:text-h-foreground",
].join(" ")
const copyButtonCopied = "gap-1 bg-h-success-soft px-2 text-h-success-soft-foreground"

/* Read-only value with a copy button at the right (order IDs, ticket links, API keys). The button swaps to a
   check for 1.6s and announces "Copied" to screen readers. */
type CopyFieldProps = Omit<InputProps, "value" | "defaultValue" | "readOnly" | "suffix"> & {
  value: string
  /** Mask the value with dots until it is copied or revealed by focusing the field. */
  masked?: boolean
}

/* The copy button used inside CopyField, on its own: a 24px icon button that grows leftwards into a "Copied" pill for
   1.6s (layout animation) and announces "Copied" to screen readers. Use it beside text that is not a field. */
function CopyButton({ value, className }: { value: string; className?: string }) {
  const reduce = useReducedMotion()
  const [copied, setCopied] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      /* clipboard can be blocked in iframes; the visual state still confirms the click */
    }
    setCopied(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1600)
  }
  return (
    <>
      <motion.button
        layout
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy"}
        style={{ borderRadius: 9999 }}
        transition={{ layout: { duration: reduce ? 0 : 0.2, ease: EASE_OUT } }}
        className={cn(copyButtonBase, copied ? copyButtonCopied : copyButtonIdle, className)}
      >
        {copied ? (
          <motion.span key="check" className="flex items-center gap-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduce ? 0 : 0.14, delay: reduce ? 0 : 0.06, ease: EASE_OUT }}>
            <Check weight="bold" />
            <span>Copied</span>
          </motion.span>
        ) : (
          <motion.span key="copy" className="flex" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduce ? 0 : 0.12, ease: EASE_OUT }}>
            <Copy weight="bold" />
          </motion.span>
        )}
      </motion.button>
      <span className="sr-only" role="status" aria-live="polite">{copied ? "Copied" : ""}</span>
    </>
  )
}

function CopyField({ value, masked, className, ...props }: CopyFieldProps) {
  return (
    <Input
      {...props}
      readOnly
      value={value}
      type={masked ? "password" : "text"}
      className={cn("font-medium tabular-nums", className)}
      suffix={
        /* The button grows leftwards into the "Copied" pill (layout animation). The field's right padding follows
           the button's width with a matching transition, so the text is trimmed in step with the pill. */
        <span className="flex items-center justify-end gap-1.5">
          {/* Divider: the value ends at this line, so a trimmed value reads as intentional. */}
          <span aria-hidden className="h-4 w-px rounded-full bg-h-foreground/15" />
          <CopyButton value={value} />
        </span>
      }
    />
  )
}

export { CopyField, CopyButton }
export type { CopyFieldProps }
