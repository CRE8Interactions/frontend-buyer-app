import * as React from "react"
import { cn } from "@/lib/utils"

/* One style: the transitions.dev pulse. The block fades to 50% and back over 1s, ease-in-out, on repeat while loading
   (`--pulse-dur`, `--pulse-min`, `--pulse-count` in app/globals.css). Skeletons that mount together stay in sync. No motion
   under reduced motion. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "pointer-events-none rounded-[4px] bg-h-surface-tertiary/70 animate-[t-skel-pulse_var(--pulse-dur)_ease-in-out_var(--pulse-count)] motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  )
}

/* Skeleton loader and reveal, from transitions.dev. The skeleton and the real content sit in the same grid cell, so the swap
   moves nothing. When `loading` turns false both layers cross-fade with a matching cross-blur (400ms, 2px, ease-in-out; tokens
   in app/globals.css). While loading the content is inert and hidden from assistive tech; after the reveal the skeleton is. */
function SkeletonReveal({
  loading,
  skeleton,
  children,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & { loading: boolean; skeleton: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      data-slot="skeleton-reveal"
      aria-busy={loading || undefined}
      className={cn("t-skel grid", !loading && "is-revealed", className)}
      {...props}
    >
      <div className="t-skel-skeleton" aria-hidden="true" inert={!loading || undefined}>{skeleton}</div>
      <div className="t-skel-content" aria-hidden={loading || undefined} inert={loading || undefined}>{children}</div>
    </div>
  )
}

export { Skeleton, SkeletonReveal }
