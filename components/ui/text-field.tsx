"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Description } from "./description"
import { FieldError } from "./field-error"
import { Input } from "./input"
import { Label } from "./label"
import { Textarea } from "./textarea"

/* From the reference textfield.css: the whole labelled field in one component. A label above, our Input (or Textarea
   with `multiline`) below it, then a description or an error 4px under. While invalid the description is hidden and the
   error takes its place. `fullWidth` stretches the field and its control. The label, description and error are wired to the
   control for assistive tech (label for, aria-describedby, aria-invalid). All Input props and variants (primary, secondary,
   tertiary, underlined), sizes, prefix and suffix work as they do on Input. */
type TextFieldBase = {
  label?: React.ReactNode
  description?: React.ReactNode
  errorMessage?: React.ReactNode
  isInvalid?: boolean
  isRequired?: boolean
  isDisabled?: boolean
  fullWidth?: boolean
  containerClassName?: string
}
type TextFieldProps =
  | (TextFieldBase & { multiline?: false } & Omit<React.ComponentProps<typeof Input>, "size"> & { size?: React.ComponentProps<typeof Input>["size"] })
  | (TextFieldBase & { multiline: true } & React.ComponentProps<typeof Textarea>)

function TextField(props: TextFieldProps) {
  const { label, description, errorMessage, isInvalid, isRequired, isDisabled, fullWidth, containerClassName, multiline, id, className, ...rest } = props as TextFieldBase & {
    multiline?: boolean
    id?: string
    className?: string
  } & Record<string, unknown>
  const auto = React.useId()
  const inputId = id ?? auto
  const descId = `${inputId}-description`
  const errId = `${inputId}-error`
  const showError = isInvalid && errorMessage
  const describedBy = [showError ? errId : null, !isInvalid && description ? descId : null].filter(Boolean).join(" ") || undefined
  const common = {
    id: inputId,
    disabled: isDisabled,
    required: isRequired,
    isInvalid,
    "aria-describedby": describedBy,
    className,
  }
  return (
    <div data-slot="text-field" data-invalid={isInvalid ? "true" : undefined} className={cn("flex flex-col gap-1", fullWidth && "w-full [&_[data-slot=input]]:w-full [&_[data-slot=textarea]]:w-full", containerClassName)}>
      {label ? <Label htmlFor={inputId} isRequired={isRequired} isDisabled={isDisabled} isInvalid={isInvalid} className="w-fit">{label}</Label> : null}
      {multiline ? <Textarea {...(rest as object)} {...common} /> : <Input {...(rest as object)} {...common} />}
      {showError ? <FieldError id={errId}>{errorMessage}</FieldError> : !isInvalid && description ? <Description id={descId}>{description}</Description> : null}
    </div>
  )
}

export { TextField }
export type { TextFieldProps }
