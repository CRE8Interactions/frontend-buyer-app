"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import BrandedActionButton from "@/components/atoms/BrandedActionButton";
import EmailField from "@/components/molecules/EmailField";
import NameField from "@/components/molecules/NameField";
import {
  emailBlurInvalid,
  fieldErrorTextClass,
  formString,
  nameBlurError,
  nameFieldError,
  submittedEmail,
  type EmailFieldError,
  type NameFieldError,
} from "@/lib/fieldValidation";
import { validateSubmittedEmail } from "@/lib/submitEmailValidation";
import {
  GUEST_CONTACT_COPY,
  guestContactStartFailed,
  parseGuestBuyer,
  type GuestBuyer,
} from "@/lib/guestCheckout";

export default function GuestContact({
  loginHref,
  onSignIn,
  onContinue,
  buttonColor,
  buttonTextColor,
}: {
  loginHref: string;
  onSignIn?: () => void;
  onContinue: (buyer: GuestBuyer) => void | Promise<void>;
  buttonColor?: string;
  buttonTextColor?: string;
}) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailError, setEmailError] = useState<EmailFieldError>(null);
  const [emailNetworkError, setEmailNetworkError] = useState(false);
  const [startError, setStartError] = useState("");
  const [firstError, setFirstError] = useState<NameFieldError>(null);
  const [lastError, setLastError] = useState<NameFieldError>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextEmail = submittedEmail(data);
    const first = formString(data, "firstName") || firstName;
    const last = formString(data, "lastName") || lastName;
    setEmail(nextEmail);
    setFirstName(first);
    setLastName(last);
    const firstBad = nameFieldError(first);
    const lastBad = nameFieldError(last);
    setFirstError(firstBad);
    setLastError(lastBad);
    setEmailNetworkError(false);
    setStartError("");
    setSubmitting(true);
    const emailResult = await validateSubmittedEmail(nextEmail);
    if (!emailResult.ok) {
      setSubmitting(false);
      if (emailResult.error === "startFailed") {
        setEmailError(null);
        setStartError(GUEST_CONTACT_COPY.startFailed);
      } else if (emailResult.error === "network") {
        setEmailError(null);
        setEmailNetworkError(true);
      } else {
        setEmailError(emailResult.error);
      }
    } else {
      setEmailError(null);
    }
    const buyer = parseGuestBuyer({
      email: emailResult.email,
      firstName: first,
      lastName: last,
    });
    if (!buyer || !emailResult.ok || firstBad || lastBad) {
      setSubmitting(false);
      return;
    }
    try {
      await onContinue(buyer);
    } catch (error) {
      if (guestContactStartFailed(error)) {
        setStartError(GUEST_CONTACT_COPY.startFailed);
      } else {
        throw error;
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="flex flex-col gap-5" noValidate onSubmit={onSubmit}>
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.03em]">
          Where should we send your tickets?
        </h1>
        <p className="mt-1 text-[14px] text-[#6e7180]">
          No account needed. We&apos;ll email your tickets right after payment.
        </p>
      </div>
      <EmailField
        autoFocus
        id="guest-email"
        name="email"
        label="Email address"
        placeholder="Enter your email"
        value={email}
        error={emailError}
        networkError={emailNetworkError}
        disabled={submitting}
        onChange={(value) => {
          setEmail(value);
          setEmailError(null);
          setEmailNetworkError(false);
          setStartError("");
        }}
        onBlur={(value) =>
          setEmailError(emailBlurInvalid(value) ? "invalid" : null)
        }
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <NameField
          id="guest-first"
          name="firstName"
          label="First name"
          autoComplete="given-name"
          placeholder="Enter your first name"
          value={firstName}
          error={firstError}
          onChange={(value) => {
            setFirstName(value);
            setFirstError(null);
            setStartError("");
          }}
          onBlur={(value) => setFirstError(nameBlurError(value))}
        />
        <NameField
          id="guest-last"
          name="lastName"
          label="Last name"
          autoComplete="family-name"
          placeholder="Enter your last name"
          value={lastName}
          error={lastError}
          onChange={(value) => {
            setLastName(value);
            setLastError(null);
            setStartError("");
          }}
          onBlur={(value) => setLastError(nameBlurError(value))}
        />
      </div>
      <BrandedActionButton
        type="submit"
        primaryColor={buttonColor}
        textColor={buttonTextColor}
        className="w-full py-4 text-[16px]"
        loading={submitting}
        loadingLabel="Checking email…"
        disabled={submitting}
      >
        Continue to payment
      </BrandedActionButton>
      {startError ? (
        <p className={fieldErrorTextClass("light")} role="alert">
          {startError}
        </p>
      ) : null}
      <p className="text-center text-[14px] text-[#6e7180]">
        Already have an account?{" "}
        <Link
          href={loginHref}
          onClick={onSignIn}
          className="font-semibold text-[#051b35] underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
