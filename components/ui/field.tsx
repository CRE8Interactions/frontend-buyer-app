"use client"

import { useMemo } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

/* A zero-specificity width, so a field's `> *` rule (full width, or auto in a row) wins, and a caller's class still beats both. */
const fitWidth = "[:where(&)]:w-fit"
/* Row layout shared by the horizontal field and the responsive one from 28rem of its field group. */
const rowItems = "[&>[data-slot=field-label]]:flex-auto has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox]]:mt-px has-[>[data-slot=field-content]]:[&_[role=radio]]:mt-px"

const fieldSetClass = "flex flex-col gap-6 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3"
const legendVariants = cva("mb-3 font-medium text-h-foreground", {
  variants: { variant: { legend: "text-base", label: "text-sm" } },
})
const fieldGroupClass = "@container/field-group flex w-full flex-col gap-4 data-[slot=checkbox-group]:gap-3 group/field-group"
const fieldContentClass = "flex flex-1 flex-col gap-1.5 leading-snug"
const fieldLabelClass = [
  "flex gap-2 leading-snug",
  fitWidth,
  "group-data-[disabled=true]/field:opacity-50",
  "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-[12px] has-[>[data-slot=field]]:border",
  "[&>[data-slot=field]]:p-4",
  "has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-h-accent-soft",
].join(" ")
const fieldTitleClass = [
  "flex items-center gap-2 text-sm leading-snug font-medium text-h-foreground",
  fitWidth,
  "group-data-[disabled=true]/field:opacity-50",
].join(" ")
const fieldDescriptionClass = [
  "text-xs leading-normal font-normal text-wrap text-h-muted",
  "group-has-[[data-orientation=horizontal]]/field:text-balance",
  "last:mt-0 nth-last-2:-mt-1 [[data-variant=legend]+&]:-mt-1.5",
  "[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-h-foreground",
].join(" ")
const fieldSeparatorClass = "relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2"
const fieldSeparatorLineClass = "absolute inset-0 top-1/2"
const fieldSeparatorContentClass = "relative mx-auto block w-fit bg-background px-2 text-h-muted"
const fieldErrorClass = "px-1 text-xs font-normal wrap-break-word text-h-danger-text"
const fieldErrorListClass = "ms-4 flex list-disc flex-col gap-1"

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn(fieldSetClass, className)}
      {...props}
    />
  )
}

function FieldLegend({
  className,
  variant = "legend",
  ...props
}: React.ComponentProps<"legend"> & { variant?: "legend" | "label" }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(legendVariants({ variant }), className)}
      {...props}
    />
  )
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn(fieldGroupClass, className)}
      {...props}
    />
  )
}

/* Vertical stacks, horizontal is a row, responsive stacks until its field group is 28rem wide (container query), then is a row. */
const fieldVariants = cva("group/field flex w-full", {
  variants: {
    orientation: {
      vertical: "flex-col gap-1 [&>*]:w-full [&>.sr-only]:w-auto",
      horizontal: ["flex-row items-center gap-3", rowItems].join(" "),
      responsive: [
        "flex-col gap-1 [&>*]:w-full [&>.sr-only]:w-auto",
        "@md/field-group:flex-row @md/field-group:items-center @md/field-group:gap-3 @md/field-group:[&>*]:w-auto @md/field-group:[&>.sr-only]:w-auto",
        "@md/field-group:[&>[data-slot=field-label]]:flex-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox]]:mt-px @md/field-group:has-[>[data-slot=field-content]]:[&_[role=radio]]:mt-px",
      ].join(" "),
    },
  },
  defaultVariants: {
    orientation: "vertical",
  },
})

function Field({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof fieldVariants>) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  )
}

function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-content"
      className={cn(fieldContentClass, className)}
      {...props}
    />
  )
}

function FieldLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  return (
    <Label
      data-slot="field-label"
      className={cn(fieldLabelClass, className)}
      {...props}
    />
  )
}

function FieldTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-label"
      className={cn(fieldTitleClass, className)}
      {...props}
    />
  )
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn(fieldDescriptionClass, className)}
      {...props}
    />
  )
}

function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  children?: React.ReactNode
}) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className={cn(fieldSeparatorClass, className)}
      {...props}
    >
      <Separator className={fieldSeparatorLineClass} />
      {children && (
        <span
          className={fieldSeparatorContentClass}
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  )
}

function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<"div"> & {
  errors?: Array<{ message?: string } | undefined>
}) {
  const content = useMemo(() => {
    if (children) {
      return children
    }

    if (!errors?.length) {
      return null
    }

    const uniqueErrors = [
      ...new Map(errors.map((error) => [error?.message, error])).values(),
    ]

    if (uniqueErrors?.length == 1) {
      return uniqueErrors[0]?.message
    }

    return (
      <ul className={fieldErrorListClass}>
        {uniqueErrors.map(
          (error, index) =>
            error?.message && <li key={index}>{error.message}</li>
        )}
      </ul>
    )
  }, [children, errors])

  if (!content) {
    return null
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn(fieldErrorClass, className)}
      {...props}
    >
      {content}
    </div>
  )
}

export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
}
