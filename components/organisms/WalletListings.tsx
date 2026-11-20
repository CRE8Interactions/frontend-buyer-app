"use client";

/** Resale listings: Active, Sold and Expired, with edit price and remove. Demo data. */

import { useState } from "react";
import NumberFlow from "@number-flow/react";
import { Tag, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { HoldButton } from "@/components/ui/hold-button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Status } from "@/components/ui/status";
import TicketStrip from "@/components/organisms/TicketStrip";
import { BigAmount } from "@/components/organisms/WalletFlow";
import { Chips, PageHead, ResponsiveDialog, SCREEN } from "@/components/organisms/WalletParts";
import { MAX_ASKING, MAX_ASKING_TEXT, glow, priceShort } from "@/lib/walletUtils";
import { dayOf, demoLog, imageFor, type WalletListing } from "@/lib/walletDemo";

type Tab = "active" | "sold" | "expired";
const COPY = {
  active: ["No active listings", "When you list tickets for resale, they will show up here."],
  sold: ["Nothing sold yet", "Listings that sell will move here."],
  expired: ["No expired listings", "Listings that end without a sale will move here."],
} as const;
/* 44px targets on touch screens, the compact size with a mouse */
const TOUCH = "[@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11";
const usd = (n: number) => `$${n.toFixed(2)}`;
/* the demo's face value and service fee, the same as the sell flow */
const FACE = 24;
const FEE = 0.1;
/** The day of the month the listing was made, sold or ended ("Jul 31", "today"). */
const dayNum = (on: string) => (/today/i.test(on) ? dayOf(0).getUTCDate() : Number(on.match(/(\d{1,2})/)?.[1] ?? 0) || "");

export default function WalletListings({ listings, setListings }: { listings: WalletListing[]; setListings: (f: (p: WalletListing[]) => WalletListing[]) => void }) {
  const [tab, setTab] = useState<Tab>("active");
  const [edit, setEdit] = useState<WalletListing | null>(null);
  const [editOpen, setEditOpen] = useState(false); // open is its own flag, so the content stays put while the dialog animates away
  const [price, setPrice] = useState<number | null>(null);
  const [rm, setRm] = useState<WalletListing | null>(null);
  const [rmOpen, setRmOpen] = useState(false);
  const shown = listings.filter((l) => l.status === tab);
  const count = (s: Tab) => listings.filter((l) => l.status === s).length;
  const problem = price == null || price <= 0 ? "Enter a price greater than 0." : price < FACE ? `The lowest you can ask is ${usd(FACE)}, the face value.` : price > MAX_ASKING ? `Asking price can’t be more than ${MAX_ASKING_TEXT}.` : null;
  const bad = !!problem;
  const fee = (price ?? 0) * FEE;
  const payout = (price ?? 0) - fee;

  return (
    <div className={SCREEN}>
      <PageHead title="Listings">Tickets you’ve put up for resale. Payouts are deposited after the event.</PageHead>

      <Chips<Tab>
        label="Listing status" value={tab} onChange={setTab}
        items={(["active", "sold", "expired"] as const).map((t) => ({ id: t, label: t[0].toUpperCase() + t.slice(1), count: count(t) }))}
      />

      {shown.length === 0 ? (
        <Empty><EmptyHeader><EmptyMedia variant="icon"><Tag weight="bold" /></EmptyMedia><EmptyTitle>{COPY[tab][0]}</EmptyTitle><EmptyDescription>{COPY[tab][1]}</EmptyDescription></EmptyHeader></Empty>
      ) : (
        <ul className="wl-list" onPointerMove={glow}>
          {shown.map((l) => (
            <li key={l.id}>
              <TicketStrip
                dow={l.status === "active" ? "Listed" : l.status === "sold" ? "Sold" : "Ended"} d={dayNum(l.on)}
                img={imageFor(l.title) ?? undefined} mono={l.title.split(" ").filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join("")}
                chips={<><span className="tk-cat"><Tag size={14} weight="bold" aria-hidden />Resale</span><Status color={l.status === "active" ? "success" : l.status === "sold" ? "info" : "neutral"}>{l.status === "active" ? "Listed" : l.status === "sold" ? "Sold" : "Expired"}</Status></>}
                title={l.title} static
                meta={l.status === "sold" ? `${l.seat} · Sold to ${l.soldTo} · deposited after the event` : l.seat}
                priceLabel={l.status === "sold" ? "Payout" : l.status === "active" ? "Asking" : "Asked"} price={priceShort(l.status === "sold" ? (l.payout ?? 0) : l.price)}
                cta={l.status === "active" ? (
                  /* Edit is the action, so it has a word; remove is the quiet one, a red icon. Both are 44px on a touch screen, and the pair wraps rather than clips. */
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <Button variant="secondary" size="sm" className={TOUCH} onClick={() => { setEdit(l); setPrice(l.price); setEditOpen(true); }}>Edit</Button>
                    <Button variant="danger-soft" size="sm" iconOnly className={TOUCH} aria-label={`Remove listing, ${l.seat}`} title="Remove listing" onClick={() => { setRm(l); setRmOpen(true); }}><Trash weight="bold" /></Button>
                  </div>
                ) : <span />}
              />
            </li>
          ))}
        </ul>
      )}

      <ResponsiveDialog open={editOpen} onOpenChange={setEditOpen} size="md" title="Edit price" description={edit?.title} footerInline
        footer={<>
          <Button variant="tertiary" onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button disabled={bad} onClick={() => {
              setListings((p) => p.map((l) => (l.id === edit?.id ? { ...l, price: price ?? l.price } : l)));
              demoLog("listing-edit", { id: edit?.id, price });
              setEditOpen(false); toast("Price updated");
            }}>Save</Button>
        </>}>
        {/* the same price step as selling: the amount large, then what you will receive and how it is worked out */}
        <div className="flex w-full flex-col gap-4 text-foreground">
          <div className="flex flex-col gap-2">
            <BigAmount label="Asking price" value={price} onChange={setPrice} min={FACE} max={MAX_ASKING} invalid={bad} />
            {bad && <p role="alert" className="text-center text-[15px] text-destructive">{problem}</p>}
          </div>
          <div className="rounded-[24px] bg-secondary/70 p-4">
            <p className="text-[15px] text-ink2">You’ll receive</p>
            <NumberFlow value={bad ? 0 : payout} format={{ style: "currency", currency: "USD" }} className="mt-1 block text-[40px] font-semibold leading-none tracking-[-0.04em] tabular-nums" />
            <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3 text-[15px] text-ink2">
              <div className="flex justify-between"><span>Ticket price</span><span className="tabular-nums">{usd(bad ? 0 : (price ?? 0))}</span></div>
              <div className="flex justify-between"><span>Service fee (10%)</span><span className="tabular-nums">−{usd(bad ? 0 : fee)}</span></div>
            </div>
          </div>
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog open={rmOpen} onOpenChange={setRmOpen} title="Remove this listing?" description={<>{rm?.seat} stops being for sale and goes back to your wallet. Buyers who were looking at it will no longer see it.</>} footerInline
        footer={<>
          <Button variant="tertiary" onClick={() => setRmOpen(false)}>Keep listing</Button>
          {/* taking a listing down ends the sale: it takes a hold, like the other removals */}
          <HoldButton variant="danger" duration={1200} holdLabel="Keep holding…" onHoldComplete={() => { setListings((p) => p.filter((l) => l.id !== rm?.id)); demoLog("listing-remove", { id: rm?.id }); setRmOpen(false); toast("Listing removed"); }}>Hold to remove</HoldButton>
        </>} />
    </div>
  );
}
