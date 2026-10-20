"use client";

import { useState } from "react";
import BrandedActionButton from "@/components/atoms/BrandedActionButton";
import LockIcon from "@/components/atoms/LockIcon";
import Modal from "@/components/molecules/Modal";
import RedemptionCodeField from "@/components/molecules/RedemptionCodeField";
import {
  formString,
  redemptionCodeBlurFieldError,
  redemptionCodeSubmitError,
  type RedemptionCodeFieldError,
} from "@/lib/fieldValidation";

/**
 * Keeps the typed code, its error, and the in-flight flag local. Ticketing
 * renders the seat map from the same tree, so holding these on the page made
 * every keystroke rebuild every seat.
 */
export default function UnlockCodeDialog({
  zone,
  isGa,
  offerDescription,
  accent,
  accentSoft,
  buttonTextColor,
  onVerify,
  onClose,
}: {
  zone: string;
  /** GA offers unlock an offer; seated zones unlock seats. */
  isGa: boolean;
  offerDescription?: string;
  accent: string;
  accentSoft: string;
  buttonTextColor: string;
  /** Resolves to the error to show, or null once the zone is unlocked. */
  onVerify: (code: string) => Promise<RedemptionCodeFieldError>;
  onClose: () => void;
}) {
  const [code, setCode] = useState("");
  const [fieldError, setFieldError] = useState<RedemptionCodeFieldError>(null);
  const [verifying, setVerifying] = useState(false);
  const title = isGa ? `${zone} requires a code` : `${zone} is locked`;

  const submit = async (typed: string) => {
    if (verifying) return;
    const submitError = redemptionCodeSubmitError(typed);
    if (submitError) {
      setFieldError(submitError);
      return;
    }
    setVerifying(true);
    const verdict = await onVerify(typed);
    setVerifying(false);
    setFieldError(verdict);
  };

  return (
    <Modal
      variant="light"
      hideHeader
      hideClose
      title={title}
      className="unlock-code-dialog !max-w-[400px] !p-6"
      onClose={onClose}
    >
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(formString(new FormData(e.currentTarget), "accessCode"));
        }}
      >
        <div className="flex items-center justify-between">
          <div
            className="flex h-[46px] w-[46px] items-center justify-center rounded-xl"
            style={{ background: accentSoft, color: accent }}
          >
            <LockIcon s={22} />
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(5,27,53,0.16)] text-[#051b35] transition-colors hover:bg-[rgba(5,27,53,0.06)]"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <h2 className="m-0 font-semibold">{title}</h2>
        {offerDescription ? (
          <pre className="m-0 whitespace-pre-wrap font-[inherit] text-[14px] leading-[1.5] text-[#4a5567] [overflow-wrap:anywhere]">
            {offerDescription}
          </pre>
        ) : null}
        <p className="text-[14px] text-[#6e7180]">
          Enter your access code to unlock {isGa ? "this offer" : "these seats"}.
        </p>
        <RedemptionCodeField
          name="accessCode"
          label="Access code"
          hideLabel
          value={code}
          autoFocus
          placeholder="Access code"
          error={fieldError}
          onChange={(value) => {
            setCode(value);
            setFieldError(null);
          }}
          onBlur={(value) =>
            setFieldError((current) =>
              redemptionCodeBlurFieldError(current, value),
            )
          }
          inputClassName="tracking-[0.06em]"
        />
        <BrandedActionButton
          type="submit"
          primaryColor={accent}
          textColor={buttonTextColor}
          loading={verifying}
          loadingLabel="Checking…"
          className="w-full text-[16px]"
        >
          <LockIcon s={16} /> {isGa ? "Unlock offer" : "Unlock seats"}
        </BrandedActionButton>
      </form>
    </Modal>
  );
}
