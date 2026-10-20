"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBankAccount, getBankAccount, removeBankAccount } from "@/lib/api";

type BankAccountRecord = {
  id?: string | number;
  external_accounts?: unknown;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  bank_name?: string;
  last4?: string;
};

const NAVY = "#051b35";

export default function WalletBankAccount({ processing = false }: { processing?: boolean }) {
  const [account, setAccount] = useState<BankAccountRecord | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    getBankAccount()
      .then((res) => setAccount((res.data as BankAccountRecord) || null))
      .catch(() => setAccount(null))
      .finally(() => setLoaded(true));
  };

  useEffect(() => {
    load();
  }, []);

  const startSetup = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await createBankAccount({});
      const link = (res.data as { link?: string } | undefined)?.link;
      if (link) {
        window.location.assign(link);
        return;
      }
      setError("Unable to open bank account setup. Try again.");
    } catch {
      setError("Unable to open bank account setup. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const continueSetup = async () => {
    setSaving(true);
    setError("");
    try {
      await removeBankAccount();
      await startSetup();
    } catch {
      setSaving(false);
      setError("Unable to open bank account setup. Try again.");
    }
  };

  const complete = Boolean(account?.charges_enabled && account?.payouts_enabled);
  const hasExternal = Array.isArray(account?.external_accounts)
    ? account.external_accounts.length > 0
    : Boolean(account?.external_accounts);
  const verifying = processing && !complete;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px 48px", display: "flex", flexDirection: "column", gap: 16, color: NAVY }}>
      <Link href="/wallet/my-profile/" style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>Back to profile</Link>
      <h1 style={{ margin: 0, fontSize: 32, fontWeight: 600, letterSpacing: "-0.03em" }}>Bank account</h1>
      {!loaded ? <p>Loading…</p> : null}
      {loaded && !hasExternal ? (
        <section style={{ background: "#fff", borderRadius: 20, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: 0 }}>Link a bank account to receive resale payouts.</p>
          <button type="button" onClick={() => void startSetup()} disabled={saving} style={{ alignSelf: "flex-start", fontWeight: 600, border: "none", borderRadius: 999, padding: "12px 18px", background: "#a6e773", cursor: "pointer" }}>
            Link bank account
          </button>
        </section>
      ) : null}
      {loaded && hasExternal && !complete ? (
        <section style={{ background: "#fff", borderRadius: 20, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: 0 }}>
            {verifying
              ? "Verifying account check back in a few minutes"
              : "You haven't finished setting up your banking info, please continue to finish setting up your bank account"}
          </p>
          {verifying ? null : (
            <button type="button" onClick={() => void continueSetup()} disabled={saving} style={{ alignSelf: "flex-start", fontWeight: 600, border: "none", borderRadius: 999, padding: "12px 18px", background: "#a6e773", cursor: "pointer" }}>
              Continue
            </button>
          )}
        </section>
      ) : null}
      {loaded && complete ? (
        <section style={{ background: "#fff", borderRadius: 20, padding: 20 }}>
          <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6e7180" }}>Linked account</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginTop: 6 }}>
            {[account?.bank_name, account?.last4 ? `····${account.last4}` : null].filter(Boolean).join(" ") || "Bank account connected"}
          </div>
        </section>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
