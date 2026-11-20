"use client";

/**
 * Transfers: what you sent and what you were sent, grouped by what needs attention first.
 * Sent and pending: Resend or Cancel. Received and pending: Accept. Each confirm has the live
 * app's outcomes (already claimed, server trouble); rows marked in the demo data trigger them.
 * Outcomes are logged: window.__walletDemo.log
 */

import { useMemo, useState } from "react";
import { EnvelopeSimple, IdentificationCard, Package, PaperPlaneTilt, Ticket } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Alert, AlertContent, AlertDescription, AlertIndicator } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { SearchField } from "@/components/ui/search-field";
import { Status } from "@/components/ui/status";
import TicketStrip from "@/components/organisms/TicketStrip";
import { Chips, GroupHeader, PageHead, ResponsiveDialog, SCREEN, Toolbar } from "@/components/organisms/WalletParts";
import { glow } from "@/lib/walletUtils";
import { dayOf, demoLog, imageFor, type Transfer } from "@/lib/walletDemo";

type Side = "sent" | "received";
type Confirm = { mode: "accept" | "cancel"; t: Transfer } | null;
/** The day the transfer was made, for the date block ("Jul 31, 2026", "Today", "Yesterday"). */
const sentDay = (on: string) => {
  if (/today/i.test(on)) return dayOf(0).getUTCDate();
  if (/yesterday/i.test(on)) return dayOf(-1).getUTCDate();
  return Number(on.match(/(\d{1,2})/)?.[1] ?? 0) || "";
};
const initialsOf = (who: string) => (who.split("@")[0].split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("") || "?").toUpperCase();
const TECH = "We're experiencing technical difficulties. Please try again later.";

export default function WalletTransfers({
  sent, setSent, received, setReceived, initialSide = "sent",
}: {
  initialSide?: "sent" | "received";
  sent: Transfer[]; setSent: (f: (p: Transfer[]) => Transfer[]) => void;
  received: Transfer[]; setReceived: (f: (p: Transfer[]) => Transfer[]) => void;
}) {
  const [side, setSide] = useState<Side>(initialSide);
  const [q, setQ] = useState("");
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const live = (l: Transfer[]) => l.filter((t) => t.status !== "cancelled");
  const sentList = live(sent), recvList = live(received);
  const list = side === "sent" ? sentList : recvList;
  const term = q.trim().toLowerCase();
  const filtered = list.filter((t) => !term || `${t.title} ${t.seat} ${t.to ?? t.from}`.toLowerCase().includes(term));
  const groups = useMemo(() => {
    const wait = side === "sent" ? "Waiting to be claimed" : "Waiting for you";
    return [
      { name: wait, rows: filtered.filter((t) => t.status === "pending") },
      { name: "Claimed", rows: filtered.filter((t) => t.status === "claimed") },
    ].filter((g) => g.rows.length);
  }, [filtered, side]);

  const open = (mode: "accept" | "cancel", t: Transfer) => { setError(null); setConfirm({ mode, t }); };
  const run = () => {
    if (!confirm) return;
    const { mode, t } = confirm;
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      const err = t.fail === "claimed" ? "Transfer has already been claimed." : t.fail === "tech" ? TECH : null;
      demoLog(`transfer-${mode}`, { id: t.id, outcome: err ? "error" : "ok", message: err });
      if (err) { setError(err); return; }
      if (mode === "cancel") setSent((p) => p.map((x) => (x.id === t.id ? { ...x, status: "cancelled" } : x)));
      else setReceived((p) => p.map((x) => (x.id === t.id ? { ...x, status: "claimed", on: "Today" } : x)));
      setConfirm(null);
      toast(mode === "cancel" ? "Transfer cancelled" : "Transfer accepted");
    }, 700);
  };

  return (
    <div className={SCREEN}>
      <PageHead title="Transfers">A transfer stays pending until the recipient claims it. You can cancel any time before they do.</PageHead>

      <Toolbar
        chips={<Chips<Side>
          className="shrink-0" label="Direction" value={side} onChange={setSide}
          items={[{ id: "sent", label: "Sent", count: sentList.length }, { id: "received", label: "Received", count: recvList.length, badge: recvList.filter((t) => t.status === "pending").length }]}
        />}
        search={{ value: q, onChange: setQ, placeholder: "Search by event or person", label: "Search transfers" }}
      />

      {filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><PaperPlaneTilt weight="bold" /></EmptyMedia>
            <EmptyTitle>{term ? `Nothing matches “${q.trim()}”` : side === "received" ? "Nothing received yet" : "No transfers sent"}</EmptyTitle>
            <EmptyDescription>{term ? "Try a name, an email or an event." : side === "received" ? "Tickets people send you will land here." : "Open a ticket and choose Transfer to send a seat."}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="-mt-6 flex flex-col gap-2">
          {groups.map((g) => (
            <div key={g.name} className="flex flex-col gap-3">
              <GroupHeader name={g.name} count={g.rows.length} />
              <ul className="wl-list" onPointerMove={glow}>
                {g.rows.map((t) => {
                  const who = (side === "sent" ? t.to : t.from) ?? "";
                  const Kind = t.kind === "package" ? Package : t.kind === "pass" ? IdentificationCard : Ticket;
                  const kindLabel = t.kind === "package" ? "Package" : t.kind === "pass" ? "Access pass" : "Tickets";
                  const pending = t.status === "pending";
                  return (
                    <li key={t.id}>
                      <TicketStrip
                        dow={side === "sent" ? "Sent" : "Got"} d={sentDay(t.on)}
                        img={imageFor(t.title) ?? undefined} mono={initialsOf(who)}
                        chips={<><span className="tk-cat"><Kind size={14} weight="bold" aria-hidden />{kindLabel}</span><Status color={pending ? "warning" : "success"} pulse={pending}>{pending ? "Pending" : "Claimed"}</Status></>}
                        title={t.title} href="#" onSelect={() => {}}
                        meta={`${t.seat} · ${side === "sent" ? "To" : "From"} ${who}${t.behalf ? ` · on behalf of ${t.behalf}` : ""}`}
                        cta={
                          !pending ? <span className="text-[13px] text-ink2">{t.on}</span> : side === "sent" ? (
                            <div className="flex items-center gap-1.5">
                              <Button variant="ghost" size="sm" onClick={() => { demoLog("transfer-resend", { id: t.id }); toast(`Email sent again to ${who}`); }}><EnvelopeSimple weight="bold" aria-hidden /> Resend</Button>
                              <Button variant="danger-soft" size="sm" onClick={() => open("cancel", t)}>Cancel</Button>
                            </div>
                          ) : (
                            <Button size="sm" onClick={() => open("accept", t)}>Accept</Button>
                          )
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      <ResponsiveDialog open={!!confirm} onOpenChange={(o) => !o && !busy && setConfirm(null)} footerInline
        title={confirm ? (confirm.mode === "cancel" ? "Cancel this transfer?" : `Accept ${confirm.t.kind === "package" ? "this package" : confirm.t.kind === "pass" ? "this pass" : "these tickets"}?`) : ""}
        description={confirm ? (confirm.mode === "cancel"
          ? `${confirm.t.seat} goes back to your wallet and ${confirm.t.to} can no longer claim it.`
          : `${confirm.t.title} · ${confirm.t.seat}. ${confirm.t.kind === "ticket" || !confirm.t.kind ? "They’ll" : "It’ll"} move into your wallet.`) : undefined}
        footer={confirm ? (
          <>
            <Button variant="tertiary" disabled={busy} onClick={() => setConfirm(null)}>{confirm.mode === "cancel" ? "Keep transfer" : "Not now"}</Button>
            <Button variant={confirm.mode === "cancel" ? "danger" : "primary"} disabled={busy} onClick={run}>
              {busy ? (confirm.mode === "cancel" ? "Cancelling…" : "Accepting…") : confirm.mode === "cancel" ? "Cancel transfer" : "Accept"}
            </Button>
          </>
        ) : undefined}>
        {confirm && error && <Alert variant="danger"><AlertIndicator /><AlertContent><AlertDescription>{error}</AlertDescription></AlertContent></Alert>}
      </ResponsiveDialog>
    </div>
  );
}
