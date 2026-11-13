"use client";

import Link from "next/link";

export default function SmsOptIn({
  checked,
  onChange,
  disabled = false,
  id = "sms-opt-in",
  className = "",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}) {
  return (
    <label htmlFor={id} className={`flex items-start gap-2.5 text-left ${className}`}>
      <input
        id={id}
        type="checkbox"
        className="mt-1 shrink-0"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="text-[12px] font-normal leading-snug text-[#6e7180]">
        I agree to receive recurring automated text messages from Blocktickets
        at the mobile number I provide, including account notices, ticket
        updates, and event offers. Consent is not a condition of creating an
        account or buying tickets. Message frequency varies. Message and data
        rates may apply. Reply STOP to cancel and HELP for help. See our{" "}
        <Link
          href="/privacy-policy/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline"
        >
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link
          href="/terms-conditions/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline"
        >
          Terms &amp; Conditions
        </Link>
        .
      </span>
    </label>
  );
}
