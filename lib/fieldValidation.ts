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

/** True when a field should show the idle error border and message. */
export function fieldShowsError(
  invalid: boolean,
  message?: string | null,
) {
  return invalid || Boolean(message?.trim());
}

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

export type DobEditInputType =
  | "deleteContentBackward"
  | "deleteContentForward"
  | "insertText"
  | string;

export type DobInputEdit = {
  value: string;
  caret: number;
};

function caretAfterDigitCount(value: string, digitCount: number) {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (/\d/.test(value[index])) seen += 1;
    if (seen === digitCount) {
      const next = index + 1;
      // A slash is not a place to keep typing. Legacy moves into the next block.
      return value[next] === "/" ? next + 1 : next;
    }
  }
  return value.length;
}

/** A slash only exists to separate digits. Never leave two slashes in a row. */
function finishDobEdit(value: string, caret: number): DobInputEdit {
  let next = "";
  let nextCaret = caret;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === "/" && next.endsWith("/")) {
      if (index < caret) nextCaret -= 1;
      continue;
    }
    next += value[index];
  }
  if (!/\d/.test(next)) return { value: "", caret: 0 };
  return {
    value: next,
    caret: Math.min(Math.max(nextCaret, 0), next.length),
  };
}

/** The slash that opens the next date part is added while typing, not deleting. */
function deletedDobEdit(value: string, caret: number): DobInputEdit {
  const edit = finishDobEdit(value, caret);
  if (!edit.value.endsWith("/")) return edit;
  const next = edit.value.slice(0, -1);
  return finishDobEdit(next, Math.min(edit.caret, next.length));
}

function packedDob(value: string) {
  const formatted = formatDobInput(value);
  return value === formatted || value === `${formatted}/`;
}

/** One new digit inserted into `rawDigits` relative to `previousDigits`. */
function insertedDigit(previousDigits: string, rawDigits: string) {
  if (rawDigits.length !== previousDigits.length + 1) return null;
  for (let index = 0; index < rawDigits.length; index += 1) {
    if (previousDigits[index] === rawDigits[index]) continue;
    if (rawDigits.slice(index + 1) === previousDigits.slice(index)) {
      return { index, digit: rawDigits[index] };
    }
    return null;
  }
  return null;
}

/**
 * Formats a DOB edit without losing the caret's logical digit position.
 * Deleting in the middle preserves the empty mask slot so retyping replaces
 * that slot, while typing into a complete date replaces instead of shifting.
 */
export function editDobInput(
  previous: string,
  raw: string,
  selectionStart: number | null,
  inputType: DobEditInputType = "insertText",
): DobInputEdit {
  const caret = selectionStart ?? raw.length;
  const previousDigits = previous.replace(/\D/g, "");
  const rawDigits = raw.replace(/\D/g, "");

  // Browsers delete a slash before the controlled mask can intervene. Match
  // legacy by retaining the slash and deleting the adjacent digit instead.
  if (
    previous.length === raw.length + 1 &&
    previous[caret] === "/" &&
    previous.slice(0, caret) + previous.slice(caret + 1) === raw
  ) {
    // Backspace on the slash that only opens the next part removes that slash.
    if (!/\d/.test(previous.slice(caret + 1))) {
      return deletedDobEdit(raw, caret);
    }
    if (inputType === "deleteContentForward") {
      const next = previous.slice(0, caret + 1) + previous.slice(caret + 2);
      return deletedDobEdit(next, caret + 1);
    }
    const digitIndex = Math.max(0, caret - 1);
    const next = previous.slice(0, digitIndex) + previous.slice(caret);
    return deletedDobEdit(next, digitIndex);
  }

  // Typing over a month, day, or year replaces that digit and steps forward.
  // Appending at the end still grows the date. A hole is not a packed value.
  const typedOver = insertedDigit(previousDigits, rawDigits);
  if (
    typedOver &&
    typedOver.index < previousDigits.length &&
    packedDob(previous) &&
    inputType !== "deleteContentBackward" &&
    inputType !== "deleteContentForward"
  ) {
    const nextDigits =
      previousDigits.slice(0, typedOver.index) +
      typedOver.digit +
      previousDigits.slice(typedOver.index + 1);
    let value = formatDobInput(nextDigits);
    let nextCaret = caretAfterDigitCount(value, typedOver.index + 1);
    const finishedPart = typedOver.index + 1 === 2 || typedOver.index + 1 === 4;
    if (finishedPart && nextCaret === value.length) {
      value = `${value}/`;
      nextCaret = value.length;
    }
    return finishDobEdit(value, nextCaret);
  }

  // Keep the hole created by a middle deletion. Compacting all remaining
  // digits would move the caret and change every date part after the edit.
  if (raw.length < previous.length && /^[\d/]*$/.test(raw)) {
    return deletedDobEdit(raw.slice(0, 10), caret);
  }

  const digitsBeforeCaret = raw.slice(0, caret).replace(/\D/g, "").length;
  let value = formatDobInput(raw);
  const digitCount = value.replace(/\D/g, "").length;
  const typingNextPart =
    inputType !== "deleteContentBackward" &&
    inputType !== "deleteContentForward" &&
    digitsBeforeCaret >= digitCount &&
    (digitCount === 2 || digitCount === 4);
  if (typingNextPart) value = `${value}/`;
  return finishDobEdit(
    value,
    typingNextPart ? value.length : caretAfterDigitCount(value, digitsBeforeCaret),
  );
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
function codeStatusError(status: number): Exclude<CodeFieldError, null> {
  const rejected =
    status >= 400 &&
    status < 500 &&
    !CODE_UNANSWERED_STATUSES.has(status);
  return rejected ? "code" : "network";
}

export function codeResponseError(
  status: number,
): Exclude<CodeFieldError, null> {
  return codeStatusError(status);
}

export function codeSubmitError(cause: unknown): Exclude<CodeFieldError, null> {
  const status = rejectionStatus(cause);
  if (status === undefined) return "network";
  return codeStatusError(status);
}

export function lightFieldClass(invalid: boolean) {
  return [
    "h-[52px] w-full rounded-[14px] border bg-[#fff] px-4 text-[16px] text-[#051b35] outline-none placeholder:text-[#8a93a3]",
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

export type SendGridEmailVerdict = {
  verdict?: string;
  suggestion?: string;
};

/** Matches login: Invalid, or Risky when SendGrid suggests a correction. */
export function sendgridEmailInvalid(data: SendGridEmailVerdict) {
  return (
    (data.verdict === "Risky" && Boolean(data.suggestion)) ||
    data.verdict === "Invalid"
  );
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

/** Blocktickets POST /promo-code/redeem. See docs/promo-code-validations.mmd. */
export const PROMO_CODE_API_ERROR_MESSAGES = {
  notFound: "Promo code not found",
  alreadyApplied: "Promo code already applied to order",
  noLongerValid: "Promo code no longer valid",
} as const;

export function promoCodeRedeemApiMessage(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const data = (error as { response?: { data?: unknown } }).response?.data;
  if (typeof data === "string" && data.trim()) return data.trim();
  if (data && typeof data === "object") {
    const record = data as {
      error?: { message?: unknown } | string;
      message?: unknown;
    };
    const nested =
      typeof record.error === "string"
        ? record.error
        : record.error?.message ?? record.message;
    if (typeof nested === "string" && nested.trim()) return nested.trim();
  }
  return undefined;
}

/** Checkout promo rejections keep the API message when present. */
export function promoCodeRejectedMessage(apiMessage?: string | null) {
  const msg = apiMessage?.trim() || "Promo code could not be applied";
  return `${msg}${/[.!?]$/.test(msg) ? " " : ". "}Please try again.`;
}

export function promoCodeRedeemDisplayMessage(error: unknown) {
  return promoCodeRejectedMessage(promoCodeRedeemApiMessage(error));
}
