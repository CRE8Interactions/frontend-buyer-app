"use client"

import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

/* Public CSS variables on the root: override any of them with a class, e.g. [--stepper-active-color:var(--h-success)]. */
const stepperVars = [
  "[--stepper-active-color:var(--h-accent)] [--stepper-active-fg:var(--h-accent-soft-foreground)]",
  "[--stepper-complete-color:var(--h-accent)] [--stepper-complete-fg:var(--h-accent-foreground)]",
  "[--stepper-inactive-border:var(--h-border)] [--stepper-inactive-fg:var(--h-muted)]",
  "[--stepper-separator-size:2px]",
].join(" ")
const stepperVariants = cva(["m-0 list-none p-0", stepperVars].join(" "), {
  variants: {
    orientation: { horizontal: "flex items-start", vertical: "flex flex-col" },
    size: {
      sm: "[--stepper-indicator-size:22px] [--stepper-vertical-gap:12px]",
      md: "[--stepper-indicator-size:28px] [--stepper-vertical-gap:16px]",
      lg: "[--stepper-indicator-size:36px] [--stepper-vertical-gap:24px]",
    },
  },
})

const stepVariants = cva("group/step relative", {
  variants: {
    orientation: {
      horizontal: "flex flex-1 flex-col items-center overflow-visible",
      vertical: "flex flex-col pb-(--stepper-vertical-gap) last:pb-0",
    },
  },
})

const stepButtonVariants = cva(
  [
    "relative z-10 flex items-center rounded-[8px] border-0 bg-transparent p-0 text-inherit outline-none",
    "[-webkit-tap-highlight-color:transparent] [transition:color_100ms,background-color_100ms,border-color_100ms,opacity_100ms]",
    "data-[clickable=true]:cursor-pointer",
    "[@media(hover:hover)]:data-[clickable=true]:hover:[&_[data-slot=stepper-indicator]]:opacity-80 [@media(hover:hover)]:data-[clickable=true]:data-[hovered=true]:[&_[data-slot=stepper-indicator]]:opacity-80",
    "data-[clickable=true]:active:opacity-80 data-[clickable=true]:data-[pressed=true]:opacity-80",
    "data-[clickable=true]:focus-visible:h-focus-ring data-[clickable=true]:data-[focus-visible=true]:h-focus-ring",
  ].join(" "),
  { variants: { orientation: { horizontal: "flex-col gap-1.5", vertical: "flex-row items-start gap-2.5" } } }
)

const indicatorVariants = cva(
  [
    "flex shrink-0 items-center justify-center rounded-full border-2 border-solid w-(--stepper-indicator-size) h-(--stepper-indicator-size)",
    "data-[status=inactive]:border-(--stepper-inactive-border) data-[status=inactive]:text-(--stepper-inactive-fg) data-[status=inactive]:bg-transparent",
    "data-[status=active]:border-(--stepper-active-color) data-[status=active]:text-(--stepper-active-fg) data-[status=active]:bg-transparent",
    "data-[status=complete]:border-(--stepper-complete-color) data-[status=complete]:bg-(--stepper-complete-color) data-[status=complete]:text-(--stepper-complete-fg)",
    "data-[status=complete]:animate-[stepper-indicator-complete_0.3s_ease-out] motion-reduce:data-[status=complete]:animate-none",
  ].join(" "),
  {
    variants: {
      size: {
        sm: "text-[10px] font-semibold",
        md: "text-xs leading-4 font-semibold",
        lg: "text-sm leading-5 font-semibold",
      },
    },
  }
)

/* The icon box is sized by its icon; the svg inside is 55% of it, the default checkmark 44% of the circle. */
const stepperIconClass = "flex items-center justify-center [&_svg]:w-[55%] [&_svg]:h-[55%] [&_[data-slot=stepper-default-checkmark]]:w-[44%] [&_[data-slot=stepper-default-checkmark]]:h-auto"
const checkmarkClass = "[&_polyline]:[stroke-dasharray:22] [&_polyline]:[stroke-dashoffset:0] [&_polyline]:animate-[stepper-checkmark-draw_0.2s_ease-out_50ms_both] motion-reduce:[&_polyline]:animate-none"

const contentVariants = cva("flex flex-col", {
  variants: { orientation: { horizontal: "items-center text-center", vertical: "items-start text-start min-h-(--stepper-indicator-size)" } },
})

const titleVariants = cva("font-medium text-h-foreground [transition:color_0.3s] group-data-[status=inactive]/step:text-h-muted", {
  /* the line height follows the size (tailwind-merge would drop a base leading-* in front of a text-* size) */
  variants: { size: { sm: "text-[11px] leading-tight", md: "text-xs leading-tight", lg: "text-sm leading-tight" } },
})

const descriptionVariants = cva("text-h-muted [transition:color_0.3s] group-data-[status=inactive]/step:opacity-60", {
  variants: { size: { sm: "mt-0.5 text-[10px] leading-snug", md: "mt-0.5 text-xs leading-snug", lg: "mt-0.5 text-xs leading-snug" } },
})

const separatorVariants = cva("flex", {
  variants: {
    orientation: {
      horizontal:
        "absolute top-[calc(var(--stepper-indicator-size)/2_-_var(--stepper-separator-size)/2)] start-[calc(50%_+_var(--stepper-indicator-size)/2)] end-[calc(-50%_+_var(--stepper-indicator-size)/2)]",
      vertical: "absolute bottom-0 top-(--stepper-indicator-size) start-[calc(var(--stepper-indicator-size)/2_-_var(--stepper-separator-size)/2)]",
    },
  },
})
const separatorTrackVariants = cva("relative overflow-hidden bg-h-separator", {
  variants: { orientation: { horizontal: "w-full h-(--stepper-separator-size)", vertical: "h-full w-(--stepper-separator-size)" } },
})
const separatorFillVariants = cva("absolute inset-0 bg-(--stepper-complete-color) motion-reduce:[transition:none]", {
  variants: {
    orientation: {
      horizontal:
        "[transform:scaleX(var(--stepper-separator-progress,0))] [transform-origin:0_center] [transition:transform_0.3s] [&:dir(rtl)]:[transform-origin:100%_center]",
      vertical: "[transform:scaleY(var(--stepper-separator-progress,0))] [transform-origin:center_top] [transition:transform_0.3s]",
    },
  },
})

/* Styled with Tailwind utilities (cva for the size and orientation), the keyframes live in app/globals.css. An `ol` of steps. Each step has an indicator circle (2px border, 22 / 28 /
   36px for sm / md / lg), a title and an optional description, and a separator line to the next step that fills to show
   progress (2px, 0.3s). A step is inactive, active or complete: inactive has a muted border and number, active the accent
   border and number, complete a solid accent circle with a checkmark that draws in (the circle pops 1 to 1.15 to 1 in
   0.3s). Horizontal steps are centred columns that share the width, with the label under the circle (6px gap); vertical
   steps put the label beside it (10px gap) and are 12 / 16 / 24px apart. Titles are 11 / 12 / 14px medium, descriptions
   10 / 12 / 12px, muted, and an inactive step's title is muted and its description at 60%. Steps are display only until
   `onStepChange` is given: then each is a button (hover and press dim the indicator to 80%, focus ring from the keyboard).
   Colours come from CSS variables on the root (arbitrary-property utilities), so a custom colour is a class such as `[--stepper-active-color:red]`: --stepper-active-color,
   --stepper-active-fg (the text colour of the active number, kept separate so it can be dark enough on light surfaces),
   --stepper-complete-color, --stepper-complete-fg, --stepper-inactive-border, --stepper-inactive-fg, --stepper-separator-size. */
type StepperSize = "sm" | "md" | "lg"
type StepperOrientation = "horizontal" | "vertical"
type StepStatus = "inactive" | "active" | "complete"

type RootCtx = { size: StepperSize; orientation: StepperOrientation; clickable: boolean; select: (index: number) => void }
type StepCtx = { index: number; status: StepStatus; isLast: boolean }

const RootContext = React.createContext<RootCtx>({ size: "md", orientation: "horizontal", clickable: false, select: () => {} })
const StepContext = React.createContext<StepCtx | null>(null)

/** Per-step state (index, status, whether it is the last) for any component inside a `StepperStep`. */
function useStepperStep() {
  const ctx = React.useContext(StepContext)
  if (!ctx) throw new Error("useStepperStep must be used inside <StepperStep>")
  return ctx
}

type StepperProps = Omit<React.ComponentProps<"ol">, "onChange"> & {
  orientation?: StepperOrientation
  size?: StepperSize
  /** The active step index (controlled). */
  currentStep?: number
  /** The initial active step index (uncontrolled). Default 0. */
  defaultStep?: number
  /** Called with the step index when a step is clicked. Makes the steps interactive. */
  onStepChange?: (step: number) => void
}

function Stepper({ orientation = "horizontal", size = "md", currentStep, defaultStep = 0, onStepChange, className, children, ...props }: StepperProps) {
  const [inner, setInner] = React.useState(defaultStep)
  const current = currentStep ?? inner
  const select = React.useCallback(
    (index: number) => {
      if (currentStep === undefined) setInner(index)
      onStepChange?.(index)
    },
    [currentStep, onStepChange]
  )
  const steps = React.Children.toArray(children).filter(React.isValidElement)
  return (
    <RootContext.Provider value={{ size, orientation, clickable: !!onStepChange, select }}>
      <ol
        data-slot="stepper"
        data-orientation={orientation}
        className={cn(stepperVariants({ orientation, size }), className)}
        {...props}
      >
        {steps.map((child, index) => (
          <StepContext.Provider
            key={(child as React.ReactElement).key ?? index}
            value={{ index, status: index < current ? "complete" : index === current ? "active" : "inactive", isLast: index === steps.length - 1 }}
          >
            {child}
          </StepContext.Provider>
        ))}
      </ol>
    </RootContext.Provider>
  )
}

/** Children as a flat list, looking through fragments (a render function usually returns one), so the separator is found. */
function flatten(children: React.ReactNode): React.ReactNode[] {
  return React.Children.toArray(children).flatMap((child) =>
    React.isValidElement<{ children?: React.ReactNode }>(child) && child.type === React.Fragment ? flatten(child.props.children) : [child]
  )
}

type StepProps = Omit<React.ComponentProps<"li">, "children"> & {
  children?: React.ReactNode | ((step: StepCtx) => React.ReactNode)
}

function StepperStep({ className, children, ...props }: StepProps) {
  const { orientation, clickable, select } = React.useContext(RootContext)
  const step = useStepperStep()
  const resolved = typeof children === "function" ? children(step) : children
  const nodes = flatten(resolved)
  // Separators sit beside the button, not inside it.
  const separators = nodes.filter((n) => React.isValidElement(n) && n.type === StepperSeparator)
  const content = nodes.filter((n) => !(React.isValidElement(n) && n.type === StepperSeparator))
  const buttonClass = stepButtonVariants({ orientation })
  return (
    <li
      data-slot="stepper-step"
      data-index={step.index}
      data-status={step.status}
      className={cn(stepVariants({ orientation }), className)}
      {...props}
    >
      {clickable ? (
        <button type="button" data-slot="stepper-step-button" data-clickable="true" aria-current={step.status === "active" ? "step" : undefined} onClick={() => select(step.index)} className={buttonClass}>
          {content}
        </button>
      ) : (
        <div data-slot="stepper-step-button" aria-current={step.status === "active" ? "step" : undefined} className={buttonClass}>
          {content}
        </div>
      )}
      {separators}
    </li>
  )
}

function StepperIndicator({ className, children, ...props }: React.ComponentProps<"span">) {
  const { size } = React.useContext(RootContext)
  const { index, status } = useStepperStep()
  return (
    <span
      data-slot="stepper-indicator"
      data-status={status}
      className={cn(indicatorVariants({ size }), className)}
      {...props}
    >
      {children ??
        (status === "complete" ? (
          <StepperIcon className="w-full">
            <Checkmark />
          </StepperIcon>
        ) : (
          <span>{index + 1}</span>
        ))}
    </span>
  )
}

function Checkmark() {
  return (
    <svg
      aria-hidden="true"
      role="presentation"
      data-slot="stepper-default-checkmark"
      className={checkmarkClass}
      viewBox="0 0 17 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="1 9 7 14 15 4" />
    </svg>
  )
}

function StepperIcon({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="stepper-icon" className={cn(stepperIconClass, className)} {...props} />
}

function StepperContent({ className, ...props }: React.ComponentProps<"span">) {
  const { orientation } = React.useContext(RootContext)
  return (
    <span
      data-slot="stepper-content"
      className={cn(contentVariants({ orientation }), className)}
      {...props}
    />
  )
}

function StepperTitle({ className, ...props }: React.ComponentProps<"span">) {
  const { size } = React.useContext(RootContext)
  return (
    <span
      data-slot="stepper-title"
      className={cn(titleVariants({ size }), className)}
      {...props}
    />
  )
}

function StepperDescription({ className, ...props }: React.ComponentProps<"span">) {
  const { size } = React.useContext(RootContext)
  return (
    <span
      data-slot="stepper-description"
      className={cn(descriptionVariants({ size }), className)}
      {...props}
    />
  )
}

type SeparatorProps = React.ComponentProps<"div"> & {
  /** Fill from 0 to 1. Defaults to full when the step is complete, empty otherwise. */
  progress?: number
  /** Show it on the last step too. */
  force?: boolean
}

function StepperSeparator({ progress, force = false, className, style, ...props }: SeparatorProps) {
  const { orientation } = React.useContext(RootContext)
  const { status, isLast } = useStepperStep()
  if (isLast && !force) return null
  const p = Math.min(1, Math.max(0, progress ?? (status === "complete" ? 1 : 0)))
  const horizontal = orientation === "horizontal"
  return (
    <div
      aria-hidden="true"
      data-slot="stepper-separator"
      className={cn(separatorVariants({ orientation }), className)}
      style={style}
      {...props}
    >
      <div
        data-slot="stepper-separator-track"
        data-complete={p >= 1 ? "true" : undefined}
        className={separatorTrackVariants({ orientation })}
      >
        <div
          data-slot="stepper-separator-fill"
          style={{ ["--stepper-separator-progress" as string]: p }}
          className={separatorFillVariants({ orientation })}
        />
      </div>
    </div>
  )
}

export {
  Stepper,
  StepperStep,
  StepperIndicator,
  StepperIcon,
  StepperContent,
  StepperTitle,
  StepperDescription,
  StepperSeparator,
  useStepperStep,
}
export type { StepperProps, StepperSize, StepperOrientation, StepStatus }
