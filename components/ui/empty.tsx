import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { iconTile } from "@/lib/icon-tile"

const emptySize = {
  sm: "gap-4 p-4 md:p-6",
  md: "gap-7 p-6 md:p-14",
  lg: "gap-9 p-8 md:p-20",
} as const

function Empty({ className, size = "md", ...props }: React.ComponentProps<"div"> & { size?: keyof typeof emptySize }) {
  return (
    <div
      data-slot="empty"
      data-size={size}
      className={cn(
        "group/empty flex min-w-0 flex-1 flex-col items-center justify-center text-center text-sm text-balance text-h-muted",
        emptySize[size],
        className
      )}
      {...props}
    />
  )
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-header"
      className={cn(
        "flex max-w-sm flex-col items-center gap-1.5 text-center group-data-[size=lg]/empty:max-w-md group-data-[size=lg]/empty:gap-2",
        className
      )}
      {...props}
    />
  )
}

/* The icon tile: a 56px soft tile in the tone of the message with a faint halo ring of the same tone. */
const emptyMediaVariants = cva(
  "mb-1 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "size-14 rounded-[20px] [&_svg:not([class*='size-'])]:size-6 group-data-[size=sm]/empty:size-10 group-data-[size=sm]/empty:rounded-[14px] group-data-[size=sm]/empty:[&_svg:not([class*='size-'])]:size-5 group-data-[size=lg]/empty:size-20 group-data-[size=lg]/empty:rounded-[28px] group-data-[size=lg]/empty:[&_svg:not([class*='size-'])]:size-8",
      },
      tone: {
        default: "",
        accent: "",
        success: "",
        warning: "",
        danger: "",
      },
    },
    compoundVariants: [
      ...(["default", "accent", "success", "warning", "danger"] as const).map((tone) => ({ variant: "icon" as const, tone, className: iconTile(tone) })),
    ],
    defaultVariants: {
      variant: "default",
      tone: "default",
    },
  }
)

function EmptyMedia({
  className,
  variant = "default",
  tone = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      data-tone={tone}
      className={cn(emptyMediaVariants({ variant, tone, className }))}
      {...props}
    />
  )
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-title"
      className={cn("text-xl leading-7 font-semibold tracking-tight text-h-foreground group-data-[size=sm]/empty:text-base group-data-[size=sm]/empty:leading-6 group-data-[size=lg]/empty:text-3xl group-data-[size=lg]/empty:leading-9", className)}
      {...props}
    />
  )
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <div
      data-slot="empty-description"
      className={cn(
        "text-sm leading-6 text-h-muted group-data-[size=sm]/empty:text-[13px] group-data-[size=sm]/empty:leading-5 group-data-[size=lg]/empty:text-base group-data-[size=lg]/empty:leading-7 [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-h-foreground",
        className
      )}
      {...props}
    />
  )
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        "flex w-full max-w-sm min-w-0 flex-col items-center gap-3 text-sm text-balance sm:flex-row sm:justify-center",
        className
      )}
      {...props}
    />
  )
}

export {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
}
