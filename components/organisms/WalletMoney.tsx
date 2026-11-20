"use client";

/**
 * Money: everything that moves money, in one place. A running statement of what is on its way to
 * you, then Activity (with receipts), Payouts, Bank account and Giving. The bank account's state
 * (not linked, incomplete, verifying, linked) drives the sell flow's payout step too. Outcomes
 * are logged: window.__walletDemo.log
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import NumberFlow from "@number-flow/react";
import { ArrowDownLeft, ArrowUpRight, Bank, CaretRight, Gift as GiftIcon, Receipt, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertContent, AlertDescription, AlertIndicator, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { HoldButton } from "@/components/ui/hold-button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { SearchField } from "@/components/ui/search-field";
import { Status } from "@/components/ui/status";
import { Chips, GroupHeader, PageHead, PullLoadMore, ResponsiveDialog, SCREEN, Toolbar } from "@/components/organisms/WalletParts";
import { cn } from "@/lib/utils";
import { demoLog } from "@/lib/walletDemo";
import {
  ACTIVITY_ROWS, BANK_STATES, GIFTS, PAYOUTS, monthOf, shortDate, usd, type ActivityKind, type BankState, type Payout,
} from "@/lib/walletMoneyDemo";

type Section = "activity" | "payouts" | "bank" | "giving";
type Filter = "all" | "purchase" | "refund" | "resale";
const KIND_LABEL: Record<ActivityKind, string> = { purchase: "Purchase", refund: "Refund", resale: "Resale", pass: "Access pass", flex: "Flex pack" };
const PAYOUT: Record<Payout["status"], { label: string; color: "warning" | "info" | "success" | "danger" }> = {
  hold: { label: "On hold", color: "warning" }, processing: { label: "Processing", color: "info" },
  deposited: { label: "Deposited", color: "success" }, failed: { label: "Failed", color: "danger" },
};

function Activity({ data }: { data: typeof ACTIVITY_ROWS }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(8);
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const match = (r: (typeof ACTIVITY_ROWS)[number], f: Filter) =>
    f === "all" || (f === "purchase" ? ["purchase", "pass", "flex"].includes(r.kind) : r.kind === f);
  const counts = (f: Filter) => data.filter((r) => match(r, f)).length;
  const term = q.trim().toLowerCase();
  const rows = data.filter((r) => match(r, filter) && (!term || r.title.toLowerCase().includes(term)));
  const shown = rows.slice(0, limit);
  const groups = useMemo(() => shown.reduce<{ name: string; rows: typeof shown }[]>((a, r) => {
    const n = monthOf(r.inDays); const g = a.find((x) => x.name === n);
    if (g) g.rows.push(r); else a.push({ name: n, rows: [r] });
    return a;
  }, []), [shown]);

  const receipt = (id: string, fail?: boolean) => {
    setBusy(id); setFailed(null);
    setTimeout(() => {
      setBusy(null);
      demoLog("receipt", { id, outcome: fail ? "error" : "downloaded" });
      if (fail) setFailed(id); else toast("Receipt downloaded");
    }, 800);
  };

  return (
    <div className="flex flex-col gap-5">
      <Toolbar
        chips={<Chips<Filter>
          className="shrink-0"
          label="Activity type" value={filter} onChange={(f) => { setFilter(f); setLimit(8); }}
          items={[{ id: "all", label: "All", count: counts("all") }, { id: "purchase", label: "Purchases", count: counts("purchase") }, { id: "refund", label: "Refunds", count: counts("refund") }, { id: "resale", label: "Resale", count: counts("resale") }]}
        />}
        search={{ value: q, onChange: (v) => { setQ(v); setLimit(8); }, placeholder: "Search activity", label: "Search activity" }}
      />
      {rows.length === 0 ? (
        <Empty><EmptyHeader><EmptyMedia variant="icon"><Receipt weight="bold" /></EmptyMedia>
          <EmptyTitle>{term ? `Nothing matches “${q.trim()}”` : filter === "refund" ? "No refunds yet" : filter === "resale" ? "Nothing sold yet" : "No activity yet"}</EmptyTitle>
          <EmptyDescription>{term ? "Try an event name." : "Purchases, refunds and resale will show up here."}</EmptyDescription></EmptyHeader></Empty>
      ) : (
        <div className="flex flex-col gap-2">
          {groups.map((g) => (
            <div key={g.name} className="flex flex-col gap-2">
              <GroupHeader name={g.name} count={g.rows.length} />
              {g.rows.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-[20px] p-2.5 pr-3 transition-colors duration-150 hover:bg-card/60">
                  <span aria-hidden className={cn("flex size-11 shrink-0 items-center justify-center rounded-full", /* a faint disc, a full-strength arrow: in is green, out is the page's ink */ r.amount < 0 ? "bg-foreground/10 text-foreground" : "bg-primary/15 text-green-deep")}>
                    {r.amount < 0 ? <ArrowUpRight weight="bold" className="size-5" /> : <ArrowDownLeft weight="bold" className="size-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-[15px] font-medium leading-snug">{r.title}</div>
                    <div className="truncate text-[13px] text-ink2">{KIND_LABEL[r.kind]} · {shortDate(r.inDays)}</div>
                    {failed === r.id && <div className="text-[13px] text-destructive">Could not download receipt.</div>}
                  </div>
                  <span className={cn("text-[15px] font-medium tabular-nums", r.amount > 0 && "text-green-deep")}>{r.amount > 0 ? "+" : ""}{usd(r.amount)}</span>
                  <Button variant="ghost" size="sm" disabled={busy === r.id} onClick={() => receipt(r.id, r.fail)} aria-label={`Receipt for ${r.title}`}>
                    <Receipt weight="bold" /> <span className={busy === r.id ? "" : "hidden sm:inline"}>{busy === r.id ? "Downloading…" : "Receipt"}</span>
                  </Button>
                </div>
              ))}
            </div>
          ))}
          <PullLoadMore remaining={rows.length - shown.length} step={8} onMore={() => setLimit((n) => n + 8)} />
        </div>
      )}
    </div>
  );
}

function Payouts({ bank, goBank, list, spot, onSpotDone }: { bank: BankState; goBank: () => void; list: Payout[]; spot?: { id: string; n: number } | null; onSpotDone?: () => void }) {
  /* arriving from "1 payout needs attention": bring that payout to the middle of the screen, focus it and tint it for a moment */
  useEffect(() => {
    if (!spot) return;
    const el = document.getElementById(`payout-${spot.id}`);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = window.setTimeout(() => { el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }); el?.focus({ preventScroll: true }); }, 60);
    const t1 = window.setTimeout(() => onSpotDone?.(), 2200);
    return () => { window.clearTimeout(t0); window.clearTimeout(t1); };
  }, [spot, onSpotDone]);
  return (
    <div className="flex flex-col gap-4">
      {bank !== "linked" && (
        <Alert variant="warning">
          <AlertIndicator />
          <AlertContent>
            <AlertTitle>{bank === "none" ? "No bank account linked" : bank === "verifying" ? "Your bank account is being verified" : "Finish linking your bank account"}</AlertTitle>
            <AlertDescription>Payouts are deposited here once it’s ready.</AlertDescription>
          </AlertContent>
          <Button size="sm" variant="secondary" onClick={goBank}>{bank === "none" ? "Link account" : "Open bank account"}</Button>
        </Alert>
      )}
      <div className="flex flex-col gap-2">
        {list.length === 0 && (
          <Empty><EmptyHeader><EmptyMedia variant="icon"><Bank weight="bold" /></EmptyMedia><EmptyTitle>No payouts yet</EmptyTitle><EmptyDescription>When something you list sells, its payout shows up here.</EmptyDescription></EmptyHeader></Empty>
        )}
        {list.map((p) => (
          <div key={p.id} id={`payout-${p.id}`} tabIndex={-1} className={cn("flex scroll-mt-28 flex-wrap items-center gap-x-4 gap-y-2 rounded-[24px] p-4 outline-none transition-colors duration-500 hover:bg-card/60 sm:flex-nowrap", spot?.id === p.id && "bg-warn/15")}>
            <div className="min-w-0 flex-1 basis-[220px]">
              <div className="text-[15px] font-medium leading-snug">{p.title}</div>
              <div className="mt-0.5 text-[13px] text-ink2">{p.note}</div>
            </div>
            <div className="ml-auto flex items-center gap-4">
              <Status color={PAYOUT[p.status].color} pulse={p.status === "processing"}>{PAYOUT[p.status].label}</Status>
              <span className="w-20 text-right text-[15px] font-medium tabular-nums">{usd(p.amount)}</span>
              {p.status === "failed" && <Button size="sm" variant="secondary" onClick={goBank}>Fix account</Button>}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[13px] text-mute">Payouts are deposited after the event. You do not need to withdraw them.</p>
    </div>
  );
}

function BankPanel({ bank, setBank }: { bank: BankState; setBank: (b: BankState) => void }) {
  const [del, setDel] = useState(false);
  const copy: Record<BankState, { title: string; text: string; action?: string; next?: BankState }> = {
    none: { title: "No bank account linked", text: "Link a bank account to receive resale payouts.", action: "Link bank account", next: "incomplete" },
    incomplete: { title: "Setup isn’t finished", text: "You haven’t finished setting up your banking info. Continue to finish setting up your bank account.", action: "Continue setup", next: "verifying" },
    verifying: { title: "Verifying your account", text: "Check back in a few minutes.", action: "Check again", next: "linked" },
    linked: { title: "U.S. Dollars, United States", text: "Depositing to the account ending 6021.", action: "Manage" },
  };
  const c = copy[bank];
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4 rounded-[24px] bg-card p-5">
        <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-[16px] bg-secondary"><Bank weight="bold" className="size-7" /></span>
        <div className="min-w-0 flex-1 basis-[220px]">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[17px] font-semibold">{c.title}</div>
            <Status color={bank === "linked" ? "success" : bank === "verifying" ? "info" : "warning"} pulse={bank === "verifying"}>
              {bank === "linked" ? "Active" : bank === "verifying" ? "Verifying" : bank === "incomplete" ? "Incomplete" : "Not linked"}
            </Status>
          </div>
          <p className="mt-1 max-w-[52ch] text-[15px] text-ink2">{c.text}</p>
        </div>
        <div className="flex gap-2">
          {bank === "linked" ? (
            <Button variant="danger-soft" onClick={() => setDel(true)}>Remove</Button>
          ) : null}
          {c.action && <Button onClick={() => (c.next ? (demoLog("bank", { from: bank, to: c.next }), setBank(c.next)) : toast("Opening your bank settings"))} variant={bank === "linked" ? "secondary" : "primary"}>{c.action}</Button>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] text-mute">Demo state</span>
        <Chips<BankState> label="Bank account state" value={bank} onChange={(b) => { demoLog("bank", { to: b }); setBank(b); }} items={BANK_STATES.map((s) => ({ id: s.id, label: s.label }))} />
      </div>

      <ResponsiveDialog open={del} onOpenChange={setDel} title="Delete bank account?" description="Payouts stop landing here. You can link a new account after, and it will be checked again." footerInline
        footer={<>
          <Button variant="tertiary" onClick={() => setDel(false)}>Cancel</Button>
          {/* payouts stop landing and linking again means verification again, so deleting takes a hold */}
          <HoldButton variant="danger" duration={1200} holdLabel="Keep holding…" onHoldComplete={() => { demoLog("bank", { to: "none", via: "delete" }); setBank("none"); setDel(false); toast("Bank account removed"); }}>Hold to delete</HoldButton>
        </>} />
    </div>
  );
}

function Giving({ gifts }: { gifts: typeof GIFTS }) {
  const total = gifts.reduce((a, g) => a + g.amount, 0);
  if (!gifts.length) {
    return <Empty><EmptyHeader><EmptyMedia variant="icon"><GiftIcon weight="bold" /></EmptyMedia><EmptyTitle>No gifts yet</EmptyTitle><EmptyDescription>Gifts you make will show up here.</EmptyDescription></EmptyHeader></Empty>;
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => toast("Gift checkout is a demo")}><GiftIcon weight="bold" /> Make a gift</Button>
        <Button variant="secondary" onClick={() => { demoLog("tax-receipts", {}); toast("Preparing your tax receipts"); }}><Receipt weight="bold" /> Export tax receipts</Button>
      </div>
      <div className="flex flex-col gap-2">
        {gifts.map((g) => (
          <div key={g.id} className="flex items-center gap-3 rounded-[24px] p-4 transition-colors duration-150 hover:bg-card/60">
            <div className="min-w-0 flex-1"><div className="text-[15px] font-medium">{g.fund}</div><div className="text-[13px] text-ink2">{shortDate(g.inDays)}</div></div>
            <span className="text-[15px] font-medium tabular-nums">{usd(g.amount)}</span>
          </div>
        ))}
      </div>
      <p className="text-[13px] text-mute">{gifts.length} gifts · {usd(total)} given in total</p>
    </div>
  );
}

/** The side column: where payouts land, and what is on its way. Three levels of text: the thing (foreground), what it is (muted), the state (a dot and a muted word). */
const WHEN: Record<"hold" | "processing", string> = { hold: "After the event", processing: "In 1–2 days" };
function MoneyAside({ bank, payouts, onBank, onPayouts }: { bank: BankState; payouts: Payout[]; onBank: () => void; onPayouts: () => void }) {
  const coming = payouts.filter((p): p is Payout & { status: "hold" | "processing" } => p.status === "hold" || p.status === "processing");
  /* short copy per state, so every state fits the 300px card beside its button; verifying has nothing to press */
  const line: Record<BankState, { title: string; sub: string; cta?: string }> = {
    none: { title: "No account yet", sub: "Link one to get paid", cta: "Link" },
    incomplete: { title: "Almost there", sub: "Finish your setup", cta: "Finish" },
    verifying: { title: "Verifying", sub: "A few minutes" },
    linked: { title: "U.S. dollars", sub: "Account ending 6021", cta: "Manage" },
  };
  return (
    <aside className="flex flex-col gap-4 xl:sticky xl:top-[104px]" aria-label="Payout summary">
      <section className="flex flex-col gap-4 rounded-[28px] bg-card p-5" aria-label="Payout account">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[17px] font-semibold tracking-[-0.01em]">Payout account</h2>
          <Status color={bank === "linked" ? "success" : bank === "verifying" ? "info" : "warning"} pulse={bank === "verifying"} className="text-ink2">
            {bank === "linked" ? "Active" : bank === "verifying" ? "Verifying" : bank === "incomplete" ? "Incomplete" : "Not linked"}
          </Status>
        </div>
        <div className="flex items-center gap-3">
          <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-secondary"><Bank weight="bold" className="size-6" /></span>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-medium leading-snug">{line[bank].title}</div>
            <div className="text-[13px] leading-snug text-ink2">{line[bank].sub}</div>
          </div>
          {line[bank].cta && <Button size="sm" variant={bank === "linked" ? "secondary" : "primary"} className="shrink-0" onClick={onBank}>{line[bank].cta}</Button>}
        </div>
      </section>

      <section className="flex flex-col rounded-[28px] bg-card p-5" aria-label="Coming up">
        <h2 className="text-[17px] font-semibold tracking-[-0.01em]">Coming up</h2>
        {coming.length === 0 ? (
          <p className="mt-3 text-[15px] leading-snug text-ink2">Nothing on its way. When something you list sells, it shows here.</p>
        ) : (
          <ul className="mt-4 flex flex-col">
            {coming.map((p, i) => (
              <li key={p.id} className={cn("flex items-start gap-4 py-4", i === 0 ? "pt-0" : "border-t border-border")}>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium leading-snug">{p.title}</div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] leading-snug text-ink2">
                    <Status color={PAYOUT[p.status].color} pulse={p.status === "processing"} className="text-ink2">{PAYOUT[p.status].label}</Status>
                    <span aria-hidden>·</span>
                    <span>{WHEN[p.status]}</span>
                  </div>
                </div>
                <span className="shrink-0 text-[17px] font-semibold tabular-nums tracking-[-0.01em]">{usd(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
        <button type="button" onClick={onPayouts} className="-mx-2 -mb-2 mt-1 flex items-center justify-center gap-1.5 rounded-[18px] px-3 py-3 text-[14px] font-medium text-ink2 outline-none transition-[background-color,color,transform] duration-150 ease-[var(--e-out)] hover:bg-secondary/60 hover:text-foreground active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-[var(--h-focus)]">
          All payouts <CaretRight weight="bold" className="size-4" aria-hidden />
        </button>
      </section>
    </aside>
  );
}

export default function WalletMoney({ bank, setBank, empty = false }: { bank: BankState; setBank: (b: BankState) => void; empty?: boolean }) {
  const activity = empty ? [] : ACTIVITY_ROWS;
  const payouts = empty ? [] : PAYOUTS;
  const gifts = empty ? [] : GIFTS;
  const [section, setSection] = useState<Section>("activity");
  const [spot, setSpot] = useState<{ id: string; n: number } | null>(null);
  const clearSpot = useCallback(() => setSpot(null), []);
  const onWay = payouts.filter((p) => p.status === "hold" || p.status === "processing").reduce((a, p) => a + p.amount, 0);
  const failedList = payouts.filter((p) => p.status === "failed");
  const failed = failedList.length;

  return (
    <div className="grid w-full items-start gap-8 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-12">
      <div className="flex min-w-0 flex-col gap-8">
        <div className="flex flex-col gap-5">
          <PageHead title="Money" />
          {/* the sum and its sentence stack, left-aligned on one edge: a small line beside a giant number never shares a baseline */}
          <div>
            <NumberFlow value={onWay} format={{ style: "currency", currency: "USD" }} className="block text-[clamp(44px,6.6vw,88px)] font-semibold leading-[1] tracking-[-0.04em] tabular-nums" />
            {/* the number element keeps room above and below its digits, so the sentence pulls up into it */}
            <p className="-mt-2 text-[17px] leading-snug text-ink2">on its way to you after each event</p>
          </div>
          {failed > 0 && (
            <button type="button" onClick={() => { setSection("payouts"); setSpot({ id: failedList[0].id, n: Date.now() }); }} className="flex w-fit items-center gap-2 rounded-full bg-card px-4 py-2 text-[14px] font-medium transition-transform duration-150 ease-[var(--e-out)] hover:-translate-y-0.5 active:scale-[0.97]">
              <Warning weight="fill" className="size-4 text-warn" /> {failed} payout needs attention
            </button>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Chips<Section>
            variant="line" size="lg" label="Money sections" value={section} onChange={setSection}
            items={[{ id: "activity", label: "Activity", count: activity.length }, { id: "payouts", label: "Payouts", count: payouts.length }, { id: "bank", label: "Bank account" }, { id: "giving", label: "Giving", count: gifts.length }]}
          />
          {section === "activity" && <Activity data={activity} />}
          {section === "payouts" && <Payouts bank={bank} goBank={() => setSection("bank")} list={payouts} spot={spot} onSpotDone={clearSpot} />}
          {section === "bank" && <BankPanel bank={bank} setBank={setBank} />}
          {section === "giving" && <Giving gifts={gifts} />}
        </div>
      </div>
      <MoneyAside bank={bank} payouts={payouts} onBank={() => setSection("bank")} onPayouts={() => setSection("payouts")} />
    </div>
  );
}
