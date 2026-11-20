"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { ColorContext, useColorState, type ColorStateProps } from "./color-context"
import { useColorValue } from "./color-swatch"

/* Copied from the reference color-picker.css: a trigger (a swatch and a label) that opens a popover of colour controls, all
   sharing one colour. Put any of ColorArea, ColorSlider, ColorField, ColorSwatchPicker and ColorSwatch inside; they read
   and write the picker's colour, so a drag in the area moves the slider, the hex field and the swatches together.
   The popover is at least 248px wide with 8px side padding, 8px top, 12px bottom and a 12px gap, 20px corners on the overlay
   fill, opening below and to the left edge of the trigger. The trigger is a 12px-gap row of swatch and label with the focus
   ring, dimmed when disabled. */
type ColorPickerProps = ColorStateProps & {
  children?: React.ReactNode
  className?: string
  /** Open state, if you want to control it. */
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  disabled?: boolean
}

const PickerState = React.createContext<{ disabled?: boolean }>({})

function ColorPicker({ value, defaultValue = "#0485F7", onChange, children, className, open, defaultOpen, onOpenChange, disabled }: ColorPickerProps) {
  const state = useColorState({ value, defaultValue, onChange })
  return (
    <ColorContext.Provider value={state}>
      <PickerState.Provider value={{ disabled }}>
        <Popover open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
          <div data-slot="color-picker" className={cn("inline-flex", className)}>{children}</div>
        </Popover>
      </PickerState.Provider>
    </ColorContext.Provider>
  )
}

function ColorPickerTrigger({ className, children, ...props }: React.ComponentProps<"button">) {
  const { disabled } = React.useContext(PickerState)
  return (
    <PopoverTrigger asChild>
      <button
        type="button"
        data-slot="color-picker-trigger"
        disabled={disabled}
        className={cn(
          "inline-flex cursor-pointer items-center gap-3 rounded-sm text-sm outline-none h-no-highlight",
          "[transition:background-color_150ms_ease,box-shadow_150ms_var(--e-out)] motion-reduce:[transition:none]",
          "focus-visible:h-focus-ring disabled:h-status-disabled disabled:cursor-not-allowed",
          className
        )}
        {...props}
      >
        {children}
      </button>
    </PopoverTrigger>
  )
}

function ColorPickerPopover({ className, align = "start", sideOffset = 8, onEscapeKeyDown, ...props }: React.ComponentProps<typeof PopoverContent>) {
  return (
    <PopoverContent
      align={align}
      sideOffset={sideOffset}
      data-slot="color-picker-popover"
      /* Escape in a field with unsaved text only puts the colour back; a second Escape closes the popover. */
      onEscapeKeyDown={(e) => {
        onEscapeKeyDown?.(e)
        if ((document.activeElement as HTMLElement | null)?.dataset?.dirty === "true") e.preventDefault()
      }}
      className={cn(
        "flex w-auto min-w-62 flex-col gap-3 overflow-x-hidden overflow-y-auto overscroll-contain rounded-[20px] border-0 glass p-0 px-2 pt-2 pb-3 text-h-foreground shadow-none outline-none [&_[data-slot=color-area]]:max-w-none",
        className
      )}
      {...props}
    />
  )
}

export { ColorPicker, ColorPickerTrigger, ColorPickerPopover, useColorValue }
export type { ColorPickerProps }
