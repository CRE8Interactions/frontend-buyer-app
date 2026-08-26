---
name: shopper-field-validation
description: >-
  Use shared shopper email, phone, OTP/code, first name, and last name
  validation instead of copying regex or error strings into a page. Use when
  adding or changing an email, phone, OTP, verification code, first name, or
  last name field on login, wallet, settings, transfer, waitlist, donate, or
  any other shopper form.
---

# Shopper field validation

Do not paste email/phone/name/OTP regex or error copy into a page. Import the
shared helpers and field components.

| Need | Import |
|------|--------|
| Rules and copy | `lib/fieldValidation.ts` (`normalizeEmail`, `isBlockedEmail`, `emailPatternMatch`, `emailLooksInvalid`, `emailBlurInvalid`, `emailSubmitInvalid`, `formString`, `submittedEmail`, `nameAllows`, `nameFieldError`, `namePatternMatch`, `phoneNumberError`, `normalizeOtp`, `FIELD_COPY`) |
| Email input | `components/molecules/EmailField.tsx` |
| Name input | `components/molecules/NameField.tsx` |
| OTP / verify code | `components/molecules/CodeField.tsx` |
| Phone | `components/molecules/PhoneNumberInput.tsx` only — never a raw `PhoneInput` |

`lib/helpers.ts` re-exports the email/name helpers for existing imports. New
code should import from `lib/fieldValidation.ts`.

## Submit, blur, Enter, and autofill

1. Wrap shopper text actions in `<form noValidate onSubmit>`. Primary CTA is
   `type="submit"`. Cancel / Back are `type="button"`.
2. Field completeness never disables submit. Disable only for busy, succeeded,
   missing Stripe, sold out, no tickets selected, or unchanged settings.
3. Enter and click must run the **same** submit handler. Do not add per-input
   `onKeyDown` Enter handlers.
4. On submit, read `FormData` with `formString` / `submittedEmail` (Safari
   autofill may never update React state). Re-run full local validation on
   those values. Do not trust blur flags. Do not call the API if local checks
   fail.
5. Blur is a hint for a **non-empty** field (`emailBlurInvalid`). Empty is
   valid on idle blur and invalid on submit (`emailSubmitInvalid`).
6. Shared fields mirror native `onInput` into `onChange` so Safari `input`
   events update state. `FormData` is still the submit-time source of truth.

## Email order

1. Read the submitted/DOM value, then trim and lowercase with `normalizeEmail`.
2. `isBlockedEmail` first (disposable domains and `.ru` / `.ua`).
3. Then syntax via `emailPatternMatch` / `emailLooksInvalid`.
4. Then SendGrid `validateEmail` **only** on send-code paths (login / wallet).
   Waitlist, transfer, donate, and personal-details stay local unless that
   flow already called SendGrid.

Invalid/blocked copy is `FIELD_COPY.invalidEmail`. Network copy is
`FIELD_COPY.network`. Do not invent new strings.

## Phone

Use `PhoneNumberInput` with `phoneNumberError`. Pass `variant="light"` (login)
or `variant="dark"` (settings / wallet navy). Validation does not change with
variant.

Only client components may import `react-phone-number-input`. `lib/` code uses
`libphonenumber-js/min`; importing the React package from `lib/fieldValidation.ts`
crashes every server component that reaches it via `lib/helpers.ts`.

## Names

Use `NameField`. It already filters `onChange` with `nameAllows` so illegal
characters never enter state, and it keeps HTML `pattern` + `required` as
submit backup. Put `noValidate` on the form so custom copy wins.

Do not invent new name rules. Do not add autofill-specific stripping or extra
blur DOM sync.

## Code

Use `CodeField`. Digits only, length 6. Wrong code vs network are different
messages (`FIELD_COPY.codeIncorrect` vs `FIELD_COPY.network`). Use
`layout="boxes"` for login-style OTP and `layout="input"` for settings.

## Tests

Pair every field-behavior change with happy + failure coverage from
`DEMO_USER` / `DEMO_SESSION` in `lib/demo/fixtures.ts`. Assert copy and API
order (blocked email never hits the API; names ignore digits). Do not assert
styling.
