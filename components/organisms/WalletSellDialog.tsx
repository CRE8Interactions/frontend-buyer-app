"use client";

/**
 * Resale flow: select -> price -> payout summary -> confirm -> listed. Price rules and the
 * no-bank-account block match the live app. Demo: price 666 fails to list. Outcomes are
 * logged: window.__walletDemo.log
 */

import { useState } from "react";
import NumberFlow from "@number-flow/react";
import { Alert, AlertContent, AlertDescription, AlertIndicator } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { StatusMark } from "@/components/ui/status-mark";
import { After, BigAmount, CountUp, FlowContext, FlowShell, SeatPicker, StubCard, Terms, Tracker, splitSeat } from "@/components/organisms/WalletFlow";
import { demoLog, ticketsFor, type WalletEvent } from "@/lib/walletDemo";
import { MAX_ASKING, MAX_ASKING_TEXT } from "@/lib/walletUtils";

const FACE = 24;
const FEE = 0.1;
const usd = (n: number) => `$${n.toFixed(2)}`;
const money = { style: "currency", currency: "USD" } as const;

export default function WalletSellDialog({
  open, event, bankLinked, onBank, initial, onClose, onListed, onView,
}: {
  open: boolean; initial?: string; event: WalletEvent; bankLinked: boolean; onBank: (v: boolean) => void;
  onClose: () => void; onListed: (rows: { seat: string; price: number }[]) => void; onView: () => void;
}) {
  const tickets = ticketsFor(event);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [sel, setSel] = useState<string[]>([initial ?? tickets[0]?.no]);
  const [price, setPrice] = useState<number | null>(FACE);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceError = price == null || price <= 0 ? "Enter a price greater than 0." : price < FACE ? `The lowest you can ask is ${usd(FACE)}, the face value.` : price > MAX_ASKING ? `Asking price can’t be more than ${MAX_ASKING_TEXT}.` : null;
  const n = sel.length;
  const gross = (price ?? 0) * n;
  const fees = gross * FEE;
  const payout = gross - fees;
  const many = n > 1;
  const seatChips = tickets.filter((t) => sel.includes(t.no)).map((t) => `Seat ${splitSeat(t.seat).seatNo}`);
  const quick = [FACE, Math.round(FACE * 1.25), Math.round(FACE * 1.5)];

  const toReview = () => { setTouched(true); if (!priceError) setStep(3); };
  const list = () => {
    setBusy(true); setError(null);
    setTimeout(() => {
      setBusy(false);
      const fail = price === 666;
      demoLog("sell", { seats: sel, price, payout, outcome: fail ? "error" : "listed" });
      if (fail) { setError("We couldn't list those tickets. Please try again."); return; }
      onListed(sel.map((no) => ({ seat: `${event.row} · Seat ${no}`, price: price ?? 0 })));
      setStep(4);
    }, 900);
  };

  const title = step === 1 ? "What are you selling?" : step === 2 ? "Set your price" : step === 3 ? "Review your listing" : `Listed${many ? ", all " + n : ""}!`;
  const sub = step === 1 ? "Pick the seats to sell." : step === 2 ? `Per ticket. Face value is ${usd(FACE)}.` : step === 3 ? "Change the price or take it down any time before it sells." : "Buyers can see it now.";

  const cta = step === 1 ? (
    <Button size="lg" disabled={!sel.length} onClick={() => setStep(2)}>Continue{many ? ` with ${n}` : ""}</Button>
  ) : step === 2 ? (
    <Button size="lg" onClick={toReview}>Review listing</Button>
  ) : step === 3 ? (
    <Button size="lg" disabled={busy || !bankLinked} onClick={list}>{busy ? "Listing…" : `List ${many ? n + " tickets" : "ticket"} for ${usd(price ?? 0)}${many ? " each" : ""}`}</Button>
  ) : (
    <>
      <Button size="lg" variant="tertiary" onClick={onClose}>Done</Button>
      <Button size="lg" onClick={onView}>View listing</Button>
    </>
  );

  return (
    <FlowShell step={step} total={4} title={title} sub={sub} cta={cta}
      onBack={step === 4 ? undefined : step === 1 ? onClose : () => setStep((step - 1) as 1 | 2 | 3)}
      >
      {step === 1 && (
        <>
          <FlowContext event={event} title={event.title} />
          <SeatPicker seats={tickets} value={sel} onChange={setSel} />
        </>
      )}

      {step === 2 && (
        <>
          <div className="flex flex-col gap-3 pt-1">
            <BigAmount label="Asking price per ticket" value={price} onChange={setPrice} min={FACE} max={MAX_ASKING} invalid={touched && !!priceError} />
            {touched && priceError && <p role="alert" className="text-center text-[15px] text-destructive">{priceError}</p>}
          </div>
          <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Suggested prices">
            {quick.map((q, i) => (
              <Button key={q} size="md" variant={price === q ? "primary" : "secondary"} onClick={() => { setPrice(q); setTouched(false); }}>
                {i === 0 ? `Face ${usd(q).replace(".00", "")}` : usd(q).replace(".00", "")}
              </Button>
            ))}
          </div>
          <div className="rounded-[28px] bg-secondary/70 p-5">
            <p className="text-[15px] text-ink2">You’ll receive{many ? ` for ${n} tickets` : ""}</p>
            <NumberFlow value={priceError ? 0 : payout} format={money} className="mt-1 block text-[48px] font-semibold leading-none tracking-[-0.04em] tabular-nums" />
            <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3 text-[15px] text-ink2">
              <div className="flex justify-between"><span>{many ? `${n} × ${usd(price ?? 0)}` : "Ticket price"}</span><span className="tabular-nums">{usd(priceError ? 0 : gross)}</span></div>
              <div className="flex justify-between"><span>Service fee (10%)</span><span className="tabular-nums">−{usd(priceError ? 0 : fees)}</span></div>
            </div>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          {error && <Alert variant="danger"><AlertIndicator /><AlertContent><AlertDescription>{error}</AlertDescription></AlertContent></Alert>}
          <StubCard event={event} subject={event.title} seats={seatChips} />
          <Terms rows={[
            { k: "Tickets", v: `${n} × ${usd(price ?? 0)}` },
            { k: "Service fee", v: `−${usd(fees)}` },
            { k: "You receive", v: usd(payout), strong: true },
            { k: "Paid", v: "After the event" },
          ]} />
          {!bankLinked && (
            <Alert variant="warning"><AlertIndicator /><AlertContent><AlertDescription>Link a bank account in Profile to receive this payout before you can list.</AlertDescription></AlertContent></Alert>
          )}
          <Switch checked={bankLinked} onCheckedChange={onBank} aria-label="Demo: bank account linked" label="Demo: bank account linked" />
        </>
      )}

      {step === 4 && (
        <>
          {/* one hero, centred in the room there is: the mark, what you will be paid, and what it is for. The tracker rests at the bottom. */}
          <div className="my-auto flex flex-col items-center gap-4 text-center">
            <div className="size-24"><After ms={280}><StatusMark tone="success" size={96} label="" /></After></div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-[15px] text-ink2">You get{many ? ` for ${n} tickets` : ""}</p>
              <CountUp value={payout} className="text-[48px] font-semibold leading-none tracking-[-0.04em]" />
            </div>
            <p className="rounded-full bg-secondary px-4 py-2 text-[17px] font-medium tracking-[-0.01em]">Asking {usd(price ?? 0)}{many ? " each" : ""}</p>
            <p className="max-w-[28ch] text-balance text-[15px] leading-snug text-ink2">{seatChips.join(", ")} · {event.title}</p>
          </div>
          <Tracker steps={[
            { title: "Listed for sale", sub: "Buyers can find it now.", state: "done" },
            { title: "Waiting for a buyer", sub: "We’ll text you the moment it sells.", state: "now" },
            { title: "You get paid", sub: `${usd(payout)} lands after the event.`, state: "next" },
          ]} />
        </>
      )}
    </FlowShell>
  );
}
