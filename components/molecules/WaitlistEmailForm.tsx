"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import BrandedActionButton from "@/components/atoms/BrandedActionButton";
import EmailField from "@/components/molecules/EmailField";
import {
  emailBlurInvalid,
  submittedEmail,
  type EmailFieldError,
} from "@/lib/fieldValidation";
import { validateSubmittedEmail } from "@/lib/submitEmailValidation";

/**
 * Keeps the typed address and its validation state local. Ticketing renders the
 * seat map and every listing from the same tree, so holding these on the page
 * made each keystroke rebuild the whole page.
 */
export default function WaitlistEmailForm({
  id,
  submitLabel,
  accent,
  buttonTextColor,
  onCancel,
  onConfirmed,
  className,
  style,
  actionsClassName,
  actionsStyle,
  cancelClassName,
  submitClassName,
  children,
}: {
  id: string;
  submitLabel: string;
  accent: string;
  buttonTextColor: string;
  onCancel: () => void;
  /** Runs once the address passes local rules and the SendGrid check. */
  onConfirmed: (email: string) => void;
  className?: string;
  style?: CSSProperties;
  actionsClassName?: string;
  actionsStyle?: CSSProperties;
  cancelClassName?: string;
  submitClassName?: string;
  /** Extra controls between the field and the actions row. */
  children?: ReactNode;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<EmailFieldError>(null);
  const [networkError, setNetworkError] = useState(false);
  const [checking, setChecking] = useState(false);

  const submit = async (next: string) => {
    if (checking) return;
    setNetworkError(false);
    setChecking(true);
    const result = await validateSubmittedEmail(next);
    setChecking(false);
    if (!result.ok) {
      if (result.error === "required" || result.error === "invalid") {
        setError(result.error);
      } else {
        setError(null);
        setNetworkError(true);
      }
      return;
    }
    setEmail(result.email);
    setError(null);
    onConfirmed(result.email);
  };

  return (
    <form
      noValidate
      className={className}
      style={style}
      onSubmit={(event) => {
        event.preventDefault();
        void submit(submittedEmail(new FormData(event.currentTarget)));
      }}
    >
      <EmailField
        autoFocus
        id={id}
        name="email"
        label="Email address"
        placeholder="you@example.com"
        value={email}
        error={error}
        networkError={networkError}
        disabled={checking}
        onChange={(value) => {
          setEmail(value);
          setError(null);
          setNetworkError(false);
        }}
        onBlur={(value) => setError(emailBlurInvalid(value) ? "invalid" : null)}
      />
      {children}
      <div className={actionsClassName} style={actionsStyle}>
        <BrandedActionButton
          type="button"
          tone="secondary"
          onClick={onCancel}
          className={cancelClassName}
        >
          Cancel
        </BrandedActionButton>
        <BrandedActionButton
          type="submit"
          primaryColor={accent}
          textColor={buttonTextColor}
          className={submitClassName}
          loading={checking}
          loadingLabel="Checking email…"
          disabled={checking}
        >
          {submitLabel}
        </BrandedActionButton>
      </div>
    </form>
  );
}
