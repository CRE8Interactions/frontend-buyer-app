# Shopper forms

This is how shopper-facing forms behave across the site.

In every form below, **the primary button stays clickable when a field is empty or mistyped**. Pressing the button or Enter always checks the values that are actually in the fields right then. A request is sent only after those local checks pass.

### Blur and submit (all text fields)

Every shopper text field — email, phone, names, date of birth, access code, promo code, and the rest — follows the same contract:

- **Idle blur (empty field):** no error. The shopper can tab away without seeing required copy.
- **Idle blur (filled field):** if what they typed is wrong, show the field’s invalid copy immediately. Whitespace-only counts as empty on blur.
- **Submit or Enter:** re-check every field from the form, whether or not blur already ran. Empty required fields show required copy. Typed-but-wrong fields show invalid copy.
- **API rejections** (wrong access code, rejected promo, existing phone): the server message stays visible on blur until the shopper edits the field. Connection problems behave the same way.

Shared rules and copy live in `lib/fieldValidation.ts`. Login flowcharts are in `docs/login-validations.mmd`, `docs/code-validations.mmd`, and `docs/create-account-validations.mmd`.

Buttons still grey out when something operational is in the way: a request already in progress, an action that already succeeded, payment not ready, sold out, no tickets selected, or personal details that have not changed.

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

Shoppers type email, first name, and last name, then **Continue to payment** or Enter.

- **Email:** same blur and submit rules as sign-in — empty blur is quiet; invalid email on blur or submit uses “Email is invalid. Please try again.”; empty submit uses “Email address is required.”
- **Names:** empty blur is quiet. A filled name with illegal characters shows “Letters only — no digits.” on blur. Empty or whitespace-only submit shows “First name is required.” / “Last name is required.”
- Success continues into payment.

## Waitlist and Remind me

Shoppers type an email in the ticket modal (or the sold-out event box) and press **Join waitlist**, **Set reminder**, or **Get Notified**, or Enter.

- The button is never greyed out just because the email is empty.
- Empty blur is quiet. A filled invalid email shows invalid-email copy on blur.
- Empty submit shows “Email address is required.” and does not join.
- Typed invalid submit shows the same invalid-email copy and does not join.
- Success confirms they will be emailed if tickets return or when sales open.

## Transfer email

Shoppers pick tickets first (that step stays blocked until at least one ticket is selected). Then they type a recipient email and press **Continue** / **Next** or Enter.

- Empty blur is quiet. A filled invalid email shows invalid-email copy on blur.
- Empty submit shows required copy. Typed invalid submit shows invalid-email copy. The transfer is not sent in either case.
- They cannot send tickets to their own address.
- After a valid email they confirm, then the transfer is sent.

## Donate

Shoppers pick or type an amount, optionally a name and email, then **Continue to payment** or Enter.

- Amount must be greater than zero.
- Unless they donate anonymously, email follows the same blur and submit rules as sign-in. Name may be blank but cannot include digits while typing.
- Success opens the payment step. Pay stays blocked until Stripe is ready.

## Personal details

Shoppers change email, first name, and last name.

- **Update** stays greyed out until something actually changed.
- Once dirty, it stays clickable even if the email looks wrong. Email uses the same empty-quiet / invalid-on-blur / full re-check on submit pattern as sign-in.
- Success shows that details were saved.

## Phone update

Shoppers enter a new phone and press **Update phone number** or Enter. Uniqueness is checked on submit, not when they leave the field.

- Empty blur is quiet. Format and required checks run on submit.
- If the number is already in use they see the existing-phone copy.
- Otherwise a six-digit code is sent. Entering all six digits finishes the update.

## Promo code

Shoppers type a code at checkout and press **Apply** or Enter.

- Apply stays clickable when the field is empty. Empty blur is quiet.
- Empty submit shows “Enter a promo code.”
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

Shoppers type an asking price and press **Save** or Enter.

- Save stays clickable while a request is not already running.
- A price of zero or less shows “Enter a price greater than 0.” and is not saved.
