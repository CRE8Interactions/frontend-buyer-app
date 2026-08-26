"use client";

import { useEffect, useState } from "react";
import PhoneInput, { type Country } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import {
  FIELD_COPY,
  PHONE_ERROR,
  phoneNumberError,
  type FieldVariant,
  type PhoneErrorType,
} from "@/lib/fieldValidation";

export { PHONE_ERROR, phoneNumberError };
export type { PhoneErrorType };

const FALLBACK_COUNTRY: Country = "US";

function isCountry(value: unknown): value is Country {
  return typeof value === "string" && value.length === 2;
}

export default function PhoneNumberInput({
  id,
  name = "phoneNumber",
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
  variant = "light",
}: {
  id?: string;
  name?: string;
  value?: string;
  onChange: (value?: string) => void;
  onBlur?: (value?: string) => void;
  error?: PhoneErrorType | null;
  disabled?: boolean;
  variant?: FieldVariant;
}) {
  const [defaultCountry, setDefaultCountry] =
    useState<Country>(FALLBACK_COUNTRY);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_IP_DATA_API_KEY;
    if (!key) return;
    const controller = new AbortController();
    fetch(`https://api.ipdata.co?api-key=${encodeURIComponent(key)}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { country_code?: string } | null) => {
        if (isCountry(data?.country_code)) {
          setDefaultCountry(data.country_code);
        }
      })
      .catch(() => {
        // Keep the US fallback — a geo lookup must never block signup.
      });
    return () => controller.abort();
  }, []);

  const invalid = Boolean(error);
  const dark = variant === "dark";

  return (
    <div>
      <div
        className={`phone-field mt-2 rounded-[14px] border px-3 ${
          dark ? "bg-[#051B35]" : "bg-[#f7f8fc]"
        } ${
          invalid
            ? "border-[#c2394a] focus-within:border-[#c2394a]"
            : dark
              ? "border-white/15 focus-within:border-[#A6E773]"
              : "border-[rgba(5,27,53,0.12)] focus-within:border-[#051b35]"
        }`}
      >
        <PhoneInput
          id={id}
          international
          defaultCountry={defaultCountry}
          value={value}
          onChange={(next) => onChange(next || undefined)}
          onBlur={() => onBlur?.(value)}
          disabled={disabled}
          required
          autoComplete="tel"
          aria-invalid={invalid}
          numberInputProps={{
            name,
          }}
          className={`phone-input flex h-[52px] items-center text-[16px] ${
            dark
              ? "phone-input-dark text-white"
              : "phone-input-light text-[#051b35]"
          }`}
        />
      </div>
      {error ? (
        <p
          className={
            dark
              ? "mt-2 text-[13px] text-[#ff7a72]"
              : "mt-2 text-[13px] text-[#c2394a]"
          }
        >
          {PHONE_ERROR[error] || FIELD_COPY.phoneInvalid}
        </p>
      ) : null}
    </div>
  );
}
