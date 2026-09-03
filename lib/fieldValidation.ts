// `libphonenumber-js/min` is the same metadata `react-phone-number-input` uses,
// without its React components: importing those here breaks any server
// component that reaches this module through `lib/helpers.ts`.
import { isValidPhoneNumber } from "libphonenumber-js/min";

export const namePatternMatch = "^[A-Za-z'\\- ]+$";

export const FIELD_COPY = {
  network: "We're experiencing technical difficulties. Please try again later.",
  emailRequired: "Email address is required.",
  invalidEmail: "Email is invalid. Please try again.",
  nameRequired: "This field is required.",
  namePattern: "Letters only — no digits.",
  codeIncorrect: "Code is incorrect. Please try again",
  accessCodeIncorrect:
    "That code didn't match. Check with the event for the right one.",
  promoCodeRequired: "Enter a promo code.",
  phoneRequired: "Phone number is required.",
  phoneInvalid: "Phone number is not valid. Please try again",
  phoneExists: "An account with this phone number already exists.",
} as const;

export const PHONE_ERROR = {
  required: FIELD_COPY.phoneRequired,
  invalid: FIELD_COPY.phoneInvalid,
  exists: FIELD_COPY.phoneExists,
} as const;

export type PhoneErrorType = keyof typeof PHONE_ERROR;
export type NameFieldError = "required" | "pattern" | null;
export type EmailFieldError = "required" | "invalid" | null;
export type DobFieldError = "required" | "invalid" | null;
export type CodeFieldError = "code" | "network" | null;
export type RedemptionCodeFieldError = "required" | "rejected" | "network" | null;
export type FieldVariant = "light" | "dark";

export const DOB_REQUIRED_MESSAGE = "Date of birth is required.";
export const DOB_INVALID_MESSAGE =
  "Date of birth is incorrect. Make sure it is in the correct format: MM/DD/YYYY";

export function requiredCopy(label: string) {
  return `${label} is required.`;
}

export const emailPatternMatch = (val?: string | null) => {
  const emailPattern = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/g;
  return val ? new RegExp(emailPattern).test(val) : true;
};

const BLOCKED_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "protonbox.pro",
  "ultramail.pro",
  "mypost.lol",
  "e-boss.xyz",
  "mailgod.xyz",
  "gopostal.top",
  "e-mail.lol",
  "gogomail.ink",
  "anymail.xyz",
  "blueink.top",
]);

/** Trim + lowercase so every shopper form sends a consistent address. */
export const normalizeEmail = (email?: string | null) =>
  (email || "").trim().toLowerCase();

/**
 * Block disposable domains and `.ru` / `.ua` TLDs. Malformed addresses
 * (no `@`, no TLD) are not treated as blocked — syntax checks run next.
 */
export const isBlockedEmail = (email?: string) => {
  if (!email) return false;
  const domain = email.split("@")[1]?.trim().toLowerCase();
  if (!domain) return false;
  if (BLOCKED_EMAIL_DOMAINS.has(domain)) return true;
  const labels = domain.split(".").filter(Boolean);
  if (labels.length < 2) return false;
  const tld = labels[labels.length - 1];
  return tld === "ru" || tld === "ua";
};

/** Blocked first, then syntax. Empty is invalid for submit, valid for idle blur. */
export function emailLooksInvalid(value: string) {
  return isBlockedEmail(value) || !emailPatternMatch(value);
}

export function nameAllows(value: string) {
  return !value || new RegExp(namePatternMatch).test(value);
}

export function nameFieldError(value: string): NameFieldError {
  const trimmed = value.trim();
  if (!trimmed) return "required";
  if (!new RegExp(namePatternMatch).test(trimmed)) return "pattern";
  return null;
}

/** Empty is valid on idle blur; pattern errors only when the field has content. */
export function nameBlurError(value: string): "pattern" | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!new RegExp(namePatternMatch).test(trimmed)) return "pattern";
  return null;
}

export function phoneSubmitError(
  value: string | undefined,
): PhoneErrorType | null {
  if (!value) return "required";
  if (!isValidPhoneNumber(value)) return "invalid";
  return null;
}

/** Empty is valid on idle blur; invalid only when a number was entered. */
export function phoneBlurError(value: string | undefined): "invalid" | null {
  if (!value) return null;
  if (!isValidPhoneNumber(value)) return "invalid";
  return null;
}

/** Submit-time phone validation (required + invalid). */
export function phoneNumberError(value: string | undefined): PhoneErrorType | null {
  return phoneSubmitError(value);
}

export function formatDobInput(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function isValidDob(dob: string) {
  const digits = dob.replace(/\D/g, "");
  if (digits.length !== 8) return false;
  const [month, day, year] = [
    Number(digits.slice(0, 2)),
    Number(digits.slice(2, 4)),
    Number(digits.slice(4, 8)),
  ];
  const dateObj = new Date(year, month - 1, day);
  if (
    dateObj.getFullYear() !== year ||
    dateObj.getMonth() !== month - 1 ||
    dateObj.getDate() !== day
  ) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dateObj <= today;
}

/** Empty is valid on idle blur; invalid only when a date was entered. */
export function dobBlurError(value: string): "invalid" | null {
  const next = formatDobInput(value);
  if (!next) return null;
  return isValidDob(next) ? null : "invalid";
}

export function dobSubmitError(value: string): DobFieldError {
  const next = formatDobInput(value);
  if (!next) return "required";
  if (!isValidDob(next)) return "invalid";
  return null;
}

export function normalizeOtp(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

/** Statuses that mean the request never reached a verdict on the code itself. */
const CODE_UNANSWERED_STATUSES = new Set([408, 429]);

function rejectionStatus(cause: unknown): number | undefined {
  if (!cause || typeof cause !== "object") return undefined;
  const rejection = cause as { status?: number; response?: { status?: number } };
  return rejection.response?.status ?? rejection.status;
}

/**
 * A rejected code is a wrong code, whatever 4xx the API answers with. Only a
 * request that never got a verdict — offline, timed out, rate limited, or a
 * server fault — is a connection problem.
 */
export function codeSubmitError(cause: unknown): Exclude<CodeFieldError, null> {
  const status = rejectionStatus(cause);
  const rejected =
    status !== undefined &&
    status >= 400 &&
    status < 500 &&
    !CODE_UNANSWERED_STATUSES.has(status);
  return rejected ? "code" : "network";
}

export function lightFieldClass(invalid: boolean) {
  return [
    "h-[52px] w-full rounded-[14px] border bg-[#f7f8fc] px-4 text-[16px] text-[#051b35] outline-none placeholder:text-[#8a93a3]",
    invalid
      ? "border-[#c2394a]"
      : "border-[rgba(5,27,53,0.12)]",
  ].join(" ");
}

export function darkFieldClass(invalid: boolean) {
  return [
    "h-12 w-full rounded-xl border bg-[#051B35] px-4 text-[15px] text-white placeholder-[#7c88a3] outline-none transition-colors",
    invalid
      ? "border-[#c2394a]"
      : "border-white/15",
  ].join(" ");
}

export function fieldClass(variant: FieldVariant, invalid: boolean) {
  return variant === "dark"
    ? darkFieldClass(invalid)
    : lightFieldClass(invalid);
}

export function fieldErrorTextClass(variant: FieldVariant) {
  return variant === "dark"
    ? "mt-2 text-[13px] text-[#ff7a72]"
    : "mt-2 text-[13px] text-[#c2394a]";
}

/** Read a named text field from a submitted form (Safari autofill lives here). */
export function formString(data: FormData, name: string) {
  const value = data.get(name);
  return typeof value === "string" ? value : "";
}

export function submittedEmail(data: FormData, name = "email") {
  return normalizeEmail(formString(data, name));
}

/** Empty is valid on idle blur; submit still rejects empty. */
export function emailBlurInvalid(value: string) {
  const next = normalizeEmail(value);
  return Boolean(next) && emailLooksInvalid(next);
}

export function emailSubmitError(value: string): EmailFieldError {
  const next = normalizeEmail(value);
  if (!next) return "required";
  if (emailLooksInvalid(next)) return "invalid";
  return null;
}

export function emailSubmitInvalid(value: string) {
  return emailSubmitError(value) !== null;
}

/** Trim access/promo codes before submit or API calls. */
export function normalizeRedemptionCode(value?: string | null) {
  return (value || "").trim();
}

/** Empty and whitespace-only are valid on idle blur; submit rejects empty. */
export function redemptionCodeBlurError(_value: string): null {
  return null;
}

export function redemptionCodeSubmitError(value: string): "required" | null {
  return normalizeRedemptionCode(value) ? null : "required";
}

/** Keep API rejections on blur; otherwise re-run idle blur rules. */
export function redemptionCodeBlurFieldError(
  current: RedemptionCodeFieldError,
  value: string,
): RedemptionCodeFieldError {
  if (current === "rejected" || current === "network") return current;
  return redemptionCodeBlurError(value);
}

/** Checkout promo rejections keep the API message when present. */
export function promoCodeRejectedMessage(apiMessage?: string | null) {
  const msg = apiMessage?.trim() || "Promo code could not be applied";
  return `${msg}${/[.!?]$/.test(msg) ? " " : ". "}Please try again.`;
}
