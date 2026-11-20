import { cn } from "@/lib/utils"

/**
 * the reference FieldError (field-error.css). Collapsed (h-0, transparent) until
 * `isVisible`, then h-auto / opaque. Transitions: opacity 150ms ease-out,
 * height 350ms ease. Give it role="alert" semantics via aria-live.
 */
function FieldError({
  className,
  isVisible = true,
  ...props
}: React.ComponentProps<"div"> & { isVisible?: boolean }) {
  return (
    <div
      data-slot="field-error"
      data-visible={isVisible ? "true" : undefined}
      aria-live="polite"
      className={cn(
        "h-0 text-xs break-words text-h-danger-text opacity-0",
        "[transition:opacity_150ms_var(--e-out),height_350ms_ease] motion-reduce:[transition:none]",
        "data-[visible=true]:h-auto data-[visible=true]:opacity-100",
        className
      )}
      {...props}
    />
  )
}

/** the reference ErrorMessage (error-message.css): always-visible xs danger text. */
function ErrorMessage({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="error-message"
      className={cn(
        "h-auto text-xs break-words text-h-danger-text",
        "[transition:opacity_150ms_var(--e-out),height_350ms_ease] motion-reduce:[transition:none]",
        className
      )}
      {...props}
    />
  )
}

export { FieldError, ErrorMessage }
