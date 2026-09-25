"use client";

import { useState } from "react";
import BrandedActionButton from "@/components/atoms/BrandedActionButton";
import RedemptionCodeField from "@/components/molecules/RedemptionCodeField";
import {
  formString,
  normalizeRedemptionCode,
  redemptionCodeBlurFieldError,
  redemptionCodeSubmitError,
  type RedemptionCodeFieldError,
} from "@/lib/fieldValidation";

/** Rejection copy to show, or null once the code is applied. */
export type PromoRedeemResult = { rejectedMessage: string } | null;

/**
 * Keeps the typed code and its error local. Checkout re-renders the Stripe
 * Payment Element and the whole order summary, so holding these on the page
 * made each keystroke rebuild all of it.
 */
export default function PromoCodeForm({
  onRedeem,
}: {
  onRedeem: (code: string) => Promise<PromoRedeemResult>;
}) {
  const [code, setCode] = useState("");
  const [fieldError, setFieldError] = useState<RedemptionCodeFieldError>(null);
  const [rejectedMessage, setRejectedMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (typed: string) => {
    if (submitting) return;
    const submitError = redemptionCodeSubmitError(typed);
    if (submitError) {
      setFieldError(submitError);
      setRejectedMessage("");
      return;
    }
    setSubmitting(true);
    setFieldError(null);
    setRejectedMessage("");
    const result = await onRedeem(typed);
    setSubmitting(false);
    if (result) {
      setFieldError("rejected");
      setRejectedMessage(result.rejectedMessage);
    }
  };

  return (
    <form
      noValidate
      className="flex items-start gap-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(formString(new FormData(e.currentTarget), "promo") || code);
      }}
    >
      <RedemptionCodeField
        id="promo"
        name="promo"
        label="Promo code"
        hideLabel
        value={code}
        placeholder="Enter promo code"
        error={fieldError}
        rejectedMessage={rejectedMessage}
        className="min-w-0 flex-1"
        inputClassName="!h-12 !rounded-[10px] !bg-white !px-[18px] !text-[15px]"
        onChange={(value) => {
          setCode(value);
          setFieldError(null);
          setRejectedMessage("");
        }}
        onBlur={(value) =>
          setFieldError((current) =>
            redemptionCodeBlurFieldError(current, value),
          )
        }
      />
      <BrandedActionButton
        type="submit"
        tone="secondary"
        loading={submitting}
        loadingLabel="Applying…"
        disabled={!normalizeRedemptionCode(code)}
        className="!rounded-[10px] px-6 !h-12"
      >
        Apply
      </BrandedActionButton>
    </form>
  );
}
