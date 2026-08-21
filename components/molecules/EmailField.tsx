"use client";

import type { InputHTMLAttributes } from "react";
import {
  FIELD_COPY,
  fieldClass,
  fieldErrorTextClass,
  type FieldVariant,
} from "@/lib/fieldValidation";

export default function EmailField({
  id,
  label = "Email address",
  value,
  onChange,
  onBlur,
  invalid = false,
  networkError = false,
  disabled = false,
  readOnly = false,
  variant = "light",
  className = "",
  ...rest
}: {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  networkError?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  variant?: FieldVariant;
  className?: string;
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id" | "value" | "onChange" | "onBlur"
>) {
  const showInvalid = invalid;
  const showNetwork = !invalid && networkError;
  return (
    <div className={className}>
      {label ? (
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
        type="email"
        autoComplete="email"
        value={value}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={showInvalid || showNetwork}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={`${label ? "mt-2" : ""} ${fieldClass(variant, showInvalid || showNetwork)} ${
          disabled || readOnly ? "cursor-not-allowed opacity-70" : ""
        }`}
        {...rest}
      />
      {showInvalid ? (
        <p className={fieldErrorTextClass(variant)}>{FIELD_COPY.invalidEmail}</p>
      ) : showNetwork ? (
        <p className={fieldErrorTextClass(variant)}>{FIELD_COPY.network}</p>
      ) : null}
    </div>
  );
}
