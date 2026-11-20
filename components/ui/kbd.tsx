import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/** the reference Kbd. */
const kbdVariants = cva(
  [
    "inline-flex h-6 items-center space-x-0.5 rounded-[8px] px-2 rtl:space-x-reverse",
    "text-center font-sans text-sm font-medium whitespace-nowrap text-h-muted [word-spacing:-0.25rem]",
  ].join(" "),
  {
  variants: {
    variant: { default: "bg-h-default", light: "bg-transparent" },
  },
  defaultVariants: { variant: "default" },
  }
)

/* Named keys and the symbol shown for each, with the name a screen reader gets. */
const keySymbols: Record<string, [string, string]> = {
  command: ["⌘", "Command"], shift: ["⇧", "Shift"], ctrl: ["⌃", "Control"], option: ["⌥", "Option"], alt: ["Alt", "Alt"], win: ["⊞", "Windows"],
  enter: ["↵", "Enter"], delete: ["⌫", "Delete"], escape: ["⎋", "Escape"], tab: ["⇥", "Tab"], space: ["␣", "Space"], capslock: ["⇪", "Caps Lock"], help: ["?", "Help"],
  up: ["↑", "Up"], down: ["↓", "Down"], left: ["←", "Left"], right: ["→", "Right"],
  pageup: ["⇞", "Page Up"], pagedown: ["⇟", "Page Down"], home: ["↖", "Home"], end: ["↘", "End"],
  fn: ["fn", "Function"],
}
const symbolNames: Record<string, string> = Object.fromEntries(Object.values(keySymbols).map(([sym, name]) => [sym, name]))

function Kbd({
  className,
  variant,
  keys,
  children,
  ...props
}: React.ComponentProps<"kbd"> &
  VariantProps<typeof kbdVariants> & {
    /** The keys of a shortcut: a string like "⌘⇧D" (one key per character) or a list like ["command", "shift", "D"]. Named keys show their symbol and are announced by name. */
    keys?: string | string[]
  }) {
  const list = typeof keys === "string" ? Array.from(keys) : keys
  return (
    <kbd
      data-slot="kbd"
      className={cn(kbdVariants({ variant }), className)}
      {...props}
    >
      {list
        ? list.map((k, i) => {
            const named = keySymbols[k.toLowerCase()]
            const symbol = named ? named[0] : k
            const name = named ? named[1] : symbolNames[k]
            return name ? (
              <KbdAbbr key={i} title={name} aria-label={name}>{symbol}</KbdAbbr>
            ) : (
              <KbdContent key={i}>{symbol}</KbdContent>
            )
          })
        : children}
    </kbd>
  )
}

/** Key abbreviation (centred, no underline): centred, no underline. */
function KbdAbbr({
  className,
  ...props
}: React.ComponentProps<"abbr">) {
  return (
    <abbr
      data-slot="kbd-abbr"
      className={cn("flex h-full items-center justify-center no-underline [text-decoration:none]", className)}
      {...props}
    />
  )
}

/** Content wrapper . */
function KbdContent({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="kbd-content"
      className={cn("flex items-center justify-center", className)}
      {...props}
    />
  )
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  )
}

export { Kbd, KbdAbbr, KbdContent, KbdGroup, kbdVariants }
