"use client";

import { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { isValidPhoneNumber } from "react-phone-number-input";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import {
  verifyUser,
  verifyCode,
  createNewUser,
  validateEmail,
} from "@/lib/api";
import { setSession, getLastKnown, type AuthSession } from "@/lib/auth";
import {
  emailPatternMatch,
  isBlockedEmail,
  namePatternMatch,
} from "@/lib/helpers";

type Choice = "email" | "phone-number";

const NAVY = "#051b35";
const fieldCls =
  "h-[52px] w-full rounded-[14px] border border-[rgba(5,27,53,0.12)] bg-[#f7f8fc] px-4 text-[16px] text-[#051b35] outline-none placeholder:text-[#8a93a3]";
const greenBtnCls =
  "w-full rounded-full bg-[#a6e773] px-5 py-4 text-[15px] font-semibold text-[#051b35] disabled:opacity-70";
const cardCls =
  "rounded-[24px] border border-[rgba(5,27,53,0.10)] bg-white p-[22px] shadow-[0_1px_2px_rgba(5,27,53,0.05),0_20px_46px_-22px_rgba(5,27,53,0.35)]";
const backBtnCls =
  "inline-flex items-center gap-2 self-start rounded-full border border-[rgba(5,27,53,0.12)] bg-white px-[18px] py-2.5 text-[14px] font-semibold text-[#051b35]";

function redirectAfterAuth(fromParam: string | null) {
  const lastKnown = getLastKnown();
  // Prefer lastKnown when it keeps query params (e.g. cartId) that `from` dropped.
  let from = fromParam || lastKnown || "/browse/";
  if (
    fromParam &&
    lastKnown &&
    !fromParam.includes("?") &&
    lastKnown.includes("?") &&
    lastKnown.startsWith(fromParam.split("?")[0])
  ) {
    from = lastKnown;
  }
  setTimeout(() => {
    window.location.href = from.startsWith("/") ? from : `/${from}`;
  }, 500);
}

function isValidDob(dob: string) {
  const digits = dob.replace(/\D/g, "");
  if (digits.length !== 8) return false;
  const [month, day, year] = [
    Number(digits.slice(0, 2)),
    Number(digits.slice(2, 4)),
    Number(digits.slice(4, 8)),
  ];
  const dateObj = new Date(year, month - 1, day);
  return (
    dateObj.getFullYear() === year &&
    dateObj.getMonth() === month - 1 &&
    dateObj.getDate() === day
  );
}

function formatDobInput(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function Emblem({ size }: { size: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      aria-hidden
    >
      <path
        d="M6 4h7a4.5 4.5 0 0 1 1 8.9A4.8 4.8 0 0 1 13.4 21H6V4z"
        stroke="#a6e773"
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
      <path
        d="M9.5 8.2h3.2M9.5 12.4h3.6M9.5 16.6h3.4"
        stroke="#a6e773"
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </svg>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from");

  const [step, setStep] = useState(0);
  const choice: Choice = "email";
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState<string | undefined>();
  const [code, setCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [hasError, setHasError] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(true);
  const [isPhoneValid, setIsPhoneValid] = useState(true);
  const [isDobValid, setIsDobValid] = useState(true);
  const [userExists, setUserExists] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [resent, setResent] = useState(false);
  const [done, setDone] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const codeRef = useRef<HTMLInputElement | null>(null);

  const clearFeedback = () => {
    setHasError(false);
    setStatusMessage("");
    setResent(false);
  };

  const formValid = Boolean(
    firstName && lastName && email && phoneNumber && dob,
  );

  const destinationLabel = choice === "email" ? email : phoneNumber;

  const sendCode = async () => {
    setIsSaving(true);
    setHasError(false);
    try {
      await verifyUser({
        data: {
          phoneNumber: choice === "email" ? "" : phoneNumber || "",
          email: choice === "email" ? email : "",
        },
      });
      setStep(1);
    } catch {
      setHasError(true);
    } finally {
      setIsSaving(false);
    }
  };

  const submitEmailStep = async () => {
    if (!emailPatternMatch(email) || isBlockedEmail(email)) {
      setIsEmailValid(false);
      return;
    }
    setIsSaving(true);
    try {
      const res = await validateEmail({ email });
      const data = res.data as { verdict?: string; suggestion?: string };
      if (
        (data.verdict === "Risky" && data.suggestion) ||
        data.verdict === "Invalid"
      ) {
        setIsEmailValid(false);
        setIsSaving(false);
        return;
      }
      await sendCode();
    } catch {
      setHasError(true);
      setIsSaving(false);
    }
  };

  const verifyUserCode = async (fullCode: string) => {
    setHasError(false);
    try {
      const res = await verifyCode({ data: { code: fullCode } });
      if (res.status === 200) {
        setDone(true);
        setSession(res.data as AuthSession);
        redirectAfterAuth(fromParam);
      } else if (res.status === 203) {
        setStep(2);
      } else {
        setHasError(true);
        setCode("");
      }
    } catch {
      setHasError(true);
      setCode("");
    }
  };

  const resend = async () => {
    await sendCode();
    setResent(true);
    setStatusMessage("Verification code has been resent.");
  };

  const submitRegistration = async () => {
    if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
      setIsPhoneValid(false);
      return;
    }
    if (!isValidDob(dob)) {
      setIsDobValid(false);
      return;
    }
    if (!emailPatternMatch(email) || isBlockedEmail(email)) {
      setIsEmailValid(false);
      return;
    }

    setIsSaving(true);
    setHasError(false);
    try {
      const res = await createNewUser({
        data: {
          email,
          firstName,
          lastName,
          phoneNumber,
          dob,
        },
      });
      if (res.status === 200) {
        setDone(true);
        setSession(res.data as AuthSession);
        redirectAfterAuth(fromParam);
        return;
      }
      if (res.status === 226) {
        setUserExists(true);
      }
    } catch {
      setHasError(true);
    } finally {
      setIsSaving(false);
    }
  };

  const nameOk = (value: string) =>
    !value || new RegExp(namePatternMatch).test(value);

  const invalidEmailMessage =
    "That email looks invalid. Check it and try again.";

  return (
    <div className="mx-auto flex max-w-[1100px] justify-center px-[18px] py-8 md:px-8 md:py-16">
      <div className="flex w-full max-w-[420px] flex-col gap-[22px]">
        {step > 0 && (
          <button
            type="button"
            onClick={() => {
              setStep((s) => s - 1);
              setCode("");
              setHasError(false);
              setDone(false);
            }}
            className={backBtnCls}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </button>
        )}

        {statusMessage ? (
          <p className="rounded-xl border border-[#a6e773]/40 bg-[#ecf8dd] px-4 py-3 text-[14px] text-[#2f8f4e]">
            {statusMessage}
          </p>
        ) : null}

        {step === 0 && (
          <>
            <div className="flex flex-col gap-2">
              <div
                className="mb-1.5 flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: NAVY }}
              >
                <Emblem size={32} />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a93a3]">
                Sign in
              </p>
              <h1 className="text-[28px] font-semibold leading-[1.05] tracking-[-0.03em] md:text-[34px]">
                Your tickets, in one place
              </h1>
              <p className="text-[15px] leading-relaxed text-[#6e7180]">
                Enter the email you bought with and we&apos;ll send a six-digit
                code. No password to remember.
              </p>
            </div>

            <form
                className={`${cardCls} flex flex-col gap-3.5`}
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitEmailStep();
                }}
              >
                <label
                  htmlFor="email"
                  className="text-[12px] font-semibold text-[#4a5567]"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setIsEmailValid(true);
                    clearFeedback();
                  }}
                  onBlur={() =>
                    setIsEmailValid(!email || emailPatternMatch(email))
                  }
                  placeholder="you@email.com"
                  disabled={isSaving}
                  className={`${fieldCls} ${
                    !isEmailValid || (email && hasError)
                      ? "border-[#c2394a]"
                      : ""
                  }`}
                />
                {!isEmailValid ? (
                  <p className="text-[13px] text-[#c2394a]">
                    {invalidEmailMessage}
                  </p>
                ) : hasError ? (
                  <p className="text-[13px] text-[#c2394a]">
                    Couldn&apos;t send a code. Check your connection and try
                    again.
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={!email || !isEmailValid || isSaving}
                  className={greenBtnCls}
                >
                  {isSaving ? "Sending…" : "Send my code"}
                </button>
                <p className="text-center text-[12px] leading-relaxed text-[#8a93a3]">
                  By continuing you agree to the Blocktickets{" "}
                  <Link href="/terms-conditions/" className="underline">
                    terms
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy-policy/" className="underline">
                    privacy policy
                  </Link>
                  .
                </p>
              </form>
          </>
        )}

        {step === 1 && (
          <>
            <div className="flex flex-col gap-2">
              <h1 className="text-[28px] font-semibold leading-[1.05] tracking-[-0.03em] md:text-[34px]">
                Enter your code
              </h1>
              <p className="text-[15px] leading-relaxed text-[#6e7180]">
                Sent to{" "}
                <strong className="font-semibold text-[#051b35]">
                  {destinationLabel}
                </strong>
              </p>
            </div>
            <div className={`${cardCls} flex flex-col gap-[18px]`}>
              <div
                className="relative cursor-text"
                onClick={() => codeRef.current?.focus()}
              >
                <div className="grid grid-cols-6 gap-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`flex h-[54px] items-center justify-center rounded-[14px] border text-[22px] font-semibold tabular-nums md:h-[60px] ${
                        code.length === i
                          ? "border-[#051b35] bg-white"
                          : "border-[rgba(5,27,53,0.12)] bg-[#f7f8fc]"
                      } ${hasError ? "border-[#c2394a]" : ""}`}
                    >
                      {code[i] || ""}
                    </div>
                  ))}
                </div>
                <input
                  ref={codeRef}
                  value={code}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  aria-label="Six-digit code"
                  disabled={isSaving || done}
                  onChange={(e) => {
                    const next = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setCode(next);
                    clearFeedback();
                    if (next.length === 6) void verifyUserCode(next);
                  }}
                  className="absolute inset-0 h-full w-full cursor-text border-none bg-transparent text-[16px] opacity-0 outline-none"
                />
              </div>
              {hasError ? (
                <p className="text-center text-[13px] text-[#c2394a]">
                  That code looks incorrect. Try again.
                </p>
              ) : null}
              <p className="text-center text-[13px] text-[#8a93a3]">
                {done ? (
                  <span className="font-semibold text-[#2f8f4e]">
                    Verified — signing you in…
                  </span>
                ) : resent ? (
                  <span className="font-semibold text-[#2f8f4e]">
                    A new code is on its way.
                  </span>
                ) : (
                  <>
                    Didn&apos;t get it?{" "}
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void resend()}
                      className="font-semibold text-[#051b35]"
                    >
                      {isSaving ? "Sending…" : "Send a new code"}
                    </button>
                  </>
                )}
              </p>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex flex-col gap-2">
              <h1 className="text-[28px] font-semibold leading-[1.05] tracking-[-0.03em] md:text-[34px]">
                Let&apos;s set up your profile
              </h1>
            </div>
            <form
              className={`${cardCls} flex flex-col gap-4`}
              onSubmit={(e) => {
                e.preventDefault();
                void submitRegistration();
              }}
            >
              <div>
                <label
                  htmlFor="reg-email"
                  className="text-[12px] font-semibold text-[#4a5567]"
                >
                  Email address
                </label>
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  disabled={choice === "email"}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setIsEmailValid(true);
                    clearFeedback();
                  }}
                  className={`mt-2 ${fieldCls} ${!isEmailValid ? "border-[#c2394a]" : ""}`}
                />
              </div>
              <div>
                <label
                  htmlFor="reg-phone"
                  className="text-[12px] font-semibold text-[#4a5567]"
                >
                  Mobile number
                </label>
                <div
                  className={`phone-field mt-2 rounded-[14px] border bg-[#f7f8fc] px-3 ${
                    !isPhoneValid || userExists
                      ? "border-[#c2394a]"
                      : "border-[rgba(5,27,53,0.12)]"
                  }`}
                >
                  <PhoneInput
                    id="reg-phone"
                    international
                    defaultCountry="US"
                    value={phoneNumber}
                    onChange={(value) => {
                      setPhoneNumber(value);
                      setIsPhoneValid(true);
                      setUserExists(false);
                      clearFeedback();
                    }}
                    disabled={choice === "phone-number"}
                    className="phone-input flex h-[52px] items-center text-[16px] text-[#051b35]"
                  />
                </div>
                {userExists ? (
                  <p className="mt-2 text-[13px] text-[#c2394a]">
                    An account with this phone number already exists.
                  </p>
                ) : null}
              </div>
              <div>
                <label
                  htmlFor="firstName"
                  className="text-[12px] font-semibold text-[#4a5567]"
                >
                  First name
                </label>
                <input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (nameOk(v)) {
                      setFirstName(v);
                      clearFeedback();
                    }
                  }}
                  placeholder="Enter your first name"
                  className={`mt-2 ${fieldCls}`}
                />
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="text-[12px] font-semibold text-[#4a5567]"
                >
                  Last name
                </label>
                <input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (nameOk(v)) {
                      setLastName(v);
                      clearFeedback();
                    }
                  }}
                  placeholder="Enter your last name"
                  className={`mt-2 ${fieldCls}`}
                />
              </div>
              <div>
                <label
                  htmlFor="dob"
                  className="text-[12px] font-semibold text-[#4a5567]"
                >
                  Birth date
                </label>
                <input
                  id="dob"
                  value={dob}
                  onChange={(e) => {
                    setDob(formatDobInput(e.target.value));
                    setIsDobValid(true);
                    clearFeedback();
                  }}
                  onBlur={() => setIsDobValid(!dob || isValidDob(dob))}
                  placeholder="MM/DD/YYYY"
                  inputMode="numeric"
                  className={`mt-2 ${fieldCls} ${dob && !isDobValid ? "border-[#c2394a]" : ""}`}
                />
                <p className="mt-1.5 text-[12px] text-[#8a93a3]">
                  Format: MM/DD/YYYY
                </p>
              </div>
              {hasError ? (
                <p className="text-[13px] text-[#c2394a]">
                  Something went wrong. Please check your details and try again.
                </p>
              ) : null}
              <button
                type="submit"
                disabled={
                  !formValid ||
                  !isEmailValid ||
                  !isDobValid ||
                  !isPhoneValid ||
                  isSaving
                }
                className={greenBtnCls}
              >
                {isSaving ? "Signing up…" : done ? "Signed up…" : "Sign up"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function LoginShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f8fc] text-[#051b35]">
      <header
        className="sticky top-0 z-20"
        style={{ background: NAVY }}
      >
        <div className="mx-auto flex max-w-[1100px] items-center px-4 pb-3 pt-[42px] md:px-8 md:py-[18px]">
          <Link href="/browse/" aria-label="Blocktickets home" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/nmstate/blocktickets-lockup-white.svg"
              alt="Blocktickets"
              className="block h-[22px] w-auto"
            />
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}

export default function LoginPage() {
  return (
    <LoginShell>
      <Suspense fallback={<div className="min-h-[40vh]" />}>
        <LoginForm />
      </Suspense>
    </LoginShell>
  );
}
