"use client";

import {
  FIELD_COPY,
  fieldClass,
  fieldErrorTextClass,
  nameAllows,
  namePatternMatch,
  type FieldVariant,
  type NameFieldError,
} from "@/lib/fieldValidation";

export default function NameField({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  error = null,
  autoComplete,
  variant = "light",
  placeholder,
  required = true,
}: {
  id: string;
  name?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  error?: NameFieldError;
  autoComplete?: string;
  variant?: FieldVariant;
  placeholder?: string;
  required?: boolean;
}) {
  const sync = (next: string) => {
    if (nameAllows(next)) onChange(next);
  };
  return (
    <div>
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
      <input
        id={id}
        name={name}
        value={value}
        required={required}
        pattern={namePatternMatch}
        title={FIELD_COPY.namePattern}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        placeholder={placeholder}
        onChange={(e) => sync(e.target.value)}
        onInput={(e) => sync(e.currentTarget.value)}
        onBlur={(e) => onBlur?.(e.currentTarget.value)}
        className={`mt-2 ${fieldClass(variant, Boolean(error))}`}
      />
      {error === "required" ? (
        <p className={fieldErrorTextClass(variant)}>{FIELD_COPY.nameRequired}</p>
      ) : error === "pattern" ? (
        <p className={fieldErrorTextClass(variant)}>{FIELD_COPY.namePattern}</p>
      ) : null}
    </div>
  );
}
