"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBankAccount, getAvailableFunds, getBankAccount, getMyUpcomingOrders } from "@/lib/api";
import { formatCurrency } from "@/lib/helpers";
import { payoutTotals } from "@/lib/payoutFunds";

type Invoice = {
  id?: string | number;
  event?: { name?: string };
  total?: number | string;
};

const NAVY = "#051b35";

export default function WalletPayouts() {
  const [ready, setReady] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);
  const [available, setAvailable] = useState(0);
  const [onHold, setOnHold] = useState(0);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getMyUpcomingOrders().catch(() => ({ data: [] })),
      getBankAccount().catch(() => ({ data: null })),
      getAvailableFunds().catch(() => ({ data: { available: [], onHold: [] } })),
    ]).then(([orders, account, funds]) => {
      if (cancelled) return;
      const rows = Array.isArray(orders.data) ? orders.data : [];
      setInvoices(rows as Invoice[]);
      const record = account.data as { id?: string | number } | null;
      setHasAccount(record?.id != null);
      const totals = payoutTotals(funds.data);
      setAvailable(totals.available);
      setOnHold(totals.onHold);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const linkBank = async () => {
    const res = await createBankAccount({});
    const link = (res.data as { link?: string } | undefined)?.link;
    if (link) window.location.assign(link);
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px 48px", display: "flex", flexDirection: "column", gap: 16, color: NAVY }}>
      <Link href="/wallet/my-profile/" style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>Back to profile</Link>
      <h1 style={{ margin: 0, fontSize: 32, fontWeight: 600, letterSpacing: "-0.03em" }}>Payouts</h1>
      <p style={{ margin: 0, color: "#4a5567" }}>Resale payouts are deposited to your bank after the event.</p>
      {!ready ? <p>Loading…</p> : null}
      {ready ? (
        <>
          <section style={{ background: NAVY, color: "#fff", borderRadius: 20, padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Depositing to your bank</h2>
            <div style={{ fontSize: 28, fontWeight: 600 }}>{formatCurrency(available || 0)}</div>
            <p style={{ margin: 0 }}>Payouts are deposited after the event. You do not need to withdraw them.</p>
            {hasAccount ? null : (
              <button type="button" onClick={() => void linkBank()} style={{ alignSelf: "flex-start", fontWeight: 600, border: "none", borderRadius: 999, padding: "12px 18px", background: "#a6e773", color: NAVY, cursor: "pointer" }}>
                Link bank account
              </button>
            )}
          </section>
          <section style={{ background: "#fff", borderRadius: 20, padding: 20 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>On hold</h2>
            <p style={{ margin: "8px 0 0", color: "#4a5567" }}>Held until the event ends, then deposited to your bank.</p>
            <div style={{ fontSize: 28, fontWeight: 600, marginTop: 8 }}>{formatCurrency(onHold || 0)}</div>
          </section>
          <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Invoices</h2>
            {invoices.length === 0 ? <p style={{ margin: 0, color: "#4a5567" }}>No invoices yet.</p> : invoices.map((invoice, index) => (
              <div key={String(invoice.id ?? index)} style={{ background: "#fff", borderRadius: 16, padding: "14px 16px", display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span>{invoice.event?.name || "Event"}</span>
                <span>{invoice.total != null ? formatCurrency(Number(invoice.total) || 0) : ""}</span>
              </div>
            ))}
          </section>
        </>
      ) : null}
    </div>
  );
}
