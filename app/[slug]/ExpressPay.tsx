"use client";

import { createElement, useEffect, useRef, useState } from "react";
import Script from "next/script";
import Button from "@/components/atoms/Button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { TextField } from "@/components/ui/text-field";

/* The two wallet buttons above the card form.

   Apple Pay: Apple's rules say the button has to come from Apple's own API (a look-alike, or any button that shows the Apple Pay name or logo, is not allowed). So this
   loads Apple's SDK and renders its <apple-pay-button> element, black on a light page and white with an outline on a dark one, in the radius of the page's other buttons.
   Apple also says not to hide or disable it: a press while a payment is going is simply ignored. Nothing is sent to Apple here; the press goes straight to the demo payment.

   Link: Stripe's wallet. A customer saves a card once, then at any Link site types an email and Link fills in the saved details, asking for a one-time code (by SMS) on a
   new site or device. The dialog does just that, as a demo: an email, then a code (any six digits), then it pays. */

export function ApplePayButton({ dark, onPress, onShown }: { dark: boolean; onPress: () => void; onShown: (shown: boolean) => void }) {
  const ref = useRef<HTMLElement>(null);
  const press = useRef(onPress);
  press.current = onPress;
  const shown = useRef(onShown);
  shown.current = onShown;
  const [ready, setReady] = useState(false);

  /* Apple's element hides itself where Apple Pay cannot work (their rule: a real store only shows it where it works). This is a demo with no payment behind it, so the
     button is kept on show everywhere, and a press runs the demo payment. A real build would pass the hidden state on instead (`onShown`) and let Link have the row. */
  useEffect(() => {
    let live = true;
    let mo: MutationObserver | null = null;
    void customElements.whenDefined("apple-pay-button").then(() => {
      if (!live) return;
      setReady(true);
      const el = ref.current;
      if (!el) return;
      const read = () => {
        if (el.hidden || el.hasAttribute("disabled") || el.hasAttribute("aria-hidden")) { el.removeAttribute("hidden"); el.removeAttribute("disabled"); el.removeAttribute("aria-hidden"); }
        shown.current(true);
      };
      read();
      mo = new MutationObserver(read);
      mo.observe(el, { attributes: true, attributeFilter: ["hidden", "disabled"] });
    });
    const t = window.setTimeout(() => { if (live && !customElements.get("apple-pay-button")) shown.current(false); }, 8000);
    return () => { live = false; window.clearTimeout(t); mo?.disconnect(); };
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const h = () => press.current();
    el.addEventListener("click", h);
    return () => el.removeEventListener("click", h);
  }, [ready]);

  return (
    <div className="relative h-12 min-w-0 md:h-11">
      <Script src="https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js" strategy="lazyOnload" />
      {!ready && <Skeleton className="absolute inset-0 rounded-[36px]" />}
      {createElement("apple-pay-button", { ref, class: "ap-btn", buttonstyle: dark ? "white-outline" : "black", type: "plain", locale: "en-US" })}
    </div>
  );
}

export function LinkButton({ total, email, onPaid }: { total: string; email: string; onPaid: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"email" | "code">("email");
  const [mail, setMail] = useState(email);
  const [code, setCode] = useState("");
  const close = (o: boolean) => { setOpen(o); if (!o) { setStep("email"); setCode(""); } };
  const masked = mail.replace(/^(.{2}).*(@.*)$/, "$1•••$2");
  const goodMail = /^\S+@\S+\.\S+$/.test(mail.trim());

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-12 min-w-0 rounded-[36px] bg-[#00D66F] px-4 text-base font-medium text-[#0B1220] outline-none transition-[transform,background-color] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-h-focus focus-visible:ring-offset-2 focus-visible:ring-offset-h-surface active:scale-[0.97] md:h-11 md:text-[15px] [@media(hover:hover)]:hover:bg-[#00c364]"
      >
        Pay with Link
      </button>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent size="sm">
          <form noValidate onSubmit={(e) => { e.preventDefault(); if (step === "email") { if (goodMail) setStep("code"); } else if (/^\d{6}$/.test(code)) { close(false); onPaid(); } }}>
            <DialogHeader>
              <DialogTitle>Pay with Link</DialogTitle>
              <DialogDescription>{step === "email" ? "Link fills in the card you saved with Stripe. Enter your email and we will find it." : `We sent a 6-digit code to ${masked} to check it is you. This is a demo: any six digits work.`}</DialogDescription>
            </DialogHeader>
            <DialogBody>
              {step === "email" ? (
                <TextField id="pg-link-mail" type="email" label="Email" fullWidth variant="primary" size="lg" value={mail} onChange={(e) => setMail(e.target.value)} autoComplete="email" isInvalid={mail.length > 0 && !goodMail} errorMessage="Enter a full email address." />
              ) : (
                <TextField id="pg-link-code" label="Code" fullWidth variant="primary" size="lg" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" />
              )}
            </DialogBody>
            <DialogFooter>
              {step === "code" && <Button type="button" variant="secondary" onClick={() => { setStep("email"); setCode(""); }}>Change email</Button>}
              <Button type="submit" disabled={step === "email" ? !goodMail : code.length !== 6}>{step === "email" ? "Continue" : `Pay ${total}`}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
