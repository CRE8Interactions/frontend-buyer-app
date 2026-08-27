"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import BrandedActionButton from "@/components/atoms/BrandedActionButton";
import EmailField from "@/components/molecules/EmailField";
import NameField from "@/components/molecules/NameField";
import {
  emailBlurInvalid,
  emailSubmitError,
  formString,
  nameFieldError,
  submittedEmail,
  type EmailFieldError,
  type NameFieldError,
} from "@/lib/fieldValidation";
import {
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
  onContinue: (buyer: GuestBuyer) => void;
  buttonColor?: string;
  buttonTextColor?: string;
}) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailError, setEmailError] = useState<EmailFieldError>(null);
  const [firstError, setFirstError] = useState<NameFieldError>(null);
  const [lastError, setLastError] = useState<NameFieldError>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextEmail = submittedEmail(data);
    const first = formString(data, "firstName") || firstName;
    const last = formString(data, "lastName") || lastName;
    setEmail(nextEmail);
    setFirstName(first);
    setLastName(last);
    const emailKind = emailSubmitError(nextEmail);
    const firstBad = nameFieldError(first);
    const lastBad = nameFieldError(last);
    setEmailError(emailKind);
    setFirstError(firstBad);
    setLastError(lastBad);
    const buyer = parseGuestBuyer({
      email: nextEmail,
      firstName: first,
      lastName: last,
    });
    if (!buyer) return;
    onContinue(buyer);
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
        onChange={(value) => {
          setEmail(value);
          setEmailError(null);
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
          }}
          onBlur={(value) =>
            setFirstError(value.trim() ? nameFieldError(value) : null)
          }
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
          }}
          onBlur={(value) =>
            setLastError(value.trim() ? nameFieldError(value) : null)
          }
        />
      </div>
      <BrandedActionButton
        type="submit"
        primaryColor={buttonColor}
        textColor={buttonTextColor}
        className="w-full py-4 text-[16px]"
      >
        Continue to payment
      </BrandedActionButton>
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
