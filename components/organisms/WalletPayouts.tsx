"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import InAppBackLink from "@/components/molecules/InAppBackLink";
import { WalletTicketsBlocksLoading } from "@/components/organisms/WalletTicketsLoader";
import { formatCurrency } from "@/lib/helpers";
import {
  loadCachedBankAccount,
  loadCachedPayoutFunds,
  readCachedBankAccount,
  readCachedPayoutFunds,
  type CachedBankAccount,
} from "@/lib/walletAccountCache";

const NAVY = "#051b35";

const payoutCardStyle: CSSProperties = {
  flex: "1 1 0",
  minWidth: 0,
  background: "#fff",
  color: NAVY,
  borderRadius: 20,
  padding: "22px 24px",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  boxShadow: "0 10px 28px -20px rgba(5,27,53,0.45)",
};

const payoutAmountStyle: CSSProperties = {
  fontSize: 32,
  fontWeight: 700,
  letterSpacing: "-0.03em",
  lineHeight: 1.1,
};

const payoutNoteStyle: CSSProperties = {
  margin: 0,
  color: "#6e7180",
  fontSize: 15,
  lineHeight: 1.4,
};

const backLinkStyle = {
  alignSelf: "flex-start" as const,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  fontSize: 14,
  fontWeight: 600,
  color: NAVY,
  background: "#fff",
  border: "1px solid rgba(5,27,53,0.16)",
  borderRadius: 999,
  padding: "9px 16px 9px 12px",
  textDecoration: "none",
};

type BankAccountRecord = CachedBankAccount;

function accountLast4(account: BankAccountRecord | null) {
  const raw = account?.external_accounts;
  const first = Array.isArray(raw)
    ? raw[0]
    : Array.isArray(raw?.data)
      ? raw.data[0]
      : undefined;
  const value = first?.last4 ?? account?.last4;
  if (value == null || value === "") return "";
  return String(value);
}

function BackArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ width: 16, height: 16 }}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

export default function WalletPayouts() {
  const cachedAccount = readCachedBankAccount();
  const cachedFunds = readCachedPayoutFunds();
  const cachedReady = cachedAccount !== undefined && cachedFunds !== undefined;
  const [ready, setReady] = useState(cachedReady);
  const [hasAccount, setHasAccount] = useState(
    Boolean(cachedAccount?.charges_enabled && cachedAccount?.payouts_enabled),
  );
  const [depositLast4, setDepositLast4] = useState(cachedAccount ? accountLast4(cachedAccount) : "");
  const [available, setAvailable] = useState(cachedFunds?.available ?? 0);
  const [onHold, setOnHold] = useState(cachedFunds?.onHold ?? 0);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const update = () => setNarrow(window.innerWidth < 900);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (readCachedBankAccount() !== undefined && readCachedPayoutFunds() !== undefined) return;
    let cancelled = false;
    Promise.all([loadCachedBankAccount(), loadCachedPayoutFunds()]).then(([account, funds]) => {
      if (cancelled) return;
      const record = account || null;
      setHasAccount(Boolean(record?.charges_enabled && record?.payouts_enabled));
      setDepositLast4(accountLast4(record));
      setAvailable(funds.available);
      setOnHold(funds.onHold);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);


  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 48px", display: "flex", flexDirection: "column", gap: 16, color: NAVY }}>
      <InAppBackLink href="/wallet/my-profile/" aria-label="Back to profile" style={backLinkStyle}>
        <BackArrow />
        Back to profile
      </InAppBackLink>
      <h1 style={{ margin: 0, fontSize: 32, fontWeight: 600, letterSpacing: "-0.03em" }}>Payouts</h1>
      <p style={{ margin: 0, color: "#4a5567" }}>Resale payouts are deposited to your bank after the event.</p>
      {!ready ? <WalletTicketsBlocksLoading /> : null}
      {ready ? (
        <>
          <div style={{ display: "flex", flexDirection: narrow ? "column" : "row", gap: 16, alignItems: "stretch" }}>
            <section style={payoutCardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>
                  {hasAccount
                    ? depositLast4
                      ? `Depositing to account • ${depositLast4}`
                      : "Depositing to your bank"
                    : "No bank account linked"}
                </h2>
                <Link href="/wallet/bank-account/" style={{ flexShrink: 0, color: NAVY, fontWeight: 600, textDecoration: "underline" }}>
                  {hasAccount ? "Manage" : "Link account"}
                </Link>
              </div>
              <div style={payoutAmountStyle}>{formatCurrency(available || 0)}</div>
              <p style={payoutNoteStyle}>
                {hasAccount
                  ? "Payouts are deposited after the event. You do not need to withdraw them."
                  : "Link a bank account to receive payouts."}
              </p>
            </section>
            <section style={payoutCardStyle}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>On hold</h2>
              <div style={payoutAmountStyle}>{formatCurrency(onHold || 0)}</div>
              <p style={payoutNoteStyle}>Held until the event ends, then deposited to your bank.</p>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
