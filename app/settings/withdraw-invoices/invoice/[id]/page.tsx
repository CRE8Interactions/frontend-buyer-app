"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import WalletShell from "@/components/templates/WalletShell";
import BackChip from "@/components/molecules/BackChip";
import EmptyState from "@/components/molecules/EmptyState";
import PageLoader from "@/components/molecules/PageLoader";
import { cardCls } from "@/components/molecules/Card";
import { getMyUpcomingOrders } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatCurrency, formatEventWhen, getSingularOrPluralWord } from "@/lib/helpers";
import { type OrderLike, unwrapList } from "@/lib/wallet";

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const { ready, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<OrderLike | null>(null);

  useEffect(() => {
    if (!ready || !isAuthenticated) return;
    setLoading(true);
    getMyUpcomingOrders()
      .then((res) => {
        const list = unwrapList<OrderLike>(res.data);
        setInvoice(list.find((d) => String(d.id) === String(params.id)) || null);
      })
      .catch((err) => {
        console.error(err);
        setInvoice(null);
      })
      .finally(() => setLoading(false));
  }, [ready, isAuthenticated, params.id]);

  const listings = (invoice?.details as { listings?: { askingPrice?: number; total?: number; quantity?: number; pricing?: Record<string, number> }[] })?.listings;
  const listing = listings?.[0];
  const ticketCount = listing?.quantity ?? invoice?.tickets?.length ?? 0;
  const ticketAmount = listing?.askingPrice ?? invoice?.tickets?.[0]?.cost ?? 0;
  const totalAmount =
    listing?.total ??
    ((ticketAmount || 0) * (invoice?.tickets?.length || 0) || invoice?.total || 0);

  return (
    <WalletShell>
      <BackChip href="/settings/withdraw-invoices/" label="Invoices" />

      {loading ? (
        <PageLoader message="Loading invoice…" label="Loading invoice" className="mt-6 min-h-[30vh]" />
      ) : !invoice ? (
        <div className="mt-6">
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" />
              </svg>
            }
          >
            Invoice not found.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-6 max-w-[640px]">
          <h2 className="text-[22px] font-semibold tracking-[-0.01em]">Invoice</h2>
          <p className="mt-1 text-[14px] text-[#9DA2B3]">
            {invoice.createdAt
              ? formatEventWhen(invoice.createdAt, undefined, "ddd, MMM D, YYYY h:mm A")
              : ""}
          </p>

          <div className={`${cardCls} mt-6 space-y-4 p-6`}>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#9DA2B3]">
                Description
              </p>
              <p className="mt-1 text-[16px] font-semibold">
                {invoice.event?.name || invoice.package?.name || "Order"}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#9DA2B3]">
                  Quantity
                </p>
                <p className="mt-1">
                  {ticketCount} {getSingularOrPluralWord(ticketCount)}
                </p>
              </div>
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#9DA2B3]">
                  Ticket amount
                </p>
                <p className="mt-1 tabular-nums">{formatCurrency(ticketAmount)}</p>
              </div>
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#9DA2B3]">
                  Order ID
                </p>
                <p className="mt-1 font-mono text-[13px]">{invoice.orderId || invoice.id}</p>
              </div>
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#9DA2B3]">
                  Total
                </p>
                <p className="mt-1 text-[18px] font-bold tabular-nums">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </WalletShell>
  );
}
