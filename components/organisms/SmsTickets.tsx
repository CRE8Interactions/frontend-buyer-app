"use client";

/**
 * The page behind the text message a box office sends: your tickets as QR codes, no sign-in. Mobile first,
 * and built for one moment: standing at the door with the screen on. So the pass leads and the code sits
 * high enough to be on screen without scrolling on a phone; the event photo is a slim header, not the page.
 * Demo tokens pick the state: "expired" (link no longer valid), "missing" (no tickets for this link),
 * "slow" (a longer load), "ended" (the event has passed: codes off, no wallet). Anything else shows the Raptors game.
 */

import { Fragment, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CaretDown, CaretLeft, CaretRight, LinkBreak, MagnifyingGlass, MapPin } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerBody, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { GroupedList, GroupedListItem } from "@/components/ui/grouped-list";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Status } from "@/components/ui/status";
import { Toaster } from "@/components/ui/sonner";
import { WalletHandoff } from "@/components/organisms/WalletBadges";
import { TicketPass } from "@/components/organisms/TicketPass";
import { WalletMonogram, WalletQr } from "@/components/organisms/WalletPass";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useIsIos, useIsTouchDevice } from "@/hooks/usePhoneKinds";
import { useWakeLock } from "@/hooks/useWakeLock";
import { pickWorst } from "@/lib/ticketPageWorst";
import { EVENTS, ticketsFor, type WalletEvent } from "@/lib/walletDemo";

type Phase = "loading" | "preparing" | "ready" | "expired" | "missing";

/** "A vs. B": the home side leads in full ink, the visitor dims. */
function splitTitle(title: string): [string, string | null] {
  const i = title.indexOf(" vs. ");
  return i < 0 ? [title, null] : [title.slice(0, i), title.slice(i + 1)];
}

/* Bottom padding keeps the last control clear of the home indicator on notched phones (the 0px fallback is for
   browsers without viewport-fit=cover, where the inset is 0 anyway). */
const MAIN = "mx-auto w-full max-w-[640px] px-4 pt-[84px] pb-[calc(96px+env(safe-area-inset-bottom,0px))] sm:px-6";

export default function SmsTickets({ token }: { token: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  /* the data boundary: the demo event, or a dev-only worst-case fixture picked with ?data= (see lib/ticketPageWorst.ts) */
  const [event] = useState(() => (token === "ended" ? EVENTS.find((e) => e.past) ?? EVENTS[0] : pickWorst() ?? EVENTS[0]));

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(token === "expired" ? "expired" : token === "missing" ? "missing" : "preparing"), token === "slow" ? 2600 : 700);
    const t2 = setTimeout(() => setPhase((p) => (p === "preparing" ? "ready" : p)), token === "slow" ? 3600 : 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [token]);

  if (phase === "expired" || phase === "missing") {
    return (
      <main className="mx-auto flex min-h-[70svh] w-full max-w-[560px] items-center px-4 pb-20 pt-[110px]">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">{phase === "expired" ? <LinkBreak weight="bold" /> : <MagnifyingGlass weight="bold" />}</EmptyMedia>
            <EmptyTitle>{phase === "expired" ? "Link expired" : "Tickets unavailable"}</EmptyTitle>
            <EmptyDescription>
              {phase === "expired"
                ? "This ticket link is no longer valid. Ask the box office to text you a new one."
                : "We couldn’t find tickets for this link. Check the text message and try again."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </main>
    );
  }

  if (phase !== "ready") {
    return (
      <main className={MAIN} aria-busy="true">
        <p className="sr-only" role="status">{phase === "loading" ? "Loading your tickets" : "Preparing your passes"}</p>
        <Skeleton className="h-[150px] w-full rounded-[28px] sm:h-[240px]" />
        <Skeleton className="mt-4 h-[520px] w-full rounded-[28px]" />
      </main>
    );
  }

  return <Ready event={event} />;
}

/* "doors in 2h 10m" on the day, so the page answers the one question people open it with. It ticks once a minute and
   falls back to the printed time on any other day or if the time cannot be read. */
const tickMinute = (cb: () => void) => { const id = setInterval(cb, 30000); return () => clearInterval(id); };
function doorsText(event: WalletEvent, minute: number): string {
  if (event.inDays !== 0) return `doors ${event.doors}`;
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(event.doors.trim());
  if (!m) return `doors ${event.doors}`;
  const at = new Date(minute * 60000);
  at.setHours((Number(m[1]) % 12) + (m[3].toUpperCase() === "PM" ? 12 : 0), Number(m[2]), 0, 0);
  const diff = Math.round((at.getTime() - minute * 60000) / 60000);
  if (diff <= 0) return "doors are open";
  const h = Math.floor(diff / 60), mm = diff % 60;
  return `doors in ${h ? `${h}h ` : ""}${mm}m`;
}
function DoorsNote({ event }: { event: WalletEvent }) {
  const minute = useSyncExternalStore(tickMinute, () => Math.floor(Date.now() / 60000), () => 0);
  return <span className="tabular-nums">{event.time} · {minute ? doorsText(event, minute) : `doors ${event.doors}`}</span>;
}

function Ready({ event }: { event: WalletEvent }) {
  const reduce = useReducedMotion();
  const touch = useIsTouchDevice(); // no arrows on a touch screen: swiping is the control
  const ios = useIsIos(); // directions open in the maps app the phone already has
  const ended = event.past;
  useWakeLock(!ended); // a pass held up at the gate must not dim or lock mid-scan
  const [big, setBig] = useState<number | null>(null); // the ticket shown full size
  const [jump, setJump] = useState(false); // the list of every ticket, for big orders
  const tickets = ticketsFor(event);
  const [home, away] = splitTitle(event.title);
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const many = tickets.length > 1;

  /* more than one ticket: the passes sit in a row and swipe sideways, snapping one at a time, the next one peeking in */
  const onScroll = () => {
    const el = track.current;
    if (!el || !many) return;
    const first = el.firstElementChild as HTMLElement | null;
    if (!first) return;
    const step = first.offsetWidth + 12;
    setActive(Math.max(0, Math.min(tickets.length - 1, Math.round(el.scrollLeft / step))));
  };

  const go = (i: number) => {
    const el = track.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return;
    el.scrollTo({ left: Math.max(0, Math.min(tickets.length - 1, i)) * (first.offsetWidth + 12), behavior: reduce || Math.abs(i - active) > 3 ? "auto" : "smooth" });
  };

  /* one authored entrance: the header settles, the pass rises, the rest follows */
  const enter = (delay: number) =>
    reduce
      ? {}
      : { initial: { opacity: 0, y: 16, filter: "blur(4px)" }, animate: { opacity: 1, y: 0, filter: "blur(0px)" }, transition: { duration: 0.5, ease: EASE_OUT, delay } };

  return (
    <main className={MAIN}>
      {/* Header: the event's square art beside its title and when. A row, not a banner, so the pass is on screen at once. */}
      <motion.header
        {...(reduce ? {} : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, ease: EASE_OUT } })}
        className="flex items-center gap-4"
      >
        <WalletMonogram event={event} className="size-[72px] rounded-[18px] text-[24px] ring-1 ring-border sm:size-24 sm:rounded-[24px] sm:text-[32px]" />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-mute" title={event.kind}>{event.kind}</p>
          {/* three lines at most; the full title stays in the tooltip and the page title. A long unbroken word breaks instead of running off. */}
          <h1 title={event.title} className="mt-0.5 line-clamp-3 text-balance text-[clamp(20px,5.6vw,28px)] font-semibold leading-[1.05] tracking-[-0.04em] [overflow-wrap:anywhere]">
            {home}
            {away && <><br /><span className="text-ink2">{away}</span></>}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-ink2">
            <Status color={!ended && event.inDays === 0 ? "success" : "neutral"} pulse={!ended && event.inDays === 0} className="text-foreground">{ended ? "Ended" : event.inDays === 0 ? "Tonight" : event.date}</Status>
            {ended ? <span className="tabular-nums">{event.date} · {event.time}</span> : <DoorsNote event={event} />}
          </div>
        </div>
      </motion.header>

      {/* The tickets */}
      <motion.section aria-label="Your tickets" {...enter(0.12)} className="mt-6">
        {many && (
          <div className="mb-3 flex items-center justify-between px-1">
            <Button variant="ghost" size="sm" className="-ml-3 text-[15px]" aria-haspopup="dialog" onClick={() => setJump(true)}>
              <span aria-live="polite" className="whitespace-nowrap tabular-nums">Ticket {active + 1} <span className="text-mute">of {tickets.length}</span></span>
              <CaretDown weight="bold" aria-hidden />
            </Button>
            <div className="flex items-center gap-3">
            {!touch && <div className="hidden items-center gap-1 [@media(hover:hover)_and_(pointer:fine)]:flex">
              <Button variant="tertiary" size="icon-sm" aria-label="Previous ticket" disabled={active === 0} onClick={() => go(active - 1)}><CaretLeft weight="bold" /></Button>
              <Button variant="tertiary" size="icon-sm" aria-label="Next ticket" disabled={active === tickets.length - 1} onClick={() => go(active + 1)}><CaretRight weight="bold" /></Button>
            </div>}
            <div aria-hidden className="flex items-center gap-1.5">
              {(() => {
                /* at most seven dots, the way an iOS page control does it: the window follows the active ticket and a dot at an edge shrinks when more lie beyond it */
                const n = tickets.length, W = 7;
                const start = n <= W ? 0 : Math.max(0, Math.min(n - W, active - Math.floor(W / 2)));
                return Array.from({ length: Math.min(n, W) }, (_, k) => {
                  const i = start + k;
                  const edge = n > W && ((k === 0 && start > 0) || (k === W - 1 && start + W < n));
                  return <span key={i} className={cn("h-1.5 rounded-full bg-foreground transition-[width,opacity] duration-200 motion-reduce:transition-none", i === active ? "w-5" : edge ? "w-1 opacity-20" : "w-1.5 opacity-30")} />;
                });
              })()}
            </div>
            </div>
          </div>
        )}
        <div
          ref={track}
          {...(many ? { tabIndex: 0, role: "group", "aria-roledescription": "carousel", "aria-label": "Your tickets", onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "ArrowRight") { e.preventDefault(); go(active + 1); } else if (e.key === "ArrowLeft") { e.preventDefault(); go(active - 1); } } } : {})}
          onScroll={onScroll}
          className={cn(
            "flex gap-3",
            many && "-mx-4 sm:[mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)] snap-x snap-mandatory overflow-x-auto overscroll-x-contain px-4 pb-1 [scroll-padding-inline:16px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6",
          )}
        >
          {tickets.map((t, i) => (
            <div key={t.code} className={cn("min-w-0", many ? "basis-[92%] shrink-0 snap-center" : "w-full")}>
              <TicketPass code={t.code} row={event.row} seat={event.seats[i]} accessible={!!event.badges?.some((b) => /accessible/i.test(b))} ended={ended} count={tickets.length} label={many ? `Ticket ${i + 1} of ${tickets.length}` : "Your ticket"} onEnlarge={() => setBig(i)} />
            </div>
          ))}
        </div>
        <p className="mt-3 px-1 text-center text-[13px] text-mute">{ended ? "This event has passed. The codes no longer work." : "Show the code at the door. Turn your screen brightness up."}</p>
      </motion.section>

      {/* Wallet and directions */}
      <motion.div {...enter(0.24)} className="mt-6 flex flex-col gap-6">
        {!ended && <WalletHandoff />}

        <div className="flex flex-col gap-1 border-t border-border pt-6">
          <p className="text-[17px] font-medium">{event.venue}</p>
          <p className="text-[15px] text-ink2">{event.address}</p>
          <div className="mt-3">
            <Button variant="secondary" size="lg" asChild>
              <a href={ios ? `https://maps.apple.com/?q=${encodeURIComponent(event.address)}` : `https://maps.google.com/?q=${encodeURIComponent(event.address)}`} target="_blank" rel="noreferrer">
                <MapPin weight="bold" /> Get directions
              </a>
            </Button>
          </div>
        </div>
      </motion.div>
      <Drawer open={jump} onOpenChange={setJump}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Go to a ticket</DrawerTitle>
            <DrawerDescription>{tickets.length} tickets in this order.</DrawerDescription>
          </DrawerHeader>
          {/* the library GroupedList: the one list, a choice per row with a check on the current ticket */}
          <GroupedList data-vaul-no-drag className="mt-5 max-h-[50svh] overflow-y-auto overscroll-contain">
            {tickets.map((t, i) => (
              <GroupedListItem
                key={t.code}
                label={`Ticket ${i + 1}`}
                selected={i === active}
                ref={i === active ? (el: HTMLElement | null) => el?.scrollIntoView({ block: "center" }) : undefined}
                onClick={() => { go(i); setJump(false); }}
              >
                <span title={t.seat}>{t.seat}</span>
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
      <Toaster />
    </main>
  );
}
