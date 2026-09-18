"use client";

import {
  BILLING_COUNTRIES,
  countryUsesPostal,
  postalErrorMessage,
  postalFieldLabel,
  type BillingPostalError,
} from "@/lib/billingPostal";
import { fieldErrorTextClass, fieldShowsError } from "@/lib/fieldValidation";

const stripeLikeLabelClass = "text-[15px] font-normal text-[#6e7180]";

const stripeLikeFieldClass = (invalid: boolean) =>
  [
    "mt-2 h-[46px] w-full rounded-[10px] border-0 bg-white px-[15px] text-[15px] text-[#051B35] outline-none placeholder:text-[#6e7180]",
    invalid
      ? "shadow-[0_0_0_2px_#dc2626]"
      : "shadow-[0_0_0_2px_#E6E8EC] focus:shadow-[0_0_0_2px_var(--stripe-input-accent,#051B35)]",
  ].join(" ");

export default function BillingPostalFields({
  country,
  postal,
  error = null,
  disabled = false,
  onCountryChange,
  onPostalChange,
  onPostalBlur,
}: {
  country: string;
  postal: string;
  error?: BillingPostalError;
  disabled?: boolean;
  onCountryChange: (country: string) => void;
  onPostalChange: (postal: string) => void;
  onPostalBlur?: (postal: string) => void;
}) {
  const showPostal = countryUsesPostal(country);
  const label = postalFieldLabel(country);
  const showError = fieldShowsError(Boolean(error));
  const message = postalErrorMessage(country, error);
  const knownCountry = BILLING_COUNTRIES.some((row) => row.code === country);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label
          htmlFor="billing-country"
          className={stripeLikeLabelClass}
        >
          Country
        </label>
        <div className="relative mt-2">
          <select
            id="billing-country"
            name="billingCountry"
            value={country}
            disabled={disabled}
            autoComplete="country"
            aria-label="Billing country"
            onChange={(e) => onCountryChange(e.target.value)}
            className={`${stripeLikeFieldClass(false)} mt-0 appearance-none pr-10`}
            style={{ backgroundColor: "#ffffff" }}
          >
            {knownCountry ? null : (
              <option value={country}>{country}</option>
            )}
            {BILLING_COUNTRIES.map((row) => (
              <option key={row.code} value={row.code}>
                {row.name}
              </option>
            ))}
          </select>
          <svg
            viewBox="0 0 12 12"
            aria-hidden
            className="pointer-events-none absolute right-[15px] top-1/2 h-3 w-3 -translate-y-1/2"
          >
            <path
              d="M2.25 4.35 6 8.1l3.75-3.75"
              fill="none"
              stroke="#6e7180"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
      {showPostal ? (
        <div>
          <label
            htmlFor="billing-postal"
            className={stripeLikeLabelClass}
          >
            {label}
          </label>
          <input
            id="billing-postal"
            name="billingPostal"
            value={postal}
            disabled={disabled}
            autoComplete="postal-code"
            inputMode={country === "US" || country === "PR" ? "numeric" : "text"}
            placeholder={country === "CA" ? "A1A 1A1" : country === "US" ? "12345" : ""}
            aria-invalid={showError}
            aria-label={label}
            onChange={(e) => onPostalChange(e.target.value)}
            onInput={(e) => onPostalChange(e.currentTarget.value)}
            onBlur={(e) => onPostalBlur?.(e.currentTarget.value)}
            className={stripeLikeFieldClass(showError)}
            style={{ backgroundColor: "#ffffff" }}
          />
          {message ? (
            <p className={fieldErrorTextClass("light")}>{message}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
