"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import Button from "@/components/atoms/Button";
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Autocomplete } from "@/components/ui/autocomplete";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Item, ItemContent, ItemDescription, ItemMedia } from "@/components/ui/item";
import { Kbd } from "@/components/ui/kbd";
import Arena, { EVENT_STOPS, TICKET_STOPS, type Kind } from "./Arena";

/* The box-office form, asked one question at a time while the stadium beside it is built from the answers.
   Nothing is sent anywhere yet: the last step shows the confirmation. When an endpoint exists, `send()` is the one place to call it. */

const KINDS: { id: Kind; hint: string }[] = [
  { id: "Venue", hint: "Arenas and theatres" },
  { id: "Team", hint: "Pro and junior clubs" },
  { id: "Promoter", hint: "Tours and shows" },
  { id: "Festival", hint: "Multi-day events" },
  { id: "University", hint: "Campus athletics and events" },
];
const PROVIDERS = ["Ticketmaster", "Paciolan", "SeatGeek", "In-house", "Other"];
const STEPS = 5;
const LAST = 4;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function SellStudio() {
  const uid = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<"f" | "b">("f");
  const [done, setDone] = useState(false);
  const [kind, setKind] = useState<Kind>("Venue");
  const [org, setOrg] = useState("");
  const [city, setCity] = useState("");
  const [events, setEvents] = useState(2);
  const [tickets, setTickets] = useState(3);
  const [provider, setProvider] = useState("");
  const [other, setOther] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});

  /* move focus to the thing to answer when the question changes, never on first load */
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const id = requestAnimationFrame(() => {
      const root = panel.current;
      if (!root) return;
      const el = root.querySelector<HTMLElement>("[data-autofocus], [role=slider], [role=radio][data-state=checked], [role=combobox]") ?? root.querySelector<HTMLElement>("h2");
      el?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [step, done]);

  const providerOut = provider === "Other" ? other.trim() : provider;
  const go = (n: number) => { setDir(n > step ? "f" : "b"); setErr({}); setStep(n); };
  const validate = (s: number) => {
    const e: Record<string, string> = {};
    if (s === 1 && !org.trim()) e.org = "Add the name of your organization.";
    if (s === LAST) {
      if (!name.trim()) e.name = "Tell us who we are writing to.";
      if (!EMAIL.test(email.trim())) e.email = "That email does not look right. We need one we can reply to.";
    }
    return e;
  };
  const next = () => {
    const e = validate(step);
    if (Object.keys(e).length) { setErr(e); return; }
    if (step === LAST) { send(); return; }
    go(step + 1);
  };
  const send = () => {
    /* placeholder: no backend yet. The payload is what the endpoint will receive. */
    void { kind, org, city, events: EVENT_STOPS[events], tickets: TICKET_STOPS[tickets], provider: providerOut, name, email, notes };
    setDir("f"); setDone(true);
  };
  const again = () => { setDone(false); setStep(0); setDir("b"); setOrg(""); setCity(""); setProvider(""); setOther(""); setName(""); setEmail(""); setNotes(""); setKind("Venue"); setEvents(2); setTickets(3); setErr({}); };
  const onKey = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !done && !(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); next(); } };

  const first1 = name.trim().split(" ")[0] || "there";
  const textStep = step === 1 || step === LAST;

  /* what you have chosen so far, kept in view */
  const chips: { k: string; label: string }[] = [];
  if (!done) {
    if (step >= 3) chips.push({ k: "ev", label: `${EVENT_STOPS[events]} events a year` });
    if (step >= 3) chips.push({ k: "tk", label: `${TICKET_STOPS[tickets]} tickets` });
    if (step >= 4 && providerOut) chips.push({ k: "pv", label: `Moving from ${providerOut}` });
  }

  const Team = () => (
    <Item size="sm" className="py-0">
      <ItemMedia>
        <AvatarGroup>
          <Avatar><AvatarImage src="/people/harrison-cogan.jpg" alt="Harrison Cogan" /><AvatarFallback>HC</AvatarFallback></Avatar>
          <Avatar><AvatarImage src="/people/chaz-haskins.jpg" alt="Chaz Haskins" /><AvatarFallback>CH</AvatarFallback></Avatar>
        </AvatarGroup>
      </ItemMedia>
      <ItemContent>
        <ItemDescription>A real person on our team replies, usually within one business day.</ItemDescription>
      </ItemContent>
    </Item>
  );

  return (
    <div className="sl-studio" data-done={done ? "1" : "0"}>
      <div className="sl-stage">
        <div className="sl-pulse" key={done ? "d" : step} data-zoom={step === 1 && !done ? "1" : "0"}>
          <Arena kind={kind} org={org} city={city} events={events} tickets={tickets} open={done} />
        </div>
        <ul className="sl-chips-bar" aria-label="Your setup so far">
          {chips.map((c) => <li key={c.k}><Badge variant="soft" color="accent">{c.label}</Badge></li>)}
        </ul>
      </div>

      <div className="sl-panel" ref={panel} onKeyDown={onKey}>
        {!done ? (
          <>
            <Progress size="sm" value={((step + 1) / STEPS) * 100} label={`Step ${step + 1} of ${STEPS}`} aria-label={`Question ${step + 1} of ${STEPS}`} />

            <div className="sl-q" key={step} data-dir={dir}>
              {step === 0 && (
                <>
                  <h2 tabIndex={-1}>What are you?</h2>
                  <RadioGroup layout="card" value={kind} onValueChange={(v) => setKind(v as Kind)} aria-label="What kind of organization are you?" className="grid grid-cols-1 gap-3 sm:grid-cols-2 [&>[data-slot=radio-field]]:mt-0 sm:[&>:last-child:nth-child(odd)]:col-span-2">
                    {KINDS.map(({ id, hint }) => <RadioGroupItem key={id} value={id} id={`${uid}-${id}`} label={id} description={hint} />)}
                  </RadioGroup>
                </>
              )}

              {step === 1 && (
                <>
                  <h2 tabIndex={-1}>What is it called?</h2>
                  <div className="sl-fields">
                    <Field>
                      <Label htmlFor={`${uid}-org`}>Organization name</Label>
                      <Input id={`${uid}-org`} data-autofocus value={org} onChange={(e) => { setOrg(e.target.value); if (err.org) setErr({}); }} placeholder="Aggie Memorial Stadium" autoComplete="organization" maxLength={48} isInvalid={!!err.org} aria-describedby={err.org ? `${uid}-org-e` : undefined} />
                      {err.org ? <FieldError id={`${uid}-org-e`}>{err.org}</FieldError> : <FieldDescription>It goes on the banner over the stadium as you type.</FieldDescription>}
                    </Field>
                    <Field>
                      <Label htmlFor={`${uid}-city`}>City</Label>
                      <Input id={`${uid}-city`} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Las Cruces, NM" autoComplete="address-level2" maxLength={40} />
                    </Field>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h2 tabIndex={-1}>How big is your box office?</h2>
                  <div className="sl-fields sl-vol">
                    <div role="group" aria-label="Events a year">
                      <div className="sl-big"><span key={events} className="sl-num" aria-live="polite">{EVENT_STOPS[events]}</span><span className="sl-unit">events a year</span></div>
                      <Slider value={[events]} min={0} max={7} step={1} showSteps onValueChange={(v) => setEvents(v[0])} />
                    </div>
                    <div role="group" aria-label="Tickets a year">
                      <div className="sl-big"><span key={tickets} className="sl-num" aria-live="polite">{TICKET_STOPS[tickets]}</span><span className="sl-unit">tickets a year</span></div>
                      <Slider value={[tickets]} min={0} max={7} step={1} showSteps onValueChange={(v) => setTickets(v[0])} />
                    </div>
                  </div>
                  <p className="sl-help">A rough count is fine. Tickets are across all of those events.</p>
                </>
              )}

              {step === 3 && (
                <>
                  <h2 tabIndex={-1}>Who sells your tickets today?</h2>
                  <Autocomplete
                    aria-label="Current ticketing provider"
                    placeholder="Choose your provider"
                    searchPlaceholder="Search providers"
                    fullWidth
                    value={provider}
                    onChange={(v) => setProvider(typeof v === "string" ? v : v[0] ?? "")}
                    items={PROVIDERS.map((p) => ({ value: p, label: p === "Other" ? "Other (type it in)" : p }))}
                  />
                  {provider === "Other" && (
                    <Field>
                      <Label htmlFor={`${uid}-oth`}>Which one?</Label>
                      <Input id={`${uid}-oth`} data-autofocus value={other} onChange={(e) => setOther(e.target.value)} placeholder="Name of your current provider" maxLength={40} />
                    </Field>
                  )}
                  <p className="sl-help">Optional. Skip it if you are starting fresh.</p>
                </>
              )}

              {step === LAST && (
                <>
                  <h2 tabIndex={-1}>Where do we send pricing?</h2>
                  <div className="sl-fields">
                    <Field>
                        <Label htmlFor={`${uid}-name`}>Your name</Label>
                        <Input id={`${uid}-name`} data-autofocus value={name} onChange={(e) => { setName(e.target.value); if (err.name) setErr((x) => ({ ...x, name: "" })); }} placeholder="Alex Rivera" autoComplete="name" isInvalid={!!err.name} aria-describedby={err.name ? `${uid}-name-e` : undefined} />
                        {err.name && <FieldError id={`${uid}-name-e`}>{err.name}</FieldError>}
                    </Field>
                    <Field>
                        <Label htmlFor={`${uid}-mail`}>Work email</Label>
                        <Input id={`${uid}-mail`} type="email" inputMode="email" value={email} onChange={(e) => { setEmail(e.target.value); if (err.email) setErr((x) => ({ ...x, email: "" })); }} placeholder="you@venue.com" autoComplete="email" isInvalid={!!err.email} aria-describedby={err.email ? `${uid}-mail-e` : undefined} />
                        {err.email && <FieldError id={`${uid}-mail-e`}>{err.email}</FieldError>}
                    </Field>
                    <Field>
                      <Label htmlFor={`${uid}-notes`}>Anything we should know? <span className="sl-opt">Optional</span></Label>
                      <Textarea id={`${uid}-notes`} className="min-h-[80px]" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contract dates, on-sale timing, pain points" />
                    </Field>
                  </div>
                </>
              )}
            </div>

            <Team />
            <div className="sl-actions">
              {step > 0 ? <Button variant="ghost" onClick={() => go(step - 1)}><ArrowLeft weight="bold" aria-hidden />Back</Button> : <span />}
              <span className="sl-go">
                {textStep && <span className="sl-enter" aria-hidden="true"><Kbd>Enter</Kbd> to continue</span>}
                <Button onClick={next}>{step === LAST ? "Send it over" : "Continue"}<ArrowRight weight="bold" aria-hidden /></Button>
              </span>
            </div>
          </>
        ) : (
          <div className="sl-done" data-dir="f">
            <h2 tabIndex={-1}>Got it, {first1}.</h2>
            <p className="sl-help">We will email {email.trim() || "your inbox"} within one business day with pricing for {org.trim() || "your organization"}.</p>
            <div className="sl-ticket" role="group" aria-label="Your partner ticket">
              <div className="sl-tmain">
                <span className="sl-tkind">{kind}</span>
                <strong>{org.trim() || "Your organization"}</strong>
                <span>{city.trim() || "Your city"}</span>
              </div>
              <div className="sl-tstub">
                <dl>
                  <div><dt>Events</dt><dd>{EVENT_STOPS[events]}</dd></div>
                  <div><dt>Tickets</dt><dd>{TICKET_STOPS[tickets]}</dd></div>
                  {providerOut && <div><dt>Moving from</dt><dd>{providerOut}</dd></div>}
                </dl>
              </div>
            </div>
            <Team />
            <div className="sl-actions sl-actions-done">
              <Button variant="ghost" onClick={again}><ArrowLeft weight="bold" aria-hidden />Submit another</Button>
              <Button href="/browse">Browse events<ArrowRight weight="bold" aria-hidden /></Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
