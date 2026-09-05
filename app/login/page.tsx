"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import CodeField, { type CodeError } from "@/components/molecules/CodeField";
import EmailField from "@/components/molecules/EmailField";
import NameField from "@/components/molecules/NameField";
import PhoneNumberInput, {
  phoneBlurError,
  phoneSubmitError,
  type PhoneErrorType,
} from "@/components/molecules/PhoneNumberInput";
import { ShopperFluidTypeStyles } from "@/components/templates/ShopperFluidType";
import { ButtonBusyContents } from "@/components/atoms/BrandedActionButton";
import {
  verifyUser,
  verifyCode,
  createNewUser,
  validateEmail,
} from "@/lib/api";
import { setSession, getLastKnown, type AuthSession } from "@/lib/auth";
import {
  FIELD_COPY,
  codeSubmitError,
  dobBlurError,
  dobSubmitError,
  DOB_INVALID_MESSAGE,
  DOB_REQUIRED_MESSAGE,
  emailBlurInvalid,
  emailSubmitError,
  emailSubmitInvalid,
  formatDobInput,
  formString,
  lightFieldClass,
  nameBlurError,
  nameFieldError,
  normalizeEmail,
  submittedEmail,
  type EmailFieldError,
  type NameFieldError,
} from "@/lib/fieldValidation";

type Choice = "email" | "phone-number";

const NAVY = "#051b35";

const greenBtnCls =
  "inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-[#a6e773] px-5 py-4 text-[15px] font-semibold text-[#051b35] disabled:opacity-70";
const cardCls =
  "rounded-[24px] border border-[rgba(5,27,53,0.10)] bg-white p-[22px] shadow-[0_1px_2px_rgba(5,27,53,0.05),0_20px_46px_-22px_rgba(5,27,53,0.35)]";
const backBtnCls =
  "inline-flex items-center gap-2 self-start rounded-full border border-[rgba(5,27,53,0.12)] bg-white px-[18px] py-2.5 text-[14px] font-semibold text-[#051b35]";

function redirectAfterAuth(
  fromParam: string | null,
  replace: (href: string) => void,
) {
  const lastKnown = getLastKnown();
  const requested = fromParam?.trim() || "";
  // Login buttons record the page where they were clicked. Keep this fallback
  // for bare /login URLs so authentication still returns there instead of
  // dropping the shopper on Browse.
  const remembered =
    lastKnown?.startsWith("/") &&
    !/^\/login(?:\/|$|\?)/i.test(lastKnown)
      ? lastKnown
      : "";
  let from = requested || remembered || "/browse/";
  // Prefer lastKnown when it keeps query params (e.g. cartId) that `from` dropped.
  if (
    requested &&
    lastKnown &&
    !requested.includes("?") &&
    lastKnown.includes("?") &&
    lastKnown.startsWith(requested.split("?")[0])
  ) {
    from = lastKnown;
  }
  setTimeout(() => {
    // Replace /login so neither browser Back nor any in-app Back control can
    // return the shopper to the authentication screen. A router replace keeps
    // this document, so the destination's loading boundary paints instead of
    // the browser reloading the app and spinning the tab.
    replace(from.startsWith("/") ? from : `/${from}`);
  }, 500);
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
  const router = useRouter();
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
  const [emailError, setEmailError] = useState<EmailFieldError>(null);
  const [phoneError, setPhoneError] = useState<PhoneErrorType | null>(null);
  const [firstNameError, setFirstNameError] = useState<NameFieldError>(null);
  const [lastNameError, setLastNameError] = useState<NameFieldError>(null);
  const [dobError, setDobError] = useState<"required" | "invalid" | null>(null);
  const [codeError, setCodeError] = useState<CodeError>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [resent, setResent] = useState(false);
  const [done, setDone] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const clearNetworkFeedback = () => {
    setHasError(false);
    setStatusMessage("");
    setResent(false);
    setCodeError(null);
  };

  const destinationLabel = choice === "email" ? email : phoneNumber;

  const sendCode = async (address: string) => {
    await verifyUser({
      data: {
        phoneNumber: choice === "email" ? "" : phoneNumber || "",
        email: choice === "email" ? address : "",
      },
    });
    setStep(1);
  };

  const submitEmailStep = async (rawEmail?: string) => {
    const nextEmail = normalizeEmail(rawEmail ?? email);
    setEmail(nextEmail);
    const kind = emailSubmitError(nextEmail);
    if (kind) {
      setEmailError(kind);
      return;
    }
    setEmailError(null);
    setIsSaving(true);
    setHasError(false);
    try {
      const res = await validateEmail({ email: nextEmail });
      const data = res.data as { verdict?: string; suggestion?: string };
      if (
        (data.verdict === "Risky" && data.suggestion) ||
        data.verdict === "Invalid"
      ) {
        setEmailError("invalid");
        return;
      }
      await sendCode(nextEmail);
    } catch {
      setHasError(true);
    } finally {
      setIsSaving(false);
    }
  };

  const verifyUserCode = async (fullCode: string) => {
    setCodeError(null);
    setHasError(false);
    try {
      const res = await verifyCode({ data: { code: fullCode } });
      if (res.status === 200) {
        setDone(true);
        setSession(res.data as AuthSession);
        redirectAfterAuth(fromParam, (href) => router.replace(href));
      } else if (res.status === 203) {
        setStep(2);
      } else {
        setCodeError("code");
      }
    } catch (cause) {
      setCodeError(codeSubmitError(cause));
    }
  };

  const resend = async () => {
    setIsSaving(true);
    setHasError(false);
    setCodeError(null);
    setResent(false);
    try {
      await sendCode(normalizeEmail(email));
      setResent(true);
      setStatusMessage("Verification code has been resent.");
    } catch {
      setHasError(true);
      setCodeError("network");
    } finally {
      setIsSaving(false);
    }
  };

  const submitRegistration = async (data: FormData) => {
    const nextEmail = submittedEmail(data, "email") || normalizeEmail(email);
    const first = formString(data, "firstName") || firstName;
    const last = formString(data, "lastName") || lastName;
    const nextDob = formString(data, "dob") || dob;
    const nextPhone = phoneNumber;
    setEmail(nextEmail);
    setFirstName(first);
    setLastName(last);
    if (nextDob) setDob(formatDobInput(nextDob));
    let invalid = false;

    const firstErr = nameFieldError(first);
    const lastErr = nameFieldError(last);
    setFirstNameError(firstErr);
    setLastNameError(lastErr);
    if (firstErr || lastErr) invalid = true;

    const nextPhoneError = phoneSubmitError(nextPhone);
    setPhoneError(nextPhoneError);
    if (nextPhoneError) invalid = true;

    const dobValue = nextDob ? formatDobInput(nextDob) : dob;
    const dobErr = dobSubmitError(dobValue);
    setDobError(dobErr);
    if (dobErr) invalid = true;

    if (emailSubmitInvalid(nextEmail)) {
      setEmailError(emailSubmitError(nextEmail));
      invalid = true;
    }

    if (invalid) return;

    setIsSaving(true);
    setHasError(false);
    try {
      const res = await createNewUser({
        data: {
          email: nextEmail,
          firstName: first.trim(),
          lastName: last.trim(),
          phoneNumber: nextPhone,
          dob: dobValue,
        },
      });
      if (res.status === 200) {
        setDone(true);
        setSession(res.data as AuthSession);
        redirectAfterAuth(fromParam, (href) => router.replace(href));
        return;
      }
      if (res.status === 226) {
        setPhoneError("exists");
      } else {
        setHasError(true);
      }
    } catch {
      setHasError(true);
    } finally {
      setIsSaving(false);
    }
  };

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
              setCodeError(null);
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
              <h1 className="text-[34px] font-semibold leading-[1.05] tracking-[-0.03em]">
                Your tickets, in one place
              </h1>
              <p className="text-[15px] leading-relaxed text-[#6e7180]">
                Enter the email you bought with and we&apos;ll send a six-digit
                code. No password to remember.
              </p>
            </div>

            <form
              className={`${cardCls} flex flex-col gap-3.5`}
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void submitEmailStep(submittedEmail(new FormData(e.currentTarget)));
              }}
            >
              <EmailField
                id="email"
                name="email"
                autoFocus
                placeholder="you@email.com"
                value={email}
                disabled={isSaving}
                error={emailError}
                networkError={hasError}
                onChange={(value) => {
                  setEmail(value);
                  setEmailError(null);
                  clearNetworkFeedback();
                }}
                onBlur={(value) => {
                  setEmailError(emailBlurInvalid(value) ? "invalid" : null);
                }}
              />
              <button
                type="submit"
                disabled={isSaving}
                aria-busy={isSaving || undefined}
                className={greenBtnCls}
              >
                <ButtonBusyContents
                  loading={isSaving}
                  loadingLabel="Sending…"
                  spinnerColor="#051b35"
                  trackColor="rgba(5,27,53,0.2)"
                >
                  Send my code
                </ButtonBusyContents>
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
              <h1 className="text-[34px] font-semibold leading-[1.05] tracking-[-0.03em]">
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
              <CodeField
                autoFocus
                value={code}
                error={codeError || (hasError ? "network" : null)}
                disabled={isSaving || done}
                onChange={(next) => {
                  setCode(next);
                  clearNetworkFeedback();
                }}
                onComplete={(next) => void verifyUserCode(next)}
              />
              <div className="flex flex-col gap-4 text-center text-[13px] text-[#8a93a3]">
                <p>
                  Codes expire after 10 minutes, so be sure to use the right one.
                </p>
                <p>
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
                      Haven&apos;t received your code? Check your spam folder or{" "}
                      <button
                        type="button"
                        disabled={isSaving}
                        aria-busy={isSaving || undefined}
                        onClick={() => void resend()}
                        className="inline-flex items-center gap-2 font-semibold text-[#051b35]"
                      >
                        <ButtonBusyContents
                          loading={isSaving}
                          loadingLabel="Sending…"
                          spinnerColor="#051b35"
                          trackColor="rgba(5,27,53,0.2)"
                        >
                          Send a new code
                        </ButtonBusyContents>
                      </button>
                    </>
                  )}
                </p>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex flex-col gap-2">
              <h1 className="text-[34px] font-semibold leading-[1.05] tracking-[-0.03em]">
                Let&apos;s set up your profile
              </h1>
            </div>
            <form
              className={`${cardCls} flex flex-col gap-4`}
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void submitRegistration(new FormData(e.currentTarget));
              }}
            >
              <EmailField
                id="reg-email"
                name="email"
                value={email}
                disabled
                readOnly
                error={emailError}
                onChange={() => {}}
              />
              <div>
                <label
                  htmlFor="reg-phone"
                  className="text-[12px] font-semibold text-[#4a5567]"
                >
                  Mobile number
                </label>
                <PhoneNumberInput
                  autoFocus
                  id="reg-phone"
                  name="phoneNumber"
                  value={phoneNumber}
                  error={phoneError}
                  onChange={(value) => {
                    setPhoneNumber(value);
                    setPhoneError(null);
                    setHasError(false);
                  }}
                  onBlur={(value) => setPhoneError(phoneBlurError(value))}
                />
              </div>
              <NameField
                id="firstName"
                name="firstName"
                label="First name"
                autoComplete="given-name"
                placeholder="Enter your first name"
                value={firstName}
                error={firstNameError}
                onChange={(value) => {
                  setFirstName(value);
                  setFirstNameError(null);
                  setHasError(false);
                }}
                onBlur={(value) => setFirstNameError(nameBlurError(value))}
              />
              <NameField
                id="lastName"
                name="lastName"
                label="Last name"
                autoComplete="family-name"
                placeholder="Enter your last name"
                value={lastName}
                error={lastNameError}
                onChange={(value) => {
                  setLastName(value);
                  setLastNameError(null);
                  setHasError(false);
                }}
                onBlur={(value) => setLastNameError(nameBlurError(value))}
              />
              <div>
                <label
                  htmlFor="dob"
                  className="text-[12px] font-semibold text-[#4a5567]"
                >
                  Birth date
                </label>
                <input
                  id="dob"
                  name="dob"
                  value={dob}
                  required
                  autoComplete="bday"
                  aria-invalid={Boolean(dobError)}
                  onChange={(e) => {
                    setDob(formatDobInput(e.target.value));
                    setDobError(null);
                    setHasError(false);
                  }}
                  onInput={(e) => {
                    setDob(formatDobInput(e.currentTarget.value));
                    setDobError(null);
                  }}
                  onBlur={(e) => setDobError(dobBlurError(e.currentTarget.value))}
                  placeholder="MM/DD/YYYY"
                  inputMode="numeric"
                  className={`mt-2 ${lightFieldClass(Boolean(dobError))}`}
                />
                {dobError === "required" ? (
                  <p className="mt-2 text-[13px] text-[#c2394a]">
                    {DOB_REQUIRED_MESSAGE}
                  </p>
                ) : dobError === "invalid" ? (
                  <p className="mt-2 text-[13px] text-[#c2394a]">
                    {DOB_INVALID_MESSAGE}
                  </p>
                ) : (
                  <p className="mt-1.5 text-[12px] text-[#8a93a3]">
                    Format: MM/DD/YYYY
                  </p>
                )}
              </div>
              {hasError ? (
                <p className="text-[13px] text-[#c2394a]">{FIELD_COPY.network}</p>
              ) : null}
              <button
                type="submit"
                disabled={isSaving || done}
                aria-busy={isSaving || undefined}
                className={greenBtnCls}
              >
                <ButtonBusyContents
                  loading={isSaving}
                  loadingLabel="Signing up…"
                  spinnerColor="#051b35"
                  trackColor="rgba(5,27,53,0.2)"
                >
                  {done ? "Signed up…" : "Sign up"}
                </ButtonBusyContents>
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
    <div className="shopper-page min-h-screen bg-[#f7f8fc] text-[#051b35]">
      <ShopperFluidTypeStyles />
      <header
        className="sticky top-0 z-20"
        style={{ background: NAVY }}
      >
        <div className="mx-auto flex max-w-[1100px] items-center px-4 pb-3 pt-[42px] md:px-8 md:py-[18px]">
          <Link href="/browse" aria-label="Blocktickets home" className="shrink-0">
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
