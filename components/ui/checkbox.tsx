"use client"

import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

const controlLayout = "group/checkbox relative inline-flex size-5 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[6px] outline-hidden h-no-highlight"
const controlMotion = "transition-[background-color,box-shadow] duration-200 ease-out motion-reduce:transition-none"
const controlFill = [
  "before:pointer-events-none before:absolute before:inset-0 before:z-0 before:origin-center before:scale-70 before:rounded-[6px] before:bg-h-accent before:opacity-0 before:content-['']",
  "before:[transition:scale_100ms_linear,opacity_200ms_linear,background-color_200ms_cubic-bezier(0,0,0.2,1)] motion-reduce:before:[transition:none]",
].join(" ")
const controlStates = [
  // The shared focus ring reads the background through its legacy token name.
  "[--background:var(--color-background)] focus-visible:h-focus-ring data-[focus-visible=true]:h-focus-ring",
  "data-[variant=primary]:hover:before:bg-h-accent-hover data-[variant=primary]:group-hover/checkbox-content:before:bg-h-accent-hover data-[variant=primary]:data-[hovered=true]:before:bg-h-accent-hover",
  "data-[state=checked]:text-(color:--h-check-fg) data-[state=checked]:before:scale-100 data-[state=checked]:before:opacity-100",
  "data-[state=indeterminate]:bg-h-accent data-[state=indeterminate]:text-(color:--h-check-fg)",
  "data-[state=indeterminate]:active:bg-h-accent-hover data-[state=indeterminate]:group-active/checkbox-content:bg-h-accent-hover data-[state=indeterminate]:data-[pressed=true]:bg-h-accent-hover",
].join(" ")
const controlInvalid = [
  "data-[state=unchecked]:aria-invalid:h-invalid-field-ring",
  "aria-invalid:data-[state=checked]:bg-h-danger aria-invalid:data-[state=checked]:text-h-danger-foreground",
  "aria-invalid:data-[state=checked]:before:bg-h-danger data-[variant=primary]:aria-invalid:data-[state=checked]:hover:before:bg-h-danger data-[variant=primary]:aria-invalid:data-[state=checked]:group-hover/checkbox-content:before:bg-h-danger data-[variant=primary]:aria-invalid:data-[state=checked]:data-[hovered=true]:before:bg-h-danger",
  "aria-invalid:data-[state=indeterminate]:bg-h-danger aria-invalid:data-[state=indeterminate]:text-h-danger-foreground",
  "aria-invalid:data-[state=indeterminate]:active:bg-h-danger aria-invalid:data-[state=indeterminate]:group-active/checkbox-content:bg-h-danger aria-invalid:data-[state=indeterminate]:data-[pressed=true]:bg-h-danger",
].join(" ")
const controlPrimary = [
  "bg-h-field",
  "data-[state=unchecked]:not-focus-visible:not-data-[focus-visible=true]:shadow-(--h-control-outline)",
  "data-[state=unchecked]:not-focus-visible:not-data-[focus-visible=true]:hover:shadow-(--h-control-outline-hover) data-[state=unchecked]:not-focus-visible:not-data-[focus-visible=true]:group-hover/checkbox-content:shadow-(--h-control-outline-hover) data-[state=unchecked]:not-focus-visible:not-data-[focus-visible=true]:data-[hovered=true]:shadow-(--h-control-outline-hover)",
].join(" ")
const controlSecondary = "bg-h-default"

const checkboxControlVariants = cva(
  [controlLayout, controlMotion, controlFill, controlStates, controlInvalid].join(" "),
  {
    variants: { variant: { primary: controlPrimary, secondary: controlSecondary } },
    defaultVariants: { variant: "primary" },
  }
)
const controlStandalone = "disabled:h-status-disabled aria-disabled:h-status-disabled data-[disabled=true]:h-status-disabled"

const indicatorClass = "relative z-10 flex size-3 items-center justify-center"
const checkmarkClass = [
  "size-2.5 transform-gpu text-(color:--h-check-fg) [stroke-dashoffset:66] transition-[stroke-dashoffset] duration-200 ease-in-out motion-reduce:transition-none",
  "group-data-[state=checked]/checkbox:[stroke-dashoffset:44] group-data-[state=checked]/checkbox:[transition:stroke-dashoffset_150ms_linear_15ms] group-data-[state=checked]/checkbox:motion-reduce:[transition:none]",
  "group-data-[state=indeterminate]/checkbox:hidden",
  "group-aria-invalid/checkbox:group-data-[state=checked]/checkbox:text-h-danger-foreground",
].join(" ")
const dashClass = "absolute hidden size-3 group-data-[state=indeterminate]/checkbox:block"

const fieldClass = "flex flex-col items-start gap-1 h-no-highlight data-[disabled=true]:h-status-disabled"
const contentClass = "group/checkbox-content relative inline-flex cursor-pointer items-center gap-3 text-sm leading-5 font-medium text-h-foreground select-none h-no-highlight"
const descriptionClass = "w-full min-w-0 cursor-default ps-8 text-xs text-wrap wrap-break-word text-h-muted select-none"

type CheckboxGroupContextValue = {
  value: string[]
  toggle: (v: string, next: boolean) => void
  disabled?: boolean
  invalid?: boolean
  variant?: "primary" | "secondary"
}
const CheckboxGroupContext = React.createContext<CheckboxGroupContextValue | null>(null)

type CheckboxProps = React.ComponentProps<typeof CheckboxPrimitive.Root> & {
  /** Primary uses the field background and secondary uses the neutral surface fill. */
  variant?: "primary" | "secondary"
  /** Visible label rendered next to the control. */
  label?: React.ReactNode
  /** Help text rendered below the label row. */
  description?: React.ReactNode
  /** Shows the error styling (same as aria-invalid). */
  isInvalid?: boolean
  /** Class for the field wrapper (only used with label/description). */
  wrapperClassName?: string
}

function Checkbox({
  className,
  variant,
  label,
  description,
  isInvalid,
  wrapperClassName,
  value,
  checked,
  onCheckedChange,
  disabled,
  ...props
}: CheckboxProps) {
  const group = React.useContext(CheckboxGroupContext)
  const hasField = label != null || description != null
  const v = variant ?? group?.variant ?? "primary"
  const invalid = isInvalid ?? (props["aria-invalid"] as boolean | "true" | undefined) ?? group?.invalid

  const groupProps =
    group && typeof value === "string"
      ? {
          checked: group.value.includes(value),
          onCheckedChange: (c: boolean | "indeterminate") => group.toggle(value, c === true),
        }
      : { checked, onCheckedChange }

  const control = (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      data-variant={v}
      value={value}
      disabled={disabled ?? group?.disabled}
      aria-invalid={invalid ? true : undefined}
      {...props}
      {...groupProps}
      className={cn(
        checkboxControlVariants({ variant: v }),
        "peer",
        !hasField && controlStandalone,
        className
      )}
    >
      <CheckboxPrimitive.Indicator
        forceMount
        data-slot="checkbox-indicator"
        className={indicatorClass}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 17 18"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={22}
          data-slot="checkbox-default-indicator--checkmark"
          className={checkmarkClass}
        >
          <polyline points="1 9 7 14 15 4" />
        </svg>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          data-slot="checkbox-default-indicator--indeterminate"
          className={dashClass}
        >
          <line x1="21" x2="3" y1="12" y2="12" />
        </svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )

  if (!hasField) return control

  const isDisabled = disabled ?? group?.disabled
  return (
    <div
      data-slot="checkbox-field"
      data-disabled={isDisabled ? "true" : undefined}
      className={cn(fieldClass, wrapperClassName)}
    >
      <label
        data-slot="checkbox-content"
        className={contentClass}
      >
        {control}
        {label != null && <span data-slot="label" className="select-none">{label}</span>}
      </label>
      {description != null && (
        <p
          data-slot="description"
          className={descriptionClass}
        >
          {description}
        </p>
      )}
    </div>
  )
}

type CheckboxGroupProps = Omit<React.ComponentProps<"div">, "defaultValue" | "onChange"> & {
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  disabled?: boolean
  isInvalid?: boolean
  variant?: "primary" | "secondary"
  /** Group label (the reference Label above the items). */
  label?: React.ReactNode
  description?: React.ReactNode
  errorMessage?: React.ReactNode
}

/** the reference CheckboxGroup: flex-col, each checkbox gets mt-4. Pass `value` on each Checkbox. */
function CheckboxGroup({
  className,
  value,
  defaultValue,
  onValueChange,
  disabled,
  isInvalid,
  variant,
  label,
  description,
  errorMessage,
  children,
  ...props
}: CheckboxGroupProps) {
  const [internal, setInternal] = React.useState<string[]>(defaultValue ?? [])
  const current = value ?? internal
  const toggle = React.useCallback(
    (v: string, next: boolean) => {
      const nextValue = next ? [...current.filter((x) => x !== v), v] : current.filter((x) => x !== v)
      if (value === undefined) setInternal(nextValue)
      onValueChange?.(nextValue)
    },
    [current, value, onValueChange]
  )
  const ctx = React.useMemo(
    () => ({ value: current, toggle, disabled, invalid: isInvalid, variant }),
    [current, toggle, disabled, isInvalid, variant]
  )
  const labelId = React.useId()
  return (
    <CheckboxGroupContext.Provider value={ctx}>
      <div
        role="group"
        data-slot="checkbox-group"
        aria-labelledby={label != null ? labelId : undefined}
        className={cn("flex flex-col [&>[data-slot=checkbox]]:mt-4 [&>[data-slot=checkbox-field]]:mt-4", className)}
        {...props}
      >
        {label != null && (
          <span id={labelId} data-slot="label" className="text-sm font-medium text-h-foreground select-none">
            {label}
          </span>
        )}
        {description != null && <p data-slot="description" className="text-xs text-wrap text-h-muted">{description}</p>}
        {children}
        {isInvalid && errorMessage != null && (
          <p data-slot="field-error" className="mt-1 text-xs text-h-danger-text">{errorMessage}</p>
        )}
      </div>
    </CheckboxGroupContext.Provider>
  )
}

export { Checkbox, CheckboxGroup }
export type { CheckboxProps, CheckboxGroupProps }
