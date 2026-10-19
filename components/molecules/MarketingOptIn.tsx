"use client";

import { marketingOptInLabel } from "@/lib/marketingOptIn";

export default function MarketingOptIn({
  checked,
  onChange,
  organizationName,
  optInMessage,
  disabled = false,
  id = "marketing-email-opt-in",
  className = "",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  organizationName?: string | null;
  optInMessage?: string | null;
  disabled?: boolean;
  id?: string;
  className?: string;
}) {
  const label = marketingOptInLabel(organizationName, optInMessage);

  return (
    <label htmlFor={id} className={className}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="text-[14px] text-[#4a5567]">{label}</span>
    </label>
  );
}
