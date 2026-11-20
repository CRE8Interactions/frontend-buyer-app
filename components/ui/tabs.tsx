"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Tabs as TabsPrimitive } from "radix-ui"
import { motion, useReducedMotion } from "framer-motion"

/* The active pill glides between triggers (a shared layout animation, 220ms, no bounce) instead of jumping.
   The root tracks the value so each trigger knows whether it holds the indicator. */
const TabsContext = React.createContext<{ value: string | undefined; id: string }>({ value: undefined, id: "" })

function Tabs({
  className,
  orientation = "horizontal",
  value: valueProp,
  defaultValue,
  onValueChange,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const id = React.useId()
  const [inner, setInner] = React.useState(defaultValue)
  const value = valueProp ?? inner
  return (
    <TabsContext.Provider value={{ value, id }}>
    <TabsPrimitive.Root
      value={value}
      onValueChange={(v) => {
        setInner(v)
        onValueChange?.(v)
      }}
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
        className
      )}
      {...props}
    />
    </TabsContext.Provider>
  )
}

/* Heights follow the shared control ladder: sm 36 (32 on desktop), md 40 (36), lg 48 (44). */
const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-full p-[3px] text-muted-foreground group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted p-1",
        /* line: a baseline under the whole row, the active tab marks it with a green underline that glides */
        line: "rounded-none border-b border-h-separator bg-transparent p-0 group-data-[orientation=vertical]/tabs:border-b-0 group-data-[orientation=vertical]/tabs:border-l",
        /* soft: no bar, the active tab sits in a neutral pill that glides between triggers */
        soft: "bg-transparent p-1 group-data-[orientation=vertical]/tabs:rounded-[20px]",
        /* outline: every tab is outlined, the active one has a stronger outline that glides */
        outline: "gap-1.5 bg-transparent p-0",
      },
      size: {
        sm: "group-data-[orientation=horizontal]/tabs:h-9 md:group-data-[orientation=horizontal]/tabs:h-8 text-sm",
        md: "group-data-[orientation=horizontal]/tabs:h-10 md:group-data-[orientation=horizontal]/tabs:h-9",
        lg: "group-data-[orientation=horizontal]/tabs:h-12 md:group-data-[orientation=horizontal]/tabs:h-11 text-base",
      },
      fullWidth: { true: "w-full", false: "" },
      scrollable: {
        true: "w-full max-w-full justify-start overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:flex-none [mask-image:linear-gradient(to_right,transparent,#000_16px,#000_calc(100%-16px),transparent)]",
        false: "",
      },
    },
    compoundVariants: [
      /* HeroUI primary: a 40px track with 32px tabs on every breakpoint (the shared ladder would shrink it to 36 on desktop). */
      { variant: ["soft", "default"], size: "md", class: "group-data-[orientation=horizontal]/tabs:h-10 md:group-data-[orientation=horizontal]/tabs:h-10" },
    ],
    defaultVariants: {
      variant: "soft",
      size: "md",
      fullWidth: false,
      scrollable: false,
    },
  }
)

/* Divider before every tab but the first (a pseudo element, so tabs keep their own markup); hidden beside the selected tab. */
const separatorClasses = [
  "[&>[data-slot=tabs-trigger]:not(:first-child)]:before:pointer-events-none [&>[data-slot=tabs-trigger]:not(:first-child)]:before:absolute [&>[data-slot=tabs-trigger]:not(:first-child)]:before:rounded-[8px] [&>[data-slot=tabs-trigger]:not(:first-child)]:before:bg-current [&>[data-slot=tabs-trigger]:not(:first-child)]:before:opacity-15 [&>[data-slot=tabs-trigger]:not(:first-child)]:before:transition-opacity",
  "group-data-[orientation=horizontal]/tabs:[&>[data-slot=tabs-trigger]:not(:first-child)]:before:-start-px group-data-[orientation=horizontal]/tabs:[&>[data-slot=tabs-trigger]:not(:first-child)]:before:top-1/4 group-data-[orientation=horizontal]/tabs:[&>[data-slot=tabs-trigger]:not(:first-child)]:before:h-1/2 group-data-[orientation=horizontal]/tabs:[&>[data-slot=tabs-trigger]:not(:first-child)]:before:w-px",
  "group-data-[orientation=vertical]/tabs:[&>[data-slot=tabs-trigger]:not(:first-child)]:before:-top-px group-data-[orientation=vertical]/tabs:[&>[data-slot=tabs-trigger]:not(:first-child)]:before:start-1/4 group-data-[orientation=vertical]/tabs:[&>[data-slot=tabs-trigger]:not(:first-child)]:before:h-px group-data-[orientation=vertical]/tabs:[&>[data-slot=tabs-trigger]:not(:first-child)]:before:w-1/2",
  "[&>[data-state=active]]:before:opacity-0 [&>[data-state=active]+[data-slot=tabs-trigger]]:before:opacity-0",
].join(" ")
const alignClasses = {
  start: "[&>[data-slot=tabs-trigger]]:!justify-start",
  center: "[&>[data-slot=tabs-trigger]]:!justify-center",
  end: "[&>[data-slot=tabs-trigger]]:!justify-end",
}

function TabsList({
  className,
  variant = "soft",
  size = "md",
  fullWidth,
  scrollable,
  tone = "neutral",
  separator = false,
  align,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants> & {
    /** Colour of the selected pill on soft tabs: a neutral lighter pill (default, the HeroUI primary look) or the theme accent. */
    tone?: "neutral" | "accent"
    /** A thin divider between tabs, hidden next to the selected one. */
    separator?: boolean
    /** Where the label sits inside each tab. Soft vertical tabs default to start, everything else to centre. */
    align?: "start" | "center" | "end"
  }) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      data-size={size}
      data-tone={tone}
      className={cn(tabsListVariants({ variant, size, fullWidth, scrollable }), tone === "neutral" && variant === "soft" && "bg-(--h-neutral-track) [--tab-selected:var(--h-neutral-selected)]", separator && separatorClasses, align && alignClasses[align], className)}
      {...props}
    />
  )
}

/* Whether the last input was the keyboard. Focus that moves by script after a mouse click (Radix focuses the new tab) must not
   draw the focus ring, so the ring is shown only after a key press. */
let keyboardModality = false
if (typeof document !== "undefined") {
  document.addEventListener("keydown", () => { keyboardModality = true }, true)
  document.addEventListener("pointerdown", () => { keyboardModality = false }, true)
}

function TabsTrigger({
  className,
  children,
  iconOnly,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger> & {
  /** The tab holds only an icon: it becomes a round pill. Give it an aria-label. */
  iconOnly?: boolean
}) {
  const ctx = React.useContext(TabsContext)
  const reduce = useReducedMotion()
  const active = ctx.value !== undefined && ctx.value === props.value
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      data-icon-only={iconOnly ? "true" : undefined}
      onPointerDown={(e) => { e.currentTarget.dataset.pointer = "true"; props.onPointerDown?.(e) }}
      onFocus={(e) => {
        if (keyboardModality) delete e.currentTarget.dataset.pointer
        else e.currentTarget.dataset.pointer = "true"
        props.onFocus?.(e)
      }}
      onBlur={(e) => { delete e.currentTarget.dataset.pointer; props.onBlur?.(e) }}
      className={cn(
        "group-data-[orientation=vertical]/tabs:group-data-[variant=soft]/tabs-list:h-9 group-data-[orientation=vertical]/tabs:group-data-[variant=soft]/tabs-list:rounded-[16px] group-data-[orientation=vertical]/tabs:group-data-[variant=soft]/tabs-list:justify-start",
        "group-data-[orientation=vertical]/tabs:group-data-[variant=line]/tabs-list:justify-start",
        "group-data-[variant=line]/tabs-list:data-[state=inactive]:text-foreground/45 group-data-[variant=line]/tabs-list:data-[state=inactive]:hover:text-foreground",
        "group-data-[variant=soft]/tabs-list:h-full group-data-[variant=soft]/tabs-list:px-4 group-data-[variant=default]/tabs-list:h-full group-data-[variant=default]/tabs-list:px-4",
        "group-data-[variant=line]/tabs-list:focus-visible:ring-2 group-data-[variant=line]/tabs-list:focus-visible:ring-inset",
        "data-[pointer=true]:focus-visible:ring-0 data-[pointer=true]:focus-visible:outline-none data-[pointer=true]:focus-visible:border-transparent",
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-full border border-transparent px-3 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-[color,background-color,box-shadow,transform] active:scale-[0.97] group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:border-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent",
        "data-[state=active]:text-primary-foreground dark:data-[state=active]:text-foreground",
        "group-data-[variant=soft]/tabs-list:data-[state=active]:text-h-foreground dark:group-data-[variant=soft]/tabs-list:data-[state=active]:text-h-foreground group-data-[variant=line]/tabs-list:data-[state=active]:text-h-foreground dark:group-data-[variant=line]/tabs-list:data-[state=active]:text-h-foreground",
        "group-data-[variant=line]/tabs-list:h-full group-data-[variant=line]/tabs-list:rounded-lg group-data-[variant=line]/tabs-list:px-4",
        "group-data-[size=lg]/tabs-list:px-4 group-data-[size=lg]/tabs-list:text-base group-data-[size=sm]/tabs-list:px-2.5",
        /* icon-only tabs are round */
        "data-[icon-only=true]:aspect-square data-[icon-only=true]:flex-none data-[icon-only=true]:px-0 group-data-[variant=line]/tabs-list:data-[icon-only=true]:aspect-auto group-data-[variant=line]/tabs-list:data-[icon-only=true]:px-3",
        "group-data-[variant=outline]/tabs-list:h-full group-data-[variant=outline]/tabs-list:border-h-separator-secondary group-data-[variant=outline]/tabs-list:px-4 group-data-[variant=outline]/tabs-list:data-[state=active]:text-h-foreground dark:group-data-[variant=outline]/tabs-list:data-[state=active]:text-h-foreground",
        "group-data-[variant=outline]/tabs-list:data-[state=inactive]:hover:bg-h-foreground/5 group-data-[variant=outline]/tabs-list:data-[state=active]:border-transparent",
        /* hover: a subtle grey wash (5% of the text colour) behind an inactive pill tab; the underline style has none. */
        "group-data-[variant=default]/tabs-list:data-[state=inactive]:hover:bg-h-foreground/5",
        "group-data-[variant=soft]/tabs-list:data-[state=inactive]:hover:bg-h-foreground/5 group-data-[variant=line]/tabs-list:hover:bg-transparent",
        "group-data-[variant=soft]/tabs-list:bg-transparent group-data-[variant=soft]/tabs-list:data-[state=active]:shadow-none",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5",
        className
      )}
      {...props}
    >
      {active ? (
        <motion.span
          layoutId={`${ctx.id}-tab-indicator`}
          aria-hidden
          className="absolute inset-0 -z-0 rounded-full group-data-[variant=soft]/tabs-list:-inset-px group-data-[variant=default]/tabs-list:-inset-px group-data-[orientation=vertical]/tabs:group-data-[variant=line]/tabs-list:inset-x-auto group-data-[orientation=vertical]/tabs:group-data-[variant=line]/tabs-list:inset-y-1 group-data-[orientation=vertical]/tabs:group-data-[variant=line]/tabs-list:start-[-1px] group-data-[orientation=vertical]/tabs:group-data-[variant=line]/tabs-list:h-auto group-data-[orientation=vertical]/tabs:group-data-[variant=line]/tabs-list:w-0.5 group-data-[orientation=vertical]/tabs:group-data-[variant=soft]/tabs-list:rounded-[16px] bg-primary group-data-[variant=line]/tabs-list:inset-x-3 group-data-[variant=line]/tabs-list:top-auto group-data-[variant=line]/tabs-list:-bottom-px group-data-[variant=line]/tabs-list:h-0.5 group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:bg-h-accent group-data-[variant=line]/tabs-list:ring-0 dark:group-data-[variant=line]/tabs-list:bg-h-accent dark:group-data-[variant=line]/tabs-list:ring-0 group-data-[variant=soft]/tabs-list:bg-(--tab-selected,var(--h-accent-selected)) group-data-[variant=soft]/tabs-list:ring-0 group-data-[variant=soft]/tabs-list:shadow-[0_2px_4px_rgb(0_0_0/0.04),0_1px_2px_rgb(0_0_0/0.06),0_0_1px_rgb(0_0_0/0.06)] group-data-[variant=default]/tabs-list:shadow-[0_2px_4px_rgb(0_0_0/0.04),0_1px_2px_rgb(0_0_0/0.06),0_0_1px_rgb(0_0_0/0.06)] group-data-[variant=outline]/tabs-list:bg-transparent group-data-[variant=outline]/tabs-list:ring-1 group-data-[variant=outline]/tabs-list:ring-inset group-data-[variant=outline]/tabs-list:ring-h-foreground/60 dark:group-data-[variant=outline]/tabs-list:bg-transparent dark:group-data-[variant=outline]/tabs-list:ring-1 dark:group-data-[variant=outline]/tabs-list:ring-h-foreground/60 dark:bg-input/30 dark:ring-1 dark:ring-input dark:group-data-[variant=soft]/tabs-list:bg-(--tab-selected,var(--h-accent-selected)) dark:group-data-[variant=soft]/tabs-list:ring-0"
          transition={{ type: "spring", duration: reduce ? 0 : 0.22, bounce: 0 }}
        />
      ) : null}
      <span className="relative z-10 inline-flex items-center justify-center gap-1.5">{children}</span>
    </TabsPrimitive.Trigger>
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
