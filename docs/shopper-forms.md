# Shopper forms

This is how shopper-facing forms behave across the site.

In every validated form below, **the primary button stays clickable when a field is empty or mistyped**, except checkout **Apply**, which stays disabled until a promo code is entered, and transfer **Next**, which stays disabled until the recipient email is non-empty. Pressing an enabled button, or Enter in a form, checks the values that are actually in the fields right then. A request is sent only after those local checks pass.

### Blur and submit

Every validated shopper text field — email, phone, names, date of birth, access code, promo code, and the rest — follows the same contract. Profile edits do not. The donation amount is checked only on submit:

- **Idle blur (empty field):** no error. The shopper can tab away without seeing required copy.
- **Idle blur (filled field):** if what they typed is wrong, show the field’s invalid copy immediately. Whitespace-only counts as empty on blur.
- **Submit or Enter:** re-check every field from the form, whether or not blur already ran. Empty required fields show required copy. Typed-but-wrong fields show invalid copy.
- **API rejections** (wrong access code, rejected promo): the server message stays visible on blur until the shopper edits the field. Connection problems behave the same way. An existing-phone rejection does not: leaving the phone field re-runs the format check and clears that message when the number is valid.

Shared rules and copy live in `lib/fieldValidation.ts`. Login flowcharts are in `docs/login-validations.mmd`, `docs/code-validations.mmd`, and `docs/create-account-validations.mmd`. Guest checkout contact is in `docs/guest-contact-validations.mmd`. Checkout payment is in `docs/payment-validations.mmd`. Promo code is in `docs/promo-code-validations.mmd`.

Buttons still grey out when something operational is in the way: a request already in progress, an action that already succeeded, payment not ready, sold out, or no tickets selected. Apply also stays disabled with no promo code, and transfer Next stays disabled with no recipient email.

A field with an error is outlined in red only while it does not have the cursor. The moment it is focused, the outline is the brand colour (Blocktickets lime, or the org colour on an org-branded page). The error copy under the field stays.

## Sign in (email)

Shoppers type an email and press **Send my code** or Enter.

- Leave a filled, invalid email: they see “Email is invalid. Please try again.” No code is sent.
- Leave the field empty: no error until they press the button or Enter.
- Empty submit: “Email address is required.” No code is sent.
- Typed but invalid submit: same invalid-email copy as blur. No code is sent.
- Valid email: we confirm the address, then send a six-digit code.

## Six-digit code

Shoppers type the code they were sent. There is no submit button. As soon as six digits are in, the code is checked. Each box is its own field, so the cursor a shopper sees is the browser's own, sitting in the box waiting for the next digit; typing moves it forward and backspace moves it back.

- Wrong code: “Code is incorrect. Please try again.” This is what a shopper sees whenever the API rejects the code, including the 400 it returns for a code that does not match. The digits stay in the boxes so they can correct them.
- Connection problem: the technical-difficulties message, and only when the request never got a verdict on the code — offline, timed out, rate limited, or a server fault.
- Existing account: they are signed in.
- New account: they go on to create an account.

Under the boxes: a reminder that codes expire after 10 minutes so the right one is the latest one, then “Haven’t received your code? Check your spam folder or Send a new code”. Resending swaps that second line for “A new code is on its way.”

## Create account

Shoppers enter first name, last name, phone, and date of birth. The email from sign-in is shown but cannot be edited.

- Names only accept letters, spaces, apostrophes, and hyphens while typing.
- **First / last name:** empty blur is quiet. A filled name with illegal characters shows “Letters only — no digits.” on blur. Empty or whitespace-only submit shows “First name is required.” / “Last name is required.”
- **Phone:** empty blur is quiet. A partial or invalid number shows “Phone number is not valid. Please try again” on blur. Empty submit shows “Phone number is required.”
- **Date of birth:** empty blur is quiet. A filled but invalid or future date shows the format / incorrect-date copy on blur. Empty submit shows “Date of birth is required.”
- **Sign up** / Enter re-checks every field from the form. Nothing is sent until names, phone, and date of birth all pass.
- Success signs them in. A phone that already belongs to an account shows the existing-phone message.

## Guest checkout

Shoppers type email, first name, and last name, then **Continue to payment** or Enter. Flowchart: `docs/guest-contact-validations.mmd`.

- **Email:** same blur and submit rules as sign-in — empty blur is quiet; invalid email on blur or submit uses “Email is invalid. Please try again.”; empty submit uses “Email address is required.”
- **Names:** empty blur is quiet. A filled name with illegal characters shows “Letters only — no digits.” on blur. Empty or whitespace-only submit shows “First name is required.” / “Last name is required.”
- A 400 from email check or payment start stays on this form: “We could not start your checkout. Please check your details and try again.”
- Success continues into payment.

## Remind me

A sold-out offer shows **Sold out** and does not collect an email. On a scheduled offer, shoppers press **Remind me**, type an email, and press **Set reminder** or Enter.

- The button is never greyed out just because the email is empty.
- Empty blur is quiet. A filled invalid email shows invalid-email copy on blur.
- Empty submit shows “Email address is required.” and does not set a reminder.
- Typed invalid submit shows the same invalid-email copy and does not set a reminder.
- Success says the reminder is set and they will be emailed before that event goes on sale.

## Transfer email

Shoppers pick tickets first (that step stays blocked until at least one ticket is selected). A pass transfer opens on the email step. They type a recipient email and press **Next** or Enter.

- Empty blur is quiet. A filled invalid email shows invalid-email copy on blur.
- **Next** stays disabled until the email is non-empty, so that button does not show required copy for an empty field. Enter in the field still does: empty shows required copy, and a typed invalid email shows invalid-email copy. The transfer is not sent in either case.
- They cannot send tickets or a pass to their own address.
- After a valid email they confirm, then the transfer is sent.

## Donate

Shoppers pick or type an amount, optionally a name and email, then **Continue to payment** or Enter.

- The amount has no blur check. Zero or less shows “Select or enter a donation amount.” only after **Continue to payment** or Enter, and checkout does not start.
- Unless they donate anonymously, email follows the same blur and submit rules as sign-in. Name may be blank but cannot include digits while typing.
- Success opens the payment step. **Complete donation** stays blocked until Stripe is ready.

## Profile details

Name, email, phone, and address each open a **Save** box. This is not a validated form: Save stays clickable even when nothing changed, and email and phone are not checked. Save updates that row on the page and shows “{field} updated”. It does not check whether the phone is already in use, and it does not send a code.

## Promo code

Shoppers type a code at checkout and press **Apply** or Enter. Flowchart: `docs/promo-code-validations.mmd`.

- Apply is disabled when the field is empty. Empty blur is quiet.
- A rejected code shows the server message and asks them to try again. That rejection stays on blur until the shopper edits the field.
- A valid code shows the discount on the order. **Pay** still waits on Stripe and any required donation.

## Access code

Shoppers type a code to unlock a seating zone and press **Unlock seats** / **Unlock offer** or Enter.

- Empty blur is quiet. Empty submit shows “Access code is required.”
- A code that does not match shows “That code didn't match. Check with the event for the right one.” That rejection stays on blur until the shopper edits the field.
- A matching code unlocks those seats or offers. Checking stays disabled only while a check is in progress.

## Seat-delivery menu

Shoppers type row and seat, then **Continue** or Enter.

- Empty row or seat shows “Row is required.” / “Seat is required.”
- Success opens the menu for that seat. Cart pay still waits on Stripe and a non-empty cart.

## Listing price

In the sell flow, shoppers type an asking price and press **Payout summary** or Enter. Editing an existing listing uses **Save**, and Enter in that field does not submit.

- Both buttons stay clickable while a request is not already running. Empty blur is quiet.
- Empty, zero, or less on submit — and zero or less on blur — shows “Enter a price greater than 0.” and does not continue.
- When the event has a resale minimum, a price below that floor shows “Asking price must be at least {amount}.” on blur and on submit, and does not continue.
