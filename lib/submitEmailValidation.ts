import { validateEmail } from "@/lib/api";
import {
  emailSubmitError,
  normalizeEmail,
  sendgridEmailInvalid,
  type EmailFieldError,
  type SendGridEmailVerdict,
} from "@/lib/fieldValidation";

export type EmailSubmitValidationResult =
  | { ok: true; email: string }
  | { ok: false; email: string; error: EmailFieldError | "network" };

/** Blocked domain and syntax first, then SendGrid — same order as login. */
export async function validateSubmittedEmail(
  rawEmail: string,
): Promise<EmailSubmitValidationResult> {
  const email = normalizeEmail(rawEmail);
  const localError = emailSubmitError(email);
  if (localError) {
    return { ok: false, email, error: localError };
  }

  try {
    const res = await validateEmail({ email });
    if (sendgridEmailInvalid(res.data as SendGridEmailVerdict)) {
      return { ok: false, email, error: "invalid" };
    }
    return { ok: true, email };
  } catch {
    return { ok: false, email, error: "network" };
  }
}
