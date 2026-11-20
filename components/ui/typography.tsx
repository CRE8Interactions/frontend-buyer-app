import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

/* `Typography` sets one piece of text in a named style: headings h1 to h6
   (36, 30, 24, 20, 18 and 16px, semibold, tight tracking), body (16 / 28px), body-sm (14 / 24px), body-xs (12 / 20px) and code
   (an inline chip in the mono face). `align`, `color` (default or muted), `weight` and `truncate` adjust it, and `as`
   chooses the element, so the look and the document outline can differ. `Prose` styles plain HTML (headings, paragraphs,
   lists, quotes, code, links, rules, images) from the same scale, for content that comes from a CMS or markdown. */
type TypographyVariant = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "body" | "body-sm" | "body-xs" | "code"

const defaultTag: Record<TypographyVariant, React.ElementType> = { h1: "h1", h2: "h2", h3: "h3", h4: "h4", h5: "h5", h6: "h6", body: "p", "body-sm": "p", "body-xs": "p", code: "code" }
type TypographyProps<T extends React.ElementType> = {
  variant?: TypographyVariant
  as?: T
  align?: "start" | "center" | "end" | "justify"
  color?: "default" | "muted"
  weight?: "normal" | "medium" | "semibold" | "bold"
  truncate?: boolean
} & Omit<React.ComponentPropsWithoutRef<T>, "color">

const typographyVariants = cva("", {
  variants: {
    variant: {
      h1: "text-4xl font-semibold tracking-tight",
      h2: "text-3xl font-semibold tracking-tight",
      h3: "text-2xl font-semibold tracking-tight",
      h4: "text-xl font-semibold tracking-tight",
      h5: "text-lg font-semibold tracking-tight",
      h6: "text-base font-semibold tracking-tight",
      body: "text-base leading-7",
      "body-sm": "text-sm leading-6",
      "body-xs": "text-xs leading-5",
      code: "rounded-[6px] bg-h-default px-1.5 py-0.5 font-mono text-sm text-h-foreground",
    },
    align: { start: "text-start", center: "text-center", end: "text-end", justify: "text-justify" },
    color: { default: "text-h-foreground", muted: "text-h-muted" },
    weight: { normal: "font-normal", medium: "font-medium", semibold: "font-semibold", bold: "font-bold" },
    truncate: { true: "block truncate", false: "" },
  },
  defaultVariants: { variant: "body", color: "default", truncate: false },
})

/* Plain HTML inside `Prose`, from the same scale. */
const prose = [
  "text-h-foreground",
  "[&_h1]:text-4xl [&_h1]:font-semibold [&_h1]:tracking-tight",
  "[&_h2]:text-3xl [&_h2]:font-semibold [&_h2]:tracking-tight",
  "[&_h3]:text-2xl [&_h3]:font-semibold [&_h3]:tracking-tight",
  "[&_h4]:text-xl [&_h4]:font-semibold [&_h4]:tracking-tight",
  "[&_h5]:text-lg [&_h5]:font-semibold [&_h5]:tracking-tight",
  "[&_h6]:text-base [&_h6]:font-semibold [&_h6]:tracking-tight",
  "[&_p]:text-base [&_p]:leading-7 [&_li]:text-base [&_li]:leading-7",
  "[&_code]:rounded-[6px] [&_code]:bg-h-default [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm",
  "[&_a]:font-medium [&_a]:text-h-link [&_a]:underline [&_a]:underline-offset-4",
  "[&_blockquote]:mt-4 [&_blockquote]:border-s-4 [&_blockquote]:border-h-border [&_blockquote]:ps-4 [&_blockquote]:text-h-muted [&_blockquote]:italic",
  "[&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:ps-6",
  "[&_ol]:my-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:ps-6",
  "[&_hr]:my-8 [&_hr]:border-h-separator",
  "[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-[12px] [&_pre]:bg-h-default [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-sm [&_pre]:leading-relaxed",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_strong]:font-semibold [&_em]:italic",
  "[&_img]:my-4 [&_img]:rounded-[12px]",
  "[&>*+*]:mt-4",
].join(" ")

function Typography<T extends React.ElementType = "p">({ variant = "body", as, align, color = "default", weight, truncate, className, ...props }: TypographyProps<T>) {
  const Comp = (as ?? defaultTag[variant]) as React.ElementType
  return (
    <Comp
      data-slot="typography"
      className={cn(
        typographyVariants({ variant, align, color, weight, truncate }),
        className
      )}
      {...props}
    />
  )
}

/** Styles the plain HTML inside it from the type scale. */
function Prose({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="prose"
      className={cn(prose, className)}
      {...props}
    />
  )
}

export { Typography, Prose }
export type { TypographyVariant }
