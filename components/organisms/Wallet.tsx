"use client";

/**
 * Wallet: the general Blocktickets fan account (demo data, no backend).
 * login → code → Tickets → Transfers → Profile.
 *
 * Tickets is a two-pane workspace: a runway of your events (soonest first, with
 * a countdown) beside the selected pass, whose QR is already on screen. "Open at
 * the gate" takes the code full screen and keeps the display awake. Built from
 * library parts and tokens only; the pass itself is organisms/WalletPass.
 */

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft, CaretRight, CheckCircle, EnvelopeSimple, PaperPlaneTilt, Coins, Tag, Ticket, UserCircle, Warning,
} from "@phosphor-icons/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Drawer, DrawerBody, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from "@/components/ui/item";
import { Status } from "@/components/ui/status";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import WalletListings from "@/components/organisms/WalletListings";
import WalletMoney from "@/components/organisms/WalletMoney";
import { Chips, ScreenSkeleton } from "@/components/organisms/WalletParts";
import { demoMemberships, type ClubsDemo } from "@/lib/walletMemberships";
import WalletProfile from "@/components/organisms/WalletProfile";
import WalletTransfers from "@/components/organisms/WalletTransfers";
import type { BankState } from "@/lib/walletMoneyDemo";
import WalletSellDialog from "@/components/organisms/WalletSellDialog";
import WalletTransferDialog from "@/components/organisms/WalletTransferDialog";
import WalletFeed from "@/components/organisms/WalletFeed";
import { PAYOUTS } from "@/lib/walletMoneyDemo";
import WalletNav, { type NavItem } from "@/components/organisms/WalletNav";
import WalletPass, { SeatSwitch, WalletMonogram, WalletQr } from "@/components/organisms/WalletPass";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  ACCESS_PASSES, BUYER_EMAIL, BUYER_NAME, EVENTS, FLEX_PACKS, PACKAGES, LISTINGS_DEFAULT, RECEIVED, availability, type WalletListing, SENT_DEFAULT, countdownLabel, ticketsFor, type Transfer, type WalletEvent,
} from "@/lib/walletDemo";


type Screen = "login" | "code" | "events" | "listings" | "resale" | "money" | "profile";

const NAV = [
  { id: "events", label: "Tickets", icon: Ticket },
  { id: "listings", label: "Transfers", icon: PaperPlaneTilt },
  { id: "resale", label: "Listings", icon: Tag },
  { id: "money", label: "Money", icon: Coins },
  { id: "profile", label: "Profile", icon: UserCircle },
] as const;

const HASH: Partial<Record<Screen, string>> = { events: "tickets", listings: "transfers", resale: "listings", money: "money", profile: "profile" };
const H1 = "text-balance text-[clamp(32px,4.2vw,56px)] font-semibold leading-[1.06] tracking-[-0.03em]";
const validEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim());
const byDay = (a: WalletEvent, b: WalletEvent) => a.inDays - b.inDays;

export default function Wallet({ initialScreen = "events" }: { initialScreen?: Screen }) {
  const reduce = useReducedMotion();
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [email, setEmail] = useState(BUYER_EMAIL);
  const [code, setCode] = useState("");
  const [evId, setEvId] = useState("raptors");
  const [seat, setSeat] = useState(0);
  const [gate, setGate] = useState(false);
  const [tf, setTf] = useState<null | { kind: "ticket" | "pass"; key: number; seat?: string; subject?: string; what?: "pass" | "package" }>(null);
  const [sell, setSell] = useState<null | { key: number; seat?: string }>(null);
  const [bank, setBank] = useState<BankState>("linked");
  const bankLinked = bank === "linked";
  const [listings, setListings] = useState<WalletListing[]>(LISTINGS_DEFAULT);
  const [sent, setSent] = useState<Transfer[]>(SENT_DEFAULT);
  const [received, setReceived] = useState<Transfer[]>(RECEIVED);
  type Scenario = "full" | "empty" | "loading" | "error" | "retrying";
  const [scenario, setScenario] = useState<Scenario>("full");
  const [clubs, setClubs] = useState<ClubsDemo>("two");
  const [tSide, setTSide] = useState<"sent" | "received">("sent");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("scenario");
    if (q === "empty" || q === "loading" || q === "error") setScenario(q);
  }, []);
  useEffect(() => {
    if (scenario !== "retrying") return;
    const t = setTimeout(() => setScenario("full"), 1400);
    return () => clearTimeout(t);
  }, [scenario]);

  /* Demo session: a cookie set when the code is entered. Showing the login screen (signed out, log out, sign out) clears it. */
  useEffect(() => {
    if (initialScreen === "login") document.cookie = "bt-session=; path=/; max-age=0; samesite=lax";
  }, [initialScreen]);

  /* Screens live in the URL hash (#tickets, #transfers, #profile) so the account menu, the back button and a shared link all land in the right place. */
  useEffect(() => {
    const read = () => {
      const s = (Object.entries(HASH).find(([, h]) => h === window.location.hash.slice(1)) ?? [])[0] as Screen | undefined;
      if (s && initialScreen !== "login") setScreen(s);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [initialScreen]);
  const go = (s: Screen) => {
    setScreen(s);
    if (HASH[s] && window.location.hash.slice(1) !== HASH[s]) window.history.pushState(null, "", `#${HASH[s]}`);
  };

  const isBuyer = email.trim().toLowerCase() === BUYER_EMAIL && scenario !== "empty";
  const emptyScenario = scenario === "empty";
  const ev: WalletEvent = EVENTS.find((e) => e.id === evId) ?? EVENTS[0];
  const next = EVENTS.filter((e) => !e.past).sort(byDay)[0];
  const authed = screen !== "login" && screen !== "code";
  const sentList = (isBuyer ? sent : []).filter((t) => t.status !== "cancelled");
  const pendingIn = (isBuyer ? received : []).filter((t) => t.status === "pending").length;

  const pick = (e: WalletEvent) => { setEvId(e.id); setSeat(0); };
  const openTransfer = (seatNo?: string) => setTf({ kind: "ticket", key: Date.now(), seat: seatNo });
  const openSell = (seatNo?: string) => setSell({ key: Date.now(), seat: seatNo });

  /* The same number on the installed app's icon, so it shows when the wallet is not on screen (browsers without the badge API ignore it). */
  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    try { (pendingIn > 0 ? nav.setAppBadge?.(pendingIn) : nav.clearAppBadge?.())?.catch(() => {}); } catch { /* not supported here */ }
  }, [pendingIn]);

  /* Keep the display awake while the code is full screen, where the browser allows it. */
  useEffect(() => {
    if (!gate) return;
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => { lock = l; }).catch(() => {});
    return () => { lock?.release().catch(() => {}); };
  }, [gate]);

  /* the transfer or sell flow, shown in the open ticket sheet in place of the ticket */
  const flow = tf ? (
    <WalletTransferDialog key={tf.key} ownName={email.trim().toLowerCase() === BUYER_EMAIL ? BUYER_NAME : undefined} recents={[...new Set([...sent.map((t) => t.to), ...received.map((t) => t.from)].filter((x): x is string => !!x && x.includes("@")))]} initial={tf.seat} open kind={tf.kind} passName={tf.subject} what={tf.what} event={tf.subject ? undefined : ev} ownEmail={email} onClose={() => setTf(null)}
          onSent={(rows) => setSent((p) => [...rows.map((r, i) => ({ id: `t${Date.now()}${i}`, to: r.to, title: tf.subject ?? ev.title, seat: r.seat, on: "Today", status: "pending" as const })), ...p])}
          onView={() => { setTf(null); go("listings"); }} />
  ) : sell ? (
    <WalletSellDialog key={sell.key} initial={sell.seat} open event={ev} bankLinked={bankLinked} onBank={(v) => setBank(v ? "linked" : "none")} onClose={() => setSell(null)}
          onListed={(rows) => setListings((p) => [...rows.map((r, i) => ({ id: `n${Date.now()}${i}`, title: ev.title, seat: r.seat, qty: 1, price: r.price, status: "active" as const, on: "today" })), ...p])}
          onView={() => { setSell(null); go("resale"); }} />
  ) : null;

  /* ---------- screens ---------- */
  const heading = next.inDays === 0
    ? { h: "You’re in tonight.", p: `${next.title} · doors ${next.doors}` }
    : { h: `Next up in ${next.inDays} days.`, p: next.title };

  const tickets = (
    <div className="flex flex-col gap-5 sm:gap-8">
      <div className="min-w-0">
        {isBuyer ? (
          <>
            <h1 className={H1}>{heading.h}</h1>
            <p className="mt-3 text-[17px] leading-snug text-ink2 max-sm:hidden">{heading.p}</p>
          </>
        ) : (
          <h1 className={H1}>My tickets</h1>
        )}
      </div>

      {isBuyer ? (
        <WalletFeed evId={ev.id} onPickEvent={pick} seat={seat} onSeat={setSeat} onGate={() => setGate(true)} onTransfer={openTransfer} onSell={openSell} incomingList={(isBuyer ? received : []).filter((t) => t.status === "pending").map((t) => ({ from: t.from ?? "", kind: t.kind ?? "ticket" }))} onReview={() => { setTSide("received"); go("listings"); }} onTransferPack={(name, k) => setTf({ kind: "pass", key: Date.now(), subject: name, what: k })} flow={flow} onFlowClose={() => { setTf(null); setSell(null); }} />
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Ticket weight="bold" /></EmptyMedia>
            <EmptyTitle>{emptyScenario ? "No tickets yet" : "No tickets on this email"}</EmptyTitle>
            <EmptyDescription>{emptyScenario ? "Tickets you buy will show up here, ready to scan." : `We couldn’t find tickets for ${email}. If you bought with a different address, sign in with that one.`}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild><Link href="/browse">Browse events</Link></Button>
              {!emptyScenario && <Button variant="secondary" asChild><Link href="/login">Try a different email</Link></Button>}
            </div>
          </EmptyContent>
        </Empty>
      )}
    </div>
  );

  const transfers = isBuyer
    ? <WalletTransfers key={tSide} initialSide={tSide} sent={sent} setSent={setSent} received={received} setReceived={setReceived} />
    : <WalletTransfers sent={[]} setSent={setSent} received={[]} setReceived={setReceived} />;
  const money = <WalletMoney bank={bank} setBank={setBank} empty={emptyScenario} />;
  const profile = <WalletProfile isBuyer={isBuyer} email={email} memberships={demoMemberships(clubs)} />;

  const login = (
    <div className="mx-auto flex w-full max-w-[440px] flex-col gap-6 pt-6 md:pt-16">
      <div>
        <h1 className="text-balance text-[clamp(32px,4.2vw,48px)] font-semibold leading-[1.06] tracking-[-0.03em]">Your tickets, in one place.</h1>
        <p className="mt-3 text-pretty text-[17px] text-ink2">Enter the email you bought with and we’ll send a six-digit code. No password to remember.</p>
      </div>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (validEmail(email)) { setScreen("code"); setCode(""); } }}>
        <Field>
          <FieldLabel htmlFor="wallet-email">Email address</FieldLabel>
          <Input id="wallet-email" type="email" autoComplete="email" size="lg" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
        </Field>
        <Button type="submit" size="lg" fullWidth disabled={!validEmail(email)}><EnvelopeSimple weight="bold" /> Send my code</Button>
        <p className="text-[13px] text-ink2">By continuing you agree to the Blocktickets terms and privacy policy.</p>
      </form>
    </div>
  );

  const codeScreen = (
    <div className="mx-auto flex w-full max-w-[440px] flex-col gap-6 pt-6 md:pt-16">
      <Button variant="ghost" size="sm" className="self-start" onClick={() => setScreen("login")}><ArrowLeft weight="bold" /> Back</Button>
      <div>
        <h1 className="text-[clamp(32px,4.2vw,48px)] font-semibold leading-[1.06] tracking-[-0.03em]">Enter your code</h1>
        <p className="mt-3 text-[17px] text-ink2">Sent to <span className="font-medium text-foreground">{email}</span></p>
      </div>
      <InputOTP
        maxLength={6}
        size="lg"
        autoFocus
        inputMode="numeric"
        autoComplete="one-time-code"
        value={code}
        onChange={setCode}
        onComplete={() => window.setTimeout(() => { document.cookie = "bt-session=1; path=/; max-age=2592000; samesite=lax"; window.location.assign("/wallet#tickets"); }, 260)}
        aria-label="Six-digit code"
      >
        <InputOTPGroup>{[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
      </InputOTP>
      <p className="text-[15px] text-ink2">Didn’t get it? <Button variant="ghost" size="sm" onClick={() => toast("A new code is on its way")}>Send a new code</Button></p>
    </div>
  );

  const body = { login, code: codeScreen, events: tickets, listings: transfers, resale: <WalletListings listings={emptyScenario ? [] : listings} setListings={setListings} />, money, profile }[screen];
  const loadError = (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon"><Warning weight="bold" /></EmptyMedia>
        <EmptyTitle>We couldn’t load your wallet</EmptyTitle>
        <EmptyDescription>Something went wrong on our side. Your tickets are safe.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent><Button onClick={() => setScenario("retrying")}>Try again</Button></EmptyContent>
    </Empty>
  );
  const shown = !authed ? body : scenario === "loading" || scenario === "retrying" ? <ScreenSkeleton /> : scenario === "error" ? loadError : body;
  const navItems: NavItem[] = NAV.map((n) => ({
    ...n,
    /* a number only where something waits on you: incoming transfers, and payouts that failed (the same count as "1 payout needs attention" on Money; nothing for someone who never sold) */
    badge: emptyScenario ? undefined : n.id === "listings" ? pendingIn || undefined : n.id === "money" ? PAYOUTS.filter((p) => p.status === "failed").length || undefined : undefined,
    count: emptyScenario ? undefined : n.id === "events" ? EVENTS.filter((e) => !e.past).length : n.id === "listings" ? sentList.filter((t) => t.status === "pending").length + pendingIn : n.id === "resale" ? listings.filter((l) => l.status === "active").length : undefined,
  }));
  const gateTicket = ticketsFor(ev)[Math.min(seat, ev.seats.length - 1)];

  return (
    <div className="min-h-screen bg-background text-foreground">

      <main className="mx-auto w-full max-w-[1800px] px-4 pb-36 pt-[104px] md:pt-[124px] sm:px-8 lg:pb-28 2xl:px-14">
        <div className="lg:flex lg:gap-12">
          {authed && (
            <WalletNav
              items={navItems}
              active={screen}
              onChange={(id) => { if (id === "listings") setTSide("sent"); go(id as Screen); }}
              next={isBuyer ? next : undefined}
              onGate={() => { pick(next); setGate(true); }}
            />
          )}
          <div className="min-w-0 flex-1">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={screen}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
              >
                {shown}
              </motion.div>
            </AnimatePresence>
            {authed && (
              <div className="mt-16 flex flex-col gap-3">
                <p className="text-[13px] text-mute">Demo wallet with sample tickets. Codes are not live yet. Scenario:</p>
                <Chips<Scenario> label="Demo scenario" value={scenario === "retrying" ? "loading" : scenario} onChange={setScenario}
                  items={[{ id: "full", label: "Full wallet" }, { id: "empty", label: "Empty" }, { id: "loading", label: "Loading" }, { id: "error", label: "Error" }]} />
                <p className="text-[13px] text-mute">Membership clubs:</p>
                <Chips<ClubsDemo> label="Demo membership clubs" value={clubs} onChange={setClubs}
                  items={[{ id: "none", label: "No club" }, { id: "one", label: "One club" }, { id: "two", label: "Two clubs" }]} />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Gate mode */}
      <Drawer open={gate} onOpenChange={setGate}>
        <DrawerContent className="max-h-[96dvh]">
          <DrawerHeader>
            <DrawerTitle className="text-balance">{ev.title}</DrawerTitle>
            <DrawerDescription>{ev.date} · {ev.time} · doors {ev.doors}</DrawerDescription>
          </DrawerHeader>
          <DrawerBody className="flex flex-col items-center justify-center gap-5">
            <SeatSwitch event={ev} value={seat} onChange={setSeat} />
            <WalletQr code={gateTicket.code} className="aspect-square w-[min(86vw,48vh,420px)] p-4" />
            <div className="text-center">
              <p className="text-[17px] font-medium">{gateTicket.seat}</p>
              <p className="mt-1 text-[13px] tracking-[0.06em] text-ink2">{gateTicket.code}</p>
              <p className="mt-3 text-[13px] text-mute">Your screen stays on while this is open. Demo code.</p>
            </div>
          </DrawerBody>
          <DrawerFooter className="pb-[calc(16px+env(safe-area-inset-bottom,0px))]"><Button variant="secondary" size="lg" fullWidth onClick={() => setGate(false)}>Close</Button></DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Toaster />
    </div>
  );
}
