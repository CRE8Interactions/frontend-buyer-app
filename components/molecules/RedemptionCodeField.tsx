"use client";

import type { InputHTMLAttributes } from "react";
import useAutoFocus from "@/hooks/useAutoFocus";
import {
  FIELD_COPY,
  fieldClass,
  fieldErrorTextClass,
  requiredCopy,
  type FieldVariant,
  type RedemptionCodeFieldError,
} from "@/lib/fieldValidation";

export default function RedemptionCodeField({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  error = null,
  rejectedMessage,
  disabled = false,
  variant = "light",
  placeholder,
  autoFocus = false,
  hideLabel = false,
  className = "",
  inputClassName = "",
  ...rest
}: {
  id?: string;
  name?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  error?: RedemptionCodeFieldError;
  rejectedMessage?: string;
  disabled?: boolean;
  variant?: FieldVariant;
  placeholder?: string;
  hideLabel?: boolean;
  autoFocus?: boolean;
  hideLabel?: boolean;
  className?: string;
  inputClassName?: string;
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id" | "name" | "value" | "onChange" | "onBlur" | "onInput"
>) {
  const focusRef = useAutoFocus<HTMLInputElement>(autoFocus);
  const invalid = Boolean(error);
  const sync = (next: string) => onChange(next);

  return (
    <div className={className}>
      {label && !hideLabel ? (
        <label
          htmlFor={id}
          className={
            variant === "dark"
              ? "block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#9DA2B3]"
              : "text-[12px] font-semibold text-[#4a5567]"
          }
        >
          {label}
        </label>
      ) : null}
      <input
        id={id}
        name={name}
        type="text"
        autoComplete="off"
        ref={focusRef}
        value={value}
        disabled={disabled}
        aria-invalid={invalid}
        placeholder={placeholder}
        className={`${label ? "mt-2" : ""} ${fieldClass(variant, invalid)} ${inputClassName}`}
        {...rest}
        onChange={(e) => sync(e.target.value)}
        onInput={(e) => sync(e.currentTarget.value)}
        onBlur={(e) => onBlur?.(e.currentTarget.value)}
      />
      {error === "required" ? (
        <p className={fieldErrorTextClass(variant)}>
          {label === "Promo code"
            ? FIELD_COPY.promoCodeRequired
            : requiredCopy(label || "Access code")}
        </p>
      ) : error === "rejected" ? (
        <p className={fieldErrorTextClass(variant)}>
          {rejectedMessage || FIELD_COPY.accessCodeIncorrect}
        </p>
      ) : error === "network" ? (
        <p className={fieldErrorTextClass(variant)}>{FIELD_COPY.network}</p>
      ) : null}
    </div>
  );
}
