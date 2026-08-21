// `libphonenumber-js/min` is the same metadata `react-phone-number-input` uses,
// without its React components: importing those here breaks any server
// component that reaches this module through `lib/helpers.ts`.
import { isValidPhoneNumber } from "libphonenumber-js/min";

export const namePatternMatch = "^[A-Za-z'\\- ]+$";

export const FIELD_COPY = {
  network: "We're experiencing technical difficulties. Please try again later.",
  invalidEmail: "Email is invalid. Please try again.",
  nameRequired: "This field is required.",
  namePattern: "Letters only — no digits.",
  codeIncorrect: "Code is incorrect. Please try again",
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
export type FieldVariant = "light" | "dark";

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

export function phoneNumberError(
  value: string | undefined,
): PhoneErrorType | null {
  if (!value) return "required";
  if (!isValidPhoneNumber(value)) return "invalid";
  return null;
}

export function normalizeOtp(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function lightFieldClass(invalid: boolean) {
  return [
    "h-[52px] w-full rounded-[14px] border bg-[#f7f8fc] px-4 text-[16px] text-[#051b35] outline-none placeholder:text-[#8a93a3]",
    invalid
      ? "border-[#c2394a] focus:border-[#c2394a]"
      : "border-[rgba(5,27,53,0.12)] focus:border-[#051b35]",
  ].join(" ");
}

export function darkFieldClass(invalid: boolean) {
  return [
    "h-12 w-full rounded-xl border bg-[#051B35] px-4 text-[15px] text-white placeholder-[#7c88a3] outline-none transition-colors",
    invalid
      ? "border-[#c2394a] focus:border-[#c2394a]"
      : "border-white/15 focus:border-[#a6e773]",
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
