"use client";

import { useEffect, useRef, useState } from "react";
import { Lock } from "@phosphor-icons/react";
import { Label } from "@/components/atoms/form";
import { Input, inputVariants, fieldSizes } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { loadStripe, type Stripe, type StripeElementStyle } from "@stripe/stripe-js";
import { CardCvcElement, CardExpiryElement, CardNumberElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { Skeleton } from "@/components/ui/skeleton";

/* The card form, in the same style as the login: a small label over a large library field (the `Input` look, primary, 48px), one field to a line.
   The card number, the expiry and the code are Stripe's own secure iframes (card digits may only go into Stripe's fields, with their formatting, checks, errors and
   saved-card autofill), so each sits in a box built from the library's own field classes (`inputVariants`, `fieldSizes`) and takes the same focus, invalid and valid
   looks. The postal code is the library `Input` itself. The season seats have no payment intent yet (the order is still a demo), so `submit()` makes a test payment
   method with the publishable key, which charges nothing; with a real intent, swap it for `confirmCardPayment`. */

export type CardResult = { ok: true; brand?: string; last4?: string } | { ok: false; message: string };
export type CardApi = {
  /** show what is wrong in the form and focus the first wrong field */
  touch: () => void;
  /** check the form and make a test payment method */
  submit: () => Promise<CardResult>;
};

let stripeLoader: Promise<Stripe | null> | null = null;
const getStripe = () => {
  const key = process.env.NEXT_PUBLIC_STRIPE_KEY;
  if (!key) return null;
  stripeLoader ??= loadStripe(key);
  return stripeLoader;
};

const FONTS = [{ cssSrc: "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap" }];

type RGB = [number, number, number];
const hex = ([r, g, b]: RGB) => `#${[r, g, b].map((n) => Math.round(n).toString(16).padStart(2, "0")).join("")}`;

/** the page's own tokens as plain colours (Stripe's iframes cannot read CSS variables): each token is painted on a 1px canvas, so oklch and the like come out as rgb */
function readStyle(host: HTMLElement, size: number): StripeElementStyle {
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
  host.appendChild(probe);
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  const rgb = (expr: string, fallback: RGB): RGB => {
    probe.style.color = expr;
    const c = getComputedStyle(probe).color;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#ff00ff";
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return d[3] === 0 || (d[0] === 255 && d[1] === 0 && d[2] === 255) ? fallback : [d[0], d[1], d[2]];
  };
  const fg = rgb("var(--h-field-foreground, var(--h-foreground))", [20, 20, 24]);
  const placeholder = rgb("var(--h-field-placeholder, var(--h-muted))", [140, 140, 150]);
  const danger = rgb("var(--h-danger)", [200, 50, 50]);
  host.removeChild(probe);
  return {
    base: {
      fontFamily: "Geist, system-ui, sans-serif",
      fontSize: `${size}px`,
      fontWeight: "400",
      color: hex(fg),
      iconColor: hex(placeholder),
      fontSmoothing: "antialiased",
      "::placeholder": { color: hex(placeholder), fontWeight: "400" },
    },
    invalid: { color: hex(danger), iconColor: hex(danger) },
  };
}

type Ev = { complete: boolean; empty: boolean; error?: { message: string } | undefined; brand?: string };
type Field = { complete: boolean; error: string | null; focus: boolean };
const BLANK: Field = { complete: false, error: null, focus: false };
type Look = "idle" | "focus" | "bad" | "done";

/** a Stripe field in a box that takes the library field's classes, so it looks and behaves like the `Input` next to it (the focus state comes from Stripe's focus events, since a
    focus inside an iframe cannot reach CSS) */
function FieldBox({ look, children }: { look: Look; children: React.ReactNode }) {
  return (
    <div
      data-focused={look === "focus" || undefined}
      data-invalid={look === "bad" || undefined}
      className={cn(
        inputVariants({ variant: "primary", fullWidth: true }),
        fieldSizes.lg,
        "flex items-center [&>*]:w-full",
        "data-[focused=true]:border-h-field-border-focus data-[focused=true]:bg-(--input-bg-focus) data-[focused=true]:shadow-(--field-focus)",
        look === "done" && "shadow-[inset_0_0_0_1px_var(--h-success),0_0_0_3px_color-mix(in_oklab,var(--h-success)_22%,transparent)]",
      )}
    >
      {children}
    </div>
  );
}

function Fields({ apiRef, onComplete, onProgress, onReady, dark }: { apiRef: React.MutableRefObject<CardApi | null>; onComplete: (done: boolean) => void; onProgress?: (steps: number) => void; onReady: () => void; dark: boolean }) {
  const stripe = useStripe();
  const elements = useElements();
  const host = useRef<HTMLDivElement>(null);
  const zipEl = useRef<HTMLInputElement>(null);
  const [style, setStyle] = useState<StripeElementStyle | null>(null);
  const [num, setNum] = useState<Field>(BLANK);
  const [exp, setExp] = useState<Field>(BLANK);
  const [cvc, setCvc] = useState<Field>(BLANK);
  const [zip, setZip] = useState("");
  const [touched, setTouched] = useState(false);
  const ready = useRef(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  /* the colours are read when the form mounts and again when the site's light or dark changes */
  useEffect(() => { if (host.current) setStyle(readStyle(host.current, 16)); }, [dark]);

  const zipOk = zip.trim().length >= 3;
  const all = num.complete && exp.complete && cvc.complete && zipOk;
  useEffect(() => { onCompleteRef.current(all); }, [all]);
  /* how many of the four fields are right, for a page that shows the progress */
  const steps = Number(num.complete) + Number(exp.complete) + Number(cvc.complete) + Number(zipOk);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;
  useEffect(() => { onProgressRef.current?.(steps); }, [steps]);

  const watch = (set: React.Dispatch<React.SetStateAction<Field>>) => ({
    onChange: (e: Ev) => set((p) => ({ ...p, complete: e.complete, error: e.error?.message ?? null })),
    onFocus: () => set((p) => ({ ...p, focus: true })),
    onBlur: () => set((p) => ({ ...p, focus: false })),
    onReady: () => { ready.current += 1; if (ready.current === 3) onReady(); },
  });
  const look = (f: Field): Look => (f.focus ? "focus" : f.error || (touched && !f.complete) ? "bad" : f.complete ? "done" : "idle");

  const message =
    num.error ?? exp.error ?? cvc.error ??
    (touched ? (!num.complete ? "Enter your card number." : !exp.complete ? "Enter the expiry date, month and year." : !cvc.complete ? "Enter the security code." : !zipOk ? "Enter your postal code." : null) : null);

  useEffect(() => {
    apiRef.current = {
      touch: () => {
        setTouched(true);
        if (!num.complete) elements?.getElement(CardNumberElement)?.focus();
        else if (!exp.complete) elements?.getElement(CardExpiryElement)?.focus();
        else if (!cvc.complete) elements?.getElement(CardCvcElement)?.focus();
        else if (!zipOk) zipEl.current?.focus();
      },
      submit: async () => {
        if (!stripe || !elements) return { ok: false, message: "The card form is still loading. Try again in a moment." };
        const card = elements.getElement(CardNumberElement);
        if (!card || !all) { setTouched(true); return { ok: false, message: "Check your card details." }; }
        const { error, paymentMethod } = await stripe.createPaymentMethod({ type: "card", card, billing_details: { address: { postal_code: zip.trim() } } });
        if (error) return { ok: false, message: error.message ?? "We could not check that card." };
        return { ok: true, brand: paymentMethod.card?.brand, last4: paymentMethod.card?.last4 };
      },
    };
    return () => { apiRef.current = null; };
  }, [stripe, elements, apiRef, all, num.complete, exp.complete, cvc.complete, zipOk, zip]);

  return (
    <div ref={host}>
      {style ? (
        <>
          <div className="grid gap-4">
            <div>
              <Label>Card number</Label>
              <div className="mt-1.5"><FieldBox look={look(num)}><CardNumberElement options={{ style, showIcon: true, placeholder: "1234 1234 1234 1234" }} {...watch(setNum)} /></FieldBox></div>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <Label>Expiry</Label>
                <div className="mt-1.5"><FieldBox look={look(exp)}><CardExpiryElement options={{ style, placeholder: "MM / YY" }} {...watch(setExp)} /></FieldBox></div>
              </div>
              <div>
                <Label>CVC</Label>
                <div className="mt-1.5"><FieldBox look={look(cvc)}><CardCvcElement options={{ style, placeholder: "123" }} {...watch(setCvc)} /></FieldBox></div>
              </div>
              <div>
                <Label htmlFor="pg-zip">ZIP</Label>
                <Input
                  ref={zipEl}
                  id="pg-zip"
                  size="lg"
                  value={zip}
                  onChange={(e) => setZip(e.target.value.slice(0, 10))}
                  autoComplete="postal-code"
                  placeholder="88003"
                  isValid={zipOk}
                  isInvalid={touched && !zipOk}
                  className="mt-1.5 w-full"
                />
              </div>
            </div>
          </div>
          {message ? (
            <p role="alert" className="mt-3.5 text-[13px] text-h-danger">{message}</p>
          ) : (
            <p className="mt-3.5 flex items-center gap-1.5 text-xs text-h-muted"><Lock weight="bold" className="size-3.5" aria-hidden />Card details go straight to Stripe. We never see or store them.</p>
          )}
        </>
      ) : null}
    </div>
  );
}

export default function StripeCard({ apiRef, onComplete, onProgress, dark = false }: { apiRef: React.MutableRefObject<CardApi | null>; onComplete: (done: boolean) => void; /** called with how many of the four fields are complete (0 to 4) */ onProgress?: (steps: number) => void; dark?: boolean; amount?: number }) {
  const [stripe, setStripe] = useState<Promise<Stripe | null> | null>(null);
  const [ready, setReady] = useState(false);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    const s = getStripe();
    if (!s) { setBroken(true); return; }
    setStripe(s);
    void s.then((x) => { if (!x) setBroken(true); });
  }, []);

  return (
    <div className="relative min-h-[170px]">
      {broken ? (
        <p role="alert" className="rounded-2xl bg-[color-mix(in_oklab,var(--h-danger)_12%,transparent)] px-3.5 py-2.5 text-sm text-h-danger">The card form could not load. Check your connection and refresh, or pay with a wallet above.</p>
      ) : (
        <>
          {!ready && <Skeleton className="absolute inset-x-0 top-0 h-[150px] rounded-[12px]" />}
          <div className={`transition-opacity duration-300 ${ready ? "opacity-100" : "pointer-events-none absolute inset-x-0 top-0 opacity-0"}`}>
            {stripe ? (
              <Elements stripe={stripe} options={{ fonts: FONTS }}>
                <Fields apiRef={apiRef} onComplete={onComplete} onProgress={onProgress} onReady={() => setReady(true)} dark={dark} />
              </Elements>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
