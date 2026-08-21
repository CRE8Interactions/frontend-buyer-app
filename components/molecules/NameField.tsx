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
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: NameFieldError;
  autoComplete?: string;
  variant?: FieldVariant;
  placeholder?: string;
  required?: boolean;
}) {
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
        value={value}
        required={required}
        pattern={namePatternMatch}
        title={FIELD_COPY.namePattern}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        placeholder={placeholder}
        onChange={(e) => {
          const next = e.target.value;
          if (nameAllows(next)) onChange(next);
        }}
        onBlur={onBlur}
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
