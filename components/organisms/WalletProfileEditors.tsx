"use client";

/**
 * Inline editors for Profile. Each one is shaped like what it edits, and opens in place under its row:
 * email and phone confirm with a six-digit code, a card takes number, expiry, security code and ZIP,
 * an address takes its parts. Nothing opens a dialog. Demo only: nothing here is sent anywhere.
 * Outcomes are logged: window.__walletDemo.log. (Code 000000 is refused, to show the error.)
 */

import { useState } from "react";
import { isValidPhoneNumber } from "libphonenumber-js";
import { Button } from "@/components/ui/button";
import { HoldButton } from "@/components/ui/hold-button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { NativeSelect } from "@/components/ui/native-select";
import { PhoneInput } from "@/components/ui/phone-input";
import { Switch } from "@/components/ui/switch";
import { demoLog } from "@/lib/walletDemo";
import type { Address } from "@/lib/walletUtils";

export type Card = { brand: string; last4: string; exp: string };
export type { Address };

const Actions = ({ children }: { children: React.ReactNode }) => <div className="flex flex-wrap items-center gap-2 pt-1">{children}</div>;

/** Email or phone: type the new value, then confirm it with a code sent to it. */
export function VerifiedEditor({
  kind, current, onSave, onCancel, onRemove,
}: { kind: "email" | "phone"; current: string; onSave: (v: string) => void; onCancel: () => void; onRemove?: () => void }) {
  const [step, setStep] = useState<"enter" | "code">("enter");
  const [value, setValue] = useState(kind === "email" ? current : undefined as string | undefined);
  const [code, setCode] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const val = value ?? "";
  const valid = kind === "email" ? /^\S+@\S+\.\S+$/.test(val.trim()) : !!val && isValidPhoneNumber(val);
  const problem = !val ? (kind === "email" ? "Email address is required." : "Phone number is required.") : !valid ? (kind === "email" ? "Email is invalid. Please try again." : "That phone number doesn’t look right.") : null;
  const sentTo = kind === "email" ? val.trim() : val;

  const send = () => { setTouched(true); if (problem) return; demoLog("profile-code-sent", { kind, to: sentTo }); setStep("code"); setCode(""); setError(null); };
  const confirm = (c: string) => {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      const bad = c === "000000";
      demoLog("profile-verify", { kind, outcome: bad ? "error" : "verified" });
      if (bad) { setError("That code didn’t match. Check it and try again."); setCode(""); return; }
      onSave(sentTo);
    }, 600);
  };

  if (step === "code") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[15px] text-ink2">We {kind === "email" ? "emailed" : "texted"} a six-digit code to <b className="font-medium text-foreground">{sentTo}</b>.</p>
        <InputOTP maxLength={6} size="lg" autoFocus inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(v) => { setCode(v); setError(null); }} onComplete={confirm} disabled={busy} aria-label="Six-digit code">
          <InputOTPGroup>{[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
        </InputOTP>
        <FieldError isVisible={!!error}>{error}</FieldError>
        <Actions>
          <Button variant="tertiary" onClick={() => setStep("enter")} disabled={busy}>Back</Button>
          <Button variant="ghost" onClick={() => { demoLog("profile-code-resent", { kind }); setError(null); }} disabled={busy}>Send a new code</Button>
        </Actions>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor={`pe-${kind}`}>{kind === "email" ? "New email" : "New mobile number"}</FieldLabel>
        {kind === "email" ? (
          <Input id={`pe-${kind}`} type="email" size="lg" autoFocus value={val} aria-invalid={touched && !!problem} onChange={(e) => setValue(e.target.value)} onBlur={() => val && setTouched(true)} onKeyDown={(e) => e.key === "Enter" && send()} />
        ) : (
          <PhoneInput id={`pe-${kind}`} size="lg" autoFocus value={value} onValueChange={setValue} aria-invalid={touched && !!problem} onKeyDown={(e) => e.key === "Enter" && send()} />
        )}
        <FieldError isVisible={touched && !!problem}>{problem}</FieldError>
        <FieldDescription>{kind === "email" ? "We’ll email a code to confirm it. Ticket transfers and sign-in codes go here." : "We’ll text a code to confirm it. Used for event-day texts and gate support."}</FieldDescription>
      </Field>
      <Actions>
        <Button onClick={send}>Send code</Button>
        <Button variant="tertiary" onClick={onCancel}>Cancel</Button>
        {onRemove && current && <HoldButton variant="danger-soft" className="ml-auto" duration={1200} holdLabel="Keep holding…" onHoldComplete={onRemove}>Hold to remove number</HoldButton>}
      </Actions>
    </div>
  );
}

const digits = (s: string) => s.replace(/\D/g, "");
const brandOf = (n: string) => (n.startsWith("4") ? "Visa" : /^5[1-5]/.test(n) || /^2[2-7]/.test(n) ? "Mastercard" : /^3[47]/.test(n) ? "Amex" : "Card");

/** A card: number, expiry, security code and ZIP, checked as you leave each field. */
export function CardEditor({ card, onSave, onRemove, onCancel }: { card: Card | null; onSave: (c: Card) => void; onRemove: () => void; onCancel: () => void }) {
  const [num, setNum] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");
  const [zip, setZip] = useState("");
  const [show, setShow] = useState(false);

  const n = digits(num);
  const errs = {
    num: n.length < 13 || n.length > 19 ? "Enter the full card number." : null,
    exp: !/^(0[1-9]|1[0-2])\/\d{2}$/.test(exp) ? "Use MM/YY." : null,
    cvc: digits(cvc).length < 3 ? "Enter the 3 or 4 digit code." : null,
    zip: digits(zip).length !== 5 ? "Enter a 5 digit ZIP." : null,
  };
  const save = () => {
    setShow(true);
    if (Object.values(errs).some(Boolean)) return;
    demoLog("profile-card", { brand: brandOf(n), last4: n.slice(-4) });
    onSave({ brand: brandOf(n), last4: n.slice(-4), exp });
  };
  const e = (k: keyof typeof errs) => show && errs[k];
  return (
    <div className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="pc-num">Card number</FieldLabel>
        <Input id="pc-num" size="lg" autoFocus inputMode="numeric" autoComplete="cc-number" placeholder="1234 1234 1234 1234" value={num} aria-invalid={!!e("num")}
          onChange={(ev) => setNum(digits(ev.target.value).slice(0, 19).replace(/(.{4})/g, "$1 ").trim())} />
        <FieldError isVisible={!!e("num")}>{errs.num}</FieldError>
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field>
          <FieldLabel htmlFor="pc-exp">Expires</FieldLabel>
          <Input id="pc-exp" size="lg" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" value={exp} aria-invalid={!!e("exp")}
            onChange={(ev) => { const d = digits(ev.target.value).slice(0, 4); setExp(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d); }} />
          <FieldError isVisible={!!e("exp")}>{errs.exp}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="pc-cvc">Security code</FieldLabel>
          <Input id="pc-cvc" size="lg" inputMode="numeric" autoComplete="cc-csc" placeholder="123" value={cvc} aria-invalid={!!e("cvc")} onChange={(ev) => setCvc(digits(ev.target.value).slice(0, 4))} />
          <FieldError isVisible={!!e("cvc")}>{errs.cvc}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="pc-zip">ZIP</FieldLabel>
          <Input id="pc-zip" size="lg" inputMode="numeric" autoComplete="postal-code" placeholder="90802" value={zip} aria-invalid={!!e("zip")} onChange={(ev) => setZip(digits(ev.target.value).slice(0, 5))} />
          <FieldError isVisible={!!e("zip")}>{errs.zip}</FieldError>
        </Field>
      </div>
      <FieldDescription>Demo only: card details are not sent anywhere.</FieldDescription>
      <Actions>
        <Button onClick={save}>{card ? "Replace card" : "Save card"}</Button>
        <Button variant="tertiary" onClick={onCancel}>Cancel</Button>
        {card && <HoldButton variant="danger-soft" className="ml-auto" duration={1200} holdLabel="Keep holding…" onHoldComplete={onRemove}>Hold to remove card</HoldButton>}
      </Actions>
    </div>
  );
}

const STATES = "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC".split(" ");

/** An address in its parts. The mailing one can simply follow billing. */
export function AddressEditor({
  address, onSave, onCancel, onRemove, sameAs,
}: { address: Address | null; onSave: (a: Address | "same") => void; onCancel: () => void; onRemove?: () => void; sameAs?: { label: string; on: boolean } }) {
  const [same, setSame] = useState(sameAs?.on ?? false);
  const [a, setA] = useState<Address>(address ?? { street: "", apt: "", city: "", state: "", zip: "" });
  const [show, setShow] = useState(false);
  const set = (k: keyof Address) => (v: string) => setA((p) => ({ ...p, [k]: v }));
  const errs = {
    street: !a.street.trim() ? "Enter a street address." : null,
    city: !a.city.trim() ? "Enter a city." : null,
    state: !a.state ? "Choose a state." : null,
    zip: digits(a.zip).length !== 5 ? "Enter a 5 digit ZIP." : null,
  };
  const save = () => {
    if (same) { demoLog("profile-address", { same: true }); onSave("same"); return; }
    setShow(true);
    if (Object.values(errs).some(Boolean)) return;
    demoLog("profile-address", { ...a });
    onSave(a);
  };
  const e = (k: keyof typeof errs) => show && errs[k];
  return (
    <div className="flex flex-col gap-4">
      {sameAs && <Switch checked={same} onCheckedChange={setSame} label={sameAs.label} aria-label={sameAs.label} />}
      {!same && (
        <>
          <Field>
            <FieldLabel htmlFor="pa-street">Street address</FieldLabel>
            <Input id="pa-street" size="lg" autoFocus autoComplete="address-line1" value={a.street} aria-invalid={!!e("street")} onChange={(ev) => set("street")(ev.target.value)} />
            <FieldError isVisible={!!e("street")}>{errs.street}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="pa-apt">Apt, suite, unit <span className="text-ink2">(optional)</span></FieldLabel>
            <Input id="pa-apt" size="lg" autoComplete="address-line2" value={a.apt} onChange={(ev) => set("apt")(ev.target.value)} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-[1fr_120px_140px]">
            <Field>
              <FieldLabel htmlFor="pa-city">City</FieldLabel>
              <Input id="pa-city" size="lg" autoComplete="address-level2" value={a.city} aria-invalid={!!e("city")} onChange={(ev) => set("city")(ev.target.value)} />
              <FieldError isVisible={!!e("city")}>{errs.city}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="pa-state">State</FieldLabel>
              <NativeSelect id="pa-state" size="lg" fullWidth autoComplete="address-level1" value={a.state} aria-invalid={!!e("state")} onChange={(ev) => set("state")(ev.target.value)}>
                <option value="">Select</option>
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </NativeSelect>
              <FieldError isVisible={!!e("state")}>{errs.state}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="pa-zip">ZIP</FieldLabel>
              <Input id="pa-zip" size="lg" inputMode="numeric" autoComplete="postal-code" value={a.zip} aria-invalid={!!e("zip")} onChange={(ev) => set("zip")(digits(ev.target.value).slice(0, 5))} />
              <FieldError isVisible={!!e("zip")}>{errs.zip}</FieldError>
            </Field>
          </div>
        </>
      )}
      <Actions>
        <Button onClick={save}>Save address</Button>
        <Button variant="tertiary" onClick={onCancel}>Cancel</Button>
        {onRemove && (address || sameAs?.on) && <HoldButton variant="danger-soft" className="ml-auto" duration={1200} holdLabel="Keep holding…" onHoldComplete={onRemove}>Hold to remove address</HoldButton>}
      </Actions>
    </div>
  );
}
