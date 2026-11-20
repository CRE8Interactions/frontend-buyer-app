"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Label } from "@/components/atoms/form";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Spinner } from "@/components/ui/spinner";
import { Check } from "@phosphor-icons/react";
import { DateField } from "@/components/ui/date-field";
import { Kbd } from "@/components/ui/kbd";
import { Link } from "@/components/ui/link";
import { InputOTP, InputOTPGroup, InputOTPSlot, REGEXP_ONLY_DIGITS } from "@/components/ui/input-otp";
import Button from "@/components/atoms/Button";
import TicketWall from "./TicketWall";
import { completeDomains, suggestEmail } from "./emailTypo";
import ThemeSwitch from "./ThemeSwitch";
import { ArrowRight } from "@/components/atoms/icons";
import {
  verifyUser,
  verifyCode,
  createNewUser,
  validateEmail,
} from "@/lib/api";
import { setSession, getLastKnown, isLoggedIn, type AuthSession } from "@/lib/auth";
import { namePatternMatch } from "@/lib/helpers";
import { COPY, blurDob, blurEmail, blurName, blurPhone, checkDob, checkEmail, checkName, checkPhone, noVerdict, normalizeEmail, statusOf, withRetry } from "./validation";

const CODE_LENGTH = 6;

type Choice = "email" | "phone-number";

function redirectAfterAuth(fromParam: string | null) {
  const lastKnown = getLastKnown();
  // Prefer lastKnown when it keeps query params (e.g. cartId) that `from` dropped.
  let from = fromParam || lastKnown || "/browse/";
  if (
    fromParam &&
    lastKnown &&
    !fromParam.includes("?") &&
    lastKnown.includes("?") &&
    lastKnown.startsWith(fromParam.split("?")[0])
  ) {
    from = lastKnown;
  }
  setTimeout(() => {
    document.cookie = "bt-session=1; path=/; max-age=2592000; samesite=lax"; // demo session read by /wallet
    window.location.href = from.startsWith("/") ? from : `/${from}`;
  }, 500);
}

const parseDob = (v: string) => {
  const d = v.replace(/\D/g, "");
  return d.length === 8 ? new Date(Number(d.slice(4)), Number(d.slice(0, 2)) - 1, Number(d.slice(2, 4))) : undefined;
};
const toDob = (d: Date) => `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;

export default function LoginClient() {
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from");

  const [step, setStep] = useState(0);
  // Landing on the login page means signed out: clear the demo session.
  useEffect(() => { document.cookie = "bt-session=; path=/; max-age=0; samesite=lax"; }, []);
  const [choice, setChoice] = useState<Choice>("email");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState<string | undefined>();
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [keptEmail, setKeptEmail] = useState("");
  // errors: `errs` are the local checks (re-run on blur), `apiErrs` are server answers that stay until that field is edited
  const [errs, setErrs] = useState<Record<string, string | null>>({});
  const [apiErrs, setApiErrs] = useState<Record<string, string | null>>({});
  const [focused, setFocused] = useState<string | null>(null);
  const [codeErr, setCodeErr] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [resent, setResent] = useState(false);
  const [done, setDone] = useState(false);

  // phones get the medium control sizes (the page switches at the same 640px as the glass sheet in styles.ts)
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const read = () => setCompact(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);
  const sz = compact ? "md" : "lg";

  const setErr = (k: string, msg: string | null) => setErrs((e) => ({ ...e, [k]: msg }));
  const setApiErr = (k: string, msg: string | null) => setApiErrs((e) => ({ ...e, [k]: msg }));
  /** the message a field shows: a server answer wins until the field is edited */
  const errOf = (k: string) => apiErrs[k] ?? errs[k] ?? null;
  /** red outline only while the field does not have the cursor (focused, it takes the brand colour) */
  const outlined = (k: string) => Boolean(errOf(k)) && focused !== k;
  const edited = (k: string) => { setErr(k, null); setApiErr(k, null); setFormErr(null); setResent(false); };
  

  const destinationLabel = choice === "email" ? email : phoneNumber;

  /** sends the six-digit code; true when it went out. `to` is what was in the field at submit. */
  const sendCode = async (to?: { email?: string; phone?: string }) => {
    setIsSaving(true);
    try {
      await verifyUser({
        data: {
          phoneNumber: choice === "email" ? "" : to?.phone ?? phoneNumber ?? "",
          email: choice === "email" ? to?.email ?? email : "",
        },
      });
      setStep(1);
      return true;
    } catch (err) {
      console.warn("[login] sending the code failed", { endpoint: "POST /verifies", status: statusOf(err) ?? "no response", err });
      // POST /verifies: anything but 200 is "technical difficulties" (docs/login-validations.mmd)
      if (step === 1) setCodeErr(COPY.technical); else setApiErr("email", COPY.technical);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // a "did you mean" for typos, checked offline while typing. Advice only: "Keep mine" always works, because the emailed code is what proves the address is real.
  // it waits for a pause in typing (or for the field to lose focus) so it never pops up while the address is still being written
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    setSettled(false);
    const t = window.setTimeout(() => setSettled(true), 1000);
    return () => window.clearTimeout(t);
  }, [email]);
  // after an "@": the likeliest domain is written in grey inside the field; Tab, the right arrow, or a tap on it finishes the address
  const ghost = (() => {
    if (focused !== "email" || errOf("email") || !email.includes("@")) return "";
    const typed = email.slice(email.lastIndexOf("@") + 1);
    if (!typed) return ""; // nothing yet after the "@": no default guess, wait for the first letter
    const best = completeDomains(email, 1)[0];
    return best ? best.slice(typed.length) : "";
  })();
  const acceptGhost = () => { setEmail(email + ghost); edited("email"); document.getElementById("email")?.focus(); };

  const rawSuggestion = !errOf("email") && email.includes("@") && email !== keptEmail ? suggestEmail(email) : null;
  const suggestion = settled || focused !== "email" ? rawSuggestion : null;

  const submitEmailStep = async (form: HTMLFormElement) => {
    // the value that is in the field right now (autofill can fill it without the page hearing about it)
    const v = normalizeEmail(String(new FormData(form).get("email") ?? ""));
    setEmail(v);
    const err = checkEmail(v);
    setErr("email", err);
    if (err) return;
    if (v !== keptEmail && suggestEmail(v)) { setSettled(true); return; } // the suggestion row shows: use it or keep the address first
    // Backend decision: with an auth token present the email check is skipped (the route answers 500 to a request that carries a token).
    // Otherwise confirm the address first (POST /registration/validate-email): 200 Valid goes on; 200 Invalid, Risky with a suggestion, and 402 are "invalid";
    // 400, 500 or any other failure is "technical difficulties" and stays until the field is edited (docs/login-validations.mmd)
    setIsSaving(true);
    if (!isLoggedIn()) {
      try {
        const data = (await withRetry(() => validateEmail({ email: v }))).data as { verdict?: string; suggestion?: string };
        if (data?.verdict === "Invalid" || (data?.verdict === "Risky" && data?.suggestion)) {
          setErr("email", COPY.emailInvalid);
          setIsSaving(false);
          return;
        }
      } catch (err) {
        console.warn("[login] address check failed", { endpoint: "POST /registration/validate-email", status: statusOf(err) ?? "no response", err });
        if (statusOf(err) === 402) setErr("email", COPY.emailInvalid); else setApiErr("email", COPY.technical);
        setIsSaving(false);
        return;
      }
    }
    await sendCode({ email: v });
  };

  const verifyUserCode = async (fullCode: string) => {
    setCodeErr(null);
    try {
      const res = await verifyCode({ data: { code: fullCode } });
      if (res.status === 200) {
        setDone(true);
        setSession(res.data as AuthSession);
        setTimeout(() => redirectAfterAuth(fromParam), 1400); // long enough to read "You're in"
      } else if (res.status === 203) {
        setStep(2);
      }
    } catch (err) {
      // only "no verdict" is a connection problem; any answer from the API, the 400 for a wrong code included, means the code is incorrect
      setCodeErr(noVerdict(err) ? COPY.technical : COPY.codeIncorrect);
    }
  };

  // the library OTP input owns focus, paste and backspace; the code stays an array so the resets above keep working
  const onCodeChange = (v: string) => {
    setCodeErr(null);
    setResent(false);
    setCode(Array.from({ length: CODE_LENGTH }, (_, i) => v[i] ?? ""));
  };

  const resend = async () => {
    const ok = choice === "email" ? await sendCode() : await sendCode();
    if (ok) setResent(true);
  };

  const submitRegistration = async (form: HTMLFormElement) => {
    const fd = new FormData(form);
    const first = String(fd.get("firstName") ?? "");
    const last = String(fd.get("lastName") ?? "");
    setFirstName(first);
    setLastName(last);
    const birth = dob;
    const e = {
      first: checkName(first, COPY.firstRequired),
      last: checkName(last, COPY.lastRequired),
      phone: checkPhone(phoneNumber),
      dob: checkDob(birth),
      email: checkEmail(email), // from step 0, re-checked on submit
    };
    setErrs((x) => ({ ...x, ...e }));
    if (e.first || e.last || e.phone || e.dob || e.email) return;
    const mail = email;

    setIsSaving(true);
    setFormErr(null);
    try {
      const res = await createNewUser({
        data: { email: mail, firstName: first.trim(), lastName: last.trim(), phoneNumber: phoneNumber ?? "", dob: birth },
      });
      if (res.status === 200) {
        setDone(true);
        setSession(res.data as AuthSession);
        setTimeout(() => redirectAfterAuth(fromParam), 1400); // long enough to read "You're in"
        return;
      }
      if (res.status === 226) setErr("phone", COPY.phoneExists);
    } catch (err) {
      setFormErr(COPY.technical); // POST /verifies/newUser: anything but 200 or 226 is "technical difficulties"
    } finally {
      setIsSaving(false);
    }
  };

  const nameOk = (value: string) =>
    !value || new RegExp(namePatternMatch).test(value);

  const headline =
    step === 0
      ? "Your seat\u2019s waiting."
      : step === 1
        ? choice === "email" ? "Check your inbox." : "Check your phone."
        : done ? "You\u2019re in." : "Almost seated.";
  const subline =
    step === 0
      ? "Log in for your tickets, transfers and wallet. No password, just a code."
      : step === 1
        ? "One code and you\u2019re through."
        : done ? "Your account is ready." : "Two more details and your seat is yours.";

  const back = () => {
    setStep((s) => s - 1);
    setCode(Array(CODE_LENGTH).fill(""));
    setCodeErr(null);
    setDone(false);
  };

  return (
    <div className="lg-wrap">
      <section className="lg-stage" data-done={done ? "1" : "0"}>
        <TicketWall />
        <a href="/browse" className="lg-logo" aria-label="blocktickets home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/blocktickets-logo.svg" alt="blocktickets" className="lg-logo-d" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/blocktickets-logo-navy.svg" alt="" aria-hidden className="lg-logo-l" />
        </a>

        <div className="lg-main" aria-live="polite">
          <h1 key={headline} className="lg-h1 lg-in">{headline}</h1>
          <p key={subline} className="lg-sub lg-in" style={{ animationDelay: "90ms" }}>{subline}</p>

          <div className="lg-form">
            {done ? (
              <div key="done" className="lg-done lg-in" style={{ animationDelay: "160ms" }} role="status">
                <span className="grid size-14 place-items-center rounded-full bg-h-success text-black"><Check weight="bold" className="size-7" /></span>
                <p className="text-lg text-h-muted">Welcome{firstName.trim() ? `, ${firstName.trim()}` : ""}.</p>
                <span className="flex items-center gap-2 text-sm text-h-muted"><Spinner size="sm" /> Taking you to your seat</span>
              </div>
            ) : (
            <div key={`${step}-${choice}`} className="lg-in" style={{ animationDelay: "160ms" }}>
              {step === 0 && (
                <form noValidate onSubmit={(e) => { e.preventDefault(); void submitEmailStep(e.currentTarget); }}>
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative mt-2">
                  <Input size={sz} id="email" name="email" type="email" autoFocus autoComplete="email" value={email} placeholder="you@email.com" className="w-full"
                    aria-invalid={outlined("email") || undefined}
                    onFocus={() => setFocused("email")}
                    onKeyDown={(e) => { if (ghost && (e.key === "Tab" || e.key === "ArrowRight" || e.key === "End") && !e.shiftKey && (e.currentTarget.selectionStart ?? e.currentTarget.value.length) === e.currentTarget.value.length) { e.preventDefault(); acceptGhost(); } }}
                    onChange={(e) => { setEmail(e.target.value); edited("email"); }}
                    onBlur={(e) => { setFocused(null); setErr("email", blurEmail(e.target.value)); }} />
                    {ghost && (
                      <span aria-hidden className={`lg-ghost ${compact ? "px-3 text-base" : "px-4 text-lg"}`}>
                        <span className="invisible">{email}</span>
                        <span className="lg-ghost-s" onMouseDown={(e) => e.preventDefault()} onClick={acceptGhost}>{ghost}</span>
                      </span>
                    )}
                    {ghost && (
                      <span className="lg-accept">
                        <span className="lg-accept-key" aria-hidden><Kbd keys={["tab"]} /></span>
                        <Button type="button" variant="secondary" size="sm" className="lg-accept-btn" onMouseDown={(e) => e.preventDefault()} onClick={acceptGhost}>
                          Use {email.slice(email.lastIndexOf("@") + 1) + ghost}
                        </Button>
                      </span>
                    )}
                  </div>
                  {!errOf("email") && !suggestion && <p className="lg-hint">Use a real email you can open. Your tickets are sent there.</p>}
                  {suggestion && (
                    <div className="lg-suggest" role="status">
                      <p className="lg-suggest-q">Did you mean</p>
                      <p className="lg-suggest-a">{suggestion.slice(0, suggestion.lastIndexOf("@") + 1)}<em>{suggestion.slice(suggestion.lastIndexOf("@") + 1)}</em>?</p>
                      <div className="lg-suggest-actions">
                        <Button type="button" variant="secondary" size="sm" onClick={() => { setEmail(suggestion); setKeptEmail(""); }}>Yes, use it</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setKeptEmail(email)}>No, keep mine</Button>
                      </div>
                    </div>
                  )}
                  {errOf("email") && <p className="lg-err" role="alert">{errOf("email")}</p>}
                  <Button type="submit" size={sz} disabled={isSaving} className="mt-4 w-full disabled:cursor-not-allowed disabled:opacity-40">
                    {isSaving ? "Sending…" : "Send my code"} <ArrowRight />
                  </Button>
                </form>
              )}

              {step === 1 && (
                <>
                  <p className="lg-title" id="code-label">Enter the {CODE_LENGTH}-digit code</p>
                  <p className="lg-copy break-words text-center">Sent to <span className="font-semibold text-foreground">{destinationLabel}</span></p>
                  <InputOTP size={sz} maxLength={CODE_LENGTH} pattern={REGEXP_ONLY_DIGITS} value={code.join("")} onChange={onCodeChange}
                    onComplete={(v) => void verifyUserCode(v)} isInvalid={Boolean(codeErr)} autoFocus autoComplete="one-time-code" inputMode="numeric"
                    aria-labelledby="code-label" containerClassName="mt-6">
                    <InputOTPGroup className="w-full justify-center">
                      {Array.from({ length: CODE_LENGTH }, (_, i) => <InputOTPSlot key={i} index={i} aria-label={`Digit ${i + 1}`} />)}
                    </InputOTPGroup>
                  </InputOTP>
                  {codeErr && <p className="lg-err text-center" role="alert">{codeErr}</p>}
                  <p className="lg-copy mt-5 text-center">Codes expire after 10 minutes, so the right one is the latest one.</p>
                  <p className="lg-copy mt-1 text-center">
                    {resent ? <span className="font-semibold text-foreground">A new code is on its way.</span> : (
                      <>Haven&rsquo;t received your code?{choice === "email" ? " Check your spam folder or" : ""}{" "}
                        <button type="button" disabled={isSaving} onClick={() => void resend()} className="font-semibold text-foreground underline underline-offset-4">send a new code</button></>
                    )}
                  </p>
                  <div className="lg-center"><Button type="button" variant="ghost" size="md" onClick={back}>← Back</Button></div>
                </>
              )}

              {step === 2 && (
                <form noValidate onSubmit={(e) => { e.preventDefault(); void submitRegistration(e.currentTarget); }}>
                  <p className="lg-title">Nice to meet you</p>
                  <p className="lg-copy text-center">Your tickets will be sent to the contact you just verified.</p>
                  <div className="lg-grid mt-6">
                    <div>
                      <Label htmlFor="firstName">First name</Label>
                      <Input size={sz} id="firstName" name="firstName" autoComplete="given-name" autoFocus value={firstName} placeholder="First name" className="mt-2"
                        aria-invalid={outlined("first") || undefined}
                        onFocus={() => setFocused("first")}
                        onChange={(e) => { const v = e.target.value; if (nameOk(v)) { setFirstName(v); edited("first"); } }}
                        onBlur={(e) => { setFocused(null); setErr("first", blurName(e.target.value)); }} />
                      {errOf("first") && <p className="lg-err" role="alert">{errOf("first")}</p>}
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last name</Label>
                      <Input size={sz} id="lastName" name="lastName" autoComplete="family-name" value={lastName} placeholder="Last name" className="mt-2"
                        aria-invalid={outlined("last") || undefined}
                        onFocus={() => setFocused("last")}
                        onChange={(e) => { const v = e.target.value; if (nameOk(v)) { setLastName(v); edited("last"); } }}
                        onBlur={(e) => { setFocused(null); setErr("last", blurName(e.target.value)); }} />
                      {errOf("last") && <p className="lg-err" role="alert">{errOf("last")}</p>}
                    </div>
                    <p className="lg-verified"><span>Email</span><b className="break-all">{email}</b><i>Verified</i></p>
                    {errOf("email") && <p className="lg-err" role="alert">{errOf("email")}</p>}
                    <div>
                      <Label htmlFor="reg-phone">Mobile number</Label>
                      <div className="mt-2" onFocusCapture={() => setFocused("phone")}
                        onBlurCapture={() => { setFocused(null); setErr("phone", blurPhone(phoneNumber)); }}>
                        <PhoneInput id="reg-phone" size={sz} defaultCountry="US" value={phoneNumber}
                          isInvalid={outlined("phone") || undefined}
                          onValueChange={(value) => { setPhoneNumber(value); edited("phone"); }} />
                      </div>
                      {errOf("phone") && <p className="lg-err" role="alert">{errOf("phone")}</p>}
                    </div>
                    <div>
                      <Label htmlFor="dob">Date of birth</Label>
                      <div className="mt-2"><DateField size={sz} id="dob" name="dob" autoComplete="bday" max={new Date()} presets={false} numeric captionLayout="dropdown" defaultMonth={new Date(2000, 0)}
                        value={parseDob(dob)} placeholder="MM/DD/YYYY"
                        isInvalid={outlined("dob") || undefined}
                        onFocus={() => setFocused("dob")}
                        onBlur={() => setFocused(null)}
                        onValueChange={(d) => { const v = d ? toDob(d) : ""; setDob(v); edited("dob"); setErr("dob", blurDob(v)); }} /></div>
                      {errOf("dob") && <p className="lg-err" role="alert">{errOf("dob")}</p>}
                    </div>
                  </div>
                  {formErr && <p className="lg-err" role="alert">{formErr}</p>}
                  <Button type="submit" size={sz} className="mt-5 w-full disabled:cursor-not-allowed disabled:opacity-40" disabled={isSaving}>
                    {isSaving ? "Signing up…" : "Continue"} <ArrowRight />
                  </Button>
                  <div className="lg-center"><Button type="button" variant="ghost" size="md" onClick={back}>← Back</Button></div>
                </form>
              )}
            </div>
            )}
          </div>
        </div>

        <div className="lg-bottom">
          <p className="lg-foot text-[13px] text-h-muted">
            {done ? null : (
              <span>By continuing you agree to the blocktickets <Link href="/terms-conditions" showAnchorIcon className="text-h-muted">terms</Link> and <Link href="/privacy-policy" showAnchorIcon className="text-h-muted">privacy policy</Link>.</span>
            )}
          </p>
          <ThemeSwitch />
        </div>
      </section>
    </div>
  );
}
