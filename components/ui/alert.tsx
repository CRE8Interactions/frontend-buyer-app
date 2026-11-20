import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { CheckCircle, Info, Warning, WarningCircle } from "@phosphor-icons/react"

/* Copied from the reference alert.css. A row on the surface fill with 24px corners, 16px side and 12px vertical padding,
   a 16px gap, the surface shadow and no border. The indicator (16px icon in 4px padding) and the title (14px / 24px
   medium) take the variant's soft foreground colour, the description is muted 14px. Variants: default, accent, success,
   warning, danger, plus info and purple from our status colours. `destructive` is kept as an alias of danger.
   Compose as Alert > AlertIndicator + AlertContent > AlertTitle + AlertDescription. An empty AlertIndicator shows the
   variant's own icon (info, check, warning). */
type AlertVariant = NonNullable<VariantProps<typeof alertVariants>["variant"]>
const AlertContext = React.createContext<AlertVariant>("default")
const defaultIcons: Record<AlertVariant, React.ElementType> = {
  default: Info, accent: Info, info: Info, purple: Info, success: CheckCircle, warning: Warning, danger: WarningCircle, destructive: WarningCircle,
}

const alertVariants = cva(
  "flex w-full flex-row items-start justify-start gap-4 rounded-[24px] bg-h-surface px-4 py-3 shadow-h-surface [:root:not([data-nt=light])_&]:bg-h-field",
  {
    variants: {
      variant: {
        default: "[--alert-fg:var(--h-foreground)]",
        accent: "[--alert-fg:var(--h-accent-soft-foreground)]",
        success: "[--alert-fg:var(--h-success-soft-foreground)]",
        warning: "[--alert-fg:var(--h-warning-soft-foreground)]",
        danger: "[--alert-fg:var(--h-danger-soft-foreground)]",
        info: "[--alert-fg:var(--h-info-soft-foreground)]",
        purple: "[--alert-fg:var(--h-purple-soft-foreground)]",
        destructive: "[--alert-fg:var(--h-danger-soft-foreground)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <AlertContext.Provider value={variant ?? "default"}>
    <div
      data-slot="alert"
      role="alert"
      className={cn(
        alertVariants({ variant }),
        /* A bare icon placed straight inside Alert gets the indicator look too. */
        "[&>svg]:box-content [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:p-1 [&>svg]:text-(--alert-fg)",
        className
      )}
      {...props}
    />
    </AlertContext.Provider>
  )
}

function AlertIndicator({ className, children, ...props }: React.ComponentProps<"div">) {
  const variant = React.useContext(AlertContext)
  const Icon = defaultIcons[variant]
  return (
    <div
      data-slot="alert-indicator"
      className={cn("flex shrink-0 items-center justify-center p-1 text-(--alert-fg) select-none [&>svg]:box-content [&>svg]:size-4", className)}
      {...props}
    >
      {children ?? <Icon weight="bold" aria-hidden data-slot="alert-default-icon" />}
    </div>
  )
}

function AlertContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-content" className={cn("flex h-full min-w-0 grow flex-col items-start", className)} {...props} />
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-title" className={cn("text-sm leading-6 font-medium text-(--alert-fg)", className)} {...props} />
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-description" className={cn("text-sm text-h-muted", className)} {...props} />
}

export { Alert, AlertIndicator, AlertContent, AlertTitle, AlertDescription }
