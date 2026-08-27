# Shopper forms

This is how shopper-facing forms behave across the site. Technical diagrams for the login journey live in `docs/login-validations.mmd`, `docs/code-validations.mmd`, and `docs/create-account-validations.mmd`.

In every form below, **the primary button stays clickable when a field is empty or mistyped**. Leaving a filled field can show a hint. Pressing the button or Enter always checks the values that are actually in the fields right then. A request is sent only after those local checks pass.

Buttons still grey out when something operational is in the way: a request already in progress, an action that already succeeded, payment not ready, sold out, no tickets selected, or personal details that have not changed.

## Sign in (email)

Shoppers type an email and press **Send my code** or Enter.

- Leave a filled, invalid email: they see “Email is invalid. Please try again.” No code is sent.
- Leave the field empty: no error until they press the button or Enter.
- Empty submit: “Email address is required.” No code is sent.
- Typed but invalid submit: same invalid-email copy as blur. No code is sent.
- Valid email: we confirm the address, then send a six-digit code.

## Six-digit code

Shoppers type the code they were sent. There is no submit button. As soon as six digits are in, the code is checked.

- Wrong code: “Code is incorrect. Please try again.”
- Connection problem: they see the technical-difficulties message.
- Existing account: they are signed in.
- New account: they go on to create an account.

## Create account

Shoppers enter first name, last name, phone, and date of birth. The email from sign-in is shown but cannot be edited.

- Names only accept letters, spaces, apostrophes, and hyphens while typing.
- Leaving a filled name, phone, or date of birth can show a field error. Empty fields stay quiet until **Sign up**.
- Sign up / Enter re-checks every field. Missing names, invalid phone, or missing/invalid date of birth stop the request.
- Success signs them in. A phone that already belongs to an account shows the existing-phone message.

## Guest checkout

Shoppers type email, first name, and last name, then **Continue to payment** or Enter.

- Empty submit shows “Email address is required.” and “First name is required.” / “Last name is required.” and stays on the form.
- A disposable or malformed email uses the same invalid-email copy as sign-in.
- Success continues into payment.

## Waitlist and Remind me

Shoppers type an email in the ticket modal (or the sold-out event box) and press **Join waitlist**, **Set reminder**, or **Get Notified**, or Enter.

- The button is never greyed out just because the email is empty.
- Empty submit shows “Email address is required.” and does not join.
- Typed invalid email shows invalid-email copy and does not join.
- Success confirms they will be emailed if tickets return or when sales open.

## Transfer email

Shoppers pick tickets first (that step stays blocked until at least one ticket is selected). Then they type a recipient email and press **Continue** / **Next** or Enter.

- Empty or invalid email shows required copy when empty and invalid-email copy when typed. The transfer is not sent.
- They cannot send tickets to their own address.
- After a valid email they confirm, then the transfer is sent.

## Donate

Shoppers pick or type an amount, optionally a name and email, then **Continue to payment** or Enter.

- Amount must be greater than zero.
- Unless they donate anonymously, a valid email is required. Name may be blank but cannot include digits.
- Success opens the payment step. Pay stays blocked until Stripe is ready.

## Personal details

Shoppers change email, first name, and last name.

- **Update** stays greyed out until something actually changed.
- Once dirty, it stays clickable even if the email looks wrong. Submit still blocks a bad or disposable email.
- Success shows that details were saved.

## Phone update

Shoppers enter a new phone and press **Update phone number** or Enter. Uniqueness is checked then, not when they leave the field.

- Local phone format is checked first.
- If the number is already in use they see the existing-phone copy.
- Otherwise a six-digit code is sent. Entering all six digits finishes the update.

## Promo code

Shoppers type a code at checkout and press **Apply** or Enter.

- Apply stays clickable when the field is empty. Empty submit asks them to enter a code.
- A rejected code shows the server message and asks them to try again.
- A valid code shows the discount on the order. **Pay** still waits on Stripe and any required donation.

## Access code

Shoppers type a code to unlock a seating zone and press **Unlock seats** or Enter.

- Empty or wrong codes show that the code did not match.
- A matching code unlocks those seats. Checking stays disabled only while a check is in progress.

## Seat-delivery menu

Shoppers type row and seat, then **Continue** or Enter.

- Empty row or seat shows “Row is required.” / “Seat is required.”
- Success opens the menu for that seat. Cart pay still waits on Stripe and a non-empty cart.

## Listing price

Shoppers type an asking price and press **Save** or Enter.

- Save stays clickable while a request is not already running.
- A price of zero or less shows “Enter a price greater than 0.” and is not saved.
