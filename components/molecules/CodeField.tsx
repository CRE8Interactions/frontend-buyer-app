"use client";

import { useRef } from "react";
import {
  FIELD_COPY,
  fieldClass,
  fieldErrorTextClass,
  normalizeOtp,
  type FieldVariant,
} from "@/lib/fieldValidation";

export type CodeError = "code" | "network" | null;

export default function CodeField({
  id,
  value,
  onChange,
  onComplete,
  error = null,
  disabled = false,
  variant = "light",
  layout = "boxes",
  label,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  error?: CodeError;
  disabled?: boolean;
  variant?: FieldVariant;
  layout?: "boxes" | "input";
  label?: string;
}) {
  const hiddenRef = useRef<HTMLInputElement | null>(null);
  const setValue = (raw: string) => {
    const next = normalizeOtp(raw);
    onChange(next);
    if (next.length === 6) onComplete?.(next);
  };

  if (layout === "input") {
    const invalid = Boolean(error);
    return (
      <div>
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
          value={value}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          disabled={disabled}
          aria-invalid={invalid}
          aria-label={label || "Six-digit code"}
          onChange={(e) => setValue(e.target.value)}
          placeholder="6 digit code"
          className={`${label ? "mt-2.5" : ""} ${fieldClass(variant, invalid)}`}
        />
        {error === "code" ? (
          <p className={fieldErrorTextClass(variant)}>
            {FIELD_COPY.codeIncorrect}
          </p>
        ) : error === "network" ? (
          <p className={fieldErrorTextClass(variant)}>{FIELD_COPY.network}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <div
        className="relative cursor-text"
        onClick={() => hiddenRef.current?.focus()}
      >
        <div className="grid grid-cols-6 gap-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`flex h-[54px] items-center justify-center rounded-[14px] border text-[22px] font-semibold tabular-nums md:h-[60px] ${
                value.length === i
                  ? "border-[#051b35] bg-white"
                  : "border-[rgba(5,27,53,0.12)] bg-[#f7f8fc]"
              } ${error ? "border-[#c2394a]" : ""}`}
            >
              {value[i] || ""}
            </div>
          ))}
        </div>
        <input
          id={id}
          ref={hiddenRef}
          value={value}
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label="Six-digit code"
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-text border-none bg-transparent text-[16px] opacity-0 outline-none"
        />
      </div>
      {error === "code" ? (
        <p className="mt-2 text-center text-[13px] text-[#c2394a]">
          {FIELD_COPY.codeIncorrect}
        </p>
      ) : error === "network" ? (
        <p className="mt-2 text-center text-[13px] text-[#c2394a]">
          {FIELD_COPY.network}
        </p>
      ) : null}
    </div>
  );
}
