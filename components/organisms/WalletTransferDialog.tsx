"use client";

/**
 * Transfer flow (ticket and pass): select -> recipient -> confirm -> sent, with every
 * validation and server outcome of the live app. Demo recipients trigger each error:
 * scanned@, pending@, blocked@, risky@, fail@, down@ (and your own email). Outcomes are
 * logged: window.__walletDemo.log
 */

import { useState } from "react";
import { PaperPlaneTilt } from "@phosphor-icons/react";
import { Alert, AlertContent, AlertDescription, AlertIndicator } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { HoldButton } from "@/components/ui/hold-button";
import { Field, FieldLabel } from "@/components/ui/field";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { AnimatePresence, useMotionValue } from "framer-motion";
import { Avatar, AvatarFallback, AvatarMarble } from "@/components/ui/avatar";
import { Collapse, FlowContext, FlowShell, HandOff, RecipientBubble, SeatPicker, StubCard, Terms, Tracker, splitSeat } from "@/components/organisms/WalletFlow";
import { demoLog, ticketsFor, type WalletEvent } from "@/lib/walletDemo";
import { transferOutcome, type TransferKind } from "@/lib/walletUtils";

const initialsOf = (n: string) => (n.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("") || "?").toUpperCase();

const validEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim());

export default function WalletTransferDialog({
  open, kind = "ticket", event, passName, ownEmail, ownName, initial, what = "pass", recents = [], onClose, onSent, onView,
}: {
  /** the signed-in person's name, for their initials; their email stands in when it is not known */
  ownName?: string;
  open: boolean; initial?: string; what?: "pass" | "package"; kind?: TransferKind; event?: WalletEvent; passName?: string; ownEmail: string;
  /** emails this person has sent to or received from, most recent first: one tap fills the field */
  recents?: string[];
  onClose: () => void; onSent: (rows: { to: string; seat: string }[]) => void; onView: () => void;
}) {
  const tickets = event ? ticketsFor(event) : [];
  const [step, setStep] = useState<1 | 2 | 3 | 4>(kind === "pass" ? 2 : 1);
  const [sel, setSel] = useState<string[]>([initial ?? tickets[0]?.no]);
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [noting, setNoting] = useState(false);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hold = useMotionValue(0); // how far the hold-to-send has got, 0 to 1: the ticket on the review screen follows it

  const subject = kind === "pass" ? (passName ?? "this pass") : (event?.title ?? "");
  const emailError = !to.trim() ? "Email address is required." : !validEmail(to) ? "Email is invalid. Please try again." : null;
  const show = touched && emailError;
  const chosen = tickets.filter((t) => sel.includes(t.no));
  const seatChips = kind === "pass" ? [] : chosen.map((t) => `Seat ${splitSeat(t.seat).seatNo}`);
  const count = kind === "pass" ? 1 : sel.length;
  const noun = kind === "pass" ? `the ${what}` : count === 1 ? "the ticket" : `the ${count} tickets`;
  const total = kind === "pass" ? 3 : 4;
  /* what the floating ticket says, as the ticket sheet writes it: Section, Row, Seat (several seats read "6, 7") */
  const ticketParts = (() => {
    if (kind === "pass") return [{ label: "Sending", value: what === "package" ? "Package" : "Pass" }];
    const bits = chosen.map((t) => splitSeat(t.seat));
    if (!bits.length || !bits[0].where) return [{ label: "Entry", value: chosen[0]?.seat ?? "" }];
    const m = /^Sec (.+?) · Row (.+)$/.exec(bits[0].where);
    const seats = bits.map((b) => b.seatNo).join(", ");
    return m ? [{ label: "Section", value: m[1] }, { label: "Row", value: m[2] }, { label: bits.length > 1 ? "Seats" : "Seat", value: seats }] : [{ label: bits.length > 1 ? "Seats" : "Seat", value: seats }];
  })();
  const at = kind === "pass" ? step - 1 : step;
  const people = recents.filter((r) => r.toLowerCase() !== ownEmail.toLowerCase()).slice(0, 4);

  const next = () => {
    setTouched(true);
    if (emailError) return;
    setError(null);
    setStep(3);
  };
  const send = () => {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      const err = transferOutcome(to, ownEmail, kind);
      demoLog("transfer", { type: kind, to: to.trim(), seats: kind === "pass" ? [] : sel, note: note.trim() || undefined, outcome: err ? "error" : "sent", message: err });
      if (err) { setError(err); hold.set(0); setStep(2); return; }
      onSent(kind === "pass" ? [{ to: to.trim(), seat: subject }] : sel.map((n) => ({ to: to.trim(), seat: `${event?.row} · Seat ${n}` })));
      setStep(4);
    }, 1350); // long enough for the card to land before the next screen
  };

  const title = step === 1 ? "What are you sending?" : step === 2 ? "Who’s getting it?" : step === 3 ? "Check and send" : "On its way";
  const sub = step === 1 ? "Pick the seats to send." : step === 2 ? "We’ll email them a link to claim it." : step === 3 ? "You can cancel until they claim." : "A claim link is on its way.";

  const cta = step === 1 ? (
    <Button size="lg" disabled={!sel.length} onClick={() => setStep(2)}>Continue{sel.length > 1 ? ` with ${sel.length}` : ""}</Button>
  ) : step === 2 ? (
    <Button size="lg" onClick={next}>Review transfer</Button>
  ) : step === 3 ? (
    <HoldButton variant="primary" size="lg" resetOnComplete={false} disabled={busy} holdLabel={busy ? "Sending…" : "Keep holding…"} onHoldProgress={(v) => hold.set(v)} onHoldComplete={send}>
      <PaperPlaneTilt weight="bold" /> {busy ? "Sending…" : count > 1 ? `Hold to send ${count} tickets` : `Hold to send ${kind === "pass" ? "it" : "ticket"}`}
    </HoldButton>
  ) : (
    <>
      <Button size="lg" variant="tertiary" onClick={onClose}>Done</Button>
      <Button size="lg" onClick={onView}>View transfer</Button>
    </>
  );

  return (
    <FlowShell step={at} total={total} pageKey={step === 4 ? 3 : step} foldBar={step === 4} title={title} sub={sub} cta={cta}
      onBack={step === 4 ? undefined : step === 1 || (step === 2 && kind === "pass") ? onClose : () => setStep((step - 1) as 1 | 2 | 3)}
      note={step === 1 ? `${sel.length === 1 ? "This ticket" : "These tickets"} will leave your wallet once claimed.` : step === 3 && busy ? undefined : undefined}>
      {step === 1 && (
        <>
          <FlowContext event={event} title={subject} />
          <SeatPicker seats={tickets} value={sel} onChange={setSel} />
        </>
      )}

      {step === 2 && (
        <>
          <RecipientBubble email={to} />
          {error && <Alert variant="danger"><AlertIndicator /><AlertContent><AlertDescription>{error}</AlertDescription></AlertContent></Alert>}
          <Field>
            <FieldLabel htmlFor="tf-to">Their email</FieldLabel>
            <Input id="tf-to" type="email" autoFocus size="lg" value={to} aria-invalid={!!show} placeholder="friend@email.com" autoCapitalize="none" autoCorrect="off" enterKeyHint="next"
              onChange={(e) => { setTo(e.target.value); setError(null); }} onBlur={() => to && setTouched(true)}
              onKeyDown={(e) => e.key === "Enter" && next()} />
            <FieldError isVisible={!!show}>{show}</FieldError>
          </Field>
          {people.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <p className="text-[14px] font-medium text-ink2">Recent</p>
              <div className="flex gap-2.5 overflow-x-auto pb-1 [mask-image:linear-gradient(to_right,#000_calc(100%-40px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {people.map((r) => (
                  <button key={r} type="button" onClick={() => { setTo(r); setError(null); setTouched(false); }}
                    className="flex shrink-0 touch-manipulation select-none items-center gap-2.5 rounded-full bg-secondary py-1.5 pl-1.5 pr-4 text-[15px] font-medium outline-none transition-transform duration-150 ease-[var(--e-out)] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-[var(--h-focus)] [@media(hover:hover)]:hover:bg-foreground/10">
                    <AvatarMarble seed={r} size="md" /><span className="max-w-[200px] truncate">{r}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {noting ? (
            <Field>
              <FieldLabel htmlFor="tf-note">Add a note <span className="font-normal text-ink2">(optional)</span></FieldLabel>
              <Input id="tf-note" size="lg" maxLength={140} value={note} placeholder="See you at the game" onChange={(e) => setNote(e.target.value)} />
            </Field>
          ) : (
            <Button variant="ghost" className="-ml-3 w-fit" onClick={() => setNoting(true)}>Add a note</Button>
          )}
          <p className="text-[14px] leading-snug text-ink2">Demo: try scanned@, pending@, blocked@, risky@, fail@ or down@.</p>
        </>
      )}

      {(step === 3 || step === 4) && (
        <HandOff event={event} subject={subject} parts={ticketParts} to={to.trim()} from={initialsOf(ownName ?? ownEmail.split("@")[0])} phase={step === 4 ? "sent" : busy ? "sending" : "ready"} progress={step === 3 ? hold : undefined} />
      )}

      <AnimatePresence initial={false}>
        {step === 3 && (
          <Collapse key="terms">
            <div className="flex flex-col gap-6">
              <Terms rows={[
                ...(kind === "pass"
                  ? [{ k: "Sending", v: subject }]
                  : [{ k: "Event", v: <span className="line-clamp-1">{subject}</span> }, { k: count === 1 ? "Ticket" : `${count} tickets`, v: `Seat${count === 1 ? "" : "s"} ${seatChips.map((c) => c.replace("Seat ", "")).join(", ")}` }]),
                ...(note.trim() ? [{ k: "Note", v: <span className="line-clamp-1">{note.trim()}</span> }] : []),
                { k: "Cost", v: "Free" },
              ]} />
              <p className="text-[14px] leading-snug text-ink2">It stays pending until they claim {noun}. Cancel it under Transfers any time before that.</p>
            </div>
          </Collapse>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {step === 4 && (
          <Collapse key="tracker" enter>
            <Tracker steps={[
              { title: "Transfer sent", sub: "Your seats are held for them.", state: "done" },
              { title: "Email on its way", sub: `A claim link goes to ${to.trim()}.`, state: "now" },
              { title: "They claim it", sub: `${noun[0].toUpperCase()}${noun.slice(1)} moves to their wallet.`, state: "next" },
            ]} />
          </Collapse>
        )}
      </AnimatePresence>
    </FlowShell>
  );
}
