/* One icon-tile style for every component that puts an icon in a tinted tile (empty state, alert dialog,
   dialog, item): a soft fill in the tone of the message, the glyph in the tone's soft foreground at 65%,
   and a faint halo ring of the same tint. Size and radius stay with the component. */
export type IconTone = "default" | "accent" | "success" | "warning" | "danger"

const fill = {
  default: "bg-h-default-soft text-h-default-soft-foreground/65",
  accent: "bg-h-accent-soft text-h-accent-soft-foreground/65",
  success: "bg-h-success-soft text-h-success-soft-foreground/65",
  warning: "bg-h-warning-soft text-h-warning-soft-foreground/65",
  danger: "bg-h-danger-soft text-h-danger-soft-foreground/65",
} as const

const halo = {
  default: "shadow-[0_0_0_var(--tile-halo,6px)_color-mix(in_oklab,var(--h-default-soft)_45%,transparent)]",
  accent: "shadow-[0_0_0_var(--tile-halo,6px)_color-mix(in_oklab,var(--h-accent-soft)_45%,transparent)]",
  success: "shadow-[0_0_0_var(--tile-halo,6px)_color-mix(in_oklab,var(--h-success-soft)_45%,transparent)]",
  warning: "shadow-[0_0_0_var(--tile-halo,6px)_color-mix(in_oklab,var(--h-warning-soft)_45%,transparent)]",
  danger: "shadow-[0_0_0_var(--tile-halo,6px)_color-mix(in_oklab,var(--h-danger-soft)_45%,transparent)]",
} as const

export const iconTile = (tone: IconTone = "default", withHalo = true) => (withHalo ? `${fill[tone]} ${halo[tone]}` : fill[tone])
