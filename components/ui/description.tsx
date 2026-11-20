import { cn } from "@/lib/utils"

/** the reference Description: text-xs, muted, wraps. Hidden by TextField when invalid. */
function Description({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="description"
      className={cn("text-xs text-wrap break-words text-h-muted", className)}
      {...props}
    />
  )
}

export { Description }
