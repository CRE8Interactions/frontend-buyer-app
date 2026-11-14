"use client";

import {
  PAYOUT_BUSINESS_TYPES,
  isPayoutBusinessType,
  type PayoutBusinessType,
} from "@/lib/payoutBusinessType";

export default function PayoutBusinessTypeField({
  id = "payout-business-type",
  value,
  onChange,
  currentBusinessType,
  disabled = false,
}: {
  id?: string;
  value: PayoutBusinessType;
  onChange: (value: PayoutBusinessType) => void;
  currentBusinessType?: string | null;
  disabled?: boolean;
}) {
  const replacing =
    isPayoutBusinessType(currentBusinessType) && currentBusinessType !== value;

  return (
    <div className="flex w-full flex-col gap-2 text-left">
      <label htmlFor={id} className="text-[15px] font-normal text-[#6e7180]">
        Account type
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(event) => {
            const next = event.target.value;
            if (isPayoutBusinessType(next)) onChange(next);
          }}
          className="h-[46px] w-full appearance-none rounded-[10px] border-0 bg-white pl-[15px] pr-10 text-[15px] text-[#051B35] shadow-[0_0_0_2px_#E6E8EC] outline-none focus:shadow-[0_0_0_2px_var(--bt-field-focus,var(--acc,var(--accent)))]"
        >
          {PAYOUT_BUSINESS_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
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
      <p className="m-0 text-[13px] leading-normal text-[#6e7180]">
        Company, nonprofit, and government payouts go to that organization&apos;s
        bank account. Stripe still asks one owner or executive to verify their
        identity.
      </p>
      {replacing ? (
        <p
          role="status"
          className="m-0 flex items-start gap-2 rounded-[12px] border border-[rgba(192,122,18,0.28)] bg-[#fffaf2] px-3 py-2.5 text-[13px] leading-normal text-[#8a5a10]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#c07a12" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-0.5 h-4 w-4 shrink-0">
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.3 4.8 2.8 18a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.8a2 2 0 0 0-3.4 0z" />
          </svg>
          <span>Changing this replaces the unfinished Stripe account and starts setup again.</span>
        </p>
      ) : null}
    </div>
  );
}
