"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/helpers";
import { computeRoundUpDonation } from "@/lib/fundraisingCheckout";
import type { FundraisingSelection } from "@/lib/fundraisingCheckout";

type DonationCampaign = {
  title?: string;
  donationTitle?: string;
  donationDescription?: string;
  checkoutUpsell?: boolean;
  roundUpEnabled?: boolean;
  beneficiaryName?: string;
  taxId?: string;
  feeCoverageMessage?: string;
  matchRatio?: number;
  matchSponsorName?: string;
  matchCap?: number;
  suggestedAmounts?: unknown[];
  allowCustomAmount?: boolean;
  allowAnonymousDonation?: boolean;
  allowDonorMessage?: boolean;
  participants?: Array<{ uuid?: string; name?: string }>;
  donationRequirements?: {
    minimumAmount?: number;
    mandatory?: boolean;
    ruleName?: string;
    satisfiedByCarryForward?: boolean;
    suggestedAmounts?: unknown[];
    allowCustomAmount?: boolean;
  };
};

const parseAmount = (value: unknown) => {
  const amount = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

function DonationHeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-4 w-4">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

export default function CheckoutFundraisingDonation({
  campaign,
  selection,
  onChange,
  disabled = false,
  orderSubtotal = 0,
}: {
  campaign?: DonationCampaign | Record<string, unknown> | null;
  selection: FundraisingSelection;
  onChange: (next: FundraisingSelection) => void;
  disabled?: boolean;
  orderSubtotal?: number;
}) {
  const source = (campaign || null) as DonationCampaign | null;
  const [customAmount, setCustomAmount] = useState("");
  const presetAmounts = useMemo(() => {
    const ruleAmounts = source?.donationRequirements?.suggestedAmounts;
    if (Array.isArray(ruleAmounts) && ruleAmounts.length > 0) return ruleAmounts;
    return Array.isArray(source?.suggestedAmounts) ? source.suggestedAmounts : [];
  }, [source]);

  const requirements = source?.donationRequirements || {};
  const minimumAmount = Number(requirements.minimumAmount || 0);
  const isMandatory = Boolean(requirements.mandatory);
  const isCheckoutUpsell = Boolean(source?.checkoutUpsell);
  const roundUpAmount =
    isCheckoutUpsell &&
    source?.roundUpEnabled !== false &&
    Number(orderSubtotal) > 0
      ? computeRoundUpDonation(orderSubtotal)
      : 0;

  useEffect(() => {
    if (!source) return;
    const selected = Number(selection?.donationAmount || 0);
    const presetMatch = presetAmounts.some((amount) => parseAmount(amount) === selected);
    if (!presetMatch && selected > 0) setCustomAmount(String(selected));
  }, [source, presetAmounts, selection?.donationAmount]);

  if (!source) return null;

  const selectedAmount = Number(selection?.donationAmount || 0);
  const matchRatio = Number(source.matchRatio || 0);
  const matchSponsor = String(source.matchSponsorName || "").trim();
  const showMatchMessage =
    isCheckoutUpsell && Boolean(matchSponsor) && matchRatio > 0 && selectedAmount > 0;
  const participants = Array.isArray(source.participants) ? source.participants : [];
  const title = source.donationTitle || source.title || "Support the campaign";

  const emitSelection = (updates: Partial<FundraisingSelection>) => {
    onChange({
      donationAmount: selectedAmount,
      anonymous: Boolean(selection?.anonymous),
      donorMessage: selection?.donorMessage || "",
      participantUuid: selection?.participantUuid || "",
      ...updates,
    });
  };

  const applyCustomAmount = () => {
    const nextAmount = parseAmount(customAmount);
    if (!nextAmount) return;
    if (isMandatory && minimumAmount > 0 && nextAmount < minimumAmount) return;
    emitSelection({ donationAmount: nextAmount });
  };

  return (
    <section aria-labelledby="checkout-donation-heading" className="flex flex-col gap-3">
      {isMandatory ? (
        <p className="text-[13px] text-[#8a5300]">
          <strong>{requirements.ruleName || "Donation required"}:</strong> A minimum
          donation of {formatCurrency(minimumAmount)} is required for tickets in the
          selected sections.
          {requirements.satisfiedByCarryForward
            ? " A prior donation this year already satisfies this requirement."
            : ""}
        </p>
      ) : null}
      <div className="flex items-start gap-2">
        <span className="mt-1 text-[#c0374a]" aria-hidden>
          <DonationHeartIcon />
        </span>
        <div>
          <h2 id="checkout-donation-heading" className="text-[14px] font-semibold">
            {title}
          </h2>
          {source.donationDescription ? (
            <p className="mt-1 text-[13px] text-[#6e7180]">{source.donationDescription}</p>
          ) : null}
        </div>
      </div>
      {isCheckoutUpsell && source.beneficiaryName ? (
        <p className="text-[13px] text-[#4a5567]">
          <strong>Beneficiary:</strong> {source.beneficiaryName}
          {source.taxId ? ` · EIN ${source.taxId}` : ""}
          {source.feeCoverageMessage ? ` ${source.feeCoverageMessage}` : ""}
        </p>
      ) : null}
      {!isCheckoutUpsell && source.feeCoverageMessage ? (
        <p className="text-[13px] text-[#6e7180]">{source.feeCoverageMessage}</p>
      ) : null}
      {participants.length > 0 ? (
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          Support
          <select
            className="h-11 rounded-full border border-[rgba(5,27,53,0.16)] bg-white px-4 text-[14px] font-normal"
            value={selection?.participantUuid || ""}
            disabled={disabled}
            onChange={(event) => emitSelection({ participantUuid: event.target.value })}
          >
            <option value="">General campaign fund</option>
            {participants.map((participant) => (
              <option key={participant.uuid} value={participant.uuid}>
                {participant.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <p className="text-[13px] font-semibold">
        {isMandatory ? "Select your donation" : "Optional gift amount"}
      </p>
      {roundUpAmount > 0 ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setCustomAmount("");
            emitSelection({ donationAmount: roundUpAmount });
          }}
          className="self-start rounded-full border border-[rgba(5,27,53,0.16)] bg-white px-4 py-2 text-[13px] font-semibold disabled:opacity-60"
        >
          Round up {formatCurrency(roundUpAmount)} to the nearest $5
        </button>
      ) : null}
      <div role="group" aria-label="Suggested donation amounts" className="flex flex-wrap gap-2">
        {presetAmounts.map((amount) => {
          const parsed = parseAmount(amount);
          const isSelected = selectedAmount > 0 && selectedAmount === parsed && !customAmount;
          return (
            <button
              key={String(amount)}
              type="button"
              aria-pressed={isSelected}
              disabled={disabled}
              onClick={() => {
                setCustomAmount("");
                emitSelection({ donationAmount: parsed });
              }}
              className="rounded-full border border-[rgba(5,27,53,0.16)] bg-white px-4 py-2 text-[13px] font-semibold disabled:opacity-60"
            >
              {String(amount)}
            </button>
          );
        })}
        {!isMandatory ? (
          <button
            type="button"
            aria-pressed={selectedAmount <= 0}
            disabled={disabled}
            onClick={() => {
              setCustomAmount("");
              emitSelection({ donationAmount: 0 });
            }}
            className="rounded-full border border-[rgba(5,27,53,0.16)] bg-white px-4 py-2 text-[13px] font-semibold disabled:opacity-60"
          >
            No thanks
          </button>
        ) : null}
      </div>
      {source.allowCustomAmount !== false && requirements.allowCustomAmount !== false ? (
        <div className="flex gap-2">
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            placeholder="Other amount"
            aria-label="Other amount"
            value={customAmount}
            disabled={disabled}
            onChange={(event) => setCustomAmount(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyCustomAmount();
              }
            }}
            className="h-11 min-w-0 flex-1 rounded-full border border-[rgba(5,27,53,0.16)] bg-white px-4 text-[14px]"
          />
          <button
            type="button"
            disabled={disabled || !parseAmount(customAmount)}
            onClick={applyCustomAmount}
            className="rounded-full bg-[#f1f3f8] px-4 text-[13px] font-semibold disabled:opacity-60"
          >
            Apply
          </button>
        </div>
      ) : null}
      {showMatchMessage ? (
        <p role="status" className="text-[13px] text-[#4a5567]">
          {matchSponsor} will match your gift
          {matchRatio === 1
            ? " dollar for dollar"
            : ` at ${Math.round(matchRatio * 100)}%`}
          {Number(source.matchCap) > 0
            ? `, up to ${formatCurrency(source.matchCap)}.`
            : "."}
        </p>
      ) : null}
      {selectedAmount > 0 ? (
        <div className="flex flex-wrap items-baseline gap-3">
          <p className="text-[13px] text-[#6e7180]">Added to your order</p>
          <p className="text-[14px] font-semibold">{formatCurrency(selectedAmount)}</p>
          {!isMandatory ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setCustomAmount("");
                emitSelection({ donationAmount: 0 });
              }}
              className="text-[13px] font-semibold underline disabled:opacity-60"
            >
              Remove
            </button>
          ) : null}
        </div>
      ) : null}
      {source.allowAnonymousDonation || source.allowDonorMessage ? (
        <div className="flex flex-col gap-3">
          {source.allowAnonymousDonation ? (
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={Boolean(selection?.anonymous)}
                disabled={disabled || selectedAmount <= 0}
                onChange={(event) => emitSelection({ anonymous: event.target.checked })}
              />
              Donate anonymously
            </label>
          ) : null}
          {source.allowDonorMessage ? (
            <label className="flex flex-col gap-1 text-[13px] font-semibold">
              Message (optional)
              <textarea
                rows={2}
                value={selection?.donorMessage || ""}
                disabled={disabled || selectedAmount <= 0}
                onChange={(event) => emitSelection({ donorMessage: event.target.value })}
                className="rounded-[12px] border border-[rgba(5,27,53,0.16)] px-3 py-2 text-[14px] font-normal"
              />
            </label>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
