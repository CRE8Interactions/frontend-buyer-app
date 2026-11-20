import { isValidPhoneNumber } from "react-phone-number-input";
import { emailPatternMatch, isBlockedEmail, namePatternMatch } from "@/lib/helpers";

/* The shopper-forms contract for the login page: copy and checks in one place. The spec says these live in lib/fieldValidation.ts, which is not in this repo,
   so they are kept here until that module is available; swap the imports then. Source of truth: docs/*-validations.mmd. Copy those files do not give is marked GUESS. */
export const COPY = {
  emailRequired: "Email address is required.",
  emailInvalid: "Email is invalid. Please try again.",
  phoneRequired: "Phone number is required.",
  phoneInvalid: "Phone number is not valid. Please try again",
  phoneExists: "An account with this phone number already exists.", // GUESS: wording kept from the old page
  firstRequired: "First name is required.",
  lastRequired: "Last name is required.",
  lettersOnly: "Letters only — no digits.",
  codeIncorrect: "Code is incorrect. Please try again",
  technical: "We're experiencing technical difficulties. Please try again later.",
  dobRequired: "Date of birth is required.",
  dobIncorrect: "Date of birth is incorrect. Make sure it is in the correct format: MM/DD/YYYY",
} as const;

/** Submitted emails are trimmed and lowercased before they are checked or sent. */
export const normalizeEmail = (v: string) => v.trim().toLowerCase();

/** Submit rule for email: empty is "required", typed but wrong is "invalid". Whitespace counts as empty. */
export const checkEmail = (v: string): string | null => {
  const t = v.trim();
  if (!t) return COPY.emailRequired;
  if (!emailPatternMatch(t) || isBlockedEmail(t)) return COPY.emailInvalid;
  return null;
};
/** Blur rule: an empty field stays quiet, a filled wrong one shows its invalid copy at once. */
export const blurEmail = (v: string) => (v.trim() ? checkEmail(v) : null);

export const checkPhone = (v: string | undefined, required = true): string | null => {
  if (!v) return required ? COPY.phoneRequired : null;
  return isValidPhoneNumber(v) ? null : COPY.phoneInvalid;
};
export const blurPhone = (v: string | undefined) => (v ? checkPhone(v) : null);

export const checkName = (v: string, requiredCopy: string): string | null => {
  const t = v.trim();
  if (!t) return requiredCopy;
  return new RegExp(namePatternMatch).test(t) ? null : COPY.lettersOnly;
};
export const blurName = (v: string) => (v.trim() ? checkName(v, "") : null);

/** HTTP status of a failed request (undefined when it never got an answer: offline, timed out). */
export const statusOf = (err: unknown) => (err as { response?: { status?: number } })?.response?.status;
/** "No usable verdict" on the code: offline, 408, 429, 5xx or anything that is not a 4xx. Every other 4xx means the code is wrong. */
export const noVerdict = (err: unknown) => {
  const s = statusOf(err);
  return !s || s === 408 || s === 429 || s < 400 || s >= 500;
};

/** Digits typed into the date-of-birth field become MM/DD/YYYY as they go. */
export const formatDob = (raw: string) => {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
};
export const checkDob = (v: string): string | null => {
  const d = v.replace(/\D/g, "");
  if (!v.trim()) return COPY.dobRequired;
  if (d.length !== 8) return COPY.dobIncorrect;
  const [m, day, y] = [Number(d.slice(0, 2)), Number(d.slice(2, 4)), Number(d.slice(4, 8))];
  const date = new Date(y, m - 1, day);
  const real = date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === day;
  return real && date.getTime() <= Date.now() && y >= 1900 ? null : COPY.dobIncorrect;
};
export const blurDob = (v: string) => (v.trim() ? checkDob(v) : null);

/** Calls `fn`, and retries it (up to 3 tries in all, with a short pause) only when the failure is a server fault or no answer at all.
 *  For read-only calls such as the email check: the backend sometimes answers 500 once and is fine a moment later. */
export async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      const s = statusOf(err);
      const retryable = !s || s === 408 || s === 429 || s >= 500;
      if (!retryable || i === tries - 1) break;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw last;
}
