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
  name = "email",
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
  name?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  invalid?: boolean;
  networkError?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  variant?: FieldVariant;
  className?: string;
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id" | "name" | "value" | "onChange" | "onBlur" | "onInput"
>) {
  const showInvalid = invalid;
  const showNetwork = !invalid && networkError;
  const sync = (next: string) => onChange(next);
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
        name={name}
        type="email"
        autoComplete="email"
        value={value}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={showInvalid || showNetwork}
        className={`${label ? "mt-2" : ""} ${fieldClass(variant, showInvalid || showNetwork)} ${
          disabled || readOnly ? "cursor-default disabled:cursor-default opacity-70" : ""
        }`}
        {...rest}
        onChange={(e) => sync(e.target.value)}
        onInput={(e) => sync(e.currentTarget.value)}
        onBlur={(e) => onBlur?.(e.currentTarget.value)}
      />
      {showInvalid ? (
        <p className={fieldErrorTextClass(variant)}>{FIELD_COPY.invalidEmail}</p>
      ) : showNetwork ? (
        <p className={fieldErrorTextClass(variant)}>{FIELD_COPY.network}</p>
      ) : null}
    </div>
  );
}
