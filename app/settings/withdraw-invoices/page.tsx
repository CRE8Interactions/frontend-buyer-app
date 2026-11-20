"use client";

import { useEffect, useState } from "react";
import WalletShell from "@/components/templates/WalletShell";
import BackChip from "@/components/molecules/BackChip";
import EmptyState from "@/components/molecules/EmptyState";
import PageSkeleton from "@/components/molecules/PageSkeleton";
import { cardCls } from "@/components/molecules/Card";
import Button from "@/components/atoms/Button";
import { labelCls } from "@/components/atoms/form";
import {
  getAvailableFunds,
  getBankAccount,
  getMyUpcomingOrders,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatCurrency, formatEventWhen, getSingularOrPluralWord } from "@/lib/helpers";
import { type OrderLike, unwrapList } from "@/lib/wallet";

export default function WithdrawInvoicesPage() {
  const { ready, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [funds, setFunds] = useState(0);
  const [hasBank, setHasBank] = useState(false);
  const [invoices, setInvoices] = useState<OrderLike[]>([]);

  useEffect(() => {
    if (!ready || !isAuthenticated) return;
    setLoading(true);
    Promise.all([getMyUpcomingOrders(), getBankAccount(), getAvailableFunds()])
      .then(([ordersRes, bankRes, fundsRes]) => {
        setInvoices(unwrapList<OrderLike>(ordersRes.data));
        const bank = bankRes.data as { external_accounts?: unknown };
        setHasBank(Boolean(bank?.external_accounts));
        const payouts = unwrapList<{ payout?: number }>(fundsRes.data).map((d) => d.payout || 0);
        setFunds(payouts.reduce((a, b) => a + b, 0));
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [ready, isAuthenticated]);

  const sorted = [...invoices].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
  );

  return (
    <WalletShell>
      <BackChip href="/settings/" label="Settings" />
      <h2 className="mt-6 text-[22px] font-semibold tracking-[-0.01em]">Withdraw</h2>
      <p className="mt-1 text-[14px] text-ink2">Withdraw funds from your account.</p>

      {loading ? (
        <PageSkeleton variant="list" message="Loading…" label="Loading" className="mt-6 min-h-[30vh]" />
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-primary/30 bg-card p-5">
              <div className={labelCls}>Available funds</div>
              <div className="mt-2 text-[28px] font-bold tabular-nums tracking-[-0.02em]">
                {formatCurrency(funds)}
              </div>
              <Button size="sm" disabled={!hasBank || funds <= 0} className="mt-3 disabled:opacity-40">
                Withdraw
              </Button>
              {!hasBank && (
                <p className="mt-3 text-[12px] text-ink2">
                  <a href="/settings/payment-information/" className="text-primary underline">
                    Link a bank account
                  </a>{" "}
                  to withdraw.
                </p>
              )}
            </div>
            <div className={`${cardCls} p-5`}>
              <div className={labelCls}>Funds on hold</div>
              <div className="mt-2 text-[28px] font-bold tabular-nums tracking-[-0.02em]">$0.00</div>
              <p className="mt-3 text-[12px] leading-relaxed text-ink2">
                Held until the event happens, then released.
              </p>
            </div>
          </div>

          <h2 className="mt-12 text-[22px] font-semibold tracking-[-0.01em]">Invoices</h2>
          <p className="mt-1 text-[14px] text-ink2">
            View your previous invoices and transactions.
          </p>

          {sorted.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                icon={
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <path d="M6 2h9l4 4v16l-3-1.5L13 22l-3-1.5L7 22l-3-1.5V4a2 2 0 0 1 2-2z" />
                  </svg>
                }
              >
                No invoices to show.
              </EmptyState>
            </div>
          ) : (
            <div className={`${cardCls} mt-6 overflow-x-auto`}>
              <table className="w-full min-w-[680px] text-[13.5px]">
                <thead>
                  <tr className="border-b border-white/12 text-left text-ink2">
                    {["Date", "Description", "Qty", "Total", ""].map((h) => (
                      <th key={h || "a"} className="px-4 py-3 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((inv) => {
                    const qty = inv.tickets?.length ?? 0;
                    const desc =
                      inv.event?.name ||
                      inv.package?.name ||
                      "Order";
                    return (
                      <tr key={String(inv.id || inv.orderId)} className="border-b border-white/8 last:border-0">
                        <td className="whitespace-nowrap px-4 py-3 text-ink3">
                          {inv.createdAt
                            ? formatEventWhen(inv.createdAt, undefined, "ddd, MMM D, YYYY h:mm A")
                            : "—"}
                        </td>
                        <td className="px-4 py-3">{desc}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-ink3">
                          {qty} {getSingularOrPluralWord(qty)}
                        </td>
                        <td className="px-4 py-3 tabular-nums">{formatCurrency(inv.total)}</td>
                        <td className="px-4 py-3">
                          <a
                            href={`/settings/withdraw-invoices/invoice/${inv.id}/`}
                            className="font-semibold text-primary transition-colors hover:text-white"
                          >
                            View
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </WalletShell>
  );
}
