"use client";

/**
 * Event detail, built around the event's square flyer (see WalletFlyer): the flyer's colours glow up behind the sheet, the
 * flyer and the game's name sit on one side, and on the other a glass ticket stub: the code on a white plate with the seat
 * switch under it, a perforation, then section, row, seat and doors. One big action ("Open at the gate"), three quiet ones
 * (Transfer, Sell, Directions) that act on the seat shown, add-to-wallet, and the tickets and order folded away. Past and
 * transferred events keep the page and turn the actions off. EventMissing is the page for an order that cannot be found.
 */

import { useEffect, useRef } from "react";
import { ArrowsOutSimple, Backpack, CaretDown, Clock, DeviceMobile, DoorOpen, MagnifyingGlass, MapPin, PaperPlaneTilt, Tag } from "@phosphor-icons/react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerBody, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { GroupedList, GroupedListItem } from "@/components/ui/grouped-list";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Status } from "@/components/ui/status";
import WalletBadges from "@/components/organisms/WalletBadges";
import { EventFlyer, FlyerSheet } from "@/components/organisms/WalletFlyer";
import { OrderList, SeatSwitch, WalletMonogram, WalletQr } from "@/components/organisms/WalletPass";
import { TicketPass } from "@/components/organisms/TicketPass";
import { useIsMobile } from "@/hooks/use-mobile";
import { useWakeLock } from "@/hooks/useWakeLock";
import { cn } from "@/lib/utils";
import { Fragment, useState } from "react";
import { availability, orderFor, ticketsFor, type WalletEvent } from "@/lib/walletDemo";
import { glowFor } from "@/lib/walletUtils";

/** "Sec A · Row F · Seat 6" becomes labelled parts: Section A, Row F, Seat 6. */
const seatParts = (seat: string) =>
  seat.split(" · ").map((p) => {
    const [k, ...rest] = p.split(" ");
    const label = k === "Sec" ? "Section" : k === "Row" ? "Row" : k === "Seat" ? "Seat" : "Entry";
    return { label, value: ["Sec", "Row", "Seat"].includes(k) ? rest.join(" ") : p };
  });

/** What to know about the event itself: when, where, how to get in. Demo copy, kept generic per kind. */
const knowBefore = (e: WalletEvent) => [
  { icon: DeviceMobile, text: "Show the code on your phone at the gate. Screenshots work, but the live code is faster." },
  { icon: Backpack, text: e.kind === "Concert" || /Amphitheater/.test(e.venue) ? "Small bags only. Anything bigger than a tote is checked at the entrance." : "Clear or small bags only. Bigger ones are checked at the entrance." },
  { icon: Clock, text: `Gates open at ${e.doors}, about an hour before the start. Lines are shortest in the first half hour.` },
];

export function EventMissing({ onBack }: { onBack?: () => void }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon"><MagnifyingGlass weight="bold" /></EmptyMedia>
        <EmptyTitle>We can’t find that order</EmptyTitle>
        <EmptyDescription>The link may be old, or the order is on a different email. Your other tickets are still here.</EmptyDescription>
      </EmptyHeader>
      {onBack && <EmptyContent><Button variant="secondary" onClick={onBack}>Back to tickets</Button></EmptyContent>}
    </Empty>
  );
}

/** A quiet action: an icon over a word, 72px tall, a full touch target. */
function Tile({ icon: Ic, label, onClick, href, disabled }: { icon: typeof Tag; label: string; onClick?: () => void; href?: string; disabled?: boolean }) {
  const cls = "flex min-h-[72px] touch-manipulation select-none flex-col items-center justify-center gap-1.5 rounded-[22px] bg-card/85 text-[13px] font-medium outline-none backdrop-blur-xl transition-[background-color,transform] duration-150 ease-[var(--e-out)] hover:bg-secondary/80 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-[var(--h-focus)] aria-disabled:pointer-events-none aria-disabled:opacity-40";
  const inner = <><Ic weight="bold" className="size-5" />{label}</>;
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>{inner}</a>
  ) : (
    <button type="button" onClick={onClick} disabled={disabled} aria-disabled={disabled} className={cls}>{inner}</button>
  );
}

/** The seat's details, event info and tips, shared by the wide and the phone layout. */
function InfoBody({ event }: { event: WalletEvent }) {
  const mapHref = `https://maps.google.com/?q=${encodeURIComponent(event.address)}`;
  return (
    <div className="flex flex-col gap-5 text-foreground">
      <dl className="grid grid-cols-2 gap-3">
        <div className="flex items-start gap-3"><DoorOpen weight="bold" aria-hidden className="mt-0.5 size-5 shrink-0 text-ink2" /><div><dt className="text-[13px] text-ink2">Doors</dt><dd className="text-[16px] font-semibold tabular-nums">{event.doors}</dd></div></div>
        <div className="flex items-start gap-3"><Clock weight="bold" aria-hidden className="mt-0.5 size-5 shrink-0 text-ink2" /><div><dt className="text-[13px] text-ink2">Starts</dt><dd className="text-[16px] font-semibold tabular-nums">{event.time}</dd></div></div>
      </dl>
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <MapPin weight="bold" aria-hidden className="mt-0.5 size-5 shrink-0 text-ink2" />
          <div className="min-w-0">
            <div className="text-[16px] font-semibold leading-snug">{event.venue}</div>
            <div className="text-[14px] text-ink2">{event.address}</div>
          </div>
        </div>
        <Button variant="secondary" fullWidth asChild><a href={mapHref} target="_blank" rel="noreferrer"><MapPin weight="bold" /> Directions</a></Button>
      </div>
      <ul className="flex flex-col gap-3 border-t border-border pt-4">
        {knowBefore(event).map(({ icon: Ic, text }) => (
          <li key={text} className="flex items-start gap-3 text-[14px] leading-snug text-ink2"><Ic weight="bold" aria-hidden className="mt-0.5 size-5 shrink-0" />{text}</li>
        ))}
      </ul>
    </div>
  );
}

/** Event info, the tickets in the order and the order itself, folded away. */
function Folds({ event, seat, onSeat, tickets, order }: { event: WalletEvent; seat: number; onSeat: (i: number) => void; tickets: ReturnType<typeof ticketsFor>; order: ReturnType<typeof orderFor> }) {
  return (
    <Accordion variant="card" type="multiple" defaultValue={["info"]} className="rounded-[28px] bg-card/85 p-2 backdrop-blur-xl">
      <AccordionItem value="info">
        <AccordionTrigger>Event info</AccordionTrigger>
        <AccordionContent><InfoBody event={event} /></AccordionContent>
      </AccordionItem>
      <AccordionItem value="tickets">
        <AccordionTrigger>All tickets in this order <span className="ms-2 font-normal text-ink2 tabular-nums">{tickets.length}</span></AccordionTrigger>
        <AccordionContent>
          <ul className="divide-y divide-border">
            {tickets.map((k, i) => (
              <li key={k.code} className="flex items-center gap-3 py-3 text-foreground">
                <div className="min-w-0 flex-1 text-[15px] font-medium">{k.seat}</div>
                {i !== seat ? <Button size="sm" variant="secondary" className="[@media(pointer:coarse)]:min-h-11" onClick={() => onSeat(i)}>Show code</Button> : <span className="text-[13px] text-ink2">Showing</span>}
              </li>
            ))}
          </ul>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="order">
        <AccordionTrigger>Order details</AccordionTrigger>
        <AccordionContent><div className="text-[15px] text-ink2"><OrderList order={order} /></div></AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

/**
 * The phone layout. A mobile ticket is used at one moment, at a gate, so the code leads: a slim header (small art, the
 * game, when and where), then the pass (the same one the text-message ticket page uses: square code, ID under it,
 * perforation, section / row / seat, the wallet badge), swiping between the seats in an order, tap the code to enlarge.
 * Transfer and Sell sit under it, the event info after that. The screen stays awake while a live pass is open.
 */
function PhoneDetail({ event, seat, onSeat, onGate, onTransfer, onSell }: {
  event: WalletEvent; seat: number; onSeat: (i: number) => void; onGate: () => void; onTransfer: (seatNo?: string) => void; onSell: (seatNo?: string) => void;
}) {
  const tickets = ticketsFor(event);
  const t = tickets[Math.min(seat, tickets.length - 1)];
  const order = orderFor(event);
  const live = !event.past && event.state !== "transferred";
  const av = availability(event);
  const many = tickets.length > 1;
  const track = useRef<HTMLDivElement>(null);
  const [big, setBig] = useState<number | null>(null);
  const [jump, setJump] = useState(false);
  useWakeLock(live);

  const step = () => ((track.current?.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0) + 12;
  const onScroll = () => {
    if (!many || !track.current) return;
    const i = Math.max(0, Math.min(tickets.length - 1, Math.round(track.current.scrollLeft / (step() || 1))));
    if (i !== seat) onSeat(i);
  };
  const go = (i: number) => { track.current?.scrollTo({ left: Math.max(0, Math.min(tickets.length - 1, i)) * step(), behavior: Math.abs(i - seat) > 3 ? "auto" : "smooth" }); onSeat(i); };
  useEffect(() => { if (track.current && seat) track.current.scrollTo({ left: seat * step(), behavior: "auto" }); /* only on open */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-5 pb-[calc(24px+env(safe-area-inset-bottom))]">
      <header className="flex items-center gap-3.5">
        <WalletMonogram event={event} className="size-[84px] rounded-[16px] text-[24px] ring-1 ring-border" />
        <div className="min-w-0 py-0.5">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[14px]">
            <Status color={av.color} pulse={live && event.inDays === 0} className="text-foreground">{av.label}</Status>
            {event.badges?.map((b) => <Badge key={b} variant="neutral" size="sm">{b}</Badge>)}
          </div>
          <h2 className="mt-1 line-clamp-2 text-balance text-[clamp(17px,5vw,21px)] font-semibold leading-[1.1] tracking-[-0.03em]">{event.title}</h2>
          <p className="mt-0.5 truncate text-[14px] text-ink2">{event.date} · {event.time} · {event.venue}</p>
        </div>
      </header>

      <section aria-label="Your tickets">
        {many && (
          <div className="mb-3 flex items-center justify-between px-1 text-[15px]">
            <Button variant="ghost" size="sm" className="-ml-3 text-[15px]" aria-haspopup="dialog" onClick={() => setJump(true)}>
              <span aria-live="polite" className="whitespace-nowrap tabular-nums">Ticket {Math.min(seat, tickets.length - 1) + 1} <span className="text-mute">of {tickets.length}</span></span>
              <CaretDown weight="bold" aria-hidden />
            </Button>
            <div aria-hidden className="flex items-center gap-1.5">
              {tickets.slice(0, 7).map((k, i) => <span key={k.code} className={cn("h-1.5 rounded-full bg-foreground transition-[width,opacity] duration-200", i === seat ? "w-5" : "w-1.5 opacity-30")} />)}
            </div>
          </div>
        )}
        <div
          ref={track}
          onScroll={onScroll}
          className={cn("flex gap-3", many && "-mx-5 snap-x snap-mandatory overflow-x-auto overscroll-x-contain px-5 pb-1 [scroll-padding-inline:20px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden")}
        >
          {tickets.map((k, i) => (
            <div key={k.code} className={cn("min-w-0", many ? "basis-[92%] shrink-0 snap-center" : "w-full")}>
              <TicketPass code={k.code} row={k.seat.includes("·") ? k.seat.replace(/ · Seat .+$/, "") : k.seat} seat={k.seat.replace(/^.*Seat /, "")} accessible={!!event.badges?.some((b) => /accessible/i.test(b))} ended={!live} count={tickets.length} label={many ? `Ticket ${i + 1} of ${tickets.length}` : "Your ticket"} onEnlarge={() => setBig(i)} />
            </div>
          ))}
        </div>
        {live ? <p className="mt-3 px-1 text-center text-[13px] text-mute">Show the code at the door. Turn your screen brightness up.</p>
          : <p className="mt-3 px-1 text-center text-[13px] text-ink2">{event.state === "transferred" ? "These seats were transferred, so the codes no longer work." : "This event has passed. The codes no longer work."}</p>}
      </section>

      {live && <Button size="lg" fullWidth onClick={onGate}><ArrowsOutSimple weight="bold" /> Open at the gate</Button>}
      <div className="grid grid-cols-2 gap-2.5">
        <Tile icon={PaperPlaneTilt} label="Transfer" disabled={!live} onClick={() => onTransfer(t.no)} />
        <Tile icon={Tag} label="Sell" disabled={!live} onClick={() => onSell(t.no)} />
      </div>
      <Folds event={event} seat={seat} onSeat={onSeat} tickets={tickets} order={order} />

      <Drawer open={jump} onOpenChange={setJump}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Go to a ticket</DrawerTitle>
            <DrawerDescription>{tickets.length} tickets in this order.</DrawerDescription>
          </DrawerHeader>
          <GroupedList data-vaul-no-drag className="mt-5 max-h-[50svh] overflow-y-auto overscroll-contain">
            {tickets.map((k, i) => (
              <GroupedListItem key={k.code} label={`Ticket ${i + 1}`} selected={i === seat}
                ref={i === seat ? (el: HTMLElement | null) => el?.scrollIntoView({ block: "center" }) : undefined}
                onClick={() => { go(i); setJump(false); }}>
                <span title={k.seat}>{k.seat}</span>
              </GroupedListItem>
            ))}
          </GroupedList>
          <DrawerFooter className="pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
            <DrawerClose asChild><Button size="lg" variant="tertiary">Close</Button></DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      <Drawer open={big !== null} onOpenChange={(o) => !o && setBig(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{many && big !== null ? `Ticket ${big + 1} of ${tickets.length}` : "Your ticket"}</DrawerTitle>
            <DrawerDescription>{big !== null ? tickets[big].seat : ""}</DrawerDescription>
          </DrawerHeader>
          {big !== null && (
            <DrawerBody className="flex flex-col items-center gap-3">
              <WalletQr code={tickets[big].code} sweep={false} className="aspect-square w-[min(100%,380px,calc(100svh_-_320px))] min-w-[200px] rounded-[24px] p-4" />
              <div className="mt-1 text-center">
                <p className="text-[13px] text-mute">Scanner not reading? Give this code.</p>
                <p className="mt-1.5 select-all text-balance font-mono text-[20px] font-medium uppercase leading-[1.3] tracking-[0.06em] text-foreground">
                  {tickets[big].code.split("-").map((part, i) => <Fragment key={i}>{i > 0 && <>-<wbr /></>}{part}</Fragment>)}
                </p>
              </div>
            </DrawerBody>
          )}
          <DrawerFooter className="pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
            <DrawerClose asChild><Button size="lg" variant="tertiary">Done</Button></DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

export default function WalletEventDetail(props: {
  event: WalletEvent; seat: number; onSeat: (i: number) => void; onGate: () => void;
  onTransfer: (seatNo?: string) => void; onSell: (seatNo?: string) => void;
}) {
  const mobile = useIsMobile();
  return mobile ? <PhoneDetail {...props} /> : <WideDetail {...props} />;
}

function WideDetail({
  event, seat, onSeat, onGate, onTransfer, onSell,
}: {
  event: WalletEvent; seat: number; onSeat: (i: number) => void; onGate: () => void;
  onTransfer: (seatNo?: string) => void; onSell: (seatNo?: string) => void;
}) {
  const tickets = ticketsFor(event);
  const t = tickets[Math.min(seat, tickets.length - 1)];
  const order = orderFor(event);
  const live = !event.past && event.state !== "transferred";
  const av = availability(event);
  const when = event.inDays === 0 ? `Tonight · doors ${event.doors}` : event.inDays > 0 ? `${event.inDays} ${event.inDays === 1 ? "day" : "days"} to go` : event.date;

  return (
    <div className="pb-[calc(24px+env(safe-area-inset-bottom))] md:pb-8">
      <FlyerSheet
        glow={glowFor(event)}
        tone={event.tone}
        art={<EventFlyer event={event} />}
        head={
          <div className="flex flex-col items-center gap-2 text-center @2xl:items-start @2xl:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 @2xl:justify-start">
              <Status color={av.color} pulse={live && event.inDays === 0}>{av.label}</Status>
              <Badge variant="neutral" size="sm">{event.kind}</Badge>
              {event.badges?.map((b) => <Badge key={b} variant="neutral" size="sm">{b}</Badge>)}
            </div>
            <h2 className="text-balance text-[clamp(26px,4vw,36px)] font-semibold leading-[1.06] tracking-[-0.03em]">{event.title}</h2>
            <div className="mt-1 text-left">
              <p className="text-[16px] font-medium leading-snug">{event.date} · {event.time}</p>
              <p className="text-[14px] leading-snug text-ink2">{event.venue}, {event.city}</p>
            </div>
          </div>
        }
      >
        <section aria-label={`Ticket for ${event.title}`} className="overflow-hidden rounded-[32px] bg-card/85 backdrop-blur-xl">
          <div className="flex flex-col items-center gap-4 px-6 pb-8 pt-8 text-center">
            <div className="relative">
              <WalletQr code={t.code} sweep={live} className={cn("aspect-square w-[min(66vw,240px)] transition-opacity duration-200", !live && "opacity-30")} />
              {!live && <span className="absolute inset-0 flex items-center justify-center text-[16px] font-semibold">{event.state === "transferred" ? "Transferred" : "Past event"}</span>}
            </div>
            <p className="break-all text-[13px] tracking-[0.06em] text-ink2">{t.code}</p>
            <div className="flex flex-col items-center gap-3">
              <span className="text-[14px] text-ink2">{when}</span>
              <SeatSwitch event={event} value={seat} onChange={onSeat} />
            </div>
          </div>

          {/* perforation: a dashed line with a notch cut out of each side, in the sheet's own colour */}
          <div aria-hidden className="relative h-0">
            <span className="absolute -left-3 -top-3 size-6 rounded-full bg-h-overlay" />
            <span className="absolute -right-3 -top-3 size-6 rounded-full bg-h-overlay" />
            <span className="absolute inset-x-6 top-0 border-t-2 border-dashed border-border" />
          </div>

          <div className="px-6 pb-6 pt-8">
            <dl className="flex rounded-[22px] bg-secondary/60">
              {seatParts(t.seat).map((p, i) => (
                <Fragment key={p.label}>
                  {i > 0 && <span aria-hidden className="flex shrink-0 items-center self-stretch"><span className="h-1/2 w-px rounded-full bg-foreground/15" /></span>}
                  <div className="min-w-0 flex-1 px-3 py-4 text-center">
                    <dt className="text-[14px] text-ink2">{p.label}</dt>
                    <dd className="truncate text-[22px] font-semibold leading-tight tracking-[-0.02em]">{p.value}</dd>
                  </div>
                </Fragment>
              ))}
            </dl>
          </div>
        </section>

        {live && <Button size="lg" fullWidth onClick={onGate}><ArrowsOutSimple weight="bold" /> Open at the gate</Button>}

        <div className="grid grid-cols-2 gap-2.5">
          <Tile icon={PaperPlaneTilt} label="Transfer" disabled={!live} onClick={() => onTransfer(t.no)} />
          <Tile icon={Tag} label="Sell" disabled={!live} onClick={() => onSell(t.no)} />
        </div>
        {live && <WalletBadges count={tickets.length} className="[&>div]:justify-center" />}
        {!live && <p className="px-1 text-[13px] text-ink2">{event.state === "transferred" ? "These seats were transferred, so they can’t be sent or sold again." : "This event has passed."}</p>}

        <Folds event={event} seat={seat} onSeat={onSeat} tickets={tickets} order={order} />
      </FlyerSheet>
    </div>
  );
}
